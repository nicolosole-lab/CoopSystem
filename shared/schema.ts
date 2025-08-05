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
  email: varchar("email").unique(),
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
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
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
  userId: varchar("user_id").references(() => users.id),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  specializations: text("specializations").array(),
  status: varchar("status").notNull().default("active"), // active, inactive
  hireDate: timestamp("hire_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Budget categories table
export const budgetCategories = pgTable("budget_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  isMandatory: boolean("is_mandatory").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Client budget allocations table
export const clientBudgetAllocations = pgTable("client_budget_allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  categoryId: varchar("category_id").references(() => budgetCategories.id).notNull(),
  allocatedAmount: decimal("allocated_amount", { precision: 10, scale: 2 }).notNull(),
  usedAmount: decimal("used_amount", { precision: 10, scale: 2 }).default("0"),
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

// Relations
export const clientRelations = relations(clients, ({ many }) => ({
  timeLogs: many(timeLogs),
  budgetAllocations: many(clientBudgetAllocations),
}));

export const staffRelations = relations(staff, ({ one, many }) => ({
  user: one(users, { fields: [staff.userId], references: [users.id] }),
  timeLogs: many(timeLogs),
}));

export const timeLogRelations = relations(timeLogs, ({ one }) => ({
  client: one(clients, { fields: [timeLogs.clientId], references: [clients.id] }),
  staff: one(staff, { fields: [timeLogs.staffId], references: [staff.id] }),
}));

export const budgetCategoryRelations = relations(budgetCategories, ({ many }) => ({
  allocations: many(clientBudgetAllocations),
}));

export const clientBudgetAllocationRelations = relations(clientBudgetAllocations, ({ one }) => ({
  client: one(clients, { fields: [clientBudgetAllocations.clientId], references: [clients.id] }),
  category: one(budgetCategories, { fields: [clientBudgetAllocations.categoryId], references: [budgetCategories.id] }),
}));

// Insert schemas
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

export const insertTimeLogSchema = createInsertSchema(timeLogs).omit({
  id: true,
  totalCost: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBudgetCategorySchema = createInsertSchema(budgetCategories).omit({
  id: true,
  createdAt: true,
});

export const insertClientBudgetAllocationSchema = createInsertSchema(clientBudgetAllocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Staff = typeof staff.$inferSelect;
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type TimeLog = typeof timeLogs.$inferSelect;
export type InsertTimeLog = z.infer<typeof insertTimeLogSchema>;
export type BudgetCategory = typeof budgetCategories.$inferSelect;
export type InsertBudgetCategory = z.infer<typeof insertBudgetCategorySchema>;
export type ClientBudgetAllocation = typeof clientBudgetAllocations.$inferSelect;
export type InsertClientBudgetAllocation = z.infer<typeof insertClientBudgetAllocationSchema>;
