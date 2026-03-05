-- ================================================================================
--  ADMIN MANAGEMENT POLLS — Side-Effects
--  Update fn_execute_passed_poll to handle admin promotion/demotion.
-- ================================================================================

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

      WHEN 'make_admin' THEN
        -- Promote target user to admin
        UPDATE group_members
        SET is_admin = TRUE,
            can_add_members = TRUE,
            can_remove_members = TRUE,
            can_edit_group = TRUE,
            updated_at = NOW()
        WHERE group_id = NEW.group_id 
          AND user_id = NEW.target_user_id;

      WHEN 'remove_admin' THEN
        -- Demote target user from admin
        UPDATE group_members
        SET is_admin = FALSE,
            can_add_members = FALSE,
            can_remove_members = FALSE,
            can_edit_group = FALSE,
            updated_at = NOW()
        WHERE group_id = NEW.group_id 
          AND user_id = NEW.target_user_id;
          
      ELSE
        NULL;
    END CASE;

    -- Update poll execution status
    NEW.is_executed  := TRUE;
    NEW.executed_at  := NOW();
    NEW.updated_at   := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
