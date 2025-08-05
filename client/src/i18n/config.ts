import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Define translations directly to avoid JSON import issues
const enTranslations = {
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "add": "Add",
    "search": "Search",
    "filter": "Filter",
    "actions": "Actions",
    "view": "View",
    "back": "Back",
    "next": "Next",
    "previous": "Previous",
    "confirm": "Confirm",
    "close": "Close"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "clients": "Clients",
    "staff": "Staff",
    "timeTracking": "Time Tracking",
    "budgets": "Budgets",
    "dataManagement": "Data Management",
    "logout": "Logout",
    "sections": {
      "main": "MAIN",
      "clientReporting": "CLIENT REPORTING",
      "staffReporting": "STAFF REPORTING",
      "budgetReporting": "BUDGET REPORTING"
    },
    "items": {
      "dashboard": "Dashboard",
      "clientManagement": "Client Management",
      "clientBudgets": "Client Budgets",
      "planningManagement": "Planning Management",
      "staffManagement": "Staff Management",
      "monthlyHours": "Monthly Hours",
      "smartHoursEntry": "Smart Hours Entry",
      "importFromExcel": "Import from Excel",
      "importLogs": "Import Logs",
      "staffAssignments": "Staff Assignments",
      "objectStorage": "Object Storage",
      "homePlanning": "Home Care Planning",
      "assistanceCalendar": "Assistance Calendar"
    }
  }
};

const itTranslations = {
  "common": {
    "loading": "Caricamento...",
    "error": "Errore",
    "success": "Successo",
    "save": "Salva",
    "cancel": "Annulla",
    "delete": "Elimina",
    "edit": "Modifica",
    "add": "Aggiungi",
    "search": "Cerca",
    "filter": "Filtra",
    "actions": "Azioni",
    "view": "Visualizza",
    "back": "Indietro",
    "next": "Avanti",
    "previous": "Precedente",
    "confirm": "Conferma",
    "close": "Chiudi"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "clients": "Clienti",
    "staff": "Personale",
    "timeTracking": "Tracciamento Ore",
    "budgets": "Budget",
    "dataManagement": "Gestione Dati",
    "logout": "Esci",
    "sections": {
      "main": "PRINCIPALE",
      "clientReporting": "RENDICONTAZIONE ASSISTITI",
      "staffReporting": "RENDICONTAZIONE COLLABORATORI",
      "budgetReporting": "RENDICONTAZIONE BUDGET"
    },
    "items": {
      "dashboard": "Dashboard",
      "clientManagement": "Gestione Assistiti",
      "clientBudgets": "Budget Assistiti",
      "planningManagement": "Gestione Pianificazioni",
      "staffManagement": "Gestione Collaboratori",
      "monthlyHours": "Ore Mensili",
      "smartHoursEntry": "Inserimento Ore Intelligente",
      "importFromExcel": "Importa da Excel",
      "importLogs": "Log Importazioni",
      "staffAssignments": "Assegnazioni Collaboratori",
      "objectStorage": "Object Storage",
      "homePlanning": "Pianificazione Domiciliare",
      "assistanceCalendar": "Calendario Assistenza"
    }
  }
};

// Get the saved language from localStorage (same key as our existing system)
const savedLanguage = localStorage.getItem('app-language') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations
      },
      it: {
        translation: itTranslations
      }
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;