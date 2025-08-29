// Script semplice per trovare DOINA
const { execSync } = require('child_process');

try {
  console.log('🔍 RICERCA DOINA CATALINOIU...');
  
  // Usa psql direttamente se disponibile
  const result = execSync(`psql "${process.env.DATABASE_URL}" -c "SELECT 'clients' as type, id, first_name, last_name, external_id FROM clients WHERE LOWER(first_name) = 'doina' UNION ALL SELECT 'staff' as type, id, first_name, last_name, external_id FROM staff WHERE LOWER(first_name) = 'doina';"`, 
    { encoding: 'utf8' });
  
  console.log('📊 RISULTATI:');
  console.log(result);
  
} catch (error) {
  console.error('❌ ERRORE:', error.message);
  console.log('\n💡 SOLUZIONE: Verifica manualmente nell\'applicazione web su http://localhost:5000');
}