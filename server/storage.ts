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
  periodValidations,
  periodLocks,
  systemAuditLog,
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
  type PeriodValidation,
  type InsertPeriodValidation,
  type PeriodLock,
  type InsertPeriodLock,
  type SystemAuditLog,
  type InsertSystemAuditLog,
  mileageLogs,
  mileageDisputes,
  importAuditTrail,
  type ImportAuditTrail,
  type InsertImportAuditTrail,
  compensations,
  compensationAuditLog,
  type Compensation,
  type InsertCompensation,
  type CompensationAuditLog,
  type InsertCompensationAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, asc, gte, lte, or, isNull, isNotNull, inArray, ne, gt, lt, like, exists } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { format, parseISO, startOfMonth, endOfMonth, subMonths, addMonths, startOfYear, endOfYear, addDays, subDays, format as formatDate, startOfDay, endOfDay } from "date-fns";
import { it, enUS } from "date-fns/locale";
import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { distance } from "fuzzball";
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
  getStaff(): Promise<Staff[]>;
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
  getTimeLogsByDateRange(
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
  getStaffAccessLogs(staffId: string, startDate: string, endDate: string): Promise<any[]>;
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
  
  // Compensation operations
  getCompensations(periodStart?: Date, periodEnd?: Date): Promise<(Compensation & { staff: Staff })[]>;
  getCompensation(id: string): Promise<Compensation | undefined>;
  getCompensationByStaffAndPeriod(staffId: string, periodStart: Date, periodEnd: Date): Promise<Compensation | undefined>;
  createCompensation(compensation: InsertCompensation): Promise<Compensation>;
  updateCompensation(id: string, compensation: Partial<InsertCompensation>): Promise<Compensation>;
  deleteCompensation(id: string): Promise<void>;
  createCompensationAuditLog(log: InsertCompensationAuditLog): Promise<CompensationAuditLog>;
  getCompensationAuditLogs(compensationId: string): Promise<CompensationAuditLog[]>;

  // Validation and lock management
  getPeriodValidations(): Promise<PeriodValidation[]>;
  createPeriodValidation(validation: InsertPeriodValidation): Promise<PeriodValidation>;
  checkPeriodValidation(startDate: string, endDate: string): Promise<PeriodValidation | undefined>;
  
  getPeriodLocks(): Promise<PeriodLock[]>;
  createPeriodLock(lock: InsertPeriodLock): Promise<PeriodLock>;
  acquirePeriodLock(startDate: string, endDate: string, userId: string, operationType: string, sessionId?: string): Promise<PeriodLock | null>;
  releasePeriodLock(lockId: string): Promise<void>;
  checkActiveLock(startDate: string, endDate: string): Promise<PeriodLock | undefined>;
  cleanupExpiredLocks(): Promise<void>;
  
  getSystemAuditLogs(): Promise<SystemAuditLog[]>;
  createSystemAuditLog(auditLog: InsertSystemAuditLog): Promise<SystemAuditLog>;
  
  // Excel import intelligence
  findExistingRecordByKey(identifier: string, assistedPersonId: string, operatorId: string, scheduledStart: string): Promise<ExcelData | undefined>;
  batchUpsertExcelDataIntelligent(importId: string, data: InsertExcelData[], userId: string): Promise<{ inserted: number; updated: number; skipped: number; errors: string[] }>;
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
  async getStaff(): Promise<Staff[]> {
    return await db.select().from(staff).orderBy(desc(staff.createdAt));
  }

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

  async getTimeLogsByDateRange(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<TimeLog[]> {
    return await db
      .select()
      .from(timeLogs)
      .where(
        and(
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

  // Get staff access logs from excel_data for a specific date range
  async getStaffAccessLogs(staffId: string, startDate: string, endDate: string): Promise<any[]> {
    try {
      // First, get the staff member to get their external ID for matching
      const staffMember = await this.getStaffMember(staffId);
      if (!staffMember) {
        return [];
      }

      const staff = staffMember as Staff;
      
      console.log(`🔍 Looking for access logs for: ${staff.firstName} ${staff.lastName}`);
      
      // Convert date strings to proper format for comparison
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      console.log(`📅 Date range: ${start.toISOString()} to ${end.toISOString()}`);
      
      // Query excel_data table for this staff member - use case-insensitive matching
      const accessData = await db
        .select({
          scheduledStart: excelData.scheduledStart,
          scheduledEnd: excelData.scheduledEnd,
          duration: excelData.duration,
          clientFirstName: excelData.assistedPersonFirstName,
          clientLastName: excelData.assistedPersonLastName,
          identifier: excelData.identifier,
        })
        .from(excelData)
        .where(
          and(
            sql`LOWER(TRIM(${excelData.operatorFirstName})) = LOWER(TRIM(${staff.firstName || ''}))`,
            sql`LOWER(TRIM(${excelData.operatorLastName})) = LOWER(TRIM(${staff.lastName || ''}))`,
            sql`${excelData.scheduledStart} IS NOT NULL AND ${excelData.scheduledStart} != ''`,
            sql`${excelData.scheduledEnd} IS NOT NULL AND ${excelData.scheduledEnd} != ''`
          )
        )
        .orderBy(excelData.scheduledStart);

      console.log(`📊 Found ${accessData.length} total records for this operator`);

      // Helper function to parse Italian date format DD/MM/YYYY HH:MM
      const parseItalianDate = (dateStr: string): Date | null => {
        if (!dateStr) return null;
        
        try {
          // Format: "04/08/2025 19:00" -> DD/MM/YYYY HH:MM
          const [datePart, timePart] = dateStr.split(' ');
          if (!datePart) return null;
          
          const [day, month, year] = datePart.split('/').map(Number);
          if (!day || !month || !year) return null;
          
          let hours = 0, minutes = 0;
          if (timePart) {
            const [h, m] = timePart.split(':').map(Number);
            hours = h || 0;
            minutes = m || 0;
          }
          
          // Create date in local timezone (month is 0-indexed)
          return new Date(year, month - 1, day, hours, minutes);
        } catch (error) {
          console.warn(`Failed to parse date: ${dateStr}`, error);
          return null;
        }
      };

      // Filter by date range and format the data
      const filteredData = accessData
        .map(row => {
          const schedStart = parseItalianDate(row.scheduledStart || '');
          
          return {
            originalStart: row.scheduledStart,
            originalEnd: row.scheduledEnd,
            parsedStart: schedStart,
            duration: row.duration || '',
            client: `${row.clientFirstName || ''} ${row.clientLastName || ''}`.trim(),
            identifier: row.identifier || ''
          };
        })
        .filter(row => {
          // Must have a valid start time
          if (!row.originalStart || row.originalStart.trim() === '') return false;
          
          // If we can't parse the date, exclude it from results
          if (!row.parsedStart) {
            console.log(`⚠️ Cannot parse date: ${row.originalStart}, excluding from results`);
            return false;
          }
          
          // Check if the parsed date is within the requested range
          const isInRange = row.parsedStart >= start && row.parsedStart <= end;
          
          if (!isInRange) {
            console.log(`⏭ Skipping record outside range: ${row.originalStart} (parsed: ${row.parsedStart?.toISOString()}) - Range: ${start.toISOString()} to ${end.toISOString()}`);
          } else {
            console.log(`✅ Including record in range: ${row.originalStart} (parsed: ${row.parsedStart?.toISOString()})`);
          }
          
          return isInRange;
        })
        .map(row => ({
          date: row.parsedStart ? row.parsedStart.toISOString().split('T')[0] : row.originalStart?.split(' ')[0] || '',
          scheduledStart: row.originalStart || '',
          scheduledEnd: row.originalEnd || '',
          duration: row.duration,
          client: row.client,
          identifier: row.identifier
        }))
        .sort((a, b) => {
          // Sort by original date string to maintain chronological order
          return a.scheduledStart.localeCompare(b.scheduledStart);
        });

      console.log(`✅ Returning ${filteredData.length} filtered records`);
      
      // DEBUG: Log some sample data to understand the issue
      if (filteredData.length < 50 && accessData.length > 50) {
        console.log(`🔍 DEBUG: Expected more records. Raw data sample:`, accessData.slice(0, 3));
        console.log(`🔍 DEBUG: Filtered data sample:`, filteredData.slice(0, 3));
      }
      
      return filteredData;
      
    } catch (error) {
      console.error("Error fetching staff access logs:", error);
      throw error;
    }
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
        assisted_person_first_name: excelRows[0].assistedPersonFirstName,
        assisted_person_last_name: excelRows[0].assistedPersonLastName,
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

      // PRODUCTION-GRADE: If not found by external ID, check by case-insensitive name combination
      if (existing.length === 0) {
        existing = await db
          .select()
          .from(clients)
          .where(
            and(
              sql`LOWER(TRIM(${clients.firstName})) = LOWER(TRIM(${clientData.firstName}))`,
              sql`LOWER(TRIM(${clients.lastName})) = LOWER(TRIM(${clientData.lastName}))`,
            ),
          )
          .limit(1);
          
        // STRUCTURED LOGGING: Log case-insensitive matches
        if (existing.length > 0) {
          console.log(`[CASE_INSENSITIVE_CLIENT_MATCH] Found existing client`, {
            searchName: `${clientData.firstName} ${clientData.lastName}`,
            foundName: `${existing[0].firstName} ${existing[0].lastName}`,
            externalId: clientData.externalId
          });
        }
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

      // PRODUCTION-GRADE: If not found by external ID, check by case-insensitive name combination
      if (existing.length === 0) {
        existing = await db
          .select()
          .from(staff)
          .where(
            and(
              sql`LOWER(TRIM(${staff.firstName})) = LOWER(TRIM(${staffData.firstName}))`,
              sql`LOWER(TRIM(${staff.lastName})) = LOWER(TRIM(${staffData.lastName}))`,
            ),
          )
          .limit(1);
          
        // STRUCTURED LOGGING: Log case-insensitive matches
        if (existing.length > 0) {
          console.log(`[CASE_INSENSITIVE_STAFF_MATCH] Found existing staff`, {
            searchName: `${staffData.firstName} ${staffData.lastName}`,
            foundName: `${existing[0].firstName} ${existing[0].lastName}`,
            externalId: staffData.externalId
          });
        }
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

    console.log(`[PRODUCTION_SYNC_CLIENTS] Starting enhanced sync for ${clientIds.length} clients with production-grade improvements`);

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

        // Default staff rates are now managed via individual staff properties

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

    // CRITICAL FIX: Extract date range from filename to prevent accumulative imports
    const importRecord = await db
      .select()
      .from(excelImports)
      .where(eq(excelImports.id, importId))
      .limit(1);
    
    let dateRangeFilter: { startDate?: Date; endDate?: Date } | null = null;
    
    if (importRecord.length > 0) {
      const filename = importRecord[0].filename;
      console.log(`[DATE_RANGE_EXTRACTION] Processing import file: ${filename}`);
      
      // Extract date range from filename patterns like "01012025_31072025_Appuntamenti.xlsx"
      const dateRangeMatch = filename.match(/(\d{8})_(\d{8})/);
      const yearMatch = filename.match(/^(\d{4})_/);
      
      if (dateRangeMatch) {
        // Format: DDMMYYYY_DDMMYYYY
        const startStr = dateRangeMatch[1]; // e.g., "01012025"
        const endStr = dateRangeMatch[2];   // e.g., "31072025"
        
        const startDate = new Date(
          parseInt(startStr.slice(4, 8)), // year
          parseInt(startStr.slice(2, 4)) - 1, // month (0-based)
          parseInt(startStr.slice(0, 2))  // day
        );
        
        const endDate = new Date(
          parseInt(endStr.slice(4, 8)), // year
          parseInt(endStr.slice(2, 4)) - 1, // month (0-based)
          parseInt(endStr.slice(0, 2))  // day
        );
        
        dateRangeFilter = { startDate, endDate };
        console.log(`[DATE_RANGE_FILTER] Extracted range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        
      } else if (yearMatch) {
        // Format: 2023_Appuntamenti.xlsx
        const year = parseInt(yearMatch[1]);
        dateRangeFilter = {
          startDate: new Date(year, 0, 1), // January 1st
          endDate: new Date(year, 11, 31, 23, 59, 59) // December 31st
        };
        console.log(`[DATE_RANGE_FILTER] Extracted year range: ${dateRangeFilter.startDate.toISOString()} to ${dateRangeFilter.endDate.toISOString()}`);
      }
    }

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

      // Skip rows without essential data - using Drizzle camelCase field names
      if (!row.assistedPersonId || !row.operatorId || (!row.scheduledStart && !row.recordedStart)) {
        console.log(`Row ${processedCount}: Skipping - missing essential data: assistedPersonId=${row.assistedPersonId}, operatorId=${row.operatorId}, scheduledStart=${row.scheduledStart}, recordedStart=${row.recordedStart}`);
        skipped++;
        continue;
      }

      // Find client and staff by external IDs from cache
      const client = clientsMap.get(String(row.assistedPersonId));
      const staffMember = staffMap.get(String(row.operatorId));

      if (!client || !staffMember) {
        console.log(`Row ${processedCount}: Skipping - client or staff not found: client=${!!client}, staff=${!!staffMember}, assistedPersonId=${row.assistedPersonId}, operatorId=${row.operatorId}`);
        skipped++;
        continue;
      }

      // PRODUCTION-GRADE: Helper function to parse European date format with Italy/Rome timezone
      const parseEuropeanDateWithTimezone = (dateStr: string): Date | null => {
        if (!dateStr) return null;
        
        try {
          // Handle multiple formats: "21/07/2025 12:00", "21/07/2025", "21-07-2025 12:00"
          const normalizedStr = dateStr.trim().replace(/-/g, '/');
          const parts = normalizedStr.split(' ');
          const datePart = parts[0]; // "21/07/2025"
          const timePart = parts[1] || '00:00'; // "12:00" or default to "00:00"
          
          // Validate date parts
          const dateParts = datePart.split('/');
          if (dateParts.length !== 3) return null;
          
          const [day, month, year] = dateParts.map(p => parseInt(p.trim()));
          
          // Validate time parts
          const timeParts = timePart.split(':');
          if (timeParts.length < 2) return null;
          
          const [hours, minutes] = timeParts.map(p => parseInt(p.trim()));
          
          // Validate ranges
          if (!day || !month || !year || day < 1 || day > 31 || month < 1 || month > 12 || year < 2000 || year > 2050) {
            return null;
          }
          if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            return null;
          }
          
          // Create date string in Italy timezone-aware format
          const isoDateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
          
          // Parse as Italy/Rome timezone and convert to UTC for database storage
          const italyDate = fromZonedTime(isoDateStr, 'Europe/Rome');
          
          return isNaN(italyDate.getTime()) ? null : italyDate;
        } catch (error) {
          // STRUCTURED LOGGING: Categorize parsing errors
          console.log(`[TIMEZONE_PARSING_ERROR] Failed to parse date "${dateStr}":`, {
            error: error instanceof Error ? error.message : String(error),
            input: dateStr,
            timestamp: new Date().toISOString()
          });
          return null;
        }
      };

      // Parse service date and times with Italy timezone support
      const scheduledStart = (row.scheduledStart || row.recordedStart)
        ? parseEuropeanDateWithTimezone(row.scheduledStart || row.recordedStart)
        : null;
      const scheduledEnd = (row.scheduledEnd || row.recordedEnd) 
        ? parseEuropeanDateWithTimezone(row.scheduledEnd || row.recordedEnd) 
        : null;

      if (!scheduledStart || isNaN(scheduledStart.getTime())) {
        console.log(`Row ${processedCount}: Skipping - invalid date: scheduledStart=${scheduledStart}, rawDate=${row.scheduledStart || row.recordedStart}`);
        skipped++;
        continue;
      }

      // CRITICAL FIX: Apply date range filter to prevent accumulative imports
      if (dateRangeFilter && dateRangeFilter.startDate && dateRangeFilter.endDate) {
        const serviceDate = new Date(scheduledStart.getFullYear(), scheduledStart.getMonth(), scheduledStart.getDate());
        const filterStartDate = new Date(dateRangeFilter.startDate.getFullYear(), dateRangeFilter.startDate.getMonth(), dateRangeFilter.startDate.getDate());
        const filterEndDate = new Date(dateRangeFilter.endDate.getFullYear(), dateRangeFilter.endDate.getMonth(), dateRangeFilter.endDate.getDate());
        
        if (serviceDate < filterStartDate || serviceDate > filterEndDate) {
          console.log(`Row ${processedCount}: Skipping - date outside filter range: serviceDate=${serviceDate.toISOString().slice(0,10)}, filterRange=${filterStartDate.toISOString().slice(0,10)} to ${filterEndDate.toISOString().slice(0,10)}`);
          skipped++;
          continue;
        } else {
          console.log(`Row ${processedCount}: Date within filter range: serviceDate=${serviceDate.toISOString().slice(0,10)}`);
        }
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

      // PRODUCTION-GRADE: Secondary duplicate check with ±5 minute tolerance window
      const fiveMinutesMs = 5 * 60 * 1000;
      const startTimeWindow = new Date(scheduledStart.getTime() - fiveMinutesMs);
      const endTimeWindow = new Date(scheduledStart.getTime() + fiveMinutesMs);
      
      const existingTimeLog = await db
        .select()
        .from(timeLogs)
        .where(
          and(
            eq(timeLogs.clientId, client.id),
            eq(timeLogs.staffId, staffMember.id),
            // Use tolerance window instead of exact match
            gte(timeLogs.scheduledStartTime, startTimeWindow),
            lte(timeLogs.scheduledStartTime, endTimeWindow),
            scheduledEnd
              ? and(
                  gte(timeLogs.scheduledEndTime, new Date(scheduledEnd.getTime() - fiveMinutesMs)),
                  lte(timeLogs.scheduledEndTime, new Date(scheduledEnd.getTime() + fiveMinutesMs))
                )
              : sql`true`,
          ),
        )
        .limit(1);

      if (existingTimeLog.length > 0) {
        const existing = existingTimeLog[0];
        const timeDifferenceMs = Math.abs(existing.scheduledStartTime.getTime() - scheduledStart.getTime());
        const timeDifferenceMin = Math.round(timeDifferenceMs / (1000 * 60));
        
        duplicates.push({
          identifier: identifier || "composite-key",
          reason: `DUPLICATE_DETECTED: Time log for ${client.firstName} ${client.lastName} with ${staffMember.firstName} ${staffMember.lastName} at ${formatInTimeZone(scheduledStart, 'Europe/Rome', 'dd/MM/yyyy HH:mm')} (±${timeDifferenceMin}min tolerance)`,
        });
        
        // STRUCTURED LOGGING: Enhanced duplicate detection logging
        console.log(`[DUPLICATE_TIME_LOG] Row ${processedCount}: Duplicate within tolerance window`, {
          clientName: `${client.firstName} ${client.lastName}`,
          staffName: `${staffMember.firstName} ${staffMember.lastName}`,
          newTimeItaly: formatInTimeZone(scheduledStart, 'Europe/Rome', 'dd/MM/yyyy HH:mm'),
          existingTimeItaly: formatInTimeZone(existing.scheduledStartTime, 'Europe/Rome', 'dd/MM/yyyy HH:mm'),
          differenceMinutes: timeDifferenceMin,
          toleranceWindow: '±5min',
          externalIdentifier: identifier
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

  // Staff rate operations removed - now using budget allocation rates

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

  // Import tracking operations
  async createImportAuditTrail(
    trail: InsertImportAuditTrail,
  ): Promise<ImportAuditTrail> {
    const [result] = await db
      .insert(importAuditTrail)
      .values(trail)
      .returning();
    return result;
  }

  async getImportAuditTrail(importId: string): Promise<ImportAuditTrail[]> {
    return await db
      .select()
      .from(importAuditTrail)
      .where(eq(importAuditTrail.importId, importId))
      .orderBy(desc(importAuditTrail.createdAt));
  }

  // GDPR operations simplified
  async getUserConsents(userId: string): Promise<UserConsent[]> {
    return await db
      .select()
      .from(userConsents)
      .where(eq(userConsents.userId, userId))
      .orderBy(desc(userConsents.createdAt));
  }

  async createUserConsent(consent: InsertUserConsent): Promise<UserConsent> {
    const [result] = await db
      .insert(userConsents)
      .values(consent)
      .returning();
    return result;
  }

  // Calendar operations
  async getCalendarAppointments(): Promise<CalendarAppointment[]> {
    try {
      const appointments = await db
        .select()
        .from(calendarAppointments)
        .orderBy(desc(calendarAppointments.startDateTime));

      // Fetch clients and staff separately to avoid complex join issues
      const result: CalendarAppointment[] = [];
      
      for (const appointment of appointments) {
        let client = null;
        let staff = null;
        
        if (appointment.clientId) {
          [client] = await db
            .select()
            .from(clients)
            .where(eq(clients.id, appointment.clientId))
            .limit(1);
        }
        
        if (appointment.staffId) {
          [staff] = await db
            .select()
            .from(staff)
            .where(eq(staff.id, appointment.staffId))
            .limit(1);
        }
        
        result.push({
          ...appointment,
          client,
          staff,
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching calendar appointments:', error);
      return []; // Return empty array instead of throwing
    }
  }

  async createCalendarAppointment(appointment: InsertCalendarAppointment): Promise<CalendarAppointment> {
    const [result] = await db
      .insert(calendarAppointments)
      .values(appointment)
      .returning();
    return result;
  }
  
  // Compensation operations
  async getCompensations(periodStart?: Date, periodEnd?: Date): Promise<(Compensation & { staff: Staff })[]> {
    let query = db
      .select({
        compensation: compensations,
        staff: staff,
      })
      .from(compensations)
      .leftJoin(staff, eq(compensations.staffId, staff.id));
    
    if (periodStart && periodEnd) {
      query = query.where(
        and(
          lte(compensations.periodStart, periodEnd),
          gte(compensations.periodEnd, periodStart)
        )
      );
    }
    
    const results = await query.orderBy(desc(compensations.createdAt));
    
    return results.map(({ compensation, staff }) => ({
      ...compensation,
      staff: staff!,
    }));
  }

  async calculateCompensationsFromTimeLogs(periodStart: Date, periodEnd: Date, staffType?: 'all' | 'internal' | 'external'): Promise<any[]> {
    console.log(`🎯 Calculating compensations for period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);
    if (staffType && staffType !== 'all') {
      console.log(`📋 Filtering by staff type: ${staffType}`);
    }
    
    // For single day queries, adjust timezone to ensure we capture the full day
    const isSingleDay = periodStart.toDateString() === periodEnd.toDateString();
    console.log(`📅 Single day query: ${isSingleDay}`);
    
    let adjustedStart = periodStart;
    let adjustedEnd = periodEnd;
    
    if (isSingleDay) {
      // Create start of day and end of day in local timezone for single day queries
      const year = periodStart.getFullYear();
      const month = periodStart.getMonth();
      const day = periodStart.getDate();
      
      adjustedStart = new Date(year, month, day, 0, 0, 0, 0);
      adjustedEnd = new Date(year, month, day, 23, 59, 59, 999);
      
      console.log(`📅 Adjusted start: ${adjustedStart.toISOString()}`);
      console.log(`📅 Adjusted end: ${adjustedEnd.toISOString()}`);
    }

    try {
      // Build the query with optional staff type filter
      let timeLogsQuery = db
        .select({
          timeLog: timeLogs,
          staff: staff,
        })
        .from(timeLogs)
        .leftJoin(staff, eq(timeLogs.staffId, staff.id))
        .where(
          and(
            gte(timeLogs.serviceDate, adjustedStart),
            lte(timeLogs.serviceDate, adjustedEnd),
            isNotNull(timeLogs.staffId)
          )
        );

      // Add staff type filter if specified
      if (staffType && staffType !== 'all') {
        timeLogsQuery = timeLogsQuery.where(
          and(
            gte(timeLogs.serviceDate, adjustedStart),
            lte(timeLogs.serviceDate, adjustedEnd),
            isNotNull(timeLogs.staffId),
            eq(staff.type, staffType)
          )
        );
      }

      const timeLogsWithStaffData = await timeLogsQuery;
      const timeLogsData = timeLogsWithStaffData.map(row => row.timeLog);

      console.log(`📊 Found ${timeLogsData.length} time logs in period`);
      
      // If no data found for single day, check what dates exist in database
      if (timeLogsData.length === 0 && isSingleDay) {
        const sampleDates = await db
          .select({ serviceDate: timeLogs.serviceDate })
          .from(timeLogs)
          .limit(10)
          .orderBy(timeLogs.serviceDate);
        
        console.log(`🔍 Available dates in database:`, sampleDates.map(d => d.serviceDate?.toDateString()));
        console.log(`🎯 Requested date: ${periodStart.toDateString()}`);
      }
      
      // Debug: show first few time log records to understand structure
      if (timeLogsData.length > 0) {
        console.log(`🔍 Sample time log:`, {
          serviceDate: timeLogsData[0].serviceDate,
          scheduledStart: timeLogsData[0].scheduledStartTime,
          scheduledEnd: timeLogsData[0].scheduledEndTime,
          staffId: timeLogsData[0].staffId,
          clientId: timeLogsData[0].clientId
        });
      }

      // Get all staff data
      const staffData = await db.select().from(staff);
      
      // Get all clients data  
      const clientsData = await db.select().from(clients);

      // Create maps for quick lookup
      const staffMap = new Map(staffData.map(s => [s.id, s]));
      const clientsMap = new Map(clientsData.map(c => [c.id, c]));

      // Group by staff member
      const staffCompensations = new Map();

      for (const log of timeLogsData) {
        if (!log.staffId) continue;

        const staffMember = staffMap.get(log.staffId);
        const client = clientsMap.get(log.clientId || '');

        if (!staffMember) continue;

        if (!staffCompensations.has(log.staffId)) {
          staffCompensations.set(log.staffId, {
            staff: {
              id: staffMember.id,
              email: staffMember.email || 'N/A',
              firstName: staffMember.firstName || 'N/A', 
              lastName: staffMember.lastName || 'N/A',
              specialization: staffMember.specialization || '',
              weekdayRate: staffMember.weekdayRate || 10,
              holidayRate: staffMember.holidayRate || 30,
              mileageRate: staffMember.mileageRate || 0.5
            },
            totalWeekdayHours: 0,
            totalHolidayHours: 0,
            totalMileage: 0,
            totalClients: new Set(),
            services: [],
            weekdayEarnings: 0,
            holidayEarnings: 0,
            mileageEarnings: 0,
            totalEarnings: 0
          });
        }

        const compensation = staffCompensations.get(log.staffId);
        const serviceDate = new Date(log.scheduledStartTime);
        
        // Check if it's a holiday or Sunday
        const isHoliday = this.isItalianHolidayOrSunday(serviceDate);
        

        
        // Calculate hours from start/end times since totalHours is undefined
        let hours = 0;
        if (log.scheduledStartTime && log.scheduledEndTime) {
          const startTime = new Date(log.scheduledStartTime);
          const endTime = new Date(log.scheduledEndTime);
          hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // Convert milliseconds to hours
        }
        
        // Try totalHours field as fallback
        if (!hours && log.totalHours) {
          hours = parseFloat(log.totalHours) || 0;
        }
        
        const mileage = parseFloat(log.mileage) || 0;
        
        // Round hours to 2 decimal places for accuracy
        hours = Math.round(hours * 100) / 100;

        // Apply rates
        const weekdayRate = compensation.staff.weekdayRate;
        const holidayRate = compensation.staff.holidayRate;
        const mileageRate = compensation.staff.mileageRate;

        if (isHoliday) {
          compensation.totalHolidayHours += hours;
          compensation.holidayEarnings += hours * holidayRate;
        } else {
          compensation.totalWeekdayHours += hours;
          compensation.weekdayEarnings += hours * weekdayRate;
        }

        compensation.totalMileage += mileage;
        compensation.mileageEarnings += mileage * mileageRate;
        compensation.totalClients.add(log.clientId);

        // Add service details
        compensation.services.push({
          date: serviceDate,
          client: client ? `${client.lastName || 'N/A'}, ${client.firstName || 'N/A'}` : 'Cliente N/A',
          serviceType: log.serviceType || client?.serviceType || 'Assistenza',
          hours: hours,
          mileage: mileage,
          isHoliday: isHoliday,
          earnings: isHoliday ? hours * holidayRate : hours * weekdayRate
        });
      }

      // Convert to array and calculate totals
      const compensationResults = Array.from(staffCompensations.values()).map(comp => {
        comp.totalEarnings = comp.weekdayEarnings + comp.holidayEarnings + comp.mileageEarnings;
        comp.totalHours = comp.totalWeekdayHours + comp.totalHolidayHours;
        comp.totalClients = comp.totalClients.size;
        
        return {
          id: `calc-${comp.staff.id}-${periodStart.getTime()}`,
          staffId: comp.staff.id,
          staff: comp.staff,
          periodStart: periodStart,
          periodEnd: periodEnd,
          status: 'calculated',
          
          // Core compensation data (using names expected by frontend)
          regularHours: Math.round(comp.totalWeekdayHours * 100) / 100,
          holidayHours: Math.round(comp.totalHolidayHours * 100) / 100,
          totalHours: Math.round(comp.totalHours * 100) / 100,
          totalMileage: Math.round(comp.totalMileage * 100) / 100,
          totalClients: comp.totalClients,
          
          // Earnings breakdown (using names expected by frontend)
          weekdayTotal: Math.round(comp.weekdayEarnings * 100) / 100,
          holidayTotal: Math.round(comp.holidayEarnings * 100) / 100,
          mileageTotal: Math.round(comp.mileageEarnings * 100) / 100,
          totalAmount: Math.round(comp.totalEarnings * 100) / 100,
          
          // Service details
          services: comp.services,
          
          // Rates applied
          appliedWeekdayRate: comp.staff.weekdayRate,
          appliedHolidayRate: comp.staff.holidayRate,
          appliedMileageRate: comp.staff.mileageRate,
          
          // Metadata
          calculatedAt: new Date(),
          servicesCount: comp.services.length
        };
      });

      console.log(`📋 Calculated compensations for ${compensationResults.length} staff members`);
      return compensationResults;
    } catch (error) {
      console.error('❌ Error in calculateCompensationsFromTimeLogs:', error);
      throw error;
    }
  }

  // Helper method to check Italian holidays and Sundays
  private isItalianHolidayOrSunday(date: Date): boolean {
    // Sunday check
    if (date.getDay() === 0) return true;
    
    // Basic Italian holidays (extend as needed)
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const italianHolidays = [
      { month: 1, day: 1 },   // New Year
      { month: 1, day: 6 },   // Epiphany
      { month: 4, day: 25 },  // Liberation Day
      { month: 5, day: 1 },   // Labor Day
      { month: 6, day: 2 },   // Republic Day
      { month: 8, day: 15 },  // Assumption
      { month: 11, day: 1 },  // All Saints
      { month: 12, day: 8 },  // Immaculate Conception
      { month: 12, day: 25 }, // Christmas
      { month: 12, day: 26 }  // St. Stephen
    ];
    
    return italianHolidays.some(holiday => 
      holiday.month === month && holiday.day === day
    );
  }

  async getCompensation(id: string): Promise<Compensation | undefined> {
    const [result] = await db
      .select()
      .from(compensations)
      .where(eq(compensations.id, id));
    return result;
  }

  async getCompensationByStaffAndPeriod(
    staffId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Compensation | undefined> {
    const [result] = await db
      .select()
      .from(compensations)
      .where(
        and(
          eq(compensations.staffId, staffId),
          eq(compensations.periodStart, periodStart),
          eq(compensations.periodEnd, periodEnd)
        )
      );
    return result;
  }

  async createCompensation(compensation: InsertCompensation): Promise<Compensation> {
    try {
      // Check for active period lock before creating compensation
      if (compensation.periodStart && compensation.periodEnd) {
        const activeLock = await this.checkActiveLock(
          compensation.periodStart.toISOString(),
          compensation.periodEnd.toISOString()
        );
        
        if (activeLock) {
          throw new Error(`Periodo bloccato da ${activeLock.lockedBy}. Impossibile creare compenso.`);
        }
      }

      const [result] = await db
        .insert(compensations)
        .values({
          ...compensation,
          validationStatus: 'draft' // Always start as draft
        })
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating compensation:", error);
      throw error;
    }
  }

  async updateCompensation(
    id: string,
    compensation: Partial<InsertCompensation>
  ): Promise<Compensation> {
    try {
      // Get existing compensation for validation checks
      const existing = await this.getCompensation(id);
      if (!existing) {
        throw new Error("Compenso non trovato");
      }

      // Check if compensation is validated and prevent modifications
      if (existing.validationStatus === 'validated') {
        throw new Error("Impossibile modificare un compenso validato. Sbloccare prima il periodo.");
      }

      // Check for active period lock if period dates are being changed
      if (compensation.periodStart || compensation.periodEnd) {
        const startDate = compensation.periodStart || existing.periodStart;
        const endDate = compensation.periodEnd || existing.periodEnd;
        
        const activeLock = await this.checkActiveLock(
          startDate.toISOString(),
          endDate.toISOString()
        );
        
        if (activeLock && existing.periodLockId !== activeLock.id) {
          throw new Error(`Periodo bloccato da ${activeLock.lockedBy}. Impossibile modificare compenso.`);
        }
      }

      const [result] = await db
        .update(compensations)
        .set({
          ...compensation,
          updatedAt: new Date(),
        })
        .where(eq(compensations.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error("Error updating compensation:", error);
      throw error;
    }
  }

  async validateCompensation(id: string, validatedBy: string): Promise<Compensation> {
    try {
      const existing = await this.getCompensation(id);
      if (!existing) {
        throw new Error("Compenso non trovato");
      }

      if (existing.validationStatus === 'validated') {
        throw new Error("Compenso già validato");
      }

      const [result] = await db
        .update(compensations)
        .set({
          validationStatus: 'validated',
          validationDate: new Date(),
          validatedBy: validatedBy,
          updatedAt: new Date(),
        })
        .where(eq(compensations.id, id))
        .returning();

      // Log validation in audit trail
      await this.createSystemAuditLog({
        userId: validatedBy,
        action: 'validate',
        entityType: 'compensation',
        entityId: id,
        newValues: { validationStatus: 'validated' },
        metadata: { validationDate: new Date().toISOString() }
      });

      return result;
    } catch (error) {
      console.error("Error validating compensation:", error);
      throw error;
    }
  }

  async unlockCompensation(id: string, unlockedBy: string): Promise<Compensation> {
    try {
      const existing = await this.getCompensation(id);
      if (!existing) {
        throw new Error("Compenso non trovato");
      }

      if (existing.validationStatus !== 'validated') {
        throw new Error("Può sbloccare solo compensi validati");
      }

      const [result] = await db
        .update(compensations)
        .set({
          validationStatus: 'unlocked',
          updatedAt: new Date(),
        })
        .where(eq(compensations.id, id))
        .returning();

      // Log unlock in audit trail
      await this.createSystemAuditLog({
        userId: unlockedBy,
        action: 'unlock',
        entityType: 'compensation',
        entityId: id,
        oldValues: { validationStatus: 'validated' },
        newValues: { validationStatus: 'unlocked' },
        metadata: { unlockDate: new Date().toISOString() }
      });

      return result;
    } catch (error) {
      console.error("Error unlocking compensation:", error);
      throw error;
    }
  }

  async deleteCompensation(id: string): Promise<void> {
    await db.delete(compensations).where(eq(compensations.id, id));
  }

  async getCompensationsByPeriod(periodStart: Date, periodEnd: Date): Promise<Compensation[]> {
    try {
      return await db
        .select()
        .from(compensations)
        .where(
          and(
            gte(compensations.periodStart, periodStart),
            lte(compensations.periodEnd, periodEnd)
          )
        )
        .orderBy(compensations.periodStart);
    } catch (error) {
      console.error("Error fetching compensations by period:", error);
      return [];
    }
  }

  async createCompensationAuditLog(
    log: InsertCompensationAuditLog
  ): Promise<CompensationAuditLog> {
    const [result] = await db
      .insert(compensationAuditLog)
      .values(log)
      .returning();
    return result;
  }

  async getCompensationAuditLogs(compensationId: string): Promise<CompensationAuditLog[]> {
    return await db
      .select()
      .from(compensationAuditLog)
      .where(eq(compensationAuditLog.compensationId, compensationId))
      .orderBy(desc(compensationAuditLog.createdAt));
  }

  async getDailyHoursReport(targetDate: Date): Promise<any> {
    console.log(`📅 Getting daily hours report for: ${targetDate.toDateString()}`);
    
    // Set start and end of day in Italy/Rome timezone
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      // Get all time logs for the specific day
      const timeLogsData = await db
        .select({
          id: timeLogs.id,
          serviceDate: timeLogs.serviceDate,
          scheduledStartTime: timeLogs.scheduledStartTime,
          scheduledEndTime: timeLogs.scheduledEndTime,
          hours: timeLogs.hours,
          staffId: timeLogs.staffId,
          clientId: timeLogs.clientId,
          staffFirstName: staff.firstName,
          staffLastName: staff.lastName,
          clientFirstName: clients.firstName,
          clientLastName: clients.lastName,
          mileage: timeLogs.mileage
        })
        .from(timeLogs)
        .leftJoin(staff, eq(timeLogs.staffId, staff.id))
        .leftJoin(clients, eq(timeLogs.clientId, clients.id))
        .where(
          and(
            gte(timeLogs.serviceDate, startOfDay),
            lte(timeLogs.serviceDate, endOfDay)
          )
        )
        .orderBy(timeLogs.scheduledStartTime);

      console.log(`📊 Found ${timeLogsData.length} time logs for ${targetDate.toDateString()}`);

      // Check if target date is a holiday or Sunday
      const isHoliday = this.isItalianHolidayOrSunday(targetDate);
      
      // Calculate total hours and group by staff
      let totalHours = 0;
      let totalMileage = 0;
      const staffHours: { [key: string]: any } = {};

      for (const log of timeLogsData) {
        // Use the hours field from database, or calculate if null
        let hours = 0;
        if (log.hours) {
          hours = parseFloat(log.hours.toString());
        } else if (log.scheduledStartTime && log.scheduledEndTime) {
          const diffMs = log.scheduledEndTime.getTime() - log.scheduledStartTime.getTime();
          hours = diffMs / (1000 * 60 * 60); // Convert to hours
        }

        totalHours += hours;
        if (log.mileage) {
          totalMileage += parseFloat(log.mileage.toString());
        }

        // Group by staff
        const staffKey = `${log.staffLastName}, ${log.staffFirstName}`;
        if (!staffHours[staffKey]) {
          staffHours[staffKey] = {
            staffId: log.staffId,
            staffName: staffKey,
            hours: 0,
            mileage: 0,
            services: []
          };
        }

        staffHours[staffKey].hours += hours;
        if (log.mileage) {
          staffHours[staffKey].mileage += parseFloat(log.mileage.toString());
        }

        staffHours[staffKey].services.push({
          id: log.id,
          clientName: `${log.clientLastName}, ${log.clientFirstName}`,
          startTime: log.scheduledStartTime,
          endTime: log.scheduledEndTime,
          hours: hours,
          mileage: log.mileage ? parseFloat(log.mileage.toString()) : 0
        });
      }

      return {
        date: targetDate.toDateString(),
        isHoliday: isHoliday,
        dayType: isHoliday ? 'Festivo' : 'Feriale',
        totalHours: parseFloat(totalHours.toFixed(2)),
        totalMileage: parseFloat(totalMileage.toFixed(2)),
        totalServices: timeLogsData.length,
        staffCount: Object.keys(staffHours).length,
        staffDetails: Object.values(staffHours)
      };

    } catch (error) {
      console.error('Error generating daily hours report:', error);
      throw error;
    }
  }

  // ===== VALIDATION AND LOCK MANAGEMENT IMPLEMENTATION =====
  
  async getPeriodValidations(): Promise<PeriodValidation[]> {
    try {
      return await db.select().from(periodValidations).orderBy(desc(periodValidations.validationDate));
    } catch (error) {
      console.error("Error fetching period validations:", error);
      return [];
    }
  }

  async createPeriodValidation(validation: InsertPeriodValidation): Promise<PeriodValidation> {
    const [created] = await db.insert(periodValidations).values({
      ...validation,
      validationDate: new Date()
    }).returning();
    return created;
  }

  async checkPeriodValidation(startDate: string, endDate: string): Promise<PeriodValidation | undefined> {
    try {
      const [existing] = await db
        .select()
        .from(periodValidations)
        .where(
          and(
            lte(periodValidations.startDate, new Date(endDate)),
            gte(periodValidations.endDate, new Date(startDate)),
            eq(periodValidations.status, 'active')
          )
        )
        .limit(1);
      return existing;
    } catch (error) {
      console.error("Error checking period validation:", error);
      return undefined;
    }
  }

  async getPeriodLocks(): Promise<PeriodLock[]> {
    try {
      return await db.select().from(periodLocks).orderBy(desc(periodLocks.lockAcquiredAt));
    } catch (error) {
      console.error("Error fetching period locks:", error);
      return [];
    }
  }

  async createPeriodLock(lock: InsertPeriodLock): Promise<PeriodLock> {
    const [created] = await db.insert(periodLocks).values(lock).returning();
    return created;
  }

  async acquirePeriodLock(startDate: string, endDate: string, userId: string, operationType: string, sessionId?: string): Promise<PeriodLock | null> {
    try {
      // First cleanup expired locks
      await this.cleanupExpiredLocks();
      
      // Check for existing active locks
      const existingLock = await this.checkActiveLock(startDate, endDate);
      if (existingLock) {
        return null; // Period is already locked
      }

      // Create new lock with 30 minute expiration
      const lockExpiresAt = new Date();
      lockExpiresAt.setMinutes(lockExpiresAt.getMinutes() + 30);

      const [lock] = await db.insert(periodLocks).values({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        lockedBy: userId,
        lockExpiresAt: lockExpiresAt.toISOString(),
        status: 'active',
        operationType,
        sessionId: sessionId || undefined
      }).returning();

      return lock;
    } catch (error) {
      console.error("Error acquiring period lock:", error);
      return null;
    }
  }

  async releasePeriodLock(lockId: string): Promise<void> {
    try {
      await db
        .update(periodLocks)
        .set({ 
          status: 'released',
          updatedAt: new Date()
        })
        .where(eq(periodLocks.id, lockId));
    } catch (error) {
      console.error("Error releasing period lock:", error);
    }
  }

  async checkActiveLock(startDate: string, endDate: string): Promise<PeriodLock | undefined> {
    try {
      const [activeLock] = await db
        .select()
        .from(periodLocks)
        .where(
          and(
            lte(periodLocks.startDate, new Date(endDate)),
            gte(periodLocks.endDate, new Date(startDate)),
            eq(periodLocks.status, 'active'),
            gt(periodLocks.lockExpiresAt, new Date())
          )
        )
        .limit(1);
      return activeLock;
    } catch (error) {
      console.error("Error checking active lock:", error);
      return undefined;
    }
  }

  async cleanupExpiredLocks(): Promise<void> {
    try {
      await db
        .update(periodLocks)
        .set({ 
          status: 'expired',
          updatedAt: new Date()
        })
        .where(
          and(
            eq(periodLocks.status, 'active'),
            lt(periodLocks.lockExpiresAt, new Date())
          )
        );
    } catch (error) {
      console.error("Error cleaning up expired locks:", error);
    }
  }

  async getSystemAuditLogs(): Promise<SystemAuditLog[]> {
    try {
      return await db.select().from(systemAuditLog).orderBy(desc(systemAuditLog.timestamp)).limit(1000);
    } catch (error) {
      console.error("Error fetching system audit logs:", error);
      return [];
    }
  }

  async createSystemAuditLog(auditLog: InsertSystemAuditLog): Promise<SystemAuditLog> {
    try {
      const [created] = await db.insert(systemAuditLog).values({
        ...auditLog,
        timestamp: new Date()
      }).returning();
      return created;
    } catch (error) {
      console.error("Error creating system audit log:", error);
      throw error;
    }
  }

  async getAuditTrailByEntity(entityType: string, entityId: string): Promise<SystemAuditLog[]> {
    try {
      return await db
        .select()
        .from(systemAuditLog)
        .where(
          and(
            eq(systemAuditLog.entityType, entityType),
            eq(systemAuditLog.entityId, entityId)
          )
        )
        .orderBy(desc(systemAuditLog.timestamp));
    } catch (error) {
      console.error("Error fetching audit trail by entity:", error);
      return [];
    }
  }

  async getAuditTrailByPeriod(startDate: string, endDate: string): Promise<SystemAuditLog[]> {
    try {
      return await db
        .select()
        .from(systemAuditLog)
        .where(
          and(
            gte(systemAuditLog.timestamp, new Date(startDate)),
            lte(systemAuditLog.timestamp, new Date(endDate))
          )
        )
        .orderBy(desc(systemAuditLog.timestamp));
    } catch (error) {
      console.error("Error fetching audit trail by period:", error);
      return [];
    }
  }

  // ===== INTELLIGENT EXCEL IMPORT IMPLEMENTATION =====
  
  async findExistingRecordByKey(identifier: string, assistedPersonId: string, operatorId: string, scheduledStart: string): Promise<ExcelData | undefined> {
    try {
      // Primary lookup by identifier (AO column)
      if (identifier) {
        const [byIdentifier] = await db
          .select()
          .from(excelData)
          .where(eq(excelData.identifier, identifier))
          .limit(1);
        
        if (byIdentifier) {
          return byIdentifier;
        }
      }

      // Fallback to composite key lookup
      if (assistedPersonId && operatorId && scheduledStart) {
        const [byComposite] = await db
          .select()
          .from(excelData)
          .where(
            and(
              eq(excelData.assistedPersonId, assistedPersonId),
              eq(excelData.operatorId, operatorId),
              eq(excelData.scheduledStart, scheduledStart)
            )
          )
          .limit(1);
        
        return byComposite;
      }

      return undefined;
    } catch (error) {
      console.error("Error finding existing record by key:", error);
      return undefined;
    }
  }

  async batchUpsertExcelDataIntelligent(importId: string, data: InsertExcelData[], userId: string): Promise<{ inserted: number; updated: number; skipped: number; errors: string[] }> {
    const result = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    };

    try {
      // Process in batches of 100 records for performance
      const batchSize = 100;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        for (const record of batch) {
          try {
            // Check if record already exists
            const existing = await this.findExistingRecordByKey(
              record.identifier || '',
              record.assistedPersonId || '',
              record.operatorId || '',
              record.scheduledStart || ''
            );

            if (existing) {
              // Compare data to decide if update is needed
              const hasChanges = this.detectDataChanges(existing, record);
              
              if (hasChanges) {
                // Update existing record
                await db
                  .update(excelData)
                  .set({
                    ...record,
                    importId
                  })
                  .where(eq(excelData.id, existing.id));

                result.updated++;
              } else {
                result.skipped++;
              }
            } else {
              // Insert new record
              await db
                .insert(excelData)
                .values({
                  ...record,
                  importId
                });

              result.inserted++;
            }
          } catch (error) {
            console.error("Error processing record:", error);
            result.errors.push(`Row ${record.rowNumber}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
    } catch (error) {
      console.error("Error in batch upsert:", error);
      result.errors.push(`Batch processing error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  private detectDataChanges(existing: ExcelData, newRecord: InsertExcelData): boolean {
    // Key fields to compare for changes
    const keyFields = [
      'duration', 'scheduledStart', 'scheduledEnd', 'kilometers',
      'assistedPersonFirstName', 'assistedPersonLastName',
      'operatorFirstName', 'operatorLastName'
    ];

    for (const field of keyFields) {
      const existingValue = (existing as any)[field];
      const newValue = (newRecord as any)[field];
      
      if (existingValue !== newValue) {
        return true;
      }
    }

    return false;
  }
}

export const storage = new DatabaseStorage();
