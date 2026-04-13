-- CreateTable
CREATE TABLE "FinancialHistorySnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceDate" DATETIME NOT NULL,
    "financialEntityId" TEXT,
    "note" TEXT,
    "consolidatedBalance" REAL,
    "resultYearConsolidated" REAL,
    "financingOutstanding" REAL,
    "cdbPrincipalSum" REAL,
    "cdbProjectedNet5y" REAL,
    "payload" TEXT NOT NULL,
    CONSTRAINT "FinancialHistorySnapshot_financialEntityId_fkey" FOREIGN KEY ("financialEntityId") REFERENCES "FinancialEntity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FinancialHistorySnapshot_referenceDate_idx" ON "FinancialHistorySnapshot"("referenceDate");

-- CreateIndex
CREATE INDEX "FinancialHistorySnapshot_createdAt_idx" ON "FinancialHistorySnapshot"("createdAt");
