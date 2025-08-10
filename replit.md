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
- **Budget Management**: Flexible date-based budget allocation system with start/end date periods (replacing rigid month/year). Supports 10 mandatory budget categories with default values and mileage funding rules. Successfully migrated 27 existing budget records to use date ranges (January 2025).
- **Home Care Budget Planner**: Advanced planning module with Italian holidays calculation (including Easter), Sunday tracking, and toggle for displaying/hiding Sundays in period view. Displays holidays within selected date range with red-themed UI.
- **Data Import & Synchronization**: Advanced Excel import functionality with smart empty row filtering, comprehensive `ImportDetails` page (search, filtering, pagination), and automatic/manual client synchronization with real-time status tracking. Excel column mapping uses precise positions: assisted_person_id at column AW (index 48), operator_id at column BB (index 53), operator names at columns AH-AI (indices 33-34).
- **Time Tracking Enhancement**: Added service start/end datetime fields (scheduledStartTime, scheduledEndTime) to capture precise service periods. These fields map to columns D and E from Excel imports for service time ranges.
- **Staff Details Enhancement**: Added comprehensive Service Logs section displaying time entries with start/end times, client information, and service details for better staff activity tracking.
- **Compensation Dashboard**: Robust date handling with safe formatting functions that properly convert PostgreSQL date values and handle edge cases. Fixed persistent Unix epoch date display issue (Jan 01, 1970) by implementing proper date serialization in storage layer and client-side validation (January 2025).
- **Staff Assignments Module**: Successfully rebuilt drag & drop system using @dnd-kit library after resolving duplicate dragging issues. Features include unique drag IDs for each instance, visual "Assigned" indicators, pagination (4 clients per page), hover-to-delete functionality, and smooth drag overlay feedback. Alternative views (List and Matrix) remain available for different workflow preferences (January 2025).

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