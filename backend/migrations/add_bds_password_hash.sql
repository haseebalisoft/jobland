-- Add password_hash to bds table (required for BD signup/login)
-- Run this if you get: column "password_hash" of relation "bds" does not exist

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bds' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE bds ADD COLUMN password_hash TEXT;
  END IF;
END $$;
