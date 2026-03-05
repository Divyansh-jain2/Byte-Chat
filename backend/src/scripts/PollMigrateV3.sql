-- ================================================================================
--  POLLS v3 MIGRATION — Time-Based Resolution & Coin Toss
--  Architecture:
--    • Resolution only happens at expiry (enforced by backend sweeper)
--    • Tie results in a random "coin toss" (handled by backend sweeper)
--    • DB trigger handles side-effects when status is set to 'passed'
--    • Backend: only upserts votes, reads result, emits socket events
--    • Backend sweeper: marks 'passed'/'failed' based on majority vote at expiry
-- ================================================================================

BEGIN;

-- 1. Remove the vote threshold column
ALTER TABLE polls DROP COLUMN IF EXISTS votes_required;

-- 2. Update the stats trigger to remove automatic status transitions
--    Now it only maintains the counters.
CREATE OR REPLACE FUNCTION fn_update_poll_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_poll_id       UUID;
  v_votes_for     INT;
  v_votes_against INT;
  v_total         INT;
BEGIN
  -- Determine which poll changed
  v_poll_id := COALESCE(NEW.poll_id, OLD.poll_id);

  -- Recalculate fresh stats from the votes table
  SELECT
    COUNT(*) FILTER (WHERE vote_value = TRUE),
    COUNT(*) FILTER (WHERE vote_value = FALSE),
    COUNT(*)
  INTO v_votes_for, v_votes_against, v_total
  FROM votes
  WHERE poll_id = v_poll_id;

  -- Update count stats only. 
  -- Status is now strictly resolved by time (backend sweeper).
  UPDATE polls
  SET votes_for     = v_votes_for,
      votes_against = v_votes_against,
      total_voters  = v_total,
      updated_at    = NOW()
  WHERE poll_id = v_poll_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure fn_execute_passed_poll is ready for side-effects
--    (Basically keeping the same logic from v2, but ensuring it's defined correctly)
CREATE OR REPLACE FUNCTION fn_execute_passed_poll()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger on transition to 'passed' and if not already executed
  IF NEW.status = 'passed'
     AND OLD.status IS DISTINCT FROM 'passed'
     AND NEW.is_executed = FALSE
  THEN
    CASE NEW.poll_type
      WHEN 'kick_member' THEN
        -- Remove the target from the group
        DELETE FROM group_members
        WHERE group_id = NEW.group_id
          AND user_id  = NEW.target_user_id;

        -- Record in bans
        INSERT INTO group_bans (group_id, user_id, banned_by, reason)
        VALUES (
          NEW.group_id,
          NEW.target_user_id,
          NEW.created_by,
          'Removed by group vote: ' || COALESCE(NEW.description, 'No reason provided')
        )
        ON CONFLICT (group_id, user_id) DO UPDATE
          SET reason     = EXCLUDED.reason,
              banned_by  = EXCLUDED.banned_by;

      -- make_admin, remove_admin can be added here...
      WHEN 'make_admin' THEN
        UPDATE group_members
        SET is_admin = TRUE,
            can_add_members = TRUE,
            can_remove_members = TRUE,
            can_edit_group = TRUE
        WHERE group_id = NEW.group_id AND user_id = NEW.target_user_id;

      WHEN 'remove_admin' THEN
        UPDATE group_members
        SET is_admin = FALSE,
            can_add_members = FALSE,
            can_remove_members = FALSE,
            can_edit_group = FALSE
        WHERE group_id = NEW.group_id AND user_id = NEW.target_user_id;

      ELSE
        NULL;
    END CASE;

    NEW.is_executed  := TRUE;
    NEW.executed_at  := NOW();
    NEW.updated_at   := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
