import {
  users,
  clients,
  staff,
  timeLogs,
  budgetCategories,
  clientBudgetAllocations,
  budgetExpenses,
  excelImports,
  excelData,
  homeCarePlans,
  clientBudgetConfigs,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
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
  initializeClientBudgets(clientId: string): Promise<void>;
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
  async getBudgetExpenses(clientId?: string, categoryId?: string, month?: number, year?: number): Promise<BudgetExpense[]> {
    const conditions = [];
    if (clientId) conditions.push(eq(budgetExpenses.clientId, clientId));
    if (categoryId) conditions.push(eq(budgetExpenses.categoryId, categoryId));
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
  }> {
    // Get allocations for the specified month/year
    const allocations = await db
      .select({
        allocation: clientBudgetAllocations,
        category: budgetCategories
      })
      .from(clientBudgetAllocations)
      .innerJoin(budgetCategories, eq(clientBudgetAllocations.categoryId, budgetCategories.id))
      .where(and(
        eq(clientBudgetAllocations.clientId, clientId),
        eq(clientBudgetAllocations.month, month),
        eq(clientBudgetAllocations.year, year)
      ));

    // Get expenses for the specified month/year
    const expenses = await db
      .select({
        categoryId: budgetExpenses.categoryId,
        total: sql<number>`SUM(${budgetExpenses.amount})::numeric`
      })
      .from(budgetExpenses)
      .where(and(
        eq(budgetExpenses.clientId, clientId),
        sql`EXTRACT(MONTH FROM ${budgetExpenses.expenseDate}) = ${month}`,
        sql`EXTRACT(YEAR FROM ${budgetExpenses.expenseDate}) = ${year}`
      ))
      .groupBy(budgetExpenses.categoryId);

    const expenseMap = new Map(expenses.map(e => [e.categoryId, parseFloat(e.total.toString())]));

    const categories = allocations.map(({ allocation, category }) => {
      const allocated = parseFloat(allocation.allocatedAmount);
      const spent = expenseMap.get(category.id) || 0;
      const remaining = allocated - spent;
      const percentage = allocated > 0 ? (spent / allocated) * 100 : 0;

      return {
        category,
        allocated,
        spent,
        remaining,
        percentage
      };
    });

    const totals = categories.reduce(
      (acc, cat) => ({
        totalAllocated: acc.totalAllocated + cat.allocated,
        totalSpent: acc.totalSpent + cat.spent,
        totalRemaining: acc.totalRemaining + cat.remaining
      }),
      { totalAllocated: 0, totalSpent: 0, totalRemaining: 0 }
    );

    return {
      categories,
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
  async getClientBudgetConfigs(clientId: string): Promise<ClientBudgetConfig[]> {
    return await db
      .select()
      .from(clientBudgetConfigs)
      .where(eq(clientBudgetConfigs.clientId, clientId))
      .orderBy(clientBudgetConfigs.budgetCode);
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

  async initializeClientBudgets(clientId: string): Promise<void> {
    const mandatoryBudgets = [
      { code: 'HCPQ', name: 'Qualified HCP', canFundMileage: false, categoryName: 'Personal Care Services', defaultAmount: 800 },
      { code: 'HCPB', name: 'Basic HCP', canFundMileage: false, categoryName: 'Home Support Services', defaultAmount: 600 },
      { code: 'FP_QUALIFICATA', name: 'Qualified Poverty Fund', canFundMileage: false, categoryName: 'Medical Assistance', defaultAmount: 750 },
      { code: 'LEGGE162', name: 'Law 162', canFundMileage: true, categoryName: 'Law 162', defaultAmount: 900 },
      { code: 'RAC', name: 'RAC', canFundMileage: true, categoryName: 'RAC', defaultAmount: 450 },
      { code: 'ASSISTENZA_DIRETTA', name: 'Direct Assistance', canFundMileage: true, categoryName: 'Direct Assistance', defaultAmount: 1500 },
      { code: 'FP_BASE', name: 'Basic Poverty Fund', canFundMileage: false, categoryName: 'Basic Support', defaultAmount: 550 },
      { code: 'SADQ', name: 'Qualified SAD', canFundMileage: false, categoryName: 'Social Support', defaultAmount: 700 },
      { code: 'SADB', name: 'Basic SAD', canFundMileage: false, categoryName: 'Basic Social Support', defaultAmount: 500 },
      { code: 'EDUCATIVA', name: 'Educational Budget', canFundMileage: false, categoryName: 'Educational Support', defaultAmount: 650 }
    ];

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get all budget allocations for this client
    const allocations = await this.getAllClientBudgetAllocations(clientId);
    const categories = await this.getBudgetCategories();

    for (const budget of mandatoryBudgets) {
      // Find the category and its allocation
      const category = categories.find(c => c.name === budget.categoryName);
      let availableBalance = budget.defaultAmount.toFixed(2); // Start with default amount
      
      if (category && category.id) {
        const allocation = allocations.find(a => a.categoryId === category.id);
        if (allocation) {
          const remaining = parseFloat(allocation.allocatedAmount) - parseFloat(allocation.usedAmount);
          // If there's an allocation, use the larger of the default or the remaining allocation
          availableBalance = Math.max(budget.defaultAmount, remaining).toFixed(2);
        }
      }

      await this.createClientBudgetConfig({
        clientId,
        budgetCode: budget.code,
        budgetName: budget.name,
        validFrom: startOfMonth.toISOString(),
        validTo: endOfMonth.toISOString(),
        weekdayRate: '15.00',
        holidayRate: '20.00',
        kilometerRate: budget.canFundMileage ? '0.50' : '0.00',
        availableBalance,
        canFundMileage: budget.canFundMileage
      });
    }
  }
}

export const storage = new DatabaseStorage();
