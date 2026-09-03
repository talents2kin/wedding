-- Add seatingShareToken to Ceremony
ALTER TABLE "Ceremony" ADD COLUMN IF NOT EXISTS "seatingShareToken" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Ceremony_seatingShareToken_key" ON "Ceremony"("seatingShareToken");

-- Create Table model
CREATE TABLE IF NOT EXISTS "Table" (
    "id"         TEXT NOT NULL,
    "weddingId"  TEXT NOT NULL,
    "ceremonyId" TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "capacity"   INTEGER NOT NULL,
    "position"   INTEGER NOT NULL DEFAULT 0,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- Create TableSeat model (guest can only be at one table)
CREATE TABLE IF NOT EXISTS "TableSeat" (
    "tableId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    CONSTRAINT "TableSeat_pkey" PRIMARY KEY ("tableId","guestId")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TableSeat_guestId_key" ON "TableSeat"("guestId");

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "Table" ADD CONSTRAINT "Table_weddingId_fkey"
    FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "Table" ADD CONSTRAINT "Table_ceremonyId_fkey"
    FOREIGN KEY ("ceremonyId") REFERENCES "Ceremony"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "TableSeat" ADD CONSTRAINT "TableSeat_tableId_fkey"
    FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "TableSeat" ADD CONSTRAINT "TableSeat_guestId_fkey"
    FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
