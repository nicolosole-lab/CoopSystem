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
  staffCompensations,
  compensationAdjustments,
  compensationBudgetAllocations,
  calendarAppointments,
  userConsents,
  dataAccessLogs,
  dataExportRequests,
  dataRetentionPolicies,
  dataDeletionRequests,
  dataBreachIncidents,
  documents,
  documentAccessLogs,
  documentPermissions,
  documentRetentionSchedules,
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
  type StaffCompensation,
  type InsertStaffCompensation,
  type CompensationAdjustment,
  type InsertCompensationAdjustment,
  type CompensationBudgetAllocation,
  type InsertCompensationBudgetAllocation,
  type CalendarAppointment,
  type InsertCalendarAppointment,
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
  type Document,
  type InsertDocument,
  type DocumentAccessLog,
  type InsertDocumentAccessLog,
  type DocumentPermission,
  type InsertDocumentPermission,
  type DocumentRetentionSchedule,
  type InsertDocumentRetentionSchedule,
  mileageLogs,
  mileageDisputes,
  importAuditTrail,
  type ImportAuditTrail,
  type InsertImportAuditTrail,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, asc, gte, lte, or, isNull, isNotNull, inArray, ne, gt, lt, like, exists } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { format } from "date-fns";
import PDFDocument from "pdfkit";

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
  getClientBudgetAllocation(allocationId: string): Promise<any | undefined>;
  getAllClientBudgetAllocations(
    clientId?: string,
  ): Promise<ClientBudgetAllocation[]>;
  createClientBudgetAllocation(
    allocation: InsertClientBudgetAllocation,
  ): Promise<ClientBudgetAllocation>;
  updateClientBudgetAllocation(
    id: string,
    allocation: Partial<InsertClientBudgetAllocation>,
  ): Promise<ClientBudgetAllocation>;
  deleteClientBudgetAllocation(id: string): Promise<void>;

  // Budget type operations
  getBudgetType(id: string): Promise<BudgetType | undefined>;
  getBudgetTypes(): Promise<BudgetType[]>;
  createBudgetType(type: InsertBudgetType): Promise<BudgetType>;
  updateBudgetType(id: string, data: Partial<InsertBudgetType>): Promise<BudgetType>;
  deleteBudgetType(id: string): Promise<void>;
  
  // Update allocation rates
  updateClientBudgetAllocationRates(
    id: string,
    rates: { weekdayRate: string | null; holidayRate: string | null; kilometerRate: string | null }
  ): Promise<ClientBudgetAllocation>;

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

  // Staff rate operations removed - now using staff individual rates

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
    periodStart: string,
    periodEnd: string,
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

  // Document Management Operations (Phase 2 GDPR)
  getDocuments(filters?: {
    category?: string;
    entityType?: string;
    entityId?: string;
    isDeleted?: boolean;
  }): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, document: Partial<InsertDocument>): Promise<Document>;
  deleteDocument(id: string, deletedBy: string): Promise<void>;
  
  // Document access logging for GDPR audit compliance
  getDocumentAccessLogs(documentId?: string): Promise<DocumentAccessLog[]>;
  createDocumentAccessLog(log: InsertDocumentAccessLog): Promise<DocumentAccessLog>;
  
  // Document permissions for role-based access control
  getDocumentPermissions(documentId: string): Promise<DocumentPermission[]>;
  createDocumentPermission(permission: InsertDocumentPermission): Promise<DocumentPermission>;
  updateDocumentPermission(id: string, permission: Partial<InsertDocumentPermission>): Promise<DocumentPermission>;
  deleteDocumentPermission(id: string): Promise<void>;
  
  // Document retention schedules for automated GDPR compliance
  getDocumentRetentionSchedules(status?: string): Promise<DocumentRetentionSchedule[]>;
  createDocumentRetentionSchedule(schedule: InsertDocumentRetentionSchedule): Promise<DocumentRetentionSchedule>;
  updateDocumentRetentionSchedule(id: string, schedule: Partial<InsertDocumentRetentionSchedule>): Promise<DocumentRetentionSchedule>;
  executeDocumentRetention(scheduleId: string, executedBy: string): Promise<void>;

  // Calendar appointments operations
  getCalendarAppointments(): Promise<CalendarAppointment[]>;
  getCalendarAppointment(id: string): Promise<CalendarAppointment | undefined>;
  createCalendarAppointment(appointment: InsertCalendarAppointment): Promise<CalendarAppointment>;
  updateCalendarAppointment(id: string, appointment: Partial<InsertCalendarAppointment>): Promise<CalendarAppointment>;
  deleteCalendarAppointment(id: string): Promise<void>;
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
    // Get staff rates
    const [staffMember] = await db
      .select({ weekdayRate: staff.weekdayRate, holidayRate: staff.holidayRate })
      .from(staff)
      .where(eq(staff.id, timeLogData.staffId));
    if (!staffMember) {
      throw new Error("Staff member not found");
    }

    // Use weekday rate as default for time log creation
    const hourlyRate = staffMember.weekdayRate || "15.00";
    const totalCost = parseFloat(timeLogData.hours) * parseFloat(hourlyRate);

    const [newTimeLog] = await db
      .insert(timeLogs)
      .values({
        ...timeLogData,
        hourlyRate: hourlyRate,
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
        .select({ weekdayRate: staff.weekdayRate, holidayRate: staff.holidayRate })
        .from(staff)
        .where(eq(staff.id, staffId));
      if (!staffMember) {
        throw new Error("Staff member not found");
      }

      const hours = timeLogData.hours || currentLog.hours;
      const hourlyRate = staffMember.weekdayRate || "15.00";
      const totalCost = parseFloat(hours) * parseFloat(hourlyRate);

      updateData = {
        ...updateData,
        hourlyRate: hourlyRate,
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

  // Get a single client budget allocation by ID
  async getClientBudgetAllocation(allocationId: string): Promise<any | undefined> {
    const [result] = await db
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
      })
      .from(clientBudgetAllocations)
      .where(eq(clientBudgetAllocations.id, allocationId))
      .limit(1);

    return result;
  }

  async getAllClientBudgetAllocations(
    clientId?: string,
  ): Promise<ClientBudgetAllocation[]> {
    if (clientId) {
      return await db
        .select()
        .from(clientBudgetAllocations)
        .where(eq(clientBudgetAllocations.clientId, clientId))
        .orderBy(desc(clientBudgetAllocations.startDate));
    } else {
      // Return all allocations if no clientId specified (for admin view)
      return await db
        .select()
        .from(clientBudgetAllocations)
        .orderBy(desc(clientBudgetAllocations.startDate));
    }
  }

  async updateClientBudgetAllocationRates(
    id: string,
    rates: { weekdayRate: string | null; holidayRate: string | null; kilometerRate: string | null }
  ): Promise<ClientBudgetAllocation> {
    const [updated] = await db
      .update(clientBudgetAllocations)
      .set({
        weekdayRate: rates.weekdayRate,
        holidayRate: rates.holidayRate,
        kilometerRate: rates.kilometerRate,
        updatedAt: new Date()
      })
      .where(eq(clientBudgetAllocations.id, id))
      .returning();
    return updated;
  }

  // Get all clients with budget allocations for a specific period
  async getClientsWithBudgetAllocations(
    startDate?: Date,
    endDate?: Date,
  ): Promise<Array<{
    client: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      status: string;
    };
    totalAllocated: number;
    totalUsed: number;
    allocationsCount: number;
  }>> {
    const conditions = [];

    // Filter allocations that overlap with the given date range
    if (startDate && endDate) {
      conditions.push(
        sql`${clientBudgetAllocations.startDate} <= ${endDate} AND ${clientBudgetAllocations.endDate} >= ${startDate}`,
      );
    }

    const results = await db
      .select({
        clientId: clientBudgetAllocations.clientId,
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
        status: clients.status,
        totalAllocated: sql<number>`SUM(CAST(${clientBudgetAllocations.allocatedAmount} AS DECIMAL(10,2)))`,
        totalUsed: sql<number>`SUM(CAST(${clientBudgetAllocations.usedAmount} AS DECIMAL(10,2)))`,
        allocationsCount: sql<number>`COUNT(${clientBudgetAllocations.id})`,
      })
      .from(clientBudgetAllocations)
      .innerJoin(
        clients,
        eq(clientBudgetAllocations.clientId, clients.id),
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(
        clientBudgetAllocations.clientId,
        clients.firstName,
        clients.lastName,
        clients.email,
        clients.status,
      )
      .orderBy(clients.lastName, clients.firstName);

    return results.map((row) => ({
      client: {
        id: row.clientId,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        status: row.status,
      },
      totalAllocated: row.totalAllocated || 0,
      totalUsed: row.totalUsed || 0,
      allocationsCount: row.allocationsCount || 0,
    }));
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

  // Get available budget allocations for a staff member's assigned clients
  async getStaffAvailableBudgetAllocations(staffId: string): Promise<any[]> {
    const currentDate = new Date();

    // Get all clients assigned to this staff member with their available budget allocations
    const availableBudgets = await db
      .select({
        id: clientBudgetAllocations.id,
        clientId: clientBudgetAllocations.clientId,
        clientName: sql<string>`CONCAT(${clients.firstName}, ' ', ${clients.lastName})`,
        budgetTypeId: clientBudgetAllocations.budgetTypeId,
        budgetTypeName: budgetTypes.name,
        budgetTypeCode: budgetTypes.code,
        allocatedAmount: clientBudgetAllocations.allocatedAmount,
        usedAmount: clientBudgetAllocations.usedAmount,
        startDate: clientBudgetAllocations.startDate,
        endDate: clientBudgetAllocations.endDate,
        status: clientBudgetAllocations.status,
        weekdayRate: budgetTypes.defaultWeekdayRate,
        holidayRate: budgetTypes.defaultHolidayRate,
        kilometerRate: budgetTypes.defaultKilometerRate,
      })
      .from(clientStaffAssignments)
      .innerJoin(clients, eq(clientStaffAssignments.clientId, clients.id))
      .innerJoin(clientBudgetAllocations, eq(clients.id, clientBudgetAllocations.clientId))
      .leftJoin(budgetTypes, eq(clientBudgetAllocations.budgetTypeId, budgetTypes.id))
      .where(
        and(
          eq(clientStaffAssignments.staffId, staffId),
          eq(clientBudgetAllocations.status, "active"),
          sql`${clientBudgetAllocations.startDate} <= ${currentDate} AND ${clientBudgetAllocations.endDate} >= ${currentDate}`,
          sql`${clientBudgetAllocations.allocatedAmount} > ${clientBudgetAllocations.usedAmount}`,
        ),
      )
      .orderBy(clients.firstName, clients.lastName, budgetTypes.displayOrder);

    return availableBudgets.map((allocation) => ({
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

  async findExcelImportByFilename(filename: string): Promise<ExcelImport | undefined> {
    const [existingImport] = await db
      .select()
      .from(excelImports)
      .where(eq(excelImports.filename, filename))
      .orderBy(sql`${excelImports.createdAt} DESC`)
      .limit(1);
    return existingImport;
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

  async getBudgetType(id: string): Promise<BudgetType | undefined> {
    const [type] = await db
      .select()
      .from(budgetTypes)
      .where(eq(budgetTypes.id, id));
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

  async deleteBudgetType(id: string) {
    await db
      .delete(budgetTypes)
      .where(eq(budgetTypes.id, id));
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
        // Set default rates based on staff type
        const isInternal = staffData.type === "internal";
        const defaultHourlyRate = isInternal ? "8.00" : "20.00";
        
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
            weekdayRate: "15.00",
            holidayRate: "20.00", 
            mileageRate: "0.50",
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

        // Create default staff rates based on staff type
        const staffRateData = isInternal ? {
          // Internal Staff rates
          weekdayRate: "8.00",
          weekendRate: "9.00", 
          holidayRate: "9.00", // Same as weekend for internal
          mileageRatePerKm: "0.50",
          overtimeMultiplier: "1.50"
        } : {
          // External Staff rates  
          weekdayRate: "20.00",
          weekendRate: "24.00",
          holidayRate: "24.00", // Same as weekend for external
          mileageRatePerKm: "0.80", 
          overtimeMultiplier: "1.50"
        };

        // Insert default staff rates
        await db.insert(staffRates).values({
          staffId: newStaff.id,
          serviceTypeId: null, // Applies to all service types
          ...staffRateData,
          effectiveFrom: new Date(),
          effectiveTo: null, // Currently active
          isActive: true,
        });

        // Create audit trail entry
        await this.createImportAuditTrail({
          importId,
          entityType: "staff", 
          entityId: newStaff.id,
          action: "created",
          newData: newStaff,
          changeDetails: {
            staffType: staffData.type,
            defaultRatesCreated: isInternal ? "Internal rates applied" : "External rates applied",
          },
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

      // Helper function to parse European date format (DD/MM/YYYY HH:MM)
      const parseEuropeanDate = (dateStr: string): Date | null => {
        if (!dateStr) return null;
        
        try {
          // Handle format: "21/07/2025 12:00" or "21/07/2025"
          const parts = dateStr.trim().split(' ');
          const datePart = parts[0]; // "21/07/2025"
          const timePart = parts[1] || '00:00'; // "12:00" or default to "00:00"
          
          const [day, month, year] = datePart.split('/');
          const [hours, minutes] = timePart.split(':');
          
          if (!day || !month || !year) return null;
          
          // JavaScript Date constructor expects (year, month-1, day, hours, minutes)
          const date = new Date(
            parseInt(year), 
            parseInt(month) - 1, // Month is 0-indexed in JavaScript
            parseInt(day),
            parseInt(hours) || 0,
            parseInt(minutes) || 0
          );
          
          return isNaN(date.getTime()) ? null : date;
        } catch (error) {
          console.log(`Error parsing date "${dateStr}":`, error);
          return null;
        }
      };

      // Parse service date and times with European format support
      const scheduledStart = row.scheduledStart
        ? parseEuropeanDate(row.scheduledStart)
        : null;
      const scheduledEnd = row.scheduledEnd 
        ? parseEuropeanDate(row.scheduledEnd) 
        : null;

      if (!scheduledStart || isNaN(scheduledStart.getTime())) {
        skipped++;
        continue;
      }

      // Check for duplicates using composite key
      const identifier = row.identifier || "";

      // Primary duplicate check: Check by external identifier first (most reliable)
      if (identifier) {
        const existingByIdentifier = await db
          .select()
          .from(timeLogs)
          .where(eq(timeLogs.externalIdentifier, identifier))
          .limit(1);

        if (existingByIdentifier.length > 0) {
          duplicates.push({
            identifier,
            reason: `Time log already exists with identifier ${identifier}`,
          });
          skipped++;
          continue;
        }
      }

      // Secondary duplicate check: Check by composite key for records without identifiers
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
        duplicates.push({
          identifier: identifier || "composite-key",
          reason: `Time log already exists for ${client.firstName} ${client.lastName} with ${staffMember.firstName} ${staffMember.lastName} at ${scheduledStart.toISOString()}`,
        });
        skipped++;
        continue;
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
  // Staff rate functions removed - now using budget allocation rates



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
    periodStart: string,
    periodEnd: string,
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
    console.log(`Storage: Filtering time logs for dates ${periodStart} to ${periodEnd}`);
    
    // Get all time logs for the staff member in the period
    // Fix date comparison to handle datetime vs date comparison properly
    const logs = await db
      .select()
      .from(timeLogs)
      .where(
        and(
          eq(timeLogs.staffId, staffId),
          sql`DATE(${timeLogs.serviceDate}) >= DATE(${periodStart})`,
          sql`DATE(${timeLogs.serviceDate}) <= DATE(${periodEnd})`,
        ),
      );
      
    console.log(`Found ${logs.length} time logs in period:`, logs.map(log => ({ date: log.serviceDate, hours: log.hours })));

    // Calculate hours and costs from time logs (now using budget allocation rates)
    let regularHours = 0;
    let overtimeHours = 0;
    let weekendHours = 0;
    let holidayHours = 0;
    let totalMileage = 0;
    let totalCompensation = 0;

    for (const log of logs) {
      const hours = parseFloat(log.hours || "0");
      const mileage = parseFloat(log.mileage || "0");
      let logCost = parseFloat(log.totalCost || "0");
      
      const date = new Date(log.serviceDate);
      const dayOfWeek = date.getDay();

      // Check if it's a holiday using the Italian holiday calendar
      const isHoliday = this.isHolidayOrSunday(date);
      const isWeekend = dayOfWeek === 6; // Saturday
      
      // If no cost stored, calculate using default rates
      if (logCost === 0 && hours > 0) {
        const defaultWeekdayRate = 10; // €10/hour for weekdays
        const defaultHolidayRate = 30; // €30/hour for holidays/Sundays
        
        if (isHoliday) {
          logCost = hours * defaultHolidayRate;
        } else {
          logCost = hours * defaultWeekdayRate;
        }
      }
      
      totalMileage += mileage;
      totalCompensation += logCost;

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

    // Distribute total compensation proportionally based on hour types
    const totalHours = regularHours + overtimeHours + weekendHours + holidayHours;
    
    // Use simple proportional distribution for display purposes
    const baseCompensation = totalHours > 0 ? (regularHours / totalHours) * totalCompensation : 0;
    const overtimeCompensation = totalHours > 0 ? (overtimeHours / totalHours) * totalCompensation * 1.5 : 0;
    const weekendCompensation = totalHours > 0 ? (weekendHours / totalHours) * totalCompensation : 0;
    const holidayCompensation = totalHours > 0 ? (holidayHours / totalHours) * totalCompensation : 0;
    const mileageReimbursement = 0; // Can be tracked separately if needed

    // Adjust total to match actual costs from time logs
    const calculatedTotal = baseCompensation + overtimeCompensation + weekendCompensation + holidayCompensation + mileageReimbursement;

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
      totalCompensation, // Using actual costs from time logs with budget allocation rates
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
    console.log(`getUserDataForExport called with userId: ${userId}, includePersonal: ${includePersonal}, includeService: ${includeService}, includeFinancial: ${includeFinancial}`);
    const userData: any = {};
    
    try {
      // PHASE 2: COMPREHENSIVE PERSONAL DATA COLLECTION
      if (includePersonal) {
        console.log('Fetching comprehensive personal data...');
        
        // Get user profile with full details
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId));
        console.log('User found:', user ? 'Yes' : 'No');
        
        if (user) {
          userData.profile = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          };
          console.log('Personal profile data added to userData');
        }
        
        // Get user consents and preferences
        const consents = await db.select().from(userConsents).where(eq(userConsents.userId, userId));
        userData.consents = consents;
        console.log(`Found ${consents.length} consent records`);
        
        // Note: Clients are separate entities from users in this system
        // No direct client profile data for users
      }
      
      // PHASE 2: COMPREHENSIVE SERVICE DATA COLLECTION
      if (includeService) {
        console.log('Fetching comprehensive service data...');
        
        // Check if user is a staff member
        const [staffRecord] = await db.select().from(staff).where(eq(staff.userId, userId));
        if (staffRecord) {
          console.log('Staff member found: Yes');
          
          // Get staff profile and rates
          const staffRateRecords = await db.select().from(staffRates).where(eq(staffRates.staffId, staffRecord.id));
          
          // Get staff assignments
          const assignments = await db
            .select({
              assignment: clientStaffAssignments,
              client: clients
            })
            .from(clientStaffAssignments)
            .leftJoin(clients, eq(clientStaffAssignments.clientId, clients.id))
            .where(eq(clientStaffAssignments.staffId, staffRecord.id));
          
          // Get time logs for this staff member (comprehensive)
          const timeLogsData = await db
            .select({
              timeLog: timeLogs,
              client: clients
            })
            .from(timeLogs)
            .leftJoin(clients, eq(timeLogs.clientId, clients.id))
            .where(eq(timeLogs.staffId, staffRecord.id))
            .orderBy(desc(timeLogs.serviceDate))
            .limit(200); // Last 200 service records
          
          // Get compensation records
          const compensations = await db
            .select()
            .from(staffCompensations)
            .where(eq(staffCompensations.staffId, staffRecord.id))
            .orderBy(desc(staffCompensations.periodStart))
            .limit(100);
          
          userData.serviceData = {
            staffProfile: staffRecord,
            rates: staffRateRecords,
            assignments: assignments,
            serviceLogs: timeLogsData,
            compensationHistory: compensations
          };
          console.log(`Staff service data added: ${timeLogsData.length} service logs, ${compensations.length} compensation records`);
        } else {
          console.log('Staff member found: No');
        }
        
        // Note: Users are not directly linked to clients in this system
        // Client service data not applicable for user exports
      }
      
      // PHASE 2: COMPREHENSIVE FINANCIAL DATA COLLECTION
      if (includeFinancial) {
        console.log('Fetching comprehensive financial data...');
        
        // Note: Users are not directly linked to client budgets
        // Client financial data not applicable for user exports
        
        // If user is staff, get compensation data
        const [staffRecord] = await db.select().from(staff).where(eq(staff.userId, userId));
        if (staffRecord) {
          // Get compensation adjustments
          const adjustments = await db
            .select()
            .from(compensationAdjustments)
            .where(eq(compensationAdjustments.staffId, staffRecord.id))
            .orderBy(desc(compensationAdjustments.adjustmentDate))
            .limit(100);
          
          // Get compensation budget allocations
          const compBudgetAllocs = await db
            .select({
              allocation: compensationBudgetAllocations,
              budgetType: budgetTypes,
              compensation: staffCompensations
            })
            .from(compensationBudgetAllocations)
            .leftJoin(budgetTypes, eq(compensationBudgetAllocations.budgetTypeId, budgetTypes.id))
            .leftJoin(staffCompensations, eq(compensationBudgetAllocations.compensationId, staffCompensations.id))
            .where(eq(staffCompensations.staffId, staffRecord.id))
            .limit(200);
          
          if (!userData.financialData) userData.financialData = {};
          userData.financialData.staffFinancial = {
            compensationAdjustments: adjustments,
            budgetAllocations: compBudgetAllocs
          };
          console.log(`Staff financial data added: ${adjustments.length} adjustments, ${compBudgetAllocs.length} budget allocations`);
        }
      }
      
      // PHASE 2: COMPREHENSIVE SYSTEM DATA - ALWAYS INCLUDED
      console.log('Fetching comprehensive system data...');
      
      // Get extended access logs
      const accessLogs = await db
        .select()
        .from(dataAccessLogs)
        .where(eq(dataAccessLogs.userId, userId))
        .orderBy(desc(dataAccessLogs.createdAt))
        .limit(100); // Extended from 15 to 100
      
      // Get export requests history
      const exportRequests = await db
        .select()
        .from(dataExportRequests)
        .where(eq(dataExportRequests.userId, userId))
        .orderBy(desc(dataExportRequests.createdAt));
      
      // Get deletion requests if any
      const deletionRequests = await db
        .select()
        .from(dataDeletionRequests)
        .where(eq(dataDeletionRequests.userId, userId))
        .orderBy(desc(dataDeletionRequests.createdAt));
      
      console.log(`Found ${accessLogs.length} access logs, ${exportRequests.length} export requests, ${deletionRequests.length} deletion requests`);
      
      userData.systemData = {
        accessLogs: accessLogs,
        exportRequests: exportRequests,
        deletionRequests: deletionRequests,
        dataCollectionDate: new Date().toISOString(),
        dataScope: {
          includePersonal,
          includeService, 
          includeFinancial
        }
      };
      
      // Keep legacy accessLogs for backward compatibility
      userData.accessLogs = accessLogs;
      
      console.log('Final userData keys:', Object.keys(userData));
      return userData;
      
    } catch (error) {
      console.error('Error fetching user data for export:', error);
      throw error;
    }
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

  // Format user data as CSV - Enhanced for Phase 2
  async formatUserDataAsCsv(userData: any): Promise<string> {
    const csvRows: string[] = [];
    
    // Add CSV header
    csvRows.push('Section,Type,Key,Value');
    
    // Process profile data
    if (userData.profile) {
      Object.entries(userData.profile).forEach(([key, value]) => {
        if (key !== 'password') { // Exclude password for security
          csvRows.push(`Profile,Personal,${key},"${String(value).replace(/"/g, '""')}"`);
        }
      });
    }

    // Note: Client profiles are separate from user profiles in this system
    
    // Process consents data
    if (userData.consents && Array.isArray(userData.consents)) {
      userData.consents.forEach((consent: any, index: number) => {
        Object.entries(consent).forEach(([key, value]) => {
          csvRows.push(`Consent ${index + 1},Consent,${key},"${String(value).replace(/"/g, '""')}"`);
        });
      });
    }
    
    // Process comprehensive service data
    if (userData.serviceData) {
      // Staff service data
      if (userData.serviceData.staffProfile) {
        Object.entries(userData.serviceData.staffProfile).forEach(([key, value]) => {
          csvRows.push(`Staff Profile,Service,${key},"${String(value).replace(/"/g, '""')}"`);
        });
      }

      // Staff rates
      if (userData.serviceData.rates && Array.isArray(userData.serviceData.rates)) {
        userData.serviceData.rates.forEach((rate: any, index: number) => {
          Object.entries(rate).forEach(([key, value]) => {
            csvRows.push(`Staff Rate ${index + 1},Service,${key},"${String(value).replace(/"/g, '""')}"`);
          });
        });
      }

      // Service logs
      if (userData.serviceData.serviceLogs && Array.isArray(userData.serviceData.serviceLogs)) {
        userData.serviceData.serviceLogs.forEach((log: any, index: number) => {
          Object.entries(log.timeLog || log).forEach(([key, value]) => {
            csvRows.push(`Service Log ${index + 1},Service,${key},"${String(value).replace(/"/g, '""')}"`);
          });
          if (log.client) {
            Object.entries(log.client).forEach(([key, value]) => {
              csvRows.push(`Service Log ${index + 1} Client,Service,${key},"${String(value).replace(/"/g, '""')}"`);
            });
          }
        });
      }

      // Note: Client services are separate from user service data
    }

    // Process comprehensive financial data
    if (userData.financialData) {
      // Staff financial data
      if (userData.financialData.staffFinancial) {
        if (userData.financialData.staffFinancial.compensationAdjustments) {
          userData.financialData.staffFinancial.compensationAdjustments.forEach((adj: any, index: number) => {
            Object.entries(adj).forEach(([key, value]) => {
              csvRows.push(`Compensation Adjustment ${index + 1},Financial,${key},"${String(value).replace(/"/g, '""')}"`);
            });
          });
        }
      }
    }

    // Process comprehensive system data
    if (userData.systemData) {
      // Access logs
      if (userData.systemData.accessLogs && Array.isArray(userData.systemData.accessLogs)) {
        userData.systemData.accessLogs.forEach((log: any, index: number) => {
          Object.entries(log).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              csvRows.push(`Access Log ${index + 1},System,${key},"${JSON.stringify(value).replace(/"/g, '""')}"`);
            } else {
              csvRows.push(`Access Log ${index + 1},System,${key},"${String(value).replace(/"/g, '""')}"`);
            }
          });
        });
      }

      // Export requests
      if (userData.systemData.exportRequests && Array.isArray(userData.systemData.exportRequests)) {
        userData.systemData.exportRequests.forEach((request: any, index: number) => {
          Object.entries(request).forEach(([key, value]) => {
            csvRows.push(`Export Request ${index + 1},System,${key},"${String(value).replace(/"/g, '""')}"`);
          });
        });
      }

      // Deletion requests
      if (userData.systemData.deletionRequests && Array.isArray(userData.systemData.deletionRequests)) {
        userData.systemData.deletionRequests.forEach((request: any, index: number) => {
          Object.entries(request).forEach(([key, value]) => {
            csvRows.push(`Deletion Request ${index + 1},System,${key},"${String(value).replace(/"/g, '""')}"`);
          });
        });
      }
    }
    
    // Fallback: Process legacy access logs for backward compatibility
    if (userData.accessLogs && Array.isArray(userData.accessLogs) && !userData.systemData) {
      userData.accessLogs.forEach((log: any, index: number) => {
        Object.entries(log).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            csvRows.push(`Access Log ${index + 1},Audit,${key},"${JSON.stringify(value).replace(/"/g, '""')}"`);
          } else {
            csvRows.push(`Access Log ${index + 1},Audit,${key},"${String(value).replace(/"/g, '""')}"`);
          }
        });
      });
    }
    
    return csvRows.join('\n');
  }

  // Format user data as PDF using PDFKit
  async formatUserDataAsPdf(userData: any): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50 });
    
    // Collect PDF buffer chunks
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    
    // Return promise that resolves when PDF is complete
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      
      doc.on('error', reject);
      
      try {
        // Set document properties
        doc.info['Title'] = 'GDPR Data Export Report';
        doc.info['Author'] = 'Healthcare Management System';
        doc.info['Subject'] = 'Personal Data Export';
        
        // Helper function to add text with proper spacing
        const addText = (text: string, options: any = {}) => {
          if (doc.y > 700) { // Check if near bottom of page
            doc.addPage();
          }
          doc.text(text, options);
          return doc;
        };
        
        const addSpacing = (amount: number = 10) => {
          doc.moveDown(amount / 10);
        };
        
        // Title
        doc.fontSize(20).font('Helvetica-Bold')
          .text('GDPR DATA EXPORT REPORT', { align: 'center' });
        
        addSpacing(20);
        
        // Generation info with data metrics
        const totalDataPoints = [
          userData.profile ? 1 : 0,
          userData.consents?.length || 0,
          userData.serviceData ? 1 : 0,
          userData.financialData ? 1 : 0,
          userData.systemData?.accessLogs?.length || userData.accessLogs?.length || 0,
          userData.systemData?.exportRequests?.length || 0
        ].reduce((a, b) => a + b, 0);
        
        doc.fontSize(10).font('Helvetica')
          .text(`Generated: ${new Date().toISOString()}`, { align: 'center' })
          .text(`Export Type: Comprehensive GDPR Data Export (${totalDataPoints} data points)`, { align: 'center' })
          .text('Scope: Personal, Service, Financial & System Data with Full Audit Trail', { align: 'center' });
        
        addSpacing(30);
        
        // Personal Information Section - Enhanced
        if (userData.profile) {
          doc.fontSize(14).font('Helvetica-Bold')
            .text('PERSONAL INFORMATION');
          
          doc.fontSize(10).font('Helvetica')
            .text('_'.repeat(60));
          
          addSpacing(10);
          
          Object.entries(userData.profile).forEach(([key, value]) => {
            if (key !== 'password') { // Exclude password for security
              const displayKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
              doc.fontSize(10).font('Helvetica')
                .text(`${displayKey}: ${String(value)}`);
              addSpacing(5);
            }
          });
          
          addSpacing(20);
        }

        // Note: Client profiles are separate from user profiles in this system
        
        // GDPR Consents Section
        if (userData.consents && Array.isArray(userData.consents)) {
          doc.fontSize(14).font('Helvetica-Bold')
            .text('GDPR CONSENTS');
          
          doc.fontSize(10).font('Helvetica')
            .text('_'.repeat(60));
          
          addSpacing(10);
          
          if (userData.consents.length === 0) {
            doc.fontSize(10).font('Helvetica')
              .text('No consent records found');
          } else {
            userData.consents.forEach((consent: any, index: number) => {
              doc.fontSize(11).font('Helvetica-Bold')
                .text(`Consent Record ${index + 1}:`);
              
              Object.entries(consent).forEach(([key, value]) => {
                const displayKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
                doc.fontSize(10).font('Helvetica')
                  .text(`  ${displayKey}: ${String(value)}`);
                addSpacing(3);
              });
              addSpacing(10);
            });
          }
          
          addSpacing(20);
        }
        
        // System Data & Audit Trail Section - Enhanced
        const systemData = userData.systemData || {};
        const accessLogs = systemData.accessLogs || userData.accessLogs || [];
        
        doc.fontSize(14).font('Helvetica-Bold')
          .text('SYSTEM DATA & AUDIT TRAIL');
        
        doc.fontSize(10).font('Helvetica')
          .text('_'.repeat(60));
        
        addSpacing(10);
        
        // Data Collection Metadata
        if (systemData.dataCollectionDate) {
          doc.fontSize(11).font('Helvetica-Bold')
            .text('Data Collection Summary');
          
          doc.fontSize(9).font('Helvetica')
            .text(`Collection Date: ${systemData.dataCollectionDate}`)
            .text(`Personal Data: ${systemData.dataScope?.includePersonal ? 'Included' : 'Excluded'}`)
            .text(`Service Data: ${systemData.dataScope?.includeService ? 'Included' : 'Excluded'}`)  
            .text(`Financial Data: ${systemData.dataScope?.includeFinancial ? 'Included' : 'Excluded'}`);
          
          addSpacing(15);
        }
        
        // Export Requests History
        if (systemData.exportRequests && Array.isArray(systemData.exportRequests) && systemData.exportRequests.length > 0) {
          doc.fontSize(12).font('Helvetica-Bold')
            .text(`Data Export Requests (${systemData.exportRequests.length} total)`);
          
          addSpacing(5);
          
          systemData.exportRequests.slice(0, 5).forEach((request: any, index: number) => {
            doc.fontSize(10).font('Helvetica-Bold')
              .text(`[${index + 1}] Export Request - ${request.exportFormat?.toUpperCase() || 'UNKNOWN'}`);
            
            doc.fontSize(8).font('Helvetica')
              .text(`     Status: ${request.status || 'N/A'} | Created: ${request.createdAt || 'N/A'}`)
              .text(`     ID: ${request.id || 'N/A'}`);
            
            if (request.completedAt) {
              doc.text(`     Completed: ${request.completedAt}`);
            }
            
            addSpacing(6);
          });
          
          if (systemData.exportRequests.length > 5) {
            doc.fontSize(8).font('Helvetica')
              .text(`... and ${systemData.exportRequests.length - 5} more export requests`);
          }
          
          addSpacing(10);
        }
        
        // Deletion Requests History
        if (systemData.deletionRequests && Array.isArray(systemData.deletionRequests)) {
          if (systemData.deletionRequests.length > 0) {
            doc.fontSize(12).font('Helvetica-Bold')
              .text(`Data Deletion Requests (${systemData.deletionRequests.length} total)`);
            
            systemData.deletionRequests.forEach((request: any, index: number) => {
              doc.fontSize(10).font('Helvetica-Bold')
                .text(`[${index + 1}] Deletion Request - ${request.status?.toUpperCase() || 'PENDING'}`);
              
              doc.fontSize(8).font('Helvetica')
                .text(`     Reason: ${request.reason || 'Not specified'}`)
                .text(`     Created: ${request.createdAt || 'N/A'}`)
                .text(`     ID: ${request.id || 'N/A'}`);
              
              addSpacing(6);
            });
          } else {
            doc.fontSize(12).font('Helvetica-Bold')
              .text('Data Deletion Requests: None requested');
          }
          
          addSpacing(10);
        }
        
        // Access Logs - Enhanced
        if (accessLogs.length > 0) {
          doc.fontSize(12).font('Helvetica-Bold')
            .text(`Access Activity Logs (${accessLogs.length} total records)`);
          
          addSpacing(8);
          
          // Group logs by action type for better summary
          const logSummary = accessLogs.reduce((acc: any, log: any) => {
            const action = log.action || 'unknown';
            acc[action] = (acc[action] || 0) + 1;
            return acc;
          }, {});
          
          doc.fontSize(9).font('Helvetica')
            .text(`Activity Summary: ${Object.entries(logSummary).map(([action, count]) => `${action}: ${count}`).join(', ')}`);
          
          addSpacing(8);
          
          // Show detailed logs (first 12 for better coverage)
          accessLogs.slice(0, 12).forEach((log: any, index: number) => {
            if (doc.y > 650) { // Check if we need a new page
              doc.addPage();
            }
            
            doc.fontSize(10).font('Helvetica-Bold')
              .text(`[${index + 1}] ${(log.action || 'action').toUpperCase()} - ${log.entityType || 'unknown'}`);
            
            doc.fontSize(8).font('Helvetica')
              .text(`     ${log.createdAt || 'No timestamp'} | IP: ${log.ipAddress || 'Unknown'}`);
            
            if (log.userAgent) {
              const shortUA = log.userAgent.substring(0, 70) + (log.userAgent.length > 70 ? '...' : '');
              doc.fontSize(7).font('Helvetica')
                .text(`     User Agent: ${shortUA}`);
            }
            
            if (log.details && typeof log.details === 'object') {
              const detailsEntries = Object.entries(log.details);
              if (detailsEntries.length > 0) {
                doc.fontSize(7).font('Helvetica')
                  .text(`     Details: ${detailsEntries.map(([k, v]) => `${k}=${v}`).join(', ').substring(0, 100)}${JSON.stringify(log.details).length > 100 ? '...' : ''}`);
              }
            }
            
            addSpacing(7);
          });
          
          // Summary for remaining logs
          if (accessLogs.length > 12) {
            doc.fontSize(9).font('Helvetica')
              .text(`... and ${accessLogs.length - 12} additional access records`)
              .text('(Complete detailed logs available in CSV export for analysis)');
          }
          
          addSpacing(15);
        } else {
          doc.fontSize(11).font('Helvetica')
            .text('No access activity logs found');
          addSpacing(10);
        }
        
        // Service Data Section - Enhanced
        if (userData.serviceData) {
          doc.fontSize(14).font('Helvetica-Bold')
            .text('SERVICE DATA');
          
          doc.fontSize(10).font('Helvetica')
            .text('_'.repeat(60));
          
          addSpacing(10);
          
          // Staff profile
          if (userData.serviceData.staffProfile) {
            doc.fontSize(12).font('Helvetica-Bold')
              .text('Staff Profile:');
            Object.entries(userData.serviceData.staffProfile).forEach(([key, value]) => {
              const displayKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
              doc.fontSize(9).font('Helvetica')
                .text(`  ${displayKey}: ${String(value)}`);
              addSpacing(3);
            });
            addSpacing(10);
          }

          // Service logs summary
          if (userData.serviceData.serviceLogs && Array.isArray(userData.serviceData.serviceLogs)) {
            doc.fontSize(12).font('Helvetica-Bold')
              .text(`Service Logs (${userData.serviceData.serviceLogs.length} records):`);
            userData.serviceData.serviceLogs.slice(0, 5).forEach((log: any, index: number) => {
              doc.fontSize(9).font('Helvetica-Bold')
                .text(`  Log ${index + 1}:`);
              const timeLog = log.timeLog || log;
              doc.fontSize(8).font('Helvetica')
                .text(`    Service Date: ${timeLog.serviceDate || 'N/A'}`)
                .text(`    Duration: ${timeLog.duration || 'N/A'} minutes`)
                .text(`    Service Type: ${timeLog.serviceType || 'N/A'}`);
              addSpacing(5);
            });
            if (userData.serviceData.serviceLogs.length > 5) {
              doc.fontSize(9).font('Helvetica')
                .text(`  ... and ${userData.serviceData.serviceLogs.length - 5} more service records`);
            }
            addSpacing(10);
          }

          // Note: Client services are separate from user service data
          
          addSpacing(20);
        }
        
        // Financial Data Section - Enhanced
        if (userData.financialData) {
          doc.fontSize(14).font('Helvetica-Bold')
            .text('FINANCIAL DATA');
          
          doc.fontSize(10).font('Helvetica')
            .text('_'.repeat(60));
          
          addSpacing(10);
          
          // Note: Client budgets and expenses are separate from user financial data

          // Staff financial data
          if (userData.financialData.staffFinancial) {
            doc.fontSize(12).font('Helvetica-Bold')
              .text('Staff Financial Data:');
            
            if (userData.financialData.staffFinancial.compensationAdjustments) {
              doc.fontSize(10).font('Helvetica')
                .text(`  Compensation Adjustments: ${userData.financialData.staffFinancial.compensationAdjustments.length} records`);
            }
            
            if (userData.financialData.staffFinancial.budgetAllocations) {
              doc.fontSize(10).font('Helvetica')
                .text(`  Budget Allocations: ${userData.financialData.staffFinancial.budgetAllocations.length} records`);
            }
            addSpacing(10);
          }
          
          addSpacing(20);
        }
        
        // Footer
        doc.fontSize(12).font('Helvetica-Bold')
          .text('_'.repeat(60), { align: 'center' });
        
        addSpacing(10);
        
        doc.fontSize(10).font('Helvetica')
          .text('End of GDPR Data Export Report', { align: 'center' })
          .text('Generated by Healthcare Management System', { align: 'center' })
          .text('For questions, contact: Data Protection Officer', { align: 'center' });
        
        // Add page numbers
        const pages = doc.bufferedPageRange();
        for (let i = pages.start; i < (pages.start + pages.count); i++) {
          doc.switchToPage(i);
          doc.fontSize(8).font('Helvetica')
            .text(`Page ${i + 1} of ${pages.count}`, 50, doc.page.height - 30, {
              align: 'center',
              width: doc.page.width - 100
            });
        }
        
        // Finalize the PDF
        doc.end();
        
      } catch (error) {
        reject(error);
      }
    });
  }

  // Document Management Operations (Phase 2 GDPR)
  async getDocuments(filters?: {
    category?: string;
    entityType?: string;
    entityId?: string;
    isDeleted?: boolean;
  }): Promise<Document[]> {
    let query = db.select({
      id: documents.id,
      file_name: documents.fileName,
      original_name: documents.originalName,
      mime_type: documents.mimeType,
      file_size: documents.fileSize,
      storage_path: documents.storagePath,
      category: documents.category,
      entity_type: documents.entityType,
      entity_id: documents.entityId,
      is_encrypted: documents.isEncrypted,
      encryption_key_id: documents.encryptionKeyId,
      access_level: documents.accessLevel,
      tags: documents.tags,
      description: documents.description,
      version: documents.version,
      parent_document_id: documents.parentDocumentId,
      is_latest_version: documents.isLatestVersion,
      uploaded_by: documents.uploadedBy,
      last_accessed_at: documents.lastAccessedAt,
      last_accessed_by: documents.lastAccessedBy,
      retention_policy_id: documents.retentionPolicyId,
      scheduled_deletion_at: documents.scheduledDeletionAt,
      is_deleted: documents.isDeleted,
      deleted_at: documents.deletedAt,
      deleted_by: documents.deletedBy,
      created_at: documents.createdAt,
      updated_at: documents.updatedAt,
    }).from(documents);
    const conditions = [];

    if (filters?.category) {
      conditions.push(eq(documents.category, filters.category));
    }
    if (filters?.entityType) {
      conditions.push(eq(documents.entityType, filters.entityType));
    }
    if (filters?.entityId) {
      conditions.push(eq(documents.entityId, filters.entityId));
    }
    if (filters?.isDeleted !== undefined) {
      conditions.push(eq(documents.isDeleted, filters.isDeleted));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(documents.createdAt));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    // Ensure we don't pass id, createdAt, or updatedAt - let database handle these
    const { id, createdAt, updatedAt, ...documentData } = document as any;
    
    const [newDocument] = await db.insert(documents).values({
      ...documentData,
      isEncrypted: true, // Always encrypt documents for GDPR compliance
    }).returning();
    
    // Log the document creation for audit trail
    await this.createDocumentAccessLog({
      documentId: newDocument.id,
      userId: document.uploadedBy,
      action: 'upload',
      details: { fileName: document.fileName, category: document.category }
    });

    return newDocument;
  }

  async updateDocument(id: string, document: Partial<InsertDocument>): Promise<Document> {
    const [updatedDocument] = await db
      .update(documents)
      .set({ ...document, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return updatedDocument;
  }

  async deleteDocument(id: string, deletedBy: string): Promise<void> {
    await db
      .update(documents)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: deletedBy,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, id));
      
    // Log the document deletion for audit trail
    await this.createDocumentAccessLog({
      documentId: id,
      userId: deletedBy,
      action: 'delete',
      details: { reason: 'Manual deletion' }
    });
  }

  // Document access logging for GDPR audit compliance
  async getDocumentAccessLogs(documentId?: string): Promise<DocumentAccessLog[]> {
    let query = db
      .select({
        id: documentAccessLogs.id,
        documentId: documentAccessLogs.documentId,
        userId: documentAccessLogs.userId,
        action: documentAccessLogs.action,
        ipAddress: documentAccessLogs.ipAddress,
        userAgent: documentAccessLogs.userAgent,
        accessedAt: documentAccessLogs.accessedAt,
        details: documentAccessLogs.details,
      })
      .from(documentAccessLogs)
      .leftJoin(users, eq(documentAccessLogs.userId, users.id));

    if (documentId) {
      query = query.where(eq(documentAccessLogs.documentId, documentId));
    }

    return await query.orderBy(desc(documentAccessLogs.accessedAt));
  }

  async createDocumentAccessLog(log: InsertDocumentAccessLog): Promise<DocumentAccessLog> {
    const [newLog] = await db.insert(documentAccessLogs).values({
      ...log,
      accessedAt: new Date(),
    }).returning();
    return newLog;
  }

  // Document permissions for role-based access control
  async getDocumentPermissions(documentId: string): Promise<DocumentPermission[]> {
    return await db
      .select()
      .from(documentPermissions)
      .where(and(
        eq(documentPermissions.documentId, documentId),
        eq(documentPermissions.isActive, true)
      ))
      .orderBy(desc(documentPermissions.grantedAt));
  }

  async createDocumentPermission(permission: InsertDocumentPermission): Promise<DocumentPermission> {
    const [newPermission] = await db.insert(documentPermissions).values({
      ...permission,
      grantedAt: new Date(),
    }).returning();
    return newPermission;
  }

  async updateDocumentPermission(id: string, permission: Partial<InsertDocumentPermission>): Promise<DocumentPermission> {
    const [updatedPermission] = await db
      .update(documentPermissions)
      .set(permission)
      .where(eq(documentPermissions.id, id))
      .returning();
    return updatedPermission;
  }

  async deleteDocumentPermission(id: string): Promise<void> {
    await db
      .update(documentPermissions)
      .set({ isActive: false })
      .where(eq(documentPermissions.id, id));
  }

  // Document retention schedules for automated GDPR compliance
  async getDocumentRetentionSchedules(status?: string): Promise<DocumentRetentionSchedule[]> {
    let query = db.select().from(documentRetentionSchedules);

    if (status) {
      query = query.where(eq(documentRetentionSchedules.status, status));
    }

    return await query.orderBy(desc(documentRetentionSchedules.scheduledDate));
  }

  async createDocumentRetentionSchedule(schedule: InsertDocumentRetentionSchedule): Promise<DocumentRetentionSchedule> {
    const [newSchedule] = await db.insert(documentRetentionSchedules).values({
      ...schedule,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return newSchedule;
  }

  async updateDocumentRetentionSchedule(id: string, schedule: Partial<InsertDocumentRetentionSchedule>): Promise<DocumentRetentionSchedule> {
    const [updatedSchedule] = await db
      .update(documentRetentionSchedules)
      .set({ ...schedule, updatedAt: new Date() })
      .where(eq(documentRetentionSchedules.id, id))
      .returning();
    return updatedSchedule;
  }

  async executeDocumentRetention(scheduleId: string, executedBy: string): Promise<void> {
    // Get the retention schedule
    const [schedule] = await db
      .select()
      .from(documentRetentionSchedules)
      .where(eq(documentRetentionSchedules.id, scheduleId));

    if (!schedule) {
      throw new Error('Retention schedule not found');
    }

    try {
      // Update schedule status to processing
      await db
        .update(documentRetentionSchedules)
        .set({ status: 'processing', updatedAt: new Date() })
        .where(eq(documentRetentionSchedules.id, scheduleId));

      // Perform the actual document deletion (GDPR compliant secure deletion)
      await this.deleteDocument(schedule.documentId, executedBy);

      // Mark schedule as completed
      await db
        .update(documentRetentionSchedules)
        .set({
          status: 'completed',
          executedAt: new Date(),
          executedBy: executedBy,
          updatedAt: new Date(),
        })
        .where(eq(documentRetentionSchedules.id, scheduleId));

    } catch (error) {
      // Mark schedule as failed with error message
      await db
        .update(documentRetentionSchedules)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date(),
        })
        .where(eq(documentRetentionSchedules.id, scheduleId));

      throw error;
    }
  }

  // Payment Records Methods - Simplified approach using time logs directly
  async getPaymentRecords(filters: {
    startDate: Date;
    endDate: Date;
    clientId?: string;
    statuses?: string[];
    staffId?: string;
    serviceType?: string;
    paymentDue?: string;
  }): Promise<{
    records: any[];
    summary: any;
  }> {
    try {
      const { startDate, endDate, clientId, statuses, staffId, serviceType, paymentDue } = filters;

      // Validate input dates
      const filterStartDate = new Date(startDate);
      const filterEndDate = new Date(endDate);
      
      if (isNaN(filterStartDate.getTime()) || isNaN(filterEndDate.getTime())) {
        console.error('Invalid filter dates provided:', startDate, endDate);
        return {
          records: [],
          summary: {
            totalClients: 0,
            totalStaff: 0,
            totalHours: 0,
            totalAmount: 0,
            totalBudgetCoverage: 0,
            totalClientPayments: 0,
          },
        };
      }

      console.log('Querying compensations with filters:', { startDate, endDate, statuses, staffId });

      // Helper function to safely convert dates (same as in routes.ts)
      const toDate = (date: any): Date | null => {
        if (!date) return null;
        if (date instanceof Date && !isNaN(date.getTime())) {
          return date;
        }
        if (typeof date === 'string') {
          const parsed = new Date(date);
          if (!isNaN(parsed.getTime())) {
            return parsed;
          }
        }
        // For Invalid Date objects from Drizzle, try to parse from ISO string
        if (date instanceof Date && isNaN(date.getTime())) {
          // Fetch raw value from database
          return null;
        }
        return null;
      };

      // Get all staff compensation records filtered by creation date using raw query
      const allCompensationsRaw = await db.execute(sql`
        SELECT * FROM staff_compensations
        WHERE created_at >= ${filterStartDate.toISOString()}
        AND created_at <= ${filterEndDate.toISOString()}
        ${staffId ? sql`AND staff_id = ${staffId}` : sql``}
        ${statuses && statuses.length > 0 ? 
          sql`AND status IN (${sql.join(statuses.map(s => sql`${s}`), sql`, `)})` : 
          sql``}
      `);

      console.log('Found compensations filtered by creation date:', allCompensationsRaw.rows.length);

      // Convert raw rows to proper format with date parsing
      const compensationQuery = allCompensationsRaw.rows.map((row: any) => ({
        ...row,
        periodStart: toDate(row.period_start),
        periodEnd: toDate(row.period_end),
        createdAt: toDate(row.created_at),
        updatedAt: toDate(row.updated_at),
        approvedAt: toDate(row.approved_at),
        paidAt: toDate(row.paid_at),
        // Convert snake_case to camelCase for other fields
        staffId: row.staff_id,
        regularHours: row.regular_hours,
        overtimeHours: row.overtime_hours,
        weekendHours: row.weekend_hours,
        holidayHours: row.holiday_hours,
        totalMileage: row.total_mileage,
        baseCompensation: row.base_compensation,
        overtimeCompensation: row.overtime_compensation,
        weekendCompensation: row.weekend_compensation,
        holidayCompensation: row.holiday_compensation,
        mileageReimbursement: row.mileage_reimbursement,
        totalCompensation: row.total_compensation,
        approvedBy: row.approved_by,
        paySlipGenerated: row.pay_slip_generated,
        paySlipUrl: row.pay_slip_url
      }));

      console.log('Total compensations after filtering:', compensationQuery.length);

      if (!compensationQuery || compensationQuery.length === 0) {
        return {
          records: [],
          summary: {
            totalClients: 0,
            totalStaff: 0,
            totalHours: 0,
            totalAmount: 0,
            totalBudgetCoverage: 0,
            totalClientPayments: 0,
          },
        };
      }

      // Get staff and client information
      const allStaff = await db.select().from(staff);
      const staffMap = new Map(allStaff.map(s => [s.id, s]));

      const allClients = await db.select().from(clients);
      const clientMap = new Map(allClients.map(c => [c.id, c]));

      // Helper function to check if a date is Sunday or Italian holiday
      const isHolidayOrSunday = (date: Date): boolean => {
        // Check if Sunday (day 0 in JavaScript)
        if (date.getDay() === 0) return true;
        
        // Check Italian holidays (simplified - you may want to expand this)
        const month = date.getMonth() + 1; // JavaScript months are 0-indexed
        const day = date.getDate();
        
        // Italian fixed holidays
        const holidays = [
          { month: 1, day: 1 },   // New Year's Day
          { month: 1, day: 6 },   // Epiphany
          { month: 4, day: 25 },  // Liberation Day
          { month: 5, day: 1 },   // Labour Day
          { month: 6, day: 2 },   // Republic Day
          { month: 8, day: 15 },  // Ferragosto
          { month: 11, day: 1 },  // All Saints' Day
          { month: 12, day: 8 },  // Immaculate Conception
          { month: 12, day: 25 }, // Christmas Day
          { month: 12, day: 26 }, // St. Stephen's Day
        ];
        
        return holidays.some(h => h.month === month && h.day === day);
      };

      // Create payment records from compensation data
      const records = [];
      
      for (const compensation of compensationQuery) {
        const staffInfo = staffMap.get(compensation.staffId);
        if (!staffInfo) continue;

        // Filter by service type (staff type) early if specified
        if (serviceType && serviceType !== 'all' && staffInfo.type !== serviceType) {
          continue;
        }

        // Use the already validated dates from the filter step
        let periodStart, periodEnd;
        
        try {
          periodStart = compensation.periodStart instanceof Date ? compensation.periodStart : new Date(compensation.periodStart);
          periodEnd = compensation.periodEnd instanceof Date ? compensation.periodEnd : new Date(compensation.periodEnd);
          
          if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
            console.warn('Invalid compensation period dates:', compensation.periodStart, compensation.periodEnd, 'for compensation:', compensation.id);
            continue; // Skip this compensation record
          }
        } catch (error) {
          console.warn('Error parsing compensation dates:', compensation.id, error);
          continue;
        }

        // Get all time logs for this staff member (no date filtering on time logs)
        const allTimeLogsRaw = await db.execute(sql`
          SELECT * FROM time_logs
          WHERE staff_id = ${compensation.staffId}
          ${clientId ? sql`AND client_id = ${clientId}` : sql``}
        `);

        // Convert raw rows to proper format
        const timeLogsForStaff = allTimeLogsRaw.rows
          .map((row: any) => ({
            ...row,
            serviceDate: toDate(row.service_date),
            serviceStartDatetime: toDate(row.service_start_datetime),
            serviceEndDatetime: toDate(row.service_end_datetime),
            createdAt: toDate(row.created_at),
            updatedAt: toDate(row.updated_at),
            // Convert snake_case to camelCase
            clientId: row.client_id,
            staffId: row.staff_id,
            serviceType: row.service_type,
            hourlyRate: row.hourly_rate,
            totalCost: row.total_cost,
            importId: row.import_id,
            lastImportId: row.last_import_id,
            externalIdentifier: row.external_identifier
          }))
          .filter(log => {
            if (!log.serviceDate) {
              console.warn('Skipping time log with null date:', log.id);
              return false;
            }
            return true; // Already filtered by SQL query
          });

        // Group time logs by client
        const clientGroups = new Map<string, any>();

        for (const log of timeLogsForStaff) {
          // Validate service date
          const serviceDate = new Date(log.serviceDate);
          if (isNaN(serviceDate.getTime())) {
            console.warn('Invalid service date found:', log.serviceDate, 'for log:', log.id);
            continue; // Skip invalid dates
          }

          if (!clientGroups.has(log.clientId)) {
            clientGroups.set(log.clientId, {
              clientId: log.clientId,
              logs: [],
              totalHours: 0,
              regularHours: 0,
              holidayHours: 0,
              firstServiceDate: log.serviceDate,
              lastServiceDate: log.serviceDate,
            });
          }

          const group = clientGroups.get(log.clientId);
          group.logs.push(log);
          group.totalHours += parseFloat(log.hours || '0');
          
          // Check if service was on holiday/Sunday
          if (isHolidayOrSunday(serviceDate)) {
            group.holidayHours += parseFloat(log.hours || '0');
          } else {
            group.regularHours += parseFloat(log.hours || '0');
          }
          
          // Update date range with proper date validation
          if (log.serviceDate < group.firstServiceDate) {
            group.firstServiceDate = log.serviceDate;
          }
          if (log.serviceDate > group.lastServiceDate) {
            group.lastServiceDate = log.serviceDate;
          }
        }

        // Create one record per client for this staff member
        for (const [clientId, clientData] of clientGroups) {
          const clientInfo = clientMap.get(clientId);
          if (!clientInfo) continue;
          if (clientInfo.lastName === 'Assistance' && clientInfo.firstName === 'Direct') continue;
        
          // Calculate compensation amount for this specific client
          const regularRate = 10; // €10 per hour for regular time
          const holidayRate = 30; // €30 per hour for holidays/Sundays
          
          const regularAmount = clientData.regularHours * regularRate;
          const holidayAmount = clientData.holidayHours * holidayRate;
          const totalAmount = regularAmount + holidayAmount;

          // Get budget allocations for this client (simplified to avoid date comparison issues)
          const allocations = await db
            .select()
            .from(clientBudgetAllocations)
            .where(eq(clientBudgetAllocations.clientId, clientId));
          
          // Get budget type details
          const budgetAllocations = [];
          let totalBudgetCoverage = 0;
          
          for (const allocation of allocations) {
            const budgetType = await db
              .select()
              .from(budgetTypes)
              .where(eq(budgetTypes.id, allocation.budgetTypeId))
              .limit(1);
            
            if (budgetType[0]) {
              const amount = parseFloat(allocation.allocatedAmount || '0');
              totalBudgetCoverage += amount;
              budgetAllocations.push({
                budgetType: budgetType[0].name,
                amount: amount,
                hours: parseFloat(allocation.allocatedHours || '0'),
              });
            }
          }
          
          const clientPaymentDue = Math.max(0, totalAmount - totalBudgetCoverage);
          
          const record = {
            id: `${compensation.staffId}-${clientId}-${compensation.periodStart.getTime()}`,
            compensationId: compensation.id,
            clientId: clientId,
            clientName: `${clientInfo.lastName}, ${clientInfo.firstName}`,
            staffId: compensation.staffId,
            staffName: `${staffInfo.lastName}, ${staffInfo.firstName}`,
            staffType: staffInfo.type || 'internal',
            periodStart: clientData.firstServiceDate,
            periodEnd: clientData.lastServiceDate,
            totalHours: clientData.totalHours,
            weekdayHours: clientData.regularHours,
            holidayHours: clientData.holidayHours,
            totalAmount,
            budgetAllocations,
            clientPaymentDue,
            paymentStatus: compensation.status, // Use actual compensation status
            compensationAmount: parseFloat(compensation.totalCompensation || '0'),
            generatedAt: compensation.createdAt || new Date(),
          };

          // Apply payment due filter if specified
          if (paymentDue && paymentDue !== 'all') {
            if (paymentDue === 'outstanding' && clientPaymentDue === 0) continue;
            if (paymentDue === 'covered' && clientPaymentDue > 0) continue;
          }

          records.push(record);
        }
      }

      // Calculate summary based on records
      const uniqueClients = new Set(records.map(r => r.clientId));
      const uniqueStaff = new Set(records.map(r => r.staffId));

      const summary = {
        totalClients: uniqueClients.size,
        totalStaff: uniqueStaff.size,
        totalHours: records.reduce((sum, r) => sum + r.totalHours, 0),
        totalAmount: records.reduce((sum, r) => sum + r.totalAmount, 0),
        totalBudgetCoverage: records.reduce((sum, r) => 
          r.budgetAllocations.reduce((allocSum, alloc) => allocSum + alloc.amount, 0), 0
        ),
        totalClientPayments: records.reduce((sum, r) => sum + r.clientPaymentDue, 0),
      };

      return {
        records,
        summary,
      };
    } catch (error) {
      console.error('Error in getPaymentRecords:', error);
      return {
        records: [],
        summary: {
          totalClients: 0,
          totalStaff: 0,
          totalHours: 0,
          totalAmount: 0,
          totalBudgetCoverage: 0,
          totalClientPayments: 0,
        },
      };
    }
  }

  async generatePaymentRecordsPDF(data: {
    startDate: string;
    endDate: string;
    clientId?: string;
    records: any[];
    summary: any;
  }): Promise<Buffer> {
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', chunk => chunks.push(chunk));

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Client Payment Records Report', { align: 'center' });
      doc.moveDown();

      // Report details
      doc.fontSize(12)
         .text(`Period: ${new Date(data.startDate).toLocaleDateString()} - ${new Date(data.endDate).toLocaleDateString()}`)
         .text(`Generated: ${new Date().toLocaleDateString()}`)
         .text(`Total Records: ${data.records.length}`);

      if (data.clientId) {
        const clientName = data.records[0]?.clientName || 'Unknown Client';
        doc.text(`Client: ${clientName}`);
      }

      // Removed staff type filter since it's not available in current schema

      doc.moveDown();

      // Summary section
      doc.fontSize(14).text('Summary', { underline: true });
      doc.fontSize(10)
         .text(`Total Clients: ${data.summary.totalClients}`)
         .text(`Total Staff: ${data.summary.totalStaff}`)
         .text(`Total Hours: ${data.summary.totalHours.toFixed(1)}`)
         .text(`Total Amount: €${data.summary.totalAmount.toFixed(2)}`)
         .text(`Budget Coverage: €${data.summary.totalBudgetCoverage.toFixed(2)}`)
         .text(`Client Payments Due: €${data.summary.totalClientPayments.toFixed(2)}`);

      doc.moveDown();

      // Records table
      if (data.records.length > 0) {
        doc.fontSize(14).text('Payment Records', { underline: true });
        doc.moveDown(0.5);

        // Table headers
        doc.fontSize(8);
        const tableTop = doc.y;
        const rowHeight = 20;
        
        // Column positions
        const cols = {
          client: 50,
          staff: 120,
          type: 170,
          hours: 200,
          amount: 240,
          budget: 280,
          payment: 330,
          status: 370
        };

        // Headers
        doc.text('Client', cols.client, tableTop);
        doc.text('Staff', cols.staff, tableTop);
        doc.text('Type', cols.type, tableTop);
        doc.text('Hours', cols.hours, tableTop);
        doc.text('Amount', cols.amount, tableTop);
        doc.text('Budget', cols.budget, tableTop);
        doc.text('Payment', cols.payment, tableTop);
        doc.text('Status', cols.status, tableTop);

        // Draw header line
        doc.moveTo(50, tableTop + 15)
           .lineTo(450, tableTop + 15)
           .stroke();

        let currentY = tableTop + rowHeight;

        // Data rows
        data.records.forEach((record, index) => {
          if (currentY > 700) { // Start new page if needed
            doc.addPage();
            currentY = 50;
          }

          doc.text(record.clientName.substring(0, 15), cols.client, currentY);
          doc.text(record.staffName.substring(0, 10), cols.staff, currentY);
          doc.text(record.staffType, cols.type, currentY);
          doc.text(record.totalHours.toFixed(1), cols.hours, currentY);
          doc.text(`€${record.totalAmount.toFixed(2)}`, cols.amount, currentY);
          
          const budgetTotal = record.budgetAllocations.reduce((sum: number, alloc: any) => sum + alloc.amount, 0);
          doc.text(`€${budgetTotal.toFixed(2)}`, cols.budget, currentY);
          doc.text(`€${record.clientPaymentDue.toFixed(2)}`, cols.payment, currentY);
          doc.text(record.paymentStatus, cols.status, currentY);

          currentY += rowHeight;
        });
      }

      // Footer
      doc.fontSize(8)
         .text('Generated by Healthcare Service Management System', 50, 750, { align: 'center' });

      doc.end();
    });
  }

  // Calendar appointments operations
  async getCalendarAppointments(): Promise<CalendarAppointment[]> {
    return await db
      .select({
        id: calendarAppointments.id,
        clientId: calendarAppointments.clientId,
        staffId: calendarAppointments.staffId,
        serviceType: calendarAppointments.serviceType,
        startDateTime: calendarAppointments.startDateTime,
        endDateTime: calendarAppointments.endDateTime,
        status: calendarAppointments.status,
        notes: calendarAppointments.notes,
        createdBy: calendarAppointments.createdBy,
        createdAt: calendarAppointments.createdAt,
        updatedAt: calendarAppointments.updatedAt,
        // Include related data
        client: clients,
        staff: staff,
      })
      .from(calendarAppointments)
      .leftJoin(clients, eq(calendarAppointments.clientId, clients.id))
      .leftJoin(staff, eq(calendarAppointments.staffId, staff.id))
      .orderBy(desc(calendarAppointments.startDateTime));
  }

  async getCalendarAppointment(id: string): Promise<CalendarAppointment | undefined> {
    const [appointment] = await db
      .select()
      .from(calendarAppointments)
      .where(eq(calendarAppointments.id, id));
    return appointment;
  }

  async createCalendarAppointment(appointment: InsertCalendarAppointment): Promise<CalendarAppointment> {
    const [newAppointment] = await db
      .insert(calendarAppointments)
      .values(appointment)
      .returning();
    return newAppointment;
  }

  async updateCalendarAppointment(
    id: string,
    appointment: Partial<InsertCalendarAppointment>
  ): Promise<CalendarAppointment> {
    const [updatedAppointment] = await db
      .update(calendarAppointments)
      .set({ ...appointment, updatedAt: new Date() })
      .where(eq(calendarAppointments.id, id))
      .returning();
    return updatedAppointment;
  }

  async deleteCalendarAppointment(id: string): Promise<void> {
    await db.delete(calendarAppointments).where(eq(calendarAppointments.id, id));
  }
}

export const storage = new DatabaseStorage();
