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
  compensationBudgetAllocations,
  userConsents,
  dataAccessLogs,
  dataExportRequests,
  dataRetentionPolicies,
  dataDeletionRequests,
  dataBreachIncidents,
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
  type CompensationBudgetAllocation,
  type InsertCompensationBudgetAllocation,
  type MileageLog,
  type InsertMileageLog,
  type MileageDispute,
  type InsertMileageDispute,
  type UserConsent,
  type InsertUserConsent,
  type DataAccessLog,
  type InsertDataAccessLog,
  type DataExportRequest,
  type InsertDataExportRequest,
  type DataRetentionPolicy,
  type InsertDataRetentionPolicy,
  type DataDeletionRequest,
  type InsertDataDeletionRequest,
  type DataBreachIncident,
  type InsertDataBreachIncident,
  mileageLogs,
  mileageDisputes,
  importAuditTrail,
  type ImportAuditTrail,
  type InsertImportAuditTrail,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, asc, gte, lte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { format } from "date-fns";

export interface IStorage {
  // Session store
  sessionStore: any;

  // User operations
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Client operations
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  getClientByExternalId(externalId: string): Promise<Client | undefined>;
  getClientsAssignedToStaff(staffId: string): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string): Promise<void>;
  findClientByNameOrEmail(
    firstName: string,
    lastName: string,
    email: string,
  ): Promise<Client | undefined>;

  // Staff operations
  getStaffMembers(): Promise<Staff[]>;
  getStaffMember(id: string): Promise<Staff | undefined>;
  createStaffMember(staff: InsertStaff): Promise<Staff>;
  updateStaffMember(id: string, staff: Partial<InsertStaff>): Promise<Staff>;
  deleteStaffMember(id: string): Promise<void>;

  // Client-Staff assignment operations
  getClientStaffAssignments(
    clientId: string,
  ): Promise<(ClientStaffAssignment & { staff: Staff })[]>;
  getStaffClientAssignments(
    staffId: string,
  ): Promise<(ClientStaffAssignment & { client: Client })[]>;
  getAllClientStaffAssignments(): Promise<(ClientStaffAssignment & { staff: Staff; client: Client })[]>;
  createClientStaffAssignment(
    assignment: InsertClientStaffAssignment,
  ): Promise<ClientStaffAssignment>;
  updateClientStaffAssignment(
    id: string,
    assignment: Partial<InsertClientStaffAssignment>,
  ): Promise<ClientStaffAssignment>;
  deleteClientStaffAssignment(id: string): Promise<void>;
  deleteClientStaffAssignments(
    clientId: string,
    staffId: string,
  ): Promise<void>;
  getClientsWithStaff(): Promise<
    (Client & {
      staffAssignments: (ClientStaffAssignment & { staff: Staff })[];
    })[]
  >;

  // Time log operations
  getTimeLogs(): Promise<TimeLog[]>;
  getTimeLogsByClient(clientId: string): Promise<TimeLog[]>;
  getTimeLogsByStaff(staffId: string): Promise<TimeLog[]>;
  getTimeLogsByStaffIdAndDateRange(
    staffId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<TimeLog[]>;
  createTimeLog(timeLog: InsertTimeLog): Promise<TimeLog>;
  updateTimeLog(id: string, timeLog: Partial<InsertTimeLog>): Promise<TimeLog>;
  deleteTimeLog(id: string): Promise<void>;

  // Budget category operations
  getBudgetCategories(): Promise<BudgetCategory[]>;
  createBudgetCategory(category: InsertBudgetCategory): Promise<BudgetCategory>;

  // Client budget allocation operations
  getClientBudgetAllocations(
    clientId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any[]>;
  getAllClientBudgetAllocations(
    clientId: string,
  ): Promise<ClientBudgetAllocation[]>;
  createClientBudgetAllocation(
    allocation: InsertClientBudgetAllocation,
  ): Promise<ClientBudgetAllocation>;
  updateClientBudgetAllocation(
    id: string,
    allocation: Partial<InsertClientBudgetAllocation>,
  ): Promise<ClientBudgetAllocation>;
  deleteClientBudgetAllocation(id: string): Promise<void>;

  // Budget expense operations
  getBudgetExpenses(
    clientId?: string,
    categoryId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<BudgetExpense[]>;
  createBudgetExpense(expense: InsertBudgetExpense): Promise<BudgetExpense>;
  updateBudgetExpense(
    id: string,
    expense: Partial<InsertBudgetExpense>,
  ): Promise<BudgetExpense>;
  deleteBudgetExpense(id: string): Promise<void>;

  // Budget analysis
  getBudgetAnalysis(
    clientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
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
  getImportSyncStatus(
    importId: string,
  ): Promise<{ status: string; syncedCount: number; totalClients: number }>;
  getExcelImports(): Promise<any[]>;
  getExcelData(importId: string): Promise<any[]>;

  // Home care planning operations
  getHomeCarePlans(): Promise<HomeCarePlan[]>;
  getHomeCarePlan(id: string): Promise<HomeCarePlan | undefined>;
  createHomeCarePlan(plan: InsertHomeCarePlan): Promise<HomeCarePlan>;
  updateHomeCarePlan(
    id: string,
    plan: Partial<InsertHomeCarePlan>,
  ): Promise<HomeCarePlan>;
  deleteHomeCarePlan(id: string): Promise<void>;

  // Client budget configuration operations
  getClientBudgetConfigs(clientId: string): Promise<ClientBudgetConfig[]>;
  getClientBudgetConfig(id: string): Promise<ClientBudgetConfig | undefined>;
  createClientBudgetConfig(
    config: InsertClientBudgetConfig,
  ): Promise<ClientBudgetConfig>;
  updateClientBudgetConfig(
    id: string,
    config: Partial<InsertClientBudgetConfig>,
  ): Promise<ClientBudgetConfig>;
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
  syncExcelClients(
    importId: string,
    clientIds: string[],
  ): Promise<{ created: number; updated: number; skipped: number }>;
  syncExcelStaff(
    importId: string,
    staffIds: string[],
  ): Promise<{ created: number; updated: number; skipped: number }>;
  createTimeLogsFromExcel(importId: string): Promise<{
    created: number;
    skipped: number;
    duplicates: Array<{ identifier: string; reason: string }>;
  }>;

  // Staff rate operations
  getStaffRates(staffId: string): Promise<StaffRate[]>;
  getActiveStaffRate(
    staffId: string,
    serviceTypeId?: string,
    date?: Date,
  ): Promise<StaffRate | undefined>;
  createStaffRate(rate: InsertStaffRate): Promise<StaffRate>;
  updateStaffRate(
    id: string,
    rate: Partial<InsertStaffRate>,
  ): Promise<StaffRate>;
  deleteStaffRate(id: string): Promise<void>;
  toggleStaffRateActive(id: string): Promise<StaffRate>;

  // Staff compensation operations
  getStaffCompensations(
    staffId?: string,
    status?: string,
  ): Promise<StaffCompensation[]>;
  getAllStaffCompensations(): Promise<StaffCompensation[]>;
  getStaffCompensation(id: string): Promise<StaffCompensation | undefined>;
  getStaffCompensationByPeriod(
    staffId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<StaffCompensation | undefined>;
  createStaffCompensation(
    compensation: InsertStaffCompensation,
  ): Promise<StaffCompensation>;
  updateStaffCompensation(
    id: string,
    compensation: Partial<InsertStaffCompensation>,
  ): Promise<StaffCompensation>;
  deleteStaffCompensation(id: string): Promise<void>;
  approveStaffCompensation(
    id: string,
    userId: string,
  ): Promise<StaffCompensation>;
  markStaffCompensationPaid(id: string): Promise<StaffCompensation>;
  calculateStaffCompensation(
    staffId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{
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
  getCompensationAdjustments(
    compensationId: string,
  ): Promise<CompensationAdjustment[]>;
  createCompensationAdjustment(
    adjustment: InsertCompensationAdjustment,
  ): Promise<CompensationAdjustment>;

  // Compensation budget allocation operations
  getCompensationBudgetAllocations(
    compensationId: string,
  ): Promise<CompensationBudgetAllocation[]>;
  createCompensationBudgetAllocation(
    allocation: InsertCompensationBudgetAllocation,
  ): Promise<CompensationBudgetAllocation>;
  deleteCompensationBudgetAllocations(compensationId: string): Promise<void>;
  getAvailableBudgetForClient(
    clientId: string,
    budgetTypeId: string,
    date: Date,
  ): Promise<{
    allocationId: string;
    available: number;
    total: number;
    used: number;
  } | null>;

  // Mileage tracking operations
  getMileageLogs(staffId?: string, status?: string): Promise<MileageLog[]>;
  getMileageLog(id: string): Promise<MileageLog | undefined>;
  createMileageLog(log: InsertMileageLog): Promise<MileageLog>;
  updateMileageLog(
    id: string,
    log: Partial<InsertMileageLog>,
  ): Promise<MileageLog>;
  deleteMileageLog(id: string): Promise<void>;
  approveMileageLog(id: string, userId: string): Promise<MileageLog>;
  rejectMileageLog(id: string): Promise<MileageLog>;
  bulkApproveMileageLogs(
    logIds: string[],
    userId: string,
  ): Promise<{ count: number }>;

  // Mileage dispute operations
  getMileageDisputes(
    mileageLogId?: string,
    status?: string,
  ): Promise<MileageDispute[]>;
  getMileageDispute(id: string): Promise<MileageDispute | undefined>;
  createMileageDispute(dispute: InsertMileageDispute): Promise<MileageDispute>;
  updateMileageDispute(
    id: string,
    dispute: Partial<InsertMileageDispute>,
  ): Promise<MileageDispute>;
  resolveMileageDispute(
    id: string,
    resolution: string,
    userId: string,
  ): Promise<MileageDispute>;

  // Import tracking operations
  createImportAuditTrail(
    trail: InsertImportAuditTrail,
  ): Promise<ImportAuditTrail>;
  getImportAuditTrail(importId: string): Promise<ImportAuditTrail[]>;
  getEntityImportHistory(
    entityType: string,
    entityId: string,
  ): Promise<ImportAuditTrail[]>;
  updateEntityImportTracking(
    entityType: "client" | "staff",
    entityId: string,
    importId: string,
  ): Promise<void>;
  getClientImportHistory(clientId: string): Promise<any[]>;
  getStaffImportHistory(staffId: string): Promise<any[]>;

  // GDPR Compliance operations
  // User consent management
  getUserConsents(userId: string): Promise<UserConsent[]>;
  getUserConsentByType(userId: string, consentType: string): Promise<UserConsent | undefined>;
  createUserConsent(consent: InsertUserConsent): Promise<UserConsent>;
  updateUserConsent(id: string, consent: Partial<InsertUserConsent>): Promise<UserConsent>;
  revokeUserConsent(id: string, revokedDate?: Date): Promise<UserConsent>;

  // Data access logging
  logDataAccess(log: InsertDataAccessLog): Promise<DataAccessLog>;
  getDataAccessLogs(userId?: string, entityType?: string, action?: string): Promise<DataAccessLog[]>;
  getUserDataAccessLogs(userId: string, startDate?: Date, endDate?: Date): Promise<DataAccessLog[]>;

  // Data export requests
  getDataExportRequests(userId?: string, status?: string): Promise<DataExportRequest[]>;
  getDataExportRequest(id: string): Promise<DataExportRequest | undefined>;
  createDataExportRequest(request: InsertDataExportRequest): Promise<DataExportRequest>;
  updateDataExportRequest(id: string, request: Partial<InsertDataExportRequest>): Promise<DataExportRequest>;
  getUserDataForExport(userId: string, includePersonal: boolean, includeService: boolean, includeFinancial: boolean): Promise<any>;

  // Data retention policies
  getDataRetentionPolicies(): Promise<DataRetentionPolicy[]>;
  getDataRetentionPolicy(entityType: string): Promise<DataRetentionPolicy | undefined>;
  createDataRetentionPolicy(policy: InsertDataRetentionPolicy): Promise<DataRetentionPolicy>;
  updateDataRetentionPolicy(id: string, policy: Partial<InsertDataRetentionPolicy>): Promise<DataRetentionPolicy>;
  getExpiredDataForDeletion(): Promise<any[]>;

  // Data deletion requests
  getDataDeletionRequests(status?: string): Promise<DataDeletionRequest[]>;
  getDataDeletionRequest(id: string): Promise<DataDeletionRequest | undefined>;
  createDataDeletionRequest(request: InsertDataDeletionRequest): Promise<DataDeletionRequest>;
  updateDataDeletionRequest(id: string, request: Partial<InsertDataDeletionRequest>): Promise<DataDeletionRequest>;
  executeDataDeletion(requestId: string): Promise<{ deletedEntities: string[]; errors?: string[] }>;

  // Data breach incident management
  getDataBreachIncidents(status?: string): Promise<DataBreachIncident[]>;
  getDataBreachIncident(id: string): Promise<DataBreachIncident | undefined>;
  createDataBreachIncident(incident: InsertDataBreachIncident): Promise<DataBreachIncident>;
  updateDataBreachIncident(id: string, incident: Partial<InsertDataBreachIncident>): Promise<DataBreachIncident>;
  markBreachReported(id: string): Promise<DataBreachIncident>;
  markUsersNotified(id: string): Promise<DataBreachIncident>;
}

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      tableName: "session", // Explicitly set table name
      createTableIfMissing: false, // Keep false to prevent index conflict
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
    const [user] = await db.insert(users).values(userData).returning();
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

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.email));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
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
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.externalId, externalId));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async updateClient(
    id: string,
    clientData: Partial<InsertClient>,
  ): Promise<Client> {
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

  async getClientsAssignedToStaff(staffId: string): Promise<Client[]> {
    // Get clients assigned to this staff member through client_staff_assignments
    const assignedClients = await db
      .select({
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
        phone: clients.phone,
        dateOfBirth: clients.dateOfBirth,
        address: clients.address,
        city: clients.city,
        postalCode: clients.postalCode,
        country: clients.country,
        fiscalCode: clients.fiscalCode,
        serviceType: clients.serviceType,
        weeklyHours: clients.weeklyHours,
        contractStartDate: clients.contractStartDate,
        contractEndDate: clients.contractEndDate,
        notes: clients.notes,
        isActive: clients.isActive,
        createdAt: clients.createdAt,
        updatedAt: clients.updatedAt,
        externalId: clients.externalId,
      })
      .from(clients)
      .innerJoin(
        clientStaffAssignments,
        eq(clients.id, clientStaffAssignments.clientId),
      )
      .where(
        and(
          eq(clientStaffAssignments.staffId, staffId),
          eq(clientStaffAssignments.isActive, true),
        ),
      )
      .orderBy(clients.firstName, clients.lastName);

    return assignedClients;
  }

  async findClientByNameOrEmail(
    firstName: string,
    lastName: string,
    email: string,
  ): Promise<Client | undefined> {
    // Check by exact name match first
    if (firstName && lastName) {
      const [clientByName] = await db
        .select()
        .from(clients)
        .where(
          and(eq(clients.firstName, firstName), eq(clients.lastName, lastName)),
        );
      if (clientByName) return clientByName;
    }

    // Check by email if provided
    if (email && email.trim() !== "") {
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

  async updateStaffMember(
    id: string,
    staffData: Partial<InsertStaff>,
  ): Promise<Staff> {
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
  async getClientStaffAssignments(
    clientId: string,
  ): Promise<(ClientStaffAssignment & { staff: Staff })[]> {
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
        staff: staff,
      })
      .from(clientStaffAssignments)
      .leftJoin(staff, eq(clientStaffAssignments.staffId, staff.id))
      .where(
        and(
          eq(clientStaffAssignments.clientId, clientId),
          eq(clientStaffAssignments.isActive, true),
        ),
      )
      .orderBy(desc(clientStaffAssignments.createdAt));

    return assignments
      .filter((assignment) => assignment.staff !== null)
      .map((assignment) => ({
        id: assignment.id,
        clientId: assignment.clientId,
        staffId: assignment.staffId,
        assignmentType: assignment.assignmentType,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        isActive: assignment.isActive,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
        staff: assignment.staff!,
      }));
  }

  async getStaffClientAssignments(
    staffId: string,
  ): Promise<(ClientStaffAssignment & { client: Client })[]> {
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
        client: clients,
      })
      .from(clientStaffAssignments)
      .leftJoin(clients, eq(clientStaffAssignments.clientId, clients.id))
      .where(
        and(
          eq(clientStaffAssignments.staffId, staffId),
          eq(clientStaffAssignments.isActive, true),
        ),
      )
      .orderBy(desc(clientStaffAssignments.createdAt));

    return assignments
      .filter((assignment) => assignment.client !== null)
      .map((assignment) => ({
        id: assignment.id,
        clientId: assignment.clientId,
        staffId: assignment.staffId,
        assignmentType: assignment.assignmentType,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        isActive: assignment.isActive,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
        client: assignment.client!,
      }));
  }

  async getAllClientStaffAssignments(): Promise<(ClientStaffAssignment & { staff: Staff; client: Client })[]> {
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
        staff: staff,
        client: clients,
      })
      .from(clientStaffAssignments)
      .leftJoin(staff, eq(clientStaffAssignments.staffId, staff.id))
      .leftJoin(clients, eq(clientStaffAssignments.clientId, clients.id))
      .where(eq(clientStaffAssignments.isActive, true))
      .orderBy(desc(clientStaffAssignments.createdAt));

    return assignments
      .filter((assignment) => assignment.staff !== null && assignment.client !== null)
      .map((assignment) => ({
        id: assignment.id,
        clientId: assignment.clientId,
        staffId: assignment.staffId,
        assignmentType: assignment.assignmentType,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        isActive: assignment.isActive,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
        staff: assignment.staff!,
        client: assignment.client!,
      }));
  }

  async createClientStaffAssignment(
    assignment: InsertClientStaffAssignment,
  ): Promise<ClientStaffAssignment> {
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

  async updateClientStaffAssignment(
    id: string,
    assignment: Partial<InsertClientStaffAssignment>,
  ): Promise<ClientStaffAssignment> {
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
    await db
      .delete(clientStaffAssignments)
      .where(eq(clientStaffAssignments.id, id));
  }

  async deleteClientStaffAssignments(
    clientId: string,
    staffId: string,
  ): Promise<void> {
    await db
      .delete(clientStaffAssignments)
      .where(
        and(
          eq(clientStaffAssignments.clientId, clientId),
          eq(clientStaffAssignments.staffId, staffId),
        ),
      );
  }

  async getClientsWithStaff(): Promise<
    (Client & {
      staffAssignments: (ClientStaffAssignment & { staff: Staff })[];
    })[]
  > {
    // Get all clients
    const allClients = await db
      .select()
      .from(clients)
      .orderBy(desc(clients.createdAt));

    // Get all active assignments with staff info
    const assignmentsWithStaff = await db
      .select({
        assignment: clientStaffAssignments,
        staff: staff,
      })
      .from(clientStaffAssignments)
      .innerJoin(staff, eq(clientStaffAssignments.staffId, staff.id))
      .where(eq(clientStaffAssignments.isActive, true));

    // Group assignments by client
    const assignmentsByClient = new Map<
      string,
      (ClientStaffAssignment & { staff: Staff })[]
    >();
    assignmentsWithStaff.forEach(({ assignment, staff }) => {
      const clientAssignments =
        assignmentsByClient.get(assignment.clientId) || [];
      clientAssignments.push({ ...assignment, staff });
      assignmentsByClient.set(assignment.clientId, clientAssignments);
    });

    // Combine clients with their assignments
    return allClients.map((client) => ({
      ...client,
      staffAssignments: assignmentsByClient.get(client.id) || [],
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
        client: clients,
      })
      .from(timeLogs)
      .leftJoin(clients, eq(timeLogs.clientId, clients.id))
      .where(eq(timeLogs.staffId, staffId))
      .orderBy(desc(timeLogs.serviceDate));

    return logs.map(({ timeLog, client }) => ({
      ...timeLog,
      clientName: client
        ? `${client.firstName} ${client.lastName}`
        : "Unknown Client",
    }));
  }

  async getTimeLogsByStaffIdAndDateRange(
    staffId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<TimeLog[]> {
    return await db
      .select()
      .from(timeLogs)
      .where(
        and(
          eq(timeLogs.staffId, staffId),
          sql`${timeLogs.serviceDate} >= ${periodStart}`,
          sql`${timeLogs.serviceDate} <= ${periodEnd}`,
        ),
      )
      .orderBy(desc(timeLogs.serviceDate));
  }

  async createTimeLog(timeLogData: InsertTimeLog): Promise<TimeLog> {
    // Get staff hourly rate
    const [staffMember] = await db
      .select({ hourlyRate: staff.hourlyRate })
      .from(staff)
      .where(eq(staff.id, timeLogData.staffId));
    if (!staffMember) {
      throw new Error("Staff member not found");
    }

    const totalCost =
      parseFloat(timeLogData.hours) * parseFloat(staffMember.hourlyRate);

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

  async updateTimeLog(
    id: string,
    timeLogData: Partial<InsertTimeLog>,
  ): Promise<TimeLog> {
    let updateData = { ...timeLogData, updatedAt: new Date() };

    // Recalculate total cost if hours or staff changed
    if (timeLogData.hours || timeLogData.staffId) {
      const [currentLog] = await db
        .select()
        .from(timeLogs)
        .where(eq(timeLogs.id, id));
      if (!currentLog) {
        throw new Error("Time log not found");
      }

      const staffId = timeLogData.staffId || currentLog.staffId;
      const [staffMember] = await db
        .select({ hourlyRate: staff.hourlyRate })
        .from(staff)
        .where(eq(staff.id, staffId));
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
    return await db
      .select()
      .from(budgetTypes)
      .orderBy(budgetTypes.displayOrder);
  }

  async getBudgetType(id: string): Promise<BudgetType | undefined> {
    const [type] = await db
      .select()
      .from(budgetTypes)
      .where(eq(budgetTypes.id, id));
    return type;
  }

  async createBudgetCategory(
    category: InsertBudgetCategory,
  ): Promise<BudgetCategory> {
    const [newCategory] = await db
      .insert(budgetCategories)
      .values(category)
      .returning();
    return newCategory;
  }

  // Client budget allocation operations
  async getClientBudgetAllocations(
    clientId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any[]> {
    const conditions = [eq(clientBudgetAllocations.clientId, clientId)];

    // Filter allocations that overlap with the given date range
    if (startDate && endDate) {
      conditions.push(
        sql`${clientBudgetAllocations.startDate} <= ${endDate} AND ${clientBudgetAllocations.endDate} >= ${startDate}`,
      );
    }

    const results = await db
      .select({
        id: clientBudgetAllocations.id,
        clientId: clientBudgetAllocations.clientId,
        budgetTypeId: clientBudgetAllocations.budgetTypeId,
        allocatedAmount: clientBudgetAllocations.allocatedAmount,
        usedAmount: clientBudgetAllocations.usedAmount,
        startDate: clientBudgetAllocations.startDate,
        endDate: clientBudgetAllocations.endDate,
        status: clientBudgetAllocations.status,
        createdAt: clientBudgetAllocations.createdAt,
        updatedAt: clientBudgetAllocations.updatedAt,
        budgetType: {
          id: budgetTypes.id,
          code: budgetTypes.code,
          name: budgetTypes.name,
          description: budgetTypes.description,
          defaultWeekdayRate: budgetTypes.defaultWeekdayRate,
          defaultHolidayRate: budgetTypes.defaultHolidayRate,
          defaultKilometerRate: budgetTypes.defaultKilometerRate,
          canFundMileage: budgetTypes.canFundMileage,
          isActive: budgetTypes.isActive,
          displayOrder: budgetTypes.displayOrder,
        },
      })
      .from(clientBudgetAllocations)
      .leftJoin(
        budgetTypes,
        eq(clientBudgetAllocations.budgetTypeId, budgetTypes.id),
      )
      .where(and(...conditions));

    return results;
  }

  async getAllClientBudgetAllocations(
    clientId: string,
  ): Promise<ClientBudgetAllocation[]> {
    return await db
      .select()
      .from(clientBudgetAllocations)
      .where(eq(clientBudgetAllocations.clientId, clientId))
      .orderBy(desc(clientBudgetAllocations.startDate));
  }

  async createClientBudgetAllocation(
    allocation: InsertClientBudgetAllocation,
  ): Promise<ClientBudgetAllocation> {
    const [newAllocation] = await db
      .insert(clientBudgetAllocations)
      .values({
        ...allocation,
        startDate: new Date(allocation.startDate),
        endDate: new Date(allocation.endDate),
      })
      .returning();

    return newAllocation;
  }

  async updateClientBudgetAllocation(
    id: string,
    allocationData: Partial<InsertClientBudgetAllocation>,
  ): Promise<ClientBudgetAllocation> {
    const updateData: any = { ...allocationData, updatedAt: new Date() };

    // Convert date strings to Date objects if present
    if (allocationData.startDate) {
      updateData.startDate = new Date(allocationData.startDate);
    }
    if (allocationData.endDate) {
      updateData.endDate = new Date(allocationData.endDate);
    }

    const [updatedAllocation] = await db
      .update(clientBudgetAllocations)
      .set(updateData)
      .where(eq(clientBudgetAllocations.id, id))
      .returning();

    return updatedAllocation;
  }

  async deleteClientBudgetAllocation(id: string): Promise<void> {
    await db
      .delete(clientBudgetAllocations)
      .where(eq(clientBudgetAllocations.id, id));
  }

  // Helper method to update client's total budget based on active allocations
  async updateClientTotalBudget(clientId: string): Promise<void> {
    // Calculate the sum of all active allocations
    const currentDate = new Date();
    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(${clientBudgetAllocations.allocatedAmount}), 0)`,
      })
      .from(clientBudgetAllocations)
      .where(
        and(
          eq(clientBudgetAllocations.clientId, clientId),
          eq(clientBudgetAllocations.status, "active"),
          sql`${clientBudgetAllocations.startDate} <= ${currentDate} AND ${clientBudgetAllocations.endDate} >= ${currentDate}`,
        ),
      );

    const totalBudget = result[0]?.total || 0;

    // Update client's monthly budget to reflect active allocations
    await db
      .update(clients)
      .set({ monthlyBudget: totalBudget.toString() })
      .where(eq(clients.id, clientId));
  }

  // Enhanced budget credit checking and allocation logic
  async getClientAvailableBudgets(
    clientId: string,
    date?: Date,
  ): Promise<any[]> {
    // Get all budget allocations for the client with remaining balance
    // If date not specified, use current date
    const targetDate = date || new Date();

    // Get allocations that are active for the target date
    const allocations = await db
      .select({
        id: clientBudgetAllocations.id,
        budgetTypeId: clientBudgetAllocations.budgetTypeId,
        allocatedAmount: clientBudgetAllocations.allocatedAmount,
        usedAmount: clientBudgetAllocations.usedAmount,
        startDate: clientBudgetAllocations.startDate,
        endDate: clientBudgetAllocations.endDate,
        status: clientBudgetAllocations.status,
        budgetTypeName: budgetTypes.name,
        budgetTypeCode: budgetTypes.code,
        weekdayRate: budgetTypes.defaultWeekdayRate,
        holidayRate: budgetTypes.defaultHolidayRate,
        kilometerRate: budgetTypes.defaultKilometerRate,
      })
      .from(clientBudgetAllocations)
      .leftJoin(
        budgetTypes,
        eq(clientBudgetAllocations.budgetTypeId, budgetTypes.id),
      )
      .where(
        and(
          eq(clientBudgetAllocations.clientId, clientId),
          sql`${clientBudgetAllocations.startDate} <= ${targetDate} AND ${clientBudgetAllocations.endDate} >= ${targetDate}`,
          eq(clientBudgetAllocations.status, "active"),
          sql`${clientBudgetAllocations.allocatedAmount} > ${clientBudgetAllocations.usedAmount}`,
        ),
      );

    return allocations.map((allocation) => ({
      ...allocation,
      availableBalance:
        parseFloat(allocation.allocatedAmount) -
        parseFloat(allocation.usedAmount),
    }));
  }

  async checkBudgetAvailability(
    clientId: string,
    requestedAmount: number,
    date?: Date,
  ): Promise<{
    hasAvailableCredit: boolean;
    totalAvailable: number;
    allocations: any[];
    warnings: string[];
  }> {
    const availableBudgets = await this.getClientAvailableBudgets(
      clientId,
      date,
    );
    const totalAvailable = availableBudgets.reduce(
      (sum, budget) => sum + budget.availableBalance,
      0,
    );
    const warnings: string[] = [];

    // Check for warnings
    if (totalAvailable === 0) {
      warnings.push(
        "All budgets are exhausted. Direct financing required for assistance to continue.",
      );
    } else if (totalAvailable < requestedAmount) {
      warnings.push(
        `Insufficient budget. Available: €${totalAvailable.toFixed(2)}, Requested: €${requestedAmount.toFixed(2)}`,
      );
    } else if (totalAvailable < requestedAmount * 1.1) {
      warnings.push(
        "Budget is approaching the limit. Consider monitoring future expenses closely.",
      );
    }

    // Check for budgets close to exhaustion (less than 10% remaining)
    availableBudgets.forEach((budget) => {
      const utilizationRate =
        parseFloat(budget.usedAmount) / parseFloat(budget.allocatedAmount);
      if (utilizationRate > 0.9) {
        warnings.push(
          `Budget ${budget.budgetTypeName} is ${(utilizationRate * 100).toFixed(1)}% utilized`,
        );
      }
    });

    return {
      hasAvailableCredit: totalAvailable >= requestedAmount,
      totalAvailable,
      allocations: availableBudgets,
      warnings,
    };
  }

  async allocateHoursToBudgets(
    clientId: string,
    staffId: string,
    hours: number,
    serviceDate: Date,
    serviceType: string,
    mileage: number = 0,
    notes?: string,
    preferredBudgetId?: string,
    scheduledStartTime?: Date,
    scheduledEndTime?: Date,
  ): Promise<{
    success: boolean;
    timeLogId?: string;
    allocations: any[];
    totalCost: number;
    warnings: string[];
    receipt?: any;
  }> {
    const isHoliday = this.isHolidayOrSunday(serviceDate);

    let availableBudgets;

    // If a specific budget is preferred, try to use it
    if (preferredBudgetId) {
      // Get the specific budget allocation
      const preferredBudget = await db
        .select({
          id: clientBudgetAllocations.id,
          budgetTypeId: clientBudgetAllocations.budgetTypeId,
          allocatedAmount: clientBudgetAllocations.allocatedAmount,
          usedAmount: clientBudgetAllocations.usedAmount,
          startDate: clientBudgetAllocations.startDate,
          endDate: clientBudgetAllocations.endDate,
          budgetTypeName: budgetTypes.name,
          budgetTypeCode: budgetTypes.code,
          weekdayRate: budgetTypes.defaultWeekdayRate,
          holidayRate: budgetTypes.defaultHolidayRate,
          kilometerRate: budgetTypes.defaultKilometerRate,
        })
        .from(clientBudgetAllocations)
        .leftJoin(
          budgetTypes,
          eq(clientBudgetAllocations.budgetTypeId, budgetTypes.id),
        )
        .where(
          and(
            eq(clientBudgetAllocations.id, preferredBudgetId),
            eq(clientBudgetAllocations.clientId, clientId),
          ),
        )
        .limit(1);

      if (preferredBudget.length > 0) {
        availableBudgets = preferredBudget.map((allocation) => ({
          ...allocation,
          availableBalance:
            parseFloat(allocation.allocatedAmount) -
            parseFloat(allocation.usedAmount),
        }));
      } else {
        // Fall back to date-based search
        availableBudgets = await this.getClientAvailableBudgets(
          clientId,
          serviceDate,
        );
      }
    } else {
      // Get available budgets for the client based on service date
      availableBudgets = await this.getClientAvailableBudgets(
        clientId,
        serviceDate,
      );
    }

    if (availableBudgets.length === 0) {
      return {
        success: false,
        allocations: [],
        totalCost: 0,
        warnings: ["No available budgets found. Direct financing is required."],
      };
    }

    // Calculate costs for each budget
    const budgetCosts = availableBudgets.map((budget) => {
      // Default rates if not set in budget type
      const defaultWeekdayRate = 20;
      const defaultHolidayRate = 25;
      const defaultKilometerRate = 0.5;

      const hourlyRate = isHoliday
        ? parseFloat(budget.holidayRate || defaultHolidayRate)
        : parseFloat(budget.weekdayRate || defaultWeekdayRate);
      const mileageCost =
        mileage * parseFloat(budget.kilometerRate || defaultKilometerRate);
      const hourCost = hours * hourlyRate;
      const totalCost = hourCost + mileageCost;

      console.log("Budget calculation:", {
        budgetId: budget.id,
        budgetCode: budget.budgetTypeCode,
        availableBalance: budget.availableBalance,
        hourlyRate,
        hours,
        totalCost,
        canCover: budget.availableBalance >= totalCost,
      });

      return {
        ...budget,
        hourlyRate,
        hourCost,
        mileageCost,
        totalCost,
        canCover: budget.availableBalance >= totalCost,
      };
    });

    // Find budgets that can cover the full cost (priority allocation)
    const viableBudgets = budgetCosts.filter((b) => b.canCover);

    if (viableBudgets.length === 0) {
      // No single budget can cover - need to split or create overage
      // But if a specific budget was selected, force use it and handle overage
      if (preferredBudgetId && budgetCosts.length > 0) {
        const selectedBudget = budgetCosts[0]; // Use the selected budget even if insufficient
        return await this.handleBudgetShortfallWithTimeLog(
          clientId,
          staffId,
          hours,
          serviceDate,
          serviceType,
          selectedBudget,
          mileage,
          notes,
          scheduledStartTime,
          scheduledEndTime,
        );
      }
      return await this.handleBudgetShortfall(
        clientId,
        staffId,
        hours,
        serviceDate,
        serviceType,
        budgetCosts,
        mileage,
        notes,
      );
    }

    // Use the first viable budget (could implement priority logic here)
    const selectedBudget = viableBudgets[0];

    // Create time log entry
    const timeLog = await this.createTimeLog({
      clientId,
      staffId,
      serviceDate,
      scheduledStartTime: scheduledStartTime || serviceDate,
      scheduledEndTime:
        scheduledEndTime ||
        new Date(serviceDate.getTime() + hours * 60 * 60 * 1000),
      hours: hours.toString(),
      serviceType,
      hourlyRate: selectedBudget.hourlyRate.toString(),
      totalCost: selectedBudget.totalCost.toString(),
      mileage: mileage.toString(),
      notes,
    });

    // Update budget usage
    await this.updateBudgetUsage(selectedBudget.id, selectedBudget.totalCost);

    // Create budget expense record
    await this.createBudgetExpense({
      clientId,
      budgetTypeId: selectedBudget.budgetTypeId,
      allocationId: selectedBudget.id,
      amount: selectedBudget.totalCost.toString(),
      description: `Service: ${serviceType} - ${hours}h${mileage ? ` + ${mileage}km` : ""}`,
      expenseDate: serviceDate,
      timeLogId: timeLog.id,
    });

    return {
      success: true,
      timeLogId: timeLog.id,
      allocations: [
        {
          budgetType: selectedBudget.budgetTypeName,
          budgetCode: selectedBudget.budgetTypeCode,
          amount: selectedBudget.totalCost,
          hours: hours,
          hourlyRate: selectedBudget.hourlyRate,
          mileage: mileage,
          mileageCost: selectedBudget.mileageCost,
        },
      ],
      totalCost: selectedBudget.totalCost,
      warnings: [],
    };
  }

  private async handleBudgetShortfallWithTimeLog(
    clientId: string,
    staffId: string,
    hours: number,
    serviceDate: Date,
    serviceType: string,
    selectedBudget: any,
    mileage: number,
    notes?: string,
    scheduledStartTime?: Date,
    scheduledEndTime?: Date,
  ): Promise<any> {
    // Create time log entry even with insufficient budget
    const timeLog = await this.createTimeLog({
      clientId,
      staffId,
      serviceDate,
      scheduledStartTime: scheduledStartTime || serviceDate,
      scheduledEndTime:
        scheduledEndTime ||
        new Date(serviceDate.getTime() + hours * 60 * 60 * 1000),
      hours: hours.toString(),
      serviceType,
      hourlyRate: selectedBudget.hourlyRate.toString(),
      totalCost: selectedBudget.totalCost.toString(),
      mileage: mileage.toString(),
      notes: notes
        ? `${notes} (OVERAGE: Budget exceeded)`
        : "OVERAGE: Budget exceeded",
    });

    // Update budget usage even if it goes negative
    const availableAmount = Math.max(0, selectedBudget.availableBalance);
    if (availableAmount > 0) {
      await this.updateBudgetUsage(selectedBudget.id, availableAmount);
    }

    const overage = selectedBudget.totalCost - availableAmount;

    return {
      success: true,
      timeLogId: timeLog.id,
      allocations: [
        {
          budgetId: selectedBudget.id,
          budgetCode: selectedBudget.budgetTypeCode,
          amount: availableAmount,
          overage: overage,
        },
      ],
      totalCost: selectedBudget.totalCost,
      warnings:
        overage > 0
          ? [
              `Budget exceeded by €${overage.toFixed(2)}`,
              "Time entry saved with overage notation",
              "Receipt generation recommended",
            ]
          : [],
      receipt:
        overage > 0
          ? {
              required: true,
              amount: overage,
              reason: "Budget overage",
            }
          : undefined,
    };
  }

  private async handleBudgetShortfall(
    clientId: string,
    staffId: string,
    hours: number,
    serviceDate: Date,
    serviceType: string,
    budgetCosts: any[],
    mileage: number,
    notes?: string,
  ): Promise<any> {
    const totalNeeded = budgetCosts[0]?.totalCost || 0;
    const totalAvailable = budgetCosts.reduce(
      (sum, b) => sum + Math.max(0, b.availableBalance),
      0,
    );
    const shortfall = totalNeeded - totalAvailable;

    if (totalAvailable > 0) {
      // Partial coverage - split across available budgets and create overage
      return await this.splitAcrossBudgets(
        clientId,
        staffId,
        hours,
        serviceDate,
        serviceType,
        budgetCosts,
        mileage,
        shortfall,
        notes,
      );
    } else {
      // No available budget - require direct financing
      return {
        success: false,
        allocations: [],
        totalCost: totalNeeded,
        warnings: [
          "All budgets are exhausted. Direct financing of €" +
            totalNeeded.toFixed(2) +
            " is required.",
          "A receipt must be issued for the full amount.",
        ],
        receipt: {
          required: true,
          amount: totalNeeded,
          reason: "Budget exhaustion - Direct financing",
        },
      };
    }
  }

  private async splitAcrossBudgets(
    clientId: string,
    staffId: string,
    hours: number,
    serviceDate: Date,
    serviceType: string,
    budgetCosts: any[],
    mileage: number,
    overage: number,
    notes?: string,
  ): Promise<any> {
    const allocations: any[] = [];
    let totalAllocated = 0;

    // Create time log for the service
    const avgRate =
      budgetCosts.reduce((sum, b) => sum + b.hourlyRate, 0) /
      budgetCosts.length;
    const totalCost = budgetCosts[0]?.totalCost || 0;

    const timeLog = await this.createTimeLog({
      clientId,
      staffId,
      serviceDate,
      hours: hours.toString(),
      serviceType,
      hourlyRate: avgRate.toString(),
      totalCost: totalCost.toString(),
      mileage: mileage.toString(),
      notes,
    });

    // Allocate from available budgets
    for (const budget of budgetCosts.filter((b) => b.availableBalance > 0)) {
      const allocationAmount = Math.min(
        budget.availableBalance,
        totalCost - totalAllocated,
      );

      if (allocationAmount > 0) {
        await this.updateBudgetUsage(budget.id, allocationAmount);
        await this.createBudgetExpense({
          clientId,
          budgetTypeId: budget.budgetTypeId,
          allocationId: budget.id,
          amount: allocationAmount.toString(),
          description: `Partial service: ${serviceType} - ${hours}h (split allocation)`,
          expenseDate: serviceDate,
          timeLogId: timeLog.id,
        });

        allocations.push({
          budgetType: budget.budgetTypeName,
          budgetCode: budget.budgetTypeCode,
          amount: allocationAmount,
          portion: ((allocationAmount / totalCost) * 100).toFixed(1) + "%",
        });

        totalAllocated += allocationAmount;
      }
    }

    return {
      success: true,
      timeLogId: timeLog.id,
      allocations,
      totalCost,
      warnings: [
        `Service cost split across ${allocations.length} budgets.`,
        `Overage of €${overage.toFixed(2)} requires direct payment and receipt.`,
      ],
      receipt:
        overage > 0
          ? {
              required: true,
              amount: overage,
              reason: "Budget overage",
            }
          : undefined,
    };
  }

  private async updateBudgetUsage(
    allocationId: string,
    amount: number,
  ): Promise<void> {
    await db
      .update(clientBudgetAllocations)
      .set({
        usedAmount: sql`${clientBudgetAllocations.usedAmount} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(clientBudgetAllocations.id, allocationId));
  }

  private isHolidayOrSunday(date: Date): boolean {
    // Check if it's Sunday (Italian business rule: Sunday is always a holiday)
    if (date.getDay() === 0) {
      return true;
    }

    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    // Fixed Italian holidays
    const holidays = [
      { month: 0, day: 1 },   // Capodanno
      { month: 0, day: 6 },   // Epifania
      { month: 3, day: 25 },  // Festa della Liberazione
      { month: 4, day: 1 },   // Festa del Lavoro
      { month: 4, day: 15 },  // San Simplicio - Patrono di Olbia
      { month: 5, day: 2 },   // Festa della Repubblica
      { month: 7, day: 15 },  // Ferragosto
      { month: 10, day: 1 },  // Ognissanti
      { month: 11, day: 6 },  // San Nicola - Patrono di Sassari
      { month: 11, day: 8 },  // Immacolata Concezione
      { month: 11, day: 25 }, // Natale
      { month: 11, day: 26 }, // Santo Stefano
    ];

    // Check fixed holidays
    for (const holiday of holidays) {
      if (month === holiday.month && day === holiday.day) {
        return true;
      }
    }

    // Calculate Easter and Easter Monday
    const easter = this.calculateEaster(year);
    const easterMonday = new Date(easter);
    easterMonday.setDate(easter.getDate() + 1);

    // Check if it's Easter or Easter Monday
    if (
      (month === easter.getMonth() && day === easter.getDate()) ||
      (month === easterMonday.getMonth() && day === easterMonday.getDate())
    ) {
      return true;
    }

    return false;
  }

  private calculateEaster(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    
    return new Date(year, month, day);
  }

  // Budget expense operations
  async getBudgetExpenses(
    clientId?: string,
    budgetTypeId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<BudgetExpense[]> {
    const conditions = [];
    if (clientId) conditions.push(eq(budgetExpenses.clientId, clientId));
    if (budgetTypeId)
      conditions.push(eq(budgetExpenses.budgetTypeId, budgetTypeId));
    if (startDate && endDate) {
      conditions.push(
        sql`${budgetExpenses.expenseDate} >= ${startDate} AND ${budgetExpenses.expenseDate} <= ${endDate}`,
      );
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

  async createBudgetExpense(
    expense: InsertBudgetExpense,
  ): Promise<BudgetExpense> {
    // Convert expenseDate string to Date object
    const expenseData = {
      ...expense,
      expenseDate: new Date(expense.expenseDate),
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
          updatedAt: new Date(),
        })
        .where(eq(clientBudgetAllocations.id, expense.allocationId));
    }

    return newExpense;
  }

  async updateBudgetExpense(
    id: string,
    expenseData: Partial<InsertBudgetExpense>,
  ): Promise<BudgetExpense> {
    // Get current expense to adjust allocation amounts
    const [currentExpense] = await db
      .select()
      .from(budgetExpenses)
      .where(eq(budgetExpenses.id, id));
    if (!currentExpense) {
      throw new Error("Budget expense not found");
    }

    // Convert expenseDate string to Date object if provided
    const updateData: any = {
      ...expenseData,
      updatedAt: new Date(),
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
      const newAmount = expenseData.amount
        ? parseFloat(expenseData.amount)
        : oldAmount;
      const amountDiff = newAmount - oldAmount;

      // If allocation changed, subtract from old and add to new
      if (
        expenseData.allocationId &&
        expenseData.allocationId !== currentExpense.allocationId
      ) {
        // Subtract full old amount from old allocation
        if (currentExpense.allocationId) {
          await db
            .update(clientBudgetAllocations)
            .set({
              usedAmount: sql`${clientBudgetAllocations.usedAmount} - ${oldAmount}`,
              updatedAt: new Date(),
            })
            .where(eq(clientBudgetAllocations.id, currentExpense.allocationId));
        }

        // Add full new amount to new allocation
        await db
          .update(clientBudgetAllocations)
          .set({
            usedAmount: sql`${clientBudgetAllocations.usedAmount} + ${newAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(clientBudgetAllocations.id, expenseData.allocationId));
      } else if (amountDiff !== 0 && currentExpense.allocationId) {
        // Just update the amount difference
        await db
          .update(clientBudgetAllocations)
          .set({
            usedAmount: sql`${clientBudgetAllocations.usedAmount} + ${amountDiff}`,
            updatedAt: new Date(),
          })
          .where(eq(clientBudgetAllocations.id, currentExpense.allocationId));
      }
    }

    return updatedExpense;
  }

  async deleteBudgetExpense(id: string): Promise<void> {
    // Get expense to update allocation
    const [expense] = await db
      .select()
      .from(budgetExpenses)
      .where(eq(budgetExpenses.id, id));
    if (expense && expense.allocationId) {
      const expenseAmount = parseFloat(expense.amount);
      await db
        .update(clientBudgetAllocations)
        .set({
          usedAmount: sql`${clientBudgetAllocations.usedAmount} - ${expenseAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(clientBudgetAllocations.id, expense.allocationId));
    }

    await db.delete(budgetExpenses).where(eq(budgetExpenses.id, id));
  }

  // Budget analysis
  async getBudgetAnalysis(
    clientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
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
    // Get allocations for the specified date range with budget types
    const allocations = await db
      .select({
        allocation: clientBudgetAllocations,
        budgetType: budgetTypes,
      })
      .from(clientBudgetAllocations)
      .innerJoin(
        budgetTypes,
        eq(clientBudgetAllocations.budgetTypeId, budgetTypes.id),
      )
      .where(
        and(
          eq(clientBudgetAllocations.clientId, clientId),
          sql`${clientBudgetAllocations.startDate} <= ${endDate} AND ${clientBudgetAllocations.endDate} >= ${startDate}`,
        ),
      )
      .orderBy(budgetTypes.displayOrder);

    // Get expenses grouped by allocation
    const expensesByAllocation = await db
      .select({
        allocationId: budgetExpenses.allocationId,
        total: sql<number>`SUM(${budgetExpenses.amount})::numeric`,
      })
      .from(budgetExpenses)
      .where(
        and(
          eq(budgetExpenses.clientId, clientId),
          sql`${budgetExpenses.expenseDate} >= ${startDate} AND ${budgetExpenses.expenseDate} <= ${endDate}`,
        ),
      )
      .groupBy(budgetExpenses.allocationId);

    const expenseMap = new Map(
      expensesByAllocation.map((e) => [
        e.allocationId,
        parseFloat(e.total?.toString() || "0"),
      ]),
    );

    // Group allocations by budget type
    const budgetTypeMap = new Map<
      string,
      {
        budgetType: BudgetType;
        allocations: Array<{
          id: string;
          allocated: number;
          spent: number;
          remaining: number;
          percentage: number;
        }>;
      }
    >();

    allocations.forEach(({ allocation, budgetType }) => {
      const allocated = parseFloat(allocation.allocatedAmount);
      // Use the used_amount field which tracks actual usage
      const spent = parseFloat(allocation.usedAmount);
      const remaining = allocated - spent;
      const percentage = allocated > 0 ? (spent / allocated) * 100 : 0;

      const allocationData = {
        id: allocation.id,
        allocated,
        spent,
        remaining,
        percentage,
      };

      if (budgetTypeMap.has(budgetType.id)) {
        budgetTypeMap.get(budgetType.id)!.allocations.push(allocationData);
      } else {
        budgetTypeMap.set(budgetType.id, {
          budgetType,
          allocations: [allocationData],
        });
      }
    });

    // Calculate totals for each budget type
    const budgetTypesList = Array.from(budgetTypeMap.values()).map(
      ({ budgetType, allocations }) => {
        const totalAllocated = allocations.reduce(
          (sum, a) => sum + a.allocated,
          0,
        );
        const totalSpent = allocations.reduce((sum, a) => sum + a.spent, 0);
        const totalRemaining = allocations.reduce(
          (sum, a) => sum + a.remaining,
          0,
        );
        const percentage =
          totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

        return {
          budgetType,
          allocations,
          totalAllocated,
          totalSpent,
          totalRemaining,
          percentage,
        };
      },
    );

    const totals = budgetTypesList.reduce(
      (acc, item) => ({
        totalAllocated: acc.totalAllocated + item.totalAllocated,
        totalSpent: acc.totalSpent + item.totalSpent,
        totalRemaining: acc.totalRemaining + item.totalRemaining,
      }),
      { totalAllocated: 0, totalSpent: 0, totalRemaining: 0 },
    );

    return {
      budgetTypes: budgetTypesList,
      ...totals,
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
          sql`${timeLogs.serviceDate} <= ${endOfMonth}`,
        ),
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

  async updateDataImport(
    id: string,
    importData: Partial<InsertExcelImport>,
  ): Promise<ExcelImport> {
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
    return await db
      .select()
      .from(excelImports)
      .orderBy(desc(excelImports.createdAt));
  }

  async getExcelData(importId: string): Promise<any[]> {
    return await db
      .select()
      .from(excelData)
      .where(eq(excelData.importId, importId));
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
    };
  }> {
    // Get unique clients from the import data
    const importData = await this.getExcelDataByImportId(importId);
    const uniqueClients = new Map();

    importData.forEach((row) => {
      const firstName = row.assistedPersonFirstName?.trim();
      const lastName = row.assistedPersonLastName?.trim();

      if (!firstName) return;

      const clientKey = `${firstName}_${lastName || ""}`.toLowerCase();
      if (!uniqueClients.has(clientKey)) {
        uniqueClients.set(clientKey, {
          firstName,
          lastName: lastName || "",
        });
      }
    });

    const totalClients = uniqueClients.size;
    if (totalClients === 0) {
      return { status: "no_clients", syncedCount: 0, totalClients: 0 };
    }

    // Check how many of these clients exist in our clients table
    let syncedCount = 0;
    const clientsArray = Array.from(uniqueClients.values());
    for (const client of clientsArray) {
      const existingClient = await this.findClientByNameOrEmail(
        client.firstName,
        client.lastName,
        "", // No email in import data
      );
      if (existingClient) {
        syncedCount++;
      }
    }

    let status = "not_synced";
    if (syncedCount === totalClients) {
      status = "fully_synced";
    } else if (syncedCount > 0) {
      status = "partially_synced";
    }

    // Check if there's an active time logs sync in progress
    const timeLogsSyncStatus = (global as any).timeLogsSyncProgress?.[importId];

    return {
      status,
      syncedCount,
      totalClients,
      timeLogsSync: timeLogsSyncStatus,
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
    const plansWithDetails = await Promise.all(
      plans.map(async (plan) => {
        const budgetConfigs = await this.getClientBudgetConfigs(plan.clientId);

        // Determine status based on dates
        const now = new Date();
        const startDate = new Date(plan.startDate);
        const endDate = new Date(plan.endDate);
        let status = plan.status;

        if (status === "active" && now > endDate) {
          status = "expired";
        }

        const clientName =
          plan.clientFirstName && plan.clientLastName
            ? `${plan.clientFirstName} ${plan.clientLastName}`.trim()
            : "Unknown Client";

        const planName = plan.startDate
          ? `Plan ${format(startDate, "MMM yyyy")}`
          : "Unnamed Plan";

        console.log("Plan details:", {
          id: plan.id,
          clientFirstName: plan.clientFirstName,
          clientLastName: plan.clientLastName,
          clientName,
          planName,
          startDate: plan.startDate,
        });

        return {
          ...plan,
          clientName,
          planName,
          validFrom: plan.startDate,
          validTo: plan.endDate,
          status,
          budgetConfigs: budgetConfigs
            .filter(
              (config: any) =>
                plan.selectedBudgets &&
                (plan.selectedBudgets as string[]).includes(config.budgetCode),
            )
            .map((config: any) => ({
              budgetCode: config.budgetCode,
              budgetName: config.budgetName,
              availableBalance: config.availableBalance,
              weekdayRate: config.weekdayRate,
              holidayRate: config.holidayRate,
            })),
        };
      }),
    );

    return plansWithDetails;
  }

  async getHomeCarePlan(id: string): Promise<HomeCarePlan | undefined> {
    const [plan] = await db
      .select()
      .from(homeCarePlans)
      .where(eq(homeCarePlans.id, id));
    return plan;
  }

  async createHomeCarePlan(
    planData: InsertHomeCarePlan,
  ): Promise<HomeCarePlan> {
    const [plan] = await db
      .insert(homeCarePlans)
      .values({
        ...planData,
        startDate: new Date(planData.startDate),
        endDate: new Date(planData.endDate),
      })
      .returning();
    return plan;
  }

  async updateHomeCarePlan(
    id: string,
    planData: Partial<InsertHomeCarePlan>,
  ): Promise<HomeCarePlan> {
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
        budgetName: budgetTypes.name,
      })
      .from(clientBudgetConfigs)
      .leftJoin(
        budgetTypes,
        eq(clientBudgetConfigs.budgetTypeId, budgetTypes.id),
      )
      .where(eq(clientBudgetConfigs.clientId, clientId))
      .orderBy(budgetTypes.displayOrder);

    return configs;
  }

  async getClientBudgetConfig(
    id: string,
  ): Promise<ClientBudgetConfig | undefined> {
    const [config] = await db
      .select()
      .from(clientBudgetConfigs)
      .where(eq(clientBudgetConfigs.id, id));
    return config;
  }

  async createClientBudgetConfig(
    configData: InsertClientBudgetConfig,
  ): Promise<ClientBudgetConfig> {
    const [config] = await db
      .insert(clientBudgetConfigs)
      .values({
        ...configData,
        validFrom: new Date(configData.validFrom),
        validTo: new Date(configData.validTo),
      })
      .returning();
    return config;
  }

  async updateClientBudgetConfig(
    id: string,
    configData: Partial<InsertClientBudgetConfig>,
  ): Promise<ClientBudgetConfig> {
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
    await db
      .delete(clientBudgetConfigs)
      .where(eq(clientBudgetConfigs.clientId, clientId));
  }

  async initializeClientBudgets(clientId: string): Promise<void> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get all budget allocations for this client
    const allocations = await this.getAllClientBudgetAllocations(clientId);

    // Get all budget types
    const types = await db
      .select()
      .from(budgetTypes)
      .orderBy(budgetTypes.displayOrder);

    for (const budgetType of types) {
      // Check if there's an allocation for this budget type
      const allocation = allocations.find(
        (a) => a.budgetTypeId === budgetType.id,
      );

      if (allocation && parseFloat(allocation.allocatedAmount) > 0) {
        const remaining =
          parseFloat(allocation.allocatedAmount) -
          parseFloat(allocation.usedAmount || "0");

        // Create config for budget types that have allocations
        await this.createClientBudgetConfig({
          clientId,
          budgetTypeId: budgetType.id,
          validFrom: startOfMonth.toISOString(),
          validTo: endOfMonth.toISOString(),
          weekdayRate: budgetType.defaultWeekdayRate || "15.00",
          holidayRate: budgetType.defaultHolidayRate || "20.00",
          kilometerRate: budgetType.defaultKilometerRate || "0.00",
          availableBalance: remaining.toFixed(2),
        });
      }
    }
  }

  async getDurationStatistics(year?: number): Promise<any> {
    try {
      // Build conditions based on year filter
      const conditions = [];
      if (year) {
        conditions.push(
          sql`EXTRACT(YEAR FROM ${timeLogs.serviceDate}) = ${year}`,
        );
      }

      // Get overall statistics
      const overallStats = await db
        .select({
          totalRecords: sql<number>`COUNT(*)`,
          totalHours: sql<number>`COALESCE(SUM(${timeLogs.hours}), 0)`,
          averageHours: sql<number>`COALESCE(AVG(${timeLogs.hours}), 0)`,
          uniqueClients: sql<number>`COUNT(DISTINCT ${timeLogs.clientId})`,
          uniqueOperators: sql<number>`COUNT(DISTINCT ${timeLogs.staffId})`,
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
          operators: sql<number>`COUNT(DISTINCT ${timeLogs.staffId})`,
        })
        .from(timeLogs)
        .groupBy(sql`EXTRACT(YEAR FROM ${timeLogs.serviceDate})`)
        .orderBy(sql`EXTRACT(YEAR FROM ${timeLogs.serviceDate})`);

      // Get monthly data for selected year or all time
      const monthlyData = await db
        .select({
          month: sql<string>`TO_CHAR(${timeLogs.serviceDate}, 'YYYY-MM')`,
          records: sql<number>`COUNT(*)`,
          hours: sql<number>`COALESCE(SUM(${timeLogs.hours}), 0)`,
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
          services: sql<number>`COUNT(*)`,
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
          services: sql<number>`COUNT(*)`,
        })
        .from(timeLogs)
        .leftJoin(clients, eq(timeLogs.clientId, clients.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(clients.id, clients.firstName, clients.lastName)
        .orderBy(sql`SUM(${timeLogs.hours}) DESC`)
        .limit(10);

      // Get service distribution by duration ranges - Fixed groupBy issue
      const serviceDistribution = await db
        .select({
          range: sql<string>`
            CASE 
              WHEN MIN(${timeLogs.hours}) < 1 THEN '<1h'
              WHEN MIN(${timeLogs.hours}) < 2 THEN '1-2h'
              WHEN MIN(${timeLogs.hours}) < 4 THEN '2-4h'
              WHEN MIN(${timeLogs.hours}) < 8 THEN '4-8h'
              ELSE '8h+'
            END
          `,
          count: sql<number>`COUNT(*)`,
        })
        .from(timeLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(sql`
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
        serviceDistribution,
      };
    } catch (error) {
      console.error("Error fetching duration statistics:", error);
      throw error;
    }
  }

  // Comprehensive Statistics
  async getComprehensiveStatistics(range: string): Promise<any> {
    try {
      // Calculate date range
      const endDate = new Date();
      let startDate = new Date();
      
      switch(range) {
        case 'last7days':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'last30days':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case 'last3months':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case 'last6months':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case 'lastyear':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Get previous period for comparison
      const periodLength = endDate.getTime() - startDate.getTime();
      const prevEndDate = new Date(startDate);
      const prevStartDate = new Date(startDate.getTime() - periodLength);

      // Overall statistics
      const [currentStats] = await db
        .select({
          totalRevenue: sql<number>`COALESCE(SUM(${timeLogs.totalCost}), 0)`,
          totalHours: sql<number>`COALESCE(SUM(${timeLogs.hours}), 0)`,
          totalServices: sql<number>`COUNT(*)`,
          avgServiceDuration: sql<number>`COALESCE(AVG(${timeLogs.hours}), 0)`,
        })
        .from(timeLogs)
        .where(and(
          gte(timeLogs.serviceDate, startDate),
          lte(timeLogs.serviceDate, endDate)
        ));

      const [prevStats] = await db
        .select({
          totalRevenue: sql<number>`COALESCE(SUM(${timeLogs.totalCost}), 0)`,
          totalHours: sql<number>`COALESCE(SUM(${timeLogs.hours}), 0)`,
          totalServices: sql<number>`COUNT(*)`,
        })
        .from(timeLogs)
        .where(and(
          gte(timeLogs.serviceDate, prevStartDate),
          lte(timeLogs.serviceDate, prevEndDate)
        ));

      // Active clients and staff
      const [activeStats] = await db
        .select({
          activeClients: sql<number>`COUNT(DISTINCT ${timeLogs.clientId})`,
          activeStaff: sql<number>`COUNT(DISTINCT ${timeLogs.staffId})`,
        })
        .from(timeLogs)
        .where(and(
          gte(timeLogs.serviceDate, startDate),
          lte(timeLogs.serviceDate, endDate)
        ));

      // Revenue by month - using raw SQL to avoid groupBy issues
      const revenueByMonth = await db.execute(sql`
        SELECT 
          TO_CHAR(service_date, 'Mon YYYY') as month,
          COALESCE(SUM(total_cost), 0)::numeric as revenue,
          COALESCE(SUM(hours), 0)::numeric as hours,
          COUNT(*)::integer as services
        FROM time_logs
        WHERE service_date >= ${startDate} 
          AND service_date <= ${endDate}
        GROUP BY TO_CHAR(service_date, 'Mon YYYY'), TO_CHAR(service_date, 'YYYY-MM')
        ORDER BY TO_CHAR(service_date, 'YYYY-MM')
      `);

      // Services by week - using raw SQL
      const servicesByWeek = await db.execute(sql`
        SELECT 
          TO_CHAR(service_date, 'W') as week,
          COUNT(*)::integer as count
        FROM time_logs
        WHERE service_date >= ${startDate}
          AND service_date <= ${endDate}
        GROUP BY TO_CHAR(service_date, 'W')
        ORDER BY TO_CHAR(service_date, 'W')
      `);

      // Top clients - using raw SQL
      const topClients = await db.execute(sql`
        SELECT 
          c.id,
          CONCAT(c.first_name, ' ', c.last_name) as name,
          COALESCE(SUM(t.total_cost), 0)::numeric as revenue,
          COALESCE(SUM(t.hours), 0)::numeric as hours,
          COUNT(*)::integer as services
        FROM time_logs t
        LEFT JOIN clients c ON t.client_id = c.id
        WHERE t.service_date >= ${startDate}
          AND t.service_date <= ${endDate}
        GROUP BY c.id, c.first_name, c.last_name
        ORDER BY SUM(t.total_cost) DESC
        LIMIT 10
      `);

      // Top staff - using raw SQL
      const topStaff = await db.execute(sql`
        SELECT 
          s.id,
          CONCAT(s.first_name, ' ', s.last_name) as name,
          COALESCE(SUM(t.total_cost), 0)::numeric as revenue,
          COALESCE(SUM(t.hours), 0)::numeric as hours,
          COUNT(*)::integer as services
        FROM time_logs t
        LEFT JOIN staff s ON t.staff_id = s.id
        WHERE t.service_date >= ${startDate}
          AND t.service_date <= ${endDate}
        GROUP BY s.id, s.first_name, s.last_name
        ORDER BY SUM(t.total_cost) DESC
        LIMIT 10
      `);

      // Services by type - using raw SQL
      const servicesData = await db.execute(sql`
        SELECT 
          c.service_type as type,
          COUNT(*)::integer as count,
          COALESCE(SUM(t.total_cost), 0)::numeric as revenue
        FROM time_logs t
        LEFT JOIN clients c ON t.client_id = c.id
        WHERE t.service_date >= ${startDate}
          AND t.service_date <= ${endDate}
        GROUP BY c.service_type
      `);

      const totalRevenue = currentStats.totalRevenue || 0;
      const servicesByType = (servicesData.rows || []).map(service => ({
        type: service.type || 'Unknown',
        count: service.count,
        revenue: service.revenue,
        percentage: totalRevenue > 0 ? (service.revenue / totalRevenue * 100) : 0
      }));

      // Services by category - using raw SQL
      const servicesByCategory = await db.execute(sql`
        SELECT 
          s.category,
          COUNT(*)::integer as count,
          COALESCE(SUM(t.hours), 0)::numeric as hours
        FROM time_logs t
        LEFT JOIN staff s ON t.staff_id = s.id
        WHERE t.service_date >= ${startDate}
          AND t.service_date <= ${endDate}
        GROUP BY s.category
      `);

      // Budget utilization - using raw SQL
      const budgetUtilization = await db.execute(sql`
        SELECT 
          bt.name as category,
          COALESCE(SUM(cba.allocated_amount), 0)::numeric as allocated,
          COALESCE(SUM(cba.used_amount), 0)::numeric as used
        FROM client_budget_allocations cba
        LEFT JOIN budget_types bt ON cba.budget_type_id = bt.id
        GROUP BY bt.name
      `);

      const budgetWithPercentage = (budgetUtilization.rows || []).map(budget => ({
        ...budget,
        percentage: budget.allocated > 0 ? (budget.used / budget.allocated * 100) : 0
      }));

      // Calculate month-over-month changes
      const monthOverMonth = {
        revenue: {
          current: currentStats.totalRevenue || 0,
          previous: prevStats.totalRevenue || 0,
          change: prevStats.totalRevenue > 0 
            ? ((currentStats.totalRevenue - prevStats.totalRevenue) / prevStats.totalRevenue * 100)
            : 0
        },
        services: {
          current: currentStats.totalServices || 0,
          previous: prevStats.totalServices || 0,
          change: prevStats.totalServices > 0
            ? ((currentStats.totalServices - prevStats.totalServices) / prevStats.totalServices * 100)
            : 0
        },
        hours: {
          current: currentStats.totalHours || 0,
          previous: prevStats.totalHours || 0,
          change: prevStats.totalHours > 0
            ? ((currentStats.totalHours - prevStats.totalHours) / prevStats.totalHours * 100)
            : 0
        }
      };

      return {
        totalRevenue: currentStats.totalRevenue || 0,
        totalHours: currentStats.totalHours || 0,
        totalServices: currentStats.totalServices || 0,
        activeClients: activeStats.activeClients || 0,
        activeStaff: activeStats.activeStaff || 0,
        avgServiceDuration: currentStats.avgServiceDuration || 0,
        revenueByMonth: revenueByMonth.rows || [],
        servicesByWeek: servicesByWeek.rows || [],
        topClients: topClients.rows || [],
        topStaff: topStaff.rows || [],
        servicesByType: servicesByType || [],
        servicesByCategory: servicesByCategory.rows || [],
        budgetUtilization: budgetWithPercentage || [],
        monthOverMonth
      };
    } catch (error) {
      console.error("Error fetching comprehensive statistics:", error);
      throw error;
    }
  }

  // Service Categories
  async getServiceCategories() {
    const result = await db.query.serviceCategories.findMany({
      orderBy: (categories, { asc }) => [
        asc(categories.displayOrder),
        asc(categories.name),
      ],
    });
    return result;
  }

  async createServiceCategory(data: any) {
    const [category] = await db
      .insert(serviceCategories)
      .values({
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return category;
  }

  async updateServiceCategory(id: string, data: any) {
    const [category] = await db
      .update(serviceCategories)
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
    const result = await db
      .select({
        id: serviceTypes.id,
        categoryId: serviceTypes.categoryId,
        code: serviceTypes.code,
        name: serviceTypes.name,
        description: serviceTypes.description,
        defaultRate: serviceTypes.defaultRate,
        isActive: serviceTypes.isActive,
        displayOrder: serviceTypes.displayOrder,
        categoryName: serviceCategories.name,
      })
      .from(serviceTypes)
      .leftJoin(
        serviceCategories,
        eq(serviceTypes.categoryId, serviceCategories.id),
      )
      .orderBy(asc(serviceTypes.displayOrder), asc(serviceTypes.name));

    return result;
  }

  async createServiceType(data: any) {
    const [type] = await db
      .insert(serviceTypes)
      .values({
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return type;
  }

  async updateServiceType(id: string, data: any) {
    const [type] = await db
      .update(serviceTypes)
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
    const [category] = await db
      .update(budgetCategories)
      .set(data)
      .where(eq(budgetCategories.id, id))
      .returning();
    return category;
  }

  // Budget Types
  async createBudgetType(data: any) {
    const [type] = await db
      .insert(budgetTypes)
      .values({
        ...data,
        id: crypto.randomUUID(),
      })
      .returning();
    return type;
  }

  async updateBudgetType(id: string, data: any) {
    const [type] = await db
      .update(budgetTypes)
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
      console.log("Sample row structure:", Object.keys(excelRows[0]));
      console.log("First row data:", {
        assisted_person_first_name: excelRows[0].assisted_person_first_name,
        assisted_person_last_name: excelRows[0].assisted_person_last_name,
        assistedPersonFirstName: excelRows[0].assistedPersonFirstName,
        assistedPersonLastName: excelRows[0].assistedPersonLastName,
      });
    }

    // Extract unique clients
    const clientsMap = new Map();
    const staffMap = new Map();

    for (const row of excelRows) {
      // Extract client data using camelCase format (as returned by Drizzle ORM)
      const clientExternalId = row.assistedPersonId || "";
      const clientFirstName = row.assistedPersonFirstName || "";
      const clientLastName = row.assistedPersonLastName || "";
      const fiscalCode = row.taxCode || null;

      // Skip rows without client names
      if (!clientFirstName && !clientLastName) continue;

      // Parse dateOfBirth from string to Date or null
      let dateOfBirth = null;
      if (row.dateOfBirth && row.dateOfBirth.trim() !== "") {
        const dateStr = row.dateOfBirth.trim();
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          dateOfBirth = parsedDate;
        }
      }

      // Use external ID as key if available, otherwise use name-based key
      // This ensures each unique client ID gets its own entry
      const clientKey =
        clientExternalId ||
        `${clientFirstName}_${clientLastName}`.toLowerCase().trim();

      if (clientKey && !clientsMap.has(clientKey)) {
        clientsMap.set(clientKey, {
          externalId:
            clientExternalId ||
            `${clientFirstName}_${clientLastName}`.replace(/\s+/g, "_"),
          firstName: clientFirstName || "Unknown",
          lastName: clientLastName || "",
          fiscalCode,
          dateOfBirth,
          email: row.email || null,
          phone: row.primaryPhone || row.mobilePhone || null,
          address: row.homeAddress || null,
          exists: false,
          existingId: undefined,
        });
      }

      // Extract staff data using camelCase format (as returned by Drizzle ORM)
      const staffExternalId = row.operatorId || "";
      const staffFirstName = row.operatorFirstName || "";
      const staffLastName = row.operatorLastName || "";
      const category = row.serviceCategory || null;
      const services = row.serviceType || null;
      const categoryType = row.categoryType || "external";

      // Skip rows without staff names
      if (!staffFirstName && !staffLastName) continue;

      // Use external ID as key if available, otherwise use name-based key
      // This ensures each unique staff ID gets its own entry
      const staffKey =
        staffExternalId ||
        `${staffFirstName}_${staffLastName}`.toLowerCase().trim();

      if (staffKey && !staffMap.has(staffKey)) {
        // Determine if staff is internal or external based on category type
        // "interna" means internal in Italian, "esterna" means external
        const isInternal =
          categoryType?.toLowerCase() === "interna" ||
          categoryType?.toLowerCase() === "internal";

        staffMap.set(staffKey, {
          externalId:
            staffExternalId ||
            `${staffFirstName}_${staffLastName}`.replace(/\s+/g, "_"),
          firstName: staffFirstName || "Unknown",
          lastName: staffLastName || "",
          type: isInternal ? "internal" : "external",
          category,
          services,
          exists: false,
          existingId: undefined,
        });
      }
    }

    console.log(`Unique clients found: ${clientsMap.size}`);
    console.log(`Unique staff found: ${staffMap.size}`);

    // Check if clients already exist
    for (const [id, clientData] of Array.from(clientsMap)) {
      // First check by external ID if it exists
      let existing = [];
      if (clientData.externalId && !clientData.externalId.includes("_")) {
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
              eq(clients.lastName, clientData.lastName),
            ),
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
      if (staffData.externalId && !staffData.externalId.includes("_")) {
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
              eq(staff.lastName, staffData.lastName),
            ),
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
      staff: Array.from(staffMap.values()),
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
                action: "updated",
              },
            ],
            updatedAt: new Date(),
          })
          .where(eq(clients.id, clientData.existingId));

        // Create audit trail entry
        await this.createImportAuditTrail({
          importId,
          entityType: "client",
          entityId: clientData.existingId,
          action: "updated",
          previousData: existingClient,
          newData: { ...existingClient, ...clientData },
          changeDetails: {
            firstName: clientData.firstName,
            lastName: clientData.lastName,
            fiscalCode: clientData.fiscalCode,
          },
        });

        updated++;
      } else {
        // Create new client with import tracking
        const [newClient] = await db
          .insert(clients)
          .values({
            externalId: clientData.externalId,
            firstName: clientData.firstName,
            lastName: clientData.lastName,
            fiscalCode: clientData.fiscalCode,
            dateOfBirth: clientData.dateOfBirth || null,
            email: clientData.email || null,
            phone: clientData.phone || null,
            address: clientData.address || null,
            serviceType: "personal-care", // Default service type
            status: "active",
            importId: importId,
            lastImportId: importId,
            importHistory: [
              {
                importId,
                timestamp: new Date().toISOString(),
                action: "created",
              },
            ],
          })
          .returning();

        // Create audit trail entry
        await this.createImportAuditTrail({
          importId,
          entityType: "client",
          entityId: newClient.id,
          action: "created",
          newData: newClient,
        });

        created++;
      }
    }

    // Update import status
    await db
      .update(excelImports)
      .set({
        syncStatus: "synced",
        syncedAt: new Date(),
        syncedClientsCount: created + updated,
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
                action: "updated",
              },
            ],
            updatedAt: new Date(),
          })
          .where(eq(staff.id, staffData.existingId));

        // Create audit trail entry
        await this.createImportAuditTrail({
          importId,
          entityType: "staff",
          entityId: staffData.existingId,
          action: "updated",
          previousData: existingStaff,
          newData: { ...existingStaff, ...staffData },
          changeDetails: {
            firstName: staffData.firstName,
            lastName: staffData.lastName,
            type: staffData.type,
            category: staffData.category,
            services: staffData.services,
          },
        });

        updated++;
      } else {
        // Create new staff member with import tracking
        const [newStaff] = await db
          .insert(staff)
          .values({
            externalId: staffData.externalId,
            firstName: staffData.firstName,
            lastName: staffData.lastName,
            type: staffData.type,
            category: staffData.category,
            services: staffData.services,
            hourlyRate: "20.00", // Default hourly rate
            status: "active",
            importId: importId,
            lastImportId: importId,
            importHistory: [
              {
                importId,
                timestamp: new Date().toISOString(),
                action: "created",
              },
            ],
          })
          .returning();

        // Create audit trail entry
        await this.createImportAuditTrail({
          importId,
          entityType: "staff",
          entityId: newStaff.id,
          action: "created",
          newData: newStaff,
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

    console.log(
      `Found ${clientStaffMap.size} unique clients with staff assignments`,
    );

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
          .where(
            and(
              eq(clientStaffAssignments.clientId, client.id),
              eq(clientStaffAssignments.staffId, staffMember.id),
            ),
          );

        if (!existingAssignment) {
          // Create new assignment
          await db.insert(clientStaffAssignments).values({
            clientId: client.id,
            staffId: staffMember.id,
            assignmentType: assignmentCount === 0 ? "primary" : "secondary",
            isActive: true,
          });
          assignmentCount++;
          totalAssignmentsCreated++;
        } else {
          totalAssignmentsSkipped++;
        }
      }
    }

    console.log(
      `Client-staff assignments created: ${totalAssignmentsCreated}, skipped: ${totalAssignmentsSkipped}`,
    );
  }

  // Create time logs from Excel data with duplicate detection
  async createTimeLogsFromExcel(importId: string): Promise<{
    created: number;
    skipped: number;
    duplicates: Array<{ identifier: string; reason: string }>;
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
      status: "processing",
      processed: 0,
      total: allExcelData.length,
      created: 0,
      skipped: 0,
      message: "Starting sync...",
    };

    let created = 0;
    let skipped = 0;
    const duplicates: Array<{ identifier: string; reason: string }> = [];
    let processedCount = 0;

    // Pre-fetch all clients and staff to avoid N+1 queries
    const clientsMap = new Map();
    const staffMap = new Map();

    const allClients = await db.select().from(clients);
    const allStaff = await db.select().from(staff);

    allClients.forEach((c) => clientsMap.set(c.externalId, c));
    allStaff.forEach((s) => staffMap.set(s.externalId, s));

    console.log(
      `Loaded ${clientsMap.size} clients and ${staffMap.size} staff members`,
    );

    for (const row of allExcelData) {
      processedCount++;

      // Update progress
      (global as any).timeLogsSyncProgress[importId] = {
        status: "processing",
        processed: processedCount,
        total: allExcelData.length,
        created,
        skipped,
        message: `Processing row ${processedCount}/${allExcelData.length}`,
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
      const scheduledStart = row.scheduledStart
        ? new Date(row.scheduledStart)
        : null;
      const scheduledEnd = row.scheduledEnd ? new Date(row.scheduledEnd) : null;

      if (!scheduledStart || isNaN(scheduledStart.getTime())) {
        skipped++;
        continue;
      }

      // Check for duplicates using composite key
      const identifier = row.identifier || "";

      // Check if a time log with the same composite key already exists
      const existingTimeLog = await db
        .select()
        .from(timeLogs)
        .where(
          and(
            eq(timeLogs.clientId, client.id),
            eq(timeLogs.staffId, staffMember.id),
            eq(timeLogs.scheduledStartTime, scheduledStart),
            scheduledEnd
              ? eq(timeLogs.scheduledEndTime, scheduledEnd)
              : sql`true`,
          ),
        )
        .limit(1);

      if (existingTimeLog.length > 0) {
        // Also check if it has the same external identifier
        if (
          identifier &&
          existingTimeLog[0].externalIdentifier === identifier
        ) {
          duplicates.push({
            identifier,
            reason: `Time log already exists for ${client.firstName} ${client.lastName} with ${staffMember.firstName} ${staffMember.lastName} at ${scheduledStart.toISOString()}`,
          });
          skipped++;
          continue;
        }
      }

      // Calculate hours from duration or time difference
      let hours = "0";
      if (row.duration) {
        // Parse duration (format: "HH:MM" or decimal)
        const durationStr = String(row.duration);
        if (durationStr.includes(":")) {
          const [h, m] = durationStr.split(":");
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
      const hourlyRate = row.cost1 || staffMember.hourlyRate || "25";
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
          serviceType:
            row.serviceCategory || row.serviceType || "Personal Care",
          hourlyRate,
          totalCost,
          notes: row.notes || "",
          externalIdentifier: identifier,
          importId,
          excelDataId: row.id,
        });
        created++;
      } catch (error) {
        console.error("Error creating time log:", error);
        skipped++;
      }
    }

    // Mark sync as completed
    (global as any).timeLogsSyncProgress[importId] = {
      status: "completed",
      processed: allExcelData.length,
      total: allExcelData.length,
      created,
      skipped,
      message: `Sync completed: ${created} created, ${skipped} skipped`,
    };

    // Clean up progress tracking after a delay
    setTimeout(() => {
      if ((global as any).timeLogsSyncProgress?.[importId]) {
        delete (global as any).timeLogsSyncProgress[importId];
      }
    }, 5000);

    console.log(
      `Time logs sync completed: created=${created}, skipped=${skipped}, duplicates=${duplicates.length}`,
    );
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

  async getActiveStaffRate(
    staffId: string,
    serviceTypeId?: string,
    date: Date = new Date(),
  ): Promise<StaffRate | undefined> {
    const query = db
      .select()
      .from(staffRates)
      .where(
        and(
          eq(staffRates.staffId, staffId),
          eq(staffRates.isActive, true),
          sql`${staffRates.effectiveFrom} <= ${date}`,
          sql`(${staffRates.effectiveTo} IS NULL OR ${staffRates.effectiveTo} >= ${date})`,
        ),
      );

    if (serviceTypeId) {
      query.where(and(eq(staffRates.serviceTypeId, serviceTypeId)));
    }

    const [rate] = await query.orderBy(desc(staffRates.effectiveFrom)).limit(1);
    return rate;
  }

  async createStaffRate(rate: InsertStaffRate): Promise<StaffRate> {
    // Check if this is the first rate for the staff member
    const existingRates = await db
      .select()
      .from(staffRates)
      .where(eq(staffRates.staffId, rate.staffId));
    
    // If this is the first rate, ensure it's active
    // If there are existing rates and this one is set as active, deactivate others
    if (existingRates.length === 0) {
      rate.isActive = true;
    } else if (rate.isActive) {
      // Deactivate all other rates for this staff member
      await db
        .update(staffRates)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(staffRates.staffId, rate.staffId));
    }

    const [newRate] = await db.insert(staffRates).values(rate).returning();
    return newRate;
  }

  async updateStaffRate(
    id: string,
    rate: Partial<InsertStaffRate>,
  ): Promise<StaffRate> {
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

  async toggleStaffRateActive(id: string): Promise<StaffRate> {
    // Get the rate to toggle
    const [rateToToggle] = await db
      .select()
      .from(staffRates)
      .where(eq(staffRates.id, id));
    
    if (!rateToToggle) {
      throw new Error("Rate not found");
    }

    // If we're activating this rate, deactivate all other rates for this staff member first
    if (!rateToToggle.isActive) {
      await db
        .update(staffRates)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(
          eq(staffRates.staffId, rateToToggle.staffId),
          sql`id != ${id}` // Don't update the rate we're about to activate
        ));
      
      // Activate this rate
      const [updatedRate] = await db
        .update(staffRates)
        .set({ 
          isActive: true,
          updatedAt: new Date()
        })
        .where(eq(staffRates.id, id))
        .returning();

      return updatedRate;
    } else {
      // If trying to deactivate the currently active rate, don't allow it
      // There must always be at least one active rate
      throw new Error("Cannot deactivate the only active rate. Please activate another rate first.");
    }
  }

  // Staff compensation operations
  async getStaffCompensations(
    staffId?: string,
    status?: string,
  ): Promise<StaffCompensation[]> {
    // Build WHERE conditions
    const conditions = [];
    
    if (staffId) {
      conditions.push(eq(staffCompensations.staffId, staffId));
    }
    if (status) {
      conditions.push(eq(staffCompensations.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Use raw SQL query to get dates as strings
    const result = await db.execute(sql`
      SELECT 
        id,
        staff_id as "staffId",
        to_char(period_start, 'YYYY-MM-DD') as "periodStart",
        to_char(period_end, 'YYYY-MM-DD') as "periodEnd",
        regular_hours as "regularHours",
        overtime_hours as "overtimeHours",
        weekend_hours as "weekendHours",
        holiday_hours as "holidayHours",
        total_mileage as "totalMileage",
        base_compensation as "baseCompensation",
        overtime_compensation as "overtimeCompensation",
        weekend_compensation as "weekendCompensation",
        holiday_compensation as "holidayCompensation",
        mileage_reimbursement as "mileageReimbursement",
        adjustments,
        total_compensation as "totalCompensation",
        status,
        approved_by as "approvedBy",
        CASE 
          WHEN approved_at IS NULL THEN NULL 
          ELSE to_char(approved_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') 
        END as "approvedAt",
        CASE 
          WHEN paid_at IS NULL THEN NULL 
          ELSE to_char(paid_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') 
        END as "paidAt",
        notes,
        pay_slip_generated as "paySlipGenerated",
        pay_slip_url as "paySlipUrl",
        to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt",
        to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "updatedAt"
      FROM staff_compensations
      ${staffId ? sql`WHERE staff_id = ${staffId}` : sql``}
      ${staffId && status ? sql`AND status = ${status}` : !staffId && status ? sql`WHERE status = ${status}` : sql``}
      ORDER BY period_end DESC
    `);
      
    return result.rows as StaffCompensation[];
  }

  async getAllStaffCompensations(): Promise<StaffCompensation[]> {
    console.log("Fetching all compensations...");

    // Use raw SQL query to get dates as strings to avoid Drizzle's date parsing issues
    const result = await db.execute(sql`
      SELECT 
        id,
        staff_id as "staffId",
        to_char(period_start, 'YYYY-MM-DD') as "periodStart",
        to_char(period_end, 'YYYY-MM-DD') as "periodEnd",
        regular_hours as "regularHours",
        overtime_hours as "overtimeHours",
        weekend_hours as "weekendHours",
        holiday_hours as "holidayHours",
        total_mileage as "totalMileage",
        base_compensation as "baseCompensation",
        overtime_compensation as "overtimeCompensation",
        weekend_compensation as "weekendCompensation",
        holiday_compensation as "holidayCompensation",
        mileage_reimbursement as "mileageReimbursement",
        adjustments,
        total_compensation as "totalCompensation",
        status,
        approved_by as "approvedBy",
        CASE 
          WHEN approved_at IS NULL THEN NULL 
          ELSE to_char(approved_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') 
        END as "approvedAt",
        CASE 
          WHEN paid_at IS NULL THEN NULL 
          ELSE to_char(paid_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') 
        END as "paidAt",
        notes,
        pay_slip_generated as "paySlipGenerated",
        pay_slip_url as "paySlipUrl",
        to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt",
        to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "updatedAt"
      FROM staff_compensations
      ORDER BY period_end DESC
    `);

    console.log("Found", result.rows.length, "compensations");
    return result.rows as StaffCompensation[];
  }

  async getStaffCompensation(
    id: string,
  ): Promise<StaffCompensation | undefined> {
    // Use raw SQL query to get dates as strings to avoid Drizzle's date parsing issues
    const result = await db.execute(sql`
      SELECT 
        id,
        staff_id as "staffId",
        to_char(period_start, 'YYYY-MM-DD') as "periodStart",
        to_char(period_end, 'YYYY-MM-DD') as "periodEnd",
        regular_hours as "regularHours",
        overtime_hours as "overtimeHours",
        weekend_hours as "weekendHours",
        holiday_hours as "holidayHours",
        total_mileage as "totalMileage",
        base_compensation as "baseCompensation",
        overtime_compensation as "overtimeCompensation",
        weekend_compensation as "weekendCompensation",
        holiday_compensation as "holidayCompensation",
        mileage_reimbursement as "mileageReimbursement",
        adjustments,
        total_compensation as "totalCompensation",
        status,
        approved_by as "approvedBy",
        CASE 
          WHEN approved_at IS NULL THEN NULL 
          ELSE to_char(approved_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') 
        END as "approvedAt",
        CASE 
          WHEN paid_at IS NULL THEN NULL 
          ELSE to_char(paid_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') 
        END as "paidAt",
        notes,
        pay_slip_generated as "paySlipGenerated",
        pay_slip_url as "paySlipUrl",
        to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt",
        to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "updatedAt"
      FROM staff_compensations
      WHERE id = ${id}
      LIMIT 1
    `);

    return result.rows[0] as StaffCompensation | undefined;
  }

  async getStaffCompensationByPeriod(
    staffId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<StaffCompensation | undefined> {
    const [compensation] = await db
      .select()
      .from(staffCompensations)
      .where(
        and(
          eq(staffCompensations.staffId, staffId),
          eq(staffCompensations.periodStart, periodStart),
          eq(staffCompensations.periodEnd, periodEnd),
        ),
      );
    return compensation;
  }

  async createStaffCompensation(
    compensation: InsertStaffCompensation,
  ): Promise<StaffCompensation> {
    // Helper to safely parse dates
    const parseCompensationDate = (dateValue: any): Date => {
      if (!dateValue) {
        throw new Error("Date value is required");
      }

      let date: Date;

      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === "string") {
        // Handle ISO string format
        if (dateValue.includes("T")) {
          date = new Date(dateValue);
        } else {
          // Handle YYYY-MM-DD format
          date = new Date(dateValue + "T12:00:00");
        }
      } else {
        throw new Error(`Invalid date format: ${dateValue}`);
      }

      if (isNaN(date.getTime())) {
        throw new Error(`Failed to parse date: ${dateValue}`);
      }

      return date;
    };

    // Convert string dates to Date objects with proper parsing
    const compensationData = {
      ...compensation,
      periodStart: parseCompensationDate(compensation.periodStart),
      periodEnd: parseCompensationDate(compensation.periodEnd),
      approvedAt: compensation.approvedAt
        ? parseCompensationDate(compensation.approvedAt)
        : undefined,
      paidAt: compensation.paidAt
        ? parseCompensationDate(compensation.paidAt)
        : undefined,
    };

    const [newCompensation] = await db
      .insert(staffCompensations)
      .values(compensationData)
      .returning();
    return newCompensation;
  }

  async updateStaffCompensation(
    id: string,
    compensation: Partial<InsertStaffCompensation>,
  ): Promise<StaffCompensation> {
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

  async approveStaffCompensation(
    id: string,
    userId: string,
  ): Promise<StaffCompensation> {
    const [approved] = await db
      .update(staffCompensations)
      .set({
        status: "approved",
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(staffCompensations.id, id))
      .returning();
    return approved;
  }

  async markStaffCompensationPaid(id: string): Promise<StaffCompensation> {
    const [paid] = await db
      .update(staffCompensations)
      .set({
        status: "paid",
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(staffCompensations.id, id))
      .returning();
    return paid;
  }

  async updateStaffCompensationStatus(id: string, status: string): Promise<StaffCompensation> {
    const [updated] = await db
      .update(staffCompensations)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(staffCompensations.id, id))
      .returning();
    return updated;
  }

  async calculateStaffCompensation(
    staffId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{
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
      .where(
        and(
          eq(timeLogs.staffId, staffId),
          sql`${timeLogs.serviceDate} >= ${periodStart}`,
          sql`${timeLogs.serviceDate} <= ${periodEnd}`,
        ),
      );

    // Get active rate for the staff member
    const rate = await this.getActiveStaffRate(staffId);

    if (!rate) {
      throw new Error("No active rate found for staff member");
    }

    // Calculate hours by type
    let regularHours = 0;
    let overtimeHours = 0;
    let weekendHours = 0;
    let holidayHours = 0;
    let totalMileage = 0;

    for (const log of logs) {
      const hours = parseFloat(log.hours || "0");
      const mileage = parseFloat(log.mileage || "0");
      totalMileage += mileage;

      const date = new Date(log.serviceDate);
      const dayOfWeek = date.getDay();

      // Check if it's a holiday using the Italian holiday calendar
      const isHoliday = this.isHolidayOrSunday(date);
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
    const baseCompensation = regularHours * parseFloat(rate.weekdayRate || "0");
    const overtimeCompensation =
      overtimeHours *
      parseFloat(rate.weekdayRate || "0") *
      parseFloat(rate.overtimeMultiplier || "1.5");
    const weekendCompensation =
      weekendHours * parseFloat(rate.weekendRate || "0");
    const holidayCompensation =
      holidayHours * parseFloat(rate.holidayRate || "0");
    const mileageReimbursement =
      totalMileage * parseFloat(rate.mileageRatePerKm || "0");

    const totalCompensation =
      baseCompensation +
      overtimeCompensation +
      weekendCompensation +
      holidayCompensation +
      mileageReimbursement;

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
      totalCompensation,
    };
  }

  // Compensation adjustment operations
  async getCompensationAdjustments(
    compensationId: string,
  ): Promise<CompensationAdjustment[]> {
    return await db
      .select()
      .from(compensationAdjustments)
      .where(eq(compensationAdjustments.compensationId, compensationId))
      .orderBy(desc(compensationAdjustments.createdAt));
  }

  async createCompensationAdjustment(
    adjustment: InsertCompensationAdjustment,
  ): Promise<CompensationAdjustment> {
    const [newAdjustment] = await db
      .insert(compensationAdjustments)
      .values(adjustment)
      .returning();
    return newAdjustment;
  }

  // Compensation budget allocation operations
  async getCompensationBudgetAllocations(
    compensationId: string,
  ): Promise<CompensationBudgetAllocation[]> {
    return await db
      .select()
      .from(compensationBudgetAllocations)
      .where(eq(compensationBudgetAllocations.compensationId, compensationId))
      .orderBy(desc(compensationBudgetAllocations.allocationDate));
  }

  async createCompensationBudgetAllocation(
    allocation: InsertCompensationBudgetAllocation,
  ): Promise<CompensationBudgetAllocation> {
    const [newAllocation] = await db
      .insert(compensationBudgetAllocations)
      .values({
        ...allocation,
        allocationDate: new Date(allocation.allocationDate),
      })
      .returning();

    // Update the used amount in client budget allocation
    await db
      .update(clientBudgetAllocations)
      .set({
        usedAmount: sql`${clientBudgetAllocations.usedAmount} + ${newAllocation.allocatedAmount}`,
        updatedAt: new Date(),
      })
      .where(
        eq(clientBudgetAllocations.id, newAllocation.clientBudgetAllocationId),
      );

    return newAllocation;
  }

  async deleteCompensationBudgetAllocations(
    compensationId: string,
  ): Promise<void> {
    // Get all allocations to be deleted
    const allocations =
      await this.getCompensationBudgetAllocations(compensationId);

    // Restore the used amounts in client budget allocations
    for (const allocation of allocations) {
      await db
        .update(clientBudgetAllocations)
        .set({
          usedAmount: sql`GREATEST(0, ${clientBudgetAllocations.usedAmount} - ${allocation.allocatedAmount})`,
          updatedAt: new Date(),
        })
        .where(
          eq(clientBudgetAllocations.id, allocation.clientBudgetAllocationId),
        );
    }

    // Delete the compensation budget allocations
    await db
      .delete(compensationBudgetAllocations)
      .where(eq(compensationBudgetAllocations.compensationId, compensationId));
  }

  async getAvailableBudgetForClient(
    clientId: string,
    budgetTypeId: string,
    date: Date,
  ): Promise<{
    allocationId: string;
    available: number;
    total: number;
    used: number;
  } | null> {
    const [allocation] = await db
      .select()
      .from(clientBudgetAllocations)
      .where(
        and(
          eq(clientBudgetAllocations.clientId, clientId),
          eq(clientBudgetAllocations.budgetTypeId, budgetTypeId),
          eq(clientBudgetAllocations.status, "active"),
          sql`${clientBudgetAllocations.startDate} <= ${date}`,
          sql`${clientBudgetAllocations.endDate} >= ${date}`,
        ),
      )
      .orderBy(desc(clientBudgetAllocations.createdAt))
      .limit(1);

    if (!allocation) {
      return null;
    }

    const total = parseFloat(allocation.allocatedAmount);
    const used = parseFloat(allocation.usedAmount);
    const available = total - used;

    return {
      allocationId: allocation.id,
      available,
      total,
      used,
    };
  }

  // Mileage tracking operations
  async getMileageLogs(
    staffId?: string,
    status?: string,
  ): Promise<MileageLog[]> {
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
        date: new Date(log.date), // Ensure date is a Date object
      })
      .returning();
    return newLog;
  }

  async updateMileageLog(
    id: string,
    log: Partial<InsertMileageLog>,
  ): Promise<MileageLog> {
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
        status: "approved",
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
        status: "rejected",
        updatedAt: new Date(),
      })
      .where(eq(mileageLogs.id, id))
      .returning();
    return rejectedLog;
  }

  async bulkApproveMileageLogs(
    logIds: string[],
    userId: string,
  ): Promise<{ count: number }> {
    const result = await db
      .update(mileageLogs)
      .set({
        status: "approved",
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(sql`${mileageLogs.id} = ANY(${logIds})`);

    return { count: logIds.length };
  }

  // Mileage dispute operations
  async getMileageDisputes(
    mileageLogId?: string,
    status?: string,
  ): Promise<MileageDispute[]> {
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

  async createMileageDispute(
    dispute: InsertMileageDispute,
  ): Promise<MileageDispute> {
    // First update the mileage log status to disputed
    await db
      .update(mileageLogs)
      .set({
        status: "disputed",
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

  async updateMileageDispute(
    id: string,
    dispute: Partial<InsertMileageDispute>,
  ): Promise<MileageDispute> {
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

  async resolveMileageDispute(
    id: string,
    resolution: string,
    userId: string,
  ): Promise<MileageDispute> {
    const [resolvedDispute] = await db
      .update(mileageDisputes)
      .set({
        status: "resolved",
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
          status: "pending",
          updatedAt: new Date(),
        })
        .where(eq(mileageLogs.id, resolvedDispute.mileageLogId));
    }

    return resolvedDispute;
  }

  // Import tracking operations
  async createImportAuditTrail(
    trail: InsertImportAuditTrail,
  ): Promise<ImportAuditTrail> {
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

  async getEntityImportHistory(
    entityType: string,
    entityId: string,
  ): Promise<ImportAuditTrail[]> {
    return await db
      .select()
      .from(importAuditTrail)
      .where(
        and(
          eq(importAuditTrail.entityType, entityType),
          eq(importAuditTrail.entityId, entityId),
        ),
      )
      .orderBy(desc(importAuditTrail.createdAt));
  }

  async updateEntityImportTracking(
    entityType: "client" | "staff",
    entityId: string,
    importId: string,
  ): Promise<void> {
    const table = entityType === "client" ? clients : staff;

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
        action: entity.importId ? "updated" : "created",
      },
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

  // GDPR Compliance implementations
  // User consent management
  async getUserConsents(userId: string): Promise<UserConsent[]> {
    return await db
      .select()
      .from(userConsents)
      .where(eq(userConsents.userId, userId))
      .orderBy(desc(userConsents.createdAt));
  }

  async getUserConsentByType(userId: string, consentType: string): Promise<UserConsent | undefined> {
    const [consent] = await db
      .select()
      .from(userConsents)
      .where(and(
        eq(userConsents.userId, userId),
        eq(userConsents.consentType, consentType),
        sql`${userConsents.revokedDate} IS NULL`
      ))
      .orderBy(desc(userConsents.createdAt))
      .limit(1);
    return consent;
  }

  async createUserConsent(consent: InsertUserConsent): Promise<UserConsent> {
    const [newConsent] = await db
      .insert(userConsents)
      .values(consent)
      .returning();
    return newConsent;
  }

  async updateUserConsent(id: string, consent: Partial<InsertUserConsent>): Promise<UserConsent> {
    const [updatedConsent] = await db
      .update(userConsents)
      .set({ ...consent, updatedAt: new Date() })
      .where(eq(userConsents.id, id))
      .returning();
    return updatedConsent;
  }

  async revokeUserConsent(id: string, revokedDate?: Date): Promise<UserConsent> {
    const [revokedConsent] = await db
      .update(userConsents)
      .set({ 
        revokedDate: revokedDate || new Date(),
        updatedAt: new Date() 
      })
      .where(eq(userConsents.id, id))
      .returning();
    return revokedConsent;
  }

  // Data access logging
  async logDataAccess(log: InsertDataAccessLog): Promise<DataAccessLog> {
    const [newLog] = await db
      .insert(dataAccessLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async getDataAccessLogs(userId?: string, entityType?: string, action?: string): Promise<DataAccessLog[]> {
    let query = db.select().from(dataAccessLogs);
    
    const conditions = [];
    if (userId) conditions.push(eq(dataAccessLogs.userId, userId));
    if (entityType) conditions.push(eq(dataAccessLogs.entityType, entityType));
    if (action) conditions.push(eq(dataAccessLogs.action, action));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(dataAccessLogs.createdAt));
  }

  async getUserDataAccessLogs(userId: string, startDate?: Date, endDate?: Date): Promise<DataAccessLog[]> {
    let query = db
      .select()
      .from(dataAccessLogs)
      .where(eq(dataAccessLogs.userId, userId));
    
    if (startDate && endDate) {
      query = query.where(and(
        eq(dataAccessLogs.userId, userId),
        gte(dataAccessLogs.createdAt, startDate),
        lte(dataAccessLogs.createdAt, endDate)
      ));
    }
    
    return await query.orderBy(desc(dataAccessLogs.createdAt));
  }

  // Data export requests
  async getDataExportRequests(userId?: string, status?: string): Promise<DataExportRequest[]> {
    let query = db.select().from(dataExportRequests);
    
    const conditions = [];
    if (userId) conditions.push(eq(dataExportRequests.userId, userId));
    if (status) conditions.push(eq(dataExportRequests.status, status));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(dataExportRequests.createdAt));
  }

  async getDataExportRequest(id: string): Promise<DataExportRequest | undefined> {
    const [request] = await db
      .select()
      .from(dataExportRequests)
      .where(eq(dataExportRequests.id, id));
    return request;
  }

  async createDataExportRequest(request: InsertDataExportRequest): Promise<DataExportRequest> {
    const [newRequest] = await db
      .insert(dataExportRequests)
      .values(request)
      .returning();
    return newRequest;
  }

  async updateDataExportRequest(id: string, request: Partial<InsertDataExportRequest>): Promise<DataExportRequest> {
    const [updatedRequest] = await db
      .update(dataExportRequests)
      .set({ ...request, updatedAt: new Date() })
      .where(eq(dataExportRequests.id, id))
      .returning();
    return updatedRequest;
  }

  async getUserDataForExport(userId: string, includePersonal: boolean, includeService: boolean, includeFinancial: boolean): Promise<any> {
    const userData: any = {};
    
    // Get user basic info
    if (includePersonal) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));
      userData.profile = user;
      
      // Get consent records
      userData.consents = await this.getUserConsents(userId);
    }
    
    // Get service data if user is also a staff member
    if (includeService) {
      const [staffMember] = await db
        .select()
        .from(staff)
        .where(eq(staff.userId, userId));
      
      if (staffMember) {
        userData.staffProfile = staffMember;
        userData.timeLogs = await this.getTimeLogsByStaff(staffMember.id);
        userData.compensations = await this.getStaffCompensations(staffMember.id);
      }
    }
    
    // Get financial data (restricted access)
    if (includeFinancial) {
      userData.accessLogs = await this.getUserDataAccessLogs(userId);
    }
    
    return userData;
  }

  // Data retention policies
  async getDataRetentionPolicies(): Promise<DataRetentionPolicy[]> {
    return await db
      .select()
      .from(dataRetentionPolicies)
      .where(eq(dataRetentionPolicies.isActive, true))
      .orderBy(asc(dataRetentionPolicies.entityType));
  }

  async getDataRetentionPolicy(entityType: string): Promise<DataRetentionPolicy | undefined> {
    const [policy] = await db
      .select()
      .from(dataRetentionPolicies)
      .where(and(
        eq(dataRetentionPolicies.entityType, entityType),
        eq(dataRetentionPolicies.isActive, true)
      ));
    return policy;
  }

  async createDataRetentionPolicy(policy: InsertDataRetentionPolicy): Promise<DataRetentionPolicy> {
    const [newPolicy] = await db
      .insert(dataRetentionPolicies)
      .values(policy)
      .returning();
    return newPolicy;
  }

  async updateDataRetentionPolicy(id: string, policy: Partial<InsertDataRetentionPolicy>): Promise<DataRetentionPolicy> {
    const [updatedPolicy] = await db
      .update(dataRetentionPolicies)
      .set({ ...policy, updatedAt: new Date() })
      .where(eq(dataRetentionPolicies.id, id))
      .returning();
    return updatedPolicy;
  }

  async getExpiredDataForDeletion(): Promise<any[]> {
    const policies = await this.getDataRetentionPolicies();
    const expiredData = [];
    
    for (const policy of policies) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriodDays);
      
      if (policy.entityType === 'users') {
        const expiredUsers = await db
          .select()
          .from(users)
          .where(lte(users.createdAt, cutoffDate));
        expiredData.push({ entityType: 'users', data: expiredUsers });
      }
      // Add more entity types as needed
    }
    
    return expiredData;
  }

  // Data deletion requests
  async getDataDeletionRequests(status?: string): Promise<DataDeletionRequest[]> {
    let query = db.select().from(dataDeletionRequests);
    
    if (status) {
      query = query.where(eq(dataDeletionRequests.status, status));
    }
    
    return await query.orderBy(desc(dataDeletionRequests.createdAt));
  }

  async getDataDeletionRequest(id: string): Promise<DataDeletionRequest | undefined> {
    const [request] = await db
      .select()
      .from(dataDeletionRequests)
      .where(eq(dataDeletionRequests.id, id));
    return request;
  }

  async createDataDeletionRequest(request: InsertDataDeletionRequest): Promise<DataDeletionRequest> {
    const [newRequest] = await db
      .insert(dataDeletionRequests)
      .values(request)
      .returning();
    return newRequest;
  }

  async updateDataDeletionRequest(id: string, request: Partial<InsertDataDeletionRequest>): Promise<DataDeletionRequest> {
    const [updatedRequest] = await db
      .update(dataDeletionRequests)
      .set({ ...request, updatedAt: new Date() })
      .where(eq(dataDeletionRequests.id, id))
      .returning();
    return updatedRequest;
  }

  async executeDataDeletion(requestId: string): Promise<{ deletedEntities: string[]; errors?: string[] }> {
    const request = await this.getDataDeletionRequest(requestId);
    if (!request || request.status !== 'approved') {
      throw new Error('Deletion request not found or not approved');
    }
    
    const deletedEntities = [];
    const errors = [];
    
    try {
      // Delete user data (simplified - in production this would be more comprehensive)
      await db.delete(users).where(eq(users.id, request.userId));
      deletedEntities.push('user_profile');
      
      // Mark as completed
      await this.updateDataDeletionRequest(requestId, { 
        status: 'completed',
        completedAt: new Date()
      });
      
    } catch (error) {
      errors.push(`Failed to delete user data: ${error.message}`);
    }
    
    return { deletedEntities, errors: errors.length > 0 ? errors : undefined };
  }

  // Data breach incident management
  async getDataBreachIncidents(status?: string): Promise<DataBreachIncident[]> {
    let query = db.select().from(dataBreachIncidents);
    
    if (status) {
      query = query.where(eq(dataBreachIncidents.status, status));
    }
    
    return await query.orderBy(desc(dataBreachIncidents.createdAt));
  }

  async getDataBreachIncident(id: string): Promise<DataBreachIncident | undefined> {
    const [incident] = await db
      .select()
      .from(dataBreachIncidents)
      .where(eq(dataBreachIncidents.id, id));
    return incident;
  }

  async createDataBreachIncident(incident: InsertDataBreachIncident): Promise<DataBreachIncident> {
    const [newIncident] = await db
      .insert(dataBreachIncidents)
      .values(incident)
      .returning();
    return newIncident;
  }

  async updateDataBreachIncident(id: string, incident: Partial<InsertDataBreachIncident>): Promise<DataBreachIncident> {
    const [updatedIncident] = await db
      .update(dataBreachIncidents)
      .set({ ...incident, updatedAt: new Date() })
      .where(eq(dataBreachIncidents.id, id))
      .returning();
    return updatedIncident;
  }

  async markBreachReported(id: string): Promise<DataBreachIncident> {
    const [updatedIncident] = await db
      .update(dataBreachIncidents)
      .set({ 
        reportedToAuthority: true,
        reportedToAuthorityAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(dataBreachIncidents.id, id))
      .returning();
    return updatedIncident;
  }

  async markUsersNotified(id: string): Promise<DataBreachIncident> {
    const [updatedIncident] = await db
      .update(dataBreachIncidents)
      .set({ 
        usersNotified: true,
        usersNotifiedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(dataBreachIncidents.id, id))
      .returning();
    return updatedIncident;
  }
}

export const storage = new DatabaseStorage();
