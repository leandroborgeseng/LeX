-- CreateTable
CREATE TABLE "PatrimonyAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialEntityId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "estimatedValue" DECIMAL NOT NULL,
    "acquisitionDate" DATETIME,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PatrimonyAsset_financialEntityId_fkey" FOREIGN KEY ("financialEntityId") REFERENCES "FinancialEntity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PatrimonyAsset_financialEntityId_idx" ON "PatrimonyAsset"("financialEntityId");
