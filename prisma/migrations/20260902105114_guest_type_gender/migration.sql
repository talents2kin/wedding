-- CreateEnum
CREATE TYPE "GuestType" AS ENUM ('SINGLETON', 'COUPLE');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MR', 'MME');

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "gender" "Gender",
ADD COLUMN     "guestType" "GuestType" NOT NULL DEFAULT 'SINGLETON';
