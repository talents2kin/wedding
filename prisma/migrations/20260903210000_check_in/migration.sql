-- #14 QR check-in: checkInToken on Ceremony + CheckIn table
-- Idempotent: safe to run multiple times.

-- Add checkInToken column to Ceremony
ALTER TABLE "Ceremony" ADD COLUMN IF NOT EXISTS "checkInToken" TEXT;

-- Unique index on checkInToken
CREATE UNIQUE INDEX IF NOT EXISTS "Ceremony_checkInToken_key" ON "Ceremony"("checkInToken");

-- CheckIn table
CREATE TABLE IF NOT EXISTS "CheckIn" (
  "id"         TEXT NOT NULL,
  "guestId"    TEXT NOT NULL,
  "ceremonyId" TEXT NOT NULL,
  "arrivedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one check-in per guest per ceremony
DO $$ BEGIN
  ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_guestId_ceremonyId_key" UNIQUE ("guestId", "ceremonyId");
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

-- FK: CheckIn → Guest
DO $$ BEGIN
  ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_guestId_fkey"
    FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- FK: CheckIn → Ceremony
DO $$ BEGIN
  ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_ceremonyId_fkey"
    FOREIGN KEY ("ceremonyId") REFERENCES "Ceremony"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
