DROP TRIGGER IF EXISTS enforce_audit_immutability_truncate ON "AdminAuditLog";
DROP TRIGGER IF EXISTS enforce_audit_immutability ON "AdminAuditLog";

CREATE OR REPLACE FUNCTION block_audit_mutations()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AdminAuditLog is append-only. Modification and truncation are strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_audit_immutability
BEFORE UPDATE OR DELETE OR TRUNCATE ON "AdminAuditLog"
FOR EACH STATEMENT EXECUTE FUNCTION block_audit_mutations();
