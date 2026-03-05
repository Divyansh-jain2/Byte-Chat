-- -- ================================================================================
-- --  POLLS v2 MIGRATION — Member Removal Redesign
-- --  Architecture:
-- --    • DB trigger handles ALL execution side-effects (removal, bans, etc.)
-- --      → works even when backend is offline
-- --    • DB trigger also handles vote-count updates
-- --    • Backend: only upserts votes, reads result, emits socket events
-- --    • Backend: 60s sweeper marks expired polls → emits socket events
-- -- ================================================================================

-- BEGIN;

-- -- ================================================================================
-- -- STEP 1: Drop the old COMBINED trigger (it mixed expiry + execution + bad
-- --         ON CONFLICT syntax). We replace it with two clean, focused triggers.
-- -- ================================================================================

-- DROP TRIGGER IF EXISTS trigger_manage_poll_lifecycle     ON polls;
-- DROP TRIGGER IF EXISTS trigger_poll_expiration           ON polls;
-- DROP TRIGGER IF EXISTS trigger_execute_polls             ON polls;
-- DROP TRIGGER IF EXISTS trigger_update_poll_stats         ON votes;

-- DROP FUNCTION IF EXISTS manage_poll_lifecycle()                       CASCADE;
-- DROP FUNCTION IF EXISTS update_poll_stats_after_vote()                CASCADE;

-- -- Drop old helper functions (now handled in backend with clean SQL)
-- DROP FUNCTION IF EXISTS create_poll(UUID,UUID,UUID,VARCHAR,VARCHAR,TEXT,INTEGER) CASCADE;
-- DROP FUNCTION IF EXISTS cast_vote(UUID,UUID,BOOLEAN,UUID)              CASCADE;
-- DROP FUNCTION IF EXISTS get_active_polls(UUID)                         CASCADE;
-- DROP FUNCTION IF EXISTS get_poll_results(UUID)                         CASCADE;


-- -- ================================================================================
-- -- STEP 2: TRIGGER 1 — Auto-execute poll action when status → 'passed'
-- --
-- --   Fires: BEFORE UPDATE OF status ON polls
-- --   Guards: OLD.status != 'passed' AND NEW.status = 'passed' AND NOT is_executed
-- --   Side-effects (inside same transaction as the status change):
-- --     kick_member  → DELETE from group_members, UPSERT into group_bans
-- --     make_admin   → UPDATE group_members SET is_admin = TRUE
-- --     remove_admin → UPDATE group_members SET is_admin = FALSE
-- --   Also sets: NEW.is_executed = TRUE, NEW.executed_at = NOW()
-- -- ================================================================================

-- CREATE OR REPLACE FUNCTION fn_execute_passed_poll()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   -- Only trigger on the first transition to 'passed' and if not already executed
--   IF NEW.status = 'passed'
--      AND OLD.status IS DISTINCT FROM 'passed'
--      AND NEW.is_executed = FALSE
--   THEN
--     CASE NEW.poll_type

--       WHEN 'kick_member' THEN
--         -- Remove the target from the group
--         DELETE FROM group_members
--         WHERE group_id = NEW.group_id
--           AND user_id  = NEW.target_user_id;

--         -- Record in bans (upsert to handle rare pre-existing ban gracefully)
--         INSERT INTO group_bans (group_id, user_id, banned_by, reason)
--         VALUES (
--           NEW.group_id,
--           NEW.target_user_id,
--           NEW.created_by,
--           'Removed by group vote: ' || COALESCE(NEW.description, 'No reason provided')
--         )
--         ON CONFLICT (group_id, user_id) DO UPDATE
--           SET reason     = EXCLUDED.reason,
--               banned_by  = EXCLUDED.banned_by;

--       WHEN 'make_admin' THEN
--         UPDATE group_members
--         SET is_admin          = TRUE,
--             can_add_members   = TRUE,
--             can_remove_members = TRUE,
--             can_edit_group    = TRUE
--         WHERE group_id = NEW.group_id
--           AND user_id  = NEW.target_user_id;

--       WHEN 'remove_admin' THEN
--         UPDATE group_members
--         SET is_admin          = FALSE,
--             can_add_members   = FALSE,
--             can_remove_members = FALSE,
--             can_edit_group    = FALSE
--         WHERE group_id = NEW.group_id
--           AND user_id  = NEW.target_user_id;

--       ELSE
--         -- change_group_name, object_removal, etc. — handled by backend if needed
--         NULL;

--     END CASE;

--     -- Mark executed (modifies NEW row in-place — BEFORE trigger)
--     NEW.is_executed  := TRUE;
--     NEW.executed_at  := NOW();
--     NEW.updated_at   := NOW();
--   END IF;

--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- -- Attach trigger — fires BEFORE the UPDATE commits, so is_executed=TRUE is saved
-- -- in the same row update that changed status to 'passed'. Atomic. No race.
-- DROP TRIGGER IF EXISTS trg_execute_passed_poll ON polls;
-- CREATE TRIGGER trg_execute_passed_poll
--   BEFORE UPDATE OF status ON polls
--   FOR EACH ROW
--   EXECUTE FUNCTION fn_execute_passed_poll();


-- -- ================================================================================
-- -- STEP 3: TRIGGER 2 — Keep vote statistics in sync after every vote change
-- --
-- --   Fires: AFTER INSERT OR UPDATE OR DELETE ON votes
-- --   Recalculates: votes_for, votes_against, total_voters, status
-- --   Also promotes poll to 'passed' / 'failed' when threshold is met,
-- --   which will re-fire trg_execute_passed_poll via the status change.
-- -- ================================================================================

-- CREATE OR REPLACE FUNCTION fn_update_poll_stats()
-- RETURNS TRIGGER AS $$
-- DECLARE
--   v_poll_id       UUID;
--   v_votes_for     INT;
--   v_votes_against INT;
--   v_total         INT;
--   v_required      INT;
--   v_new_status    VARCHAR(20);
-- BEGIN
--   -- Determine which poll changed
--   v_poll_id := COALESCE(NEW.poll_id, OLD.poll_id);

--   -- Recalculate fresh stats from the votes table
--   SELECT
--     COUNT(*) FILTER (WHERE vote_value = TRUE),
--     COUNT(*) FILTER (WHERE vote_value = FALSE),
--     COUNT(*)
--   INTO v_votes_for, v_votes_against, v_total
--   FROM votes
--   WHERE poll_id = v_poll_id;

--   -- Get threshold
--   SELECT votes_required, status
--   INTO v_required, v_new_status
--   FROM polls
--   WHERE poll_id = v_poll_id;

--   -- Only change status if poll is still active (don't re-open a closed poll)
--   IF v_new_status = 'active' THEN
--     IF v_votes_for >= v_required THEN
--       v_new_status := 'passed';
--     ELSIF v_votes_against >= v_required THEN
--       v_new_status := 'failed';
--     END IF;
--   END IF;

--   -- Single UPDATE — if status changes to 'passed', trg_execute_passed_poll fires
--   UPDATE polls
--   SET votes_for    = v_votes_for,
--       votes_against = v_votes_against,
--       total_voters  = v_total,
--       status        = v_new_status,
--       updated_at    = NOW()
--   WHERE poll_id = v_poll_id;

--   RETURN COALESCE(NEW, OLD);
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- DROP TRIGGER IF EXISTS trg_update_poll_stats ON votes;
-- CREATE TRIGGER trg_update_poll_stats
--   AFTER INSERT OR UPDATE OR DELETE ON votes
--   FOR EACH ROW
--   EXECUTE FUNCTION fn_update_poll_stats();


-- -- ================================================================================
-- -- STEP 4: Integrity constraints
-- -- ================================================================================

-- -- No two active polls of the same type for the same target in the same group
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_poll_per_target
--   ON polls(group_id, target_user_id, poll_type)
--   WHERE status = 'active' AND target_user_id IS NOT NULL;

-- -- No two active polls of the same type with no target (e.g. change_group_name)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_group_poll_no_target
--   ON polls(group_id, poll_type)
--   WHERE status = 'active' AND target_user_id IS NULL;

-- -- Ensure vote unique indexes exist
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_vote_user
--   ON votes(poll_id, user_id)
--   WHERE user_id IS NOT NULL;

-- CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_vote_anonymous
--   ON votes(poll_id, anonymous_identity_id)
--   WHERE anonymous_identity_id IS NOT NULL;


-- -- ================================================================================
-- -- STEP 5: New columns on polls (for cancel tracking)
-- -- ================================================================================

-- ALTER TABLE polls ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
-- ALTER TABLE polls ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(user_id) ON DELETE SET NULL;


-- -- ================================================================================
-- -- STEP 6: Update RLS — poll cancellation
-- -- ================================================================================

-- DROP POLICY IF EXISTS "Creators can update own polls"          ON polls;
-- DROP POLICY IF EXISTS "Admins can cancel polls"                ON polls;
-- DROP POLICY IF EXISTS "Creator can cancel own active poll"     ON polls;
-- DROP POLICY IF EXISTS "Admin can cancel any active poll in group" ON polls;

-- CREATE POLICY "Creator can cancel own active poll" ON polls
--   FOR UPDATE USING (
--     created_by::text = auth.uid()::text
--     AND status = 'active'
--   );

-- CREATE POLICY "Admin can cancel any active poll in group" ON polls
--   FOR UPDATE USING (
--     status = 'active'
--     AND EXISTS (
--       SELECT 1 FROM group_members gm
--       WHERE gm.group_id   = polls.group_id
--         AND gm.user_id::text = auth.uid()::text
--         AND (gm.is_admin = TRUE OR gm.is_owner = TRUE)
--     )
--   );

-- COMMIT;

-- ================================================================================
-- POST-MIGRATION VERIFICATION  (run these manually)
-- ================================================================================
/*
-- Should return: trg_execute_passed_poll, trg_update_poll_stats
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table IN ('polls','votes')
ORDER BY trigger_name;

-- Should return: idx_unique_active_poll_per_target, idx_unique_active_group_poll_no_target
SELECT indexname FROM pg_indexes
WHERE tablename = 'polls' AND indexname LIKE 'idx_unique_active%';

-- Should return: cancellation_reason, cancelled_by
SELECT column_name FROM information_schema.columns
WHERE table_name = 'polls' AND column_name IN ('cancellation_reason','cancelled_by');
*/
