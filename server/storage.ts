import {
  users,
  clients,
  staff,
  timeLogs,
  budgetCategories,
  budgetTypes,
  clientBudgetAllocations,
  budgetExpenses,
  excelImports,
  excelData,
  homeCarePlans,
  clientBudgetConfigs,
  serviceCategories,
  serviceTypes,
  clientStaffAssignments,
  type User,
  type InsertUser,
  type Client,
  type InsertClient,
  type Staff,
  type InsertStaff,
  type TimeLog,
  type InsertTimeLog,
  type BudgetCategory,
  type InsertBudgetCategory,
  type BudgetType,
  type InsertBudgetType,
  type ClientBudgetAllocation,
  type InsertClientBudgetAllocation,
  type BudgetExpense,
  type InsertBudgetExpense,
  type ExcelImport,
  type InsertExcelImport,
  type ExcelData,
  type InsertExcelData,
  type HomeCarePlan,
  type InsertHomeCarePlan,
  type ClientBudgetConfig,
  type InsertClientBudgetConfig,
  type ClientStaffAssignment,
  type InsertClientStaffAssignment,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, asc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { format } from "date-fns";

export interface IStorage {
  // Session store
  sessionStore: any;
  
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  
  // Client operations
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string): Promise<void>;
  findClientByNameOrEmail(firstName: string, lastName: string, email: string): Promise<Client | undefined>;
  
  // Staff operations
  getStaffMembers(): Promise<Staff[]>;
  getStaffMember(id: string): Promise<Staff | undefined>;
  createStaffMember(staff: InsertStaff): Promise<Staff>;
  updateStaffMember(id: string, staff: Partial<InsertStaff>): Promise<Staff>;
  deleteStaffMember(id: string): Promise<void>;
  
  // Client-Staff assignment operations
  getClientStaffAssignments(clientId: string): Promise<ClientStaffAssignment[]>;
  getStaffClientAssignments(staffId: string): Promise<ClientStaffAssignment[]>;
  createClientStaffAssignment(assignment: InsertClientStaffAssignment): Promise<ClientStaffAssignment>;
  updateClientStaffAssignment(id: string, assignment: Partial<InsertClientStaffAssignment>): Promise<ClientStaffAssignment>;
  deleteClientStaffAssignment(id: string): Promise<void>;
  deleteClientStaffAssignments(clientId: string, staffId: string): Promise<void>;
  getClientsWithStaff(): Promise<(Client & { staffAssignments: (ClientStaffAssignment & { staff: Staff })[] })[]>;
  
  // Time log operations
  getTimeLogs(): Promise<TimeLog[]>;
  getTimeLogsByClient(clientId: string): Promise<TimeLog[]>;
  getTimeLogsByStaff(staffId: string): Promise<TimeLog[]>;
  createTimeLog(timeLog: InsertTimeLog): Promise<TimeLog>;
  updateTimeLog(id: string, timeLog: Partial<InsertTimeLog>): Promise<TimeLog>;
  deleteTimeLog(id: string): Promise<void>;
  
  // Budget category operations
  getBudgetCategories(): Promise<BudgetCategory[]>;
  createBudgetCategory(category: InsertBudgetCategory): Promise<BudgetCategory>;
  
  // Client budget allocation operations
  getClientBudgetAllocations(clientId: string, month?: number, year?: number): Promise<ClientBudgetAllocation[]>;
  getAllClientBudgetAllocations(clientId: string): Promise<ClientBudgetAllocation[]>;
  createClientBudgetAllocation(allocation: InsertClientBudgetAllocation): Promise<ClientBudgetAllocation>;
  updateClientBudgetAllocation(id: string, allocation: Partial<InsertClientBudgetAllocation>): Promise<ClientBudgetAllocation>;
  deleteClientBudgetAllocation(id: string): Promise<void>;
  
  // Budget expense operations
  getBudgetExpenses(clientId?: string, categoryId?: string, month?: number, year?: number): Promise<BudgetExpense[]>;
  createBudgetExpense(expense: InsertBudgetExpense): Promise<BudgetExpense>;
  updateBudgetExpense(id: string, expense: Partial<InsertBudgetExpense>): Promise<BudgetExpense>;
  deleteBudgetExpense(id: string): Promise<void>;
  
  // Budget analysis
  getBudgetAnalysis(clientId: string, month: number, year: number): Promise<{
    categories: Array<{
      category: BudgetCategory;
      allocated: number;
      spent: number;
      remaining: number;
      percentage: number;
    }>;
    totalAllocated: number;
    totalSpent: number;
    totalRemaining: number;
  }>;
  
  // Dashboard metrics
  getDashboardMetrics(): Promise<{
    activeClients: number;
    staffMembers: number;
    monthlyHours: number;
    monthlyRevenue: number;
  }>;
  
  // Data import operations
  getDataImports(): Promise<any[]>;
  createDataImport(importData: any): Promise<any>;
  updateDataImport(id: string, data: any): Promise<any>;
  getExcelDataByImportId(importId: string): Promise<any[]>;
  createExcelDataBatch(dataArray: any[]): Promise<void>;
  getImportSyncStatus(importId: string): Promise<{ status: string; syncedCount: number; totalClients: number }>;
  
  // Home care planning operations
  getHomeCarePlans(): Promise<HomeCarePlan[]>;
  getHomeCarePlan(id: string): Promise<HomeCarePlan | undefined>;
  createHomeCarePlan(plan: InsertHomeCarePlan): Promise<HomeCarePlan>;
  updateHomeCarePlan(id: string, plan: Partial<InsertHomeCarePlan>): Promise<HomeCarePlan>;
  deleteHomeCarePlan(id: string): Promise<void>;
  
  // Client budget configuration operations
  getClientBudgetConfigs(clientId: string): Promise<ClientBudgetConfig[]>;
  getClientBudgetConfig(id: string): Promise<ClientBudgetConfig | undefined>;
  createClientBudgetConfig(config: InsertClientBudgetConfig): Promise<ClientBudgetConfig>;
  updateClientBudgetConfig(id: string, config: Partial<InsertClientBudgetConfig>): Promise<ClientBudgetConfig>;
  deleteClientBudgetConfig(id: string): Promise<void>;
  deleteClientBudgetConfigs(clientId: string): Promise<void>;
  initializeClientBudgets(clientId: string): Promise<void>;
  
  // Excel sync operations
  getExcelSyncPreview(importId: string): Promise<{
    clients: Array<{
      externalId: string;
      firstName: string;
      lastName: string;
      fiscalCode: string | null;
      exists: boolean;
      existingId?: string;
    }>;
    staff: Array<{
      externalId: string;
      firstName: string;
      lastName: string;
      type: string;
      category: string | null;
      services: string | null;
      exists: boolean;
      existingId?: string;
    }>;
  }>;
  syncExcelClients(importId: string, clientIds: string[]): Promise<{ created: number; updated: number; skipped: number }>;
  syncExcelStaff(importId: string, staffIds: string[]): Promise<{ created: number; updated: number; skipped: number }>;
}

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      tableName: 'session', // Explicitly set table name
      createTableIfMissing: false // Keep false to prevent index conflict
    });
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }
  
  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Client operations
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async updateClient(id: string, clientData: Partial<InsertClient>): Promise<Client> {
    const [updatedClient] = await db
      .update(clients)
      .set({ ...clientData, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  async findClientByNameOrEmail(firstName: string, lastName: string, email: string): Promise<Client | undefined> {
    // Check by exact name match first
    if (firstName && lastName) {
      const [clientByName] = await db
        .select()
        .from(clients)
        .where(
          and(
            eq(clients.firstName, firstName),
            eq(clients.lastName, lastName)
          )
        );
      if (clientByName) return clientByName;
    }
    
    // Check by email if provided
    if (email && email.trim() !== '') {
      const [clientByEmail] = await db
        .select()
        .from(clients)
        .where(eq(clients.email, email));
      if (clientByEmail) return clientByEmail;
    }
    
    return undefined;
  }

  // Staff operations
  async getStaffMembers(): Promise<Staff[]> {
    return await db.select().from(staff).orderBy(desc(staff.createdAt));
  }

  async getStaffMember(id: string): Promise<Staff | undefined> {
    const [staffMember] = await db.select().from(staff).where(eq(staff.id, id));
    return staffMember;
  }

  async createStaffMember(staffData: InsertStaff): Promise<Staff> {
    const [newStaff] = await db.insert(staff).values(staffData).returning();
    return newStaff;
  }

  async updateStaffMember(id: string, staffData: Partial<InsertStaff>): Promise<Staff> {
    const [updatedStaff] = await db
      .update(staff)
      .set({ ...staffData, updatedAt: new Date() })
      .where(eq(staff.id, id))
      .returning();
    return updatedStaff;
  }

  async deleteStaffMember(id: string): Promise<void> {
    await db.delete(staff).where(eq(staff.id, id));
  }

  // Client-Staff assignment operations
  async getClientStaffAssignments(clientId: string): Promise<ClientStaffAssignment[]> {
    return await db
      .select()
      .from(clientStaffAssignments)
      .where(and(
        eq(clientStaffAssignments.clientId, clientId),
        eq(clientStaffAssignments.isActive, true)
      ))
      .orderBy(desc(clientStaffAssignments.createdAt));
  }

  async getStaffClientAssignments(staffId: string): Promise<ClientStaffAssignment[]> {
    return await db
      .select()
      .from(clientStaffAssignments)
      .where(and(
        eq(clientStaffAssignments.staffId, staffId),
        eq(clientStaffAssignments.isActive, true)
      ))
      .orderBy(desc(clientStaffAssignments.createdAt));
  }

  async createClientStaffAssignment(assignment: InsertClientStaffAssignment): Promise<ClientStaffAssignment> {
    const assignmentData: any = { ...assignment };
    if (assignment.startDate) {
      assignmentData.startDate = new Date(assignment.startDate);
    }
    if (assignment.endDate) {
      assignmentData.endDate = new Date(assignment.endDate);
    }
    
    const [newAssignment] = await db
      .insert(clientStaffAssignments)
      .values(assignmentData)
      .returning();
    return newAssignment;
  }

  async updateClientStaffAssignment(id: string, assignment: Partial<InsertClientStaffAssignment>): Promise<ClientStaffAssignment> {
    const updateData: any = { ...assignment, updatedAt: new Date() };
    if (assignment.startDate) {
      updateData.startDate = new Date(assignment.startDate);
    }
    if (assignment.endDate) {
      updateData.endDate = new Date(assignment.endDate);
    }
    
    const [updatedAssignment] = await db
      .update(clientStaffAssignments)
      .set(updateData)
      .where(eq(clientStaffAssignments.id, id))
      .returning();
    return updatedAssignment;
  }

  async deleteClientStaffAssignment(id: string): Promise<void> {
    await db.delete(clientStaffAssignments).where(eq(clientStaffAssignments.id, id));
  }

  async deleteClientStaffAssignments(clientId: string, staffId: string): Promise<void> {
    await db
      .delete(clientStaffAssignments)
      .where(and(
        eq(clientStaffAssignments.clientId, clientId),
        eq(clientStaffAssignments.staffId, staffId)
      ));
  }

  async getClientsWithStaff(): Promise<(Client & { staffAssignments: (ClientStaffAssignment & { staff: Staff })[] })[]> {
    // Get all clients
    const allClients = await db.select().from(clients).orderBy(desc(clients.createdAt));
    
    // Get all active assignments with staff info
    const assignmentsWithStaff = await db
      .select({
        assignment: clientStaffAssignments,
        staff: staff
      })
      .from(clientStaffAssignments)
      .innerJoin(staff, eq(clientStaffAssignments.staffId, staff.id))
      .where(eq(clientStaffAssignments.isActive, true));
    
    // Group assignments by client
    const assignmentsByClient = new Map<string, (ClientStaffAssignment & { staff: Staff })[]>();
    assignmentsWithStaff.forEach(({ assignment, staff }) => {
      const clientAssignments = assignmentsByClient.get(assignment.clientId) || [];
      clientAssignments.push({ ...assignment, staff });
      assignmentsByClient.set(assignment.clientId, clientAssignments);
    });
    
    // Combine clients with their assignments
    return allClients.map(client => ({
      ...client,
      staffAssignments: assignmentsByClient.get(client.id) || []
    }));
  }

  // Time log operations
  async getTimeLogs(): Promise<TimeLog[]> {
    return await db.select().from(timeLogs).orderBy(desc(timeLogs.serviceDate));
  }

  async getTimeLogsByClient(clientId: string): Promise<TimeLog[]> {
    return await db
      .select()
      .from(timeLogs)
      .where(eq(timeLogs.clientId, clientId))
      .orderBy(desc(timeLogs.serviceDate));
  }

  async getTimeLogsByStaff(staffId: string): Promise<TimeLog[]> {
    return await db
      .select()
      .from(timeLogs)
      .where(eq(timeLogs.staffId, staffId))
      .orderBy(desc(timeLogs.serviceDate));
  }

  async createTimeLog(timeLogData: InsertTimeLog): Promise<TimeLog> {
    // Get staff hourly rate
    const [staffMember] = await db.select({ hourlyRate: staff.hourlyRate }).from(staff).where(eq(staff.id, timeLogData.staffId));
    if (!staffMember) {
      throw new Error("Staff member not found");
    }

    const totalCost = parseFloat(timeLogData.hours) * parseFloat(staffMember.hourlyRate);

    const [newTimeLog] = await db
      .insert(timeLogs)
      .values({
        ...timeLogData,
        hourlyRate: staffMember.hourlyRate,
        totalCost: totalCost.toString(),
      })
      .returning();

    return newTimeLog;
  }

  async updateTimeLog(id: string, timeLogData: Partial<InsertTimeLog>): Promise<TimeLog> {
    let updateData = { ...timeLogData, updatedAt: new Date() };

    // Recalculate total cost if hours or staff changed
    if (timeLogData.hours || timeLogData.staffId) {
      const [currentLog] = await db.select().from(timeLogs).where(eq(timeLogs.id, id));
      if (!currentLog) {
        throw new Error("Time log not found");
      }

      const staffId = timeLogData.staffId || currentLog.staffId;
      const [staffMember] = await db.select({ hourlyRate: staff.hourlyRate }).from(staff).where(eq(staff.id, staffId));
      if (!staffMember) {
        throw new Error("Staff member not found");
      }

      const hours = timeLogData.hours || currentLog.hours;
      const totalCost = parseFloat(hours) * parseFloat(staffMember.hourlyRate);
      
      updateData = {
        ...updateData,
        hourlyRate: staffMember.hourlyRate,
      };
    }

    const [updatedTimeLog] = await db
      .update(timeLogs)
      .set(updateData)
      .where(eq(timeLogs.id, id))
      .returning();

    return updatedTimeLog;
  }

  async deleteTimeLog(id: string): Promise<void> {
    await db.delete(timeLogs).where(eq(timeLogs.id, id));
  }

  // Budget category operations
  async getBudgetCategories(): Promise<BudgetCategory[]> {
    return await db.select().from(budgetCategories);
  }

  // Budget type operations  
  async getBudgetTypes(): Promise<BudgetType[]> {
    return await db.select().from(budgetTypes).orderBy(budgetTypes.displayOrder);
  }

  async createBudgetCategory(category: InsertBudgetCategory): Promise<BudgetCategory> {
    const [newCategory] = await db.insert(budgetCategories).values(category).returning();
    return newCategory;
  }

  // Client budget allocation operations
  async getClientBudgetAllocations(clientId: string, month?: number, year?: number): Promise<ClientBudgetAllocation[]> {
    const conditions = [eq(clientBudgetAllocations.clientId, clientId)];
    
    if (month !== undefined && year !== undefined) {
      conditions.push(eq(clientBudgetAllocations.month, month));
      conditions.push(eq(clientBudgetAllocations.year, year));
    }
    
    return await db
      .select()
      .from(clientBudgetAllocations)
      .where(and(...conditions));
  }

  async getAllClientBudgetAllocations(clientId: string): Promise<ClientBudgetAllocation[]> {
    return await db
      .select()
      .from(clientBudgetAllocations)
      .where(eq(clientBudgetAllocations.clientId, clientId))
      .orderBy(desc(clientBudgetAllocations.year), desc(clientBudgetAllocations.month));
  }

  async createClientBudgetAllocation(allocation: InsertClientBudgetAllocation): Promise<ClientBudgetAllocation> {
    const [newAllocation] = await db
      .insert(clientBudgetAllocations)
      .values(allocation)
      .returning();
    return newAllocation;
  }

  async updateClientBudgetAllocation(id: string, allocationData: Partial<InsertClientBudgetAllocation>): Promise<ClientBudgetAllocation> {
    const [updatedAllocation] = await db
      .update(clientBudgetAllocations)
      .set({ ...allocationData, updatedAt: new Date() })
      .where(eq(clientBudgetAllocations.id, id))
      .returning();
    return updatedAllocation;
  }

  async deleteClientBudgetAllocation(id: string): Promise<void> {
    await db.delete(clientBudgetAllocations).where(eq(clientBudgetAllocations.id, id));
  }

  // Budget expense operations
  async getBudgetExpenses(clientId?: string, budgetTypeId?: string, month?: number, year?: number): Promise<BudgetExpense[]> {
    const conditions = [];
    if (clientId) conditions.push(eq(budgetExpenses.clientId, clientId));
    if (budgetTypeId) conditions.push(eq(budgetExpenses.budgetTypeId, budgetTypeId));
    if (month !== undefined && year !== undefined) {
      conditions.push(sql`EXTRACT(MONTH FROM ${budgetExpenses.expenseDate}) = ${month}`);
      conditions.push(sql`EXTRACT(YEAR FROM ${budgetExpenses.expenseDate}) = ${year}`);
    }
    
    if (conditions.length > 0) {
      return await db
        .select()
        .from(budgetExpenses)
        .where(and(...conditions))
        .orderBy(desc(budgetExpenses.expenseDate));
    }
    
    return await db
      .select()
      .from(budgetExpenses)
      .orderBy(desc(budgetExpenses.expenseDate));
  }

  async createBudgetExpense(expense: InsertBudgetExpense): Promise<BudgetExpense> {
    // Convert expenseDate string to Date object
    const expenseData = {
      ...expense,
      expenseDate: new Date(expense.expenseDate)
    };
    
    const [newExpense] = await db
      .insert(budgetExpenses)
      .values(expenseData)
      .returning();
    
    // Update the used amount in the corresponding allocation
    if (expense.allocationId) {
      const expenseAmount = parseFloat(expense.amount);
      await db
        .update(clientBudgetAllocations)
        .set({
          usedAmount: sql`${clientBudgetAllocations.usedAmount} + ${expenseAmount}`,
          updatedAt: new Date()
        })
        .where(eq(clientBudgetAllocations.id, expense.allocationId));
    }
    
    return newExpense;
  }

  async updateBudgetExpense(id: string, expenseData: Partial<InsertBudgetExpense>): Promise<BudgetExpense> {
    // Get current expense to adjust allocation amounts
    const [currentExpense] = await db.select().from(budgetExpenses).where(eq(budgetExpenses.id, id));
    if (!currentExpense) {
      throw new Error("Budget expense not found");
    }

    // Convert expenseDate string to Date object if provided
    const updateData: any = {
      ...expenseData,
      updatedAt: new Date()
    };
    if (expenseData.expenseDate) {
      updateData.expenseDate = new Date(expenseData.expenseDate);
    }

    const [updatedExpense] = await db
      .update(budgetExpenses)
      .set(updateData)
      .where(eq(budgetExpenses.id, id))
      .returning();

    // Update allocation amounts if amount or allocation changed
    if (expenseData.amount || expenseData.allocationId) {
      const oldAmount = parseFloat(currentExpense.amount);
      const newAmount = expenseData.amount ? parseFloat(expenseData.amount) : oldAmount;
      const amountDiff = newAmount - oldAmount;

      // If allocation changed, subtract from old and add to new
      if (expenseData.allocationId && expenseData.allocationId !== currentExpense.allocationId) {
        // Subtract full old amount from old allocation
        if (currentExpense.allocationId) {
          await db
            .update(clientBudgetAllocations)
            .set({
              usedAmount: sql`${clientBudgetAllocations.usedAmount} - ${oldAmount}`,
              updatedAt: new Date()
            })
            .where(eq(clientBudgetAllocations.id, currentExpense.allocationId));
        }
        
        // Add full new amount to new allocation
        await db
          .update(clientBudgetAllocations)
          .set({
            usedAmount: sql`${clientBudgetAllocations.usedAmount} + ${newAmount}`,
            updatedAt: new Date()
          })
          .where(eq(clientBudgetAllocations.id, expenseData.allocationId));
      } else if (amountDiff !== 0 && currentExpense.allocationId) {
        // Just update the amount difference
        await db
          .update(clientBudgetAllocations)
          .set({
            usedAmount: sql`${clientBudgetAllocations.usedAmount} + ${amountDiff}`,
            updatedAt: new Date()
          })
          .where(eq(clientBudgetAllocations.id, currentExpense.allocationId));
      }
    }

    return updatedExpense;
  }

  async deleteBudgetExpense(id: string): Promise<void> {
    // Get expense to update allocation
    const [expense] = await db.select().from(budgetExpenses).where(eq(budgetExpenses.id, id));
    if (expense && expense.allocationId) {
      const expenseAmount = parseFloat(expense.amount);
      await db
        .update(clientBudgetAllocations)
        .set({
          usedAmount: sql`${clientBudgetAllocations.usedAmount} - ${expenseAmount}`,
          updatedAt: new Date()
        })
        .where(eq(clientBudgetAllocations.id, expense.allocationId));
    }
    
    await db.delete(budgetExpenses).where(eq(budgetExpenses.id, id));
  }

  // Budget analysis
  async getBudgetAnalysis(clientId: string, month: number, year: number): Promise<{
    budgetTypes: Array<{
      budgetType: BudgetType;
      allocations: Array<{
        id: string;
        allocated: number;
        spent: number;
        remaining: number;
        percentage: number;
      }>;
      totalAllocated: number;
      totalSpent: number;
      totalRemaining: number;
      percentage: number;
    }>;
    totalAllocated: number;
    totalSpent: number;
    totalRemaining: number;
  }> {
    // Get allocations for the specified month/year with budget types
    const allocations = await db
      .select({
        allocation: clientBudgetAllocations,
        budgetType: budgetTypes
      })
      .from(clientBudgetAllocations)
      .innerJoin(budgetTypes, eq(clientBudgetAllocations.budgetTypeId, budgetTypes.id))
      .where(and(
        eq(clientBudgetAllocations.clientId, clientId),
        eq(clientBudgetAllocations.month, month),
        eq(clientBudgetAllocations.year, year)
      ))
      .orderBy(budgetTypes.displayOrder);

    // Get expenses grouped by allocation
    const expensesByAllocation = await db
      .select({
        allocationId: budgetExpenses.allocationId,
        total: sql<number>`SUM(${budgetExpenses.amount})::numeric`
      })
      .from(budgetExpenses)
      .where(and(
        eq(budgetExpenses.clientId, clientId),
        sql`EXTRACT(MONTH FROM ${budgetExpenses.expenseDate}) = ${month}`,
        sql`EXTRACT(YEAR FROM ${budgetExpenses.expenseDate}) = ${year}`
      ))
      .groupBy(budgetExpenses.allocationId);

    const expenseMap = new Map(expensesByAllocation.map(e => [e.allocationId, parseFloat(e.total?.toString() || '0')]));

    // Group allocations by budget type
    const budgetTypeMap = new Map<string, {
      budgetType: BudgetType;
      allocations: Array<{
        id: string;
        allocated: number;
        spent: number;
        remaining: number;
        percentage: number;
      }>;
    }>();

    allocations.forEach(({ allocation, budgetType }) => {
      const allocated = parseFloat(allocation.allocatedAmount);
      const spent = expenseMap.get(allocation.id) || 0;
      const remaining = allocated - spent;
      const percentage = allocated > 0 ? (spent / allocated) * 100 : 0;

      const allocationData = {
        id: allocation.id,
        allocated,
        spent,
        remaining,
        percentage
      };

      if (budgetTypeMap.has(budgetType.id)) {
        budgetTypeMap.get(budgetType.id)!.allocations.push(allocationData);
      } else {
        budgetTypeMap.set(budgetType.id, {
          budgetType,
          allocations: [allocationData]
        });
      }
    });

    // Calculate totals for each budget type
    const budgetTypesList = Array.from(budgetTypeMap.values()).map(({ budgetType, allocations }) => {
      const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated, 0);
      const totalSpent = allocations.reduce((sum, a) => sum + a.spent, 0);
      const totalRemaining = allocations.reduce((sum, a) => sum + a.remaining, 0);
      const percentage = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

      return {
        budgetType,
        allocations,
        totalAllocated,
        totalSpent,
        totalRemaining,
        percentage
      };
    });

    const totals = budgetTypesList.reduce(
      (acc, item) => ({
        totalAllocated: acc.totalAllocated + item.totalAllocated,
        totalSpent: acc.totalSpent + item.totalSpent,
        totalRemaining: acc.totalRemaining + item.totalRemaining
      }),
      { totalAllocated: 0, totalSpent: 0, totalRemaining: 0 }
    );

    return {
      budgetTypes: budgetTypesList,
      ...totals
    };
  }

  // Dashboard metrics
  async getDashboardMetrics(): Promise<{
    activeClients: number;
    staffMembers: number;
    monthlyHours: number;
    monthlyRevenue: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Active clients count
    const [activeClientsResult] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(clients)
      .where(eq(clients.status, "active"));

    // Staff members count
    const [staffMembersResult] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(staff)
      .where(eq(staff.status, "active"));

    // Monthly hours and revenue
    const [monthlyStatsResult] = await db
      .select({
        totalHours: sql<number>`cast(coalesce(sum(${timeLogs.hours}), 0) as decimal)`,
        totalRevenue: sql<number>`cast(coalesce(sum(${timeLogs.totalCost}), 0) as decimal)`,
      })
      .from(timeLogs)
      .where(
        and(
          sql`${timeLogs.serviceDate} >= ${startOfMonth}`,
          sql`${timeLogs.serviceDate} <= ${endOfMonth}`
        )
      );

    return {
      activeClients: activeClientsResult?.count || 0,
      staffMembers: staffMembersResult?.count || 0,
      monthlyHours: Number(monthlyStatsResult?.totalHours) || 0,
      monthlyRevenue: Number(monthlyStatsResult?.totalRevenue) || 0,
    };
  }
  
  // Data import operations
  async getDataImports(): Promise<ExcelImport[]> {
    return await db
      .select()
      .from(excelImports)
      .orderBy(sql`${excelImports.uploadedAt} DESC`);
  }

  async getDataImportById(id: string): Promise<ExcelImport | undefined> {
    const [importRecord] = await db
      .select()
      .from(excelImports)
      .where(eq(excelImports.id, id));
    return importRecord;
  }

  async createDataImport(importData: InsertExcelImport): Promise<ExcelImport> {
    const [newImport] = await db
      .insert(excelImports)
      .values(importData)
      .returning();
    return newImport;
  }

  async updateDataImport(id: string, importData: Partial<InsertExcelImport>): Promise<ExcelImport> {
    const [updated] = await db
      .update(excelImports)
      .set({ ...importData, updatedAt: new Date() })
      .where(eq(excelImports.id, id))
      .returning();
    return updated;
  }

  async createExcelDataBatch(data: InsertExcelData[]): Promise<void> {
    if (data.length === 0) return;
    await db.insert(excelData).values(data);
  }

  async getExcelDataByImportId(importId: string): Promise<ExcelData[]> {
    return await db
      .select()
      .from(excelData)
      .where(eq(excelData.importId, importId))
      .orderBy(sql`CAST(${excelData.rowNumber} AS INTEGER)`);
  }

  async getImportSyncStatus(importId: string): Promise<{ status: string; syncedCount: number; totalClients: number }> {
    // Get unique clients from the import data
    const importData = await this.getExcelDataByImportId(importId);
    const uniqueClients = new Map();
    
    importData.forEach(row => {
      const firstName = row.assistedPersonFirstName?.trim();
      const lastName = row.assistedPersonLastName?.trim();
      
      if (!firstName) return;
      
      const clientKey = `${firstName}_${lastName || ''}`.toLowerCase();
      if (!uniqueClients.has(clientKey)) {
        uniqueClients.set(clientKey, {
          firstName,
          lastName: lastName || '',
        });
      }
    });

    const totalClients = uniqueClients.size;
    if (totalClients === 0) {
      return { status: 'no_clients', syncedCount: 0, totalClients: 0 };
    }

    // Check how many of these clients exist in our clients table
    let syncedCount = 0;
    const clientsArray = Array.from(uniqueClients.values());
    for (const client of clientsArray) {
      const existingClient = await this.findClientByNameOrEmail(
        client.firstName,
        client.lastName,
        '' // No email in import data
      );
      if (existingClient) {
        syncedCount++;
      }
    }

    let status = 'not_synced';
    if (syncedCount === totalClients) {
      status = 'fully_synced';
    } else if (syncedCount > 0) {
      status = 'partially_synced';
    }

    return { status, syncedCount, totalClients };
  }

  // Home care planning operations
  async getHomeCarePlans(): Promise<HomeCarePlan[]> {
    return await db
      .select()
      .from(homeCarePlans)
      .orderBy(desc(homeCarePlans.createdAt));
  }

  async getHomeCarePlansWithDetails(): Promise<any[]> {
    const plans = await db
      .select({
        id: homeCarePlans.id,
        clientId: homeCarePlans.clientId,
        startDate: homeCarePlans.startDate,
        endDate: homeCarePlans.endDate,
        status: homeCarePlans.status,
        totalBudget: homeCarePlans.totalBudget,
        estimatedCost: homeCarePlans.estimatedCost,
        weeklySchedule: homeCarePlans.weeklySchedule,
        selectedBudgets: homeCarePlans.selectedBudgets,
        notes: homeCarePlans.notes,
        createdAt: homeCarePlans.createdAt,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
      })
      .from(homeCarePlans)
      .leftJoin(clients, eq(homeCarePlans.clientId, clients.id))
      .orderBy(desc(homeCarePlans.createdAt));

    // For each plan, get the budget configurations
    const plansWithDetails = await Promise.all(plans.map(async (plan) => {
      const budgetConfigs = await this.getClientBudgetConfigs(plan.clientId);
      
      // Determine status based on dates
      const now = new Date();
      const startDate = new Date(plan.startDate);
      const endDate = new Date(plan.endDate);
      let status = plan.status;
      
      if (status === 'active' && now > endDate) {
        status = 'expired';
      }
      
      const clientName = plan.clientFirstName && plan.clientLastName 
        ? `${plan.clientFirstName} ${plan.clientLastName}`.trim()
        : 'Unknown Client';
      
      const planName = plan.startDate 
        ? `Plan ${format(startDate, 'MMM yyyy')}`
        : 'Unnamed Plan';
      
      console.log('Plan details:', { 
        id: plan.id, 
        clientFirstName: plan.clientFirstName, 
        clientLastName: plan.clientLastName,
        clientName,
        planName,
        startDate: plan.startDate
      });
      
      return {
        ...plan,
        clientName,
        planName,
        validFrom: plan.startDate,
        validTo: plan.endDate,
        status,
        budgetConfigs: budgetConfigs.filter((config: any) => 
          plan.selectedBudgets && (plan.selectedBudgets as string[]).includes(config.budgetCode)
        ).map((config: any) => ({
          budgetCode: config.budgetCode,
          budgetName: config.budgetName,
          availableBalance: config.availableBalance,
          weekdayRate: config.weekdayRate,
          holidayRate: config.holidayRate,
        })),
      };
    }));

    return plansWithDetails;
  }

  async getHomeCarePlan(id: string): Promise<HomeCarePlan | undefined> {
    const [plan] = await db
      .select()
      .from(homeCarePlans)
      .where(eq(homeCarePlans.id, id));
    return plan;
  }

  async createHomeCarePlan(planData: InsertHomeCarePlan): Promise<HomeCarePlan> {
    const [plan] = await db
      .insert(homeCarePlans)
      .values({
        ...planData,
        startDate: new Date(planData.startDate),
        endDate: new Date(planData.endDate)
      })
      .returning();
    return plan;
  }

  async updateHomeCarePlan(id: string, planData: Partial<InsertHomeCarePlan>): Promise<HomeCarePlan> {
    const updateData: any = { ...planData, updatedAt: new Date() };
    if (planData.startDate) {
      updateData.startDate = new Date(planData.startDate);
    }
    if (planData.endDate) {
      updateData.endDate = new Date(planData.endDate);
    }
    const [updated] = await db
      .update(homeCarePlans)
      .set(updateData)
      .where(eq(homeCarePlans.id, id))
      .returning();
    return updated;
  }

  async deleteHomeCarePlan(id: string): Promise<void> {
    await db.delete(homeCarePlans).where(eq(homeCarePlans.id, id));
  }
  
  // Client budget configuration operations
  async getClientBudgetConfigs(clientId: string): Promise<any[]> {
    const configs = await db
      .select({
        id: clientBudgetConfigs.id,
        clientId: clientBudgetConfigs.clientId,
        budgetTypeId: clientBudgetConfigs.budgetTypeId,
        validFrom: clientBudgetConfigs.validFrom,
        validTo: clientBudgetConfigs.validTo,
        weekdayRate: clientBudgetConfigs.weekdayRate,
        holidayRate: clientBudgetConfigs.holidayRate,
        kilometerRate: clientBudgetConfigs.kilometerRate,
        availableBalance: clientBudgetConfigs.availableBalance,
        createdAt: clientBudgetConfigs.createdAt,
        updatedAt: clientBudgetConfigs.updatedAt,
        budgetCode: budgetTypes.code,
        budgetName: budgetTypes.name
      })
      .from(clientBudgetConfigs)
      .leftJoin(budgetTypes, eq(clientBudgetConfigs.budgetTypeId, budgetTypes.id))
      .where(eq(clientBudgetConfigs.clientId, clientId))
      .orderBy(budgetTypes.displayOrder);
    
    return configs;
  }

  async getClientBudgetConfig(id: string): Promise<ClientBudgetConfig | undefined> {
    const [config] = await db
      .select()
      .from(clientBudgetConfigs)
      .where(eq(clientBudgetConfigs.id, id));
    return config;
  }

  async createClientBudgetConfig(configData: InsertClientBudgetConfig): Promise<ClientBudgetConfig> {
    const [config] = await db
      .insert(clientBudgetConfigs)
      .values({
        ...configData,
        validFrom: new Date(configData.validFrom),
        validTo: new Date(configData.validTo)
      })
      .returning();
    return config;
  }

  async updateClientBudgetConfig(id: string, configData: Partial<InsertClientBudgetConfig>): Promise<ClientBudgetConfig> {
    const updateData: any = { ...configData, updatedAt: new Date() };
    if (configData.validFrom) {
      updateData.validFrom = new Date(configData.validFrom);
    }
    if (configData.validTo) {
      updateData.validTo = new Date(configData.validTo);
    }
    const [updated] = await db
      .update(clientBudgetConfigs)
      .set(updateData)
      .where(eq(clientBudgetConfigs.id, id))
      .returning();
    return updated;
  }

  async deleteClientBudgetConfig(id: string): Promise<void> {
    await db.delete(clientBudgetConfigs).where(eq(clientBudgetConfigs.id, id));
  }

  async deleteClientBudgetConfigs(clientId: string): Promise<void> {
    await db.delete(clientBudgetConfigs).where(eq(clientBudgetConfigs.clientId, clientId));
  }

  async initializeClientBudgets(clientId: string): Promise<void> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get all budget allocations for this client
    const allocations = await this.getAllClientBudgetAllocations(clientId);
    
    // Get all budget types
    const types = await db.select().from(budgetTypes).orderBy(budgetTypes.displayOrder);

    for (const budgetType of types) {
      // Check if there's an allocation for this budget type
      const allocation = allocations.find(a => a.budgetTypeId === budgetType.id);
      
      if (allocation && parseFloat(allocation.allocatedAmount) > 0) {
        const remaining = parseFloat(allocation.allocatedAmount) - parseFloat(allocation.usedAmount || '0');
        
        // Create config for budget types that have allocations
        await this.createClientBudgetConfig({
          clientId,
          budgetTypeId: budgetType.id,
          validFrom: startOfMonth.toISOString(),
          validTo: endOfMonth.toISOString(),
          weekdayRate: budgetType.defaultWeekdayRate || '15.00',
          holidayRate: budgetType.defaultHolidayRate || '20.00',
          kilometerRate: budgetType.defaultKilometerRate || '0.00',
          availableBalance: remaining.toFixed(2)
        });
      }
    }
  }

  async getDurationStatistics(year?: number): Promise<any> {
    try {
      // Build conditions based on year filter
      const conditions = [];
      if (year) {
        conditions.push(sql`EXTRACT(YEAR FROM ${timeLogs.serviceDate}) = ${year}`);
      }

      // Get overall statistics
      const overallStats = await db
        .select({
          totalRecords: sql<number>`COUNT(*)`,
          totalHours: sql<number>`COALESCE(SUM(${timeLogs.hours}), 0)`,
          averageHours: sql<number>`COALESCE(AVG(${timeLogs.hours}), 0)`,
          uniqueClients: sql<number>`COUNT(DISTINCT ${timeLogs.clientId})`,
          uniqueOperators: sql<number>`COUNT(DISTINCT ${timeLogs.staffId})`
        })
        .from(timeLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Get yearly comparison data
      const yearlyData = await db
        .select({
          year: sql<number>`EXTRACT(YEAR FROM ${timeLogs.serviceDate})`,
          records: sql<number>`COUNT(*)`,
          hours: sql<number>`COALESCE(SUM(${timeLogs.hours}), 0)`,
          clients: sql<number>`COUNT(DISTINCT ${timeLogs.clientId})`,
          operators: sql<number>`COUNT(DISTINCT ${timeLogs.staffId})`
        })
        .from(timeLogs)
        .groupBy(sql`EXTRACT(YEAR FROM ${timeLogs.serviceDate})`)
        .orderBy(sql`EXTRACT(YEAR FROM ${timeLogs.serviceDate})`);

      // Get monthly data for selected year or all time
      const monthlyData = await db
        .select({
          month: sql<string>`TO_CHAR(${timeLogs.serviceDate}, 'YYYY-MM')`,
          records: sql<number>`COUNT(*)`,
          hours: sql<number>`COALESCE(SUM(${timeLogs.hours}), 0)`
        })
        .from(timeLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(sql`TO_CHAR(${timeLogs.serviceDate}, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${timeLogs.serviceDate}, 'YYYY-MM')`);

      // Get top operators
      const topOperators = await db
        .select({
          name: sql<string>`CONCAT(${staff.firstName}, ' ', ${staff.lastName})`,
          hours: sql<number>`COALESCE(SUM(${timeLogs.hours}), 0)`,
          services: sql<number>`COUNT(*)`
        })
        .from(timeLogs)
        .leftJoin(staff, eq(timeLogs.staffId, staff.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(staff.id, staff.firstName, staff.lastName)
        .orderBy(sql`SUM(${timeLogs.hours}) DESC`)
        .limit(10);

      // Get top clients
      const topClients = await db
        .select({
          name: sql<string>`CONCAT(${clients.firstName}, ' ', ${clients.lastName})`,
          hours: sql<number>`COALESCE(SUM(${timeLogs.hours}), 0)`,
          services: sql<number>`COUNT(*)`
        })
        .from(timeLogs)
        .leftJoin(clients, eq(timeLogs.clientId, clients.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(clients.id, clients.firstName, clients.lastName)
        .orderBy(sql`SUM(${timeLogs.hours}) DESC`)
        .limit(10);

      // Get service distribution by duration ranges
      const serviceDistribution = await db
        .select({
          range: sql<string>`
            CASE 
              WHEN ${timeLogs.hours} < 1 THEN '<1h'
              WHEN ${timeLogs.hours} < 2 THEN '1-2h'
              WHEN ${timeLogs.hours} < 4 THEN '2-4h'
              WHEN ${timeLogs.hours} < 8 THEN '4-8h'
              ELSE '8h+'
            END
          `,
          count: sql<number>`COUNT(*)`
        })
        .from(timeLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(sql`
          CASE 
            WHEN ${timeLogs.hours} < 1 THEN '<1h'
            WHEN ${timeLogs.hours} < 2 THEN '1-2h'
            WHEN ${timeLogs.hours} < 4 THEN '2-4h'
            WHEN ${timeLogs.hours} < 8 THEN '4-8h'
            ELSE '8h+'
          END
        `)
        .orderBy(sql`
          CASE 
            WHEN ${timeLogs.hours} < 1 THEN 1
            WHEN ${timeLogs.hours} < 2 THEN 2
            WHEN ${timeLogs.hours} < 4 THEN 3
            WHEN ${timeLogs.hours} < 8 THEN 4
            ELSE 5
          END
        `);

      return {
        totalRecords: overallStats[0]?.totalRecords || 0,
        totalHours: overallStats[0]?.totalHours || 0,
        averageHours: overallStats[0]?.averageHours || 0,
        uniqueClients: overallStats[0]?.uniqueClients || 0,
        uniqueOperators: overallStats[0]?.uniqueOperators || 0,
        yearlyComparison: yearlyData,
        monthlyData,
        topOperators,
        topClients,
        serviceDistribution
      };
    } catch (error) {
      console.error("Error fetching duration statistics:", error);
      throw error;
    }
  }

  // Service Categories
  async getServiceCategories() {
    const result = await db.query.serviceCategories.findMany({
      orderBy: (categories, { asc }) => [asc(categories.displayOrder), asc(categories.name)]
    });
    return result;
  }

  async createServiceCategory(data: any) {
    const [category] = await db.insert(serviceCategories).values({
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return category;
  }

  async updateServiceCategory(id: string, data: any) {
    const [category] = await db.update(serviceCategories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(serviceCategories.id, id))
      .returning();
    return category;
  }

  async deleteServiceCategory(id: string) {
    await db.delete(serviceCategories).where(eq(serviceCategories.id, id));
  }

  // Service Types
  async getServiceTypes() {
    const result = await db.select({
      id: serviceTypes.id,
      categoryId: serviceTypes.categoryId,
      code: serviceTypes.code,
      name: serviceTypes.name,
      description: serviceTypes.description,
      defaultRate: serviceTypes.defaultRate,
      isActive: serviceTypes.isActive,
      displayOrder: serviceTypes.displayOrder,
      categoryName: serviceCategories.name
    })
    .from(serviceTypes)
    .leftJoin(serviceCategories, eq(serviceTypes.categoryId, serviceCategories.id))
    .orderBy(asc(serviceTypes.displayOrder), asc(serviceTypes.name));
    
    return result;
  }

  async createServiceType(data: any) {
    const [type] = await db.insert(serviceTypes).values({
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return type;
  }

  async updateServiceType(id: string, data: any) {
    const [type] = await db.update(serviceTypes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(serviceTypes.id, id))
      .returning();
    return type;
  }

  async deleteServiceType(id: string) {
    await db.delete(serviceTypes).where(eq(serviceTypes.id, id));
  }

  // Budget Categories - update existing methods
  async updateBudgetCategory(id: string, data: any) {
    const [category] = await db.update(budgetCategories)
      .set(data)
      .where(eq(budgetCategories.id, id))
      .returning();
    return category;
  }

  // Budget Types
  async createBudgetType(data: any) {
    const [type] = await db.insert(budgetTypes).values({
      ...data,
      id: crypto.randomUUID()
    }).returning();
    return type;
  }

  async updateBudgetType(id: string, data: any) {
    const [type] = await db.update(budgetTypes)
      .set(data)
      .where(eq(budgetTypes.id, id))
      .returning();
    return type;
  }

  // Excel sync operations
  async getExcelSyncPreview(importId: string) {
    // Get all Excel data for this import
    const excelRows = await db
      .select()
      .from(excelData)
      .where(eq(excelData.importId, importId));



    // Extract unique clients
    const clientsMap = new Map();
    const staffMap = new Map();

    for (const row of excelRows) {
      // Extract client data using direct column names
      const clientExternalId = row.assistedPersonId;
      const clientFirstName = row.assistedPersonFirstName || '';
      const clientLastName = row.assistedPersonLastName || '';
      const fiscalCode = row.taxCode || null;

      if (clientExternalId && !clientsMap.has(clientExternalId)) {
        clientsMap.set(clientExternalId, {
          externalId: clientExternalId,
          firstName: clientFirstName || 'Unknown',
          lastName: clientLastName || '',
          fiscalCode,
          exists: false,
          existingId: undefined
        });
      }

      // Extract staff data using direct column names
      const staffExternalId = row.operatorId;
      const staffFirstName = row.operatorFirstName || '';
      const staffLastName = row.operatorLastName || '';
      const category = row.serviceCategory || null;
      const services = row.serviceType || null;
      const categoryType = row.categoryType || 'external';

      if (staffExternalId && !staffMap.has(staffExternalId)) {
        // Determine if staff is internal or external based on category type
        // "interna" means internal in Italian, "esterna" means external
        const isInternal = categoryType?.toLowerCase() === 'interna' || 
                          categoryType?.toLowerCase() === 'internal';
        
        staffMap.set(staffExternalId, {
          externalId: staffExternalId,
          firstName: staffFirstName || 'Unknown',
          lastName: staffLastName || '',
          type: isInternal ? 'internal' : 'external',
          category,
          services,
          exists: false,
          existingId: undefined
        });
      }
    }

    // Check if clients already exist
    for (const [id, clientData] of Array.from(clientsMap)) {
      const existing = await db
        .select()
        .from(clients)
        .where(eq(clients.externalId, id))
        .limit(1);
      
      if (existing.length > 0) {
        clientData.exists = true;
        clientData.existingId = existing[0].id;
      }
    }

    // Check if staff already exist
    for (const [id, staffData] of Array.from(staffMap)) {
      const existing = await db
        .select()
        .from(staff)
        .where(eq(staff.externalId, id))
        .limit(1);
      
      if (existing.length > 0) {
        staffData.exists = true;
        staffData.existingId = existing[0].id;
      }
    }

    return {
      clients: Array.from(clientsMap.values()),
      staff: Array.from(staffMap.values())
    };
  }

  async syncExcelClients(importId: string, clientIds: string[]) {
    const preview = await this.getExcelSyncPreview(importId);
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const clientData of preview.clients) {
      if (!clientIds.includes(clientData.externalId)) {
        skipped++;
        continue;
      }

      if (clientData.exists && clientData.existingId) {
        // Update existing client
        await db
          .update(clients)
          .set({
            firstName: clientData.firstName,
            lastName: clientData.lastName,
            fiscalCode: clientData.fiscalCode,
            updatedAt: new Date()
          })
          .where(eq(clients.id, clientData.existingId));
        updated++;
      } else {
        // Create new client
        await db.insert(clients).values({
          externalId: clientData.externalId,
          firstName: clientData.firstName,
          lastName: clientData.lastName,
          fiscalCode: clientData.fiscalCode,
          serviceType: 'personal-care', // Default service type
          status: 'active'
        });
        created++;
      }
    }

    // Update import status
    await db
      .update(excelImports)
      .set({
        syncStatus: 'synced',
        syncedAt: new Date(),
        syncedCount: created + updated
      })
      .where(eq(excelImports.id, importId));

    return { created, updated, skipped };
  }

  async syncExcelStaff(importId: string, staffIds: string[]) {
    const preview = await this.getExcelSyncPreview(importId);
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const staffData of preview.staff) {
      if (!staffIds.includes(staffData.externalId)) {
        skipped++;
        continue;
      }

      if (staffData.exists && staffData.existingId) {
        // Update existing staff
        await db
          .update(staff)
          .set({
            firstName: staffData.firstName,
            lastName: staffData.lastName,
            type: staffData.type,
            category: staffData.category,
            services: staffData.services,
            updatedAt: new Date()
          })
          .where(eq(staff.id, staffData.existingId));
        updated++;
      } else {
        // Create new staff member
        await db.insert(staff).values({
          externalId: staffData.externalId,
          firstName: staffData.firstName,
          lastName: staffData.lastName,
          type: staffData.type,
          category: staffData.category,
          services: staffData.services,
          hourlyRate: '20.00', // Default hourly rate
          status: 'active'
        });
        created++;
      }
    }

    // After syncing staff and clients, analyze Excel data to create client-staff assignments
    await this.createClientStaffAssignmentsFromExcel(importId);

    return { created, updated, skipped };
  }

  async createClientStaffAssignmentsFromExcel(importId: string) {
    // Get all Excel data for this import
    const allExcelData = await db
      .select()
      .from(excelData)
      .where(eq(excelData.importId, importId));

    // Group data by client and staff to find relationships
    const clientStaffMap = new Map<string, Set<string>>();
    
    for (const row of allExcelData) {
      const clientExternalId = row.data?.assisted_person_id;
      const staffExternalId = row.data?.operator_id;
      
      if (clientExternalId && staffExternalId) {
        if (!clientStaffMap.has(clientExternalId)) {
          clientStaffMap.set(clientExternalId, new Set());
        }
        clientStaffMap.get(clientExternalId)!.add(staffExternalId);
      }
    }

    // Create assignments for each client-staff relationship found
    for (const [clientExternalId, staffExternalIds] of clientStaffMap) {
      // Find the client by external ID
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.externalId, clientExternalId));
      
      if (!client) continue;

      let assignmentCount = 0;
      for (const staffExternalId of staffExternalIds) {
        // Find the staff member by external ID
        const [staffMember] = await db
          .select()
          .from(staff)
          .where(eq(staff.externalId, staffExternalId));
        
        if (!staffMember) continue;

        // Check if assignment already exists
        const [existingAssignment] = await db
          .select()
          .from(clientStaffAssignments)
          .where(and(
            eq(clientStaffAssignments.clientId, client.id),
            eq(clientStaffAssignments.staffId, staffMember.id)
          ));

        if (!existingAssignment) {
          // Create new assignment
          await db.insert(clientStaffAssignments).values({
            clientId: client.id,
            staffId: staffMember.id,
            assignmentType: assignmentCount === 0 ? 'primary' : 'secondary',
            isActive: true
          });
          assignmentCount++;
        }
      }
    }
  }
}

export const storage = new DatabaseStorage();
