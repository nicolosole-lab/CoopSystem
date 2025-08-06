# Overview

This is a Healthcare Service Management Platform designed as a "Cooperative Management System" for managing healthcare services. The application enables organizations to track service hours, manage client and staff information, handle time logging with automatic cost calculations, and plan budget allocations. The system is built as a full-stack web application with authentication, CRUD operations, and a modern responsive interface.

## Recent Changes (January 9, 2025 - Updated v2)
- Converted imported data view from modal dialog to dedicated page (`/import/:id`) for better data viewing experience
- Added new route and page component `ImportDetails` for viewing imported Excel data
- Removed dialog dependencies from data management page in favor of page navigation
- Implemented smart empty row filtering during Excel import - only saves rows with actual data content
- Added advanced features to ImportDetails page: search functionality, column filtering, pagination (10/20/50/100 rows), and dynamic column selection
- Implemented language-aware column mapping system supporting English and Italian languages
- Added global language toggle in header (EN/IT) with localStorage persistence
- Column headers now automatically change based on selected language while keeping data in original language
- Implemented comprehensive internationalization using react-i18next library with proper configuration
- Created complete English and Italian translation files for data management and import details sections
- Updated all UI text in data management pages to use i18n translations instead of hardcoded strings
- Fixed Italian Excel file parsing by updating server column mappings to match actual Italian headers
- **Expanded i18n implementation to all application sections**: Dashboard, Auth, Clients, Staff, Budgets, Time Tracking, Landing, and Not Found pages
- Added structured translation architecture with nested JSON for each page/component
- Implemented dynamic service type translations for badges (personal-care, home-support, medical-assistance, social-support, transportation)
- Added status translations for client/staff management (active, inactive, pending)
- Integrated `useTranslation` hook across all pages while maintaining compatibility with existing LanguageContext
- Added common translations section for shared UI elements and messages
- **Implemented User Profile section** with personal information and security tabs, profile editing, password change functionality
- Fixed infinite re-render issue in profile page by properly using useEffect for form initialization
- Added phone and address fields to User schema for complete profile management
- Made user avatar in header clickable to navigate to profile page
- **Major UI Enhancement** - Implemented healthcare-focused theme with light blue and yellow-green color scheme
- Added gradient backgrounds, animations (float-gentle, pulse-soft), and smooth transitions throughout the application
- Replaced Sign Out text with logout icon for cleaner interface
- Added PrivatAssistenza logo to header with healthcare branding
- Enhanced dashboard with gradient cards, animated status indicators, and healthcare-themed quick actions
- Implemented care-card styling with hover effects and shadow animations
- Updated sidebar with gradient background and smooth navigation transitions
- **Sidebar Navigation Update** - Restructured sidebar to match Italian healthcare system modules
- Added section headers: PRINCIPALE, RENDICONTAZIONE ASSISTITI, RENDICONTAZIONE COLLABORATORI, RENDICONTAZIONE BUDGET
- Prepared navigation for upcoming modules: Planning Management, Smart Hours Entry, Staff Assignments, Object Storage, Home Care Planning, Assistance Calendar
- **Budget Configuration System Implementation** - Created comprehensive budget management infrastructure
- Added `client_budget_configs` database table with validity periods, weekday/holiday rates, kilometer rates, and balance tracking
- Implemented 10 mandatory budget categories (HCPQ, HCPB, F.P.QUALIFICATA, LEGGE162, RAC, ASSISTENZA DIRETTA, F.P.BASE, SADQ, SADB, EDUCATIVA)
- Created API endpoints for budget configuration CRUD operations and automatic initialization
- Enhanced Home Care Planning page to display budget configurations with rate details table
- Added mileage funding rules - only LEGGE162, RAC, and ASSISTENZA DIRETTA budgets can fund kilometers
- Integrated budget configurations with client selection showing available budgets and their rates
- **Client Management Enhancements** - Fixed translations and improved delete functionality
- Added proper i18n translations for all hardcoded text in Client Management page
- Enhanced delete button visibility with hover effects and title attributes
- Fixed filter logic to properly handle "all" value for status and service type filters
- Added transportation service type to the filter dropdown
- Translated all dialog titles, table headers, and messages to use i18n system
- Updated Italian translations to use "Assistiti" instead of "Clienti" for consistency
- **Budget Configuration Default Values** - Implemented standard budget default values for all 10 mandatory categories
- Added default amounts: ASSISTENZA DIRETTA: €1,500, HCPQ: €800, HCPB: €600, F.P.QUALIFICATA: €750, LEGGE162: €900, RAC: €450, FP_BASE: €550, SADQ: €700, SADB: €500, EDUCATIVA: €650
- Fixed category name mapping issue between budget codes and database ("Home Support Services" vs "Home Support")
- Updated budget initialization to use default values or larger of default/allocated amount when creating configurations
- Budget initialization now properly pulls available balance from client_budget_allocations table for Anna Ferrari (€10,500) and Giovanni Bianchi (€5,000)
- **Plan Activation Feature** - Added ability to activate draft plans in Planning Management
- Implemented "Activate Plan" button that appears only for plans in draft status
- Created API endpoint `/api/home-care-plans/:id/activate` to update plan status from draft to active
- Added proper translations for activate action in both English and Italian
- Plans now start as drafts and require explicit activation for use in the system
- **Complete Assistance Hours Analysis** - Comprehensive analysis of duration field as core metric for operator work hours and client assistance received
- Analyzed eight complete datasets covering 75 months of operations (2019-2025) with focus EXCLUSIVELY on external assistance activities:
  * 2019 Dataset: 311 appointments, 885.5 hours (2.85 avg hours/appointment) - Birth year (May-Dec)
  * 2020 Dataset: 4,050 appointments, 7,031.1 hours (1.74 avg hours/appointment) - Foundation year
  * 2021 Dataset: 4,931 appointments, 6,833.6 hours (1.39 avg hours/appointment)
  * 2022 Dataset: 5,914 appointments, 9,388.3 hours (1.59 avg hours/appointment)
  * 2023 Dataset: 7,983 appointments, 10,970.5 hours (1.37 avg hours/appointment)
  * 2024 Dataset: 13,335 appointments, 22,183.7 hours (1.66 avg hours/appointment)
  * 2025 Period (Jan-Jul): 9,279 appointments, 16,025.5 hours (1.73 avg hours/appointment)
- **EXTERNAL ACTIVITIES TOTAL**: 73,318.2 hours of direct assistance across 45,803 appointments serving 2,149 unique clients with 165 total operators
- Duration field represents critical business metric: hours operators worked with clients and hours clients received assistance
- Statistical focus always excludes internal activities and includes ONLY external assistance activities
- System demonstrates 7-year evolution: 2019 birth (2.4 hrs/day) → 2020 foundation (19.3 hrs/day) → 2024 peak (60.8 hrs/day) → 2025 optimization (43.9 hrs/day)
- Complete monthly/yearly breakdowns available showing seasonal patterns and operational scaling from 2019-2025
- Extraordinary growth: From 885.5 hours in 8 months (2019) to 22,183.7 hours annually (2024), representing pure external assistance growth of ×25.1 times

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **Routing**: Wouter for client-side routing with protected routes
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Forms**: React Hook Form with Zod schema validation for type-safe form handling
- **Styling**: Tailwind CSS with CSS custom properties for theming support

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Authentication**: OpenID Connect (OIDC) integration with Replit Auth using Passport.js
- **Session Management**: Express sessions stored in PostgreSQL using connect-pg-simple
- **API Design**: RESTful API endpoints with centralized error handling

## Database Schema Design
- **Users**: Authentication and profile information with role-based access (admin, manager, staff)
- **Clients**: Healthcare service recipients with personal details, service types, and budget allocations
- **Staff**: Healthcare service providers with specializations, hourly rates, and availability status
- **Time Logs**: Service hour tracking linking clients and staff with automatic cost calculations
- **Budget Categories**: Service classification for budget allocation and reporting
- **Client Budget Allocations**: Financial planning and spending limits per client per category

## Development Environment
- **Build System**: Vite for frontend with esbuild for backend compilation
- **Development Server**: Integrated development setup with HMR and error overlay
- **Database Migrations**: Drizzle Kit for schema management and migrations
- **Path Aliases**: Configured for clean imports (@/, @shared/, @assets/)

## Internationalization (i18n)
- **Library**: react-i18next for comprehensive translation support
- **Languages**: English (en) and Italian (it) with automatic language detection
- **Configuration**: Browser language detection with localStorage persistence
- **Translation Files**: JSON-based translation files in `client/src/i18n/locales/`
- **Integration**: Seamless integration with existing LanguageContext for backward compatibility
- **Column Mapping**: Dynamic column header translations based on selected language
- **Date/Time Formatting**: Locale-aware formatting for dates, times, and currency

## Authentication & Authorization
- **Provider**: Email and password authentication with secure password hashing
- **Session Storage**: PostgreSQL-based session store with configurable TTL using express-session
- **Route Protection**: Middleware-based authentication checks for API endpoints using Passport.js
- **User Management**: Registration, login, and logout functionality with role-based access control

## Data Validation
- **Schema Validation**: Zod schemas shared between frontend and backend
- **Type Safety**: Full TypeScript coverage with strict compilation settings
- **Runtime Validation**: Input validation on both client and server sides

# External Dependencies

## Database
- **Neon Database**: Serverless PostgreSQL database with connection pooling
- **Connection**: WebSocket-based connection using @neondatabase/serverless

## Authentication Services
- **Replit Auth**: OpenID Connect provider for user authentication
- **Session Storage**: PostgreSQL table for session persistence

## UI Component Libraries
- **Radix UI**: Accessible component primitives for complex UI elements
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide React**: Icon library for consistent iconography

## Development Tools
- **Replit Integration**: Native Replit development environment support
- **Vite Plugins**: Runtime error modal and cartographer for enhanced development experience

## Build and Deployment
- **Production Build**: Optimized bundle generation for client and server
- **Static Asset Serving**: Vite-generated assets served via Express in production
- **Environment Configuration**: Environment variable-based configuration for different deployment stages