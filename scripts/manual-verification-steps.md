# Procedura di Verifica Manuale - Sistema Compensi

## Obiettivo
Verificare il corretto funzionamento del sistema di inserimento tariffe e aggiornamento automatico dei calcoli nella tabella compensi.

## 1. Verifica Prerequisiti

### 1.1 Controllo Trigger Database
```sql
-- Verifica esistenza trigger
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'compensation_totals_trigger';

-- Verifica funzione trigger
SELECT routine_name, routine_definition
FROM information_schema.routines 
WHERE routine_name = 'calculate_compensation_totals';
```

### 1.2 Controllo Struttura Tabelle
```sql
-- Verifica colonne compensations
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'compensations' 
AND column_name IN ('weekday_total', 'holiday_total', 'mileage_total', 'total_amount');

-- Verifica colonne staff
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'staff' 
AND column_name IN ('weekday_rate', 'holiday_rate', 'mileage_rate');
```

## 2. Test di Inserimento Tariffe

### 2.1 Test Modifica Tariffa Feriale
1. **Azione**: Modificare tariffa feriale di un collaboratore
2. **Procedura**:
   ```sql
   -- Backup valori originali
   SELECT id, first_name, last_name, weekday_rate 
   FROM staff WHERE id = 'STAFF_ID_TEST';
   
   -- Modifica tariffa
   UPDATE staff SET weekday_rate = 12.50 WHERE id = 'STAFF_ID_TEST';
   
   -- Forza aggiornamento compensi
   UPDATE compensations SET updated_at = NOW() WHERE staff_id = 'STAFF_ID_TEST';
   ```
3. **Verifica Attesa**: Totali feriali devono riflettere nuova tariffa
4. **Query Verifica**:
   ```sql
   SELECT 
     c.regular_hours,
     s.weekday_rate,
     c.weekday_total,
     (c.regular_hours * s.weekday_rate) as expected
   FROM compensations c
   JOIN staff s ON c.staff_id = s.id
   WHERE s.id = 'STAFF_ID_TEST';
   ```

### 2.2 Test Modifica Tariffa Festiva
1. **Azione**: Modificare tariffa festiva di un collaboratore
2. **Procedura**:
   ```sql
   UPDATE staff SET holiday_rate = 28.00 WHERE id = 'STAFF_ID_TEST';
   UPDATE compensations SET updated_at = NOW() WHERE staff_id = 'STAFF_ID_TEST';
   ```
3. **Verifica**: Totali festivi aggiornati automaticamente

### 2.3 Test Tariffa Chilometrica
1. **Azione**: Modificare tariffa chilometrica
2. **Procedura**:
   ```sql
   UPDATE staff SET mileage_rate = 0.75 WHERE id = 'STAFF_ID_TEST';
   UPDATE compensations SET updated_at = NOW() WHERE staff_id = 'STAFF_ID_TEST';
   ```
3. **Verifica**: Totali chilometrici ricalcolati

## 3. Test di Aggiornamento Ore/Chilometri

### 3.1 Test Modifica Ore Feriali
1. **Azione**: Modificare ore feriali in un compenso
2. **Procedura**:
   ```sql
   UPDATE compensations SET regular_hours = 15.5 WHERE id = 'COMP_ID_TEST';
   ```
3. **Verifica**: weekday_total e total_amount aggiornati automaticamente

### 3.2 Test Modifica Ore Festive
1. **Azione**: Modificare ore festive
2. **Procedura**:
   ```sql
   UPDATE compensations SET holiday_hours = 8.0 WHERE id = 'COMP_ID_TEST';
   ```
3. **Verifica**: holiday_total e total_amount aggiornati

### 3.3 Test Modifica Chilometri
1. **Azione**: Modificare chilometraggio
2. **Procedura**:
   ```sql
   UPDATE compensations SET total_mileage = 45.5 WHERE id = 'COMP_ID_TEST';
   ```
3. **Verifica**: mileage_total e total_amount aggiornati

## 4. Test dell'Interfaccia Web

### 4.1 Test Editing Inline Tariffe
1. **Navigare**: `/compensation-table`
2. **Modificare**: Tariffa feriale (€/h) di un collaboratore
3. **Verificare**: 
   - Toast di conferma "I totali sono stati ricalcolati automaticamente"
   - Totali visibili si aggiornano in tempo reale
   - Refresh pagina mostra valori persistiti

### 4.2 Test Editing Inline Ore
1. **Modificare**: Ore feriali di un compenso
2. **Verificare**: 
   - Totale feriale si aggiorna immediatamente
   - Totale generale si ricalcola
   - Dati persistiti nel database

### 4.3 Test Export PDF/CSV
1. **Eseguire**: Export PDF
2. **Verificare**: Nessun errore `doc.autoTable is not a function`
3. **Controllare**: Valori nel PDF corrispondono a quelli nella tabella

## 5. Test di Consistenza

### 5.1 Verifica Calcoli Esistenti
```sql
-- Trova inconsistenze nei calcoli
SELECT 
  s.first_name || ' ' || s.last_name as staff_name,
  c.regular_hours, c.weekday_total, s.weekday_rate,
  (c.regular_hours * s.weekday_rate) as expected_weekday,
  ABS(c.weekday_total - (c.regular_hours * s.weekday_rate)) as difference
FROM compensations c
JOIN staff s ON c.staff_id = s.id
WHERE ABS(c.weekday_total - (c.regular_hours * s.weekday_rate)) > 0.01
ORDER BY difference DESC;
```

### 5.2 Verifica Totali Generali
```sql
-- Verifica totali generali
SELECT 
  s.first_name || ' ' || s.last_name as staff_name,
  c.weekday_total + c.holiday_total + c.mileage_total as calculated_total,
  c.total_amount as stored_total,
  ABS(c.total_amount - (c.weekday_total + c.holiday_total + c.mileage_total)) as difference
FROM compensations c
JOIN staff s ON c.staff_id = s.id
WHERE ABS(c.total_amount - (c.weekday_total + c.holiday_total + c.mileage_total)) > 0.01;
```

## 6. Test di Performance

### 6.1 Test Carico
1. **Simulare**: Aggiornamento simultaneo di più compensi
2. **Verificare**: Tempo di risposta accettabile (<1 secondo)
3. **Monitorare**: Log del server per errori

### 6.2 Test Transazioni
1. **Verificare**: Aggiornamenti atomici
2. **Testare**: Rollback in caso di errore
3. **Controllare**: Integrità referenziale

## 7. Checklist Finale

- [ ] Trigger PostgreSQL funziona correttamente
- [ ] Aggiornamento tariffe staff → ricalcolo compensi
- [ ] Aggiornamento ore/km → ricalcolo totali
- [ ] Interfaccia web mostra aggiornamenti real-time
- [ ] Export PDF/CSV funziona senza errori
- [ ] Tutti i calcoli sono matematicamente corretti
- [ ] Toast di conferma vengono mostrati
- [ ] Performance accettabile
- [ ] Nessuna inconsistenza nei dati

## 8. Ripristino Test

Dopo ogni test, ripristinare i valori originali:

```sql
-- Ripristina tariffe originali
UPDATE staff SET 
  weekday_rate = [VALORE_ORIGINALE],
  holiday_rate = [VALORE_ORIGINALE], 
  mileage_rate = [VALORE_ORIGINALE]
WHERE id = 'STAFF_ID_TEST';

-- Forza ricalcolo
UPDATE compensations SET updated_at = NOW() WHERE staff_id = 'STAFF_ID_TEST';
```

## Contatti per Supporto

In caso di problemi durante la verifica:
1. Controllare log del server per errori specifici
2. Verificare connessione database
3. Eseguire script automatico: `node scripts/verify-compensation-calculations.js`