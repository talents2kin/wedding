-- AlterTable
ALTER TABLE "Ceremony" ADD COLUMN "registrationToken" TEXT;

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN "selfRegistered" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Ceremony_registrationToken_key" ON "Ceremony"("registrationToken");
