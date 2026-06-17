CREATE OR REPLACE FUNCTION prevent_audit_log_truncate()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AdminAuditLog is append-only. Truncating is strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_audit_immutability_truncate ON "AdminAuditLog";

CREATE TRIGGER enforce_audit_immutability_truncate
BEFORE TRUNCATE ON "AdminAuditLog"
FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_log_truncate();
