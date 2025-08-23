# SISTEMA DI IMPORTAZIONE E SINCRONIZZAZIONE EXCEL - DOCUMENTAZIONE FINALE

## EXECUTIVE SUMMARY

Questo documento definisce l'architettura completa per l'implementazione del sistema di importazione Excel con gestione anti-duplicazione, aggiornamenti intelligenti, sistema di validazione e controllo concorrenza. Il sistema gestisce dati economico-sanitari con massima precisione e controllo rigido.

---

## 1. ANALISI DEI REQUISITI

### 1.1 Obiettivi Principali
- **Importazione Iniziale**: Inserimento dati Excel nel database per la prima volta
- **Aggiornamento Intelligente**: Modifica dati esistenti con nuovi valori da Excel
- **Input Manuale Controllato**: Aggiornamento ore/km tramite UI solo su dati già importati
- **Sistema di Validazione**: Convalida dati per periodo con blocco modifiche
- **Controllo Concorrenza**: Gestione accessi simultanei con lock pessimistico

### 1.2 Scenari d'Uso
1. **Import Excel iniziale** → Inserimento nuovo dataset
2. **Re-import Excel** → Aggiornamento dati esistenti (Mario Rossi: 3→5 ore)
3. **Modifica manuale UI** → Correzione valori già importati via tabella compensi
4. **Validazione periodo** → Blocco modifiche per data range specifico
5. **Gestione conflitti** → Lock esclusivo per protezione dati

---

## 2. ARCHITETTURA DATABASE

### 2.1 Tabelle Coinvolte

#### 2.1.1 Tabelle Excel Import
```typescript
// Tabella principale tracking import file Excel
excelImports {
  id: varchar (UUID)                    // Chiave primaria
  filename: varchar                     // Nome file Excel
  uploadedByUserId: varchar             // Chi ha caricato
  status: varchar                       // pending, processing, completed, failed
  totalRows: varchar                    // Righe totali nel file
  processedRows: varchar                // Righe elaborate con successo
  syncStatus: varchar                   // not_synced, synced, sync_partial
  syncedAt: timestamp                   // Quando sincronizzato
  createdAt: timestamp                  // Data creazione
  updatedAt: timestamp                  // Data aggiornamento
}

// Tabella dati grezzi Excel (57 colonne)
excelData {
  id: varchar (UUID)                    // Chiave primaria
  importId: varchar                     // FK → excelImports.id
  rowNumber: varchar                    // Numero riga Excel
  
  // COLONNE CHIAVE PER IDENTIFICAZIONE UNIVOCA
  identifier: varchar                   // Colonna AO - ID Accesso Univoco
  assistedPersonId: varchar             // Colonna AW - ID Assistito
  operatorId: varchar                   // Colonna BB - ID Operatore
  scheduledStart: varchar               // Colonna D - Data/Ora inizio
  
  // COLONNE DATE E DURATE (convertite da numeri Excel)
  department: varchar                   // Colonna A - Reparto
  recordedStart: varchar                // Colonna B - Inizio registrato
  recordedEnd: varchar                  // Colonna C - Fine registrata
  scheduledEnd: varchar                 // Colonna E - Fine programmata
  duration: varchar                     // Colonna F - Durata (formato H:MM)
  nominalDuration: varchar              // Colonna G - Durata nominale
  
  // COLONNE ASSISTITI
  assistedPersonFirstName: varchar      // Colonna T - Nome assistito
  assistedPersonLastName: varchar       // Colonna U - Cognome assistito
  dateOfBirth: varchar                  // Colonna V - Data nascita
  taxCode: varchar                      // Colonna X - Codice fiscale
  
  // COLONNE OPERATORI
  operatorFirstName: varchar            // Colonna AH - Nome operatore
  operatorLastName: varchar             // Colonna AI - Cognome operatore
  
  // ALTRE 45+ COLONNE...
  createdAt: timestamp
}
```

#### 2.1.2 Tabelle Business Logic
```typescript
// Clienti con riferimento ID Excel
clients {
  id: varchar (UUID)
  externalId: varchar                   // Collegamento a excelData.assistedPersonId
  firstName: varchar
  lastName: varchar
  fiscalCode: varchar
  // ... altri campi
  importId: varchar                     // Import che ha creato questo record
  lastImportId: varchar                 // Ultimo import che ha modificato
  importHistory: jsonb                  // Storia di tutti gli import
}

// Staff con riferimento ID Excel
staff {
  id: varchar (UUID)
  externalId: varchar                   // Collegamento a excelData.operatorId
  firstName: varchar
  lastName: varchar
  weekdayRate: decimal                  // Tariffa feriale
  holidayRate: decimal                  // Tariffa festiva
  // ... altri campi
  importId: varchar
  lastImportId: varchar
  importHistory: jsonb
}

// Time logs collegati ai dati Excel
timeLogs {
  id: varchar (UUID)
  clientId: varchar                     // FK → clients.id
  staffId: varchar                      // FK → staff.id
  serviceDate: timestamp
  scheduledStartTime: timestamp
  scheduledEndTime: timestamp
  hours: decimal
  excelDataId: varchar                  // FK → excelData.id
  externalIdentifier: varchar           // Copia di excelData.identifier
  importId: varchar
  // ... campi validazione e lock
  validationStatus: varchar             // NUOVO: draft, validated, unlocked
  validationDate: timestamp             // NUOVO: quando validato
  validatedBy: varchar                  // NUOVO: chi ha validato
  periodLockId: varchar                 // NUOVO: ID lock per concorrenza
}
```

### 2.2 Nuove Tabelle per Sistema Validazione e Lock

```typescript
// Gestione validazione periodi
periodValidations {
  id: varchar (UUID)
  startDate: date                       // Inizio periodo validato
  endDate: date                         // Fine periodo validato
  validatedBy: varchar                  // FK → users.id
  validationDate: timestamp
  status: varchar                       // active, unlocked
  notes: text
  affectedRecordsCount: integer
}

// Gestione lock concorrenza
periodLocks {
  id: varchar (UUID)
  startDate: date
  endDate: date
  lockedBy: varchar                     // FK → users.id
  lockAcquiredAt: timestamp
  lockExpiresAt: timestamp
  status: varchar                       // active, expired, released
  sessionId: varchar                    // Identificativo sessione
}

// Audit trail completo per GDPR
systemAuditLog {
  id: varchar (UUID)
  userId: varchar                       // Chi ha fatto l'azione
  action: varchar                       // import, update, validate, lock, unlock
  entityType: varchar                   // excelData, timeLogs, client, etc.
  entityId: varchar                     // ID record modificato
  oldValues: jsonb                      // Valori precedenti
  newValues: jsonb                      // Nuovi valori
  metadata: jsonb                       // Info aggiuntive (IP, browser, etc.)
  timestamp: timestamp
}
```

---

## 3. ARCHITETTURA FILE EXCEL

### 3.1 Mapping Colonne Excel → Database

```
COLONNE CHIAVE IDENTIFICAZIONE:
AO = identifier (ID Accesso Univoco)
AW = assistedPersonId (ID Assistito)  
BB = operatorId (ID Operatore)

COLONNE DATE/DURATE (con conversione):
A = department
B = recordedStart (Excel: 45870.208333 → "01/08/2025 05:00")
C = recordedEnd
D = scheduledStart
E = scheduledEnd  
F = duration (Excel: 0.041666 → "1:00")
G = nominalDuration

COLONNE PERSONE:
T = assistedPersonFirstName
U = assistedPersonLastName
V = dateOfBirth
X = taxCode
AH = operatorFirstName
AI = operatorLastName

ALTRE 45+ COLONNE mappate secondo schema excelData
```

### 3.2 Conversioni Formato Excel

```javascript
// Funzioni conversione automatica
isExcelDate(value) → boolean          // Rileva numeri Excel date
convertExcelDate(45870) → "01/08/2025"
convertExcelDateTime(45870.208333) → "01/08/2025 05:00"
convertExcelDuration(0.041666) → "1:00"
```

---

## 4. LOGICA BUSINESS CORE

### 4.1 Algoritmo Identificazione Univoca

```
CHIAVE COMPOSTA ASSOLUTA:
{
  identifier: excelData.identifier,           // Colonna AO
  assistedPersonId: excelData.assistedPersonId, // Colonna AW  
  operatorId: excelData.operatorId,           // Colonna BB
  scheduledStart: excelData.scheduledStart    // Colonna D
}

PROCESSO VERIFICA:
1. Controllo primario su identifier (AO)
2. Se AO manca/duplicato → fallback su chiave composta
3. Se tutti campi corrispondono → SAME RECORD
4. Se qualche campo diverso → CONFLICT ERROR
```

### 4.2 Logica Import/Update

```
PER OGNI RIGA EXCEL:

1. ESTRAZIONE CHIAVE
   - Preleva AO, AW, BB, Data/Ora
   - Applica conversioni date/durate

2. RICERCA DATABASE  
   - Query su identifier (AO)
   - Se non trovato → query su chiave composta
   
3. DECISIONE OPERAZIONE
   - Non esiste → INSERT
   - Esiste + dati identici → SKIP
   - Esiste + dati diversi → UPDATE
   - Esiste + validato → REJECT
   
4. CONTROLLI SICUREZZA
   - Verifica stato validazione periodo
   - Verifica lock concorrenza
   - Log audit trail

5. ESECUZIONE
   - INSERT/UPDATE secondo decisione
   - Aggiornamento metadati import
   - Invalidazione cache UI
```

### 4.3 Sistema Validazione Stato

```
STATI RECORD:
- DRAFT: Modificabile da Excel e UI
- VALIDATED: Bloccato, non modificabile
- UNLOCKED: Temporaneamente sbloccato per correzioni

WORKFLOW VALIDAZIONE:
1. Operatore seleziona periodo (es. 01/08/2025 - 31/08/2025)
2. Sistema verifica tutti record nel periodo
3. Se OK → Stato = VALIDATED per tutti
4. Import Excel successivi per quel periodo = REJECTED
5. UI modifiche per quel periodo = DISABLED

WORKFLOW SBLOCCO:
1. Admin/Manager rimuove validazione
2. Stato = UNLOCKED temporaneo
3. Modifiche nuovamente permesse
4. Richiesta ri-validazione
```

### 4.4 Sistema Lock Concorrenza

```
LOCK PESSIMISTICO:
1. Operatore A accede periodo 01/08-31/08
2. Sistema acquisisce EXCLUSIVE LOCK
3. Operatore B tenta accesso → BLOCKED con messaggio
4. Operatore A finisce → Rilascia lock automatico
5. Operatore B può ora accedere

GESTIONE TIMEOUT:
- Lock automaticamente scade dopo 30 minuti
- Warning a 25 minuti per rinnovo
- Logout forza rilascio lock
- Crash sessione → cleanup automatico lock orfani
```

---

## 5. IMPATTO SULL'APPLICAZIONE

### 5.1 File Frontend da Modificare

```
client/src/pages/data-management.tsx
└── Aggiungere controlli anti-duplicazione intelligenti
└── UI per modalità "Insert" vs "Update"  
└── Feedback real-time su conflitti

client/src/pages/import-details.tsx
└── Visualizzazione diff dati (vecchi vs nuovi)
└── Controlli validazione stato
└── Log operazioni dettagliate

client/src/pages/compensation-table.tsx
└── Controlli period lock prima di editing
└── Disabilitazione campi per record validati
└── UI per validazione/sblocco periodo

client/src/components/ui/
└── Nuovi componenti: PeriodLockBanner, ValidationStatusBadge
└── Modali: ConflictResolution, ValidationConfirm
```

### 5.2 File Backend da Modificare

```
server/routes.ts
├── /api/data/preview → Nuovo algoritmo diff intelligente
├── /api/data/import → Logica INSERT/UPDATE con controlli
├── /api/validation/period → Gestione validazione periodi
├── /api/locks/period → Gestione lock concorrenza
└── /api/audit/trail → Logging completo operazioni

server/storage.ts
├── findExistingRecordByKey() → Query identificazione univoca
├── batchUpsertIntelligent() → INSERT/UPDATE batch ottimizzato
├── acquirePeriodLock() → Gestione lock esclusivi
├── validatePeriod() → Validazione massa record
└── getAuditTrail() → Estrazione log audit
```

### 5.3 Schema Database da Estendere

```
shared/schema.ts
├── periodValidations table → Nuova tabella
├── periodLocks table → Nuova tabella  
├── systemAuditLog table → Nuova tabella
├── excelData.validationStatus → Nuovo campo
├── timeLogs.periodLockId → Nuovo campo
└── Indici composti per performance query
```

---

## 6. IMPATTI PERFORMANCE E SICUREZZA

### 6.1 Ottimizzazioni Database

```sql
-- Indici per identificazione veloce
CREATE INDEX idx_excel_data_identifier ON excel_data(identifier);
CREATE INDEX idx_excel_data_composite ON excel_data(assisted_person_id, operator_id, scheduled_start);
CREATE INDEX idx_time_logs_external_id ON time_logs(external_identifier);
CREATE INDEX idx_validation_status ON time_logs(validation_status, service_date);

-- Indici per controlli lock
CREATE INDEX idx_period_locks_active ON period_locks(start_date, end_date, status);
CREATE INDEX idx_period_validations_date ON period_validations(start_date, end_date, status);
```

### 6.2 Sicurezza e GDPR

```
AUDIT COMPLETO:
- Ogni INSERT/UPDATE loggato con old/new values
- IP address, user agent, timestamp per compliance
- Retention policy automatica log (7 anni)

CONTROLLO ACCESSI:
- Solo utenti autorizzati possono validare periodi
- Lock management richiede privilegi specifici
- Export audit trail solo per admin

PROTEZIONE DATI:
- Encryption at rest per dati sensibili (codici fiscali)
- Backup automatico prima di ogni import batch
- Rollback point prima di operazioni massive
```

---

## 7. STRATEGIA IMPLEMENTAZIONE

### 7.1 Fasi di Sviluppo

```
FASE 1: Core Database (1-2 giorni)
├── Creazione nuove tabelle (periodValidations, periodLocks, auditLog)
├── Aggiunta campi validazione a tabelle esistenti
├── Creazione indici ottimizzazione
└── Script migrazione dati esistenti

FASE 2: Backend Logic (2-3 giorni)  
├── Algoritmo identificazione univoca
├── Logica INSERT/UPDATE intelligente
├── Sistema validazione periodo
├── Gestione lock concorrenza
└── Audit trail completo

FASE 3: Frontend Integration (2-3 giorni)
├── UI controlli anti-duplicazione
├── Gestione stati validazione
├── Lock management interface
├── Feedback real-time conflitti
└── Audit trail visualizzazione

FASE 4: Testing & Optimization (1-2 giorni)
├── Test stress import grandi file
├── Test concorrenza multi-utente
├── Validazione performance query
└── Test rollback scenari
```

### 7.2 Strategia Rollout

```
AMBIENTE TEST:
├── Backup completo database produzione
├── Import dataset reale per testing
├── Simulazione scenari concorrenza
└── Validazione performance

PRODUZIONE:
├── Deploy in finestra manutenzione
├── Migrazione schema con zero downtime
├── Rollback plan automatico se problemi
└── Monitoring real-time post-deploy
```

---

## 8. METRICHE E MONITORING

### 8.1 KPI da Monitorare

```
PERFORMANCE:
- Tempo medio import file Excel (target: <2 min per 1000 righe)
- Tempo risposta query identificazione (target: <100ms)
- Throughput operazioni UPDATE/INSERT (target: >100 ops/sec)

BUSINESS:
- Percentuale duplicati prevenuti (target: 100%)
- Percentuale update automatici vs manuali (insight operativo)
- Tempo medio validazione periodo (efficienza workflow)

SISTEMA:
- Uptime durante import grandi file (target: 99.9%)
- Lock conflicts per periodo (target: <1%)
- Audit trail completezza (target: 100%)
```

### 8.2 Alerting e Monitoring

```
ALERT CRITICI:
- Import falliti per conflitti identificazione
- Lock orfani non rilasciati
- Validazioni non autorizzate

DASHBOARD OPERATIVO:
- Import in corso real-time
- Utenti attivi con lock periodo
- Record validati vs draft per periodo
- Queue operazioni pending
```

---

## 9. CONCLUSIONI

### 9.1 Benefici Attesi

```
OPERATIVI:
✅ Eliminazione 100% duplicati dati
✅ Aggiornamenti automatici precisi  
✅ Workflow validazione controllato
✅ Concorrenza utenti gestita

TECNICI:
✅ Audit trail completo GDPR-compliant
✅ Performance ottimizzate per volumi alti
✅ Rollback e recovery automatici
✅ Monitoring proattivo

BUSINESS:
✅ Precisione dati economici garantita
✅ Compliance normativa assicurata
✅ Efficienza operativa migliorata
✅ Tracciabilità totale operazioni
```

### 9.2 Prossimi Passi

1. **Approvazione architettura** → Validation stakeholder
2. **Setup ambiente sviluppo** → Branch dedicato + database test
3. **Implementazione FASE 1** → Schema database e migrazioni
4. **Testing parallelo** → Validazione logica con dati reali
5. **Deploy produzione** → Rollout controllato con monitoring

---

**DOCUMENTO FINALE APPROVATO - Ready for Implementation**  
*Data: Agosto 2025*  
*Versione: 1.0*  
*Team: Healthcare Management System Development*