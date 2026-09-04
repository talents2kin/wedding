-- Safe re-apply of previous migration (in case it wasn't executed)
ALTER TABLE "Ceremony" ADD COLUMN IF NOT EXISTS "registrationToken" TEXT;
ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "selfRegistered" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "Ceremony_registrationToken_key" ON "Ceremony"("registrationToken");

-- New: ScheduledStatus enum
DO $$ BEGIN
  CREATE TYPE "ScheduledStatus" AS ENUM ('PENDING', 'FIRED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- New: ScheduledNotification
CREATE TABLE IF NOT EXISTS "ScheduledNotification" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "ceremonyId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "customBody" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "ScheduledStatus" NOT NULL DEFAULT 'PENDING',
    "firedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScheduledNotification_pkey" PRIMARY KEY ("id")
);

-- New: ScheduledNotificationGuest
CREATE TABLE IF NOT EXISTS "ScheduledNotificationGuest" (
    "scheduledNotificationId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    CONSTRAINT "ScheduledNotificationGuest_pkey" PRIMARY KEY ("scheduledNotificationId","guestId")
);

-- New: RsvpReminder
CREATE TABLE IF NOT EXISTS "RsvpReminder" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "ceremonyId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "daysAfter" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "firedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RsvpReminder_pkey" PRIMARY KEY ("id")
);

-- Foreign keys (IF NOT EXISTS via DO block)
DO $$ BEGIN
  ALTER TABLE "ScheduledNotification" ADD CONSTRAINT "ScheduledNotification_weddingId_fkey"
    FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ScheduledNotification" ADD CONSTRAINT "ScheduledNotification_ceremonyId_fkey"
    FOREIGN KEY ("ceremonyId") REFERENCES "Ceremony"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ScheduledNotificationGuest" ADD CONSTRAINT "ScheduledNotificationGuest_scheduledNotificationId_fkey"
    FOREIGN KEY ("scheduledNotificationId") REFERENCES "ScheduledNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ScheduledNotificationGuest" ADD CONSTRAINT "ScheduledNotificationGuest_guestId_fkey"
    FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "RsvpReminder" ADD CONSTRAINT "RsvpReminder_weddingId_fkey"
    FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "RsvpReminder" ADD CONSTRAINT "RsvpReminder_ceremonyId_fkey"
    FOREIGN KEY ("ceremonyId") REFERENCES "Ceremony"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
