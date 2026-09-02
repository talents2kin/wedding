-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED');

-- AlterTable: add relations to User (no columns needed, relations are handled by FK on child tables)

-- CreateTable: CoupleAccount
CREATE TABLE "CoupleAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guestCap" INTEGER NOT NULL DEFAULT 50,
    "templateLimit" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoupleAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PlannerAccount
CREATE TABLE "PlannerAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Wedding
CREATE TABLE "Wedding" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "coupleAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Ceremony
CREATE TABLE "Ceremony" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ceremony_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Guest
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "rsvp" "RsvpStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoupleAccount_userId_key" ON "CoupleAccount"("userId");
CREATE UNIQUE INDEX "PlannerAccount_userId_key" ON "PlannerAccount"("userId");
CREATE UNIQUE INDEX "Wedding_coupleAccountId_key" ON "Wedding"("coupleAccountId");

-- AddForeignKey
ALTER TABLE "CoupleAccount" ADD CONSTRAINT "CoupleAccount_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlannerAccount" ADD CONSTRAINT "PlannerAccount_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Wedding" ADD CONSTRAINT "Wedding_coupleAccountId_fkey"
    FOREIGN KEY ("coupleAccountId") REFERENCES "CoupleAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Ceremony" ADD CONSTRAINT "Ceremony_weddingId_fkey"
    FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Guest" ADD CONSTRAINT "Guest_weddingId_fkey"
    FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
