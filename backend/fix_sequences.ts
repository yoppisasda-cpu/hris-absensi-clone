import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tables = [
    'ExpenseCategory',
    'IncomeCategory',
    'FinancialAccount',
    'Expense',
    'Income',
    'Reimbursement',
    'User',
    'Company',
    'Branch',
    'Product',
    'ProductCategory',
    'Warehouse',
    'WarehouseStock',
    'StockTransaction',
    'Supplier',
    'Customer',
    'Sale',
    'SaleItem',
    'SaleReturn',
    'SaleReturnItem',
    'Announcement',
    'Assignment',
    'Notification',
    'Holiday',
    'LeaveRequest',
    'OvertimeRequest',
    'Payroll',
    'Loan',
    'Asset',
    'Bonus',
    'Exam',
    'PendingBill',
    'PosClosing',
    'Transfer',
    'PurchaseOrder',
    'PurchaseOrderItem',
    'Attendance',
    'Shift',
    'ShiftSchedule',
    'Invoice',
    'EmployeeDocument',
    'KPIScore',
    'KPIIndicator',
    'EmployeeVent',
    'LearningMaterial',
    'KnowledgeReview',
    'ExamAttempt',
    'ExamQuestion',
    'ProductRecipe',
    'CustomizationGroup',
    'CustomizationOption',
    'ProductCustomization',
    'IntegrationRequest',
    'SalesOrder',
    'SalesOrderItem',
    'Shareholder',
    'Dividend'
  ];

  console.log('Fixing sequences...');

  for (const table of tables) {
    try {
      // Check if table exists first to avoid error spam
      const tableCheck: any[] = await prisma.$queryRawUnsafe(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${table}'
        );
      `);
      
      if (!tableCheck[0].exists) {
        // console.log(`Table ${table} does not exist. Skipping.`);
        continue;
      }

      // Get the max ID
      const result: any[] = await prisma.$queryRawUnsafe(`SELECT MAX(id) as max_id FROM "${table}"`);
      const maxId = result[0].max_id || 0;
      
      console.log(`Table ${table}: Max ID is ${maxId}. Resetting sequence...`);
      
      // Reset the sequence
      // If maxId is 0, we set val to 1 and is_called to false. Next val will be 1.
      // If maxId > 0, we set val to maxId and is_called to true. Next val will be maxId + 1.
      await prisma.$executeRawUnsafe(`
        SELECT setval(
          pg_get_serial_sequence('"${table}"', 'id'), 
          GREATEST(1, ${maxId}), 
          ${maxId} > 0
        )
      `);
      
      console.log(`Table ${table}: Success.`);
    } catch (err: any) {
      console.error(`Table ${table}: Error - ${err.message}`);
    }
  }

  await prisma.$disconnect();
}

main();
