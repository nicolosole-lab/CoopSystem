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
    "filters": {
      "title": "Filters",
      "clearAll": "Clear All Filters",
      "searchStaff": "Search Staff",
      "searchPlaceholder": "Search staff...",
      "status": "Status",
      "allStatuses": "All Statuses",
      "staffType": "Staff Type",
      "allTypes": "All Types",
      "serviceCategory": "Service Category",
      "allCategories": "All Categories",
      "serviceType": "Service Type",
      "allServices": "All Services"
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
      "staffType": "Staff Type",
      "actions": "Actions"
    },
    "pagination": {
      "showing": "Showing",
      "to": "to", 
      "of": "of",
      "results": "results",
      "page": "Page",
      "previous": "Previous",
      "next": "Next"
    },
    "staffType": {
      "internal": "Internal",
      "external": "External"
    },
    "specializations": {
      "noneSpecified": "None specified"
    },
    "editStaff": "Edit Staff Member"
  },
  "compensations": {
    "title": "Compensation Dashboard",
    "loadingData": "Loading compensation data...",
    "exportToExcel": "Export to Excel",
    "statistics": {
      "totalCompensations": "Total Compensations",
      "pendingApproval": "Pending Approval",
      "approved": "Approved",
      "paid": "Paid",
      "total": "total",
      "pending": "pending",
      "readyForPayment": "Ready for payment"
    },
    "batchGeneration": {
      "title": "Batch Compensation Generation",
      "selectStaffMembers": "Select Staff Members",
      "periodStart": "Period Start",
      "periodEnd": "Period End",
      "searchStaffPlaceholder": "Search staff by name...",
      "selectAllWithRates": "Select All with Rates",
      "generateCompensations": "Generate Compensations",
      "staffWithoutRatesWarning": "Staff without configured rates cannot be selected",
      "showingStaffMembers": "Showing {count} of {total} staff members",
      "staffMemberTooltip": "This staff member needs rate configuration before compensation can be generated"
    },
    "filters": {
      "title": "Filters",
      "search": "Search",
      "period": "Period",
      "status": "Status",
      "all": "All",
      "current": "Current Month",
      "last": "Last Month",
      "pendingApproval": "Pending Approval",
      "approved": "Approved",
      "paid": "Paid"
    },
    "messages": {
      "generateSuccess": "Generated {count} compensation records",
      "generateError": "Failed to generate compensations",
      "exportSuccess": "Compensations exported successfully",
      "exportError": "Failed to export compensations",
      "approveSuccess": "Approved {count} compensation records",
      "approveError": "Failed to approve compensations",
      "deleteSuccess": "Compensation record deleted successfully",
      "deleteError": "Failed to delete compensation record"
    },
    "compensationRecords": "Compensation Records",
    "approveAll": "Approve All"
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
    "allocatedAmount": "Allocated Amount",
    "selectClientToStart": "Select a Client to Get Started",
    "chooseClientDescription": "Choose a client from the dropdown above to view and manage their budget allocations",
    "addBudgetExpense": "Add Budget Expense",
    "expenseDescription": "Expense description",
    "expenseDate": "Expense Date",
    "amount": "Amount (€)",
    "budgetTypes": "Budget Types",
    "noClientsAvailable": "No Clients Available",
    "needClientsForBudgets": "You need to add clients before you can manage their budgets.",
    "allocations": "allocations"
  },
  "timeTracking": {
    "title": "Smart Hours & Time Tracking",
    "subtitle": "Quick entry and monthly hours management", 
    "entriesToday": "{count} entries today",
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
    "tabs": {
      "quickEntry": "Quick Entry",
      "monthlyView": "Monthly View"
    },
    "logTimeEntry": "Log Time Entry",
    "statistics": {
      "entriesToday": "Entries Today",
      "totalHours": "Total Hours",
      "totalCost": "Total Cost",
      "avgHoursEntry": "Avg Hours/Entry"
    },
    "form": {
      "serviceDate": "Service Date",
      "staffMember": "Staff Member",
      "client": "Client",
      "timeIn": "Time In",
      "timeOut": "Time Out",
      "selectStaffMember": "Select staff member",
      "selectClient": "Select client",
      "calculatedHours": "Calculated Hours",
      "saveTimeEntry": "Save Time Entry"
    },
    "monthlyView": {
      "filters": "Filters",
      "search": "Search",
      "searchPlaceholder": "Search by staff or client name...",
      "client": "Client",
      "staffMember": "Staff Member",
      "serviceType": "Service Type",
      "dateRange": "Date Range",
      "currentMonth": "Current Month",
      "lastMonth": "Last Month",
      "customRange": "Custom Range",
      "allTime": "All Time",
      "clearFilters": "Clear Filters",
      "noEntries": "No time entries found",
      "pagination": {
        "showing": "Showing",
        "to": "to", 
        "of": "of",
        "results": "results",
        "page": "Page",
        "previous": "Previous",
        "next": "Next"
      }
    },
    "messages": {
      "deleteError": "Failed to delete time log",
      "saveSuccess": "Time entry saved successfully",
      "saveError": "Failed to save time entry"
    },
    "table": {
      "date": "Date",
      "client": "Client",
      "staff": "Staff Member",
      "hours": "Hours",
      "serviceType": "Service Type",
      "amount": "Amount",
      "actions": "Actions",
      "timeIn": "Time In",
      "timeOut": "Time Out",
      "cost": "Cost",
      "service": "Service"
    }
  },
  "mileageTracking": {
    "title": "Mileage Tracking",
    "addMileageLog": "Add Mileage Log",
    "statistics": {
      "totalDistance": "Total Distance",
      "totalReimbursement": "Total Reimbursement",
      "pendingApproval": "Pending Approval",
      "disputed": "Disputed",
      "tripsRecorded": "{{count}} trips recorded",
      "avgPerTrip": "Avg €{{amount}}/trip",
      "awaitingReview": "Awaiting review",
      "requiresResolution": "Requires resolution"
    },
    "filters": {
      "title": "Filters",
      "searchPlaceholder": "Search by staff name, location, or purpose...",
      "period": "Period",
      "status": "Status",
      "allTime": "All Time",
      "allStatus": "All Status"
    },
    "table": {
      "title": "Mileage Logs",
      "headers": {
        "date": "Date",
        "staff": "Staff",
        "route": "Route",
        "distance": "Distance",
        "purpose": "Purpose",
        "amount": "Amount",
        "status": "Status",
        "actions": "Actions"
      },
      "noLogs": "No mileage logs found",
      "showingEntries": "Showing {{start}} to {{end}} of {{total}} entries"
    },
    "status": {
      "pending": "Pending",
      "approved": "Approved",
      "disputed": "Disputed",
      "rejected": "Rejected"
    },
    "actions": {
      "approve": "Approve",
      "reject": "Reject",
      "dispute": "Dispute",
      "raiseDispute": "Raise Dispute",
      "view": "View",
      "edit": "Edit",
      "delete": "Delete"
    },
    "form": {
      "selectStaff": "Select staff member",
      "selectClient": "Select client",
      "date": "Date",
      "startLocation": "Start Location",
      "endLocation": "End Location",
      "distance": "Distance (km)",
      "purpose": "Purpose",
      "ratePerKm": "Rate per km",
      "notes": "Notes",
      "cancel": "Cancel",
      "save": "Save Mileage Log"
    },
    "dispute": {
      "title": "Raise Dispute",
      "reason": "Reason for dispute",
      "proposedDistance": "Proposed distance (km)",
      "proposedRate": "Proposed rate per km",
      "submit": "Submit Dispute"
    },
    "messages": {
      "logSaved": "Mileage log saved successfully",
      "logUpdated": "Mileage log updated successfully",
      "logDeleted": "Mileage log deleted successfully",
      "disputeSubmitted": "Dispute submitted successfully",
      "saveError": "Failed to save mileage log",
      "deleteError": "Failed to delete mileage log",
      "disputeError": "Failed to submit dispute"
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
    "tabs": {
      "importData": "Import Excel Data",
      "importHistory": "Import History"
    },
    "upload": {
      "title": "Import Excel Data",
      "chooseFile": "Choose file",
      "dragDrop": "or drag and drop",
      "fileTypes": ".XLS, .XLSX or CSV up to 10MB (Max size 50MB)",
      "previewButton": "Preview Import",
      "importing": "Importing...",
      "selectFile": "Select File",
      "dropZoneText": "Choose file or drag and drop"
    },
    "guidelines": {
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
      "importing": "Importing...",
      "processingValidation": "Processing and validation",
      "columnValidation": "Column Validation",
      "validColumn": "Valid column",
      "invalidColumn": "Invalid column",
      "overrideValidation": "Override validation",
      "validationOverride": "Validation can be overridden manually",
      "proceedImport": "Proceed with Import"
    },
    "history": {
      "title": "Import History",
      "noImports": "No imports yet",
      "table": {
        "filename": "File Name",
        "importDate": "Import Date", 
        "recordCount": "Records",
        "status": "Status",
        "actions": "Actions",
        "view": "View",
        "download": "Download",
        "sync": "Sync"
      }
    },
    "status": {
      "success": "Success",
      "error": "Error", 
      "processing": "Processing",
      "pending": "Pending",
      "completed": "Completed",
      "failed": "Failed"
    },
    "messages": {
      "fileSelected": "File selected successfully",
      "importSuccess": "Data imported successfully",
      "importError": "Failed to import data",
      "previewError": "Failed to load preview",
      "noFileSelected": "Please select a file to import",
      "invalidFileType": "Invalid file type. Please select XLS, XLSX, or CSV file",
      "fileTooLarge": "File size exceeds maximum limit",
      "uploadFirst": "Upload an Excel file to get started with data import",
      "importProgress": "Please wait while we process your Excel file. This may take several minutes for large files.",
      "doNotClose": "Do not close this page or navigate away",
      "autoComplete": "Your import is in progress and will complete automatically.",
      "downloadStarted": "Download Started",
      "downloadFailed": "Download Failed",
      "downloadDescription": "Downloading {{filename}}...",
      "fileAlreadyImported": "File Already Imported",
      "importStarting": "Import Starting...",
      "importStartingDescription": "Please wait while we process your Excel file. Do not close this page or navigate away.",
      "importCompleteDescription": "Successfully imported {{rowsImported}} rows. Redirecting to import history...",
      "downloadError": "Failed to download file"
    },
    "sync": {
      "clientSync": "Client Synchronization",
      "staffSync": "Staff Synchronization", 
      "timeLogsSync": "Time Logs Synchronization",
      "syncInProgress": "Sync in progress...",
      "syncCompleted": "Sync completed",
      "syncFailed": "Sync failed",
      "processingRow": "Processing row {{current}} of {{total}}",
      "syncResults": "Synchronization Results"
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
  },
  "staffAssignments": {
    "title": "Staff Assignments",
    "description": "Manage staff-client assignments and relationships",
    "newAssignment": "New Assignment",
    "columns": {
      "availableStaff": "Available Staff",
      "assignedStaff": "Assigned Staff"
    },
    "filters": {
      "searchStaff": "Search staff members...",
      "filterByClient": "Filter by client",
      "allClients": "All Clients"
    },
    "status": {
      "available": "Available",
      "assigned": "Assigned",
      "active": "Active",
      "inactive": "Inactive"
    },
    "actions": {
      "assign": "Assign",
      "unassign": "Unassign",
      "edit": "Edit Assignment",
      "delete": "Delete Assignment",
      "view": "View Details"
    },
    "statistics": {
      "totalStaff": "Total Staff",
      "activeAssignments": "Active Assignments",
      "availableStaff": "Available Staff",
      "avgClientsPerStaff": "Avg Clients/Staff"
    },
    "emptyStates": {
      "noStaffAssigned": "No staff assigned",
      "dragStaffHere": "Drag staff here to assign",
      "allStaffAssigned": "All staff are assigned",
      "noAssignmentsFound": "No staff assignments found. Create your first assignment to get started.",
      "noMatchingFilters": "No assignments match your filters. Try adjusting your search criteria."
    },
    "dragAndDrop": {
      "dragToAssign": "Drag to assign staff to client",
      "dragToUnassign": "Drag to unassign staff",
      "dropZoneActive": "Drop here to assign"
    },
    "badges": {
      "assignments": "{{count}} assignments",
      "hourlyRate": "€{{rate}}/h",
      "noCategory": "No category"
    },
    "form": {
      "title": {
        "new": "New Assignment",
        "edit": "Edit Assignment"
      },
      "description": {
        "new": "Create a new staff-client assignment.",
        "edit": "Update the staff-client assignment details."
      },
      "fields": {
        "staffMember": "Staff Member",
        "client": "Client",
        "startDate": "Start Date (Optional)",
        "endDate": "End Date (Optional)",
        "notes": "Notes (Optional)"
      },
      "placeholders": {
        "selectStaff": "Select a staff member",
        "selectClient": "Select a client",
        "addNotes": "Add any notes about this assignment"
      },
      "buttons": {
        "cancel": "Cancel",
        "create": "Create",
        "update": "Update",
        "saving": "Saving..."
      }
    },
    "messages": {
      "assignmentCreated": "Assignment created successfully",
      "assignmentUpdated": "Assignment updated successfully",
      "assignmentDeleted": "Assignment removed successfully",
      "staffAssigned": "Staff member assigned to {{clientName}}",
      "staffUnassigned": "{{staffName}} removed from {{clientName}}",
      "createError": "Failed to create assignment",
      "updateError": "Failed to update assignment",
      "deleteError": "Failed to remove assignment",
      "confirmDelete": "Are you sure you want to remove this assignment?"
    }
  },
  "objectStorage": {
    "title": "Object Storage",
    "description": "GDPR-compliant document management with encryption, audit trails, and retention policies",
    "uploadDocument": "Upload Document",
    "gdprCompliance": {
      "title": "GDPR Compliance Status",
      "encryption": {
        "title": "Encryption",
        "status": "All documents encrypted"
      },
      "accessTracking": {
        "title": "Access Tracking",
        "status": "Access logs maintained"
      },
      "retention": {
        "title": "Retention",
        "status": "{{count}} scheduled",
        "noScheduled": "0 scheduled"
      },
      "auditTrail": {
        "title": "Audit Trail",
        "status": "Complete logging enabled"
      }
    },
    "tabs": {
      "documents": "Documents",
      "accessLogs": "Access Logs",
      "retentionSchedules": "Retention Schedules"
    },
    "filters": {
      "filterByCategory": "Filter by Category:",
      "allCategories": "All Categories",
      "showingDocuments": "Showing {{count}} GDPR-compliant documents"
    },
    "documentLibrary": {
      "title": "Document Library",
      "description": "All documents are automatically encrypted and tracked for GDPR compliance",
      "noDocuments": "No documents found",
      "noDocumentsDescription": "Upload your first document to get started with GDPR-compliant storage."
    },
    "table": {
      "headers": {
        "file": "File",
        "category": "Category",
        "accessLevel": "Access Level",
        "size": "Size",
        "encrypted": "Encrypted",
        "uploaded": "Uploaded",
        "actions": "Actions"
      },
      "values": {
        "encrypted": "Encrypted",
        "notEncrypted": "Not Encrypted",
        "private": "Private",
        "public": "Public",
        "restricted": "Restricted"
      }
    },
    "actions": {
      "view": "View",
      "download": "Download",
      "delete": "Delete",
      "edit": "Edit",
      "viewDetails": "View Details",
      "executeNow": "Execute Now"
    },
    "accessLogs": {
      "title": "Document Access Logs",
      "description": "Complete audit trail of all document access for GDPR compliance",
      "noLogs": "No access logs found",
      "table": {
        "document": "Document",
        "action": "Action",
        "user": "User",
        "timestamp": "Timestamp",
        "ipAddress": "IP Address"
      }
    },
    "retentionSchedules": {
      "title": "Retention Schedules",
      "description": "Automated document retention and deletion policies",
      "noSchedules": "No retention schedules configured",
      "table": {
        "document": "Document",
        "retentionPeriod": "Retention Period",
        "scheduledDeletion": "Scheduled Deletion",
        "status": "Status",
        "actions": "Actions"
      },
      "status": {
        "active": "Active",
        "scheduled": "Scheduled",
        "completed": "Completed",
        "cancelled": "Cancelled"
      }
    },
    "upload": {
      "title": "Upload Document",
      "description": "Upload a new document with automatic GDPR compliance features",
      "dragDrop": "Drag and drop your file here, or click to browse",
      "fileTypes": "Supported formats: PDF, DOC, DOCX, XLS, XLSX, TXT",
      "form": {
        "fileName": "File Name",
        "category": "Category",
        "accessLevel": "Access Level",
        "tags": "Tags",
        "description": "Description",
        "selectCategory": "Select a category",
        "selectAccessLevel": "Select access level",
        "addTags": "Add tags (comma separated)",
        "addDescription": "Add a description..."
      },
      "buttons": {
        "cancel": "Cancel",
        "upload": "Upload Document",
        "uploading": "Uploading..."
      }
    },
    "categories": {
      "client_documents": "Client Documents",
      "staff_documents": "Staff Documents",
      "financial_records": "Financial Records",
      "compliance_documents": "Compliance Documents",
      "contracts": "Contracts",
      "reports": "Reports",
      "other": "Other"
    },
    "messages": {
      "uploadSuccess": "Document uploaded successfully",
      "uploadError": "Failed to upload document",
      "deleteSuccess": "Document deleted successfully",
      "deleteError": "Failed to delete document",
      "downloadStarted": "Download started",
      "downloadError": "Failed to download document",
      "confirmDelete": "Are you sure you want to delete this document? This action cannot be undone.",
      "accessLogged": "Document access has been logged for GDPR compliance"
    }
  },
  "systemManagement": {
    "title": "System Management",
    "description": "Configure service categories, types, and budget settings",
    "tabs": {
      "serviceCategories": "Categories",
      "serviceTypes": "Types", 
      "budgetCategories": "Budget Ca.",
      "budgetTypes": "Budget Types",
      "users": "Users"
    },
    "serviceCategories": {
      "title": "Service Categories",
      "description": "Manage main service categories",
      "addNew": "Add Category",
      "editCategory": "Edit Category",
      "table": {
        "code": "Code",
        "name": "Name", 
        "description": "Description",
        "order": "Order",
        "status": "Status",
        "actions": "Actions"
      },
      "form": {
        "code": "Category Code",
        "name": "Category Name",
        "description": "Description",
        "displayOrder": "Display Order",
        "isActive": "Active",
        "placeholders": {
          "code": "Enter category code (e.g., 1, 2, 3)",
          "name": "Enter category name",
          "description": "Enter category description",
          "displayOrder": "Enter display order"
        }
      },
      "status": {
        "active": "Active",
        "inactive": "Inactive"
      },
      "messages": {
        "created": "Category created successfully",
        "updated": "Category updated successfully", 
        "deleted": "Category deleted successfully",
        "deleteError": "Failed to delete category",
        "confirmDelete": "Are you sure you want to delete this category?"
      }
    },
    "serviceTypes": {
      "title": "Service Types",
      "description": "Manage service types and their rates",
      "addNew": "Add Type",
      "editType": "Edit Type",
      "table": {
        "code": "Code",
        "name": "Name",
        "category": "Category", 
        "defaultRate": "Default Rate",
        "order": "Order",
        "status": "Status",
        "actions": "Actions"
      },
      "form": {
        "categoryId": "Service Category",
        "code": "Type Code",
        "name": "Type Name",
        "description": "Description", 
        "defaultRate": "Default Rate (€/hour)",
        "displayOrder": "Display Order",
        "isActive": "Active",
        "placeholders": {
          "selectCategory": "Select a category",
          "code": "Enter type code",
          "name": "Enter type name",
          "description": "Enter type description",
          "defaultRate": "Enter default hourly rate",
          "displayOrder": "Enter display order"
        }
      },
      "messages": {
        "created": "Service type created successfully",
        "updated": "Service type updated successfully",
        "deleted": "Service type deleted successfully",
        "deleteError": "Failed to delete service type",
        "confirmDelete": "Are you sure you want to delete this service type?"
      }
    },
    "budgetCategories": {
      "title": "Budget Categories", 
      "description": "Manage budget category classifications",
      "addNew": "Add Budget Category",
      "editCategory": "Edit Budget Category",
      "table": {
        "name": "Name",
        "description": "Description",
        "actions": "Actions"
      },
      "form": {
        "name": "Category Name",
        "description": "Description",
        "placeholders": {
          "name": "Enter budget category name",
          "description": "Enter category description"
        }
      },
      "messages": {
        "created": "Budget category created successfully",
        "updated": "Budget category updated successfully",
        "deleted": "Budget category deleted successfully",
        "deleteError": "Failed to delete budget category",
        "confirmDelete": "Are you sure you want to delete this budget category?"
      }
    },
    "budgetTypes": {
      "title": "Budget Types",
      "description": "Manage budget types with rates and categories",
      "addNew": "Add Budget Type",
      "editType": "Edit Budget Type", 
      "table": {
        "code": "Code",
        "name": "Name",
        "category": "Category",
        "weekdayRate": "Weekday Rate",
        "holidayRate": "Holiday Rate",
        "kilometerRate": "Km Rate",
        "order": "Order",
        "actions": "Actions"
      },
      "form": {
        "categoryId": "Budget Category",
        "code": "Budget Code",
        "name": "Budget Name",
        "description": "Description",
        "defaultWeekdayRate": "Weekday Rate (€/hour)",
        "defaultHolidayRate": "Holiday Rate (€/hour)",
        "defaultKilometerRate": "Kilometer Rate (€/km)",
        "displayOrder": "Display Order",
        "placeholders": {
          "selectCategory": "Select a budget category",
          "code": "Enter budget code",
          "name": "Enter budget name",
          "description": "Enter budget description",
          "weekdayRate": "Enter weekday hourly rate",
          "holidayRate": "Enter holiday hourly rate",
          "kilometerRate": "Enter kilometer rate",
          "displayOrder": "Enter display order"
        }
      },
      "messages": {
        "created": "Budget type created successfully",
        "updated": "Budget type updated successfully", 
        "deleted": "Budget type deleted successfully",
        "deleteError": "Failed to delete budget type",
        "confirmDelete": "Are you sure you want to delete this budget type?"
      }
    },
    "users": {
      "title": "User Management",
      "description": "Manage system users and their roles",
      "addNew": "Add User",
      "editUser": "Edit User",
      "table": {
        "email": "Email",
        "name": "Name",
        "role": "Role", 
        "createdAt": "Created",
        "actions": "Actions"
      },
      "form": {
        "email": "Email Address",
        "firstName": "First Name",
        "lastName": "Last Name",
        "role": "User Role",
        "placeholders": {
          "email": "Enter email address",
          "firstName": "Enter first name",
          "lastName": "Enter last name",
          "selectRole": "Select user role"
        }
      },
      "roles": {
        "admin": "Administrator",
        "manager": "Manager", 
        "staff": "Staff Member"
      },
      "messages": {
        "created": "User created successfully",
        "updated": "User updated successfully",
        "deleted": "User deleted successfully", 
        "deleteError": "Failed to delete user",
        "confirmDelete": "Are you sure you want to delete this user?"
      }
    },
    "common": {
      "loading": "Loading...",
      "noResults": "No results found",
      "confirmDelete": "Confirm Deletion",
      "deleteWarning": "This action cannot be undone.",
      "required": "This field is required",
      "save": "Save",
      "cancel": "Cancel",
      "add": "Add",
      "edit": "Edit",
      "delete": "Delete",
      "active": "Active",
      "inactive": "Inactive"
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
    "filters": {
      "title": "Filtri",
      "clearAll": "Cancella Tutti i Filtri",
      "searchStaff": "Cerca Personale",
      "searchPlaceholder": "Cerca personale...",
      "status": "Stato",
      "allStatuses": "Tutti gli Stati",
      "staffType": "Tipo di Personale",
      "allTypes": "Tutti i Tipi",
      "serviceCategory": "Categoria Servizio",
      "allCategories": "Tutte le Categorie",
      "serviceType": "Tipo di Servizio",
      "allServices": "Tutti i Servizi"
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
      "staffType": "Tipo di Personale",
      "actions": "Azioni"
    },
    "pagination": {
      "showing": "Mostrando",
      "to": "a",
      "of": "di",
      "results": "risultati",
      "page": "Pagina",
      "previous": "Precedente",
      "next": "Successivo"
    },
    "staffType": {
      "internal": "Interno",
      "external": "Esterno"
    },
    "specializations": {
      "noneSpecified": "Nessuna specificata"
    },
    "editStaff": "Modifica Membro del Personale"
  },
  "compensations": {
    "title": "Dashboard Compensi",
    "loadingData": "Caricamento dati compensi...",
    "exportToExcel": "Esporta in Excel",
    "statistics": {
      "totalCompensations": "Compensi Totali",
      "pendingApproval": "In Attesa di Approvazione",
      "approved": "Approvati",
      "paid": "Pagati",
      "total": "totale",
      "pending": "in attesa",
      "readyForPayment": "Pronti per il pagamento"
    },
    "batchGeneration": {
      "title": "Generazione Compensi in Lotto",
      "selectStaffMembers": "Seleziona Membri del Personale",
      "periodStart": "Inizio Periodo",
      "periodEnd": "Fine Periodo",
      "searchStaffPlaceholder": "Cerca personale per nome...",
      "selectAllWithRates": "Seleziona Tutti con Tariffe",
      "generateCompensations": "Genera Compensi",
      "staffWithoutRatesWarning": "Il personale senza tariffe configurate non può essere selezionato",
      "showingStaffMembers": "Mostrando {count} di {total} membri del personale",
      "staffMemberTooltip": "Questo membro del personale necessita configurazione delle tariffe prima che il compenso possa essere generato"
    },
    "filters": {
      "title": "Filtri",
      "search": "Cerca",
      "period": "Periodo",
      "status": "Stato",
      "all": "Tutti",
      "current": "Mese Corrente",
      "last": "Mese Scorso",
      "pendingApproval": "In Attesa di Approvazione",
      "approved": "Approvati",
      "paid": "Pagati"
    },
    "messages": {
      "generateSuccess": "Generati {count} record di compenso",
      "generateError": "Fallimento nella generazione dei compensi",
      "exportSuccess": "Compensi esportati con successo",
      "exportError": "Fallimento nell'esportazione dei compensi",
      "approveSuccess": "Approvati {count} record di compenso",
      "approveError": "Fallimento nell'approvazione dei compensi",
      "deleteSuccess": "Record di compenso eliminato con successo",
      "deleteError": "Fallimento nell'eliminazione del record di compenso"
    },
    "compensationRecords": "Record Compensi",
    "approveAll": "Approva Tutto"
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
    "allocatedAmount": "Importo Allocato",
    "selectClientToStart": "Seleziona un Cliente per Iniziare",
    "chooseClientDescription": "Scegli un cliente dal menu a tendina sopra per visualizzare e gestire le loro allocazioni di budget",
    "addBudgetExpense": "Aggiungi Spesa Budget",
    "expenseDescription": "Descrizione spesa",
    "expenseDate": "Data Spesa",
    "amount": "Importo (€)",
    "budgetTypes": "Tipi di Budget",
    "noClientsAvailable": "Nessun Cliente Disponibile",
    "needClientsForBudgets": "Devi aggiungere clienti prima di poter gestire i loro budget.",
    "allocations": "allocazioni"
  },
  "timeTracking": {
    "title": "Ore Intelligenti e Monitoraggio Tempo",
    "subtitle": "Inserimento rapido e gestione ore mensili",
    "entriesToday": "{count} inserimenti oggi",
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
    "tabs": {
      "quickEntry": "Inserimento Rapido",
      "monthlyView": "Vista Mensile"
    },
    "logTimeEntry": "Registra Ore di Lavoro",
    "statistics": {
      "entriesToday": "Inserimenti Oggi",
      "totalHours": "Ore Totali",
      "totalCost": "Costo Totale",
      "avgHoursEntry": "Media Ore/Inserimento"
    },
    "form": {
      "serviceDate": "Data Servizio",
      "staffMember": "Membro del Personale",
      "client": "Cliente",
      "timeIn": "Ora Inizio",
      "timeOut": "Ora Fine",
      "selectStaffMember": "Seleziona membro del personale",
      "selectClient": "Seleziona cliente",
      "calculatedHours": "Ore Calcolate",
      "saveTimeEntry": "Salva Inserimento Tempo"
    },
    "monthlyView": {
      "filters": "Filtri",
      "search": "Cerca",
      "searchPlaceholder": "Cerca per nome personale o cliente...",
      "client": "Cliente",
      "staffMember": "Membro del Personale",
      "serviceType": "Tipo di Servizio",
      "dateRange": "Intervallo Date",
      "currentMonth": "Mese Corrente",
      "lastMonth": "Mese Scorso",
      "customRange": "Intervallo Personalizzato",
      "allTime": "Tutto il Tempo",
      "clearFilters": "Cancella Filtri",
      "noEntries": "Nessun inserimento di tempo trovato",
      "pagination": {
        "showing": "Mostrando",
        "to": "a", 
        "of": "di",
        "results": "risultati",
        "page": "Pagina",
        "previous": "Precedente",
        "next": "Successivo"
      }
    },
    "messages": {
      "deleteError": "Fallimento nell'eliminazione del registro tempo",
      "saveSuccess": "Inserimento tempo salvato con successo",
      "saveError": "Fallimento nel salvataggio dell'inserimento tempo"
    },
    "table": {
      "date": "Data",
      "client": "Cliente",
      "staff": "Membro del Personale",
      "hours": "Ore",
      "serviceType": "Tipo di Servizio",
      "amount": "Importo",
      "actions": "Azioni",
      "timeIn": "Ora Inizio",
      "timeOut": "Ora Fine",
      "cost": "Costo",
      "service": "Servizio"
    }
  },
  "mileageTracking": {
    "title": "Tracciamento Chilometraggio",
    "addMileageLog": "Aggiungi Registro Chilometraggio",
    "statistics": {
      "totalDistance": "Distanza Totale",
      "totalReimbursement": "Rimborso Totale",
      "pendingApproval": "In Attesa di Approvazione",
      "disputed": "Contestati",
      "tripsRecorded": "{{count}} viaggi registrati",
      "avgPerTrip": "Media €{{amount}}/viaggio",
      "awaitingReview": "In attesa di revisione",
      "requiresResolution": "Richiede risoluzione"
    },
    "filters": {
      "title": "Filtri",
      "searchPlaceholder": "Cerca per nome personale, località o scopo...",
      "period": "Periodo",
      "status": "Stato",
      "allTime": "Tutto il Tempo",
      "allStatus": "Tutti gli Stati"
    },
    "table": {
      "title": "Registri Chilometraggio",
      "headers": {
        "date": "Data",
        "staff": "Personale",
        "route": "Percorso",
        "distance": "Distanza",
        "purpose": "Scopo",
        "amount": "Importo",
        "status": "Stato",
        "actions": "Azioni"
      },
      "noLogs": "Nessun registro chilometraggio trovato",
      "showingEntries": "Mostrando {{start}} a {{end}} di {{total}} voci"
    },
    "status": {
      "pending": "In Attesa",
      "approved": "Approvato",
      "disputed": "Contestato",
      "rejected": "Rifiutato"
    },
    "actions": {
      "approve": "Approva",
      "reject": "Rifiuta",
      "dispute": "Contesta",
      "raiseDispute": "Solleva Contestazione",
      "view": "Visualizza",
      "edit": "Modifica",
      "delete": "Elimina"
    },
    "form": {
      "selectStaff": "Seleziona membro del personale",
      "selectClient": "Seleziona cliente",
      "date": "Data",
      "startLocation": "Località di Partenza",
      "endLocation": "Località di Arrivo",
      "distance": "Distanza (km)",
      "purpose": "Scopo",
      "ratePerKm": "Tariffa per km",
      "notes": "Note",
      "cancel": "Annulla",
      "save": "Salva Registro Chilometraggio"
    },
    "dispute": {
      "title": "Solleva Contestazione",
      "reason": "Motivo della contestazione",
      "proposedDistance": "Distanza proposta (km)",
      "proposedRate": "Tariffa proposta per km",
      "submit": "Invia Contestazione"
    },
    "messages": {
      "logSaved": "Registro chilometraggio salvato con successo",
      "logUpdated": "Registro chilometraggio aggiornato con successo",
      "logDeleted": "Registro chilometraggio eliminato con successo",
      "disputeSubmitted": "Contestazione inviata con successo",
      "saveError": "Errore nel salvataggio del registro chilometraggio",
      "deleteError": "Errore nell'eliminazione del registro chilometraggio",
      "disputeError": "Errore nell'invio della contestazione"
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
    "tabs": {
      "importData": "Importa Dati Excel",
      "importHistory": "Cronologia Importazioni"
    },
    "upload": {
      "title": "Importa Dati Excel",
      "chooseFile": "Scegli file",
      "dragDrop": "o trascina e rilascia",
      "fileTypes": ".XLS, .XLSX o CSV fino a 10MB (Dimensione massima 50MB)",
      "previewButton": "Anteprima Importazione",
      "importing": "Importazione...",
      "selectFile": "Seleziona File",
      "dropZoneText": "Scegli file o trascina e rilascia"
    },
    "guidelines": {
      "title": "Linee Guida Importazione",
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
      "importing": "Importazione...",
      "processingValidation": "Elaborazione e validazione",
      "columnValidation": "Validazione Colonne",
      "validColumn": "Colonna valida",
      "invalidColumn": "Colonna non valida",
      "overrideValidation": "Sovrascrivi validazione",
      "validationOverride": "La validazione può essere sovrascritta manualmente",
      "proceedImport": "Procedi con l'Importazione"
    },
    "history": {
      "title": "Cronologia Importazioni",
      "noImports": "Nessuna importazione ancora",
      "table": {
        "filename": "Nome File",
        "importDate": "Data Importazione", 
        "recordCount": "Record",
        "status": "Stato",
        "actions": "Azioni",
        "view": "Visualizza",
        "download": "Scarica",
        "sync": "Sincronizza"
      }
    },
    "status": {
      "success": "Successo",
      "error": "Errore", 
      "processing": "In elaborazione",
      "pending": "In Attesa",
      "completed": "Completato",
      "failed": "Fallito"
    },
    "messages": {
      "fileSelected": "File selezionato con successo",
      "importSuccess": "Dati importati con successo",
      "importError": "Impossibile importare i dati",
      "previewError": "Impossibile caricare l'anteprima",
      "noFileSelected": "Seleziona un file da importare",
      "invalidFileType": "Tipo di file non valido. Seleziona file XLS, XLSX o CSV",
      "fileTooLarge": "La dimensione del file supera il limite massimo",
      "uploadFirst": "Carica un file Excel per iniziare l'importazione dati",
      "importProgress": "Attendere mentre elaboriamo il file Excel. Questo potrebbe richiedere diversi minuti per file di grandi dimensioni.",
      "doNotClose": "Non chiudere questa pagina o navigare altrove",
      "autoComplete": "L'importazione è in corso e si completerà automaticamente.",
      "downloadStarted": "Download Avviato",
      "downloadFailed": "Download Fallito",
      "downloadDescription": "Scaricando {{filename}}...",
      "fileAlreadyImported": "File Già Importato",
      "importStarting": "Avvio Importazione...",
      "importStartingDescription": "Attendere mentre elaboriamo il file Excel. Non chiudere questa pagina o navigare altrove.",
      "importCompleteDescription": "Importazione completata con successo di {{rowsImported}} righe. Reindirizzamento alla cronologia importazioni...",
      "downloadError": "Impossibile scaricare il file"
    },
    "sync": {
      "clientSync": "Sincronizzazione Assistiti",
      "staffSync": "Sincronizzazione Personale", 
      "timeLogsSync": "Sincronizzazione Registri Ore",
      "syncInProgress": "Sincronizzazione in corso...",
      "syncCompleted": "Sincronizzazione completata",
      "syncFailed": "Sincronizzazione fallita",
      "processingRow": "Elaborazione riga {{current}} di {{total}}",
      "syncResults": "Risultati Sincronizzazione"
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
  },
  "staffAssignments": {
    "title": "Assegnazioni Collaboratori",
    "description": "Gestisci le assegnazioni e relazioni collaboratori-assistiti",
    "newAssignment": "Nuova Assegnazione",
    "columns": {
      "availableStaff": "Collaboratori Disponibili",
      "assignedStaff": "Collaboratori Assegnati"
    },
    "filters": {
      "searchStaff": "Cerca collaboratori...",
      "filterByClient": "Filtra per assistito",
      "allClients": "Tutti gli Assistiti"
    },
    "status": {
      "available": "Disponibile",
      "assigned": "Assegnato",
      "active": "Attivo",
      "inactive": "Inattivo"
    },
    "actions": {
      "assign": "Assegna",
      "unassign": "Rimuovi",
      "edit": "Modifica Assegnazione",
      "delete": "Elimina Assegnazione",
      "view": "Visualizza Dettagli"
    },
    "statistics": {
      "totalStaff": "Collaboratori Totali",
      "activeAssignments": "Assegnazioni Attive",
      "availableStaff": "Collaboratori Disponibili",
      "avgClientsPerStaff": "Media Assistiti/Collaboratori"
    },
    "emptyStates": {
      "noStaffAssigned": "Nessun collaboratore assegnato",
      "dragStaffHere": "Trascina qui i collaboratori per assegnare",
      "allStaffAssigned": "Tutti i collaboratori sono assegnati",
      "noAssignmentsFound": "Nessuna assegnazione di collaboratori trovata. Crea la tua prima assegnazione per iniziare.",
      "noMatchingFilters": "Nessuna assegnazione corrisponde ai tuoi filtri. Prova ad adattare i criteri di ricerca."
    },
    "dragAndDrop": {
      "dragToAssign": "Trascina per assegnare collaboratore all'assistito",
      "dragToUnassign": "Trascina per rimuovere assegnazione collaboratore",
      "dropZoneActive": "Rilascia qui per assegnare"
    },
    "badges": {
      "assignments": "{{count}} assegnazioni",
      "hourlyRate": "€{{rate}}/h",
      "noCategory": "Nessuna categoria"
    },
    "form": {
      "title": {
        "new": "Nuova Assegnazione",
        "edit": "Modifica Assegnazione"
      },
      "description": {
        "new": "Crea una nuova assegnazione collaboratore-assistito.",
        "edit": "Aggiorna i dettagli dell'assegnazione collaboratore-assistito."
      },
      "fields": {
        "staffMember": "Membro del Personale",
        "client": "Assistito",
        "startDate": "Data Inizio (Opzionale)",
        "endDate": "Data Fine (Opzionale)",
        "notes": "Note (Opzionale)"
      },
      "placeholders": {
        "selectStaff": "Seleziona un membro del personale",
        "selectClient": "Seleziona un assistito",
        "addNotes": "Aggiungi note su questa assegnazione"
      },
      "buttons": {
        "cancel": "Annulla",
        "create": "Crea",
        "update": "Aggiorna",
        "saving": "Salvataggio..."
      }
    },
    "messages": {
      "assignmentCreated": "Assegnazione creata con successo",
      "assignmentUpdated": "Assegnazione aggiornata con successo",
      "assignmentDeleted": "Assegnazione rimossa con successo",
      "staffAssigned": "Collaboratore assegnato a {{clientName}}",
      "staffUnassigned": "{{staffName}} rimosso da {{clientName}}",
      "createError": "Impossibile creare l'assegnazione",
      "updateError": "Impossibile aggiornare l'assegnazione",
      "deleteError": "Impossibile rimuovere l'assegnazione",
      "confirmDelete": "Sei sicuro di voler rimuovere questa assegnazione?"
    }
  },
  "objectStorage": {
    "title": "Archiviazione Oggetti",
    "description": "Gestione documenti conforme al GDPR con crittografia, tracciamento accessi e politiche di conservazione",
    "uploadDocument": "Carica Documento",
    "gdprCompliance": {
      "title": "Stato Conformità GDPR",
      "encryption": {
        "title": "Crittografia",
        "status": "Tutti i documenti crittografati"
      },
      "accessTracking": {
        "title": "Tracciamento Accessi",
        "status": "Log degli accessi mantenuti"
      },
      "retention": {
        "title": "Conservazione",
        "status": "{{count}} programmati",
        "noScheduled": "0 programmati"
      },
      "auditTrail": {
        "title": "Traccia di Controllo",
        "status": "Logging completo abilitato"
      }
    },
    "tabs": {
      "documents": "Documenti",
      "accessLogs": "Log degli Accessi",
      "retentionSchedules": "Programmi di Conservazione"
    },
    "filters": {
      "filterByCategory": "Filtra per Categoria:",
      "allCategories": "Tutte le Categorie",
      "showingDocuments": "Mostrando {{count}} documenti conformi al GDPR"
    },
    "documentLibrary": {
      "title": "Libreria Documenti",
      "description": "Tutti i documenti sono automaticamente crittografati e tracciati per la conformità GDPR",
      "noDocuments": "Nessun documento trovato",
      "noDocumentsDescription": "Carica il tuo primo documento per iniziare con l'archiviazione conforme al GDPR."
    },
    "table": {
      "headers": {
        "file": "File",
        "category": "Categoria",
        "accessLevel": "Livello di Accesso",
        "size": "Dimensione",
        "encrypted": "Crittografato",
        "uploaded": "Caricato",
        "actions": "Azioni"
      },
      "values": {
        "encrypted": "Crittografato",
        "notEncrypted": "Non Crittografato",
        "private": "Privato",
        "public": "Pubblico",
        "restricted": "Limitato"
      }
    },
    "actions": {
      "view": "Visualizza",
      "download": "Scarica",
      "delete": "Elimina",
      "edit": "Modifica",
      "viewDetails": "Visualizza Dettagli",
      "executeNow": "Esegui Ora"
    },
    "accessLogs": {
      "title": "Log degli Accessi ai Documenti",
      "description": "Traccia di controllo completa di tutti gli accessi ai documenti per la conformità GDPR",
      "noLogs": "Nessun log di accesso trovato",
      "table": {
        "document": "Documento",
        "action": "Azione",
        "user": "Utente",
        "timestamp": "Timestamp",
        "ipAddress": "Indirizzo IP"
      }
    },
    "retentionSchedules": {
      "title": "Programmi di Conservazione",
      "description": "Politiche automatizzate di conservazione e cancellazione documenti",
      "noSchedules": "Nessun programma di conservazione configurato",
      "table": {
        "document": "Documento",
        "retentionPeriod": "Periodo di Conservazione",
        "scheduledDeletion": "Cancellazione Programmata",
        "status": "Stato",
        "actions": "Azioni"
      },
      "status": {
        "active": "Attivo",
        "scheduled": "Programmato",
        "completed": "Completato",
        "cancelled": "Annullato"
      }
    },
    "upload": {
      "title": "Carica Documento",
      "description": "Carica un nuovo documento con funzionalità automatiche di conformità GDPR",
      "dragDrop": "Trascina e rilascia il tuo file qui, o clicca per sfogliare",
      "fileTypes": "Formati supportati: PDF, DOC, DOCX, XLS, XLSX, TXT",
      "form": {
        "fileName": "Nome File",
        "category": "Categoria",
        "accessLevel": "Livello di Accesso",
        "tags": "Tag",
        "description": "Descrizione",
        "selectCategory": "Seleziona una categoria",
        "selectAccessLevel": "Seleziona livello di accesso",
        "addTags": "Aggiungi tag (separati da virgola)",
        "addDescription": "Aggiungi una descrizione..."
      },
      "buttons": {
        "cancel": "Annulla",
        "upload": "Carica Documento",
        "uploading": "Caricamento..."
      }
    },
    "categories": {
      "client_documents": "Documenti Assistiti",
      "staff_documents": "Documenti Personale",
      "financial_records": "Registri Finanziari",
      "compliance_documents": "Documenti di Conformità",
      "contracts": "Contratti",
      "reports": "Report",
      "other": "Altro"
    },
    "messages": {
      "uploadSuccess": "Documento caricato con successo",
      "uploadError": "Impossibile caricare il documento",
      "deleteSuccess": "Documento eliminato con successo",
      "deleteError": "Impossibile eliminare il documento",
      "downloadStarted": "Download avviato",
      "downloadError": "Impossibile scaricare il documento",
      "confirmDelete": "Sei sicuro di voler eliminare questo documento? Questa azione non può essere annullata.",
      "accessLogged": "L'accesso al documento è stato registrato per la conformità GDPR"
    }
  },
  "systemManagement": {
    "title": "Gestione Sistema",
    "description": "Configura categorie di servizio, tipi e impostazioni di budget",
    "tabs": {
      "serviceCategories": "Categorie",
      "serviceTypes": "Tipi",
      "budgetCategories": "Budget Ca.",
      "budgetTypes": "Tipi Budget",
      "users": "Utenti"
    },
    "serviceCategories": {
      "title": "Categorie di Servizio",
      "description": "Gestisci le categorie principali dei servizi",
      "addNew": "Aggiungi Categoria",
      "editCategory": "Modifica Categoria",
      "table": {
        "code": "Codice",
        "name": "Nome",
        "description": "Descrizione",
        "order": "Ordine",
        "status": "Stato",
        "actions": "Azioni"
      },
      "form": {
        "code": "Codice Categoria",
        "name": "Nome Categoria",
        "description": "Descrizione",
        "displayOrder": "Ordine di Visualizzazione",
        "isActive": "Attivo",
        "placeholders": {
          "code": "Inserisci codice categoria (es. 1, 2, 3)",
          "name": "Inserisci nome categoria",
          "description": "Inserisci descrizione categoria",
          "displayOrder": "Inserisci ordine di visualizzazione"
        }
      },
      "status": {
        "active": "Attivo",
        "inactive": "Inattivo"
      },
      "messages": {
        "created": "Categoria creata con successo",
        "updated": "Categoria aggiornata con successo",
        "deleted": "Categoria eliminata con successo",
        "deleteError": "Impossibile eliminare la categoria",
        "confirmDelete": "Sei sicuro di voler eliminare questa categoria?"
      }
    },
    "serviceTypes": {
      "title": "Tipi di Servizio",
      "description": "Gestisci i tipi di servizio e le loro tariffe",
      "addNew": "Aggiungi Tipo",
      "editType": "Modifica Tipo",
      "table": {
        "code": "Codice",
        "name": "Nome",
        "category": "Categoria",
        "defaultRate": "Tariffa Default",
        "order": "Ordine",
        "status": "Stato",
        "actions": "Azioni"
      },
      "form": {
        "categoryId": "Categoria Servizio",
        "code": "Codice Tipo",
        "name": "Nome Tipo",
        "description": "Descrizione",
        "defaultRate": "Tariffa Default (€/ora)",
        "displayOrder": "Ordine di Visualizzazione",
        "isActive": "Attivo",
        "placeholders": {
          "selectCategory": "Seleziona una categoria",
          "code": "Inserisci codice tipo",
          "name": "Inserisci nome tipo",
          "description": "Inserisci descrizione tipo",
          "defaultRate": "Inserisci tariffa oraria default",
          "displayOrder": "Inserisci ordine di visualizzazione"
        }
      },
      "messages": {
        "created": "Tipo di servizio creato con successo",
        "updated": "Tipo di servizio aggiornato con successo",
        "deleted": "Tipo di servizio eliminato con successo",
        "deleteError": "Impossibile eliminare il tipo di servizio",
        "confirmDelete": "Sei sicuro di voler eliminare questo tipo di servizio?"
      }
    },
    "budgetCategories": {
      "title": "Categorie Budget",
      "description": "Gestisci le classificazioni delle categorie budget",
      "addNew": "Aggiungi Categoria Budget",
      "editCategory": "Modifica Categoria Budget",
      "table": {
        "name": "Nome",
        "description": "Descrizione",
        "actions": "Azioni"
      },
      "form": {
        "name": "Nome Categoria",
        "description": "Descrizione",
        "placeholders": {
          "name": "Inserisci nome categoria budget",
          "description": "Inserisci descrizione categoria"
        }
      },
      "messages": {
        "created": "Categoria budget creata con successo",
        "updated": "Categoria budget aggiornata con successo",
        "deleted": "Categoria budget eliminata con successo",
        "deleteError": "Impossibile eliminare la categoria budget",
        "confirmDelete": "Sei sicuro di voler eliminare questa categoria budget?"
      }
    },
    "budgetTypes": {
      "title": "Tipi Budget",
      "description": "Gestisci i tipi budget con tariffe e categorie",
      "addNew": "Aggiungi Tipo Budget",
      "editType": "Modifica Tipo Budget",
      "table": {
        "code": "Codice",
        "name": "Nome",
        "category": "Categoria",
        "weekdayRate": "Tariffa Feriale",
        "holidayRate": "Tariffa Festiva",
        "kilometerRate": "Tariffa Km",
        "order": "Ordine",
        "actions": "Azioni"
      },
      "form": {
        "categoryId": "Categoria Budget",
        "code": "Codice Budget",
        "name": "Nome Budget",
        "description": "Descrizione",
        "defaultWeekdayRate": "Tariffa Feriale (€/ora)",
        "defaultHolidayRate": "Tariffa Festiva (€/ora)",
        "defaultKilometerRate": "Tariffa Chilometrica (€/km)",
        "displayOrder": "Ordine di Visualizzazione",
        "placeholders": {
          "selectCategory": "Seleziona una categoria budget",
          "code": "Inserisci codice budget",
          "name": "Inserisci nome budget",
          "description": "Inserisci descrizione budget",
          "weekdayRate": "Inserisci tariffa oraria feriale",
          "holidayRate": "Inserisci tariffa oraria festiva",
          "kilometerRate": "Inserisci tariffa chilometrica",
          "displayOrder": "Inserisci ordine di visualizzazione"
        }
      },
      "messages": {
        "created": "Tipo budget creato con successo",
        "updated": "Tipo budget aggiornato con successo",
        "deleted": "Tipo budget eliminato con successo",
        "deleteError": "Impossibile eliminare il tipo budget",
        "confirmDelete": "Sei sicuro di voler eliminare questo tipo budget?"
      }
    },
    "users": {
      "title": "Gestione Utenti",
      "description": "Gestisci gli utenti del sistema e i loro ruoli",
      "addNew": "Aggiungi Utente",
      "editUser": "Modifica Utente",
      "table": {
        "email": "Email",
        "name": "Nome",
        "role": "Ruolo",
        "createdAt": "Creato",
        "actions": "Azioni"
      },
      "form": {
        "email": "Indirizzo Email",
        "firstName": "Nome",
        "lastName": "Cognome",
        "role": "Ruolo Utente",
        "placeholders": {
          "email": "Inserisci indirizzo email",
          "firstName": "Inserisci nome",
          "lastName": "Inserisci cognome",
          "selectRole": "Seleziona ruolo utente"
        }
      },
      "roles": {
        "admin": "Amministratore",
        "manager": "Manager",
        "staff": "Membro del Personale"
      },
      "messages": {
        "created": "Utente creato con successo",
        "updated": "Utente aggiornato con successo",
        "deleted": "Utente eliminato con successo",
        "deleteError": "Impossibile eliminare l'utente",
        "confirmDelete": "Sei sicuro di voler eliminare questo utente?"
      }
    },
    "common": {
      "loading": "Caricamento...",
      "noResults": "Nessun risultato trovato",
      "confirmDelete": "Conferma Eliminazione",
      "deleteWarning": "Questa azione non può essere annullata.",
      "required": "Questo campo è obbligatorio",
      "save": "Salva",
      "cancel": "Annulla",
      "add": "Aggiungi",
      "edit": "Modifica",
      "delete": "Elimina",
      "active": "Attivo",
      "inactive": "Inattivo"
    }
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