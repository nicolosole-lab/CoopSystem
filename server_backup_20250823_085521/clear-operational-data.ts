import { db } from './db';
import { 
  timeLogs, 
  clientStaffAssignments, 
  clientBudgetConfigs,
  clientBudgetAllocations,
  budgetExpenses,
  homeCarePlans, 
  staffCompensations, 
  compensationAdjustments,
  excelData,
  excelImports,
  clients,
  staff
} from '@shared/schema';

async function clearOperationalData() {
  console.log('Starting database cleanup...');
  console.log('⚠️  This will clear all operational data while keeping configuration data\n');
  
  try {
    // Start transaction
    await db.transaction(async (tx) => {
      
      // 1. Clear dependent tables first (to avoid foreign key constraints)
      
      console.log('Clearing compensation adjustments...');
      const deletedAdjustments = await tx.delete(compensationAdjustments);
      console.log(`✓ Deleted ${deletedAdjustments.rowCount || 0} compensation adjustments`);
      
      console.log('Clearing staff compensations...');
      const deletedCompensations = await tx.delete(staffCompensations);
      console.log(`✓ Deleted ${deletedCompensations.rowCount || 0} compensations`);
      
      console.log('Clearing time logs...');
      const deletedTimeLogs = await tx.delete(timeLogs);
      console.log(`✓ Deleted ${deletedTimeLogs.rowCount || 0} time logs`);
      
      console.log('Clearing client-staff assignments...');
      const deletedAssignments = await tx.delete(clientStaffAssignments);
      console.log(`✓ Deleted ${deletedAssignments.rowCount || 0} assignments`);
      
      console.log('Clearing client budget configs...');
      const deletedBudgetConfigs = await tx.delete(clientBudgetConfigs);
      console.log(`✓ Deleted ${deletedBudgetConfigs.rowCount || 0} budget configs`);
      
      console.log('Clearing budget expenses...');
      const deletedExpenses = await tx.delete(budgetExpenses);
      console.log(`✓ Deleted ${deletedExpenses.rowCount || 0} budget expenses`);
      
      console.log('Clearing client budget allocations...');
      const deletedAllocations = await tx.delete(clientBudgetAllocations);
      console.log(`✓ Deleted ${deletedAllocations.rowCount || 0} budget allocations`);
      
      console.log('Clearing home care plans...');
      const deletedPlans = await tx.delete(homeCarePlans);
      console.log(`✓ Deleted ${deletedPlans.rowCount || 0} home care plans`);
      
      // 2. Clear Excel import data
      
      console.log('Clearing Excel data...');
      const deletedExcelData = await tx.delete(excelData);
      console.log(`✓ Deleted ${deletedExcelData.rowCount || 0} Excel data rows`);
      
      console.log('Clearing Excel imports...');
      const deletedImports = await tx.delete(excelImports);
      console.log(`✓ Deleted ${deletedImports.rowCount || 0} import records`);
      
      // 3. Clear main entity tables
      
      console.log('Clearing clients...');
      const deletedClients = await tx.delete(clients);
      console.log(`✓ Deleted ${deletedClients.rowCount || 0} clients`);
      
      console.log('Clearing staff...');
      const deletedStaff = await tx.delete(staff);
      console.log(`✓ Deleted ${deletedStaff.rowCount || 0} staff members`);
      
    });
    
    console.log('\n✅ Database cleanup completed successfully!');
    console.log('\n📊 Preserved data:');
    console.log('  • User accounts');
    console.log('  • Budget categories');
    console.log('  • Budget types (10 mandatory codes)');
    console.log('\n🗑️  Cleared data:');
    console.log('  • All clients and staff');
    console.log('  • All time logs');
    console.log('  • All assignments and configurations');
    console.log('  • All Excel import data');
    console.log('  • All compensation records');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

// Add confirmation prompt
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askConfirmation(): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question('\n⚠️  Are you sure you want to clear all operational data? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

// Run the cleanup with confirmation
async function main() {
  console.log('='.repeat(60));
  console.log('DATABASE CLEANUP UTILITY');
  console.log('='.repeat(60));
  console.log('\nThis will DELETE all operational data including:');
  console.log('  • All clients (2,190 records)');
  console.log('  • All staff (40 records)');
  console.log('  • All time logs (32 records)');
  console.log('  • All assignments and configurations');
  console.log('  • All Excel import data (60,533 rows)');
  console.log('\nData that will be KEPT:');
  console.log('  • User accounts');
  console.log('  • Budget categories');
  console.log('  • Budget types');
  
  const confirmed = await askConfirmation();
  
  if (confirmed) {
    await clearOperationalData();
    process.exit(0);
  } else {
    console.log('\n❌ Cleanup cancelled by user');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});