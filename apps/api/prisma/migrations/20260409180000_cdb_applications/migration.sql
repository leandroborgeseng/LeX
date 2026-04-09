-- CreateTable
CREATE TABLE "CdbApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialEntityId" TEXT,
    "name" TEXT NOT NULL,
    "institution" TEXT,
    "principal" REAL NOT NULL,
    "applicationDate" DATETIME NOT NULL,
    "maturityDate" DATETIME,
    "indexerPercentOfCdi" REAL NOT NULL,
    "assumedCdiAnnualPercent" REAL NOT NULL DEFAULT 10.5,
    "active" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CdbApplication_financialEntityId_fkey" FOREIGN KEY ("financialEntityId") REFERENCES "FinancialEntity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
