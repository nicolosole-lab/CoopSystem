# Procedura di Verifica Sistema Compensi
**Data Creazione**: 18 Agosto 2025  
**Versione**: 1.0  
**Sistema**: Cooperative Management System

## Panoramica

Questa procedura verifica il corretto funzionamento del sistema di gestione compensi con calcoli automatici, garantendo che:
- Le tariffe inserite si riflettano correttamente nei totali
- I trigger PostgreSQL calcolino automaticamente i totali
- L'interfaccia web mostri aggiornamenti in tempo reale
- I dati siano consistenti e matematicamente corretti

## 🚀 Test Automatico Rapido

### Comando di Verifica Automatica
```bash
# Esegui test automatico completo
node scripts/verify-compensation-calculations.js
```

**Durata**: ~30 secondi  
**Output**: Report dettagliato con esito test

## 📋 Checklist Verifica Rapida

### 1. Verifica Trigger Database ✅
```sql
-- Controlla esistenza trigger
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name = 'compensation_totals_trigger';
```

### 2. Test Editing Tariffe ⚡
1. Vai su `/compensation-table`
2. Modifica una tariffa (€/h feriale, festiva, o €/km)
3. **Aspettativa**: Toast "I totali sono stati ricalcolati automaticamente"
4. **Verifica**: Totali si aggiornano immediatamente nella tabella

### 3. Test Editing Ore/Chilometri ⚡
1. Modifica ore feriali, festive o chilometri
2. **Aspettativa**: Totali si ricalcolano automaticamente
3. **Verifica**: Totale generale corretto

### 4. Test Export PDF 📄
1. Clicca "Esporta PDF"
2. **Aspettativa**: Nessun errore console
3. **Verifica**: PDF scaricato con dati corretti

## 🔧 Test Manuali Dettagliati

### Test 1: Verifica Calcoli BAICU
```sql
-- Verifica caso test standard
SELECT 
  s.last_name || ', ' || s.first_name as nome,
  c.regular_hours || 'h × €' || s.weekday_rate || ' = €' || c.weekday_total as feriale,
  c.holiday_hours || 'h × €' || s.holiday_rate || ' = €' || c.holiday_total as festivo,
  c.total_mileage || 'km × €' || s.mileage_rate || ' = €' || c.mileage_total as chilometri,
  '€' || c.total_amount as totale
FROM compensations c
JOIN staff s ON c.staff_id = s.id
WHERE s.last_name = 'BAICU';
```

**Risultato Atteso**: BAICU con €91.00 totale (3h×€10 + 2h×€30 + 2km×€0.50)

### Test 2: Modifica Tariffe Live
```sql
-- Test aggiornamento tariffe
UPDATE staff SET weekday_rate = 12.00 WHERE last_name = 'BAICU';
UPDATE compensations SET updated_at = NOW() 
WHERE staff_id = (SELECT id FROM staff WHERE last_name = 'BAICU');

-- Verifica nuovo calcolo
SELECT weekday_total, total_amount FROM compensations c
JOIN staff s ON c.staff_id = s.id WHERE s.last_name = 'BAICU';
```

**Risultato Atteso**: weekday_total = 36.00 (3h × €12), total_amount = 97.00

### Test 3: Ripristino Valori
```sql
-- Ripristina valori originali
UPDATE staff SET weekday_rate = 10.00 WHERE last_name = 'BAICU';
UPDATE compensations SET updated_at = NOW() 
WHERE staff_id = (SELECT id FROM staff WHERE last_name = 'BAICU');
```

## 🎯 Criteri di Successo

### ✅ Sistema Funzionante Se:
- [ ] Trigger PostgreSQL calcola automaticamente tutti i totali
- [ ] Modifica tariffe → aggiornamento immediato totali
- [ ] Modifica ore/km → ricalcolo automatico
- [ ] Interfaccia mostra toast di conferma
- [ ] Aggiornamenti visibili in tempo reale
- [ ] Export PDF funziona senza errori
- [ ] Tutti i calcoli matematicamente corretti
- [ ] Nessuna inconsistenza nei dati

### ❌ Problemi Comuni e Soluzioni

| Problema | Sintomo | Soluzione |
|----------|---------|-----------|
| Totali non si aggiornano | Valori rimangono uguali dopo modifica | Controllare trigger database |
| Errore export PDF | `doc.autoTable is not a function` | Verificare import jspdf-autotable |
| Calcoli errati | Totali non corrispondono a ore×tariffe | Eseguire script verifica |
| Toast non appare | Nessuna conferma dopo modifica | Controllare mutation onSuccess |

## 📊 Report di Verifica

### Formato Report Automatico
```
[TIMESTAMP] INFO: Test eseguiti: 3
[TIMESTAMP] INFO: Operazioni riuscite: 15
[TIMESTAMP] INFO: Errori rilevati: 0
[TIMESTAMP] SUCCESS: 🎉 TUTTI I TEST SUPERATI
```

### File di Output
- **Report Log**: `compensation-verification-YYYY-MM-DD.log`
- **Localizzazione**: Directory root del progetto

## 🚨 Escalation

### Se Test Fallisce:
1. **Verifica Database**: Controllare connessione PostgreSQL
2. **Log Server**: Controllare console per errori HTTP
3. **Cache Frontend**: Refresh hard (Ctrl+F5)
4. **Trigger Missing**: Eseguire `npm run db:push`

### Contatti Emergenza:
- Controllare `replit.md` per ultimi aggiornamenti
- Verificare log workflow server
- Eseguire rollback se necessario

## 📝 Documentazione Aggiornamento

Dopo ogni verifica di successo, aggiornare:
- [ ] `replit.md` - Recent Updates
- [ ] Data ultimo test nella presente procedura
- [ ] Note su eventuali problemi risolti

## 🔄 Frequenza Verifica

- **Dopo modifiche strutturali**: Immediata
- **Pre-deployment**: Obbligatoria
- **Manutenzione**: Settimanale
- **Segnalazione problemi**: Immediata

---

**Ultimo Test Eseguito**: 18/08/2025  
**Esito**: ✅ PASSATO  
**Note**: Sistema compensi completamente funzionante