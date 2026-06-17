DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_catalog.pg_roles WHERE rolname = 'fiora_app_user'
  ) THEN
    CREATE ROLE fiora_app_user WITH LOGIN PASSWORD 'fiora_password';
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE fiora TO fiora_app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fiora_app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fiora_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO fiora_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO fiora_app_user;
