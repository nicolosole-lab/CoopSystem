# Budget System Migration Plan

## Overview
Migration from single-level budget structure to hierarchical category-type structure.

## Current Structure
- Budget Categories table contains what are actually budget types (HCPQ, HCPB, etc.)
- Client allocations reference "categories" directly
- Budget configs store budget codes/names as strings

## New Structure

### Database Schema Changes

#### 1. New Tables
**budget_types**
- id (PK)
- category_id (FK to budget_categories)
- code (unique) - HCPQ, HCPB, etc.
- name - Qualified HCP, Basic HCP, etc.
- description
- default_weekday_rate
- default_holiday_rate
- default_kilometer_rate
- can_fund_mileage
- is_active
- display_order
- created_at
- updated_at

#### 2. Modified Tables
**budget_categories**
- Will only contain 2 categories:
  - Assistenza domiciliare (Home Care)
  - Assistenza educativa (Educational Care)

**client_budget_allocations**
- categoryId → budgetTypeId (FK to budget_types)

**budget_expenses**
- categoryId → budgetTypeId (FK to budget_types)

**client_budget_configs**
- budgetCode, budgetName → budgetTypeId (FK to budget_types)

## Migration Steps

### Phase 1: Create New Structure
1. Create budget_types table
2. Insert 2 main categories in budget_categories
3. Insert 10 budget types with proper category associations

### Phase 2: Data Migration Script
```sql
-- Step 1: Clear and recreate budget_categories with 2 main categories
TRUNCATE budget_categories CASCADE;
INSERT INTO budget_categories (id, name, description) VALUES
  ('cat-home', 'Assistenza domiciliare', 'Home Care Services'),
  ('cat-edu', 'Assistenza educativa', 'Educational Care Services');

-- Step 2: Create budget types
INSERT INTO budget_types (category_id, code, name, can_fund_mileage, default_weekday_rate, default_holiday_rate, default_kilometer_rate, display_order) VALUES
  ('cat-home', 'HCPQ', 'Qualified HCP', false, 15.00, 20.00, 0.00, 1),
  ('cat-home', 'HCPB', 'Basic HCP', false, 15.00, 20.00, 0.00, 2),
  ('cat-home', 'FP_QUALIFICATA', 'Qualified Poverty Fund', false, 15.00, 20.00, 0.00, 3),
  ('cat-home', 'LEGGE162', 'Law 162', true, 15.00, 20.00, 0.50, 4),
  ('cat-home', 'RAC', 'RAC', true, 15.00, 20.00, 0.50, 5),
  ('cat-home', 'ASSISTENZA_DIRETTA', 'Direct Assistance', true, 15.00, 20.00, 0.50, 6),
  ('cat-home', 'FP_BASE', 'Basic Poverty Fund', false, 15.00, 20.00, 0.00, 7),
  ('cat-home', 'SADQ', 'Qualified SAD', false, 15.00, 20.00, 0.00, 8),
  ('cat-home', 'SADB', 'Basic SAD', false, 15.00, 20.00, 0.00, 9),
  ('cat-edu', 'EDUCATIVA', 'Educational Budget', false, 15.00, 20.00, 0.00, 10);

-- Step 3: Map existing allocations to budget types
-- This will require matching old category names to new budget type codes
```

### Phase 3: Update Application Code
1. Update storage.ts interfaces and methods
2. Update API endpoints
3. Update frontend components
4. Update translations

## Mapping Rules

### Old Categories → New Budget Types
- Personal Care Services → HCPQ
- Home Support Services → HCPB  
- Medical Assistance → FP_QUALIFICATA
- Law 162 → LEGGE162
- RAC → RAC
- Direct Assistance → ASSISTENZA_DIRETTA
- Basic Support → FP_BASE
- Social Support → SADQ
- Basic Social Support → SADB
- Educational Support → EDUCATIVA

## Current Data Impact

### Giovanni Bianchi
- Has €5,000 allocated to "Home Support Services"
- Will map to: Assistenza domiciliare > HCPB (Basic HCP) with €5,000

### Anna Ferrari  
- Has €10,500 allocated to "Direct Assistance"
- Will map to: Assistenza domiciliare > ASSISTENZA_DIRETTA with €10,500

## Rollback Plan
1. Keep backup of current database
2. Create reverse migration script
3. Test migration on development database first
4. Have ability to restore from backup if needed

## Testing Checklist
- [ ] Budget categories show correctly (2 main categories)
- [ ] Budget types show under correct categories
- [ ] Client allocations preserved with correct amounts
- [ ] Budget configs work with new structure
- [ ] Home Care Planning page functions correctly
- [ ] Budget expense tracking works
- [ ] Excel import mapping works with new structure