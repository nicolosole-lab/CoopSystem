# Overview

This project is a Healthcare Service Management Platform, dubbed a "Cooperative Management System." Its primary purpose is to streamline healthcare service operations by enabling organizations to meticulously track service hours, manage client and staff information, automate time logging with precise cost calculations, and facilitate efficient budget planning. This full-stack web application features robust authentication, comprehensive CRUD functionalities, and a modern, responsive user interface. The system aims to provide a centralized solution for managing all aspects of healthcare service delivery, from financial tracking and budget allocation to client and staff coordination.

# User Preferences

Preferred communication style: Simple, everyday language.
Data verification: Always perform double verification when providing real data from the database.
UI/UX: Add tooltips to action icons for better user guidance.

## Business Rules
- **Italian Calendar**: Sunday is always considered a holiday (giorno festivo), Saturday is a regular weekday (giorno feriale).
- **Budget Cost Calculation**: Total cost is influenced by Italian holidays and Sundays. Holiday rate applies to Sundays and official Italian holidays, weekday rate applies to all other days including Saturday.
- **Budget Allocation Priority**: Automatic budget selection follows this hierarchy:
  1. Service Type Matching - Links specific service types to designated budget categories (e.g., "Assistenza alla persona" → SAI, "Home Care" → SAD)
  2. Expiration Date Priority - Uses budgets expiring soonest first
  3. Available Balance Priority - Uses budgets with higher available amounts
  Note: Once approved, manual budget selection is required to make changes
- **Multi-Client Compensation Calculation**: When staff members serve multiple clients in a compensation period, each client page shows only their specific portion:
  - Client-specific hours and amounts are calculated using fixed hourly rates (€10/hour regular, €30/hour holiday/Sunday)
  - Client debt = (client hours × hourly rate) - budget allocations
  - PDF slips display only the client's portion, not the full compensation (Fixed January 2025)

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite.
- **UI Library**: Shadcn/ui components built on Radix UI primitives, styled with Tailwind CSS.
- **Routing**: Wouter for client-side routing with protected routes.
- **State Management**: TanStack Query (React Query) for server state management and caching.
- **Forms**: React Hook Form with Zod for type-safe form handling.
- **Styling**: Tailwind CSS with custom properties for theming.
- **Holiday Calendar**: Italian holidays and Sundays calculation with toggle visibility in Home Care Budget Planner.

## Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Database ORM**: Drizzle ORM with PostgreSQL dialect.
- **Authentication**: OpenID Connect (OIDC) integration with Replit Auth via Passport.js.
- **Session Management**: Express sessions stored in PostgreSQL using `connect-pg-simple`.
- **API Design**: RESTful API endpoints with centralized error handling.

## Database Schema Design
- **Core Entities**: Users (authentication, profile, roles), Clients (personal details, service types, budget allocations), Staff (specializations, rates, availability), Time Logs (service hours, cost calculations).
- **Financial Structure**: Budget Categories (service classification), Client Budget Allocations (financial planning, spending limits), and `budget_types` for specific budget codes and rates.

## System Design Choices
- **Internationalization (i18n)**: Comprehensive support using `react-i18next` for English and Italian, including dynamic column mapping and locale-aware formatting.
- **Authentication & Authorization**: Email/password authentication with secure hashing, PostgreSQL-based session storage, and Passport.js for middleware-based access control.
- **Data Validation**: Shared Zod schemas for type-safe, runtime validation on both client and server.
- **UI/UX**: Healthcare-focused theme with light blue and yellow-green color schemes, gradient backgrounds, animations, and smooth transitions. Restructured sidebar to align with Italian healthcare system modules.
- **Budget Management**: Flexible date-based budget allocation system with start/end date periods (replacing rigid month/year). **10 Mandatory Budget Types System**: Every client must have all 10 budget types allocated for complete service tracking (HCPQ, HCPB, FP_QUALIFICATA, LEGGE162, RAC, ASSISTENZA DIRETTA, FP_BASE, SADQ, SADB, EDUCATIVA). Budget types with (KM) designation support mileage reimbursement. Successfully migrated 27 existing budget records to use date ranges (January 2025).
- **Home Care Budget Planner**: Advanced planning module with Italian holidays calculation (including Easter), Sunday tracking, and toggle for displaying/hiding Sundays in period view. Displays holidays within selected date range with red-themed UI.
- **Data Import & Synchronization**: Advanced Excel import functionality with smart empty row filtering, comprehensive `ImportDetails` page (search, filtering, pagination), and automatic/manual client synchronization with real-time status tracking. Excel column mapping uses precise positions: assisted_person_id at column AW (index 48), operator_id at column BB (index 53), operator names at columns AH-AI (indices 33-34).
- **Time Tracking Enhancement**: Added service start/end datetime fields (scheduledStartTime, scheduledEndTime) to capture precise service periods. These fields map to columns D and E from Excel imports for service time ranges.
- **Staff Details Enhancement**: Added comprehensive Service Logs section displaying time entries with start/end times, client information, and service details for better staff activity tracking.
- **Compensation Dashboard**: Robust date handling with safe formatting functions that properly convert PostgreSQL date values and handle edge cases. Fixed persistent Unix epoch date display issue (Jan 01, 1970) by implementing proper date serialization in storage layer and client-side validation (January 2025).
- **Staff Assignments Module**: Successfully rebuilt drag & drop system using @dnd-kit library after resolving duplicate dragging issues. Features include unique drag IDs for each instance, visual "Assigned" indicators, pagination (4 clients per page), hover-to-delete functionality, and smooth drag overlay feedback. Alternative views (List and Matrix) remain available for different workflow preferences (January 2025).
- **Unified Time Tracking Interface**: Successfully merged Monthly Hours functionality into Smart Hours Entry page, creating a comprehensive tabbed interface with Quick Entry and Monthly View. Features intelligent time calculation, budget allocation, filtering, pagination, and deletion capabilities. Removed redundant navigation entries and redirected /time-tracking route (January 2025).
- **Comprehensive Role-Based Access Control System**: Implemented enterprise-grade permission system across ENTIRE application (January 2025):
  - **Backend**: All API routes protected with systematic CRUD permissions (clients, staff, users, timeLogs, budgets, assignments, reports, systemSettings, approvals, dataImport)
  - **Frontend**: Unified usePermissions hook with resource-specific permission checks replacing manual role validations
  - **Role Hierarchy**: Staff (create only), Manager (create+update), Admin (create+update+delete) applied universally
  - **UI Components**: Conditional rendering of action buttons (Add, Edit, Delete) across all major pages (clients, staff, system-management, data-management)
  - **Migration**: Successfully replaced legacy role checks with comprehensive permission system, ensuring consistent access control throughout application
- **Advanced GDPR Document Management System**: Complete Phase 2 GDPR implementation with comprehensive document management (January 2025):
  - **Document Library**: Full-featured document upload, view, download, and delete functionality with real-time display
  - **GDPR Compliance**: All documents automatically encrypted, complete audit logging, retention policies, and access tracking
  - **Document Viewer**: HTML-based viewer supporting different file types (PDF, images, generic files) with detailed metadata display
  - **Audit Trail**: Comprehensive logging system tracking all document operations (upload, view, download, delete) for GDPR compliance
  - **Permission Integration**: Document management fully integrated with role-based access control system
  - **Testing Documentation**: Complete GDPR_TESTING_GUIDE.md with 12 comprehensive test sections, SQL verification queries, and troubleshooting guide
  - **Complete Bilingual Support**: Object Storage page fully translated with comprehensive English/Italian localization including GDPR compliance interface, document management features, upload dialogs, table headers, status indicators, and all interactive elements (January 2025)
- **Real-Time Import Progress Tracking**: Enhanced Data Import system with live progress display (January 2025):
  - **Progress API**: New `/api/imports/:id/sync-progress` endpoint provides real-time sync status with processed/total counts
  - **UI Progress Display**: Import Details dialog shows live progress bar with "Processing row X/Y" messages during time logs sync
  - **Download Functionality**: Added Excel file download capability in Import History with proper file recreation from stored data
  - **Global Progress Tracking**: Server-side progress tracking system stores sync status globally for real-time access
  - **Enhanced User Experience**: Users can now monitor sync progress in UI instead of checking server console logs
- **European Date Format Support**: Fixed critical date parsing issue for Excel imports (January 2025):
  - **Date Parsing Fix**: Implemented European date format parser for DD/MM/YYYY HH:MM format (e.g., "21/07/2025 12:00")
  - **Service Logs Resolution**: Resolved issue where staff service logs weren't appearing due to failed date parsing
  - **Comprehensive Testing**: Validated fix with ELOISA MARCIAS case study, successfully parsing 9 service log entries
  - **Real-Time Sync Data Progress**: Added progress tracking for combined client/staff sync operations with consistent UI experience
- **Compensation Date Filtering Bug Fix**: Resolved critical datetime comparison issue in compensation calculations (January 2025):
  - **Date Range Filtering Fix**: Fixed SQL date comparison logic that excluded time logs on period end dates
  - **Issue**: Service dates with times (2025-07-31 09:00:00) failed comparison with date-only period ends (2025-07-31)
  - **Solution**: Implemented DATE() function wrapper for accurate date-only comparisons in time log filtering
  - **Impact**: ELOISA MARCIAS compensation now correctly shows 21.5 hours instead of missing 4 hours from July 31st
  - **Scope**: All future compensation calculations now include complete time log data from period ranges
- **Critical Timezone Handling Bug Fixes**: Comprehensive resolution of systematic timezone conversion issues (January 2025):
  - **Date Picker Conversion Fix**: Replaced toISOString() with format(date, 'yyyy-MM-dd') in compensation period selection to prevent timezone shifts
  - **Display Format Standardization**: Replaced toLocaleDateString() with format(date, 'dd/MM/yyyy') across Time Tracking, Service Logs, and Compensation tables
  - **Service Date Processing**: Implemented safe Date object handling in Service Logs to prevent "Invalid time value" errors
  - **European Date Format**: Standardized all date displays to dd/MM/yyyy format for consistency with Italian system requirements
  - **Compensation Accuracy**: Fixed systematic date shifting that caused compensation calculations to miss work periods (July work showing as August, etc.)
- **Direct Assistance Budget Fallback System**: Comprehensive fallback mechanism for compensation creation when no client budget allocations are available (January 2025):
  - **Fallback Budget Type**: Created "Assistenza Diretta" budget type (type-direct-assistance) with standard rates (€10/hour regular, €30/hour holiday)
  - **Virtual Client System**: Established "Sistema Assistenza Diretta" virtual client for tracking fallback compensations
  - **Automatic Detection**: Frontend automatically detects when no client budget allocations exist and displays user-friendly fallback message
  - **Seamless Integration**: Backend handles "direct-assistance-fallback" allocations by creating virtual budget expenses for proper tracking
  - **Audit Trail**: All direct assistance compensations are properly logged with clear descriptions and linked to virtual client for reporting

# External Dependencies

## Database
- **Neon Database**: Serverless PostgreSQL database.

## Authentication Services
- **Replit Auth**: OpenID Connect provider for user authentication.

## UI Component Libraries
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.

## Development Tools
- **Vite**: Build tool and development server.
- **Drizzle Kit**: Schema management and migrations.
- **Passport.js**: Authentication middleware.

## Build and Deployment
- **Vite**: Optimized bundle generation and static asset serving.