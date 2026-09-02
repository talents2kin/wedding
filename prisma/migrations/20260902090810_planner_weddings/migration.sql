-- AlterTable
ALTER TABLE "Ceremony" ADD COLUMN     "date" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PlannerAccount" ADD COLUMN     "weddingLimit" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Wedding" ADD COLUMN     "plannerAccountId" TEXT,
ALTER COLUMN "coupleAccountId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Wedding" ADD CONSTRAINT "Wedding_plannerAccountId_fkey" FOREIGN KEY ("plannerAccountId") REFERENCES "PlannerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
