# Overview

This project is a Healthcare Service Management Platform, a "Cooperative Management System," designed to optimize healthcare service operations. It enables organizations to track service hours, manage client and staff data, automate time logging with cost calculations, and facilitate budget planning. This full-stack web application offers robust authentication, comprehensive CRUD functionalities, and a modern, responsive UI, providing a centralized solution for managing all aspects of healthcare service delivery, from financial tracking and budget allocation to client and staff coordination.

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
  - PDF slips display only the client's portion, not the full compensation

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite.
- **UI Library**: Shadcn/ui components built on Radix UI primitives, styled with Tailwind CSS.
- **Routing**: Wouter for client-side routing with protected routes.
- **State Management**: TanStack Query (React Query) for server state management and caching.
- **Forms**: React Hook Form with Zod for type-safe form handling.
- **Styling**: Tailwind CSS with custom properties for theming.
- **Holiday Calendar**: Italian holidays and Sundays calculation with toggle visibility.
- **Calendar & Notification System**: FullCalendar integration with automatic notification service and mobile-responsive design for appointment management.

## Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Database ORM**: Drizzle ORM with PostgreSQL dialect.
- **Authentication**: OpenID Connect (OIDC) integration with Replit Auth via Passport.js.
- **Session Management**: Express sessions stored in PostgreSQL using `connect-pg-simple`.
- **API Design**: RESTful API endpoints with centralized error handling.
- **Notification Service**: Automated notification system with multilingual email templates, appointment reminders, and in-app notifications with Italian and English support.

## Database Schema Design
- **Core Entities**: Users (authentication, profile, roles), Clients (personal details, service types, budget allocations), Staff (specializations, rates, availability), Time Logs (service hours, cost calculations).
- **Financial Structure**: Budget Categories (service classification), Client Budget Allocations (financial planning, spending limits), and `budget_types` for specific budget codes and rates.

## System Design Choices
- **Internationalization (i18n)**: Comprehensive support using `react-i18next` for English and Italian, including dynamic column mapping and locale-aware formatting.
- **Authentication & Authorization**: Email/password authentication with secure hashing, PostgreSQL-based session storage, and Passport.js for middleware-based access control with comprehensive role-based access control (Staff, Manager, Admin roles).
- **Data Validation**: Shared Zod schemas for type-safe, runtime validation on both client and server.
- **UI/UX**: Healthcare-focused theme with light blue and yellow-green color schemes, gradient backgrounds, animations, smooth transitions, and a restructured sidebar.
- **Budget Management**: Flexible date-based budget allocation system with 10 mandatory budget types (HCPQ, HCPB, FP_QUALIFICATA, LEGGE162, RAC, ASSISTENZA DIRETTA, FP_BASE, SADQ, SADB, EDUCATIVA). Includes a "Direct Assistance" fallback system for compensation creation without client budget allocations.
- **Home Care Budget Planner**: Advanced planning module with Italian holidays calculation (including Easter) and Sunday tracking.
- **Data Import & Synchronization**: Advanced Excel import functionality with smart empty row filtering, comprehensive `ImportDetails` page, automatic/manual client synchronization, real-time import progress tracking, and European date format support (DD/MM/YYYY HH:MM).
- **Time Tracking Enhancement**: Added service start/end datetime fields for precise service periods and a unified time tracking interface merging Monthly Hours into a tabbed Smart Hours Entry page.
- **Staff Details Enhancement**: Comprehensive Service Logs section displaying time entries with start/end times, client information, and service details.
- **Compensation Dashboard**: Robust date handling with safe formatting functions to prevent timezone shifts and ensure accurate calculations.
- **Staff Assignments Module**: Rebuilt drag & drop system using `@dnd-kit` library with unique drag IDs, visual indicators, pagination, and hover-to-delete functionality.
- **GDPR Document Management System**: Full-featured document upload, view, download, and delete functionality with encryption, audit logging, retention policies, and access tracking. Supports multiple file types and includes bilingual support.
- **Name Format Standardization**: System-wide implementation of "LastName, FirstName" display format for consistency across the application and in PDF exports, with flexible search capabilities.
- **Phase 3 Planning & Calendar System**: Comprehensive calendar management with FullCalendar integration, automatic notification service for appointment reminders and status updates, and mobile-optimized responsive calendar interface with touch-friendly interactions for healthcare service scheduling.

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