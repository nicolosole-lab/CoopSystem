-- Healthcare Service Management Platform - Database Cleanup and Seed Script
-- This script cleans transactional data while preserving system configuration

-- ============================================================================
-- STEP 1: Clean transactional data (preserve system configuration)
-- ============================================================================

-- Clean in correct order due to foreign key constraints
DELETE FROM data_export_requests;
DELETE FROM budget_expenses;
DELETE FROM time_logs;
DELETE FROM client_budget_allocations;
DELETE FROM client_budget_configs;
DELETE FROM client_staff_assignments;
DELETE FROM clients;
DELETE FROM staff;

-- ============================================================================
-- STEP 2: Insert comprehensive seed data
-- ============================================================================

-- Sample Clients (Italian healthcare clients)
INSERT INTO clients (id, first_name, last_name, fiscal_code, email, phone, address, service_type, status, monthly_budget, notes) VALUES
('client-mario-rossi', 'Mario', 'Rossi', 'RSSMRA85M15F205X', 'mario.rossi@email.com', '+39 334 123 4567', 'Via Roma 123, 07026 Olbia (SS)', 'personal-care', 'active', '1200.00', 'Cliente anziano con necessità di assistenza personale quotidiana'),
('client-anna-bianchi', 'Anna', 'Bianchi', 'BNCNNA78F52F205W', 'anna.bianchi@email.com', '+39 347 987 6543', 'Corso Umberto 45, 07026 Olbia (SS)', 'home-support', 'active', '800.00', 'Assistenza domestica e accompagnamento per visite mediche'),
('client-giuseppe-verdi', 'Giuseppe', 'Verdi', 'VRDGPP90H25F205Z', 'giuseppe.verdi@email.com', '+39 328 456 7890', 'Via Garibaldi 67, 07026 Olbia (SS)', 'medical-assistance', 'active', '1500.00', 'Paziente con disabilità, necessita assistenza sanitaria specializzata'),
('client-lucia-ferrari', 'Lucia', 'Ferrari', 'FRRLCU65D45F205Y', 'lucia.ferrari@email.com', '+39 339 234 5678', 'Piazza Matteotti 12, 07026 Olbia (SS)', 'social-support', 'active', '600.00', 'Supporto sociale e assistenza per pratiche amministrative'),
('client-francesco-conti', 'Francesco', 'Conti', 'CNTFNC82L10F205V', 'francesco.conti@email.com', '+39 349 876 5432', 'Via Sardegna 89, 07026 Olbia (SS)', 'personal-care', 'inactive', '900.00', 'Cliente temporaneamente sospeso per trasferimento');

-- Sample Staff Members (Healthcare professionals)
INSERT INTO staff (id, first_name, last_name, email, phone, type, category, services, hourly_rate, specializations, status, hire_date) VALUES
('staff-maria-santos', 'Maria', 'Santos', 'maria.santos@healthcare.com', '+39 333 111 2222', 'external', 'Assistenza alla persona', 'Cura personale, igiene, mobilizzazione', '15.00', '{"Assistenza anziani", "Cura igiene personale", "Mobilizzazione"}', 'active', '2023-03-15'),
('staff-luca-marino', 'Luca', 'Marino', 'luca.marino@healthcare.com', '+39 334 222 3333', 'external', 'Assistenza domestica', 'Pulizie, spesa, preparazione pasti', '12.00', '{"Assistenza domestica", "Preparazione pasti", "Spesa e commissioni"}', 'active', '2023-06-20'),
('staff-elena-greco', 'Elena', 'Greco', 'elena.greco@healthcare.com', '+39 335 333 4444', 'internal', 'Assistenza sanitaria', 'Assistenza infermieristica, terapia riabilitativa', '25.00', '{"Infermieristica", "Riabilitazione", "Assistenza post-operatoria"}', 'active', '2022-09-10'),
('staff-antonio-ricci', 'Antonio', 'Ricci', 'antonio.ricci@healthcare.com', '+39 336 444 5555', 'external', 'Trasporto e accompagnamento', 'Trasporto per visite mediche, accompagnamento', '14.00', '{"Autista sanitario", "Accompagnamento pazienti"}', 'active', '2023-01-08'),
('staff-sara-lombardi', 'Sara', 'Lombardi', 'sara.lombardi@healthcare.com', '+39 337 555 6666', 'internal', 'Attività amministrativa', 'Gestione pratiche, supporto burocratico', '18.00', '{"Amministrazione", "Gestione pratiche INPS", "Supporto famiglie"}', 'active', '2023-04-12');

-- Client-Staff Assignments
INSERT INTO client_staff_assignments (id, client_id, staff_id, assignment_type, start_date, notes, is_active) VALUES
('assign-mario-maria', 'client-mario-rossi', 'staff-maria-santos', 'primary', '2024-01-15', 'Assistenza personale quotidiana mattutina', true),
('assign-anna-luca', 'client-anna-bianchi', 'staff-luca-marino', 'primary', '2024-02-01', 'Assistenza domestica 3 volte a settimana', true),
('assign-giuseppe-elena', 'client-giuseppe-verdi', 'staff-elena-greco', 'primary', '2024-01-10', 'Assistenza sanitaria specializzata quotidiana', true),
('assign-lucia-sara', 'client-lucia-ferrari', 'staff-sara-lombardi', 'primary', '2024-03-01', 'Supporto per pratiche amministrative', true),
('assign-mario-antonio', 'client-mario-rossi', 'staff-antonio-ricci', 'secondary', '2024-01-20', 'Trasporto per visite mediche settimanali', true);

-- Client Budget Allocations
INSERT INTO client_budget_allocations (id, client_id, budget_type_id, total_amount, used_amount, start_date, end_date, notes) VALUES
('budget-mario-hcpq', 'client-mario-rossi', 'type-hcpq', '1200.00', '300.00', '2024-01-01', '2024-12-31', 'Budget annuale per assistenza domiciliare qualificata'),
('budget-anna-hcpb', 'client-anna-bianchi', 'type-hcpb', '800.00', '150.00', '2024-02-01', '2024-12-31', 'Budget per assistenza domiciliare base'),
('budget-giuseppe-legge162', 'client-giuseppe-verdi', 'type-legge162', '1500.00', '450.00', '2024-01-01', '2024-12-31', 'Sostegno per disabilità grave secondo Legge 162'),
('budget-lucia-rac', 'client-lucia-ferrari', 'type-rac', '600.00', '120.00', '2024-03-01', '2024-12-31', 'Sostegno economico per autonomia personale');

-- Sample Time Logs for November 2024 (Historical data)
-- Maria Santos working with Mario Rossi (weekdays only)
INSERT INTO time_logs (id, staff_id, client_id, service_date, start_date_time, end_date_time, hours_worked, hourly_rate, total_amount, service_type, description, is_holiday, status)
SELECT 
    'log-maria-mario-' || day,
    'staff-maria-santos',
    'client-mario-rossi',
    date('2024-11-01') + (day - 1) * interval '1 day',
    date('2024-11-01') + (day - 1) * interval '1 day' + time '08:00:00',
    date('2024-11-01') + (day - 1) * interval '1 day' + time '12:00:00',
    '4.00',
    '15.00',
    '60.00',
    'personal-care',
    'Assistenza personale mattutina',
    false,
    'approved'
FROM generate_series(1, 30) AS day
WHERE extract(dow from date('2024-11-01') + (day - 1) * interval '1 day') NOT IN (0, 6); -- Skip Sundays and Saturdays for this client

-- Add some weekend entries with holiday rates
INSERT INTO time_logs (id, staff_id, client_id, service_date, start_date_time, end_date_time, hours_worked, hourly_rate, total_amount, service_type, description, is_holiday, status) VALUES
('log-maria-mario-holiday1', 'staff-maria-santos', 'client-mario-rossi', '2024-11-10', '2024-11-10 09:00:00', '2024-11-10 13:00:00', '4.00', '20.00', '80.00', 'personal-care', 'Assistenza personale domenicale', true, 'approved'),
('log-maria-mario-holiday2', 'staff-maria-santos', 'client-mario-rossi', '2024-11-17', '2024-11-17 09:00:00', '2024-11-17 13:00:00', '4.00', '20.00', '80.00', 'personal-care', 'Assistenza personale domenicale', true, 'approved');

-- Add some logs for other staff members
INSERT INTO time_logs (id, staff_id, client_id, service_date, start_date_time, end_date_time, hours_worked, hourly_rate, total_amount, service_type, description, is_holiday, status) VALUES
('log-luca-anna-1', 'staff-luca-marino', 'client-anna-bianchi', '2024-11-05', '2024-11-05 10:00:00', '2024-11-05 14:00:00', '4.00', '12.00', '48.00', 'home-support', 'Assistenza domestica settimanale', false, 'approved'),
('log-luca-anna-2', 'staff-luca-marino', 'client-anna-bianchi', '2024-11-12', '2024-11-12 10:00:00', '2024-11-12 14:00:00', '4.00', '12.00', '48.00', 'home-support', 'Assistenza domestica settimanale', false, 'approved'),
('log-elena-giuseppe-1', 'staff-elena-greco', 'client-giuseppe-verdi', '2024-11-08', '2024-11-08 14:00:00', '2024-11-08 18:00:00', '4.00', '25.00', '100.00', 'medical-assistance', 'Assistenza sanitaria specializzata', false, 'approved'),
('log-elena-giuseppe-2', 'staff-elena-greco', 'client-giuseppe-verdi', '2024-11-15', '2024-11-15 14:00:00', '2024-11-15 18:00:00', '4.00', '25.00', '100.00', 'medical-assistance', 'Assistenza sanitaria specializzata', false, 'approved');

-- ============================================================================
-- VERIFICATION QUERIES (Uncomment to check results)
-- ============================================================================

-- Check created data summary
SELECT 'Clients' as entity_type, count(*) as count FROM clients
UNION ALL
SELECT 'Staff', count(*) FROM staff
UNION ALL
SELECT 'Assignments', count(*) FROM client_staff_assignments
UNION ALL
SELECT 'Budget Allocations', count(*) FROM client_budget_allocations
UNION ALL
SELECT 'Time Logs', count(*) FROM time_logs;

-- Check system configuration is preserved
SELECT 'Service Categories' as config_type, count(*) as count FROM service_categories
UNION ALL
SELECT 'Budget Categories', count(*) FROM budget_categories  
UNION ALL
SELECT 'Budget Types', count(*) FROM budget_types
UNION ALL
SELECT 'Users', count(*) FROM users;