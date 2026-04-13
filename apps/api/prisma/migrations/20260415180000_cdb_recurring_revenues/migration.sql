-- AlterTable
ALTER TABLE "CdbApplication" ADD COLUMN "recurrenceEnabled" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CdbApplication" ADD COLUMN "recurrenceEndDate" DATETIME;
ALTER TABLE "CdbApplication" ADD COLUMN "revenueSyncHorizonMonths" INTEGER NOT NULL DEFAULT 36;

-- AlterTable
ALTER TABLE "Revenue" ADD COLUMN "cdbApplicationId" TEXT;
ALTER TABLE "Revenue" ADD COLUMN "cdbAccrualYear" INTEGER;
ALTER TABLE "Revenue" ADD COLUMN "cdbAccrualMonth" INTEGER;

-- CreateIndex
CREATE INDEX "Revenue_cdbApplicationId_idx" ON "Revenue"("cdbApplicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Revenue_cdbApplicationId_cdbAccrualYear_cdbAccrualMonth_key" ON "Revenue"("cdbApplicationId", "cdbAccrualYear", "cdbAccrualMonth");
