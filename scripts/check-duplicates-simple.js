const { db } = require('../server/db.js');
const { sql } = require('drizzle-orm');

async function checkSimpleDuplicates() {
  console.log('🔍 VERIFICA DUPLICATI SEMPLIFICATA');
  
  try {
    // Query semplice per DOINA
    console.log('\n🚨 RICERCA DOINA CATALINOIU:');
    const doinaResults = await db.execute(sql`
      SELECT 'clients' as table_type, id, first_name, last_name, external_id
      FROM clients 
      WHERE LOWER(first_name) = 'doina' AND LOWER(last_name) = 'catalinoiu'
      
      UNION ALL
      
      SELECT 'staff' as table_type, id, first_name, last_name, external_id
      FROM staff 
      WHERE LOWER(first_name) = 'doina' AND LOWER(last_name) = 'catalinoiu'
    `);
    
    if (doinaResults.rows.length > 0) {
      console.log('❌ DOINA TROVATA:');
      doinaResults.rows.forEach(row => {
        console.log(`   ${row.table_type.toUpperCase()}: ${row.first_name} ${row.last_name}`);
        console.log(`   ID: ${row.id}`);
        console.log(`   External ID: ${row.external_id}`);
        console.log('   ---');
      });
    } else {
      console.log('✅ DOINA non trovata nei duplicati');
    }
    
    // Query semplice per external_id duplicati
    console.log('\n🔍 EXTERNAL_ID DUPLICATI:');
    const externalIdDuplicates = await db.execute(sql`
      SELECT external_id, COUNT(*) as count
      FROM (
        SELECT external_id FROM clients WHERE external_id IS NOT NULL
        UNION ALL
        SELECT external_id FROM staff WHERE external_id IS NOT NULL
      ) combined
      GROUP BY external_id
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    if (externalIdDuplicates.rows.length > 0) {
      console.log('❌ EXTERNAL_ID DUPLICATI TROVATI:');
      externalIdDuplicates.rows.forEach(row => {
        console.log(`   External ID: ${row.external_id} (${row.count} occorrenze)`);
      });
    } else {
      console.log('✅ Nessun external_id duplicato trovato');
    }
    
  } catch (error) {
    console.error('❌ ERRORE:', error.message);
  }
  
  console.log('\n✅ VERIFICA SEMPLIFICATA COMPLETATA');
}

checkSimpleDuplicates().catch(console.error);