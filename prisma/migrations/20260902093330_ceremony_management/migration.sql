/*
  Warnings:

  - You are about to drop the column `name` on the `Ceremony` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CeremonyType" AS ENUM ('COUTUMIER', 'CIVIL', 'RELIGIEUX', 'CUSTOM');

-- AlterTable
ALTER TABLE "Ceremony" DROP COLUMN "name",
ADD COLUMN     "customLabel" TEXT,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "type" "CeremonyType" NOT NULL DEFAULT 'CUSTOM',
ADD COLUMN     "venue" TEXT;

-- CreateTable
CREATE TABLE "GuestCeremony" (
    "guestId" TEXT NOT NULL,
    "ceremonyId" TEXT NOT NULL,

    CONSTRAINT "GuestCeremony_pkey" PRIMARY KEY ("guestId","ceremonyId")
);

-- AddForeignKey
ALTER TABLE "GuestCeremony" ADD CONSTRAINT "GuestCeremony_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestCeremony" ADD CONSTRAINT "GuestCeremony_ceremonyId_fkey" FOREIGN KEY ("ceremonyId") REFERENCES "Ceremony"("id") ON DELETE CASCADE ON UPDATE CASCADE;
