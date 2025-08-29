// Script per rimuovere DOINA CATALINOIU dalla tabella clienti
const { execSync } = require('child_process');
const fs = require('fs');

async function removeDoinaFromClients() {
  console.log('🚨 RIMOZIONE DOINA CATALINOIU DALLA TABELLA CLIENTI');
  console.log('=' .repeat(60));
  
  try {
    // Leggi il file .env per ottenere DATABASE_URL
    const envContent = fs.readFileSync('.env', 'utf8');
    const databaseUrl = envContent.match(/DATABASE_URL=(.+)/)?.[1];
    
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL non trovato nel file .env');
      return;
    }
    
    console.log('🔍 STEP 1: Verifica presenza DOINA nei clienti...');
    
    // Query per verificare la presenza di DOINA nei clienti
    const checkQuery = `
      SELECT id, first_name, last_name, external_id, fiscal_code
      FROM clients 
      WHERE LOWER(first_name) = 'doina' AND LOWER(last_name) = 'catalinoiu';
    `;
    
    const checkResult = execSync(`echo "${checkQuery}" | psql "${databaseUrl}"`, 
      { encoding: 'utf8', stdio: 'pipe' });
    
    console.log('📊 RISULTATO VERIFICA:');
    console.log(checkResult);
    
    if (!checkResult.includes('DOINA') && !checkResult.includes('doina')) {
      console.log('✅ DOINA non trovata nella tabella clienti. Nessuna azione necessaria.');
      return;
    }
    
    console.log('\n🚨 DOINA TROVATA NEI CLIENTI - PROCEDO CON LA RIMOZIONE');
    console.log('⚠️  ATTENZIONE: Questa operazione è irreversibile!');
    
    // Backup prima della rimozione
    console.log('\n💾 STEP 2: Backup del record prima della rimozione...');
    const backupQuery = `
      SELECT * FROM clients 
      WHERE LOWER(first_name) = 'doina' AND LOWER(last_name) = 'catalinoiu';
    `;
    
    const backupResult = execSync(`echo "${backupQuery}" | psql "${databaseUrl}"`, 
      { encoding: 'utf8', stdio: 'pipe' });
    
    // Salva il backup in un file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `database-backups/doina-client-backup-${timestamp}.txt`;
    
    if (!fs.existsSync('database-backups')) {
      fs.mkdirSync('database-backups', { recursive: true });
    }
    
    fs.writeFileSync(backupFile, `BACKUP DOINA CLIENT RECORD - ${new Date().toISOString()}\n\n${backupResult}`);
    console.log(`✅ Backup salvato in: ${backupFile}`);
    
    // Rimozione del record
    console.log('\n🗑️  STEP 3: Rimozione DOINA dalla tabella clienti...');
    const deleteQuery = `
      DELETE FROM clients 
      WHERE LOWER(first_name) = 'doina' AND LOWER(last_name) = 'catalinoiu';
    `;
    
    const deleteResult = execSync(`echo "${deleteQuery}" | psql "${databaseUrl}"`, 
      { encoding: 'utf8', stdio: 'pipe' });
    
    console.log('📊 RISULTATO RIMOZIONE:');
    console.log(deleteResult);
    
    // Verifica finale
    console.log('\n🔍 STEP 4: Verifica finale...');
    const finalCheckResult = execSync(`echo "${checkQuery}" | psql "${databaseUrl}"`, 
      { encoding: 'utf8', stdio: 'pipe' });
    
    if (!finalCheckResult.includes('DOINA') && !finalCheckResult.includes('doina')) {
      console.log('✅ SUCCESSO! DOINA rimossa dalla tabella clienti.');
    } else {
      console.log('❌ ERRORE: DOINA ancora presente nella tabella clienti.');
      return;
    }
    
    // Verifica che DOINA sia ancora presente nello staff
    console.log('\n🔍 STEP 5: Verifica presenza DOINA nello staff...');
    const staffCheckQuery = `
      SELECT id, first_name, last_name, external_id
      FROM staff 
      WHERE LOWER(first_name) = 'doina' AND LOWER(last_name) = 'catalinoiu';
    `;
    
    const staffCheckResult = execSync(`echo "${staffCheckQuery}" | psql "${databaseUrl}"`, 
      { encoding: 'utf8', stdio: 'pipe' });
    
    console.log('📊 VERIFICA STAFF:');
    console.log(staffCheckResult);
    
    if (staffCheckResult.includes('DOINA') || staffCheckResult.includes('doina')) {
      console.log('✅ PERFETTO! DOINA è ancora presente nello staff come dovrebbe essere.');
    } else {
      console.log('⚠️  ATTENZIONE: DOINA non trovata nello staff. Verifica manualmente.');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 OPERAZIONE COMPLETATA CON SUCCESSO!');
    console.log('📋 RIEPILOGO:');
    console.log('   ✅ DOINA rimossa dalla tabella clienti');
    console.log('   ✅ DOINA mantenuta nella tabella staff');
    console.log('   ✅ Backup creato in:', backupFile);
    console.log('   ✅ Problema duplicato risolto');
    
  } catch (error) {
    console.error('❌ ERRORE DURANTE LA RIMOZIONE:', error.message);
    console.log('\n💡 SOLUZIONI ALTERNATIVE:');
    console.log('1. Verifica che l\'applicazione sia in esecuzione');
    console.log('2. Controlla la connessione al database');
    console.log('3. Rimuovi manualmente via interfaccia web su http://localhost:5000');
  }
}

// Esegui la rimozione
removeDoinaFromClients();