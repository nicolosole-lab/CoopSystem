import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Define translations directly to avoid JSON import issues
const enTranslations = {
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "save": "Save",
    "saving": "Saving...",
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
    "close": "Close",
    "status": "Status",
    "noMatchingResults": "No matching results found",
    "unauthorized": "Unauthorized",
    "loggingIn": "You are logged out. Logging in again..."
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
      "budgetReporting": "BUDGET REPORTING",
      "system": "SYSTEM"
    },
    "items": {
      "dashboard": "Dashboard",
      "clientManagement": "Client Management",
      "clientBudgets": "Client Budgets",
      "planningManagement": "Planning Management",
      "staffManagement": "Staff Management",
      "monthlyHours": "Monthly Hours",
      "compensations": "Compensations",
      "mileageTracking": "Mileage Tracking",
      "smartHoursEntry": "Smart Hours Entry",
      "importFromExcel": "Import from Excel",
      "importLogs": "Import Logs",
      "staffAssignments": "Staff Assignments",
      "objectStorage": "Object Storage",
      "homePlanning": "Home Care Planning",
      "assistanceCalendar": "Assistance Calendar",
      "statistics": "Statistics",
      "systemManagement": "System Management"
    }
  },
  "dashboard": {
    "title": "Dashboard",
    "description": "Welcome to your healthcare service management dashboard",
    "metrics": {
      "active": "Active Clients",
      "activeClients": "Active Clients",
      "team": "Team Members",
      "staffMembers": "Staff Members",
      "thisMonth": "Hours This Month",
      "hoursLogged": "Hours Logged",
      "revenue": "Monthly Revenue",
      "monthlyRevenue": "Monthly Revenue"
    },
    "quickActions": {
      "title": "Quick Actions",
      "logHours": "Log Hours",
      "manageClients": "Manage Clients",
      "manageStaff": "Manage Staff"
    },
    "systemStatus": {
      "title": "System Status",
      "status": "All systems operational",
      "lastBackup": "Last backup: 2 hours ago",
      "dataSync": "Data sync: Active"
    }
  },
  "auth": {
    "login": {
      "title": "Sign In",
      "subtitle": "Access your healthcare management system",
      "emailLabel": "Email",
      "emailPlaceholder": "email@example.com",
      "passwordLabel": "Password",
      "passwordPlaceholder": "••••••••",
      "rememberMe": "Remember me",
      "forgotPassword": "Forgot password?",
      "signInButton": "Sign In",
      "signUpPrompt": "Don't have an account?",
      "signUpLink": "Sign up"
    },
    "register": {
      "title": "Create Account",
      "subtitle": "Join our healthcare management platform",
      "nameLabel": "Full Name",
      "namePlaceholder": "John Doe",
      "emailLabel": "Email",
      "emailPlaceholder": "email@example.com",
      "passwordLabel": "Password",
      "passwordPlaceholder": "••••••••",
      "confirmPasswordLabel": "Confirm Password",
      "confirmPasswordPlaceholder": "••••••••",
      "signUpButton": "Sign Up",
      "signInPrompt": "Already have an account?",
      "signInLink": "Sign in"
    }
  },
  "clients": {
    "title": "Client Management",
    "description": "Manage your healthcare service clients and their information",
    "addClient": "Add Client",
    "searchPlaceholder": "Search clients...",
    "actions": {
      "addClient": "Add Client",
      "editClient": "Edit Client",
      "deleteClient": "Delete Client",
      "viewDetails": "View Details"
    },
    "search": {
      "label": "Search Clients",
      "placeholder": "Search by name or email..."
    },
    "filters": {
      "status": "Status",
      "allStatuses": "All Statuses",
      "serviceType": "Service Type",
      "allServices": "All Services"
    },
    "table": {
      "title": "Clients",
      "headers": {
        "client": "Client",
        "contact": "Contact",
        "serviceType": "Service Type",
        "monthlyBudget": "Monthly Budget",
        "status": "Status",
        "actions": "Actions"
      },
      "name": "Name",
      "email": "Email",
      "phone": "Phone",
      "serviceType": "Service Type",
      "status": "Status",
      "actions": "Actions",
      "noClients": "No clients found. Add your first client to get started.",
      "noResults": "No clients match your search criteria.",
      "noEmail": "No email",
      "noPhone": "No phone",
      "budgetNotSet": "Not set"
    },
    "dialogs": {
      "addTitle": "Add New Client",
      "editTitle": "Edit Client"
    },
    "messages": {
      "deleteSuccess": "Client deleted successfully",
      "deleteError": "Failed to delete client"
    },
    "confirmDelete": "Are you sure you want to delete this client?",
    "serviceTypes": {
      "personal-care": "Personal Care",
      "home-support": "Home Support",
      "medical-assistance": "Medical Assistance",
      "social-support": "Social Support",
      "transportation": "Transportation"
    },
    "status": {
      "active": "Active",
      "inactive": "Inactive",
      "pending": "Pending"
    },
    "statusTypes": {
      "active": "Active",
      "inactive": "Inactive",
      "pending": "Pending"
    },
    "fields": {
      "firstName": "First Name",
      "lastName": "Last Name",
      "email": "Email",
      "phone": "Phone",
      "address": "Address",
      "dateOfBirth": "Date of Birth",
      "serviceType": "Service Type",
      "status": "Status",
      "monthlyBudget": "Monthly Budget (€)",
      "notes": "Notes"
    },
    "placeholders": {
      "selectServiceType": "Select service type",
      "selectStatus": "Select status",
      "notes": "Add notes about the client..."
    },
    "buttons": {
      "create": "Create Client",
      "update": "Update Client"
    }
  },
  "staff": {
    "title": "Staff Management",
    "description": "Manage your healthcare service providers and their information",
    "addStaff": "Add Staff Member",
    "searchStaff": "Search Staff",
    "searchPlaceholder": "Search staff...",
    "allStatuses": "All Statuses",
    "staffMembers": "Staff Members",
    "startAdding": "No staff members yet. Add your first staff member to get started.",
    "confirmDelete": "Are you sure you want to delete this staff member?",
    "deleteSuccess": "Staff member deleted successfully",
    "status": {
      "active": "Active",
      "inactive": "Inactive"
    },
    "table": {
      "name": "Name",
      "email": "Email",
      "phone": "Phone",
      "specialization": "Specialization",
      "hourlyRate": "Hourly Rate",
      "availability": "Availability",
      "staffMember": "Staff Member",
      "contact": "Contact",
      "specializations": "Specializations",
      "actions": "Actions"
    }
  },
  "budgets": {
    "title": "Budget Management",
    "description": "Track and manage client budget allocations",
    "selectClient": "Client",
    "chooseClient": "Choose a client",
    "month": "Month",
    "year": "Year",
    "addBudget": "Add Budget",
    "addExpense": "Add Expense",
    "totalAllocated": "Total Allocated",
    "totalSpent": "Total Spent",
    "remaining": "Remaining",
    "budgetUsage": "Budget Usage",
    "budgetCategories": "Budget Categories",
    "recentExpenses": "Recent Expenses",
    "noExpenses": "No expenses recorded for this period",
    "createBudgetAllocation": "Create Budget Allocation",
    "editBudgetAllocation": "Edit Budget Allocation",
    "category": "Budget Type",
    "selectCategory": "Select a budget type",
    "selectBudgetType": "Select a budget type",
    "allocatedAmount": "Allocated Amount"
  },
  "timeTracking": {
    "title": "Time Tracking",
    "description": "Log and track service hours",
    "logHours": "Log Hours",
    "todayHours": "Today's Hours",
    "weekHours": "Week Hours",
    "weekRevenue": "Week Revenue",
    "recentLogs": "Recent Time Logs",
    "logServiceHours": "Log Service Hours",
    "deleteSuccess": "Time log deleted successfully",
    "confirmDelete": "Are you sure you want to delete this time log?",
    "noLogsFound": "No time logs found. Start logging service hours.",
    "table": {
      "date": "Date",
      "client": "Client",
      "staff": "Staff Member",
      "hours": "Hours",
      "serviceType": "Service Type",
      "amount": "Amount",
      "actions": "Actions"
    }
  },
  "landing": {
    "hero": {
      "title": "Cooperative Care Management",
      "subtitle": "Streamline your healthcare service operations with our comprehensive management system",
      "getStarted": "Get Started",
      "learnMore": "Learn More"
    },
    "features": {
      "title": "Platform Features",
      "client": {
        "title": "Client Management",
        "description": "Efficiently manage client information and service requirements"
      },
      "staff": {
        "title": "Staff Coordination",
        "description": "Schedule and track healthcare providers and their assignments"
      },
      "time": {
        "title": "Time Tracking",
        "description": "Accurate hour logging and automated cost calculations"
      },
      "budget": {
        "title": "Budget Control",
        "description": "Monitor and manage client budget allocations in real-time"
      }
    }
  },
  "notFound": {
    "title": "Page Not Found",
    "message": "The page you're looking for doesn't exist.",
    "goHome": "Go to Dashboard"
  },
  "profile": {
    "title": "User Profile",
    "tabs": {
      "personal": "Personal Information",
      "security": "Security"
    },
    "personal": {
      "nameLabel": "Full Name",
      "emailLabel": "Email",
      "phoneLabel": "Phone",
      "addressLabel": "Address",
      "saveButton": "Save Changes"
    },
    "security": {
      "changePassword": "Change Password",
      "currentPasswordLabel": "Current Password",
      "newPasswordLabel": "New Password",
      "confirmPasswordLabel": "Confirm New Password",
      "updateButton": "Update Password"
    }
  },
  "planningManagement": {
    "title": "Planning Management",
    "description": "View and manage all home care plans for clients",
    "createNew": "Create New Plan",
    "tabs": {
      "active": "Active Plans",
      "draft": "Draft Plans",
      "expired": "Expired Plans"
    },
    "tabDescriptions": {
      "active": "Currently active home care plans",
      "draft": "Plans in preparation that haven't been activated yet",
      "expired": "Plans that have reached their end date"
    },
    "table": {
      "client": "Client",
      "planName": "Plan Name",
      "period": "Period",
      "totalBudget": "Total Budget",
      "status": "Status",
      "createdAt": "Created",
      "actions": "Actions"
    },
    "status": {
      "active": "Active",
      "draft": "Draft",
      "expired": "Expired"
    },
    "actions": {
      "view": "View details",
      "edit": "Edit plan",
      "delete": "Delete plan"
    },
    "viewPlan": {
      "title": "Plan Details",
      "client": "Client",
      "planName": "Plan Name",
      "period": "Period",
      "totalBudget": "Total Budget",
      "budgetDetails": "Budget Details",
      "budgetCategory": "Budget Category",
      "availableBalance": "Available Balance",
      "weekdayRate": "Weekday Rate",
      "holidayRate": "Holiday Rate"
    },
    "deleteConfirm": {
      "title": "Delete Plan",
      "description": "Are you sure you want to delete this home care plan? This action cannot be undone."
    },
    "noPlans": "No plans found in this category",
    "deleteSuccess": "Plan deleted successfully",
    "deleteSuccessDescription": "The home care plan has been removed from the system",
    "deleteError": "Failed to delete plan"
  },
  "dataManagement": {
    "title": "Data Management",
    "description": "Import and manage data from Excel files. Upload your files to process client, staff, and service data.",
    "importExcel": "Import Excel Data",
    "selectFile": "Select File",
    "chooseFile": "Choose file",
    "dropFile": "or drag and drop",
    "fileTypes": "XLS, XLSX or CSV up to 10MB",
    "importButton": "Import",
    "importing": "Importing...",
    "importHistory": "Import History",
    "noImports": "No imports yet",
    "importGuidelines": {
      "title": "Import Guidelines",
      "rule1": "Ensure your Excel file contains the required columns",
      "rule2": "All data will be imported as text to preserve formatting",
      "rule3": "Empty cells will be saved as empty strings",
      "rule4": "You can review the import status in the History tab"
    },
    "preview": {
      "button": "Preview Import",
      "loading": "Loading Preview...",
      "title": "Review Import Data",
      "file": "File",
      "totalRows": "Total Rows",
      "previewRows": "Preview Rows",
      "uniqueClients": "Unique Clients",
      "detectedLanguage": "Detected Language",
      "dataPreview": "Data Preview (showing first {{count}} rows)",
      "confirmImport": "Confirm Import",
      "cancel": "Cancel",
      "importing": "Importing..."
    },
    "table": {
      "id": "ID",
      "filename": "File Name",
      "importDate": "Import Date",
      "recordCount": "Records",
      "status": "Status",
      "actions": "Actions"
    },
    "status": {
      "success": "Success",
      "error": "Error",
      "processing": "Processing"
    }
  },
  "importDetails": {
    "title": "Import Details",
    "search": "Search all fields...",
    "filterByField": "Filter by field",
    "allFields": "All Fields",
    "exportData": "Export Data",
    "syncClients": "Sync Clients",
    "columnSettings": "Column Settings",
    "selectColumns": "Select columns to display",
    "rowsPerPage": "Rows per page",
    "page": "Page",
    "of": "of",
    "previous": "Previous",
    "next": "Next",
    "noData": "No data to display",
    "rows": "rows",
    "showingResults": "Showing {{from}} to {{to}} of {{total}} results",
    "filtered": "(filtered)",
    "clientSyncResults": "Client Synchronization Results",
    "syncSuccess": "Client sync completed",
    "syncError": "Failed to sync clients",
    "added": "Added",
    "skipped": "Skipped",
    "error": "Error",
    "total": "Total"
  },
  "statistics": {
    "title": "Analytics Dashboard",
    "description": "Comprehensive insights into your healthcare service operations",
    "noData": "No statistics data available",
    "vsLastPeriod": "vs last period",
    "exportReport": "Export Report",
    "dateRanges": {
      "last7days": "Last 7 Days",
      "last30days": "Last 30 Days", 
      "last3months": "Last 3 Months",
      "last6months": "Last 6 Months",
      "lastyear": "Last Year"
    },
    "metrics": {
      "totalRevenue": "Total Revenue",
      "totalHours": "Total Hours", 
      "servicesDelivered": "Services Delivered",
      "activeClients": "Active Clients",
      "activeStaff": "Active Staff"
    },
    "quickActions": {
      "title": "Quick Actions",
      "addTimeLog": "Add Time Log",
      "viewReports": "View Reports",
      "manageClients": "Manage Clients",
      "logHours": "Log Hours",
      "trackServiceTime": "Track service time",
      "viewEditClients": "View & edit clients",
      "manageStaff": "Manage Staff",
      "staffAssignments": "Staff assignments"
    },
    "tabs": {
      "overview": "Overview",
      "revenue": "Revenue",
      "clients": "Top Clients",
      "staff": "Top Staff",
      "services": "Services"
    },
    "charts": {
      "revenueTrend": "Revenue Trend",
      "serviceVolumeTrend": "Service Volume Trend",
      "serviceTypeDistribution": "Service Type Distribution",
      "clientRevenueDistribution": "Client Revenue Distribution",
      "serviceHoursByClient": "Service Hours by Client",
      "topStaffPerformance": "Top 10 Staff by Performance",
      "monthlyRevenueAnalysis": "Monthly Revenue Analysis",
      "budgetUtilization": "Budget Utilization",
      "revenueByServiceType": "Revenue by Service Type",
      "periodComparison": "Period Comparison",
      "currentPeriodRevenue": "Current Period Revenue",
      "previousPeriodRevenue": "Previous Period Revenue",
      "topClientsByRevenue": "Top 10 Clients by Revenue",
      "services": "Services",
      "hours": "Hours",
      "revenue": "Revenue (€)",
      "revenueEuro": "Revenue (€)",
      "utilized": "utilized",
      "servicesLower": "services",
      "hoursLower": "hours",
      "top": "Top",
      "topPerformer": "Top Performer",
      "staffPerformanceMetrics": "Staff Performance Metrics",
      "revenueGenerationByStaff": "Revenue Generation by Staff",
      "averageServiceDuration": "Average Service Duration",
      "hoursPerService": "hours per service",
      "serviceCategories": "Service Categories",
      "weeklyServicePattern": "Weekly Service Pattern"
    }
  },
  "paymentRecords": {
    "title": "Client Payment Records",
    "description": "Track and manage client payment records with detailed breakdowns",
    "generatePdfReport": "Generate PDF Report",
    "filterPaymentRecords": "Filter Payment Records",
    "period": "Period",
    "currentMonth": "Current Month",
    "lastMonth": "Last Month",
    "customRange": "Custom Range",
    "startDate": "Start Date",
    "endDate": "End Date",
    "client": "Client",
    "allClients": "All Clients",
    "applyFilters": "Apply Filters",
    "totalClients": "Total Clients",
    "totalHours": "Total Hours",
    "budgetCoverage": "Budget Coverage",
    "clientPayments": "Client Payments",
    "paymentRecordsDetail": "Payment Records Detail",
    "periodLabel": "Period:",
    "loadingPaymentRecords": "Loading payment records...",
    "noPaymentRecords": "No payment records found for the selected period and filters.",
    "tableHeaders": {
      "client": "Client",
      "staff": "Staff",
      "type": "Type",
      "hours": "Hours",
      "totalAmount": "Total Amount",
      "budgetCoverage": "Budget Coverage",
      "clientPayment": "Client Payment",
      "status": "Status",
      "generated": "Generated"
    },
    "hoursBreakdown": {
      "total": "h total",
      "weekday": "h weekday",
      "holiday": "h holiday"
    },
    "staffTypes": {
      "internal": "internal",
      "external": "external"
    },
    "budgetSummary": {
      "moreTypes": "more types",
      "total": "Total:"
    },
    "paymentStatus": {
      "pending": "pending",
      "paid": "paid",
      "overdue": "overdue"
    }
  }
};

const itTranslations = {
  "common": {
    "loading": "Caricamento...",
    "error": "Errore",
    "success": "Successo",
    "save": "Salva",
    "saving": "Salvataggio...",
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
    "close": "Chiudi",
    "status": "Stato",
    "noMatchingResults": "Nessun risultato corrispondente trovato",
    "unauthorized": "Non autorizzato",
    "loggingIn": "Sei stato disconnesso. Accesso in corso..."
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
      "budgetReporting": "RENDICONTAZIONE BUDGET",
      "system": "SISTEMA"
    },
    "items": {
      "dashboard": "Dashboard",
      "clientManagement": "Gestione Assistiti",
      "clientBudgets": "Budget Assistiti",
      "planningManagement": "Gestione Pianificazioni",
      "staffManagement": "Gestione Collaboratori",
      "monthlyHours": "Ore Mensili",
      "compensations": "Compensi",
      "mileageTracking": "Tracciamento Chilometraggio",
      "smartHoursEntry": "Inserimento Ore Intelligente",
      "importFromExcel": "Importa da Excel",
      "importLogs": "Log Importazioni",
      "staffAssignments": "Assegnazioni Collaboratori",
      "objectStorage": "Object Storage",
      "homePlanning": "Pianificazione Domiciliare",
      "assistanceCalendar": "Calendario Assistenza",
      "statistics": "Statistiche",
      "systemManagement": "Gestione Sistema"
    }
  },
  "dashboard": {
    "title": "Dashboard",
    "description": "Benvenuto nel tuo pannello di gestione dei servizi sanitari",
    "metrics": {
      "active": "Clienti Attivi",
      "activeClients": "Clienti Attivi", 
      "team": "Membri del Team",
      "staffMembers": "Membri del Personale",
      "thisMonth": "Ore Questo Mese",
      "hoursLogged": "Ore Registrate",
      "revenue": "Entrate Mensili",
      "monthlyRevenue": "Entrate Mensili"
    },
    "quickActions": {
      "title": "Azioni Rapide",
      "logHours": "Registra Ore",
      "manageClients": "Gestisci Clienti",
      "manageStaff": "Gestisci Personale"
    },
    "systemStatus": {
      "title": "Stato del Sistema",
      "status": "Tutti i sistemi operativi",
      "lastBackup": "Ultimo backup: 2 ore fa",
      "dataSync": "Sincronizzazione dati: Attiva"
    }
  },
  "statistics": {
    "title": "Dashboard Analitici",
    "description": "Approfondimenti completi sulle operazioni dei tuoi servizi sanitari",
    "noData": "Nessun dato statistico disponibile",
    "vsLastPeriod": "rispetto al periodo precedente",
    "exportReport": "Esporta Report",
    "dateRanges": {
      "last7days": "Ultimi 7 Giorni",
      "last30days": "Ultimi 30 Giorni", 
      "last3months": "Ultimi 3 Mesi",
      "last6months": "Ultimi 6 Mesi",
      "lastyear": "Ultimo Anno"
    },
    "metrics": {
      "totalRevenue": "Ricavi Totali",
      "totalHours": "Ore Totali", 
      "servicesDelivered": "Servizi Erogati",
      "activeClients": "Clienti Attivi",
      "activeStaff": "Personale Attivo"
    },
    "quickActions": {
      "title": "Azioni Rapide",
      "addTimeLog": "Aggiungi Registro Ore",
      "viewReports": "Visualizza Report",
      "manageClients": "Gestisci Clienti",
      "logHours": "Registra Ore",
      "trackServiceTime": "Registra tempo servizio",
      "viewEditClients": "Visualizza e modifica clienti",
      "manageStaff": "Gestisci Personale",
      "staffAssignments": "Assegnazioni personale"
    },
    "tabs": {
      "overview": "Panoramica",
      "revenue": "Ricavi",
      "clients": "Top Clienti",
      "staff": "Top Personale",
      "services": "Servizi"
    },
    "charts": {
      "revenueTrend": "Tendenza Ricavi",
      "serviceVolumeTrend": "Tendenza Volume Servizi",
      "serviceTypeDistribution": "Distribuzione Tipi di Servizio",
      "clientRevenueDistribution": "Distribuzione Ricavi per Cliente",
      "serviceHoursByClient": "Ore di Servizio per Cliente",
      "topStaffPerformance": "Top 10 Personale per Performance",
      "monthlyRevenueAnalysis": "Analisi Ricavi Mensili",
      "budgetUtilization": "Utilizzo Budget",
      "revenueByServiceType": "Ricavi per Tipo di Servizio",
      "periodComparison": "Confronto Periodi",
      "currentPeriodRevenue": "Ricavi Periodo Corrente",
      "previousPeriodRevenue": "Ricavi Periodo Precedente",
      "topClientsByRevenue": "Top 10 Clienti per Ricavi",
      "services": "Servizi",
      "hours": "Ore",
      "revenue": "Ricavi (€)",
      "revenueEuro": "Ricavi (€)",
      "utilized": "utilizzato",
      "servicesLower": "servizi",
      "hoursLower": "ore",
      "top": "Top",
      "topPerformer": "Top Performer",
      "staffPerformanceMetrics": "Metriche Performance Personale",
      "revenueGenerationByStaff": "Generazione Ricavi per Personale",
      "averageServiceDuration": "Durata Media Servizio",
      "hoursPerService": "ore per servizio",
      "serviceCategories": "Categorie Servizi",
      "weeklyServicePattern": "Andamento Servizi Settimanale"
    }
  },
  "paymentRecords": {
    "title": "Registri Pagamenti Clienti",
    "description": "Traccia e gestisci i registri dei pagamenti dei clienti con dettagli completi",
    "generatePdfReport": "Genera Report PDF",
    "filterPaymentRecords": "Filtra Registri Pagamenti",
    "period": "Periodo",
    "currentMonth": "Mese Corrente",
    "lastMonth": "Mese Scorso",
    "customRange": "Intervallo Personalizzato",
    "startDate": "Data Inizio",
    "endDate": "Data Fine",
    "client": "Cliente",
    "allClients": "Tutti i Clienti",
    "applyFilters": "Applica Filtri",
    "totalClients": "Clienti Totali",
    "totalHours": "Ore Totali",
    "budgetCoverage": "Copertura Budget",
    "clientPayments": "Pagamenti Clienti",
    "paymentRecordsDetail": "Dettaglio Registri Pagamenti",
    "periodLabel": "Periodo:",
    "loadingPaymentRecords": "Caricamento registri pagamenti...",
    "noPaymentRecords": "Nessun registro di pagamento trovato per il periodo e i filtri selezionati.",
    "tableHeaders": {
      "client": "Cliente",
      "staff": "Personale",
      "type": "Tipo",
      "hours": "Ore",
      "totalAmount": "Importo Totale",
      "budgetCoverage": "Copertura Budget",
      "clientPayment": "Pagamento Cliente",
      "status": "Stato",
      "generated": "Generato"
    },
    "hoursBreakdown": {
      "total": "h totali",
      "weekday": "h feriali",
      "holiday": "h festive"
    },
    "staffTypes": {
      "internal": "interno",
      "external": "esterno"
    },
    "budgetSummary": {
      "moreTypes": "altri tipi",
      "total": "Totale:"
    },
    "paymentStatus": {
      "pending": "in attesa",
      "paid": "pagato",
      "overdue": "scaduto"
    }
  },
  "auth": {
    "login": {
      "title": "Accedi",
      "subtitle": "Accedi al tuo sistema di gestione sanitaria",
      "emailLabel": "Email",
      "emailPlaceholder": "email@esempio.com",
      "passwordLabel": "Password",
      "passwordPlaceholder": "••••••••",
      "rememberMe": "Ricordami",
      "forgotPassword": "Password dimenticata?",
      "signInButton": "Accedi",
      "signUpPrompt": "Non hai un account?",
      "signUpLink": "Registrati"
    },
    "register": {
      "title": "Crea Account",
      "subtitle": "Unisciti alla nostra piattaforma di gestione sanitaria",
      "nameLabel": "Nome Completo",
      "namePlaceholder": "Mario Rossi",
      "emailLabel": "Email",
      "emailPlaceholder": "email@esempio.com",
      "passwordLabel": "Password",
      "passwordPlaceholder": "••••••••",
      "confirmPasswordLabel": "Conferma Password",
      "confirmPasswordPlaceholder": "••••••••",
      "signUpButton": "Registrati",
      "signInPrompt": "Hai già un account?",
      "signInLink": "Accedi"
    }
  },
  "clients": {
    "title": "Gestione Assistiti",
    "description": "Gestisci i tuoi assistiti dei servizi sanitari e le loro informazioni",
    "addClient": "Aggiungi Assistito",
    "searchPlaceholder": "Cerca assistiti...",
    "actions": {
      "addClient": "Aggiungi Assistito",
      "editClient": "Modifica Assistito",
      "deleteClient": "Elimina Assistito",
      "viewDetails": "Visualizza Dettagli"
    },
    "search": {
      "label": "Cerca Assistiti",
      "placeholder": "Cerca per nome o email..."
    },
    "filters": {
      "status": "Stato",
      "allStatuses": "Tutti gli Stati",
      "serviceType": "Tipo di Servizio",
      "allServices": "Tutti i Servizi"
    },
    "table": {
      "title": "Assistiti",
      "headers": {
        "client": "Assistito",
        "contact": "Contatto",
        "serviceType": "Tipo di Servizio",
        "monthlyBudget": "Budget Mensile",
        "status": "Stato",
        "actions": "Azioni"
      },
      "name": "Nome",
      "email": "Email",
      "phone": "Telefono",
      "serviceType": "Tipo di Servizio",
      "status": "Stato",
      "actions": "Azioni",
      "noClients": "Nessun assistito trovato. Aggiungi il tuo primo assistito per iniziare.",
      "noResults": "Nessun assistito corrisponde ai criteri di ricerca.",
      "noEmail": "Nessuna email",
      "noPhone": "Nessun telefono",
      "budgetNotSet": "Non impostato"
    },
    "dialogs": {
      "addTitle": "Aggiungi Nuovo Assistito",
      "editTitle": "Modifica Assistito"
    },
    "messages": {
      "deleteSuccess": "Assistito eliminato con successo",
      "deleteError": "Impossibile eliminare l'assistito"
    },
    "confirmDelete": "Sei sicuro di voler eliminare questo assistito?",
    "serviceTypes": {
      "personal-care": "Assistenza Personale",
      "home-support": "Supporto Domestico",
      "medical-assistance": "Assistenza Medica",
      "social-support": "Supporto Sociale",
      "transportation": "Trasporto"
    },
    "status": {
      "active": "Attivo",
      "inactive": "Inattivo",
      "pending": "In Attesa"
    },
    "statusTypes": {
      "active": "Attivo",
      "inactive": "Inattivo",
      "pending": "In Attesa"
    },
    "fields": {
      "firstName": "Nome",
      "lastName": "Cognome",
      "email": "Email",
      "phone": "Telefono",
      "address": "Indirizzo",
      "dateOfBirth": "Data di Nascita",
      "serviceType": "Tipo di Servizio",
      "status": "Stato",
      "monthlyBudget": "Budget Mensile (€)",
      "notes": "Note"
    },
    "placeholders": {
      "selectServiceType": "Seleziona tipo di servizio",
      "selectStatus": "Seleziona stato",
      "notes": "Aggiungi note sull'assistito..."
    },
    "buttons": {
      "create": "Crea Assistito",
      "update": "Aggiorna Assistito"
    }
  },
  "staff": {
    "title": "Gestione Personale",
    "description": "Gestisci i tuoi fornitori di servizi sanitari e le loro informazioni",
    "addStaff": "Aggiungi Membro del Personale",
    "searchStaff": "Cerca Personale",
    "searchPlaceholder": "Cerca personale...",
    "allStatuses": "Tutti gli Stati",
    "staffMembers": "Membri del Personale",
    "startAdding": "Nessun membro del personale ancora. Aggiungi il tuo primo membro del personale per iniziare.",
    "confirmDelete": "Sei sicuro di voler eliminare questo membro del personale?",
    "deleteSuccess": "Membro del personale eliminato con successo",
    "status": {
      "active": "Attivo",
      "inactive": "Inattivo"
    },
    "table": {
      "name": "Nome",
      "email": "Email",
      "phone": "Telefono",
      "specialization": "Specializzazione",
      "hourlyRate": "Tariffa Oraria",
      "availability": "Disponibilità",
      "staffMember": "Membro del Personale",
      "contact": "Contatto",
      "specializations": "Specializzazioni",
      "actions": "Azioni"
    }
  },
  "budgets": {
    "title": "Gestione Budget",
    "description": "Traccia e gestisci le allocazioni di budget dei clienti",
    "selectClient": "Cliente",
    "chooseClient": "Scegli un cliente",
    "month": "Mese",
    "year": "Anno",
    "addBudget": "Aggiungi Budget",
    "addExpense": "Aggiungi Spesa",
    "totalAllocated": "Totale Allocato",
    "totalSpent": "Totale Speso",
    "remaining": "Rimanente",
    "budgetUsage": "Utilizzo Budget",
    "budgetCategories": "Categorie Budget",
    "recentExpenses": "Spese Recenti",
    "noExpenses": "Nessuna spesa registrata per questo periodo",
    "createBudgetAllocation": "Crea Allocazione Budget",
    "editBudgetAllocation": "Modifica Allocazione Budget",
    "category": "Tipo di Budget",
    "selectCategory": "Seleziona un tipo di budget",
    "selectBudgetType": "Seleziona un tipo di budget",
    "allocatedAmount": "Importo Allocato"
  },
  "timeTracking": {
    "title": "Tracciamento Ore",
    "description": "Registra e traccia le ore di servizio",
    "logHours": "Registra Ore",
    "todayHours": "Ore di Oggi",
    "weekHours": "Ore Settimanali",
    "weekRevenue": "Entrate Settimanali",
    "recentLogs": "Registri Ore Recenti",
    "logServiceHours": "Registra Ore di Servizio",
    "deleteSuccess": "Registro ore eliminato con successo",
    "confirmDelete": "Sei sicuro di voler eliminare questo registro ore?",
    "noLogsFound": "Nessun registro ore trovato. Inizia a registrare le ore di servizio.",
    "table": {
      "date": "Data",
      "client": "Cliente",
      "staff": "Membro del Personale",
      "hours": "Ore",
      "serviceType": "Tipo di Servizio",
      "amount": "Importo",
      "actions": "Azioni"
    }
  },
  "landing": {
    "hero": {
      "title": "Gestione Cooperativa Assistenza",
      "subtitle": "Ottimizza le tue operazioni di servizi sanitari con il nostro sistema di gestione completo",
      "getStarted": "Inizia",
      "learnMore": "Scopri di Più"
    },
    "features": {
      "title": "Funzionalità della Piattaforma",
      "client": {
        "title": "Gestione Clienti",
        "description": "Gestisci efficacemente le informazioni dei clienti e i requisiti del servizio"
      },
      "staff": {
        "title": "Coordinamento del Personale",
        "description": "Pianifica e traccia i fornitori di assistenza sanitaria e i loro incarichi"
      },
      "time": {
        "title": "Tracciamento Ore",
        "description": "Registrazione accurata delle ore e calcoli automatici dei costi"
      },
      "budget": {
        "title": "Controllo Budget",
        "description": "Monitora e gestisci le allocazioni di budget dei clienti in tempo reale"
      }
    }
  },
  "notFound": {
    "title": "Pagina Non Trovata",
    "message": "La pagina che stai cercando non esiste.",
    "goHome": "Vai alla Dashboard"
  },
  "profile": {
    "title": "Profilo Utente",
    "tabs": {
      "personal": "Informazioni Personali",
      "security": "Sicurezza"
    },
    "personal": {
      "nameLabel": "Nome Completo",
      "emailLabel": "Email",
      "phoneLabel": "Telefono",
      "addressLabel": "Indirizzo",
      "saveButton": "Salva Modifiche"
    },
    "security": {
      "changePassword": "Cambia Password",
      "currentPasswordLabel": "Password Attuale",
      "newPasswordLabel": "Nuova Password",
      "confirmPasswordLabel": "Conferma Nuova Password",
      "updateButton": "Aggiorna Password"
    }
  },
  "planningManagement": {
    "title": "Gestione Pianificazione",
    "description": "Visualizza e gestisci tutti i piani di assistenza domiciliare per gli assistiti",
    "createNew": "Crea Nuovo Piano",
    "tabs": {
      "active": "Piani Attivi",
      "draft": "Piani in Bozza",
      "expired": "Piani Scaduti"
    },
    "tabDescriptions": {
      "active": "Piani di assistenza domiciliare attualmente attivi",
      "draft": "Piani in preparazione che non sono ancora stati attivati",
      "expired": "Piani che hanno raggiunto la data di scadenza"
    },
    "table": {
      "client": "Assistito",
      "planName": "Nome Piano",
      "period": "Periodo",
      "totalBudget": "Budget Totale",
      "status": "Stato",
      "createdAt": "Creato",
      "actions": "Azioni"
    },
    "status": {
      "active": "Attivo",
      "draft": "Bozza",
      "expired": "Scaduto"
    },
    "actions": {
      "view": "Visualizza dettagli",
      "edit": "Modifica piano",
      "delete": "Elimina piano"
    },
    "viewPlan": {
      "title": "Dettagli Piano",
      "client": "Assistito",
      "planName": "Nome Piano",
      "period": "Periodo",
      "totalBudget": "Budget Totale",
      "budgetDetails": "Dettagli Budget",
      "budgetCategory": "Categoria Budget",
      "availableBalance": "Saldo Disponibile",
      "weekdayRate": "Tariffa Feriale",
      "holidayRate": "Tariffa Festiva"
    },
    "deleteConfirm": {
      "title": "Elimina Piano",
      "description": "Sei sicuro di voler eliminare questo piano di assistenza domiciliare? Questa azione non può essere annullata."
    },
    "noPlans": "Nessun piano trovato in questa categoria",
    "deleteSuccess": "Piano eliminato con successo",
    "deleteSuccessDescription": "Il piano di assistenza domiciliare è stato rimosso dal sistema",
    "deleteError": "Impossibile eliminare il piano"
  },
  "dataManagement": {
    "title": "Gestione Dati",
    "description": "Importa e gestisci i dati dai file Excel. Carica i tuoi file per elaborare i dati di clienti, personale e servizi.",
    "importExcel": "Importa Dati Excel",
    "selectFile": "Seleziona File",
    "chooseFile": "Scegli file",
    "dropFile": "o trascina e rilascia",
    "fileTypes": "XLS, XLSX o CSV fino a 10MB",
    "importButton": "Importa",
    "importing": "Importazione...",
    "importHistory": "Cronologia Importazioni",
    "noImports": "Nessuna importazione ancora",
    "importGuidelines": {
      "title": "Linee Guida per l'Importazione",
      "rule1": "Assicurati che il file Excel contenga le colonne richieste",
      "rule2": "Tutti i dati verranno importati come testo per preservare la formattazione",
      "rule3": "Le celle vuote verranno salvate come stringhe vuote",
      "rule4": "Puoi rivedere lo stato dell'importazione nella scheda Cronologia"
    },
    "preview": {
      "button": "Anteprima Importazione",
      "loading": "Caricamento Anteprima...",
      "title": "Rivedi Dati Importazione",
      "file": "File",
      "totalRows": "Righe Totali",
      "previewRows": "Righe Anteprima",
      "uniqueClients": "Assistiti Unici",
      "detectedLanguage": "Lingua Rilevata",
      "dataPreview": "Anteprima Dati (mostrando prime {{count}} righe)",
      "confirmImport": "Conferma Importazione",
      "cancel": "Annulla",
      "importing": "Importazione..."
    },
    "table": {
      "id": "ID",
      "filename": "Nome File",
      "importDate": "Data Importazione",
      "recordCount": "Record",
      "status": "Stato",
      "actions": "Azioni"
    },
    "status": {
      "success": "Successo",
      "error": "Errore",
      "processing": "In elaborazione"
    }
  },
  "importDetails": {
    "title": "Dettagli Importazione",
    "search": "Cerca in tutti i campi...",
    "filterByField": "Filtra per campo",
    "allFields": "Tutti i Campi",
    "exportData": "Esporta Dati",
    "syncClients": "Sincronizza Assistiti",
    "columnSettings": "Impostazioni Colonne",
    "selectColumns": "Seleziona colonne da visualizzare",
    "rowsPerPage": "Righe per pagina",
    "page": "Pagina",
    "of": "di",
    "previous": "Precedente",
    "next": "Successivo",
    "noData": "Nessun dato da visualizzare",
    "rows": "righe",
    "showingResults": "Visualizzazione da {{from}} a {{to}} di {{total}} risultati",
    "filtered": "(filtrato)",
    "clientSyncResults": "Risultati Sincronizzazione Assistiti",
    "syncSuccess": "Sincronizzazione assistiti completata",
    "syncError": "Errore nella sincronizzazione assistiti",
    "added": "Aggiunti",
    "skipped": "Saltati",
    "error": "Errore",
    "total": "Totale"
  }
};

// Get the saved language from localStorage (same key as our existing system)
const savedLanguage = (typeof window !== 'undefined' && localStorage.getItem('app-language')) || 'en';

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