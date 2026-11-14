-- Hold public usernames when an account row is deleted, even if application code
-- does not call holdUsernamesForDeletedAccount. SET NULL still clears userId.

CREATE TRIGGER IF NOT EXISTS celeyou_hold_usernames_on_user_delete
BEFORE DELETE ON users
BEGIN
  UPDATE celeyou_usernames
  SET kind = 'HOLD',
      holdUntil = datetime('now', '+90 days'),
      redirectTo = NULL,
      reason = 'account-deleted',
      updatedAt = CURRENT_TIMESTAMP
  WHERE userId = OLD.id AND kind IN ('ACTIVE', 'ALIAS', 'SLUG');
END;
