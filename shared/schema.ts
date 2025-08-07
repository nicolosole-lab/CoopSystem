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
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  specializations: text("specializations").array(),
  status: varchar("status").notNull().default("active"), // active, inactive
  hireDate: timestamp("hire_date"),
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
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
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

// Time logs table
export const timeLogs = pgTable("time_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  staffId: varchar("staff_id").references(() => staff.id).notNull(),
  serviceDate: timestamp("service_date").notNull(),
  hours: decimal("hours", { precision: 4, scale: 2 }).notNull(),
  serviceType: varchar("service_type").notNull(),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
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
}));

export const clientStaffAssignmentRelations = relations(clientStaffAssignments, ({ one }) => ({
  client: one(clients, { fields: [clientStaffAssignments.clientId], references: [clients.id] }),
  staff: one(staff, { fields: [clientStaffAssignments.staffId], references: [staff.id] }),
}));

export const timeLogRelations = relations(timeLogs, ({ one }) => ({
  client: one(clients, { fields: [timeLogs.clientId], references: [clients.id] }),
  staff: one(staff, { fields: [timeLogs.staffId], references: [staff.id] }),
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

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
  createdAt: true,
  updatedAt: true,
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

// Relations for Excel imports
export const excelImportsRelations = relations(excelImports, ({ one, many }) => ({
  uploadedBy: one(users, { fields: [excelImports.uploadedByUserId], references: [users.id] }),
  data: many(excelData),
}));

export const excelDataRelations = relations(excelData, ({ one }) => ({
  import: one(excelImports, { fields: [excelData.importId], references: [excelImports.id] }),
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

// Types for Excel imports
export type ExcelImport = typeof excelImports.$inferSelect;
export type InsertExcelImport = z.infer<typeof insertExcelImportSchema>;
export type ExcelData = typeof excelData.$inferSelect;
export type InsertExcelData = z.infer<typeof insertExcelDataSchema>;
