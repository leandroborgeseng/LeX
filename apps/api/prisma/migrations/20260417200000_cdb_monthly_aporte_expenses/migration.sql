-- Aporte mensal opcional (CdbApplication) e vínculo das despesas automáticas (Expense).
ALTER TABLE "CdbApplication" ADD COLUMN "monthlyAporteAmount" DECIMAL NOT NULL DEFAULT 0;

ALTER TABLE "Expense" ADD COLUMN "cdbApplicationId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "cdbAporteYear" INTEGER;
ALTER TABLE "Expense" ADD COLUMN "cdbAporteMonth" INTEGER;

CREATE UNIQUE INDEX "Expense_cdbApplicationId_cdbAporteYear_cdbAporteMonth_key" ON "Expense"("cdbApplicationId", "cdbAporteYear", "cdbAporteMonth");

CREATE INDEX "Expense_cdbApplicationId_idx" ON "Expense"("cdbApplicationId");
