# 🔄 ISTRUZIONI RIPRISTINO COMPLETO SISTEMA

## 📦 Contenuto Backup

### Cartelle di Backup Create:
- `BACKUP_COMPLETO_20250820_061500.md` - Documentazione completa stato sistema
- `backup_[timestamp]_client_code/` - Codice frontend React completo
- `backup_[timestamp]_server_code/` - Codice backend Express completo  
- `backup_[timestamp]_project_files/` - File configurazione e shared

## 🚨 PROCEDURA RIPRISTINO EMERGENZA

### 1. Ripristino Database (se corrotto)
```bash
# Resetta lo schema alle definizioni correnti
npm run db:push --force

# Riattiva trigger se necessario
psql $DATABASE_URL -c "
DROP TRIGGER IF EXISTS compensation_totals_trigger ON compensations;
CREATE TRIGGER compensation_totals_trigger
    BEFORE INSERT OR UPDATE ON compensations
    FOR EACH ROW EXECUTE FUNCTION calculate_compensation_totals();
"
```

### 2. Ripristino Codice Frontend
```bash
# Se client/ è corrotto, ripristina da backup
rm -rf client/
cp -r database-backups/backup_[timestamp]_client_code/ client/
```

### 3. Ripristino Codice Backend
```bash
# Se server/ è corrotto, ripristina da backup
rm -rf server/
cp -r database-backups/backup_[timestamp]_server_code/ server/
```

### 4. Ripristino File Configurazione
```bash
# Ripristina shared/ e file config se necessario
cp -r database-backups/backup_[timestamp]_project_files/shared/ ./
cp database-backups/backup_[timestamp]_project_files/*.ts ./
cp database-backups/backup_[timestamp]_project_files/*.json ./
```

### 5. Restart Completo Sistema
```bash
# Reinstalla dipendenze se necessario
npm install

# Avvia applicazione
npm run dev
```

### 6. Verifica Funzionamento
```bash
# Test automatico sistema compensi
node scripts/verify-compensation-calculations.js

# Output atteso: 10/10 TEST SUPERATI ✅
```

## 🔧 Test di Controllo Rapido

### Verifica Database:
```sql
-- Controllo trigger attivo
SELECT count(*) FROM compensations WHERE total_amount > 0;
-- Deve restituire: 5 righe

-- Test calcolo automatico
UPDATE compensations SET regular_hours = regular_hours WHERE id = (SELECT id FROM compensations LIMIT 1);
-- Se trigger funziona: nessun errore
```

### Verifica Frontend:
- Accedi a `/compensation-table`
- Modifica una cella (ore/tariffe)
- Verifica aggiornamento automatico totali
- Testa export PDF/CSV

### Verifica Backend:
```bash
# Test API endpoints
curl -X GET "http://localhost:5000/api/compensations" 
curl -X GET "http://localhost:5000/api/staff"
```

## ⚠️ Note Importanti

1. **Backup automatico**: Il sistema crea checkpoint automatici, usa anche quelli per ripristini parziali
2. **Database remoto**: I dati sono su Neon PostgreSQL, solo schema va ricreato
3. **File .env**: Controlla che DATABASE_URL sia corretto dopo ripristino
4. **Trigger PostgreSQL**: È la parte più critica, verifica sempre che funzioni

## 📞 Troubleshooting

### Problema: Calcoli compensi non automatici
```sql
-- Riapplica trigger
DROP FUNCTION IF EXISTS calculate_compensation_totals() CASCADE;
CREATE OR REPLACE FUNCTION calculate_compensation_totals()
RETURNS TRIGGER AS $$
DECLARE
    staff_weekday_rate numeric;
    staff_holiday_rate numeric;
    staff_mileage_rate numeric;
BEGIN
    SELECT weekday_rate, holiday_rate, mileage_rate 
    INTO staff_weekday_rate, staff_holiday_rate, staff_mileage_rate
    FROM staff WHERE id = NEW.staff_id;
    
    NEW.weekday_total = (COALESCE(NEW.regular_hours, 0) * COALESCE(staff_weekday_rate, 0));
    NEW.holiday_total = (COALESCE(NEW.holiday_hours, 0) * COALESCE(staff_holiday_rate, 0));
    NEW.mileage_total = (COALESCE(NEW.total_mileage, 0) * COALESCE(staff_mileage_rate, 0));
    NEW.total_amount = (COALESCE(NEW.weekday_total, 0) + COALESCE(NEW.holiday_total, 0) + COALESCE(NEW.mileage_total, 0));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER compensation_totals_trigger
    BEFORE INSERT OR UPDATE ON compensations
    FOR EACH ROW EXECUTE FUNCTION calculate_compensation_totals();
```

### Problema: Frontend non carica
```bash
# Reinstalla dipendenze
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Problema: Export PDF/CSV non funziona
- Verifica dipendenze: `jspdf`, `jspdf-autotable`, `xlsx`
- Controlla file: `client/src/pages/compensation-table.tsx` linee 42-49

**Stato del backup**: Sistema completamente funzionante al momento del backup ✅