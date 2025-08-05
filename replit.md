# Overview

This is a Healthcare Service Management Platform designed as a "Cooperative Management System" for managing healthcare services. The application enables organizations to track service hours, manage client and staff information, handle time logging with automatic cost calculations, and plan budget allocations. The system is built as a full-stack web application with authentication, CRUD operations, and a modern responsive interface.

## Recent Changes (January 9, 2025)
- Converted imported data view from modal dialog to dedicated page (`/import/:id`) for better data viewing experience
- Added new route and page component `ImportDetails` for viewing imported Excel data
- Removed dialog dependencies from data management page in favor of page navigation

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