ALTER TABLE reservations
  ADD COLUMN qr_code VARCHAR(64) UNIQUE,
  ADD COLUMN utilise BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN utilise_at TIMESTAMP;

ALTER TABLE utilisateurs ADD COLUMN permis VARCHAR(50);

UPDATE reservations SET qr_code = replace(gen_random_uuid()::text, '-', '') WHERE qr_code IS NULL;
