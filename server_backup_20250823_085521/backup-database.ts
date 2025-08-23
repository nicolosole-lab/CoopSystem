import { db } from './db';
import { clients, staff, timeLogs, clientStaffAssignments, clientBudgetConfigs, staffCompensations, excelImports, excelData } from '@shared/schema';
import * as fs from 'fs';
import * as path from 'path';

async function backupDatabase() {
  console.log('Starting database backup...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -1);
  const backupDir = path.join(process.cwd(), 'database-backups', timestamp);
  
  // Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  try {
    // Backup clients
    console.log('Backing up clients...');
    const clientsData = await db.select().from(clients);
    fs.writeFileSync(
      path.join(backupDir, 'clients.json'),
      JSON.stringify(clientsData, null, 2)
    );
    console.log(`✓ Backed up ${clientsData.length} clients`);
    
    // Backup staff
    console.log('Backing up staff...');
    const staffData = await db.select().from(staff);
    fs.writeFileSync(
      path.join(backupDir, 'staff.json'),
      JSON.stringify(staffData, null, 2)
    );
    console.log(`✓ Backed up ${staffData.length} staff members`);
    
    // Backup time logs
    console.log('Backing up time logs...');
    const timeLogsData = await db.select().from(timeLogs);
    fs.writeFileSync(
      path.join(backupDir, 'time_logs.json'),
      JSON.stringify(timeLogsData, null, 2)
    );
    console.log(`✓ Backed up ${timeLogsData.length} time logs`);
    
    // Backup client-staff assignments
    console.log('Backing up client-staff assignments...');
    const assignmentsData = await db.select().from(clientStaffAssignments);
    fs.writeFileSync(
      path.join(backupDir, 'client_staff_assignments.json'),
      JSON.stringify(assignmentsData, null, 2)
    );
    console.log(`✓ Backed up ${assignmentsData.length} assignments`);
    
    // Backup client budget configs
    console.log('Backing up client budget configs...');
    const budgetConfigsData = await db.select().from(clientBudgetConfigs);
    fs.writeFileSync(
      path.join(backupDir, 'client_budget_configs.json'),
      JSON.stringify(budgetConfigsData, null, 2)
    );
    console.log(`✓ Backed up ${budgetConfigsData.length} budget configs`);
    
    // Backup staff compensations
    console.log('Backing up staff compensations...');
    const compensationsData = await db.select().from(staffCompensations);
    fs.writeFileSync(
      path.join(backupDir, 'staff_compensations.json'),
      JSON.stringify(compensationsData, null, 2)
    );
    console.log(`✓ Backed up ${compensationsData.length} compensations`);
    
    // Backup Excel imports metadata (not the raw data)
    console.log('Backing up Excel import history...');
    const importsData = await db.select().from(excelImports);
    fs.writeFileSync(
      path.join(backupDir, 'excel_imports.json'),
      JSON.stringify(importsData, null, 2)
    );
    console.log(`✓ Backed up ${importsData.length} import records`);
    
    // Create backup summary
    const summary = {
      timestamp,
      backupDate: new Date().toISOString(),
      tables: {
        clients: clientsData.length,
        staff: staffData.length,
        timeLogs: timeLogsData.length,
        clientStaffAssignments: assignmentsData.length,
        clientBudgetConfigs: budgetConfigsData.length,
        staffCompensations: compensationsData.length,
        excelImports: importsData.length
      }
    };
    
    fs.writeFileSync(
      path.join(backupDir, 'backup_summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    console.log('\n✅ Database backup completed successfully!');
    console.log(`📁 Backup location: ${backupDir}`);
    console.log('\nBackup Summary:');
    console.log(JSON.stringify(summary.tables, null, 2));
    
    return backupDir;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

// Run the backup
backupDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });