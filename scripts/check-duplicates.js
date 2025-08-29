import { db } from '../server/db.js';
import { clients, staff, timeLogs } from '../shared/schema.js';
import { sql } from 'drizzle-orm';

async function checkDuplicates() {
  console.log('🔍 VERIFICA DUPLICATI AVVIATA');
  console.log('=' .repeat(50));
  
  try {
    // 1. DUPLICATI EXTERNAL_ID - CLIENTI
    console.log('\n1️⃣  DUPLICATI EXTERNAL_ID - CLIENTI:');
    const clientDuplicates = await db.execute(sql`
      SELECT 
        external_id,
        COUNT(*) as count,
        STRING_AGG(id::text, ', ') as client_ids,
        STRING_AGG(first_name || ' ' || last_name, ', ') as names,
        STRING_AGG(COALESCE(fiscal_code, 'N/A'), ', ') as fiscal_codes
      FROM clients 
      WHERE external_id IS NOT NULL AND external_id != ''
      GROUP BY external_id 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    if (clientDuplicates.rows.length > 0) {
      console.log('❌ DUPLICATI TROVATI:');
      clientDuplicates.rows.forEach(row => {
        console.log(`   External ID: ${row.external_id} (${row.count} duplicati)`);
        console.log(`   Nomi: ${row.names}`);
        console.log(`   IDs: ${row.client_ids}`);
        console.log(`   Codici Fiscali: ${row.fiscal_codes}`);
        console.log('   ---');
      });
    } else {
      console.log('✅ Nessun duplicato external_id trovato nei clienti');
    }

    // 2. DUPLICATI EXTERNAL_ID - STAFF
    console.log('\n2️⃣  DUPLICATI EXTERNAL_ID - STAFF:');
    const staffDuplicates = await db.execute(sql`
      SELECT 
        external_id,
        COUNT(*) as count,
        STRING_AGG(id::text, ', ') as staff_ids,
        STRING_AGG(first_name || ' ' || last_name, ', ') as names,
        STRING_AGG(type, ', ') as types
      FROM staff 
      WHERE external_id IS NOT NULL AND external_id != ''
      GROUP BY external_id 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    if (staffDuplicates.rows.length > 0) {
      console.log('❌ DUPLICATI TROVATI:');
      staffDuplicates.rows.forEach(row => {
        console.log(`   External ID: ${row.external_id} (${row.count} duplicati)`);
        console.log(`   Nomi: ${row.names}`);
        console.log(`   IDs: ${row.staff_ids}`);
        console.log(`   Tipi: ${row.types}`);
        console.log('   ---');
      });
    } else {
      console.log('✅ Nessun duplicato external_id trovato nello staff');
    }

    // 3. CROSS-TABLE DUPLICATI (STESSO EXTERNAL_ID IN CLIENT E STAFF)
    console.log('\n3️⃣  CROSS-TABLE DUPLICATI (CLIENT + STAFF):');
    const crossTableDuplicates = await db.execute(sql`
      SELECT 
        external_id,
        table_type,
        record_id,
        name,
        fiscal_code
      FROM (
        SELECT 
          c.external_id,
          'CLIENT' as table_type,
          c.id as record_id,
          c.first_name || ' ' || c.last_name as name,
          c.fiscal_code
        FROM clients c
        WHERE c.external_id IN (
          SELECT s.external_id 
          FROM staff s 
          WHERE s.external_id IS NOT NULL AND s.external_id != ''
        )
        AND c.external_id IS NOT NULL AND c.external_id != ''
        
        UNION ALL
        
        SELECT 
          s.external_id,
          'STAFF' as table_type,
          s.id as record_id,
          s.first_name || ' ' || s.last_name as name,
          NULL as fiscal_code
        FROM staff s
        WHERE s.external_id IN (
          SELECT c.external_id 
          FROM clients c 
          WHERE c.external_id IS NOT NULL AND c.external_id != ''
        )
        AND s.external_id IS NOT NULL AND s.external_id != ''
      ) combined
      ORDER BY external_id, table_type
    `);
    
    if (crossTableDuplicates.rows.length > 0) {
      console.log('❌ CROSS-TABLE DUPLICATI TROVATI:');
      let currentExternalId = null;
      crossTableDuplicates.rows.forEach(row => {
        if (row.external_id !== currentExternalId) {
          console.log(`\n   🚨 External ID: ${row.external_id}`);
          currentExternalId = row.external_id;
        }
        console.log(`      ${row.table_type}: ${row.name} (ID: ${row.record_id})`);
        if (row.fiscal_code) {
          console.log(`      Codice Fiscale: ${row.fiscal_code}`);
        }
      });
    } else {
      console.log('✅ Nessun cross-table duplicato trovato');
    }

    // 4. DUPLICATI NOMI - CLIENTI
    console.log('\n4️⃣  DUPLICATI NOMI - CLIENTI:');
    const clientNameDuplicates = await db.execute(sql`
      SELECT 
        LOWER(TRIM(first_name)) as first_name_norm,
        LOWER(TRIM(last_name)) as last_name_norm,
        COUNT(*) as count,
        STRING_AGG(id::text, ', ') as client_ids,
        STRING_AGG(first_name || ' ' || last_name, ', ') as original_names,
        STRING_AGG(COALESCE(external_id, 'N/A'), ', ') as external_ids
      FROM clients 
      GROUP BY LOWER(TRIM(first_name)), LOWER(TRIM(last_name))
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10
    `);
    
    if (clientNameDuplicates.rows.length > 0) {
      console.log('❌ DUPLICATI NOMI TROVATI (primi 10):');
      clientNameDuplicates.rows.forEach(row => {
        console.log(`   Nome: ${row.first_name_norm} ${row.last_name_norm} (${row.count} duplicati)`);
        console.log(`   Nomi originali: ${row.original_names}`);
        console.log(`   External IDs: ${row.external_ids}`);
        console.log('   ---');
      });
    } else {
      console.log('✅ Nessun duplicato nome trovato nei clienti');
    }

    // 5. DUPLICATI CODICE FISCALE
    console.log('\n5️⃣  DUPLICATI CODICE FISCALE:');
    const fiscalCodeDuplicates = await db.execute(sql`
      SELECT 
        fiscal_code,
        COUNT(*) as count,
        STRING_AGG(id::text, ', ') as client_ids,
        STRING_AGG(first_name || ' ' || last_name, ', ') as names,
        STRING_AGG(COALESCE(external_id, 'N/A'), ', ') as external_ids
      FROM clients 
      WHERE fiscal_code IS NOT NULL AND fiscal_code != ''
      GROUP BY fiscal_code 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    if (fiscalCodeDuplicates.rows.length > 0) {
      console.log('❌ DUPLICATI CODICE FISCALE TROVATI:');
      fiscalCodeDuplicates.rows.forEach(row => {
        console.log(`   Codice Fiscale: ${row.fiscal_code} (${row.count} duplicati)`);
        console.log(`   Nomi: ${row.names}`);
        console.log(`   External IDs: ${row.external_ids}`);
        console.log('   ---');
      });
    } else {
      console.log('✅ Nessun duplicato codice fiscale trovato');
    }

    // 6. DUPLICATI TIME LOGS - EXTERNAL_IDENTIFIER
    console.log('\n6️⃣  DUPLICATI TIME LOGS - EXTERNAL_IDENTIFIER (primi 10):');
    const timeLogDuplicates = await db.execute(sql`
      SELECT 
        external_identifier,
        COUNT(*) as count,
        STRING_AGG(id::text, ', ') as time_log_ids,
        STRING_AGG(scheduled_start_time::text, ', ') as start_times
      FROM time_logs 
      WHERE external_identifier IS NOT NULL AND external_identifier != ''
      GROUP BY external_identifier 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10
    `);
    
    if (timeLogDuplicates.rows.length > 0) {
      console.log('❌ DUPLICATI TIME LOGS TROVATI:');
      timeLogDuplicates.rows.forEach(row => {
        console.log(`   External Identifier: ${row.external_identifier} (${row.count} duplicati)`);
        console.log(`   Time Log IDs: ${row.time_log_ids}`);
        console.log('   ---');
      });
    } else {
      console.log('✅ Nessun duplicato external_identifier trovato nei time logs');
    }

    // 7. STATISTICHE GENERALI
    console.log('\n7️⃣  STATISTICHE GENERALI:');
    const stats = await db.execute(sql`
      SELECT 
        'clients' as table_name,
        COUNT(*) as total_records,
        COUNT(DISTINCT external_id) as unique_external_ids,
        COUNT(*) - COUNT(DISTINCT external_id) as potential_duplicates
      FROM clients
      WHERE external_id IS NOT NULL AND external_id != ''
      
      UNION ALL
      
      SELECT 
        'staff' as table_name,
        COUNT(*) as total_records,
        COUNT(DISTINCT external_id) as unique_external_ids,
        COUNT(*) - COUNT(DISTINCT external_id) as potential_duplicates
      FROM staff
      WHERE external_id IS NOT NULL AND external_id != ''
      
      UNION ALL
      
      SELECT 
        'time_logs' as table_name,
        COUNT(*) as total_records,
        COUNT(DISTINCT external_identifier) as unique_external_ids,
        COUNT(*) - COUNT(DISTINCT external_identifier) as potential_duplicates
      FROM time_logs
      WHERE external_identifier IS NOT NULL AND external_identifier != ''
    `);
    
    console.log('📊 STATISTICHE:');
    stats.rows.forEach(row => {
      console.log(`   ${row.table_name.toUpperCase()}:`);
      console.log(`      Total records: ${row.total_records}`);
      console.log(`      Unique external IDs: ${row.unique_external_ids}`);
      console.log(`      Potential duplicates: ${row.potential_duplicates}`);
    });

  } catch (error) {
    console.error('❌ ERRORE DURANTE LA VERIFICA:', error);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ VERIFICA DUPLICATI COMPLETATA');
}

// Esegui la verifica
checkDuplicates().catch(console.error);