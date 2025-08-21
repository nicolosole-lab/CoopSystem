# 🧪 CHECKLIST TEST AUTOMATICI COMPLETA
## Sistema Importazione Excel/CSV → Database Healthcare

**Data Creazione**: 21 Agosto 2025  
**Scope**: Validazione completa sistema import/sync con Drizzle ORM  
**Framework Suggeriti**: Vitest (unit), Playwright (E2E), Jest (integration)

---

## 📋 **CATEGORIA 1: VALIDAZIONE INTESTAZIONI EXCEL**

### **TEST-EXC-001: Riconoscimento Headers Italiani Standard**
- **Descrizione**: Validare mapping headers italiano → camelCase
- **Input**: Excel con headers "Nome assistito", "Cognome assistito", "Nome operatore"
- **Expected**: Column mapping corretto, language detection = "italian"
- **File Target**: `server/routes.ts` (righe 987-993, 1024-1050)
- **Assert**: `isItalian === true`, mapping corretto per tutti i campi

### **TEST-EXC-002: Gestione Headers con Alias Multipli**
- **Descrizione**: Headers con varianti ortografiche
- **Input**: "Nome della persona assistita", "Nome assistito", "Nome paziente"
- **Expected**: Tutti riconosciuti come `assistedPersonFirstName`
- **Implementation**: Fuzzy matching con confidence score > 80%

### **TEST-EXC-003: Headers Case-Insensitive con Accenti**
- **Descrizione**: "NOME ASSISTITO", "nome assistito", "Nome Assistìto"
- **Input**: Headers con case misto e caratteri speciali italiani
- **Expected**: Normalizzazione unicode + lowercase matching
- **Assert**: Mapping successful indipendentemente da case/accents

### **TEST-EXC-004: Headers con Spazi Extra e Trimming**
- **Descrizione**: "  Nome assistito  ", " Cognome operatore   "
- **Input**: Headers con whitespace padding
- **Expected**: Trim automatico e matching corretto
- **Assert**: `header.trim().toLowerCase()` processing

### **TEST-EXC-005: Headers Non Standard - Fallback**
- **Descrizione**: Headers completamente custom o in altre lingue
- **Input**: "Patient Name", "Worker Surname", "Random Column"
- **Expected**: Fallback a English mapping o error dettagliato
- **Assert**: Error message specific per unmapped columns

---

## 📅 **CATEGORIA 2: PARSING DATE/ORA**

### **TEST-DT-001: Formati Date Europei Standard**
- **Descrizione**: Validare parsing DD/MM/YYYY HH:mm
- **Input**: "21/08/2025 14:30", "01/01/2024 09:00"
- **Expected**: Date objects corretti con timezone Europe/Rome
- **File Target**: `server/storage.ts` (righe 3759-3806)
- **Assert**: `parsedDate.getTimezoneOffset()` consistent

### **TEST-DT-002: Formati Date Misti (Slash vs Dash)**
- **Descrizione**: "21/08/2025" vs "21-08-2025"
- **Input**: Array di formati misti nello stesso Excel
- **Expected**: Normalizzazione automatica (- → /)
- **Assert**: Tutte le date parsed correctly indipendentemente da separator

### **TEST-DT-003: Seriali Excel Numerici**
- **Descrizione**: Date come numeri Excel (44927.6042)
- **Input**: Serial numbers Excel per date/time
- **Expected**: Conversione corretta a Date objects
- **Assert**: Date risultante matches expected DD/MM/YYYY

### **TEST-DT-004: Timezone Consistency - Europe/Rome**
- **Descrizione**: Tutte le date processate con timezone Italia
- **Input**: Date parsing durante winter/summer time
- **Expected**: Consistent UTC storage, DST handling corretto
- **Assert**: `formatInTimeZone(date, 'Europe/Rome')` consistency

### **TEST-DT-005: Date Invalide - Logging Strutturato**
- **Descrizione**: "32/13/2025", "invalid", null, undefined
- **Input**: Date malformate di vario tipo
- **Expected**: Structured logging `[TIMEZONE_PARSING_ERROR]` + graceful skip
- **Assert**: Log entries con categorization + null return

### **TEST-DT-006: Range Validation (2000-2050)**
- **Descrizione**: Date fuori range valido
- **Input**: "01/01/1999", "01/01/2051"
- **Expected**: Validation error con range message
- **Assert**: Date rejected con specific error reason

### **TEST-DT-007: Time Validation (00:00-23:59)**
- **Descrizione**: "21/08/2025 25:99", "21/08/2025 -1:30"
- **Input**: Time component invalid
- **Expected**: Time validation error + fallback a 00:00
- **Assert**: Invalid time handling graceful

---

## 👥 **CATEGORIA 3: MATCHING CLIENTI/STAFF**

### **TEST-MT-001: Match ExternalId Primario**
- **Descrizione**: Match clients/staff per externalId quando presente
- **Input**: Client con externalId="CLT001" in DB + Excel
- **Expected**: Existing client trovato, no duplicate creation
- **File Target**: `server/storage.ts` (righe 3249-3255, 3294-3298)
- **Assert**: `clientData.exists === true`, `existingId` populated

### **TEST-MT-002: Fallback Case-Insensitive Name Match**
- **Descrizione**: Match quando externalId mancante
- **Input**: DB: "Mario Rossi", Excel: "MARIO ROSSI", "mario rossi"
- **Expected**: Case-insensitive match successful
- **Assert**: `LOWER(TRIM())` query match + structured logging

### **TEST-MT-003: Case-Insensitive Match con Accenti**
- **Descrizione**: "José García" vs "JOSE GARCIA"
- **Input**: Nomi con caratteri speciali in case diverse
- **Expected**: Unicode normalization + match
- **Assert**: Match successful + `[CASE_INSENSITIVE_CLIENT_MATCH]` log

### **TEST-MT-004: Trimming Spazi Nome/Cognome**
- **Descrizione**: "  Mario  Rossi  " match con "Mario Rossi"
- **Input**: Names con padding whitespace
- **Expected**: Trim automatico + match
- **Assert**: Whitespace ignored nel matching

### **TEST-MT-005: Prevenzione Duplicati via Matching**
- **Descrizione**: Stesso person con case difference non duplicated
- **Input**: "Mario Rossi" exists, import "MARIO ROSSI"
- **Expected**: Existing record updated, no new creation
- **Assert**: `clientsMap.size` unchanged dopo matching

### **TEST-MT-006: Synthetic ID Generation per Missing ExternalId**
- **Descrizione**: "Mario Rossi" → "Mario_Rossi" synthetic ID
- **Input**: Client senza externalId
- **Expected**: Stable synthetic ID generation
- **Assert**: SyntheticId = `${firstName}_${lastName}`.replace(/\s+/g, "_")`

### **TEST-MT-007: Staff vs Client Matching Logic Consistency**
- **Descrizione**: Same matching logic per staff table
- **Input**: Staff con same name patterns di clients
- **Expected**: Consistent behavior + separate logging
- **Assert**: `[CASE_INSENSITIVE_STAFF_MATCH]` logging + same algorithm

---

## 🔄 **CATEGORIA 4: DEDUPLICAZIONE TIME LOGS**

### **TEST-DD-001: Duplicate Detection ExternalIdentifier**
- **Descrizione**: Primary duplicate check via external identifier
- **Input**: TimeLog con identifier="34854" già esistente in DB
- **Expected**: Duplicate rilevato + skip con reason
- **File Target**: `server/storage.ts` (righe 3827-3841)
- **Assert**: `existingByIdentifier.length > 0` + duplicate reason logged

### **TEST-DD-002: Tolleranza ±5 Minuti - Duplicate Within Window**
- **Descrizione**: Time logs entro 5 minuti considerati duplicati
- **Input**: Existing: 14:30, New: 14:33 (same client+staff)
- **Expected**: Duplicate detected + `timeDifferenceMin ≤ 5` logged
- **Assert**: Range query `gte/lte` + duplicate flagged

### **TEST-DD-003: Tolleranza ±5 Minuti - Different Outside Window**
- **Descrizione**: Time logs oltre 5 minuti sono distinct
- **Input**: Existing: 14:30, New: 14:36 (same client+staff)
- **Expected**: New time log created successfully
- **Assert**: No duplicate detection + new record in DB

### **TEST-DD-004: Composite Key Matching (Client+Staff+Time)**
- **Descrizione**: Full composite key per duplicate detection
- **Input**: Same time, different client OR different staff
- **Expected**: No duplicate (different composite key)
- **Assert**: Only same client+staff+time window triggers duplicate

### **TEST-DD-005: Tolerance Window Edge Cases**
- **Descrizione**: Exactly 5 minutes difference boundary
- **Input**: Existing: 14:30:00, New: 14:35:00
- **Expected**: Behavior consistent con tolerance boundary
- **Assert**: Boundary condition handled correctly

### **TEST-DD-006: Enhanced Logging Duplicate Details**
- **Descrizione**: Structured logging per ogni duplicate trovato
- **Input**: Multiple duplicates con time differences
- **Expected**: `[DUPLICATE_TIME_LOG]` con client, staff, time difference
- **Assert**: Log contains all required details per debugging

### **TEST-DD-007: Excel Float Precision Tolerance**
- **Descrizione**: Excel serials con float precision issues
- **Input**: Excel timestamp 44927.6041666667 vs 44927.6041666668
- **Expected**: Treated as same time within tolerance
- **Assert**: Float precision differences handled by ±5min window

---

## 🆔 **CATEGORIA 5: GESTIONE EXTERNALID MANCANTE**

### **TEST-EID-001: Synthetic ID Generation Algorithm**
- **Descrizione**: Stable synthetic ID quando externalId missing
- **Input**: firstName="Mario", lastName="Rossi"
- **Expected**: syntheticId="Mario_Rossi" consistently
- **File Target**: `server/storage.ts` (synthetic ID creation logic)
- **Assert**: Same input sempre produce same syntheticId

### **TEST-EID-002: Synthetic ID Collision Handling**
- **Descrizione**: Multiple people con same name
- **Input**: Due "Mario Rossi" differenti senza externalId
- **Expected**: Collision detection + disambiguation strategy
- **Assert**: Second "Mario Rossi" gets different treatment

### **TEST-EID-003: Mixed ExternalId + Synthetic Matching**
- **Descrizione**: Stesso person in due imports (uno con, uno senza externalId)
- **Input**: Import1: externalId="CLT001", Import2: synthetic="Mario_Rossi"
- **Expected**: Recognition di same person + consolidation
- **Assert**: No duplicate creation + proper linking

### **TEST-EID-004: Synthetic ID Logging e Tracking**
- **Descrizione**: Structured logging per synthetic ID generation
- **Input**: Client without externalId
- **Expected**: `[SYNTHETIC_ID_GENERATED]` log entry
- **Assert**: Log contains original data + generated ID

### **TEST-EID-005: Special Characters in Synthetic ID**
- **Descrizione**: Names con accents/special chars in synthetic ID
- **Input**: "José María García-López"
- **Expected**: Safe synthetic ID generation (normalized)
- **Assert**: SyntheticId valid for DB storage + matching

---

## 📦 **CATEGORIA 6: BATCH INSERT/UPDATE OPERATIONS**

### **TEST-BT-001: Transaction Wrapping per Sync Operations**
- **Descrizione**: All sync operations in transactions
- **Input**: Batch di 1000 time logs
- **Expected**: Atomic operation + rollback su errore
- **Implementation**: Drizzle `db.transaction()` wrapping
- **Assert**: All-or-nothing processing

### **TEST-BT-002: Chunked Processing Large Datasets**
- **Descrizione**: Large imports processed in chunks
- **Input**: Excel con 10,000+ rows
- **Expected**: Memory-efficient chunked processing
- **Assert**: Memory usage stable + progress tracking

### **TEST-BT-003: Bulk Insert Performance**
- **Descrizione**: Bulk inserts vs individual inserts
- **Input**: 1000 time logs batch insert
- **Expected**: Significantly faster than individual inserts
- **Assert**: Performance benchmark + timing comparison

### **TEST-BT-004: Rollback su Partial Failure**
- **Descrizione**: Transaction rollback when chunk fails
- **Input**: Batch con alcuni record invalid
- **Expected**: Complete rollback + error details
- **Assert**: No partial data in DB + error reporting

### **TEST-BT-005: Progress Tracking Accuracy**
- **Descrizione**: Real-time progress updates durante batch
- **Input**: Large import con progress polling
- **Expected**: Accurate progress percentages + ETAs
- **Assert**: Progress data consistent con actual processing

---

## 📝 **CATEGORIA 7: LOGGING STRUTTURATO**

### **TEST-LG-001: Categorizzazione Errori di Import**
- **Descrizione**: Error categories per analytics
- **Input**: Mixed import con various error types
- **Expected**: Structured categories: `MISSING_DATA`, `INVALID_DATE`, `ENTITY_NOT_FOUND`
- **File Target**: `server/storage.ts` (skip logging sections)
- **Assert**: All errors correctly categorized

### **TEST-LG-002: Skip Reasons Detailed Logging**
- **Descrizione**: Motivo specifico per ogni riga skipped
- **Input**: Rows con different skip reasons
- **Expected**: Detailed reason per each skip
- **Assert**: Log contains assistedPersonId, operatorId, date details

### **TEST-LG-003: Structured JSON Log Format**
- **Descrizione**: Machine-readable log format
- **Input**: Various log events during import
- **Expected**: Consistent JSON structure con timestamp, category, details
- **Assert**: All logs parseable as JSON + structured fields

### **TEST-LG-004: Import Summary Statistics**
- **Descrizione**: Aggregated stats per import session
- **Input**: Complete import process
- **Expected**: Summary con totals, categories, timing
- **Assert**: Statistics accurate + include all relevant metrics

### **TEST-LG-005: Log Export Functionality**
- **Descrizione**: Export logs per troubleshooting
- **Input**: Log data from import session
- **Expected**: Exportable format (CSV/JSON) con filtering
- **Assert**: Complete log data exported + properly formatted

---

## 🧠 **CATEGORIA 8: GESTIONE MEMORIA E PERFORMANCE**

### **TEST-MEM-001: Memory Usage Large File Import**
- **Descrizione**: Memory consumption durante large imports
- **Input**: Excel file 100MB+ con 50,000+ rows
- **Expected**: Memory usage stabile sotto threshold
- **Assert**: Memory usage < 1GB + no memory leaks

### **TEST-MEM-002: Stream Processing vs Full Load**
- **Descrizione**: Stream reading vs loading complete file
- **Input**: Very large Excel files
- **Expected**: Stream processing per memory efficiency
- **Assert**: Memory usage flat durante processing

### **TEST-MEM-003: Cache Management Client/Staff Maps**
- **Descrizione**: Efficient caching durante lookup operations
- **Input**: Import con many repeated client/staff references
- **Expected**: LRU cache + memory limits
- **Assert**: Cache hit rate > 80% + memory bounded

### **TEST-MEM-004: Database Connection Pooling**
- **Descrizione**: Efficient DB connection usage
- **Input**: Concurrent import operations
- **Expected**: Connection pool management + no leaks
- **Assert**: Connection count stable + proper cleanup

### **TEST-MEM-005: Performance Benchmarks**
- **Descrizione**: Processing speed benchmarks
- **Input**: Standard 1000-row import
- **Expected**: Processing time under performance targets
- **Assert**: Time < 30 seconds per 1000 rows

---

## 🔄 **CATEGORIA 9: ORDINE E DIPENDENZE SYNC**

### **TEST-ORD-001: Client Sync Prerequisites**
- **Descrizione**: Clients must exist before time logs
- **Input**: Time logs referencing non-existent clients
- **Expected**: Error o auto-creation con validation
- **File Target**: Sync workflow order logic
- **Assert**: Referential integrity maintained

### **TEST-ORD-002: Staff Sync Prerequisites**
- **Descrizione**: Staff must exist before time logs
- **Input**: Time logs referencing non-existent staff
- **Expected**: Error o auto-creation con validation
- **Assert**: No orphaned time logs created

### **TEST-ORD-003: Dependency Validation Pre-Sync**
- **Descrizione**: Pre-validation di all dependencies
- **Input**: Time logs Excel con missing client/staff references
- **Expected**: Validation report before sync starts
- **Assert**: All missing entities identified before processing

### **TEST-ORD-004: Sync Order Enforcement**
- **Descrizione**: Strict order: Clients → Staff → Assignments → Time logs
- **Input**: Attempt to sync in wrong order
- **Expected**: Order enforcement + clear error messages
- **Assert**: Sync order cannot be violated

### **TEST-ORD-005: Rollback Cascade Dependencies**
- **Descrizione**: Proper cleanup when parent entities fail
- **Input**: Client creation fails dopo time logs processed
- **Expected**: Cascade rollback of dependent entities
- **Assert**: Database consistency maintained

---

## 🔧 **CATEGORIA 10: EDGE CASES E ROBUSTEZZA**

### **TEST-EDG-001: Empty Excel Files**
- **Descrizione**: File Excel completamente vuoti
- **Input**: Excel con no data rows
- **Expected**: Graceful handling + appropriate message
- **Assert**: No errors + meaningful user feedback

### **TEST-EDG-002: Malformed Excel Structure**
- **Descrizione**: Excel con structure damaged
- **Input**: Corrupted Excel files
- **Expected**: Error detection + recovery suggestions
- **Assert**: No system crash + clear error reporting

### **TEST-EDG-003: Special Characters in All Fields**
- **Descrizione**: Unicode, emojis, special symbols
- **Input**: Names/addresses con full Unicode range
- **Expected**: Proper encoding + storage
- **Assert**: Data integrity maintained + searchable

### **TEST-EDG-004: Timezone Edge Cases**
- **Descrizione**: DST transitions, leap years
- **Input**: Dates durante DST changes
- **Expected**: Consistent timezone handling
- **Assert**: No hour shifts + consistent storage

### **TEST-EDG-005: Concurrent Import Operations**
- **Descrizione**: Multiple users importing simultaneously
- **Input**: Concurrent import sessions
- **Expected**: Isolation + no data corruption
- **Assert**: Each import processed independently

---

## 📊 **IMPLEMENTAZIONE FRAMEWORK-SPECIFIC**

### **Vitest (Unit Tests)**
```typescript
// Example structure
describe('Date Parsing', () => {
  test('TEST-DT-001: European date formats', () => {
    const parsed = parseEuropeanDateWithTimezone('21/08/2025 14:30');
    expect(parsed).toBeInstanceOf(Date);
    expect(formatInTimeZone(parsed, 'Europe/Rome', 'dd/MM/yyyy HH:mm'))
      .toBe('21/08/2025 14:30');
  });
});
```

### **Playwright (E2E Tests)**
```typescript
// Example structure  
test('TEST-EXC-001: Complete Excel import flow', async ({ page }) => {
  await page.goto('/data/import');
  await page.setInputFiles('input[type="file"]', 'test-data.xlsx');
  await expect(page.locator('[data-testid="import-success"]')).toBeVisible();
});
```

### **Jest (Integration Tests)**
```typescript
// Example structure
describe('Database Integration', () => {
  test('TEST-MT-001: Client matching integration', async () => {
    const storage = new DrizzleStorage();
    const result = await storage.syncExcelClients(importId, clientIds);
    expect(result.created).toBeGreaterThan(0);
  });
});
```

---

## 🎯 **DATASET DI TEST SIMULATI**

### **Dataset A: Standard Operations (1000 rows)**
- Nomi italiani standard con accenti
- Date in formato DD/MM/YYYY HH:mm
- Mix di externalId presenti/assenti
- No duplicates, clean data

### **Dataset B: Edge Cases (500 rows)**
- Nomi con caratteri speciali Unicode
- Date in formati misti (slash/dash)
- Multiple duplicate scenarios
- Missing essential fields

### **Dataset C: Performance Test (10,000 rows)**
- Large dataset per memory/performance testing
- Realistic data distribution
- Various complexity levels
- Stress test scenarios

### **Dataset D: Error Scenarios (100 rows)**
- Intentionally malformed data
- Invalid dates, missing required fields
- Boundary condition testing
- Error recovery validation

---

## ✅ **CHECKLIST VALIDATION**

### **Pre-Implementation**
- [ ] Setup test databases (separate from production)
- [ ] Create realistic test datasets
- [ ] Configure CI/CD integration
- [ ] Setup performance monitoring

### **Implementation Phase**
- [ ] Implement all 50+ test cases
- [ ] Validate against real data patterns
- [ ] Performance benchmark establishment
- [ ] Documentation per test case

### **Production Readiness**
- [ ] All tests passing green
- [ ] Performance targets met
- [ ] Error scenarios handled gracefully
- [ ] Documentation complete

---

**Checklist creata**: 21 Agosto 2025  
**Test Cases**: 50+ comprehensive scenarios  
**Coverage**: Import pipeline completo + edge cases  
**Framework Ready**: Vitest/Jest/Playwright compatible