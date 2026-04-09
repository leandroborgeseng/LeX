import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { FinancialEntityModule } from './financial-entity/financial-entity.module';
import { HouseholdMemberModule } from './household-member/household-member.module';
import { CategoryModule } from './category/category.module';
import { PayerSourceModule } from './payer-source/payer-source.module';
import { BankAccountModule } from './bank-account/bank-account.module';
import { CreditCardModule } from './credit-card/credit-card.module';
import { ContractModule } from './contract/contract.module';
import { EmployeeModule } from './employee/employee.module';
import { FinancingModule } from './financing/financing.module';
import { InternalTransferModule } from './internal-transfer/internal-transfer.module';
import { RevenueModule } from './revenue/revenue.module';
import { ExpenseModule } from './expense/expense.module';
import { CreditTxModule } from './credit-tx/credit-tx.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { ProjectionsModule } from './projections/projections.module';
import { LedgerModule } from './ledger/ledger.module';
import { CdbApplicationModule } from './cdb-application/cdb-application.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    LedgerModule,
    AuthModule,
    FinancialEntityModule,
    HouseholdMemberModule,
    CategoryModule,
    PayerSourceModule,
    BankAccountModule,
    CreditCardModule,
    ContractModule,
    EmployeeModule,
    FinancingModule,
    InternalTransferModule,
    RevenueModule,
    ExpenseModule,
    CreditTxModule,
    DashboardModule,
    ReportsModule,
    ProjectionsModule,
    CdbApplicationModule,
  ],
})
export class AppModule {}
