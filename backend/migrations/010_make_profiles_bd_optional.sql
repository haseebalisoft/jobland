-- Make profiles.bd_id optional and keep FK to bds(id)
-- Run this after the initial schema/migrations that create profiles and bds.

ALTER TABLE profiles
  ALTER COLUMN bd_id DROP NOT NULL;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_bd_id_fkey,
  ADD CONSTRAINT profiles_bd_id_fkey
    FOREIGN KEY (bd_id)
    REFERENCES bds(id)
    ON DELETE SET NULL;

