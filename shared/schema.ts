import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("staff"), // admin, manager, staff
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clients table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalId: varchar("external_id"), // ID from imported Excel (Aw column)
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  fiscalCode: varchar("fiscal_code"), // Italian tax ID (X column)
  email: varchar("email"),
  phone: varchar("phone"),
  address: text("address"),
  dateOfBirth: timestamp("date_of_birth"),
  serviceType: varchar("service_type").notNull(), // personal-care, home-support, medical-assistance, social-support
  status: varchar("status").notNull().default("active"), // active, inactive, pending
  monthlyBudget: decimal("monthly_budget", { precision: 10, scale: 2 }),
  notes: text("notes"),
  importId: varchar("import_id"), // Initial import that created this record
  lastImportId: varchar("last_import_id"), // Most recent import that modified this record
  importHistory: jsonb("import_history"), // Array of all imports that have touched this record
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Staff table
export const staff = pgTable("staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalId: varchar("external_id"), // ID from imported Excel (Bb column)
  userId: varchar("user_id").references(() => users.id),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  type: varchar("type").notNull().default("external"), // internal (office-based) or external (outside office)
  category: varchar("category"), // Health service category (M column)
  services: text("services"), // Health services (N column)
  weekdayRate: decimal("weekday_rate", { precision: 10, scale: 2 }).notNull().default("15.00"),
  holidayRate: decimal("holiday_rate", { precision: 10, scale: 2 }).notNull().default("20.00"),
  mileageRate: decimal("mileage_rate", { precision: 10, scale: 2 }).notNull().default("0.50"),
  specializations: text("specializations").array(),
  status: varchar("status").notNull().default("active"), // active, inactive
  hireDate: timestamp("hire_date"),
  importId: varchar("import_id"), // Initial import that created this record
  lastImportId: varchar("last_import_id"), // Most recent import that modified this record
  importHistory: jsonb("import_history"), // Array of all imports that have touched this record
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client-Staff assignments table (many-to-many relationship)
export const clientStaffAssignments = pgTable("client_staff_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  staffId: varchar("staff_id").references(() => staff.id).notNull(),
  assignmentType: varchar("assignment_type").notNull().default("primary"), // primary, secondary, temporary
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Budget categories table (high-level categories)
export const budgetCategories = pgTable("budget_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(), // Assistenza domiciliare, Assistenza educativa
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Budget types table (specific budget codes under categories)
export const budgetTypes = pgTable("budget_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").references(() => budgetCategories.id).notNull(),
  code: varchar("code").notNull().unique(), // HCPQ, HCPB, LEGGE162, etc.
  name: varchar("name").notNull(), // Qualified HCP, Basic HCP, Law 162, etc.
  description: text("description"),
  defaultWeekdayRate: decimal("default_weekday_rate", { precision: 10, scale: 2 }).default("15.00"),
  defaultHolidayRate: decimal("default_holiday_rate", { precision: 10, scale: 2 }).default("20.00"),
  defaultKilometerRate: decimal("default_kilometer_rate", { precision: 10, scale: 2 }).default("0.00"),
  canFundMileage: boolean("can_fund_mileage").default(false),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client budget allocations table - links clients to specific budget types with allocated amounts
export const clientBudgetAllocations = pgTable("client_budget_allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  budgetTypeId: varchar("budget_type_id").references(() => budgetTypes.id).notNull(), // Changed from categoryId
  allocatedAmount: decimal("allocated_amount", { precision: 10, scale: 2 }).notNull(),
  usedAmount: decimal("used_amount", { precision: 10, scale: 2 }).default("0"),
  startDate: timestamp("start_date").notNull(), // Budget period start date
  endDate: timestamp("end_date").notNull(), // Budget period end date
  weekdayRate: decimal("weekday_rate", { precision: 10, scale: 2 }), // Manual weekday hourly rate
  holidayRate: decimal("holiday_rate", { precision: 10, scale: 2 }), // Manual holiday hourly rate
  kilometerRate: decimal("kilometer_rate", { precision: 10, scale: 2 }), // Manual kilometer rate (only for LEGGE162, RAC, ASSISTENZA DIRETTA)
  status: varchar("status").notNull().default("active"), // active, expired, upcoming
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Budget expenses table - tracks actual spending
export const budgetExpenses = pgTable("budget_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  budgetTypeId: varchar("budget_type_id").references(() => budgetTypes.id).notNull(), // Changed from categoryId
  allocationId: varchar("allocation_id").references(() => clientBudgetAllocations.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  expenseDate: timestamp("expense_date").notNull(),
  timeLogId: varchar("time_log_id").references(() => timeLogs.id), // Link to time log if applicable
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Time logs table - enhanced to include scheduled times and mileage for compensation
export const timeLogs = pgTable("time_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  staffId: varchar("staff_id").references(() => staff.id).notNull(),
  serviceDate: timestamp("service_date").notNull(),
  scheduledStartTime: timestamp("scheduled_start_time"), // Column C from Excel
  scheduledEndTime: timestamp("scheduled_end_time"), // Column D from Excel
  actualStartTime: timestamp("actual_start_time"), // For future use
  actualEndTime: timestamp("actual_end_time"), // For future use
  hours: decimal("hours", { precision: 4, scale: 2 }).notNull(),
  serviceType: varchar("service_type").notNull(),
  serviceLocation: text("service_location"), // For mileage calculation
  mileage: decimal("mileage", { precision: 10, scale: 2 }), // Distance traveled for this service
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  budgetAllocationId: varchar("budget_allocation_id").references(() => clientBudgetAllocations.id), // Link to budget allocation used for rates
  compensationId: varchar("compensation_id").references(() => staffCompensations.id), // Link to compensation record
  excelDataId: varchar("excel_data_id").references(() => excelData.id), // Link to imported Excel row
  externalIdentifier: varchar("external_identifier"), // Store the identifier from Excel for duplicate detection
  importId: varchar("import_id"), // Track which import batch this came from
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client budget configuration table - stores the 10 mandatory budgets with rates
export const clientBudgetConfigs = pgTable("client_budget_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  budgetTypeId: varchar("budget_type_id").references(() => budgetTypes.id).notNull(), // Reference to budget type
  validFrom: timestamp("valid_from").notNull(),
  validTo: timestamp("valid_to").notNull(),
  weekdayRate: decimal("weekday_rate", { precision: 10, scale: 2 }).notNull(),
  holidayRate: decimal("holiday_rate", { precision: 10, scale: 2 }).notNull(),
  kilometerRate: decimal("kilometer_rate", { precision: 10, scale: 2 }).notNull().default("0.00"),
  availableBalance: decimal("available_balance", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const clientRelations = relations(clients, ({ many }) => ({
  timeLogs: many(timeLogs),
  budgetAllocations: many(clientBudgetAllocations),
  budgetExpenses: many(budgetExpenses),
  staffAssignments: many(clientStaffAssignments),
}));

export const staffRelations = relations(staff, ({ one, many }) => ({
  user: one(users, { fields: [staff.userId], references: [users.id] }),
  timeLogs: many(timeLogs),
  clientAssignments: many(clientStaffAssignments),
  compensations: many(staffCompensations),
}));

export const clientStaffAssignmentRelations = relations(clientStaffAssignments, ({ one }) => ({
  client: one(clients, { fields: [clientStaffAssignments.clientId], references: [clients.id] }),
  staff: one(staff, { fields: [clientStaffAssignments.staffId], references: [staff.id] }),
}));

export const timeLogRelations = relations(timeLogs, ({ one }) => ({
  client: one(clients, { fields: [timeLogs.clientId], references: [clients.id] }),
  staff: one(staff, { fields: [timeLogs.staffId], references: [staff.id] }),
  budgetAllocation: one(clientBudgetAllocations, { fields: [timeLogs.budgetAllocationId], references: [clientBudgetAllocations.id] }),
  compensation: one(staffCompensations, { fields: [timeLogs.compensationId], references: [staffCompensations.id] }),
  excelData: one(excelData, { fields: [timeLogs.excelDataId], references: [excelData.id] }),
}));

export const budgetCategoryRelations = relations(budgetCategories, ({ many }) => ({
  budgetTypes: many(budgetTypes),
}));

export const budgetTypeRelations = relations(budgetTypes, ({ one, many }) => ({
  category: one(budgetCategories, { fields: [budgetTypes.categoryId], references: [budgetCategories.id] }),
  allocations: many(clientBudgetAllocations),
  expenses: many(budgetExpenses),
  configs: many(clientBudgetConfigs),
}));

export const clientBudgetAllocationRelations = relations(clientBudgetAllocations, ({ one, many }) => ({
  client: one(clients, { fields: [clientBudgetAllocations.clientId], references: [clients.id] }),
  budgetType: one(budgetTypes, { fields: [clientBudgetAllocations.budgetTypeId], references: [budgetTypes.id] }),
  expenses: many(budgetExpenses),
}));

export const budgetExpenseRelations = relations(budgetExpenses, ({ one }) => ({
  client: one(clients, { fields: [budgetExpenses.clientId], references: [clients.id] }),
  budgetType: one(budgetTypes, { fields: [budgetExpenses.budgetTypeId], references: [budgetTypes.id] }),
  allocation: one(clientBudgetAllocations, { fields: [budgetExpenses.allocationId], references: [clientBudgetAllocations.id] }),
  timeLog: one(timeLogs, { fields: [budgetExpenses.timeLogId], references: [timeLogs.id] }),
}));

export const clientBudgetConfigRelations = relations(clientBudgetConfigs, ({ one }) => ({
  client: one(clients, { fields: [clientBudgetConfigs.clientId], references: [clients.id] }),
  budgetType: one(budgetTypes, { fields: [clientBudgetConfigs.budgetTypeId], references: [budgetTypes.id] }),
}));

// GDPR Compliance Tables

// User consent records - tracks when users gave consent and for what
export const userConsents = pgTable("user_consents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  consentType: varchar("consent_type").notNull(), // data_processing, marketing, analytics, etc.
  consentGiven: boolean("consent_given").notNull(),
  consentDate: timestamp("consent_date").defaultNow().notNull(),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  privacyPolicyVersion: varchar("privacy_policy_version"),
  revokedDate: timestamp("revoked_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Data access/audit logs - tracks who accessed what data when
export const dataAccessLogs = pgTable("data_access_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  accessedBy: varchar("accessed_by").references(() => users.id).notNull(), // Who accessed the data
  entityType: varchar("entity_type").notNull(), // users, clients, staff, time_logs, etc.
  entityId: varchar("entity_id").notNull(), // ID of the accessed record
  action: varchar("action").notNull(), // read, create, update, delete, export
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  details: jsonb("details"), // Additional context about the access
  createdAt: timestamp("created_at").defaultNow(),
});

// Data export requests - tracks user requests for their data
export const dataExportRequests = pgTable("data_export_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  requestedBy: varchar("requested_by").references(() => users.id).notNull(), // Who made the request (could be user or admin)
  status: varchar("status").notNull().default("pending"), // pending, processing, completed, failed
  exportFormat: varchar("export_format").notNull().default("json"), // json, csv, pdf
  includePersonalData: boolean("include_personal_data").default(true),
  includeServiceData: boolean("include_service_data").default(true),
  includeFinancialData: boolean("include_financial_data").default(false), // Restricted
  filePath: varchar("file_path"), // Path to generated export file
  expiresAt: timestamp("expires_at"), // When the export file expires
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Data retention policies - defines how long different data types should be kept
export const dataRetentionPolicies = pgTable("data_retention_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type").notNull().unique(), // users, clients, staff, time_logs, etc.
  retentionPeriodDays: integer("retention_period_days").notNull(), // Days to keep data
  description: text("description").notNull(),
  isActive: boolean("is_active").default(true),
  lastReviewDate: timestamp("last_review_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Data deletion requests - tracks requests to delete user data
export const dataDeletionRequests = pgTable("data_deletion_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  requestedBy: varchar("requested_by").references(() => users.id).notNull(),
  reason: varchar("reason").notNull(), // user_request, policy_expiry, legal_requirement
  status: varchar("status").notNull().default("pending"), // pending, approved, rejected, completed
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  affectedEntities: jsonb("affected_entities"), // List of data types/tables that will be affected
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Data breach incidents - tracks security incidents
export const dataBreachIncidents = pgTable("data_breach_incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  severity: varchar("severity").notNull(), // low, medium, high, critical
  status: varchar("status").notNull().default("detected"), // detected, investigating, contained, resolved
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  containedAt: timestamp("contained_at"),
  resolvedAt: timestamp("resolved_at"),
  affectedUserCount: integer("affected_user_count").default(0),
  affectedDataTypes: text("affected_data_types").array(), // personal_data, financial_data, health_data
  reportedToAuthority: boolean("reported_to_authority").default(false),
  reportedToAuthorityAt: timestamp("reported_to_authority_at"),
  usersNotified: boolean("users_notified").default(false),
  usersNotifiedAt: timestamp("users_notified_at"),
  rootCause: text("root_cause"),
  actionsTaken: text("actions_taken"),
  preventiveMeasures: text("preventive_measures"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// GDPR Relations
export const userConsentRelations = relations(userConsents, ({ one }) => ({
  user: one(users, { fields: [userConsents.userId], references: [users.id] }),
}));

export const dataAccessLogRelations = relations(dataAccessLogs, ({ one }) => ({
  user: one(users, { fields: [dataAccessLogs.userId], references: [users.id] }),
  accessedBy: one(users, { fields: [dataAccessLogs.accessedBy], references: [users.id] }),
}));

export const dataExportRequestRelations = relations(dataExportRequests, ({ one }) => ({
  user: one(users, { fields: [dataExportRequests.userId], references: [users.id] }),
  requestedBy: one(users, { fields: [dataExportRequests.requestedBy], references: [users.id] }),
}));

export const dataDeletionRequestRelations = relations(dataDeletionRequests, ({ one }) => ({
  user: one(users, { fields: [dataDeletionRequests.userId], references: [users.id] }),
  requestedBy: one(users, { fields: [dataDeletionRequests.requestedBy], references: [users.id] }),
  approvedBy: one(users, { fields: [dataDeletionRequests.approvedBy], references: [users.id] }),
}));

export const dataBreachIncidentRelations = relations(dataBreachIncidents, ({ one }) => ({
  createdBy: one(users, { fields: [dataBreachIncidents.createdBy], references: [users.id] }),
}));

// Document relations will be added at the end to avoid circular reference

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserConsentSchema = createInsertSchema(userConsents).omit({
  id: true,
  consentDate: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDataAccessLogSchema = createInsertSchema(dataAccessLogs).omit({
  id: true,
  createdAt: true,
});

export const insertDataExportRequestSchema = createInsertSchema(dataExportRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDataRetentionPolicySchema = createInsertSchema(dataRetentionPolicies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDataDeletionRequestSchema = createInsertSchema(dataDeletionRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDataBreachIncidentSchema = createInsertSchema(dataBreachIncidents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Document insert schemas moved to end to avoid circular reference

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStaffSchema = createInsertSchema(staff).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientStaffAssignmentSchema = createInsertSchema(clientStaffAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const insertTimeLogSchema = createInsertSchema(timeLogs).omit({
  id: true,
  totalCost: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBudgetCategorySchema = createInsertSchema(budgetCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBudgetTypeSchema = createInsertSchema(budgetTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientBudgetAllocationSchema = createInsertSchema(clientBudgetAllocations).omit({
  id: true,
  usedAmount: true,
  status: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string().datetime(), // Accept ISO datetime strings
  endDate: z.string().datetime(), // Accept ISO datetime strings
});

export const insertBudgetExpenseSchema = createInsertSchema(budgetExpenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  expenseDate: z.string().datetime(), // Accept ISO datetime strings
});

// Service Categories table
export const serviceCategories = pgTable("service_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(), // e.g., "1", "2", etc.
  name: varchar("name").notNull(), // e.g., "Assistenza alla persona feriale"
  description: text("description"),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service Types table
export const serviceTypes = pgTable("service_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").references(() => serviceCategories.id),
  code: varchar("code").notNull(), // e.g., "1"
  name: varchar("name").notNull(), // e.g., "Assistenza alla persona diurno feriale"
  description: text("description"),
  defaultRate: decimal("default_rate", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Home care planning table
export const homeCarePlans = pgTable("home_care_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: varchar("status").notNull().default("draft"), // draft, active, completed, cancelled
  totalBudget: decimal("total_budget", { precision: 10, scale: 2 }).notNull(),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  weeklySchedule: jsonb("weekly_schedule"), // JSON object with days and hours/km
  selectedBudgets: jsonb("selected_budgets"), // Array of selected budget codes
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
});

export const insertClientBudgetConfigSchema = createInsertSchema(clientBudgetConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  validFrom: z.string().datetime(),
  validTo: z.string().datetime(),
});

export const insertHomeCarePlanSchema = createInsertSchema(homeCarePlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export const insertServiceCategorySchema = createInsertSchema(serviceCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceTypeSchema = createInsertSchema(serviceTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Staff = typeof staff.$inferSelect;
export type InsertStaff = z.infer<typeof insertStaffSchema>;
// Extended staff type that includes API-added fields for display purposes
export type StaffWithRates = Staff & {
  displayHourlyRate?: string;
  hasActiveRate?: boolean;
  rateCount?: number;
  activeRate?: {
    id: string;
    weekdayRate: string;
    weekendRate: string;
    holidayRate: string;
    overtimeMultiplier: string;
    mileageRatePerKm: string;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    isActive: boolean;
  } | null;
};
export type ClientStaffAssignment = typeof clientStaffAssignments.$inferSelect;
export type InsertClientStaffAssignment = z.infer<typeof insertClientStaffAssignmentSchema>;
export type TimeLog = typeof timeLogs.$inferSelect;
export type InsertTimeLog = z.infer<typeof insertTimeLogSchema>;
export type BudgetCategory = typeof budgetCategories.$inferSelect;
export type InsertBudgetCategory = z.infer<typeof insertBudgetCategorySchema>;
export type BudgetType = typeof budgetTypes.$inferSelect;
export type InsertBudgetType = z.infer<typeof insertBudgetTypeSchema>;
export type ClientBudgetAllocation = typeof clientBudgetAllocations.$inferSelect;
export type InsertClientBudgetAllocation = z.infer<typeof insertClientBudgetAllocationSchema>;
export type BudgetExpense = typeof budgetExpenses.$inferSelect;
export type InsertBudgetExpense = z.infer<typeof insertBudgetExpenseSchema>;
export type ClientBudgetConfig = typeof clientBudgetConfigs.$inferSelect;
export type InsertClientBudgetConfig = z.infer<typeof insertClientBudgetConfigSchema>;
export type HomeCarePlan = typeof homeCarePlans.$inferSelect;
export type InsertHomeCarePlan = z.infer<typeof insertHomeCarePlanSchema>;
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type InsertServiceCategory = z.infer<typeof insertServiceCategorySchema>;
export type ServiceType = typeof serviceTypes.$inferSelect;
export type InsertServiceType = z.infer<typeof insertServiceTypeSchema>;

// Staff rates table removed - now using budget allocation rates instead

// Staff compensations table - stores calculated compensation records for staff
export const staffCompensations = pgTable("staff_compensations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").references(() => staff.id).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  regularHours: decimal("regular_hours", { precision: 10, scale: 2 }).notNull().default("0"),
  overtimeHours: decimal("overtime_hours", { precision: 10, scale: 2 }).notNull().default("0"),
  weekendHours: decimal("weekend_hours", { precision: 10, scale: 2 }).notNull().default("0"),
  holidayHours: decimal("holiday_hours", { precision: 10, scale: 2 }).notNull().default("0"),
  totalMileage: decimal("total_mileage", { precision: 10, scale: 2 }).notNull().default("0"),
  baseCompensation: decimal("base_compensation", { precision: 10, scale: 2 }).notNull().default("0"),
  overtimeCompensation: decimal("overtime_compensation", { precision: 10, scale: 2 }).notNull().default("0"),
  weekendCompensation: decimal("weekend_compensation", { precision: 10, scale: 2 }).notNull().default("0"),
  holidayCompensation: decimal("holiday_compensation", { precision: 10, scale: 2 }).notNull().default("0"),
  mileageReimbursement: decimal("mileage_reimbursement", { precision: 10, scale: 2 }).notNull().default("0"),
  totalCompensation: decimal("total_compensation", { precision: 10, scale: 2 }).notNull().default("0"),
  status: varchar("status").notNull().default("draft"), // draft, pending_approval, approved, paid
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  paySlipGenerated: boolean("pay_slip_generated").notNull().default(false),
  paySlipUrl: varchar("pay_slip_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Compensation adjustments table - tracks all changes made to compensations for audit trail
export const compensationAdjustments = pgTable("compensation_adjustments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  compensationId: varchar("compensation_id").references(() => staffCompensations.id).notNull(),
  adjustedBy: varchar("adjusted_by").references(() => users.id).notNull(),
  adjustmentType: varchar("adjustment_type").notNull(), // hours, rate, mileage, manual
  fieldName: varchar("field_name").notNull(), // which field was adjusted
  originalValue: decimal("original_value", { precision: 10, scale: 2 }),
  newValue: decimal("new_value", { precision: 10, scale: 2 }),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Compensation budget allocations - tracks which budget allocations are used for compensation payments
export const compensationBudgetAllocations = pgTable("compensation_budget_allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  compensationId: varchar("compensation_id").references(() => staffCompensations.id).notNull(),
  clientBudgetAllocationId: varchar("client_budget_allocation_id").references(() => clientBudgetAllocations.id), // Now nullable for direct client payments
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  budgetTypeId: varchar("budget_type_id").references(() => budgetTypes.id), // Nullable for direct client payments
  timeLogId: varchar("time_log_id").references(() => timeLogs.id), // Reference to specific time log
  allocatedAmount: decimal("allocated_amount", { precision: 10, scale: 2 }).notNull(), // Amount deducted from this budget
  allocatedHours: decimal("allocated_hours", { precision: 10, scale: 2 }).notNull(), // Hours covered by this allocation
  allocationDate: timestamp("allocation_date").notNull().defaultNow(),
  isDirectClientPayment: boolean("is_direct_client_payment").notNull().default(false), // True when client pays directly without budget
  paymentStatus: varchar("payment_status").default("pending"), // pending, paid, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Import audit trail table - tracks all changes made by imports
export const importAuditTrail = pgTable("import_audit_trail", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  importId: varchar("import_id").notNull(), // Which import made this change
  entityType: varchar("entity_type").notNull(), // 'client', 'staff', 'time_log'
  entityId: varchar("entity_id").notNull(), // ID of the affected record
  action: varchar("action").notNull(), // 'created', 'updated', 'skipped', 'error'
  previousData: jsonb("previous_data"), // Previous state before update (for updates)
  newData: jsonb("new_data"), // New state after change
  changeDetails: jsonb("change_details"), // What fields changed
  reason: text("reason"), // Reason for skip or error
  userId: varchar("user_id"), // User who performed the import
  createdAt: timestamp("created_at").defaultNow(),
});

// Excel imports table
export const excelImports = pgTable("excel_imports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: varchar("filename").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  uploadedByUserId: varchar("uploaded_by_user_id").references(() => users.id),
  status: varchar("status").notNull().default("pending"), // pending, processing, completed, failed
  totalRows: varchar("total_rows"),
  processedRows: varchar("processed_rows"),
  errorLog: text("error_log"),
  syncStatus: varchar("sync_status").notNull().default("not_synced"), // not_synced, synced, sync_partial
  syncedAt: timestamp("synced_at"),
  syncedClientsCount: integer("synced_clients_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Excel data table - all 57 columns as strings
export const excelData = pgTable("excel_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  importId: varchar("import_id").references(() => excelImports.id),
  rowNumber: varchar("row_number").notNull(),
  // Service details
  department: varchar("department"),
  recordedStart: varchar("recorded_start"),
  recordedEnd: varchar("recorded_end"),
  scheduledStart: varchar("scheduled_start"),
  scheduledEnd: varchar("scheduled_end"),
  duration: varchar("duration"),
  nominalDuration: varchar("nominal_duration"),
  kilometers: varchar("kilometers"),
  calculatedKilometers: varchar("calculated_kilometers"),
  value: varchar("value"),
  notes: text("notes"),
  // Service classification
  appointmentType: varchar("appointment_type"),
  serviceCategory: varchar("service_category"),
  serviceType: varchar("service_type"),
  cost1: varchar("cost_1"),
  cost2: varchar("cost_2"),
  cost3: varchar("cost_3"),
  categoryType: varchar("category_type"),
  aggregation: varchar("aggregation"),
  // Assisted person information
  assistedPersonFirstName: varchar("assisted_person_first_name"),
  assistedPersonLastName: varchar("assisted_person_last_name"),
  recordNumber: varchar("record_number"),
  dateOfBirth: varchar("date_of_birth"),
  taxCode: varchar("tax_code"),
  primaryPhone: varchar("primary_phone"),
  secondaryPhone: varchar("secondary_phone"),
  mobilePhone: varchar("mobile_phone"),
  phoneNotes: text("phone_notes"),
  homeAddress: text("home_address"),
  cityOfResidence: varchar("city_of_residence"),
  regionOfResidence: varchar("region_of_residence"),
  area: varchar("area"),
  agreement: varchar("agreement"),
  // Personnel information
  operatorFirstName: varchar("operator_first_name"),
  operatorLastName: varchar("operator_last_name"),
  requesterFirstName: varchar("requester_first_name"),
  requesterLastName: varchar("requester_last_name"),
  // Additional fields
  authorized: varchar("authorized"),
  modifiedAfterRegistration: varchar("modified_after_registration"),
  validTag: varchar("valid_tag"),
  identifier: varchar("identifier"),
  // ID fields
  departmentId: varchar("department_id"),
  appointmentTypeId: varchar("appointment_type_id"),
  serviceId: varchar("service_id"),
  serviceTypeId: varchar("service_type_id"),
  categoryId: varchar("category_id"),
  categoryTypeId: varchar("category_type_id"),
  aggregationId: varchar("aggregation_id"),
  assistedPersonId: varchar("assisted_person_id"),
  municipalityId: varchar("municipality_id"),
  regionId: varchar("region_id"),
  areaId: varchar("area_id"),
  agreementId: varchar("agreement_id"),
  operatorId: varchar("operator_id"),
  requesterId: varchar("requester_id"),
  assistanceId: varchar("assistance_id"),
  // Final fields
  ticketExemption: varchar("ticket_exemption"),
  registrationNumber: varchar("registration_number"),
  xmpiCode: varchar("xmpi_code"),
  travelDuration: varchar("travel_duration"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Documents table - GDPR compliant document storage
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: varchar("file_name").notNull(),
  originalName: varchar("original_name").notNull(),
  mimeType: varchar("mime_type").notNull(),
  fileSize: integer("file_size").notNull(), // Size in bytes
  storagePath: varchar("storage_path").notNull(), // Path in Replit Object Storage
  category: varchar("category").notNull(), // client_documents, staff_documents, reports, backups
  entityType: varchar("entity_type"), // clients, staff, users
  entityId: varchar("entity_id"), // Reference to client/staff/user ID
  isEncrypted: boolean("is_encrypted").default(true),
  encryptionKeyId: varchar("encryption_key_id"), // Reference to encryption key
  accessLevel: varchar("access_level").notNull().default("private"), // public, private, confidential, restricted
  tags: text("tags").array(), // Searchable tags
  description: text("description"),
  version: integer("version").default(1),
  parentDocumentId: varchar("parent_document_id"),
  isLatestVersion: boolean("is_latest_version").default(true),
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  lastAccessedAt: timestamp("last_accessed_at"),
  lastAccessedBy: varchar("last_accessed_by").references(() => users.id),
  retentionPolicyId: varchar("retention_policy_id").references(() => dataRetentionPolicies.id),
  scheduledDeletionAt: timestamp("scheduled_deletion_at"), // Auto-deletion date based on retention policy
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  deletedBy: varchar("deleted_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document access logs - tracks who accessed which documents for GDPR audit compliance
export const documentAccessLogs = pgTable("document_access_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => documents.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  action: varchar("action").notNull(), // view, download, upload, delete, share, modify
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  accessedAt: timestamp("accessed_at").defaultNow(),
  details: jsonb("details"), // Additional context about the access
});

// Document permissions - role-based access control for documents
export const documentPermissions = pgTable("document_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => documents.id).notNull(),
  entityType: varchar("entity_type").notNull(), // user, role, group
  entityId: varchar("entity_id").notNull(), // user ID or role name
  permission: varchar("permission").notNull(), // read, write, delete, admin
  grantedBy: varchar("granted_by").references(() => users.id).notNull(),
  grantedAt: timestamp("granted_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
});

// Calendar appointments table - manages care service appointments and scheduling
export const calendarAppointments = pgTable("calendar_appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  staffId: varchar("staff_id").references(() => staff.id).notNull(),
  serviceType: varchar("service_type").notNull(),
  startDateTime: timestamp("start_date_time").notNull(),
  endDateTime: timestamp("end_date_time").notNull(),
  status: varchar("status").notNull().default("scheduled"), // scheduled, in_progress, completed, cancelled
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document retention schedules - automated retention policy execution for GDPR compliance
export const documentRetentionSchedules = pgTable("document_retention_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => documents.id).notNull(),
  retentionPolicyId: varchar("retention_policy_id").references(() => dataRetentionPolicies.id).notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  status: varchar("status").notNull().default("scheduled"), // scheduled, processing, completed, failed
  executedAt: timestamp("executed_at"),
  executedBy: varchar("executed_by").references(() => users.id),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for Excel imports
export const excelImportsRelations = relations(excelImports, ({ one, many }) => ({
  uploadedBy: one(users, { fields: [excelImports.uploadedByUserId], references: [users.id] }),
  data: many(excelData),
}));

export const excelDataRelations = relations(excelData, ({ one }) => ({
  import: one(excelImports, { fields: [excelData.importId], references: [excelImports.id] }),
}));

// Staff compensation relations (staffRates removed - now using budget allocation rates)

export const staffCompensationRelations = relations(staffCompensations, ({ one, many }) => ({
  staff: one(staff, { fields: [staffCompensations.staffId], references: [staff.id] }),
  approvedByUser: one(users, { fields: [staffCompensations.approvedBy], references: [users.id] }),
  adjustments: many(compensationAdjustments),
  timeLogs: many(timeLogs),
}));

export const compensationAdjustmentRelations = relations(compensationAdjustments, ({ one }) => ({
  compensation: one(staffCompensations, { fields: [compensationAdjustments.compensationId], references: [staffCompensations.id] }),
  adjustedByUser: one(users, { fields: [compensationAdjustments.adjustedBy], references: [users.id] }),
}));

export const compensationBudgetAllocationRelations = relations(compensationBudgetAllocations, ({ one }) => ({
  compensation: one(staffCompensations, { fields: [compensationBudgetAllocations.compensationId], references: [staffCompensations.id] }),
  clientBudgetAllocation: one(clientBudgetAllocations, { fields: [compensationBudgetAllocations.clientBudgetAllocationId], references: [clientBudgetAllocations.id] }),
  client: one(clients, { fields: [compensationBudgetAllocations.clientId], references: [clients.id] }),
  budgetType: one(budgetTypes, { fields: [compensationBudgetAllocations.budgetTypeId], references: [budgetTypes.id] }),
  timeLog: one(timeLogs, { fields: [compensationBudgetAllocations.timeLogId], references: [timeLogs.id] }),
}));

// Insert schemas for Excel imports
export const insertExcelImportSchema = createInsertSchema(excelImports).omit({
  id: true,
  uploadedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExcelDataSchema = createInsertSchema(excelData).omit({
  id: true,
  createdAt: true,
});

// Types for Import Audit Trail
export type ImportAuditTrail = typeof importAuditTrail.$inferSelect;
export type InsertImportAuditTrail = {
  importId: string;
  entityType: string;
  entityId: string;
  action: string;
  previousData?: any;
  newData?: any;
  changeDetails?: any;
  reason?: string;
  userId?: string;
};

// Types for Excel imports
export type ExcelImport = typeof excelImports.$inferSelect;
export type InsertExcelImport = z.infer<typeof insertExcelImportSchema>;
export type ExcelData = typeof excelData.$inferSelect;
export type InsertExcelData = z.infer<typeof insertExcelDataSchema>;

// Insert schemas for compensation tables
// staffRates insert schema removed - now using budget allocation rates

export const insertStaffCompensationSchema = createInsertSchema(staffCompensations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  approvedAt: z.string().datetime().optional(),
  paidAt: z.string().datetime().optional(),
});

export const insertCompensationAdjustmentSchema = createInsertSchema(compensationAdjustments).omit({
  id: true,
  createdAt: true,
});

export const insertCompensationBudgetAllocationSchema = createInsertSchema(compensationBudgetAllocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  allocationDate: z.string().datetime(),
});

// Types for compensation tables
// StaffRate types removed - now using budget allocation rates
export type StaffCompensation = typeof staffCompensations.$inferSelect;
export type InsertStaffCompensation = z.infer<typeof insertStaffCompensationSchema>;
export type CompensationAdjustment = typeof compensationAdjustments.$inferSelect;
export type InsertCompensationAdjustment = z.infer<typeof insertCompensationAdjustmentSchema>;
export type CompensationBudgetAllocation = typeof compensationBudgetAllocations.$inferSelect;
export type InsertCompensationBudgetAllocation = z.infer<typeof insertCompensationBudgetAllocationSchema>;

// Mileage tracking tables
export const mileageLogs = pgTable("mileage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").references(() => staff.id).notNull(),
  clientId: varchar("client_id").references(() => clients.id),
  date: timestamp("date").notNull(),
  startLocation: varchar("start_location").notNull(),
  endLocation: varchar("end_location").notNull(),
  distance: decimal("distance", { precision: 10, scale: 2 }).notNull(), // in kilometers
  purpose: varchar("purpose").notNull(),
  ratePerKm: decimal("rate_per_km", { precision: 10, scale: 2 }).notNull(),
  totalReimbursement: decimal("total_reimbursement", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").notNull().default("pending"), // pending, approved, rejected, disputed
  notes: text("notes"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mileage disputes table
export const mileageDisputes = pgTable("mileage_disputes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mileageLogId: varchar("mileage_log_id").references(() => mileageLogs.id).notNull(),
  raisedBy: varchar("raised_by").references(() => users.id).notNull(),
  reason: text("reason").notNull(),
  proposedDistance: decimal("proposed_distance", { precision: 10, scale: 2 }),
  proposedRate: decimal("proposed_rate", { precision: 10, scale: 2 }),
  status: varchar("status").notNull().default("open"), // open, resolved, rejected
  resolution: text("resolution"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mileage relations
export const mileageLogRelations = relations(mileageLogs, ({ one, many }) => ({
  staff: one(staff, { fields: [mileageLogs.staffId], references: [staff.id] }),
  client: one(clients, { fields: [mileageLogs.clientId], references: [clients.id] }),
  approvedByUser: one(users, { fields: [mileageLogs.approvedBy], references: [users.id] }),
  disputes: many(mileageDisputes),
}));

export const mileageDisputeRelations = relations(mileageDisputes, ({ one }) => ({
  mileageLog: one(mileageLogs, { fields: [mileageDisputes.mileageLogId], references: [mileageLogs.id] }),
  raisedByUser: one(users, { fields: [mileageDisputes.raisedBy], references: [users.id] }),
  resolvedByUser: one(users, { fields: [mileageDisputes.resolvedBy], references: [users.id] }),
}));

// Insert schemas for mileage tracking
export const insertMileageLogSchema = createInsertSchema(mileageLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
}).extend({
  date: z.string().datetime(),
});

export const insertMileageDisputeSchema = createInsertSchema(mileageDisputes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
});

// Types for mileage tracking
export type MileageLog = typeof mileageLogs.$inferSelect;
export type InsertMileageLog = z.infer<typeof insertMileageLogSchema>;
export type MileageDispute = typeof mileageDisputes.$inferSelect;
export type InsertMileageDispute = z.infer<typeof insertMileageDisputeSchema>;

// GDPR Types
export type UserConsent = typeof userConsents.$inferSelect;
export type InsertUserConsent = z.infer<typeof insertUserConsentSchema>;
export type DataAccessLog = typeof dataAccessLogs.$inferSelect;
export type InsertDataAccessLog = z.infer<typeof insertDataAccessLogSchema>;
export type DataExportRequest = typeof dataExportRequests.$inferSelect;
export type InsertDataExportRequest = z.infer<typeof insertDataExportRequestSchema>;
export type DataRetentionPolicy = typeof dataRetentionPolicies.$inferSelect;
export type InsertDataRetentionPolicy = z.infer<typeof insertDataRetentionPolicySchema>;
export type DataDeletionRequest = typeof dataDeletionRequests.$inferSelect;
export type InsertDataDeletionRequest = z.infer<typeof insertDataDeletionRequestSchema>;
export type DataBreachIncident = typeof dataBreachIncidents.$inferSelect;
export type InsertDataBreachIncident = z.infer<typeof insertDataBreachIncidentSchema>;

// Document relations (added at end to avoid circular reference)
export const documentRelations = relations(documents, ({ one, many }) => ({
  uploadedBy: one(users, { fields: [documents.uploadedBy], references: [users.id] }),
  lastAccessedBy: one(users, { fields: [documents.lastAccessedBy], references: [users.id] }),
  deletedBy: one(users, { fields: [documents.deletedBy], references: [users.id] }),
  retentionPolicy: one(dataRetentionPolicies, { fields: [documents.retentionPolicyId], references: [dataRetentionPolicies.id] }),
  accessLogs: many(documentAccessLogs),
  permissions: many(documentPermissions),
  retentionSchedules: many(documentRetentionSchedules),
}));

export const documentAccessLogRelations = relations(documentAccessLogs, ({ one }) => ({
  document: one(documents, { fields: [documentAccessLogs.documentId], references: [documents.id] }),
  user: one(users, { fields: [documentAccessLogs.userId], references: [users.id] }),
}));

export const documentPermissionRelations = relations(documentPermissions, ({ one }) => ({
  document: one(documents, { fields: [documentPermissions.documentId], references: [documents.id] }),
  grantedBy: one(users, { fields: [documentPermissions.grantedBy], references: [users.id] }),
}));

export const documentRetentionScheduleRelations = relations(documentRetentionSchedules, ({ one }) => ({
  document: one(documents, { fields: [documentRetentionSchedules.documentId], references: [documents.id] }),
  retentionPolicy: one(dataRetentionPolicies, { fields: [documentRetentionSchedules.retentionPolicyId], references: [dataRetentionPolicies.id] }),
  executedBy: one(users, { fields: [documentRetentionSchedules.executedBy], references: [users.id] }),
}));

// Document insert schemas (added at end to avoid circular reference)
export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  scheduledDeletionAt: z.string().datetime().optional(),
  deletedAt: z.string().datetime().optional(),
});

export const insertDocumentAccessLogSchema = createInsertSchema(documentAccessLogs).omit({
  id: true,
  accessedAt: true,
});

export const insertDocumentPermissionSchema = createInsertSchema(documentPermissions).omit({
  id: true,
  grantedAt: true,
}).extend({
  expiresAt: z.string().datetime().optional(),
});

export const insertDocumentRetentionScheduleSchema = createInsertSchema(documentRetentionSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  scheduledDate: z.string().datetime(),
  executedAt: z.string().datetime().optional(),
});

// Document types (added at end to avoid circular reference)
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type DocumentAccessLog = typeof documentAccessLogs.$inferSelect;
export type InsertDocumentAccessLog = z.infer<typeof insertDocumentAccessLogSchema>;
export type DocumentPermission = typeof documentPermissions.$inferSelect;
export type InsertDocumentPermission = z.infer<typeof insertDocumentPermissionSchema>;
export type DocumentRetentionSchedule = typeof documentRetentionSchedules.$inferSelect;
export type InsertDocumentRetentionSchedule = z.infer<typeof insertDocumentRetentionScheduleSchema>;

// Calendar appointments relations
export const calendarAppointmentRelations = relations(calendarAppointments, ({ one }) => ({
  client: one(clients, { fields: [calendarAppointments.clientId], references: [clients.id] }),
  staff: one(staff, { fields: [calendarAppointments.staffId], references: [staff.id] }),
  createdBy: one(users, { fields: [calendarAppointments.createdBy], references: [users.id] }),
}));

// Calendar appointments insert schema
export const insertCalendarAppointmentSchema = createInsertSchema(calendarAppointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDateTime: z.string().datetime(),
  endDateTime: z.string().datetime(),
});

// Calendar appointments types
export type CalendarAppointment = typeof calendarAppointments.$inferSelect;
export type InsertCalendarAppointment = z.infer<typeof insertCalendarAppointmentSchema>;
