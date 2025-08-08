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
  staffRates,
  staffCompensations,
  compensationAdjustments,
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
  type StaffRate,
  type InsertStaffRate,
  type StaffCompensation,
  type InsertStaffCompensation,
  type CompensationAdjustment,
  type InsertCompensationAdjustment,
  type MileageLog,
  type InsertMileageLog,
  type MileageDispute,
  type InsertMileageDispute,
  mileageLogs,
  mileageDisputes,
  importAuditTrail,
  type ImportAuditTrail,
  type InsertImportAuditTrail,
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
  getClientByExternalId(externalId: string): Promise<Client | undefined>;
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
  getClientStaffAssignments(clientId: string): Promise<(ClientStaffAssignment & { staff: Staff })[]>;
  getStaffClientAssignments(staffId: string): Promise<(ClientStaffAssignment & { client: Client })[]>;
  createClientStaffAssignment(assignment: InsertClientStaffAssignment): Promise<ClientStaffAssignment>;
  updateClientStaffAssignment(id: string, assignment: Partial<InsertClientStaffAssignment>): Promise<ClientStaffAssignment>;
  deleteClientStaffAssignment(id: string): Promise<void>;
  deleteClientStaffAssignments(clientId: string, staffId: string): Promise<void>;
  getClientsWithStaff(): Promise<(Client & { staffAssignments: (ClientStaffAssignment & { staff: Staff })[] })[]>;
  
  // Time log operations
  getTimeLogs(): Promise<TimeLog[]>;
  getTimeLogsByClient(clientId: string): Promise<TimeLog[]>;
  getTimeLogsByStaff(staffId: string): Promise<TimeLog[]>;
  getTimeLogsByStaffIdAndDateRange(staffId: string, periodStart: Date, periodEnd: Date): Promise<TimeLog[]>;
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
  getExcelImports(): Promise<any[]>;
  getExcelData(importId: string): Promise<any[]>;
  
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
  createTimeLogsFromExcel(importId: string): Promise<{
    created: number;
    skipped: number;
    duplicates: Array<{identifier: string; reason: string}>;
  }>;
  
  // Staff rate operations
  getStaffRates(staffId: string): Promise<StaffRate[]>;
  getActiveStaffRate(staffId: string, serviceTypeId?: string, date?: Date): Promise<StaffRate | undefined>;
  createStaffRate(rate: InsertStaffRate): Promise<StaffRate>;
  updateStaffRate(id: string, rate: Partial<InsertStaffRate>): Promise<StaffRate>;
  deleteStaffRate(id: string): Promise<void>;
  
  // Staff compensation operations
  getStaffCompensations(staffId?: string, status?: string): Promise<StaffCompensation[]>;
  getAllStaffCompensations(): Promise<StaffCompensation[]>;
  getStaffCompensation(id: string): Promise<StaffCompensation | undefined>;
  getStaffCompensationByPeriod(staffId: string, periodStart: Date, periodEnd: Date): Promise<StaffCompensation | undefined>;
  createStaffCompensation(compensation: InsertStaffCompensation): Promise<StaffCompensation>;
  updateStaffCompensation(id: string, compensation: Partial<InsertStaffCompensation>): Promise<StaffCompensation>;
  deleteStaffCompensation(id: string): Promise<void>;
  approveStaffCompensation(id: string, userId: string): Promise<StaffCompensation>;
  markStaffCompensationPaid(id: string): Promise<StaffCompensation>;
  calculateStaffCompensation(staffId: string, periodStart: Date, periodEnd: Date): Promise<{
    regularHours: number;
    overtimeHours: number;
    weekendHours: number;
    holidayHours: number;
    totalMileage: number;
    baseCompensation: number;
    overtimeCompensation: number;
    weekendCompensation: number;
    holidayCompensation: number;
    mileageReimbursement: number;
    totalCompensation: number;
  }>;
  
  // Compensation adjustment operations
  getCompensationAdjustments(compensationId: string): Promise<CompensationAdjustment[]>;
  createCompensationAdjustment(adjustment: InsertCompensationAdjustment): Promise<CompensationAdjustment>;
  
  // Mileage tracking operations
  getMileageLogs(staffId?: string, status?: string): Promise<MileageLog[]>;
  getMileageLog(id: string): Promise<MileageLog | undefined>;
  createMileageLog(log: InsertMileageLog): Promise<MileageLog>;
  updateMileageLog(id: string, log: Partial<InsertMileageLog>): Promise<MileageLog>;
  deleteMileageLog(id: string): Promise<void>;
  approveMileageLog(id: string, userId: string): Promise<MileageLog>;
  rejectMileageLog(id: string): Promise<MileageLog>;
  bulkApproveMileageLogs(logIds: string[], userId: string): Promise<{ count: number }>;
  
  // Mileage dispute operations
  getMileageDisputes(mileageLogId?: string, status?: string): Promise<MileageDispute[]>;
  getMileageDispute(id: string): Promise<MileageDispute | undefined>;
  createMileageDispute(dispute: InsertMileageDispute): Promise<MileageDispute>;
  updateMileageDispute(id: string, dispute: Partial<InsertMileageDispute>): Promise<MileageDispute>;
  resolveMileageDispute(id: string, resolution: string, userId: string): Promise<MileageDispute>;
  
  // Import tracking operations
  createImportAuditTrail(trail: InsertImportAuditTrail): Promise<ImportAuditTrail>;
  getImportAuditTrail(importId: string): Promise<ImportAuditTrail[]>;
  getEntityImportHistory(entityType: string, entityId: string): Promise<ImportAuditTrail[]>;
  updateEntityImportTracking(entityType: 'client' | 'staff', entityId: string, importId: string): Promise<void>;
  getClientImportHistory(clientId: string): Promise<any[]>;
  getStaffImportHistory(staffId: string): Promise<any[]>;
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

  async getClientByExternalId(externalId: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.externalId, externalId));
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
  async getClientStaffAssignments(clientId: string): Promise<(ClientStaffAssignment & { staff: Staff })[]> {
    const assignments = await db
      .select({
        id: clientStaffAssignments.id,
        clientId: clientStaffAssignments.clientId,
        staffId: clientStaffAssignments.staffId,
        assignmentType: clientStaffAssignments.assignmentType,
        startDate: clientStaffAssignments.startDate,
        endDate: clientStaffAssignments.endDate,
        isActive: clientStaffAssignments.isActive,
        createdAt: clientStaffAssignments.createdAt,
        updatedAt: clientStaffAssignments.updatedAt,
        staff: staff
      })
      .from(clientStaffAssignments)
      .leftJoin(staff, eq(clientStaffAssignments.staffId, staff.id))
      .where(and(
        eq(clientStaffAssignments.clientId, clientId),
        eq(clientStaffAssignments.isActive, true)
      ))
      .orderBy(desc(clientStaffAssignments.createdAt));

    return assignments
      .filter(assignment => assignment.staff !== null)
      .map(assignment => ({
        id: assignment.id,
        clientId: assignment.clientId,
        staffId: assignment.staffId,
        assignmentType: assignment.assignmentType,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        isActive: assignment.isActive,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
        staff: assignment.staff!
      }));
  }

  async getStaffClientAssignments(staffId: string): Promise<(ClientStaffAssignment & { client: Client })[]> {
    const assignments = await db
      .select({
        id: clientStaffAssignments.id,
        clientId: clientStaffAssignments.clientId,
        staffId: clientStaffAssignments.staffId,
        assignmentType: clientStaffAssignments.assignmentType,
        startDate: clientStaffAssignments.startDate,
        endDate: clientStaffAssignments.endDate,
        isActive: clientStaffAssignments.isActive,
        createdAt: clientStaffAssignments.createdAt,
        updatedAt: clientStaffAssignments.updatedAt,
        client: clients
      })
      .from(clientStaffAssignments)
      .leftJoin(clients, eq(clientStaffAssignments.clientId, clients.id))
      .where(and(
        eq(clientStaffAssignments.staffId, staffId),
        eq(clientStaffAssignments.isActive, true)
      ))
      .orderBy(desc(clientStaffAssignments.createdAt));

    return assignments
      .filter(assignment => assignment.client !== null)
      .map(assignment => ({
        id: assignment.id,
        clientId: assignment.clientId,
        staffId: assignment.staffId,
        assignmentType: assignment.assignmentType,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        isActive: assignment.isActive,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
        client: assignment.client!
      }));
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

  async getTimeLogsByStaffId(staffId: string): Promise<any[]> {
    const logs = await db
      .select({
        timeLog: timeLogs,
        client: clients
      })
      .from(timeLogs)
      .leftJoin(clients, eq(timeLogs.clientId, clients.id))
      .where(eq(timeLogs.staffId, staffId))
      .orderBy(desc(timeLogs.serviceDate));

    return logs.map(({ timeLog, client }) => ({
      ...timeLog,
      clientName: client ? `${client.firstName} ${client.lastName}` : 'Unknown Client'
    }));
  }

  async getTimeLogsByStaffIdAndDateRange(staffId: string, periodStart: Date, periodEnd: Date): Promise<TimeLog[]> {
    return await db
      .select()
      .from(timeLogs)
      .where(and(
        eq(timeLogs.staffId, staffId),
        sql`${timeLogs.serviceDate} >= ${periodStart}`,
        sql`${timeLogs.serviceDate} <= ${periodEnd}`
      ))
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
    
    // Update client's monthly budget to reflect the sum of allocations for the current month
    await this.updateClientMonthlyBudget(allocation.clientId, allocation.month, allocation.year);
    
    return newAllocation;
  }

  async updateClientBudgetAllocation(id: string, allocationData: Partial<InsertClientBudgetAllocation>): Promise<ClientBudgetAllocation> {
    const [updatedAllocation] = await db
      .update(clientBudgetAllocations)
      .set({ ...allocationData, updatedAt: new Date() })
      .where(eq(clientBudgetAllocations.id, id))
      .returning();
    
    // Update client's monthly budget to reflect the sum of allocations
    if (updatedAllocation) {
      await this.updateClientMonthlyBudget(
        updatedAllocation.clientId, 
        updatedAllocation.month, 
        updatedAllocation.year
      );
    }
    
    return updatedAllocation;
  }

  async deleteClientBudgetAllocation(id: string): Promise<void> {
    // Get the allocation details before deleting
    const [allocation] = await db
      .select()
      .from(clientBudgetAllocations)
      .where(eq(clientBudgetAllocations.id, id));
    
    await db.delete(clientBudgetAllocations).where(eq(clientBudgetAllocations.id, id));
    
    // Update client's monthly budget after deletion
    if (allocation) {
      await this.updateClientMonthlyBudget(allocation.clientId, allocation.month, allocation.year);
    }
  }
  
  // Helper method to update client's monthly budget based on allocations
  async updateClientMonthlyBudget(clientId: string, month: number, year: number): Promise<void> {
    // Calculate the sum of all allocations for the given month and year
    const result = await db
      .select({ 
        total: sql<number>`COALESCE(SUM(${clientBudgetAllocations.allocatedAmount}), 0)` 
      })
      .from(clientBudgetAllocations)
      .where(and(
        eq(clientBudgetAllocations.clientId, clientId),
        eq(clientBudgetAllocations.month, month),
        eq(clientBudgetAllocations.year, year)
      ));
    
    const totalBudget = result[0]?.total || 0;
    
    // Get current date to check if we should update the monthly budget
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // Only update monthly_budget if it's for the current month
    if (month === currentMonth && year === currentYear) {
      await db
        .update(clients)
        .set({ monthlyBudget: totalBudget.toString() })
        .where(eq(clients.id, clientId));
    }
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

  async getExcelImports(): Promise<any[]> {
    return await db.select().from(excelImports).orderBy(desc(excelImports.createdAt));
  }

  async getExcelData(importId: string): Promise<any[]> {
    return await db.select().from(excelData).where(eq(excelData.importId, importId));
  }

  async getImportSyncStatus(importId: string): Promise<{ 
    status: string; 
    syncedCount: number; 
    totalClients: number;
    timeLogsSync?: {
      status: string;
      processed: number;
      total: number;
      created: number;
      skipped: number;
      message: string;
    }
  }> {
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

    // Check if there's an active time logs sync in progress
    const timeLogsSyncStatus = (global as any).timeLogsSyncProgress?.[importId];
    
    return { 
      status, 
      syncedCount, 
      totalClients,
      timeLogsSync: timeLogsSyncStatus
    };
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

    console.log(`Total rows fetched: ${excelRows.length}`);
    if (excelRows.length > 0) {
      console.log('Sample row structure:', Object.keys(excelRows[0]));
      console.log('First row data:', {
        assisted_person_first_name: excelRows[0].assisted_person_first_name,
        assisted_person_last_name: excelRows[0].assisted_person_last_name,
        assistedPersonFirstName: excelRows[0].assistedPersonFirstName,
        assistedPersonLastName: excelRows[0].assistedPersonLastName
      });
    }

    // Extract unique clients
    const clientsMap = new Map();
    const staffMap = new Map();

    for (const row of excelRows) {
      // Extract client data using camelCase format (as returned by Drizzle ORM)
      const clientExternalId = row.assistedPersonId || '';
      const clientFirstName = row.assistedPersonFirstName || '';
      const clientLastName = row.assistedPersonLastName || '';
      const fiscalCode = row.taxCode || null;
      
      // Skip rows without client names
      if (!clientFirstName && !clientLastName) continue;
      
      // Parse dateOfBirth from string to Date or null
      let dateOfBirth = null;
      if (row.dateOfBirth && row.dateOfBirth.trim() !== '') {
        const dateStr = row.dateOfBirth.trim();
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          dateOfBirth = parsedDate;
        }
      }

      // Use external ID as key if available, otherwise use name-based key
      // This ensures each unique client ID gets its own entry
      const clientKey = clientExternalId || `${clientFirstName}_${clientLastName}`.toLowerCase().trim();
      
      if (clientKey && !clientsMap.has(clientKey)) {
        clientsMap.set(clientKey, {
          externalId: clientExternalId || `${clientFirstName}_${clientLastName}`.replace(/\s+/g, '_'),
          firstName: clientFirstName || 'Unknown',
          lastName: clientLastName || '',
          fiscalCode,
          dateOfBirth,
          email: row.email || null,
          phone: row.primaryPhone || row.mobilePhone || null,
          address: row.homeAddress || null,
          exists: false,
          existingId: undefined
        });
      }

      // Extract staff data using camelCase format (as returned by Drizzle ORM)
      const staffExternalId = row.operatorId || '';
      const staffFirstName = row.operatorFirstName || '';
      const staffLastName = row.operatorLastName || '';
      const category = row.serviceCategory || null;
      const services = row.serviceType || null;
      const categoryType = row.categoryType || 'external';
      
      // Skip rows without staff names
      if (!staffFirstName && !staffLastName) continue;

      // Use external ID as key if available, otherwise use name-based key
      // This ensures each unique staff ID gets its own entry
      const staffKey = staffExternalId || `${staffFirstName}_${staffLastName}`.toLowerCase().trim();
      
      if (staffKey && !staffMap.has(staffKey)) {
        // Determine if staff is internal or external based on category type
        // "interna" means internal in Italian, "esterna" means external
        const isInternal = categoryType?.toLowerCase() === 'interna' || 
                          categoryType?.toLowerCase() === 'internal';
        
        staffMap.set(staffKey, {
          externalId: staffExternalId || `${staffFirstName}_${staffLastName}`.replace(/\s+/g, '_'),
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

    console.log(`Unique clients found: ${clientsMap.size}`);
    console.log(`Unique staff found: ${staffMap.size}`);

    // Check if clients already exist
    for (const [id, clientData] of Array.from(clientsMap)) {
      // First check by external ID if it exists
      let existing = [];
      if (clientData.externalId && !clientData.externalId.includes('_')) {
        existing = await db
          .select()
          .from(clients)
          .where(eq(clients.externalId, clientData.externalId))
          .limit(1);
      }
      
      // If not found by external ID, check by name combination
      if (existing.length === 0) {
        existing = await db
          .select()
          .from(clients)
          .where(
            and(
              eq(clients.firstName, clientData.firstName),
              eq(clients.lastName, clientData.lastName)
            )
          )
          .limit(1);
      }
      
      if (existing.length > 0) {
        clientData.exists = true;
        clientData.existingId = existing[0].id;
      }
    }

    // Check if staff already exist
    for (const [id, staffData] of Array.from(staffMap)) {
      // First check by external ID if it exists
      let existing = [];
      if (staffData.externalId && !staffData.externalId.includes('_')) {
        existing = await db
          .select()
          .from(staff)
          .where(eq(staff.externalId, staffData.externalId))
          .limit(1);
      }
      
      // If not found by external ID, check by name combination
      if (existing.length === 0) {
        existing = await db
          .select()
          .from(staff)
          .where(
            and(
              eq(staff.firstName, staffData.firstName),
              eq(staff.lastName, staffData.lastName)
            )
          )
          .limit(1);
      }
      
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
        // Get existing client for audit trail
        const [existingClient] = await db
          .select()
          .from(clients)
          .where(eq(clients.id, clientData.existingId));
        
        // Update existing client with import tracking AND external ID
        const currentHistory = (existingClient?.importHistory as any[]) || [];
        await db
          .update(clients)
          .set({
            externalId: clientData.externalId, // Important: Update external ID!
            firstName: clientData.firstName,
            lastName: clientData.lastName,
            fiscalCode: clientData.fiscalCode,
            lastImportId: importId,
            importHistory: [
              ...currentHistory,
              {
                importId,
                timestamp: new Date().toISOString(),
                action: 'updated'
              }
            ],
            updatedAt: new Date()
          })
          .where(eq(clients.id, clientData.existingId));
        
        // Create audit trail entry
        await this.createImportAuditTrail({
          importId,
          entityType: 'client',
          entityId: clientData.existingId,
          action: 'updated',
          previousData: existingClient,
          newData: { ...existingClient, ...clientData },
          changeDetails: {
            firstName: clientData.firstName,
            lastName: clientData.lastName,
            fiscalCode: clientData.fiscalCode
          }
        });
        
        updated++;
      } else {
        // Create new client with import tracking
        const [newClient] = await db.insert(clients).values({
          externalId: clientData.externalId,
          firstName: clientData.firstName,
          lastName: clientData.lastName,
          fiscalCode: clientData.fiscalCode,
          dateOfBirth: clientData.dateOfBirth || null,
          email: clientData.email || null,
          phone: clientData.phone || null,
          address: clientData.address || null,
          serviceType: 'personal-care', // Default service type
          status: 'active',
          importId: importId,
          lastImportId: importId,
          importHistory: [{
            importId,
            timestamp: new Date().toISOString(),
            action: 'created'
          }]
        }).returning();
        
        // Create audit trail entry
        await this.createImportAuditTrail({
          importId,
          entityType: 'client',
          entityId: newClient.id,
          action: 'created',
          newData: newClient
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
        syncedClientsCount: created + updated
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
        // Get existing staff for audit trail
        const [existingStaff] = await db
          .select()
          .from(staff)
          .where(eq(staff.id, staffData.existingId));
        
        // Update existing staff with import tracking AND external ID
        const currentHistory = (existingStaff?.importHistory as any[]) || [];
        await db
          .update(staff)
          .set({
            externalId: staffData.externalId, // Important: Update external ID!
            firstName: staffData.firstName,
            lastName: staffData.lastName,
            type: staffData.type,
            category: staffData.category,
            services: staffData.services,
            lastImportId: importId,
            importHistory: [
              ...currentHistory,
              {
                importId,
                timestamp: new Date().toISOString(),
                action: 'updated'
              }
            ],
            updatedAt: new Date()
          })
          .where(eq(staff.id, staffData.existingId));
        
        // Create audit trail entry
        await this.createImportAuditTrail({
          importId,
          entityType: 'staff',
          entityId: staffData.existingId,
          action: 'updated',
          previousData: existingStaff,
          newData: { ...existingStaff, ...staffData },
          changeDetails: {
            firstName: staffData.firstName,
            lastName: staffData.lastName,
            type: staffData.type,
            category: staffData.category,
            services: staffData.services
          }
        });
        
        updated++;
      } else {
        // Create new staff member with import tracking
        const [newStaff] = await db.insert(staff).values({
          externalId: staffData.externalId,
          firstName: staffData.firstName,
          lastName: staffData.lastName,
          type: staffData.type,
          category: staffData.category,
          services: staffData.services,
          hourlyRate: '20.00', // Default hourly rate
          status: 'active',
          importId: importId,
          lastImportId: importId,
          importHistory: [{
            importId,
            timestamp: new Date().toISOString(),
            action: 'created'
          }]
        }).returning();
        
        // Create audit trail entry
        await this.createImportAuditTrail({
          importId,
          entityType: 'staff',
          entityId: newStaff.id,
          action: 'created',
          newData: newStaff
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

    console.log(`Creating client-staff assignments for import ${importId}`);
    console.log(`Total rows to process: ${allExcelData.length}`);

    // Group data by client and staff to find relationships
    const clientStaffMap = new Map<string, Set<string>>();
    
    for (const row of allExcelData) {
      // Access the fields directly from the row (they're stored as columns in the DB)
      const clientExternalId = row.assistedPersonId;
      const staffExternalId = row.operatorId;
      
      if (clientExternalId && staffExternalId) {
        const clientIdStr = String(clientExternalId);
        const staffIdStr = String(staffExternalId);
        
        if (!clientStaffMap.has(clientIdStr)) {
          clientStaffMap.set(clientIdStr, new Set());
        }
        clientStaffMap.get(clientIdStr)!.add(staffIdStr);
      }
    }

    console.log(`Found ${clientStaffMap.size} unique clients with staff assignments`);

    // Create assignments for each client-staff relationship found
    let totalAssignmentsCreated = 0;
    let totalAssignmentsSkipped = 0;

    for (const [clientExternalId, staffExternalIds] of clientStaffMap) {
      // Find the client by external ID
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.externalId, clientExternalId));
      
      if (!client) {
        console.log(`Client not found with externalId: ${clientExternalId}`);
        continue;
      }

      let assignmentCount = 0;
      for (const staffExternalId of staffExternalIds) {
        // Find the staff member by external ID
        const [staffMember] = await db
          .select()
          .from(staff)
          .where(eq(staff.externalId, staffExternalId));
        
        if (!staffMember) {
          console.log(`Staff not found with externalId: ${staffExternalId}`);
          continue;
        }

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
          totalAssignmentsCreated++;
        } else {
          totalAssignmentsSkipped++;
        }
      }
    }

    console.log(`Client-staff assignments created: ${totalAssignmentsCreated}, skipped: ${totalAssignmentsSkipped}`);
  }

  // Create time logs from Excel data with duplicate detection
  async createTimeLogsFromExcel(importId: string): Promise<{
    created: number;
    skipped: number;
    duplicates: Array<{identifier: string; reason: string}>;
  }> {
    console.log(`Starting time logs sync for import ${importId}`);
    
    // Get all Excel data for this import
    const allExcelData = await db
      .select()
      .from(excelData)
      .where(eq(excelData.importId, importId));

    console.log(`Found ${allExcelData.length} rows to process`);

    // Initialize progress tracking
    if (!(global as any).timeLogsSyncProgress) {
      (global as any).timeLogsSyncProgress = {};
    }
    
    (global as any).timeLogsSyncProgress[importId] = {
      status: 'processing',
      processed: 0,
      total: allExcelData.length,
      created: 0,
      skipped: 0,
      message: 'Starting sync...'
    };

    let created = 0;
    let skipped = 0;
    const duplicates: Array<{identifier: string; reason: string}> = [];
    let processedCount = 0;

    // Pre-fetch all clients and staff to avoid N+1 queries
    const clientsMap = new Map();
    const staffMap = new Map();
    
    const allClients = await db.select().from(clients);
    const allStaff = await db.select().from(staff);
    
    allClients.forEach(c => clientsMap.set(c.externalId, c));
    allStaff.forEach(s => staffMap.set(s.externalId, s));
    
    console.log(`Loaded ${clientsMap.size} clients and ${staffMap.size} staff members`);

    for (const row of allExcelData) {
      processedCount++;
      
      // Update progress
      (global as any).timeLogsSyncProgress[importId] = {
        status: 'processing',
        processed: processedCount,
        total: allExcelData.length,
        created,
        skipped,
        message: `Processing row ${processedCount}/${allExcelData.length}`
      };
      
      if (processedCount % 100 === 0) {
        console.log(`Processing row ${processedCount}/${allExcelData.length}`);
      }
      
      // Skip rows without essential data - using database column names (snake_case)
      if (!row.assistedPersonId || !row.operatorId || !row.scheduledStart) {
        skipped++;
        continue;
      }

      // Find client and staff by external IDs from cache
      const client = clientsMap.get(String(row.assistedPersonId));
      const staffMember = staffMap.get(String(row.operatorId));

      if (!client || !staffMember) {
        skipped++;
        continue;
      }

      // Parse service date and times
      const scheduledStart = row.scheduledStart ? new Date(row.scheduledStart) : null;
      const scheduledEnd = row.scheduledEnd ? new Date(row.scheduledEnd) : null;
      
      if (!scheduledStart || isNaN(scheduledStart.getTime())) {
        skipped++;
        continue;
      }

      // Check for duplicates using composite key
      const identifier = row.identifier || '';
      
      // Check if a time log with the same composite key already exists
      const existingTimeLog = await db
        .select()
        .from(timeLogs)
        .where(and(
          eq(timeLogs.clientId, client.id),
          eq(timeLogs.staffId, staffMember.id),
          eq(timeLogs.scheduledStartTime, scheduledStart),
          scheduledEnd ? eq(timeLogs.scheduledEndTime, scheduledEnd) : sql`true`
        ))
        .limit(1);

      if (existingTimeLog.length > 0) {
        // Also check if it has the same external identifier
        if (identifier && existingTimeLog[0].externalIdentifier === identifier) {
          duplicates.push({
            identifier,
            reason: `Time log already exists for ${client.firstName} ${client.lastName} with ${staffMember.firstName} ${staffMember.lastName} at ${scheduledStart.toISOString()}`
          });
          skipped++;
          continue;
        }
      }

      // Calculate hours from duration or time difference
      let hours = '0';
      if (row.duration) {
        // Parse duration (format: "HH:MM" or decimal)
        const durationStr = String(row.duration);
        if (durationStr.includes(':')) {
          const [h, m] = durationStr.split(':');
          hours = (parseInt(h) + parseInt(m) / 60).toFixed(2);
        } else {
          hours = parseFloat(durationStr).toFixed(2);
        }
      } else if (scheduledEnd) {
        // Calculate from time difference
        const diff = scheduledEnd.getTime() - scheduledStart.getTime();
        hours = (diff / (1000 * 60 * 60)).toFixed(2);
      }

      // Get the hourly rate (use cost1 from Excel or staff's default rate)
      const hourlyRate = row.cost1 || staffMember.hourlyRate || '25';
      const totalCost = (parseFloat(hours) * parseFloat(hourlyRate)).toFixed(2);

      try {
        // Create the time log
        await db.insert(timeLogs).values({
          clientId: client.id,
          staffId: staffMember.id,
          serviceDate: scheduledStart,
          scheduledStartTime: scheduledStart,
          scheduledEndTime: scheduledEnd,
          hours,
          serviceType: row.serviceCategory || row.serviceType || 'Personal Care',
          hourlyRate,
          totalCost,
          notes: row.notes || '',
          externalIdentifier: identifier,
          importId,
          excelDataId: row.id
        });
        created++;
      } catch (error) {
        console.error('Error creating time log:', error);
        skipped++;
      }
    }

    // Mark sync as completed
    (global as any).timeLogsSyncProgress[importId] = {
      status: 'completed',
      processed: allExcelData.length,
      total: allExcelData.length,
      created,
      skipped,
      message: `Sync completed: ${created} created, ${skipped} skipped`
    };

    // Clean up progress tracking after a delay
    setTimeout(() => {
      if ((global as any).timeLogsSyncProgress?.[importId]) {
        delete (global as any).timeLogsSyncProgress[importId];
      }
    }, 5000);

    console.log(`Time logs sync completed: created=${created}, skipped=${skipped}, duplicates=${duplicates.length}`);
    return { created, skipped, duplicates };
  }

  // Staff rate operations
  async getStaffRates(staffId: string): Promise<StaffRate[]> {
    return await db
      .select()
      .from(staffRates)
      .where(eq(staffRates.staffId, staffId))
      .orderBy(desc(staffRates.effectiveFrom));
  }

  async getActiveStaffRate(staffId: string, serviceTypeId?: string, date: Date = new Date()): Promise<StaffRate | undefined> {
    const query = db
      .select()
      .from(staffRates)
      .where(and(
        eq(staffRates.staffId, staffId),
        eq(staffRates.isActive, true),
        sql`${staffRates.effectiveFrom} <= ${date}`,
        sql`(${staffRates.effectiveTo} IS NULL OR ${staffRates.effectiveTo} >= ${date})`
      ));
    
    if (serviceTypeId) {
      query.where(and(
        eq(staffRates.serviceTypeId, serviceTypeId)
      ));
    }
    
    const [rate] = await query.orderBy(desc(staffRates.effectiveFrom)).limit(1);
    return rate;
  }

  async createStaffRate(rate: InsertStaffRate): Promise<StaffRate> {
    const [newRate] = await db.insert(staffRates).values(rate).returning();
    return newRate;
  }

  async updateStaffRate(id: string, rate: Partial<InsertStaffRate>): Promise<StaffRate> {
    const [updatedRate] = await db
      .update(staffRates)
      .set({ ...rate, updatedAt: new Date() })
      .where(eq(staffRates.id, id))
      .returning();
    return updatedRate;
  }

  async deleteStaffRate(id: string): Promise<void> {
    await db.delete(staffRates).where(eq(staffRates.id, id));
  }

  // Staff compensation operations
  async getStaffCompensations(staffId?: string, status?: string): Promise<StaffCompensation[]> {
    let query = db.select({
      id: staffCompensations.id,
      staffId: staffCompensations.staffId,
      periodStart: sql<string>`to_char(${staffCompensations.periodStart}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`,
      periodEnd: sql<string>`to_char(${staffCompensations.periodEnd}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`,
      regularHours: staffCompensations.regularHours,
      overtimeHours: staffCompensations.overtimeHours,
      weekendHours: staffCompensations.weekendHours,
      holidayHours: staffCompensations.holidayHours,
      totalMileage: staffCompensations.totalMileage,
      baseCompensation: staffCompensations.baseCompensation,
      overtimeCompensation: staffCompensations.overtimeCompensation,
      weekendCompensation: staffCompensations.weekendCompensation,
      holidayCompensation: staffCompensations.holidayCompensation,
      mileageReimbursement: staffCompensations.mileageReimbursement,
      totalCompensation: staffCompensations.totalCompensation,
      status: staffCompensations.status,
      approvedBy: staffCompensations.approvedBy,
      approvedAt: sql<string | null>`CASE WHEN ${staffCompensations.approvedAt} IS NULL THEN NULL ELSE to_char(${staffCompensations.approvedAt}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END`,
      paidAt: sql<string | null>`CASE WHEN ${staffCompensations.paidAt} IS NULL THEN NULL ELSE to_char(${staffCompensations.paidAt}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END`,
      notes: staffCompensations.notes,
      paySlipGenerated: staffCompensations.paySlipGenerated,
      paySlipUrl: staffCompensations.paySlipUrl,
      createdAt: sql<string>`to_char(${staffCompensations.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`,
      updatedAt: sql<string>`to_char(${staffCompensations.updatedAt}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`
    }).from(staffCompensations);
    
    const conditions = [];
    if (staffId) {
      conditions.push(eq(staffCompensations.staffId, staffId));
    }
    if (status) {
      conditions.push(eq(staffCompensations.status, status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const results = await query.orderBy(desc(staffCompensations.periodEnd));
    return results as StaffCompensation[];
  }

  async getAllStaffCompensations(): Promise<StaffCompensation[]> {
    return await db
      .select()
      .from(staffCompensations)
      .orderBy(desc(staffCompensations.periodEnd));
  }

  async getStaffCompensation(id: string): Promise<StaffCompensation | undefined> {
    const [compensation] = await db
      .select()
      .from(staffCompensations)
      .where(eq(staffCompensations.id, id));
    return compensation;
  }

  async getStaffCompensationByPeriod(staffId: string, periodStart: Date, periodEnd: Date): Promise<StaffCompensation | undefined> {
    const [compensation] = await db
      .select()
      .from(staffCompensations)
      .where(and(
        eq(staffCompensations.staffId, staffId),
        eq(staffCompensations.periodStart, periodStart),
        eq(staffCompensations.periodEnd, periodEnd)
      ));
    return compensation;
  }

  async createStaffCompensation(compensation: InsertStaffCompensation): Promise<StaffCompensation> {
    // Convert string dates to Date objects
    const compensationData = {
      ...compensation,
      periodStart: new Date(compensation.periodStart),
      periodEnd: new Date(compensation.periodEnd),
      approvedAt: compensation.approvedAt ? new Date(compensation.approvedAt) : undefined,
      paidAt: compensation.paidAt ? new Date(compensation.paidAt) : undefined
    };
    
    const [newCompensation] = await db
      .insert(staffCompensations)
      .values(compensationData)
      .returning();
    return newCompensation;
  }

  async updateStaffCompensation(id: string, compensation: Partial<InsertStaffCompensation>): Promise<StaffCompensation> {
    const [updatedCompensation] = await db
      .update(staffCompensations)
      .set({ ...compensation, updatedAt: new Date() })
      .where(eq(staffCompensations.id, id))
      .returning();
    return updatedCompensation;
  }

  async deleteStaffCompensation(id: string): Promise<void> {
    await db.delete(staffCompensations).where(eq(staffCompensations.id, id));
  }

  async approveStaffCompensation(id: string, userId: string): Promise<StaffCompensation> {
    const [approved] = await db
      .update(staffCompensations)
      .set({
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(staffCompensations.id, id))
      .returning();
    return approved;
  }

  async markStaffCompensationPaid(id: string): Promise<StaffCompensation> {
    const [paid] = await db
      .update(staffCompensations)
      .set({
        status: 'paid',
        paidAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(staffCompensations.id, id))
      .returning();
    return paid;
  }

  async calculateStaffCompensation(staffId: string, periodStart: Date, periodEnd: Date): Promise<{
    regularHours: number;
    overtimeHours: number;
    weekendHours: number;
    holidayHours: number;
    totalMileage: number;
    baseCompensation: number;
    overtimeCompensation: number;
    weekendCompensation: number;
    holidayCompensation: number;
    mileageReimbursement: number;
    totalCompensation: number;
  }> {
    // Get all time logs for the staff member in the period
    const logs = await db
      .select()
      .from(timeLogs)
      .where(and(
        eq(timeLogs.staffId, staffId),
        sql`${timeLogs.serviceDate} >= ${periodStart}`,
        sql`${timeLogs.serviceDate} <= ${periodEnd}`
      ));

    // Get active rate for the staff member
    const rate = await this.getActiveStaffRate(staffId);
    
    if (!rate) {
      throw new Error('No active rate found for staff member');
    }

    // Calculate hours by type
    let regularHours = 0;
    let overtimeHours = 0;
    let weekendHours = 0;
    let holidayHours = 0;
    let totalMileage = 0;

    for (const log of logs) {
      const hours = parseFloat(log.hours || '0');
      const mileage = parseFloat(log.mileage || '0');
      totalMileage += mileage;

      const date = new Date(log.serviceDate);
      const dayOfWeek = date.getDay();
      
      // Check if it's a holiday (simplified - would need Italian holiday calendar)
      const isHoliday = dayOfWeek === 0; // Sunday
      const isWeekend = dayOfWeek === 6; // Saturday
      
      if (isHoliday) {
        holidayHours += hours;
      } else if (isWeekend) {
        weekendHours += hours;
      } else {
        // Check for overtime (more than 8 hours per day)
        if (hours > 8) {
          regularHours += 8;
          overtimeHours += hours - 8;
        } else {
          regularHours += hours;
        }
      }
    }

    // Calculate compensation
    const baseCompensation = regularHours * parseFloat(rate.weekdayRate || '0');
    const overtimeCompensation = overtimeHours * parseFloat(rate.weekdayRate || '0') * parseFloat(rate.overtimeMultiplier || '1.5');
    const weekendCompensation = weekendHours * parseFloat(rate.weekendRate || '0');
    const holidayCompensation = holidayHours * parseFloat(rate.holidayRate || '0');
    const mileageReimbursement = totalMileage * parseFloat(rate.mileageRatePerKm || '0');

    const totalCompensation = baseCompensation + overtimeCompensation + weekendCompensation + holidayCompensation + mileageReimbursement;

    return {
      regularHours,
      overtimeHours,
      weekendHours,
      holidayHours,
      totalMileage,
      baseCompensation,
      overtimeCompensation,
      weekendCompensation,
      holidayCompensation,
      mileageReimbursement,
      totalCompensation
    };
  }

  // Compensation adjustment operations
  async getCompensationAdjustments(compensationId: string): Promise<CompensationAdjustment[]> {
    return await db
      .select()
      .from(compensationAdjustments)
      .where(eq(compensationAdjustments.compensationId, compensationId))
      .orderBy(desc(compensationAdjustments.createdAt));
  }

  async createCompensationAdjustment(adjustment: InsertCompensationAdjustment): Promise<CompensationAdjustment> {
    const [newAdjustment] = await db
      .insert(compensationAdjustments)
      .values(adjustment)
      .returning();
    return newAdjustment;
  }

  // Mileage tracking operations
  async getMileageLogs(staffId?: string, status?: string): Promise<MileageLog[]> {
    let query = db.select().from(mileageLogs);
    
    const conditions = [];
    if (staffId) {
      conditions.push(eq(mileageLogs.staffId, staffId));
    }
    if (status) {
      conditions.push(eq(mileageLogs.status, status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(mileageLogs.date));
  }

  async getMileageLog(id: string): Promise<MileageLog | undefined> {
    const [log] = await db
      .select()
      .from(mileageLogs)
      .where(eq(mileageLogs.id, id));
    return log;
  }

  async createMileageLog(log: InsertMileageLog): Promise<MileageLog> {
    const [newLog] = await db
      .insert(mileageLogs)
      .values({
        ...log,
        date: new Date(log.date) // Ensure date is a Date object
      })
      .returning();
    return newLog;
  }

  async updateMileageLog(id: string, log: Partial<InsertMileageLog>): Promise<MileageLog> {
    const [updatedLog] = await db
      .update(mileageLogs)
      .set({
        ...log,
        updatedAt: new Date(),
      })
      .where(eq(mileageLogs.id, id))
      .returning();
    return updatedLog;
  }

  async deleteMileageLog(id: string): Promise<void> {
    await db.delete(mileageLogs).where(eq(mileageLogs.id, id));
  }

  async approveMileageLog(id: string, userId: string): Promise<MileageLog> {
    const [approvedLog] = await db
      .update(mileageLogs)
      .set({
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mileageLogs.id, id))
      .returning();
    return approvedLog;
  }

  async rejectMileageLog(id: string): Promise<MileageLog> {
    const [rejectedLog] = await db
      .update(mileageLogs)
      .set({
        status: 'rejected',
        updatedAt: new Date(),
      })
      .where(eq(mileageLogs.id, id))
      .returning();
    return rejectedLog;
  }

  async bulkApproveMileageLogs(logIds: string[], userId: string): Promise<{ count: number }> {
    const result = await db
      .update(mileageLogs)
      .set({
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(sql`${mileageLogs.id} = ANY(${logIds})`);
    
    return { count: logIds.length };
  }

  // Mileage dispute operations
  async getMileageDisputes(mileageLogId?: string, status?: string): Promise<MileageDispute[]> {
    let query = db.select().from(mileageDisputes);
    
    const conditions = [];
    if (mileageLogId) {
      conditions.push(eq(mileageDisputes.mileageLogId, mileageLogId));
    }
    if (status) {
      conditions.push(eq(mileageDisputes.status, status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(mileageDisputes.createdAt));
  }

  async getMileageDispute(id: string): Promise<MileageDispute | undefined> {
    const [dispute] = await db
      .select()
      .from(mileageDisputes)
      .where(eq(mileageDisputes.id, id));
    return dispute;
  }

  async createMileageDispute(dispute: InsertMileageDispute): Promise<MileageDispute> {
    // First update the mileage log status to disputed
    await db
      .update(mileageLogs)
      .set({
        status: 'disputed',
        updatedAt: new Date(),
      })
      .where(eq(mileageLogs.id, dispute.mileageLogId));
    
    // Create the dispute
    const [newDispute] = await db
      .insert(mileageDisputes)
      .values(dispute)
      .returning();
    return newDispute;
  }

  async updateMileageDispute(id: string, dispute: Partial<InsertMileageDispute>): Promise<MileageDispute> {
    const [updatedDispute] = await db
      .update(mileageDisputes)
      .set({
        ...dispute,
        updatedAt: new Date(),
      })
      .where(eq(mileageDisputes.id, id))
      .returning();
    return updatedDispute;
  }

  async resolveMileageDispute(id: string, resolution: string, userId: string): Promise<MileageDispute> {
    const [resolvedDispute] = await db
      .update(mileageDisputes)
      .set({
        status: 'resolved',
        resolution,
        resolvedBy: userId,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mileageDisputes.id, id))
      .returning();
    
    // Update the mileage log status back to pending or approved based on resolution
    if (resolvedDispute) {
      await db
        .update(mileageLogs)
        .set({
          status: 'pending',
          updatedAt: new Date(),
        })
        .where(eq(mileageLogs.id, resolvedDispute.mileageLogId));
    }
    
    return resolvedDispute;
  }

  // Import tracking operations
  async createImportAuditTrail(trail: InsertImportAuditTrail): Promise<ImportAuditTrail> {
    const [newTrail] = await db
      .insert(importAuditTrail)
      .values(trail)
      .returning();
    return newTrail;
  }

  async getImportAuditTrail(importId: string): Promise<ImportAuditTrail[]> {
    return await db
      .select()
      .from(importAuditTrail)
      .where(eq(importAuditTrail.importId, importId))
      .orderBy(desc(importAuditTrail.createdAt));
  }

  async getEntityImportHistory(entityType: string, entityId: string): Promise<ImportAuditTrail[]> {
    return await db
      .select()
      .from(importAuditTrail)
      .where(
        and(
          eq(importAuditTrail.entityType, entityType),
          eq(importAuditTrail.entityId, entityId)
        )
      )
      .orderBy(desc(importAuditTrail.createdAt));
  }

  async updateEntityImportTracking(entityType: 'client' | 'staff', entityId: string, importId: string): Promise<void> {
    const table = entityType === 'client' ? clients : staff;
    
    // Get current import history
    const [entity] = await db
      .select()
      .from(table)
      .where(eq(table.id, entityId));
    
    if (!entity) return;
    
    // Update import history
    const currentHistory = (entity.importHistory as any[]) || [];
    const updatedHistory = [
      ...currentHistory,
      {
        importId,
        timestamp: new Date().toISOString(),
        action: entity.importId ? 'updated' : 'created'
      }
    ];
    
    // Update the entity with new import tracking
    await db
      .update(table)
      .set({
        lastImportId: importId,
        importHistory: updatedHistory,
        ...(entity.importId ? {} : { importId }), // Only set importId if it's not already set
        updatedAt: new Date(),
      })
      .where(eq(table.id, entityId));
  }

  async getClientImportHistory(clientId: string): Promise<any[]> {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId));
    
    return (client?.importHistory as any[]) || [];
  }

  async getStaffImportHistory(staffId: string): Promise<any[]> {
    const [staffMember] = await db
      .select()
      .from(staff)
      .where(eq(staff.id, staffId));
    
    return (staffMember?.importHistory as any[]) || [];
  }
}

export const storage = new DatabaseStorage();
