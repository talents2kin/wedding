/*
  Warnings:

  - You are about to drop the column `rsvp` on the `Guest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Guest" DROP COLUMN "rsvp",
ADD COLUMN     "email" TEXT,
ADD COLUMN     "mealPref" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "plusOneEmail" TEXT,
ADD COLUMN     "plusOneName" TEXT,
ADD COLUMN     "plusOnePhone" TEXT;

-- AlterTable
ALTER TABLE "GuestCeremony" ADD COLUMN     "rsvp" "RsvpStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "GuestGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestGroupMember" (
    "guestId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "GuestGroupMember_pkey" PRIMARY KEY ("guestId","groupId")
);

-- AddForeignKey
ALTER TABLE "GuestGroup" ADD CONSTRAINT "GuestGroup_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestGroupMember" ADD CONSTRAINT "GuestGroupMember_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestGroupMember" ADD CONSTRAINT "GuestGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "GuestGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
