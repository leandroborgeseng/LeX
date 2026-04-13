-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "financingInstallmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Expense_financingInstallmentId_key" ON "Expense"("financingInstallmentId");
