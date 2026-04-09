-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FinancialEntity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "HouseholdMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "parentId" TEXT,
    CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PayerSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialEntityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bank" TEXT,
    "type" TEXT NOT NULL DEFAULT 'CORRENTE',
    "initialBalance" DECIMAL NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankAccount_financialEntityId_fkey" FOREIGN KEY ("financialEntityId") REFERENCES "FinancialEntity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreditCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialEntityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bank" TEXT,
    "limitAmount" DECIMAL,
    "closingDay" INTEGER,
    "dueDay" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditCard_financialEntityId_fkey" FOREIGN KEY ("financialEntityId") REFERENCES "FinancialEntity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientName" TEXT NOT NULL,
    "monthlyGross" DECIMAL NOT NULL DEFAULT 0,
    "estimatedTax" DECIMAL NOT NULL DEFAULT 0,
    "estimatedOpCost" DECIMAL NOT NULL DEFAULT 0,
    "estimatedNet" DECIMAL NOT NULL DEFAULT 0,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "recurrence" TEXT NOT NULL DEFAULT 'MONTHLY',
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "salary" DECIMAL NOT NULL DEFAULT 0,
    "charges" DECIMAL NOT NULL DEFAULT 0,
    "benefits" DECIMAL NOT NULL DEFAULT 0,
    "totalMonthly" DECIMAL NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Financing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialEntityId" TEXT,
    "name" TEXT NOT NULL,
    "creditor" TEXT,
    "originalValue" DECIMAL NOT NULL,
    "monthlyRate" DECIMAL NOT NULL,
    "installmentsCount" INTEGER NOT NULL,
    "amortSystem" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "installmentValue" DECIMAL,
    "currentBalance" DECIMAL NOT NULL,
    "totalPaid" DECIMAL NOT NULL DEFAULT 0,
    "interestPaid" DECIMAL NOT NULL DEFAULT 0,
    "amortAccumulated" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Financing_financialEntityId_fkey" FOREIGN KEY ("financialEntityId") REFERENCES "FinancialEntity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancingInstallment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financingId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "payment" DECIMAL NOT NULL,
    "interest" DECIMAL NOT NULL,
    "amortization" DECIMAL NOT NULL,
    "balanceAfter" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PREVISTO',
    "paidAt" DATETIME,
    CONSTRAINT "FinancingInstallment_financingId_fkey" FOREIGN KEY ("financingId") REFERENCES "Financing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreditCardInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creditCardId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "closingDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "total" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    CONSTRAINT "CreditCardInvoice_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreditCardTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creditCardId" TEXT NOT NULL,
    "financialEntityId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "purchaseDate" DATETIME NOT NULL,
    "categoryId" TEXT,
    "originatorId" TEXT,
    "installmentGroup" TEXT,
    "installmentNumber" INTEGER NOT NULL DEFAULT 1,
    "installmentTotal" INTEGER NOT NULL DEFAULT 1,
    "competenceYear" INTEGER NOT NULL,
    "competenceMonth" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditCardTransaction_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CreditCardTransaction_financialEntityId_fkey" FOREIGN KEY ("financialEntityId") REFERENCES "FinancialEntity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CreditCardTransaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CreditCardInvoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CreditCardTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CreditCardTransaction_originatorId_fkey" FOREIGN KEY ("originatorId") REFERENCES "HouseholdMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InternalTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT,
    "fromEntityId" TEXT,
    "toEntityId" TEXT,
    "fromAccountId" TEXT,
    "toAccountId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InternalTransfer_fromEntityId_fkey" FOREIGN KEY ("fromEntityId") REFERENCES "FinancialEntity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InternalTransfer_toEntityId_fkey" FOREIGN KEY ("toEntityId") REFERENCES "FinancialEntity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InternalTransfer_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "BankAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InternalTransfer_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "BankAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Revenue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialEntityId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "categoryId" TEXT,
    "payerSourceId" TEXT,
    "grossAmount" DECIMAL NOT NULL,
    "taxDiscount" DECIMAL NOT NULL DEFAULT 0,
    "netAmount" DECIMAL NOT NULL,
    "competenceDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "receivedAt" DATETIME,
    "destinationAccountId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PREVISTO',
    "notes" TEXT,
    "isRecurringTemplate" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceFrequency" TEXT,
    "recurrenceEndDate" DATETIME,
    "recurringParentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Revenue_financialEntityId_fkey" FOREIGN KEY ("financialEntityId") REFERENCES "FinancialEntity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Revenue_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Revenue_payerSourceId_fkey" FOREIGN KEY ("payerSourceId") REFERENCES "PayerSource" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Revenue_destinationAccountId_fkey" FOREIGN KEY ("destinationAccountId") REFERENCES "BankAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Revenue_recurringParentId_fkey" FOREIGN KEY ("recurringParentId") REFERENCES "Revenue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialEntityId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "categoryId" TEXT,
    "subcategoryLabel" TEXT,
    "originatorId" TEXT,
    "amount" DECIMAL NOT NULL,
    "competenceDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "paidAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PREVISTO',
    "paymentMethod" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "creditCardId" TEXT,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "isRecurringTemplate" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceFrequency" TEXT,
    "recurrenceEndDate" DATETIME,
    "recurringParentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Expense_financialEntityId_fkey" FOREIGN KEY ("financialEntityId") REFERENCES "FinancialEntity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Expense_originatorId_fkey" FOREIGN KEY ("originatorId") REFERENCES "HouseholdMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Expense_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Expense_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Expense_recurringParentId_fkey" FOREIGN KEY ("recurringParentId") REFERENCES "Expense" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdMember_name_key" ON "HouseholdMember"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_kind_key" ON "Category"("name", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "PayerSource_name_key" ON "PayerSource"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CreditCardInvoice_creditCardId_year_month_key" ON "CreditCardInvoice"("creditCardId", "year", "month");
