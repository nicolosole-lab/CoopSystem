# 📋 Procedura di Rendicontazione dei Collaboratori

## Panoramica del Sistema
Il sistema di gestione cooperativa sanitaria offre una procedura completa e automatizzata per la rendicontazione delle ore di servizio e il calcolo dei compensi dei collaboratori.

---

## 🔄 Flusso Completo della Rendicontazione

### 1️⃣ **Registrazione delle Ore di Servizio**

#### A. Inserimento Manuale
- **Accesso**: Menu → "Time Tracking" → "Smart Hours Entry"
- **Dati richiesti**:
  - Collaboratore
  - Cliente servito
  - Data e ora di inizio servizio
  - Data e ora di fine servizio
  - Tipo di servizio erogato
  - Chilometri percorsi (se applicabile)
  - Note aggiuntive

#### B. Importazione da Excel
- **Accesso**: Menu → "Import Data" → "Import Excel"
- **Formato supportato**: File Excel con colonne predefinite
- **Sincronizzazione automatica**: Il sistema associa automaticamente i dati ai clienti e collaboratori esistenti

### 2️⃣ **Generazione dei Compensi**

#### A. Creazione Batch Compensi
- **Accesso**: Menu → "Compensation" → "Generate Compensation"
- **Procedura**:
  1. Selezionare il periodo di rendicontazione (es. 01/08/2025 - 31/08/2025)
  2. Scegliere i collaboratori da includere
  3. Cliccare "Generate Batch Compensation"
  4. Il sistema calcola automaticamente:
     - Ore ordinarie (giorni feriali)
     - Ore festive (domeniche e festività italiane)
     - Rimborsi chilometrici

#### B. Tariffe Applicate
Il sistema utilizza tre tariffe distinte per ogni collaboratore:
- **Tariffa oraria feriale**: €/ora per giorni lavorativi (lunedì-sabato)
- **Tariffa oraria festiva**: €/ora per domeniche e festività nazionali
- **Tariffa chilometrica**: €/km per rimborsi trasporto

### 3️⃣ **Revisione e Approvazione**

#### A. Verifica dei Calcoli
- **Accesso**: Menu → "Compensation" → Click sul compenso da verificare
- **Informazioni visualizzate**:
  - Dettaglio ore per cliente
  - Calcolo automatico degli importi
  - Totale compenso lordo
  - Budget disponibili per cliente

#### B. Allocazione Budget
- **Sistema di priorità automatica**:
  1. Matching tipo servizio-budget (es. "Assistenza alla persona" → SAI)
  2. Budget in scadenza utilizzati per primi
  3. Budget con maggiore disponibilità

#### C. Approvazione Finale
- Click su "Approve & Allocate"
- Il sistema:
  - Salva permanentemente i calcoli
  - Genera i dettagli di pagamento
  - Aggiorna i budget utilizzati
  - Crea record immutabili per audit

### 4️⃣ **Gestione Pagamenti**

#### A. Visualizzazione Rendiconti Approvati
- **Accesso**: Menu → "Payment Records"
- **Filtri disponibili**:
  - Per stato (Bozza, In Approvazione, Approvato, Pagato, Scaduto)
  - Per collaboratore
  - Per periodo
  - Multi-selezione stati

#### B. Stati del Pagamento
- **Draft (Bozza)**: Compenso creato ma non approvato
- **Pending Approval (In Approvazione)**: In attesa di autorizzazione
- **Approved (Approvato)**: Pronto per il pagamento
- **Paid (Pagato)**: Pagamento effettuato
- **Overdue (Scaduto)**: Pagamento in ritardo

### 5️⃣ **Esportazione e Documentazione**

#### A. Generazione Cedolini PDF
- Disponibile per ogni compenso approvato
- Include:
  - Dettaglio ore per cliente
  - Calcoli compensi
  - Rimborsi chilometrici
  - Totali e detrazioni

#### B. Export Excel
- Report completi esportabili
- Formato compatibile con sistemi contabili esterni

---

## 🎯 Caratteristiche Chiave del Sistema

### ✅ **Calcoli Automatici**
- Riconoscimento automatico giorni festivi italiani
- Calcolo differenziato per tipologia giorno
- Gestione automatica rimborsi chilometrici

### 💰 **Gestione Budget Multi-Cliente**
- 10 tipologie di budget predefinite
- Allocazione automatica intelligente
- Tracciamento utilizzo budget in tempo reale

### 🔒 **Sicurezza e Tracciabilità**
- Calcoli salvati permanentemente dopo approvazione
- Record immutabili per audit
- Tutti gli amministratori vedono gli stessi importi

### 📊 **Reporting Avanzato**
- Dashboard con statistiche in tempo reale
- Filtri multipli per analisi dettagliate
- Export dati per integrazioni esterne

---

## 📝 Note Importanti

### Calendario Italiano
- **Domenica**: Sempre considerata festiva
- **Sabato**: Giorno feriale standard
- **Festività nazionali**: Riconosciute automaticamente

### Persistenza Dati
- Una volta approvato, un compenso diventa immutabile
- I calcoli vengono salvati permanentemente nel database
- Garantita coerenza dati tra tutti gli utenti amministratori

### Budget Allocation
- Sistema "Direct Assistance" sempre disponibile come fallback
- Allocazione manuale possibile dopo approvazione iniziale
- Tracking completo utilizzo budget per cliente

---

## 🆘 Supporto e Assistenza

Per problemi o domande sulla procedura di rendicontazione:
1. Consultare la sezione Help del sistema
2. Verificare i log di sistema per errori
3. Contattare l'amministratore di sistema

---

*Ultimo aggiornamento: Gennaio 2025*
*Sistema di Gestione Cooperativa Sanitaria v2.0*