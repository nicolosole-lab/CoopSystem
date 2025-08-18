import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { notificationService } from "./notifications";
import { getAnalyticsData, generateReport, getGeneratedReports } from "./analytics";
import { workflowEngine, healthcareWorkflowTemplates } from "./workflow-engine";
import { schedulingAutomation } from "./scheduling-automation";
import { 
  insertClientSchema, 
  insertStaffSchema, 
  insertTimeLogSchema,
  insertClientBudgetAllocationSchema,
  insertBudgetExpenseSchema,
  insertHomeCarePlanSchema,
  insertClientBudgetConfigSchema,
  insertClientStaffAssignmentSchema,
  insertStaffCompensationSchema,
  insertCompensationAdjustmentSchema,
  insertCalendarAppointmentSchema,
  insertMileageLogSchema,
  insertMileageDisputeSchema,
  insertUserSchema,
  insertUserConsentSchema,
  insertDataAccessLogSchema,
  insertDataExportRequestSchema,
  insertDataRetentionPolicySchema,
  insertDataDeletionRequestSchema,
  insertDataBreachIncidentSchema,
  insertDocumentSchema
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import * as XLSX from "xlsx";
import PDFDocument from 'pdfkit';
import { promisify } from 'util';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { 
  requireCrudPermission, 
  requireResourcePermission,
  canManageResource,
  getUserPermissionsSummary,
  UserRole
} from "./permissions";

const scryptAsync = promisify(scrypt);

// Helper function for role hierarchy validation
function canManageRole(userRole: string, targetRole: string): boolean {
  if (userRole === UserRole.ADMIN) return true;
  if (userRole === UserRole.MANAGER && targetRole === UserRole.STAFF) return true;
  return false;
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Helper function to check if a date is an Italian holiday or Sunday
function isItalianHolidayOrSunday(date: Date): boolean {
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
  const easter = calculateEaster(year);
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

function calculateEaster(year: number): Date {
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

export function registerRoutes(app: Express): Server {
  // Auth middleware
  setupAuth(app);

  // Protected route middleware
  const isAuthenticated = (req: any, res: any, next: any) => {
    console.log("Auth check:", req.isAuthenticated ? req.isAuthenticated() : false, req.path);
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Dashboard routes
  app.get('/api/dashboard/metrics', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // User permissions endpoint
  app.get('/api/user/permissions', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const userRole = (req.user as any).role;
      const permissions = getUserPermissionsSummary(userRole);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  // Client routes with role-based permissions
  app.get('/api/clients', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const includeStaff = req.query.includeStaff === 'true';
      const staffId = req.query.staffId as string;
      
      console.log("Fetching clients, includeStaff:", includeStaff, "staffId:", staffId);
      
      // If staffId is provided, get only clients assigned to that staff member
      if (staffId) {
        const assignedClients = await storage.getClientsAssignedToStaff(staffId);
        res.json(assignedClients);
      } else if (includeStaff) {
        const clientsWithStaff = await storage.getClientsWithStaff();
        res.json(clientsWithStaff);
      } else {
        const clients = await storage.getClients();
        res.json(clients);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get('/api/clients/:id', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post('/api/clients', isAuthenticated, requireCrudPermission('create'), async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.put('/api/clients/:id', isAuthenticated, requireCrudPermission('update'), async (req, res) => {
    try {
      const validatedData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, validatedData);
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete('/api/clients/:id', isAuthenticated, requireCrudPermission('delete'), async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Staff routes with role-based permissions
  app.get('/api/staff', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const staffMembers = await storage.getStaffMembers();
      res.json(staffMembers);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  app.get('/api/staff/:id', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const staffMember = await storage.getStaffMember(req.params.id);
      if (!staffMember) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      res.json(staffMember);
    } catch (error) {
      console.error("Error fetching staff member:", error);
      res.status(500).json({ message: "Failed to fetch staff member" });
    }
  });

  app.post('/api/staff', isAuthenticated, requireCrudPermission('create'), async (req, res) => {
    try {
      const validatedData = insertStaffSchema.parse(req.body);
      const staffMember = await storage.createStaffMember(validatedData);
      res.status(201).json(staffMember);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating staff member:", error);
      res.status(500).json({ message: "Failed to create staff member" });
    }
  });

  app.put('/api/staff/:id', isAuthenticated, requireCrudPermission('update'), async (req, res) => {
    try {
      const validatedData = insertStaffSchema.partial().parse(req.body);
      const staffMember = await storage.updateStaffMember(req.params.id, validatedData);
      res.json(staffMember);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating staff member:", error);
      res.status(500).json({ message: "Failed to update staff member" });
    }
  });

  // PATCH route for partial staff updates (like contact information)
  app.patch('/api/staff/:id', isAuthenticated, requireCrudPermission('update'), async (req, res) => {
    try {
      const validatedData = insertStaffSchema.partial().parse(req.body);
      const staffMember = await storage.updateStaffMember(req.params.id, validatedData);
      res.json(staffMember);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating staff member:", error);
      res.status(500).json({ message: "Failed to update staff member" });
    }
  });

  app.delete('/api/staff/:id', isAuthenticated, requireCrudPermission('delete'), async (req, res) => {
    try {
      await storage.deleteStaffMember(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting staff member:", error);
      res.status(500).json({ message: "Failed to delete staff member" });
    }
  });

  // User management routes
  app.get('/api/users', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/users/:id', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/users', isAuthenticated, requireResourcePermission('users', 'create'), async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      // Hash the password before storing
      const hashedPassword = await hashPassword(validatedData.password);
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword
      });
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch('/api/users/:id', isAuthenticated, requireResourcePermission('users', 'update'), async (req, res) => {
    try {
      const validatedData = insertUserSchema.partial().parse(req.body);
      // Hash the password if it's being updated
      if (validatedData.password) {
        validatedData.password = await hashPassword(validatedData.password);
      }
      const user = await storage.updateUser(req.params.id, validatedData);
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, requireResourcePermission('users', 'delete'), async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Staff time logs endpoint
  app.get('/api/staff/:id/time-logs', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const timeLogs = await storage.getTimeLogsByStaffId(req.params.id);
      res.json(timeLogs);
    } catch (error: any) {
      console.error("Error fetching staff time logs:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Staff available budget allocations endpoint
  app.get('/api/staff/:id/available-budget-allocations', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const budgetAllocations = await storage.getStaffAvailableBudgetAllocations(req.params.id);
      res.json(budgetAllocations);
    } catch (error: any) {
      console.error("Error fetching staff available budget allocations:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Time log routes with role-based permissions
  app.get('/api/time-logs', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const timeLogs = await storage.getTimeLogs();
      res.json(timeLogs);
    } catch (error) {
      console.error("Error fetching time logs:", error);
      res.status(500).json({ message: "Failed to fetch time logs" });
    }
  });

  app.post('/api/time-logs', isAuthenticated, requireCrudPermission('create'), async (req, res) => {
    try {
      // Convert date strings to Date objects before validation
      const dataWithDates = {
        ...req.body,
        serviceDate: req.body.serviceDate ? new Date(req.body.serviceDate) : undefined,
        scheduledStartTime: req.body.scheduledStartTime ? new Date(req.body.scheduledStartTime) : undefined,
        scheduledEndTime: req.body.scheduledEndTime ? new Date(req.body.scheduledEndTime) : undefined
      };
      
      const validatedData = insertTimeLogSchema.parse(dataWithDates);
      const timeLog = await storage.createTimeLog(validatedData);
      res.status(201).json(timeLog);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating time log:", error);
      res.status(500).json({ message: "Failed to create time log" });
    }
  });

  app.put('/api/time-logs/:id', isAuthenticated, requireCrudPermission('update'), async (req, res) => {
    try {
      const validatedData = insertTimeLogSchema.partial().parse(req.body);
      const timeLog = await storage.updateTimeLog(req.params.id, validatedData);
      res.json(timeLog);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating time log:", error);
      res.status(500).json({ message: "Failed to update time log" });
    }
  });

  app.delete('/api/time-logs/:id', isAuthenticated, requireCrudPermission('delete'), async (req, res) => {
    try {
      await storage.deleteTimeLog(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting time log:", error);
      res.status(500).json({ message: "Failed to delete time log" });
    }
  });

  // Client-Staff assignment routes
  app.get('/api/clients/:id/staff-assignments', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const assignments = await storage.getClientStaffAssignments(req.params.id);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching client staff assignments:", error);
      res.status(500).json({ message: "Failed to fetch client staff assignments" });
    }
  });

  app.post('/api/clients/:id/staff-assignments', isAuthenticated, requireCrudPermission('create'), async (req, res) => {
    try {
      const assignmentData = {
        ...req.body,
        clientId: req.params.id
      };
      const validatedData = insertClientStaffAssignmentSchema.parse(assignmentData);
      const assignment = await storage.createClientStaffAssignment(validatedData);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating client-staff assignment:", error);
      res.status(500).json({ message: "Failed to create client-staff assignment" });
    }
  });

  app.get('/api/staff/:id/client-assignments', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const assignments = await storage.getStaffClientAssignments(req.params.id);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching staff client assignments:", error);
      res.status(500).json({ message: "Failed to fetch staff client assignments" });
    }
  });

  app.post('/api/staff/:id/client-assignments', isAuthenticated, requireCrudPermission('create'), async (req, res) => {
    try {
      const assignmentData = {
        ...req.body,
        staffId: req.params.id
      };
      const validatedData = insertClientStaffAssignmentSchema.parse(assignmentData);
      const assignment = await storage.createClientStaffAssignment(validatedData);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating staff-client assignment:", error);
      res.status(500).json({ message: "Failed to create staff-client assignment" });
    }
  });

  app.get('/api/client-staff-assignments', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const assignments = await storage.getAllClientStaffAssignments();
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching all client-staff assignments:", error);
      res.status(500).json({ message: "Failed to fetch client-staff assignments" });
    }
  });

  app.post('/api/client-staff-assignments', isAuthenticated, requireCrudPermission('create'), async (req, res) => {
    try {
      const validatedData = insertClientStaffAssignmentSchema.parse(req.body);
      const assignment = await storage.createClientStaffAssignment(validatedData);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating client-staff assignment:", error);
      res.status(500).json({ message: "Failed to create client-staff assignment" });
    }
  });

  app.put('/api/client-staff-assignments/:id', isAuthenticated, requireCrudPermission('update'), async (req, res) => {
    try {
      const validatedData = insertClientStaffAssignmentSchema.partial().parse(req.body);
      const assignment = await storage.updateClientStaffAssignment(req.params.id, validatedData);
      res.json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating client-staff assignment:", error);
      res.status(500).json({ message: "Failed to update client-staff assignment" });
    }
  });

  app.delete('/api/client-staff-assignments/:id', isAuthenticated, requireCrudPermission('delete'), async (req, res) => {
    try {
      await storage.deleteClientStaffAssignment(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client-staff assignment:", error);
      res.status(500).json({ message: "Failed to delete client-staff assignment" });
    }
  });

  // Get staff-client workload data (hours per combination)
  app.get("/api/staff-client-workload", isAuthenticated, async (req, res) => {
    try {
      // Get all time logs from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const allTimeLogs = await storage.getTimeLogs();
      
      // Filter logs from the last 30 days
      const recentLogs = allTimeLogs.filter(log => {
        const logDate = new Date(log.serviceDate);
        return logDate >= thirtyDaysAgo;
      });
      
      // Group by staff-client combination and sum hours
      const workloadMap = new Map<string, any>();
      
      for (const log of recentLogs) {
        const key = `${log.staffId}-${log.clientId}`;
        
        if (!workloadMap.has(key)) {
          workloadMap.set(key, {
            staffId: log.staffId,
            clientId: log.clientId,
            totalHours: 0,
            lastServiceDate: log.serviceDate
          });
        }
        
        const workload = workloadMap.get(key);
        workload.totalHours += parseFloat(log.hours || '0');
        
        // Update last service date if this log is more recent
        if (new Date(log.serviceDate) > new Date(workload.lastServiceDate)) {
          workload.lastServiceDate = log.serviceDate;
        }
      }
      
      // Convert map to array
      const workloadData = Array.from(workloadMap.values());
      
      res.json(workloadData);
    } catch (error: any) {
      console.error("Error fetching workload data:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Budget category routes
  app.get('/api/budget-categories', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const categories = await storage.getBudgetCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching budget categories:", error);
      res.status(500).json({ message: "Failed to fetch budget categories" });
    }
  });

  // Budget type routes
  app.get('/api/budget-types', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const types = await storage.getBudgetTypes();
      res.json(types);
    } catch (error) {
      console.error("Error fetching budget types:", error);
      res.status(500).json({ message: "Failed to fetch budget types" });
    }
  });

  // Client budget allocation routes
  app.get('/api/clients/:id/budget-allocations', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const allocations = await storage.getClientBudgetAllocations(
        req.params.id,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(allocations);
    } catch (error) {
      console.error("Error fetching client budget allocations:", error);
      res.status(500).json({ message: "Failed to fetch client budget allocations" });
    }
  });

  // Get all clients with budget allocations for a specific period
  app.get('/api/clients-with-budgets', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const clientsWithBudgets = await storage.getClientsWithBudgetAllocations(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(clientsWithBudgets);
    } catch (error) {
      console.error("Error fetching clients with budget allocations:", error);
      res.status(500).json({ message: "Failed to fetch clients with budget allocations" });
    }
  });

  app.post('/api/clients/:id/budget-allocations', isAuthenticated, requireCrudPermission('create'), async (req, res) => {
    try {
      const validatedData = insertClientBudgetAllocationSchema.parse({
        ...req.body,
        clientId: req.params.id
      });
      const allocation = await storage.createClientBudgetAllocation(validatedData);
      res.status(201).json(allocation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating budget allocation:", error);
      res.status(500).json({ message: "Failed to create budget allocation" });
    }
  });

  app.put('/api/budget-allocations/:id', isAuthenticated, requireCrudPermission('update'), async (req, res) => {
    try {
      const validatedData = insertClientBudgetAllocationSchema.partial().parse(req.body);
      const allocation = await storage.updateClientBudgetAllocation(req.params.id, validatedData);
      res.json(allocation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating budget allocation:", error);
      res.status(500).json({ message: "Failed to update budget allocation" });
    }
  });

  app.delete('/api/budget-allocations/:id', isAuthenticated, requireCrudPermission('delete'), async (req, res) => {
    try {
      await storage.deleteClientBudgetAllocation(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting budget allocation:", error);
      res.status(500).json({ message: "Failed to delete budget allocation" });
    }
  });

  // Budget expense routes
  app.get('/api/budget-expenses', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const { clientId, categoryId, startDate, endDate } = req.query;
      const expenses = await storage.getBudgetExpenses(
        clientId as string,
        categoryId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching budget expenses:", error);
      res.status(500).json({ message: "Failed to fetch budget expenses" });
    }
  });

  app.post('/api/budget-expenses', isAuthenticated, requireCrudPermission('create'), async (req, res) => {
    try {
      console.log("Budget expense request body:", req.body);
      const validatedData = insertBudgetExpenseSchema.parse(req.body);
      const expense = await storage.createBudgetExpense(validatedData);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating budget expense:", error);
      res.status(500).json({ message: "Failed to create budget expense" });
    }
  });

  app.put('/api/budget-expenses/:id', isAuthenticated, requireCrudPermission('update'), async (req, res) => {
    try {
      const validatedData = insertBudgetExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateBudgetExpense(req.params.id, validatedData);
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating budget expense:", error);
      res.status(500).json({ message: "Failed to update budget expense" });
    }
  });

  app.delete('/api/budget-expenses/:id', isAuthenticated, requireCrudPermission('delete'), async (req, res) => {
    try {
      await storage.deleteBudgetExpense(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting budget expense:", error);
      res.status(500).json({ message: "Failed to delete budget expense" });
    }
  });

  // Budget analysis routes
  app.get('/api/clients/:id/budget-analysis', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date parameters are required" });
      }
      
      const analysis = await storage.getBudgetAnalysis(
        req.params.id,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching budget analysis:", error);
      res.status(500).json({ message: "Failed to fetch budget analysis" });
    }
  });

  // Enhanced budget availability check
  app.get('/api/clients/:id/budget-availability', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const clientId = req.params.id;
      const requestedAmount = parseFloat(req.query.amount as string) || 0;
      const date = req.query.date ? new Date(req.query.date as string) : undefined;
      
      const availability = await storage.checkBudgetAvailability(clientId, requestedAmount, date);
      res.json(availability);
    } catch (error) {
      console.error("Error checking budget availability:", error);
      res.status(500).json({ message: "Failed to check budget availability" });
    }
  });

  // Get available budgets for client
  app.get('/api/clients/:id/available-budgets', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const clientId = req.params.id;
      const date = req.query.date ? new Date(req.query.date as string) : undefined;
      
      const budgets = await storage.getClientAvailableBudgets(clientId, date);
      res.json(budgets);
    } catch (error) {
      console.error("Error fetching available budgets:", error);
      res.status(500).json({ message: "Failed to fetch available budgets" });
    }
  });

  // Smart hour allocation endpoint
  app.post('/api/smart-hour-allocation', isAuthenticated, requireCrudPermission('create'), async (req, res) => {
    try {
      const { clientId, staffId, hours, serviceDate, serviceType, mileage, notes, budgetId, scheduledStartTime, scheduledEndTime } = req.body;
      
      // Parse the date properly from yyyy-MM-dd format
      const parsedDate = new Date(serviceDate + 'T00:00:00');
      
      // Parse start and end times if provided
      const startTime = scheduledStartTime ? new Date(scheduledStartTime) : undefined;
      const endTime = scheduledEndTime ? new Date(scheduledEndTime) : undefined;
      
      const result = await storage.allocateHoursToBudgets(
        clientId,
        staffId,
        parseFloat(hours),
        parsedDate,
        serviceType,
        parseFloat(mileage) || 0,
        notes,
        budgetId, // Pass the selected budget ID
        startTime,
        endTime
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error allocating hours to budgets:", error);
      res.status(500).json({ message: "Failed to allocate hours to budgets" });
    }
  });

  // Data import routes
  app.get('/api/data/imports', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const imports = await storage.getDataImports();
      res.json(imports);
    } catch (error) {
      console.error("Error fetching data imports:", error);
      res.status(500).json({ message: "Failed to fetch data imports" });
    }
  });

  // Configure multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { 
      fileSize: 50 * 1024 * 1024, // 50MB limit for large Excel files
      fieldSize: 50 * 1024 * 1024  // Also increase field size limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'));
      }
    }
  });

  // Column position validation for Excel imports
  function validateColumnPositions(headers: string[]): any {
    const expectedColumns = {
      // Service Log Columns (Critical for time tracking)
      3: { name: "scheduled_start", expectedHeaders: ["Scheduled Start", "Inizio programmato"], description: "Service start date/time", column: "D", critical: true },
      4: { name: "scheduled_end", expectedHeaders: ["Scheduled End", "Fine programmata"], description: "Service end date/time", column: "E", critical: true },
      5: { name: "duration", expectedHeaders: ["Duration", "Durata"], description: "Service duration (HH:MM)", column: "F", critical: true },
      10: { name: "notes", expectedHeaders: ["Notes", "Note"], description: "Service notes", column: "K", critical: false },
      12: { name: "service_category", expectedHeaders: ["Service Category", "Categoria prestazione"], description: "Type of service category", column: "M", critical: true },
      13: { name: "service_type", expectedHeaders: ["Service Type", "Tipo prestazione"], description: "Specific service type", column: "N", critical: true },
      14: { name: "cost_1", expectedHeaders: ["Cost 1", "Costo 1"], description: "Hourly rate/cost", column: "O", critical: false }, // Optional for import
      
      // Client Columns (Critical for client management) 
      19: { name: "client_name", expectedHeaders: ["Person First Name", "Nome persona assistita"], description: "Client first name", column: "T", critical: true },
      20: { name: "client_lastname", expectedHeaders: ["Person Last Name", "Cognome persona assistita"], description: "Client last name", column: "U", critical: true },
      23: { name: "fiscal_code", expectedHeaders: ["Tax Code", "Codice fiscale"], description: "Italian fiscal code", column: "X", critical: true },
      
      // Key Identifier Columns (Critical for data linking)
      40: { name: "identifier", expectedHeaders: ["Identifier", "Identificatore"], description: "Unique identifier", column: "AO", critical: false },
      48: { name: "assisted_person_id", expectedHeaders: ["Assisted Person ID", "ID. assistito"], description: "Client ID", column: "AW", critical: true },
      53: { name: "operator_id", expectedHeaders: ["Operator ID", "ID. operatore"], description: "Staff member ID", column: "BB", critical: true }
    };

    const validationResults: any = {};
    let totalColumns = 0;
    let validColumns = 0;
    let totalCriticalColumns = 0;
    let validCriticalColumns = 0;

    Object.entries(expectedColumns).forEach(([indexStr, columnInfo]) => {
      const index = parseInt(indexStr);
      totalColumns++;
      if (columnInfo.critical) totalCriticalColumns++;
      
      const actualHeader = headers[index];
      const isValid = actualHeader && columnInfo.expectedHeaders.some(expected => 
        actualHeader.toLowerCase().includes(expected.toLowerCase()) ||
        expected.toLowerCase().includes(actualHeader.toLowerCase())
      );

      validationResults[index] = {
        ...columnInfo,
        actualHeader: actualHeader || "Missing",
        isValid: isValid,
        status: isValid ? "valid" : "invalid"
      };

      if (isValid) {
        validColumns++;
        if (columnInfo.critical) validCriticalColumns++;
      }
    });

    const validationScore = Math.round((validColumns / totalColumns) * 100);
    const criticalValidationScore = Math.round((validCriticalColumns / totalCriticalColumns) * 100);
    const canProceedWithImport = criticalValidationScore >= 70; // 70% of critical columns must be valid
    const isOptimalStructure = validColumns >= Math.floor(totalColumns * 0.8); // 80% threshold

    return {
      validationResults,
      totalColumns,
      validColumns,
      totalCriticalColumns,
      validCriticalColumns,
      validationScore,
      criticalValidationScore,
      isOptimalStructure,
      canProceedWithImport
    };
  }

  // Preview Excel data endpoint (parse but don't save)
  app.post("/api/data/preview", isAuthenticated, upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileBuffer = req.file.buffer;
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length === 0) {
        return res.status(400).json({ message: "Empty Excel file" });
      }

      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1);

      // Validate column positions
      const columnValidation = validateColumnPositions(headers);

      // Log headers and validation for debugging
      console.log('Excel headers:', headers);
      console.log('Column validation score:', columnValidation.validationScore);

      // Determine language and column mapping
      const isItalian = headers.some(header => 
        typeof header === 'string' && (
          header.toLowerCase().includes('persona assistita') ||
          header.toLowerCase().includes('operatore') ||
          header.toLowerCase().includes('cognome')
        )
      );

      // Column mappings for different languages
      const englishColumnMapping: { [key: string]: string } = {
        'Department': 'department',
        'Recorded Start': 'recordedStart',
        'Recorded End': 'recordedEnd',
        'Scheduled Start': 'scheduledStart',
        'Scheduled End': 'scheduledEnd',
        'Duration': 'duration',
        'Nominal Duration': 'nominalDuration',
        'Kilometers': 'kilometers',
        'Calculated Kilometers': 'calculatedKilometers',
        'Value': 'value',
        'Notes': 'notes',
        'Appointment Type': 'appointmentType',
        'Service Category': 'serviceCategory',
        'Service Type': 'serviceType',
        'Cost 1': 'cost1',
        'Cost 2': 'cost2',
        'Cost 3': 'cost3',
        'Category Type': 'categoryType',
        'Aggregation': 'aggregation',
        'Person First Name': 'assistedPersonFirstName',
        'Person Last Name': 'assistedPersonLastName',
        'Operator First Name': 'operatorFirstName',
        'Operator Last Name': 'operatorLastName',
        'Home Address': 'homeAddress',
        'Date': 'date'
      };

      const italianColumnMapping: { [key: string]: string } = {
        // Updated Italian mappings based on actual headers from the Excel
        'Nome assistito': 'assistedPersonFirstName',
        'Cognome assistito': 'assistedPersonLastName',
        'Nome della persona assistita': 'assistedPersonFirstName',
        'Cognome della persona assistita': 'assistedPersonLastName',
        'Nome operatore': 'operatorFirstName',
        'Cognome operatore': 'operatorLastName',
        'Indirizzo domicilio': 'homeAddress',
        'Data': 'date',
        'Reparto': 'department',
        'Dipartimento': 'department',
        'Inizio registrato': 'recordedStart',
        'Fine registrata': 'recordedEnd',
        'Inizio programmato': 'scheduledStart',
        'Fine programmata': 'scheduledEnd',
        'Durata': 'duration',
        'Durata nominale': 'nominalDuration',
        'Km': 'kilometers',
        'Chilometri': 'kilometers',
        'Km calcolati': 'calculatedKilometers',
        'Chilometri calcolati': 'calculatedKilometers',
        'Valore': 'value',
        'Note': 'notes',
        'Tipo appuntamento': 'appointmentType',
        'Tipo di appuntamento': 'appointmentType',
        'Categoria prestazione': 'serviceCategory',
        'Categoria di servizio': 'serviceCategory',
        'Tipo prestazione': 'serviceType',
        'Tipo di servizio': 'serviceType',
        'Costo 1': 'cost1',
        'Costo 2': 'cost2',
        'Costo 3': 'cost3',
        'Tipo categoria': 'categoryType',
        'Tipo di categoria': 'categoryType',
        'Aggregazione': 'aggregation',
        'Codice fiscale': 'taxCode',
        'Data di nascita': 'dateOfBirth',
        'ID. assistito': 'assistedPersonId',
        'ID. operatore': 'operatorId'
      };

      const columnMapping = isItalian ? italianColumnMapping : englishColumnMapping;

      // Process data for preview
      const previewData = dataRows
        .map((row: any[], index) => {
          if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
            return null;
          }

          const rowData: any = { 
            originalRowIndex: index + 2,
            importId: 'preview'
          };

          // Always use header-based mapping for Italian files since column positions may vary
          if (isItalian) {
            // Use Italian header-based mapping
            headers.forEach((header, colIndex) => {
              const dbField = italianColumnMapping[header];
              if (dbField) {
                const value = row[colIndex];
                rowData[dbField] = value === null || value === undefined ? '' : String(value);
              }
            });
            
            // Extract date from scheduledStart if not explicitly set
            if (!rowData.date && rowData.scheduledStart) {
              rowData.date = rowData.scheduledStart.split(' ')[0];
            }
            
            // Debug logging for first few rows
            if (index < 3) {
              console.log(`Preview Row ${index + 2}:`, {
                firstName: rowData.assistedPersonFirstName,
                lastName: rowData.assistedPersonLastName,
                operator: `${rowData.operatorFirstName} ${rowData.operatorLastName}`,
                date: rowData.date,
                scheduledStart: rowData.scheduledStart
              });
            }
          } else if (row.length >= 57) {
            // Use column position mapping for standard MINI Excel format (57 columns)
            // Column positions (0-indexed):
            rowData.department = row[0] || '';
            rowData.recordedStart = row[1] || '';
            rowData.recordedEnd = row[2] || '';
            rowData.scheduledStart = row[3] || '';  // Column D
            rowData.scheduledEnd = row[4] || '';    // Column E
            rowData.duration = row[5] || '';
            rowData.nominalDuration = row[6] || '';
            rowData.kilometers = row[7] || '';
            rowData.calculatedKilometers = row[8] || '';
            rowData.value = row[9] || '';
            rowData.notes = row[10] || '';
            rowData.appointmentType = row[11] || '';
            rowData.serviceCategory = row[12] || '';  // Column M
            rowData.serviceType = row[13] || '';      // Column N
            rowData.cost1 = row[14] || '';
            rowData.cost2 = row[15] || '';
            rowData.cost3 = row[16] || '';
            rowData.categoryType = row[17] || '';
            rowData.aggregation = row[18] || '';
            // Person info (columns T-X)
            rowData.assistedPersonFirstName = row[19] || '';  // Column T
            rowData.assistedPersonLastName = row[20] || '';   // Column U
            rowData.assistedPersonBirthDate = row[21] || '';  // Column V
            rowData.assistedPersonGender = row[22] || '';     // Column W
            rowData.taxCode = row[23] || '';                  // Column X
            rowData.primaryPhone = row[24] || '';
            rowData.mobilePhone = row[25] || '';
            rowData.email = row[26] || '';
            rowData.homeAddress = row[27] || '';              // Column AB
            // Operator info (columns AZ-BC)
            rowData.operatorFirstName = row[51] || '';        // Column AZ
            rowData.operatorLastName = row[52] || '';         // Column BA
            rowData.operatorId = row[53] || '';               // Column BB
            
            // Add date field - try to extract from scheduled start or a dedicated date column
            rowData.date = row[3] ? row[3].split(' ')[0] : '';  // Extract date from scheduledStart
          } else {
            // Fallback to header-based mapping for non-standard files
            headers.forEach((header, colIndex) => {
              const dbField = columnMapping[header];
              if (dbField) {
                const value = row[colIndex];
                rowData[dbField] = value === null || value === undefined ? '' : String(value);
              }
            });
          }

          return rowData;
        })
        .filter(row => row !== null)
        .slice(0, 50); // Limit preview to first 50 rows

      // Extract unique clients for preview
      const uniqueClients = new Map();
      previewData.forEach(row => {
        const firstName = row.assistedPersonFirstName?.trim();
        const lastName = row.assistedPersonLastName?.trim();
        
        if (!firstName) return;
        
        const clientKey = `${firstName}_${lastName || ''}`.toLowerCase();
        if (!uniqueClients.has(clientKey)) {
          uniqueClients.set(clientKey, {
            firstName,
            lastName: lastName || '',
            email: row.email || '',
            phone: row.primaryPhone || row.mobilePhone || '',
            address: row.homeAddress || ''
          });
        }
      });

      res.status(200).json({
        filename: req.file.originalname,
        totalRows: dataRows.length,
        previewRows: previewData.length,
        previewData: previewData,
        uniqueClients: Array.from(uniqueClients.values()),
        headers: headers,
        detectedLanguage: isItalian ? 'Italian' : 'English',
        columnMapping: Object.entries(columnMapping).filter(([key]) => headers.includes(key)),
        columnValidation: columnValidation
      });

    } catch (error: any) {
      console.error("Error processing Excel preview:", error);
      res.status(500).json({ 
        message: "Failed to process Excel preview",
        error: error.message
      });
    }
  });

  app.post('/api/data/import', isAuthenticated, requireCrudPermission('create'), upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Check for filename duplicates to prevent accidental re-imports
      const existingImport = await storage.findExcelImportByFilename(req.file.originalname);
      if (existingImport) {
        return res.status(409).json({ 
          message: "File already imported",
          error: `The file "${req.file.originalname}" has already been imported on ${new Date(existingImport.createdAt).toLocaleDateString()}. Re-importing the same file may cause duplicate data entries.`,
          details: {
            filename: req.file.originalname,
            existingImportId: existingImport.id,
            importDate: existingImport.createdAt,
            status: existingImport.status
          }
        });
      }

      // Create import record
      const importRecord = await storage.createDataImport({
        filename: req.file.originalname,
        uploadedByUserId: req.user.id,
        status: 'processing'
      });

      try {
        // Parse Excel file
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with all values as strings
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          raw: false, // This ensures all values are converted to strings
          defval: "" // Default empty cells to empty string
        });

        console.log(`Excel file parsed: Total rows including header: ${jsonData.length}`);

        if (jsonData.length < 2) {
          throw new Error("File appears to be empty or has no data rows");
        }

        // Extract headers and map to our column names
        const headers = (jsonData[0] as string[]).map(h => String(h || '').trim());
        console.log('Headers found in Excel file:', headers);
        
        const columnMapping: { [key: string]: string } = {
          // English mappings
          'Department': 'department',
          'Recorded Start': 'recordedStart',
          'Recorded End': 'recordedEnd',
          'Scheduled Start': 'scheduledStart',
          'Scheduled End': 'scheduledEnd',
          'Duration': 'duration',
          'Nominal Duration': 'nominalDuration',
          'Kilometers': 'kilometers',
          'Calculated Kilometers': 'calculatedKilometers',
          'Value': 'value',
          'Notes': 'notes',
          'Appointment Type': 'appointmentType',
          'Service Category': 'serviceCategory',
          'Service Type': 'serviceType',
          'Cost 1': 'cost1',
          'Cost 2': 'cost2',
          'Cost 3': 'cost3',
          'Category Type': 'categoryType',
          'Aggregation': 'aggregation',
          'Assisted Person First Name': 'assistedPersonFirstName',
          'Assisted Person Last Name': 'assistedPersonLastName',
          'Record Number': 'recordNumber',
          'Date of Birth': 'dateOfBirth',
          'Tax Code': 'taxCode',
          'Primary Phone': 'primaryPhone',
          'Secondary Phone': 'secondaryPhone',
          'Mobile Phone': 'mobilePhone',
          'Phone Notes': 'phoneNotes',
          'Home Address': 'homeAddress',
          'City of Residence': 'cityOfResidence',
          'Region of Residence': 'regionOfResidence',
          'Area': 'area',
          'Agreement': 'agreement',
          'Operator First Name': 'operatorFirstName',
          'Operator Last Name': 'operatorLastName',
          'Requester First Name': 'requesterFirstName',
          'Requester Last Name': 'requesterLastName',
          'Authorized': 'authorized',
          'Modified After Registration': 'modifiedAfterRegistration',
          'Valid Tag': 'validTag',
          'Identifier': 'identifier',
          'Department ID': 'departmentId',
          'Appointment Type ID': 'appointmentTypeId',
          'Service ID': 'serviceId',
          'Service Type ID': 'serviceTypeId',
          'Category ID': 'categoryId',
          'Category Type ID': 'categoryTypeId',
          'Aggregation ID': 'aggregationId',
          'Assisted Person ID': 'assistedPersonId',
          'Municipality ID': 'municipalityId',
          'Region ID': 'regionId',
          'Area ID': 'areaId',
          'Agreement ID': 'agreementId',
          'Operator ID': 'operatorId',
          'Requester ID': 'requesterId',
          'Assistance ID': 'assistanceId',
          'Ticket Exemption': 'ticketExemption',
          'Registration Number': 'registrationNumber',
          'XMPI Code': 'xmpiCode',
          'Travel Duration': 'travelDuration',
          
          // Italian mappings
          'Reparto': 'department',
          'Inizio registrato': 'recordedStart',
          'Fine registrata': 'recordedEnd',
          'Inizio programmato': 'scheduledStart',
          'Fine programmata': 'scheduledEnd',
          'Durata': 'duration',
          'Durata nominale': 'nominalDuration',
          'Km': 'kilometers',
          'Km calcolati': 'calculatedKilometers',
          'Valore': 'value',
          'Note': 'notes',
          'Tipo appuntamento': 'appointmentType',
          'Categoria prestazione': 'serviceCategory',
          'Tipo prestazione': 'serviceType',
          'Costo 1': 'cost1',
          'Costo 2': 'cost2',
          'Costo 3': 'cost3',
          'Tipo categoria': 'categoryType',
          'Aggregazione': 'aggregation',
          'Nome assistito': 'assistedPersonFirstName',
          'Cognome assistito': 'assistedPersonLastName',
          'Numero cartella': 'recordNumber',
          'Data di nascita': 'dateOfBirth',
          'Codice fiscale': 'taxCode',
          '1° Telefono': 'primaryPhone',
          '2° Telefono': 'secondaryPhone',
          'Cellulare': 'mobilePhone',
          'Note telefono': 'phoneNotes',
          'Indirizzo domicilio': 'homeAddress',
          'Comune domicilio': 'cityOfResidence',
          'Regione domicilio': 'regionOfResidence',
          'Zona': 'area',
          'Convenzione': 'agreement',
          'Nome operatore': 'operatorFirstName',
          'Cognome operatore': 'operatorLastName',
          'Nome richiedente': 'requesterFirstName',
          'Cognome richiedente': 'requesterLastName',
          'Autorizzato': 'authorized',
          'Modificato dopo Reg.': 'modifiedAfterRegistration',
          'Tag valido': 'validTag',
          'Identificativo': 'identifier',
          'ID. reparto': 'departmentId',
          'ID. tipo appuntamento': 'appointmentTypeId',
          'ID. prestazione': 'serviceId',
          'ID. tipo prestazione': 'serviceTypeId',
          'ID. categoria': 'categoryId',
          'ID. tipo categoria': 'categoryTypeId',
          'ID. aggregazione': 'aggregationId',
          'ID. assistito': 'assistedPersonId',
          'ID. comune': 'municipalityId',
          'ID. regione': 'regionId',
          'ID. zona': 'areaId',
          'ID. convenzione': 'agreementId',
          'ID. operatore': 'operatorId',
          'ID. richiedente': 'requesterId',
          'ID. assistenza': 'assistanceId',
          'Esenzione Ticket': 'ticketExemption',
          'Matricola': 'registrationNumber',
          'Codice XMPI': 'xmpiCode',
          'Durata spostamento': 'travelDuration'
        };

        // Process data rows
        const dataRows = jsonData.slice(1) as string[][];
        console.log(`Processing ${dataRows.length} data rows...`);
        
        const excelDataToInsert = dataRows
          .map((row, index) => {
            // Check if the entire row is empty
            const hasAnyData = row.some(cell => 
              cell !== null && 
              cell !== undefined && 
              String(cell).trim() !== ''
            );
            
            // Skip completely empty rows
            if (!hasAnyData) {
              console.log(`Skipping empty row at position ${index + 2}`);
              return null;
            }
            
            const rowData: any = {
              importId: importRecord.id,
              rowNumber: String(index + 2) // Excel rows start at 1, plus header row
            };

            // Use column position mapping for standard MINI Excel format (57 columns)
            if (row.length >= 57) {
              // Column positions (0-indexed) for standard MINI Excel format:
              rowData.department = row[0] || '';
              rowData.recordedStart = row[1] || '';
              rowData.recordedEnd = row[2] || '';
              rowData.scheduledStart = row[3] || '';  // Column D
              rowData.scheduledEnd = row[4] || '';    // Column E
              rowData.duration = row[5] || '';
              rowData.nominalDuration = row[6] || '';
              rowData.kilometers = row[7] || '';
              rowData.calculatedKilometers = row[8] || '';
              rowData.value = row[9] || '';
              rowData.notes = row[10] || '';
              rowData.appointmentType = row[11] || '';
              rowData.serviceCategory = row[12] || '';  // Column M
              rowData.serviceType = row[13] || '';      // Column N
              rowData.cost1 = row[14] || '';
              rowData.cost2 = row[15] || '';
              rowData.cost3 = row[16] || '';
              rowData.categoryType = row[17] || '';
              rowData.aggregation = row[18] || '';
              // Person info (columns T-X)
              rowData.assistedPersonFirstName = row[19] || '';  // Column T
              rowData.assistedPersonLastName = row[20] || '';   // Column U
              rowData.dateOfBirth = row[21] || '';              // Column V
              rowData.assistedPersonGender = row[22] || '';     // Column W
              rowData.taxCode = row[23] || '';                  // Column X
              rowData.primaryPhone = row[24] || '';
              rowData.mobilePhone = row[25] || '';
              rowData.email = row[26] || '';
              rowData.homeAddress = row[27] || '';              // Column AB
              // More fields...
              rowData.cityOfResidence = row[28] || '';
              rowData.regionOfResidence = row[29] || '';
              rowData.area = row[30] || '';
              rowData.agreement = row[31] || '';
              // Operator names (columns AH-AI)
              rowData.operatorFirstName = row[33] || '';  // Column AH
              rowData.operatorLastName = row[34] || '';   // Column AI
              // Requester names (columns AJ-AK)
              rowData.requesterFirstName = row[35] || '';  // Column AJ
              rowData.requesterLastName = row[36] || '';   // Column AK
              // Other fields
              rowData.authorized = row[37] || '';          // Column AL
              rowData.modifiedAfterRegistration = row[38] || '';  // Column AM
              rowData.validTag = row[39] || '';            // Column AN
              // IDs (columns AO onwards)
              rowData.identifier = row[40] || '';          // Column AO
              rowData.departmentId = row[41] || '';        // Column AP
              rowData.appointmentTypeId = row[42] || '';   // Column AQ
              rowData.serviceId = row[43] || '';           // Column AR
              rowData.serviceTypeId = row[44] || '';       // Column AS
              rowData.categoryId = row[45] || '';          // Column AT
              rowData.categoryTypeId = row[46] || '';      // Column AU
              rowData.aggregationId = row[47] || '';       // Column AV
              rowData.assistedPersonId = row[48] || '';    // Column AW
              rowData.municipalityId = row[49] || '';      // Column AX
              rowData.regionId = row[50] || '';            // Column AY
              rowData.areaId = row[51] || '';              // Column AZ
              rowData.agreementId = row[52] || '';         // Column BA
              rowData.operatorId = row[53] || '';          // Column BB
              rowData.requesterId = row[54] || '';         // Column BC
              rowData.assistanceId = row[55] || '';        // Column BD
              // Additional fields
              rowData.ticketExemption = row[56] || '';     // Column BE
              rowData.registrationNumber = row[57] || '';   // Column BF
              rowData.xmpiCode = row[58] || '';             // Column BG
              rowData.travelDuration = row[59] || '';       // Column BH
            } else {
              // Fallback to header-based mapping for non-standard files
              headers.forEach((header, colIndex) => {
                const dbField = columnMapping[header];
                if (dbField) {
                  // Convert to string and handle empty/null values
                  const value = row[colIndex];
                  rowData[dbField] = value === null || value === undefined ? '' : String(value);
                }
              });
            }
            
            // Log first few rows to debug
            if (index < 3) {
              console.log(`Row ${index + 2} data (client: ${rowData.assistedPersonFirstName} ${rowData.assistedPersonLastName}):`, rowData);
            }

            return rowData;
          })
          .filter(row => row !== null); // Remove null entries (empty rows)

        console.log(`Filtered to ${excelDataToInsert.length} non-empty rows from ${dataRows.length} total rows`);

        // Insert data in batches
        const batchSize = 100;
        for (let i = 0; i < excelDataToInsert.length; i += batchSize) {
          const batch = excelDataToInsert.slice(i, i + batchSize);
          await storage.createExcelDataBatch(batch);
        }

        // Update import record as completed
        await storage.updateDataImport(importRecord.id, {
          status: 'completed',
          totalRows: String(dataRows.length),
          processedRows: String(excelDataToInsert.length)
        });

        // Extract unique clients from imported data for synchronization
        const uniqueClients = new Map();
        excelDataToInsert.forEach(row => {
          const firstName = row.assistedPersonFirstName?.trim();
          const lastName = row.assistedPersonLastName?.trim();
          
          // Skip if no first name (minimum requirement)
          if (!firstName) return;
          
          const clientKey = `${firstName}_${lastName || ''}`.toLowerCase();
          if (!uniqueClients.has(clientKey)) {
            // Parse dateOfBirth string to Date object or null
            let dateOfBirth = null;
            if (row.dateOfBirth && row.dateOfBirth.trim() !== '') {
              const dateStr = row.dateOfBirth.trim();
              // Try to parse the date string
              const parsedDate = new Date(dateStr);
              // Check if it's a valid date
              if (!isNaN(parsedDate.getTime())) {
                dateOfBirth = parsedDate;
              }
            }
            
            uniqueClients.set(clientKey, {
              firstName,
              lastName: lastName || '',
              email: row.email || '',
              phone: row.primaryPhone || row.mobilePhone || '',
              address: row.homeAddress || '',
              dateOfBirth: dateOfBirth,
              status: 'active', // Default status
              serviceType: '', // Leave blank if not specified
              notes: row.notes || ''
            });
          }
        });

        // Auto-sync clients
        let clientsAdded = 0;
        let clientsSkipped = 0;
        const syncResults = [];
        
        for (const [key, clientData] of Array.from(uniqueClients.entries())) {
          try {
            // Check if client exists by name or email
            const existingClient = await storage.findClientByNameOrEmail(
              clientData.firstName,
              clientData.lastName,
              clientData.email
            );
            
            if (!existingClient) {
              // Create new client
              await storage.createClient({
                firstName: clientData.firstName,
                lastName: clientData.lastName,
                email: clientData.email,
                phone: clientData.phone,
                address: clientData.address,
                dateOfBirth: clientData.dateOfBirth,
                status: clientData.status,
                serviceType: clientData.serviceType,
                notes: clientData.notes,
                monthlyBudget: '0'
              });
              clientsAdded++;
              syncResults.push({
                name: `${clientData.firstName} ${clientData.lastName}`,
                action: 'added'
              });
            } else {
              clientsSkipped++;
              syncResults.push({
                name: `${clientData.firstName} ${clientData.lastName}`,
                action: 'skipped',
                reason: 'already exists'
              });
            }
          } catch (err) {
            console.error(`Error syncing client ${clientData.firstName} ${clientData.lastName}:`, err);
          }
        }

        res.status(200).json({ 
          message: `Successfully imported ${excelDataToInsert.length} rows (skipped ${dataRows.length - excelDataToInsert.length} empty rows)`,
          importId: importRecord.id,
          filename: req.file.originalname,
          rowsImported: excelDataToInsert.length,
          skippedRows: dataRows.length - excelDataToInsert.length,
          clientSync: {
            total: uniqueClients.size,
            added: clientsAdded,
            skipped: clientsSkipped,
            details: syncResults.slice(0, 10) // Show first 10 for summary
          }
        });

      } catch (processingError: any) {
        // Update import record as failed
        await storage.updateDataImport(importRecord.id, {
          status: 'failed',
          errorLog: processingError.message
        });
        throw processingError;
      }

    } catch (error: any) {
      console.error("Error processing data import:", error);
      res.status(500).json({ 
        message: "Failed to process data import",
        error: error.message
      });
    }
  });

  // Get imported data by import ID
  app.get('/api/data/import/:id', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const importData = await storage.getExcelDataByImportId(req.params.id);
      res.json(importData);
    } catch (error) {
      console.error("Error fetching import data:", error);
      res.status(500).json({ message: "Failed to fetch import data" });
    }
  });

  app.get('/api/data/import/:id/sync-status', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const syncStatus = await storage.getImportSyncStatus(req.params.id);
      res.json(syncStatus);
    } catch (error) {
      console.error("Error fetching sync status:", error);
      res.status(500).json({ message: "Failed to fetch sync status" });
    }
  });

  // Get Excel sync preview
  app.get("/api/imports/:id/sync-preview", isAuthenticated, async (req, res) => {
    try {
      const preview = await storage.getExcelSyncPreview(req.params.id);
      res.json(preview);
    } catch (error: any) {
      console.error("Error getting sync preview:", error);
      res.status(500).json({ message: "Failed to get sync preview", error: error.message });
    }
  });

  // Sync Excel clients
  app.post("/api/imports/:id/sync-clients", isAuthenticated, async (req, res) => {
    try {
      const { clientIds } = req.body;
      const result = await storage.syncExcelClients(req.params.id, clientIds || []);
      res.json(result);
    } catch (error: any) {
      console.error("Error syncing clients:", error);
      res.status(500).json({ message: "Failed to sync clients", error: error.message });
    }
  });

  // Sync Excel staff
  app.post("/api/imports/:id/sync-staff", isAuthenticated, async (req, res) => {
    try {
      const { staffIds } = req.body;
      const result = await storage.syncExcelStaff(req.params.id, staffIds || []);
      res.json(result);
    } catch (error: any) {
      console.error("Error syncing staff:", error);
      res.status(500).json({ message: "Failed to sync staff", error: error.message });
    }
  });

  // Create client-staff assignments from Excel data
  app.post("/api/imports/:id/sync-assignments", isAuthenticated, async (req, res) => {
    try {
      await storage.createClientStaffAssignmentsFromExcel(req.params.id);
      res.json({ success: true, message: "Client-staff assignments created successfully" });
    } catch (error: any) {
      console.error("Error creating client-staff assignments:", error);
      res.status(500).json({ message: "Failed to create assignments", error: error.message });
    }
  });

  // Sync time logs from Excel with duplicate detection
  app.post("/api/imports/:id/sync-time-logs", isAuthenticated, async (req, res) => {
    try {
      // Start the sync process asynchronously
      const importId = req.params.id;
      
      // Get total count for initial response
      const excelData = await storage.getExcelDataByImportId(importId);
      const totalRows = excelData.length;
      
      // Send immediate response that processing has started
      res.json({
        status: 'processing',
        total: totalRows,
        message: 'Time logs sync started. Use the sync status endpoint to track progress.'
      });
      
      // Start the actual sync process asynchronously (non-blocking)
      storage.createTimeLogsFromExcel(importId).then(result => {
        // Log duplicate detection results for monitoring
        if (result.duplicates.length > 0) {
          console.log(`Duplicate time logs detected: ${result.duplicates.length}`);
          result.duplicates.slice(0, 5).forEach(dup => {
            console.log(`- Identifier ${dup.identifier}: ${dup.reason}`);
          });
        }
        console.log(`Time logs sync completed for import ${importId}: Created: ${result.created}, Skipped: ${result.skipped}`);
      }).catch(error => {
        console.error("Error syncing time logs:", error);
      });
      
    } catch (error: any) {
      console.error("Error starting time logs sync:", error);
      res.status(500).json({ message: "Failed to start time logs sync", error: error.message });
    }
  });

  // Get time logs sync progress
  app.get("/api/imports/:id/sync-progress", isAuthenticated, async (req, res) => {
    try {
      const importId = req.params.id;
      console.log(`Getting sync progress for import ${importId}`); // Debug logging
      console.log('Global progress object keys:', Object.keys((global as any).timeLogsSyncProgress || {})); // Debug logging
      
      const progress = (global as any).timeLogsSyncProgress?.[importId];
      console.log('Progress data:', progress); // Debug logging
      
      if (!progress) {
        console.log('No progress found, returning not_started'); // Debug logging
        return res.json({
          status: 'not_started',
          processed: 0,
          total: 0,
          created: 0,
          skipped: 0,
          message: 'Sync not started'
        });
      }
      
      res.json(progress);
    } catch (error: any) {
      console.error("Error getting sync progress:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Sync data (clients + staff) with progress tracking
  app.post("/api/imports/:id/sync-data", isAuthenticated, async (req, res) => {
    try {
      const importId = req.params.id;
      const { clientIds, staffIds } = req.body;
      
      console.log(`Starting sync data for import ${importId}`);
      console.log(`Client IDs to sync: ${clientIds?.length || 0}`);
      console.log(`Staff IDs to sync: ${staffIds?.length || 0}`);
      
      // Calculate total items to process
      const totalItems = (clientIds?.length || 0) + (staffIds?.length || 0);
      
      if (totalItems === 0) {
        return res.json({
          status: 'completed',
          message: 'No items selected for sync',
          processed: 0,
          total: 0,
          created: 0,
          skipped: 0
        });
      }
      
      // Initialize global progress tracking
      if (!(global as any).syncDataProgress) {
        (global as any).syncDataProgress = {};
      }
      
      (global as any).syncDataProgress[importId] = {
        status: 'processing',
        processed: 0,
        total: totalItems,
        created: 0,
        skipped: 0,
        message: 'Starting sync data...'
      };
      
      // Send immediate response that processing has started
      res.json({
        status: 'processing',
        total: totalItems,
        message: 'Sync data started. Use the sync data progress endpoint to track progress.'
      });
      
      // Start the actual sync process asynchronously (non-blocking)
      (async () => {
        try {
          let totalCreated = 0;
          let totalUpdated = 0;
          let totalSkipped = 0;
          let processed = 0;
          
          // Sync clients first
          if (clientIds && clientIds.length > 0) {
            (global as any).syncDataProgress[importId] = {
              ...((global as any).syncDataProgress[importId] || {}),
              message: `Syncing ${clientIds.length} clients...`
            };
            
            const clientResult = await storage.syncExcelClients(importId, clientIds);
            totalCreated += clientResult.created || 0;
            totalUpdated += clientResult.updated || 0;
            totalSkipped += clientResult.skipped || 0;
            processed += clientIds.length;
            
            (global as any).syncDataProgress[importId] = {
              ...((global as any).syncDataProgress[importId] || {}),
              processed,
              created: totalCreated,
              skipped: totalSkipped,
              message: `Completed clients. Syncing ${staffIds?.length || 0} staff...`
            };
          }
          
          // Then sync staff
          if (staffIds && staffIds.length > 0) {
            const staffResult = await storage.syncExcelStaff(importId, staffIds);
            totalCreated += staffResult.created || 0;
            totalUpdated += staffResult.updated || 0;
            totalSkipped += staffResult.skipped || 0;
            processed += staffIds.length;
          }
          
          // Mark as completed
          (global as any).syncDataProgress[importId] = {
            status: 'completed',
            processed: totalItems,
            total: totalItems,
            created: totalCreated,
            updated: totalUpdated,
            skipped: totalSkipped,
            message: `Sync completed: ${totalCreated} created, ${totalUpdated} updated, ${totalSkipped} skipped`
          };
          
          console.log(`Sync data completed for import ${importId}: Created: ${totalCreated}, Updated: ${totalUpdated}, Skipped: ${totalSkipped}`);
          
        } catch (error) {
          console.error("Error in sync data process:", error);
          (global as any).syncDataProgress[importId] = {
            status: 'failed',
            processed: processed,
            total: totalItems,
            created: totalCreated,
            updated: totalUpdated,
            skipped: totalSkipped,
            message: 'Sync data failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })();
      
    } catch (error: any) {
      console.error("Error starting sync data:", error);
      res.status(500).json({ message: "Failed to start sync data", error: error.message });
    }
  });

  // Get sync data progress
  app.get("/api/imports/:id/sync-data-progress", isAuthenticated, async (req, res) => {
    try {
      const importId = req.params.id;
      console.log(`Getting sync data progress for import ${importId}`);
      console.log('Global sync data progress object keys:', Object.keys((global as any).syncDataProgress || {}));
      
      const progress = (global as any).syncDataProgress?.[importId];
      console.log('Sync data progress data:', progress);
      
      if (!progress) {
        console.log('No sync data progress found, returning not_started');
        return res.json({
          status: 'not_started',
          processed: 0,
          total: 0,
          created: 0,
          skipped: 0,
          message: 'Sync data not started'
        });
      }
      
      res.json(progress);
    } catch (error: any) {
      console.error("Error getting sync data progress:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Manual client sync endpoint (deprecated - kept for backward compatibility)
  app.post("/api/imports/:id/sync-clients-old", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get all Excel data for this import
      const excelRows = await storage.getExcelDataByImportId(id);
      
      if (!excelRows || excelRows.length === 0) {
        return res.status(404).json({ message: "No data found for this import" });
      }
      
      // Extract unique clients
      const uniqueClients = new Map();
      excelRows.forEach((row: any) => {
        const firstName = row.assistedPersonFirstName?.trim();
        const lastName = row.assistedPersonLastName?.trim();
        
        // Skip if no first name (minimum requirement)
        if (!firstName) return;
        
        const clientKey = `${firstName}_${lastName || ''}`.toLowerCase();
        if (!uniqueClients.has(clientKey)) {
          uniqueClients.set(clientKey, {
            firstName,
            lastName: lastName || '',
            email: row.email || '',
            phone: row.primaryPhone || row.mobilePhone || '',
            address: row.homeAddress || '',
            dateOfBirth: row.dateOfBirth || null,
            status: 'active',
            serviceType: '',
            notes: row.notes || ''
          });
        }
      });
      
      // Sync clients
      let clientsAdded = 0;
      let clientsSkipped = 0;
      const syncResults: any[] = [];
      
      for (const [key, clientData] of Array.from(uniqueClients.entries())) {
        try {
          const existingClient = await storage.findClientByNameOrEmail(
            clientData.firstName,
            clientData.lastName,
            clientData.email
          );
          
          if (!existingClient) {
            // Parse and validate dateOfBirth
            let parsedDateOfBirth = null;
            if (clientData.dateOfBirth) {
              const date = new Date(clientData.dateOfBirth);
              // Check if date is valid
              if (!isNaN(date.getTime())) {
                parsedDateOfBirth = date;
              }
            }
            
            await storage.createClient({
              firstName: clientData.firstName,
              lastName: clientData.lastName,
              email: clientData.email,
              phone: clientData.phone,
              address: clientData.address,
              dateOfBirth: parsedDateOfBirth,
              status: clientData.status,
              serviceType: clientData.serviceType,
              notes: clientData.notes,
              monthlyBudget: '0'
            });
            clientsAdded++;
            syncResults.push({
              name: `${clientData.firstName} ${clientData.lastName}`,
              action: 'added',
              email: clientData.email,
              phone: clientData.phone
            });
          } else {
            clientsSkipped++;
            syncResults.push({
              name: `${clientData.firstName} ${clientData.lastName}`,
              action: 'skipped',
              reason: 'already exists',
              email: clientData.email
            });
          }
        } catch (err: any) {
          console.error(`Error syncing client ${clientData.firstName} ${clientData.lastName}:`, err);
          syncResults.push({
            name: `${clientData.firstName} ${clientData.lastName}`,
            action: 'error',
            reason: err.message
          });
        }
      }
      
      res.status(200).json({
        total: uniqueClients.size,
        added: clientsAdded,
        skipped: clientsSkipped,
        errors: syncResults.filter(r => r.action === 'error').length,
        details: syncResults,
        summary: {
          totalRows: excelRows.length,
          uniqueClients: uniqueClients.size,
          message: `Processed ${excelRows.length} rows containing ${uniqueClients.size} unique clients`
        }
      });
      
    } catch (error: any) {
      console.error("Error syncing clients:", error);
      res.status(500).json({ message: error.message || "Failed to sync clients" });
    }
  });

  // Home care planning endpoints

  app.get("/api/home-care-plans/:id", isAuthenticated, async (req, res) => {
    try {
      const plan = await storage.getHomeCarePlan(req.params.id);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }
      res.json(plan);
    } catch (error: any) {
      console.error("Error fetching home care plan:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/home-care-plans", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertHomeCarePlanSchema.parse(req.body);
      const plan = await storage.createHomeCarePlan({
        ...validatedData,
        createdByUserId: req.user!.id
      });
      res.status(201).json(plan);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating home care plan:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get all home care plans with client info and budget details
  app.get("/api/home-care-plans", isAuthenticated, async (req, res) => {
    try {
      const plans = await storage.getHomeCarePlansWithDetails();
      res.json(plans);
    } catch (error: any) {
      console.error("Error fetching home care plans:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Delete a home care plan


  app.patch("/api/home-care-plans/:id", isAuthenticated, async (req, res) => {
    try {
      const plan = await storage.updateHomeCarePlan(req.params.id, req.body);
      res.json(plan);
    } catch (error: any) {
      console.error("Error updating home care plan:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/home-care-plans/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteHomeCarePlan(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting home care plan:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Activate a home care plan
  app.patch("/api/home-care-plans/:id/activate", isAuthenticated, async (req, res) => {
    try {
      const plan = await storage.updateHomeCarePlan(req.params.id, { status: 'active' });
      res.json(plan);
    } catch (error: any) {
      console.error("Error activating home care plan:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Client budget configuration endpoints
  app.get("/api/clients/:clientId/budget-configs", isAuthenticated, async (req, res) => {
    try {
      const configs = await storage.getClientBudgetConfigs(req.params.clientId);
      console.log("Budget configs for client", req.params.clientId, ":", configs.length);
      
      // Get all budget allocations for the client (not just current month)
      const allAllocations = await storage.getAllClientBudgetAllocations(req.params.clientId);
      console.log("All budget allocations found:", allAllocations.length);
      
      // Get all budget types to match with configs
      const budgetTypes = await storage.getBudgetTypes();
      
      // Update available balance based on allocations
      const updatedConfigs = await Promise.all(configs.map(async config => {
        // Find the budget type that matches this config
        const budgetType = budgetTypes.find(bt => bt.code === config.budgetCode);
        
        if (budgetType) {
          // Find allocations for this budget type
          const allocations = allAllocations.filter(a => a.budgetTypeId === budgetType.id);
          
          if (allocations.length > 0) {
            // Sum up all allocations and used amounts for this budget type
            const totalAllocated = allocations.reduce((sum, a) => sum + parseFloat(a.allocatedAmount), 0);
            const totalUsed = allocations.reduce((sum, a) => sum + parseFloat(a.usedAmount || '0'), 0);
            const remaining = totalAllocated - totalUsed;
            
            console.log(`Updating ${config.budgetCode} balance: allocated=${totalAllocated}, used=${totalUsed}, remaining=${remaining}`);
            return {
              ...config,
              availableBalance: remaining.toFixed(2)
            };
          }
        }
        
        // If no allocations found, return config with 0 balance
        console.log(`No allocations found for ${config.budgetCode}, setting balance to 0`);
        return {
          ...config,
          availableBalance: "0.00"
        };
      }));
      
      res.json(updatedConfigs);
    } catch (error: any) {
      console.error("Error fetching budget configs:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/budget-configs/:id", isAuthenticated, async (req, res) => {
    try {
      const config = await storage.getClientBudgetConfig(req.params.id);
      if (!config) {
        return res.status(404).json({ message: "Budget config not found" });
      }
      res.json(config);
    } catch (error: any) {
      console.error("Error fetching budget config:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/clients/:clientId/budget-configs", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertClientBudgetConfigSchema.parse({
        ...req.body,
        clientId: req.params.clientId
      });
      const config = await storage.createClientBudgetConfig(validatedData);
      res.status(201).json(config);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating budget config:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/budget-configs/:id", isAuthenticated, async (req, res) => {
    try {
      const config = await storage.updateClientBudgetConfig(req.params.id, req.body);
      res.json(config);
    } catch (error: any) {
      console.error("Error updating budget config:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/budget-configs/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteClientBudgetConfig(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting budget config:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/clients/:clientId/initialize-budgets", isAuthenticated, async (req, res) => {
    try {
      // Delete existing configs before reinitializing
      await storage.deleteClientBudgetConfigs(req.params.clientId);
      await storage.initializeClientBudgets(req.params.clientId);
      const configs = await storage.getClientBudgetConfigs(req.params.clientId);
      res.json(configs);
    } catch (error: any) {
      console.error("Error initializing budgets:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Statistics endpoints
  app.get("/api/statistics/duration", isAuthenticated, async (req, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const stats = await storage.getDurationStatistics(year);
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching duration statistics:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Comprehensive statistics endpoint
  app.get("/api/statistics/comprehensive", isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const range = req.query.range as string || 'last30days';
      const stats = await storage.getComprehensiveStatistics(range);
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching comprehensive statistics:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Service Categories endpoints
  app.get("/api/service-categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getServiceCategories();
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching service categories:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/service-categories", isAuthenticated, async (req, res) => {
    try {
      const category = await storage.createServiceCategory(req.body);
      res.status(201).json(category);
    } catch (error: any) {
      console.error("Error creating service category:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/service-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const category = await storage.updateServiceCategory(req.params.id, req.body);
      res.json(category);
    } catch (error: any) {
      console.error("Error updating service category:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/service-categories/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteServiceCategory(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting service category:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Service Types endpoints
  app.get("/api/service-types", isAuthenticated, async (req, res) => {
    try {
      const types = await storage.getServiceTypes();
      res.json(types);
    } catch (error: any) {
      console.error("Error fetching service types:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/service-types", isAuthenticated, async (req, res) => {
    try {
      const type = await storage.createServiceType(req.body);
      res.status(201).json(type);
    } catch (error: any) {
      console.error("Error creating service type:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/service-types/:id", isAuthenticated, async (req, res) => {
    try {
      const type = await storage.updateServiceType(req.params.id, req.body);
      res.json(type);
    } catch (error: any) {
      console.error("Error updating service type:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/service-types/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteServiceType(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting service type:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Budget Types endpoints (already have budget categories)
  app.get("/api/budget-types", isAuthenticated, async (req, res) => {
    try {
      const types = await storage.getBudgetTypes();
      res.json(types);
    } catch (error: any) {
      console.error("Error fetching budget types:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/budget-types", isAuthenticated, async (req, res) => {
    try {
      const type = await storage.createBudgetType(req.body);
      res.status(201).json(type);
    } catch (error: any) {
      console.error("Error creating budget type:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/budget-types/:id", isAuthenticated, async (req, res) => {
    try {
      const type = await storage.updateBudgetType(req.params.id, req.body);
      res.json(type);
    } catch (error: any) {
      console.error("Error updating budget type:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/budget-types/:id", isAuthenticated, async (req, res) => {
    try {
      const type = await storage.updateBudgetType(req.params.id, req.body);
      res.json(type);
    } catch (error: any) {
      console.error("Error updating budget type:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/budget-types/:id", isAuthenticated, requireCrudPermission('delete'), async (req, res) => {
    try {
      await storage.deleteBudgetType(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting budget type:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin endpoints for budget configuration
  app.get("/api/admin/budget-allocations", isAuthenticated, async (req, res) => {
    try {
      const allocations = await storage.getAllClientBudgetAllocations();
      
      // Add client and budget type names
      const allocationsWithDetails = await Promise.all(allocations.map(async (allocation) => {
        const client = await storage.getClient(allocation.clientId);
        const budgetType = await storage.getBudgetType(allocation.budgetTypeId);
        
        return {
          ...allocation,
          clientName: client ? `${client.lastName}, ${client.firstName}` : 'Unknown',
          budgetTypeName: budgetType ? budgetType.name : 'Unknown'
        };
      }));
      
      res.json(allocationsWithDetails);
    } catch (error: any) {
      console.error("Error fetching all budget allocations:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Update budget allocation rates
  app.put("/api/admin/budget-allocations/:id/rates", isAuthenticated, async (req, res) => {
    try {
      const { weekdayRate, holidayRate, kilometerRate } = req.body;
      
      const updated = await storage.updateClientBudgetAllocationRates(req.params.id, {
        weekdayRate,
        holidayRate,
        kilometerRate
      });
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating allocation rates:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/budget-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const category = await storage.updateBudgetCategory(req.params.id, req.body);
      res.json(category);
    } catch (error: any) {
      console.error("Error updating budget category:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/budget-categories", isAuthenticated, async (req, res) => {
    try {
      const category = await storage.createBudgetCategory(req.body);
      res.status(201).json(category);
    } catch (error: any) {
      console.error("Error creating budget category:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Staff rate routes removed - now using budget allocation rates

  // Staff compensation endpoints
  app.get("/api/compensations", isAuthenticated, async (req, res) => {
    try {
      const { staffId, status } = req.query;
      const compensations = await storage.getStaffCompensations(
        staffId as string | undefined,
        status as string | undefined
      );
      // Format dates properly for JSON serialization
      const formattedCompensations = compensations.map(comp => {
        // Helper function to safely convert dates
        const toISOStringOrNull = (date: any) => {
          if (!date) return null;
          if (date instanceof Date && !isNaN(date.getTime())) {
            return date.toISOString();
          }
          if (typeof date === 'string') {
            const parsed = new Date(date);
            if (!isNaN(parsed.getTime())) {
              return parsed.toISOString();
            }
          }
          return date;
        };
        
        return {
          ...comp,
          periodStart: toISOStringOrNull(comp.periodStart),
          periodEnd: toISOStringOrNull(comp.periodEnd),
          createdAt: toISOStringOrNull(comp.createdAt),
          updatedAt: toISOStringOrNull(comp.updatedAt),
          approvedAt: toISOStringOrNull(comp.approvedAt),
          paidAt: toISOStringOrNull(comp.paidAt)
        };
      });
      res.json(formattedCompensations);
    } catch (error: any) {
      console.error("Error fetching compensations:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get compensations for a specific client
  app.get("/api/clients/:clientId/compensations", isAuthenticated, async (req, res) => {
    try {
      const clientId = req.params.clientId;
      
      // Get all compensations (using the existing method)
      const allCompensations = await storage.getStaffCompensations();
      
      // Get time logs for this client to find related staff
      const clientTimeLogs = await storage.getTimeLogsByClient(clientId);
      const staffIds = [...new Set(clientTimeLogs.map(log => log.staffId))];
      
      // Filter compensations for staff who worked with this client
      const relevantCompensations = allCompensations.filter(comp => 
        staffIds.includes(comp.staffId)
      );
      
      // Get all staff members to map names
      const allStaff = await storage.getStaffMembers();
      const staffMap = new Map(allStaff.map(s => [s.id, s]));
      
      // Calculate client-specific portions for each compensation
      const clientSpecificCompensations = await Promise.all(relevantCompensations.map(async (comp) => {
        // Get all time logs for this compensation period and staff
        const compensationStartDate = new Date(comp.periodStart);
        const compensationEndDate = new Date(comp.periodEnd);
        
        // Get time logs for this specific client within the compensation period
        const clientLogsInPeriod = clientTimeLogs.filter(log => {
          const logDate = new Date(log.serviceDate);
          return log.staffId === comp.staffId &&
                 logDate >= compensationStartDate &&
                 logDate <= compensationEndDate;
        });
        
        // Calculate client-specific hours and amounts
        const clientHours = clientLogsInPeriod.reduce((sum, log) => 
          sum + parseFloat(log.hours || '0'), 0
        );
        
        // Use the actual compensation amount instead of recalculating with hardcoded rates
        // This ensures consistency with the compensation calculation logic
        const actualTotalCompensation = parseFloat(comp.totalCompensation || '0');
        
        // Calculate client-specific portion based on hours ratio
        const totalCompensationHours = parseFloat(comp.regularHours || '0') + parseFloat(comp.holidayHours || '0');
        const clientHourRatio = totalCompensationHours > 0 ? clientHours / totalCompensationHours : 0;
        const clientAmount = actualTotalCompensation * clientHourRatio;
        
        console.log(`Client compensation calculation: total=${actualTotalCompensation}, clientHours=${clientHours}, totalHours=${totalCompensationHours}, ratio=${clientHourRatio}, clientAmount=${clientAmount}`);
        
        // Get budget allocations for this client and compensation
        const compensationAllocations = await storage.getCompensationBudgetAllocations(comp.id);
        const clientAllocations = compensationAllocations.filter(a => a.clientId === clientId);
        const clientAllocatedAmount = clientAllocations.reduce((sum, a) => 
          sum + parseFloat(a.allocatedAmount || '0'), 0
        );
        
        // Calculate what the client owes (their portion minus what's covered by budget)
        const clientOwes = Math.max(0, clientAmount - clientAllocatedAmount);
        
        const toISOStringOrNull = (date: any) => {
          if (!date) return null;
          if (date instanceof Date && !isNaN(date.getTime())) {
            return date.toISOString();
          }
          if (typeof date === 'string') {
            const parsed = new Date(date);
            if (!isNaN(parsed.getTime())) {
              return parsed.toISOString();
            }
          }
          return date;
        };
        
        const staff = staffMap.get(comp.staffId);
        
        return {
          ...comp,
          // Override with client-specific values
          regularHours: clientHours.toFixed(2),
          totalCompensation: clientAmount.toFixed(2),
          clientSpecificHours: clientHours.toFixed(2),
          clientSpecificAmount: clientAmount.toFixed(2),
          clientAllocatedAmount: clientAllocatedAmount.toFixed(2),
          clientOwes: clientOwes.toFixed(2),
          staffName: staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown Staff',
          periodStart: toISOStringOrNull(comp.periodStart),
          periodEnd: toISOStringOrNull(comp.periodEnd),
          createdAt: toISOStringOrNull(comp.createdAt),
          updatedAt: toISOStringOrNull(comp.updatedAt),
          approvedAt: toISOStringOrNull(comp.approvedAt),
          paidAt: toISOStringOrNull(comp.paidAt)
        };
      }));
      
      // Filter out compensations where the client has no hours
      const compensationsWithClientHours = clientSpecificCompensations.filter(
        comp => parseFloat(comp.clientSpecificHours) > 0
      );
      
      res.json(compensationsWithClientHours);
    } catch (error: any) {
      console.error("Error fetching client compensations:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get all compensations (for dashboard) - Must be before :id route
  app.get("/api/compensations/all", isAuthenticated, async (req, res) => {
    try {
      console.log("Fetching all compensations...");
      const compensations = await storage.getAllStaffCompensations();
      console.log(`Found ${compensations.length} compensations`);
      
      // Add staff names to compensations and ensure dates are properly formatted
      const compensationsWithNames = await Promise.all(compensations.map(async (comp) => {
        const staff = await storage.getStaffMember(comp.staffId);
        
        // Helper function to safely convert dates
        const toISOStringOrNull = (date: any) => {
          if (!date) return null;
          if (date instanceof Date && !isNaN(date.getTime())) {
            return date.toISOString();
          }
          if (typeof date === 'string') {
            const parsed = new Date(date);
            if (!isNaN(parsed.getTime())) {
              return parsed.toISOString();
            }
          }
          return date;
        };
        
        return {
          ...comp,
          periodStart: toISOStringOrNull(comp.periodStart),
          periodEnd: toISOStringOrNull(comp.periodEnd),
          createdAt: toISOStringOrNull(comp.createdAt),
          updatedAt: toISOStringOrNull(comp.updatedAt),
          approvedAt: toISOStringOrNull(comp.approvedAt),
          paidAt: toISOStringOrNull(comp.paidAt),
          staffName: staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown'
        };
      }));
      res.json(compensationsWithNames);
    } catch (error: any) {
      console.error("Error fetching all compensations:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/compensations/:id", isAuthenticated, async (req, res) => {
    try {
      const compensation = await storage.getStaffCompensation(req.params.id);
      if (!compensation) {
        return res.status(404).json({ message: "Compensation not found" });
      }
      
      // Also fetch existing budget allocations if the compensation is approved
      if (compensation.status === 'approved' || compensation.status === 'paid') {
        const allocations = await storage.getCompensationBudgetAllocations(req.params.id);
        return res.json({ ...compensation, existingAllocations: allocations });
      }
      
      res.json(compensation);
    } catch (error: any) {
      console.error("Error fetching compensation:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get budget availability for a compensation period
  app.get("/api/compensations/:id/budget-availability", isAuthenticated, async (req, res) => {
    try {
      const compensation = await storage.getStaffCompensation(req.params.id);
      if (!compensation) {
        return res.status(404).json({ message: "Compensation not found" });
      }

      console.log("Fetching budget availability for compensation:", {
        id: compensation.id,
        staffId: compensation.staffId,
        periodStart: compensation.periodStart,
        periodEnd: compensation.periodEnd
      });

      // Ensure dates are valid
      const periodStart = compensation.periodStart instanceof Date 
        ? compensation.periodStart 
        : new Date(compensation.periodStart);
      const periodEnd = compensation.periodEnd instanceof Date
        ? compensation.periodEnd
        : new Date(compensation.periodEnd);

      console.log("Using dates:", { periodStart, periodEnd });

      // Get time logs for this staff member during the compensation period
      const timeLogs = await storage.getTimeLogsByStaffIdAndDateRange(
        compensation.staffId,
        periodStart,
        periodEnd
      );

      console.log(`Found ${timeLogs.length} time logs for period`);

      // Group time logs by client and service type, then map to available budget types
      const clientServiceMap = new Map<string, any>();
      
      // First, group all time logs by client and service type
      for (const log of timeLogs) {
        if (!log.clientId) continue;
        
        const client = await storage.getClient(log.clientId);
        if (!client) continue;

        const serviceKey = `${log.clientId}-${log.serviceType || 'Unknown'}`;
        
        if (!clientServiceMap.has(serviceKey)) {
          clientServiceMap.set(serviceKey, {
            clientId: log.clientId,
            clientName: `${client.firstName} ${client.lastName}`,
            serviceType: log.serviceType || 'Unknown',
            timeLogs: [],
            totalHours: 0,
            totalCost: 0,
            availableBudgets: []
          });
        }
        
        // Use the cost calculated and stored with the time log (from budget allocation rates)
        const calculatedCost = parseFloat(log.totalCost || '0');
        
        const serviceGroup = clientServiceMap.get(serviceKey);
        serviceGroup.timeLogs.push({
          id: log.id,
          clientId: log.clientId,
          clientName: `${client.firstName} ${client.lastName}`,
          date: log.serviceDate,
          hours: log.hours,
          totalCost: calculatedCost.toFixed(2),
          serviceType: log.serviceType,
          notes: log.notes
        });
        serviceGroup.totalHours += parseFloat(log.hours);
        serviceGroup.totalCost += calculatedCost;
      }

      // Now, for each client-service combination, get available budget types
      const results = [];
      for (const [key, serviceGroup] of clientServiceMap) {
        const logDate = serviceGroup.timeLogs[0]?.date 
          ? (serviceGroup.timeLogs[0].date instanceof Date ? serviceGroup.timeLogs[0].date : new Date(serviceGroup.timeLogs[0].date))
          : new Date();
          
        const budgetAllocations = await storage.getClientBudgetAllocations(
          serviceGroup.clientId,
          undefined,
          logDate
        );

        // Group budget allocations by budget type to aggregate totals
        const budgetTypeMap = new Map<string, any>();
        
        for (const allocation of budgetAllocations) {
          const budgetType = await storage.getBudgetType(allocation.budgetTypeId);
          
          if (!budgetTypeMap.has(allocation.budgetTypeId)) {
            budgetTypeMap.set(allocation.budgetTypeId, {
              budgetTypeId: allocation.budgetTypeId,
              budgetTypeName: budgetType?.name || 'Unknown',
              allocations: [],
              totalAvailable: 0,
              totalBudget: 0,
              totalUsed: 0
            });
          }
          
          const validLogDate = logDate instanceof Date && !isNaN(logDate.getTime()) 
            ? logDate 
            : new Date();
          
          const available = await storage.getAvailableBudgetForClient(
            serviceGroup.clientId,
            allocation.budgetTypeId,
            validLogDate
          );
          
          const budgetGroup = budgetTypeMap.get(allocation.budgetTypeId);
          budgetGroup.allocations.push({
            allocationId: allocation.id,
            available: available?.available || 0,
            total: available?.total || 0,
            used: available?.used || 0
          });
          budgetGroup.totalAvailable += available?.available || 0;
          budgetGroup.totalBudget += available?.total || 0;
          budgetGroup.totalUsed += available?.used || 0;
        }

        // If no budget allocations exist, still show the client with a "No Budget" option
        if (budgetTypeMap.size === 0) {
          results.push({
            clientId: serviceGroup.clientId,
            clientName: serviceGroup.clientName,
            serviceType: serviceGroup.serviceType,
            budgetTypeId: null,
            budgetTypeName: 'No Budget',
            allocationId: null,
            allocations: [],
            available: 0,
            total: 0,
            used: 0,
            percentage: 0,
            timeLogs: serviceGroup.timeLogs,
            totalHours: serviceGroup.totalHours,
            totalCost: serviceGroup.totalCost,
            noBudget: true
          });
        } else {
          // Create results with aggregated budget information
          for (const [budgetTypeId, budgetGroup] of budgetTypeMap) {
            results.push({
              clientId: serviceGroup.clientId,
              clientName: serviceGroup.clientName,
              serviceType: serviceGroup.serviceType,
              budgetTypeId: budgetGroup.budgetTypeId,
              budgetTypeName: budgetGroup.budgetTypeName,
              // For display purposes, use the first allocation ID
              allocationId: budgetGroup.allocations[0].allocationId,
              allocations: budgetGroup.allocations,
              // Aggregated totals for this budget type
              available: budgetGroup.totalAvailable,
              total: budgetGroup.totalBudget,
              used: budgetGroup.totalUsed,
              percentage: budgetGroup.totalBudget > 0 ? (budgetGroup.totalUsed / budgetGroup.totalBudget) * 100 : 0,
              timeLogs: serviceGroup.timeLogs,
              totalHours: serviceGroup.totalHours,
              totalCost: serviceGroup.totalCost,
              noBudget: false
            });
          }
        }
      }

      res.json(results);
    } catch (error: any) {
      console.error("Error fetching budget availability:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/staff/:staffId/calculate-compensation", isAuthenticated, async (req, res) => {
    try {
      const { periodStart, periodEnd } = req.body;
      if (!periodStart || !periodEnd) {
        return res.status(400).json({ message: "Period start and end dates are required" });
      }
      
      console.log(`Backend received dates: ${periodStart} to ${periodEnd}`);
      
      const calculation = await storage.calculateStaffCompensation(
        req.params.staffId,
        periodStart,  // Pass as string to avoid timezone conversion
        periodEnd     // Pass as string to avoid timezone conversion
      );
      res.json(calculation);
    } catch (error: any) {
      console.error("Error calculating compensation:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/compensations", isAuthenticated, async (req, res) => {
    try {
      console.log("Received compensation data:", req.body);
      
      // Extract budget allocations before validation (they're not part of the compensation schema)
      const { budgetAllocations, ...compensationData } = req.body;
      
      const validatedData = insertStaffCompensationSchema.parse(compensationData);
      const compensation = await storage.createStaffCompensation(validatedData);
      
      // If budget allocations are provided, create budget expenses and update allocations
      if (budgetAllocations && Array.isArray(budgetAllocations)) {
        for (const allocation of budgetAllocations) {
          const { budgetAllocationId, amount } = allocation;
          
          // Handle "Direct assistance" fallback case
          if (budgetAllocationId === 'direct-assistance-fallback') {
            console.log('Creating Direct assistance budget allocation as fallback for compensation:', compensation.id);
            
            // Create a budget expense record for tracking (no actual budget allocation needed for fallback)
            await storage.createBudgetExpense({
              clientId: 'direct-assistance-client', // Virtual client for direct assistance
              budgetTypeId: 'type-direct-assistance',
              allocationId: null, // No specific allocation for direct assistance fallback
              amount: String(amount),
              description: `Direct assistance compensation for staff ${compensation.staffId} (period: ${validatedData.periodStart} - ${validatedData.periodEnd})`,
              expenseDate: validatedData.periodStart
            });

            // Create compensation budget allocation record for Payment Records visibility
            await storage.createCompensationBudgetAllocation({
              compensationId: compensation.id,
              clientBudgetAllocationId: null, // No specific budget allocation for Direct assistance
              clientId: 'direct-assistance-client', // Virtual client for direct assistance
              budgetTypeId: 'type-direct-assistance',
              allocatedAmount: String(amount),
              allocatedHours: validatedData.regularHours, // Use regular hours from compensation
              allocationDate: validatedData.periodStart,
              notes: `Direct assistance fallback allocation for staff ${compensation.staffId}`,
              isDirectClientPayment: true, // Mark as direct payment
              paymentStatus: 'paid' // Automatically paid since it's direct assistance
            });
            
            console.log(`Created direct assistance budget expense and allocation: €${amount} for compensation ${compensation.id}`);
            continue;
          }
          
          // Get the budget allocation details to fetch clientId and budgetTypeId
          const budgetAllocation = await storage.getClientBudgetAllocation(budgetAllocationId);
          if (!budgetAllocation) {
            console.error(`Budget allocation ${budgetAllocationId} not found`);
            continue;
          }
          
          // Create budget expense record
          await storage.createBudgetExpense({
            clientId: budgetAllocation.clientId,
            budgetTypeId: budgetAllocation.budgetTypeId,
            allocationId: budgetAllocationId,
            amount: amount.toString(),
            description: `Staff compensation - ${validatedData.notes || 'Compensation payment'}`,
            expenseDate: new Date(),
            compensationId: compensation.id
          });
          
          // Update the budget allocation usage
          await storage.updateBudgetUsage(budgetAllocationId, amount);
        }
        
        console.log(`Created compensation ${compensation.id} with ${budgetAllocations.length} budget allocations`);
      }
      
      res.status(201).json(compensation);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating compensation:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/compensations/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertStaffCompensationSchema.partial().parse(req.body);
      const compensation = await storage.updateStaffCompensation(req.params.id, validatedData);
      res.json(compensation);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating compensation:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/compensations/:id/approve", isAuthenticated, async (req, res) => {
    try {
      const { budgetAllocations } = req.body;
      
      // Get the compensation details before approval
      const compensation = await storage.getStaffCompensation(req.params.id);
      if (!compensation) {
        return res.status(404).json({ message: "Compensation not found" });
      }
      
      // Get time logs for the compensation period
      const periodStart = compensation.periodStart instanceof Date 
        ? compensation.periodStart 
        : new Date(compensation.periodStart);
      const periodEnd = compensation.periodEnd instanceof Date
        ? compensation.periodEnd
        : new Date(compensation.periodEnd);
      
      const timeLogs = await storage.getTimeLogsByStaffIdAndDateRange(
        compensation.staffId,
        periodStart,
        periodEnd
      );
      
      // Get staff member details for rates
      const staff = await storage.getStaffMember(compensation.staffId);
      if (!staff) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      
      // Group time logs by client to calculate per-client compensation
      const clientCompensationDetails: any[] = [];
      const clientHoursMap = new Map();
      
      for (const log of timeLogs) {
        const client = await storage.getClient(log.clientId);
        if (!client) continue;
        
        const logDate = new Date(log.serviceDate);
        const isHoliday = isItalianHolidayOrSunday(logDate);
        const hours = parseFloat(log.hours);
        const mileage = parseFloat(log.mileage || '0');
        
        // Get or initialize client totals
        if (!clientHoursMap.has(log.clientId)) {
          clientHoursMap.set(log.clientId, {
            clientId: log.clientId,
            staffId: compensation.staffId,
            serviceType: log.serviceType,
            regularHours: 0,
            holidayHours: 0,
            weekendHours: 0,
            overtimeHours: 0,
            totalHours: 0,
            totalMileage: 0,
            baseCompensation: 0,
            holidayCompensation: 0,
            weekendCompensation: 0,
            overtimeCompensation: 0,
            mileageReimbursement: 0,
            clientTotalAmount: 0,
            serviceDates: []
          });
        }
        
        const clientTotals = clientHoursMap.get(log.clientId);
        clientTotals.totalHours += hours;
        clientTotals.totalMileage += mileage;
        clientTotals.serviceDates.push(logDate.toISOString());
        
        // Calculate compensation based on staff rates
        const weekdayRate = parseFloat(staff.weekdayRate || '15.00');
        const holidayRate = parseFloat(staff.holidayRate || '30.00');
        const mileageRate = parseFloat(staff.mileageRate || '0.36');
        
        if (isHoliday) {
          clientTotals.holidayHours += hours;
          clientTotals.holidayCompensation += hours * holidayRate;
        } else {
          clientTotals.regularHours += hours;
          clientTotals.baseCompensation += hours * weekdayRate;
        }
        
        clientTotals.mileageReimbursement += mileage * mileageRate;
        clientTotals.clientTotalAmount = clientTotals.baseCompensation + 
                                         clientTotals.holidayCompensation + 
                                         clientTotals.mileageReimbursement;
      }
      
      // Prepare calculation details for each client
      for (const [clientId, totals] of clientHoursMap) {
        // Find budget allocation for this client if provided
        const clientBudgetAllocation = budgetAllocations?.find((a: any) => a.clientId === clientId);
        
        clientCompensationDetails.push({
          compensationId: req.params.id,
          clientId,
          staffId: compensation.staffId,
          serviceType: totals.serviceType,
          regularHours: totals.regularHours.toString(),
          holidayHours: totals.holidayHours.toString(),
          weekendHours: totals.weekendHours.toString(),
          overtimeHours: totals.overtimeHours.toString(),
          totalHours: totals.totalHours.toString(),
          weekdayRateUsed: staff.weekdayRate || '15.00',
          holidayRateUsed: staff.holidayRate || '30.00',
          mileageRateUsed: staff.mileageRate || '0.36',
          totalMileage: totals.totalMileage.toString(),
          mileageReimbursement: totals.mileageReimbursement.toString(),
          baseCompensation: totals.baseCompensation.toString(),
          holidayCompensation: totals.holidayCompensation.toString(),
          weekendCompensation: totals.weekendCompensation.toString(),
          overtimeCompensation: totals.overtimeCompensation.toString(),
          clientTotalAmount: totals.clientTotalAmount.toString(),
          paymentAmount: totals.clientTotalAmount.toString(), // Add this field for display
          budgetTypeId: clientBudgetAllocation?.budgetTypeId || null,
          budgetAllocationId: clientBudgetAllocation?.clientBudgetAllocationId || null,
          budgetCoveredAmount: clientBudgetAllocation?.allocatedAmount || '0',
          clientOwedAmount: (totals.clientTotalAmount - parseFloat(clientBudgetAllocation?.allocatedAmount || '0')).toString(),
          periodStart: periodStart,
          periodEnd: periodEnd,
          serviceDates: totals.serviceDates,
          calculatedAt: new Date(),
          approvedAt: new Date()
        });
      }
      
      // Save the calculation details
      if (clientCompensationDetails.length > 0) {
        await storage.saveCompensationCalculationDetails(clientCompensationDetails);
      }
      
      // Now approve the compensation
      const approvedCompensation = await storage.approveStaffCompensation(
        req.params.id,
        req.user?.id || ''
      );
      
      // If budget allocations are provided, create them
      if (budgetAllocations && Array.isArray(budgetAllocations)) {
        for (const allocation of budgetAllocations) {
          await storage.createCompensationBudgetAllocation({
            compensationId: req.params.id,
            ...allocation,
            allocationDate: new Date().toISOString()
          });
        }
      }
      
      res.json(approvedCompensation);
    } catch (error: any) {
      console.error("Error approving compensation:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/compensations/:id/mark-paid", isAuthenticated, async (req, res) => {
    try {
      const compensation = await storage.markStaffCompensationPaid(req.params.id);
      res.json(compensation);
    } catch (error: any) {
      console.error("Error marking compensation as paid:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Update compensation status
  app.patch("/api/compensations/:id/status", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      let compensation;
      if (status === 'paid') {
        compensation = await storage.markStaffCompensationPaid(req.params.id);
      } else if (status === 'approved') {
        compensation = await storage.approveStaffCompensation(req.params.id, req.user?.id || '');
      } else {
        // For other status updates, use a generic update method
        compensation = await storage.updateStaffCompensationStatus(req.params.id, status);
      }
      
      res.json(compensation);
    } catch (error: any) {
      console.error("Error updating compensation status:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // PATCH endpoint for updating compensation hours/mileage - for inline editing
  // Removed duplicate PATCH endpoint

  // Get budget allocations for a compensation
  app.get("/api/compensations/:id/budget-allocations", isAuthenticated, async (req, res) => {
    try {
      const allocations = await storage.getCompensationBudgetAllocations(req.params.id);
      res.json(allocations);
    } catch (error: any) {
      console.error("Error fetching compensation budget allocations:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get saved calculation details for a compensation
  app.get("/api/compensations/:id/calculation-details", isAuthenticated, async (req, res) => {
    try {
      const details = await storage.getCompensationCalculationDetails(req.params.id);
      
      // Enhance with client and staff names
      const enhancedDetails = await Promise.all(details.map(async (detail) => {
        const client = await storage.getClient(detail.clientId);
        const staff = await storage.getStaffMember(detail.staffId);
        const budgetType = detail.budgetTypeId ? await storage.getBudgetType(detail.budgetTypeId) : null;
        
        return {
          ...detail,
          clientName: client ? `${client.lastName}, ${client.firstName}` : 'Unknown',
          staffName: staff ? `${staff.lastName}, ${staff.firstName}` : 'Unknown',
          budgetTypeName: budgetType ? budgetType.name : 'Direct Payment'
        };
      }));
      
      res.json(enhancedDetails);
    } catch (error: any) {
      console.error("Error fetching compensation calculation details:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/compensations/:id", isAuthenticated, async (req, res) => {
    try {
      // First delete any budget allocations for this compensation
      await storage.deleteCompensationBudgetAllocations(req.params.id);
      // Then delete the compensation itself
      await storage.deleteStaffCompensation(req.params.id);
      res.json({ success: true, message: "Compensation deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting compensation:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Batch generate compensations
  app.post("/api/compensations/batch-generate", isAuthenticated, async (req, res) => {
    try {
      const { staffIds, periodStart, periodEnd } = req.body;
      let generatedCount = 0;
      
      for (const staffId of staffIds) {
        try {
          // Calculate compensation for each staff member
          const timeLogs = await storage.getTimeLogsByStaffIdAndDateRange(
            staffId,
            new Date(periodStart),
            new Date(periodEnd)
          );
          
          if (timeLogs.length > 0) {
            // Use the storage calculation method instead of manual calculation
            const calculation = await storage.calculateStaffCompensation(
              staffId,
              new Date(periodStart),
              new Date(periodEnd)
            );
            
            if (calculation) {
              // Create compensation record with calculated values
              const compensation = await storage.createStaffCompensation({
                staffId,
                periodStart: new Date(periodStart).toISOString(),
                periodEnd: new Date(periodEnd).toISOString(),
                regularHours: calculation.regularHours.toString(),
                overtimeHours: calculation.overtimeHours.toString(),
                weekendHours: calculation.weekendHours.toString(),
                holidayHours: calculation.holidayHours.toString(),
                totalMileage: calculation.totalMileage.toString(),
                baseCompensation: calculation.baseCompensation.toString(),
                overtimeCompensation: calculation.overtimeCompensation.toString(),
                weekendCompensation: calculation.weekendCompensation.toString(),
                holidayCompensation: calculation.holidayCompensation.toString(),
                mileageReimbursement: calculation.mileageReimbursement.toString(),
                adjustments: '0',
                totalCompensation: calculation.totalCompensation.toString(),
                status: 'pending_approval',
                notes: `Auto-generated compensation for period ${periodStart} to ${periodEnd}`
              });
              generatedCount++;
            }
          }
        } catch (err) {
          console.error(`Failed to generate compensation for staff ${staffId}:`, err);
        }
      }
      
      res.json({ count: generatedCount });
    } catch (error: any) {
      console.error("Error batch generating compensations:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Batch approve compensations
  app.post("/api/compensations/batch-approve", isAuthenticated, async (req, res) => {
    try {
      const { compensationIds } = req.body;
      let approvedCount = 0;
      
      for (const id of compensationIds) {
        try {
          await storage.approveStaffCompensation(id, req.user?.id || '');
          approvedCount++;
        } catch (err) {
          console.error(`Failed to approve compensation ${id}:`, err);
        }
      }
      
      res.json({ count: approvedCount });
    } catch (error: any) {
      console.error("Error batch approving compensations:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Export compensations to Excel
  // Download original Excel file data as recreated Excel file
  app.get("/api/data/import/:importId/download", isAuthenticated, async (req, res) => {
    try {
      const { importId } = req.params;
      
      // Get import record
      const importRecord = await storage.getDataImportById(importId);
      if (!importRecord) {
        return res.status(404).json({ message: "Import record not found" });
      }

      // Get the Excel data for this import
      const excelRows = await storage.getExcelDataByImportId(importId);
      if (excelRows.length === 0) {
        return res.status(404).json({ message: "No data found for this import" });
      }

      // Recreate Excel file from stored data
      const workbook = XLSX.utils.book_new();
      
      // Convert back to array format for Excel
      const headers = Object.keys(excelRows[0]).filter(key => key !== 'id' && key !== 'importId' && key !== 'rowNumber');
      const data = [headers, ...excelRows.map(row => headers.map(header => row[header] || ''))];
      
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

      // Generate Excel buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Set response headers for file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${importRecord.filename}"`);
      res.setHeader('Content-Length', buffer.length);
      
      res.send(buffer);

    } catch (error: any) {
      console.error("Error downloading Excel file:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/compensations/export", isAuthenticated, async (req, res) => {
    try {
      const { compensationIds } = req.body;
      // This would require XLSX library to be installed
      // For now, return a placeholder
      res.status(501).json({ message: "Excel export not yet implemented" });
    } catch (error: any) {
      console.error("Error exporting compensations:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Compensation adjustment endpoints
  app.get("/api/compensations/:compensationId/adjustments", isAuthenticated, async (req, res) => {
    try {
      const adjustments = await storage.getCompensationAdjustments(req.params.compensationId);
      res.json(adjustments);
    } catch (error: any) {
      console.error("Error fetching compensation adjustments:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/compensations/:compensationId/adjustments", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCompensationAdjustmentSchema.parse({
        ...req.body,
        compensationId: req.params.compensationId,
        adjustedBy: req.user?.id || ''
      });
      const adjustment = await storage.createCompensationAdjustment(validatedData);
      res.status(201).json(adjustment);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating compensation adjustment:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Staff data sync endpoint
  app.post("/api/staff/:id/sync-data", isAuthenticated, async (req, res) => {
    try {
      const staffId = req.params.id;
      
      // Get the staff member with external ID
      const staff = await storage.getStaffMember(staffId);
      if (!staff) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      
      // Sync client assignments from Excel data if available
      let clientsAssigned = 0;
      let serviceLogs = 0;
      
      if (staff.externalId) {
        // Get latest import
        const imports = await storage.getExcelImports();
        const latestImport = imports[0];
        
        if (latestImport) {
          // Get Excel data for this staff member
          const excelData = await storage.getExcelData(latestImport.id);
          const staffRows = excelData.filter(row => 
            row.operatorId === staff.externalId
          );
          
          // Extract unique client IDs
          const clientExternalIds = [...new Set(staffRows
            .map(row => row.assistedPersonId)
            .filter(id => id))];
          
          // Create client-staff assignments for each unique client
          for (const clientExternalId of clientExternalIds) {
            const client = await storage.getClientByExternalId(clientExternalId);
            if (client) {
              const existing = await storage.getClientStaffAssignments(client.id);
              const hasAssignment = existing.some(a => a.staffId === staffId);
              
              if (!hasAssignment) {
                await storage.createClientStaffAssignment({
                  clientId: client.id,
                  staffId: staffId,
                  assignmentType: 'primary',
                  startDate: new Date().toISOString()
                });
                clientsAssigned++;
              }
            }
          }
          
          // Create service logs from Excel data
          for (const row of staffRows) {
            if (row.assistedPersonId && row.serviceDate) {
              const client = await storage.getClientByExternalId(row.assistedPersonId);
              if (client) {
                // Check if time log already exists
                const existingLogs = await storage.getTimeLogs();
                const duplicate = existingLogs.some(log => 
                  log.staffId === staffId &&
                  log.clientId === client.id &&
                  log.date === row.serviceDate &&
                  log.scheduledStartTime === row.scheduledStartTime
                );
                
                if (!duplicate) {
                  await storage.createTimeLog({
                    staffId,
                    clientId: client.id,
                    date: row.serviceDate,
                    hours: row.totalServiceHours || 0,
                    serviceType: row.serviceType || 'personal-care',
                    scheduledStartTime: row.scheduledStartTime,
                    scheduledEndTime: row.scheduledEndTime,
                    notes: `Imported from Excel - ${row.serviceCategory || ''}`
                  });
                  serviceLogs++;
                }
              }
            }
          }
        }
      }
      
      res.json({ 
        success: true, 
        clientsAssigned,
        serviceLogs,
        message: `Synced ${clientsAssigned} client assignments and ${serviceLogs} service logs`
      });
    } catch (error: any) {
      console.error("Error syncing staff data:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Mileage tracking endpoints
  app.get("/api/mileage-logs", isAuthenticated, async (req, res) => {
    try {
      const { staffId, status } = req.query;
      const logs = await storage.getMileageLogs(
        staffId as string | undefined,
        status as string | undefined
      );
      
      // Add staff and client names
      const logsWithNames = await Promise.all(logs.map(async (log) => {
        const staff = await storage.getStaffMember(log.staffId);
        const client = log.clientId ? await storage.getClient(log.clientId) : null;
        return {
          ...log,
          staffName: staff ? `${staff.firstName} ${staff.lastName}` : undefined,
          clientName: client ? `${client.firstName} ${client.lastName}` : undefined
        };
      }));
      
      res.json(logsWithNames);
    } catch (error: any) {
      console.error("Error fetching mileage logs:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/mileage-logs/:id", isAuthenticated, async (req, res) => {
    try {
      const log = await storage.getMileageLog(req.params.id);
      if (!log) {
        return res.status(404).json({ message: "Mileage log not found" });
      }
      res.json(log);
    } catch (error: any) {
      console.error("Error fetching mileage log:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/mileage-logs", isAuthenticated, async (req, res) => {
    try {
      // Clean up clientId - convert empty string to null
      const cleanedData = {
        ...req.body,
        clientId: req.body.clientId && req.body.clientId !== '' ? req.body.clientId : null,
        date: new Date(req.body.date).toISOString()
      };
      
      const validatedData = insertMileageLogSchema.parse(cleanedData);
      const log = await storage.createMileageLog(validatedData);
      res.status(201).json(log);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating mileage log:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/mileage-logs/:id", isAuthenticated, async (req, res) => {
    try {
      const log = await storage.updateMileageLog(req.params.id, req.body);
      res.json(log);
    } catch (error: any) {
      console.error("Error updating mileage log:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/mileage-logs/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteMileageLog(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting mileage log:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/mileage-logs/:id/approve", isAuthenticated, async (req, res) => {
    try {
      const log = await storage.approveMileageLog(req.params.id, req.user?.id || '');
      res.json(log);
    } catch (error: any) {
      console.error("Error approving mileage log:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/mileage-logs/:id/reject", isAuthenticated, async (req, res) => {
    try {
      const log = await storage.rejectMileageLog(req.params.id);
      res.json(log);
    } catch (error: any) {
      console.error("Error rejecting mileage log:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/mileage-logs/bulk-approve", isAuthenticated, async (req, res) => {
    try {
      const { logIds } = req.body;
      const result = await storage.bulkApproveMileageLogs(logIds, req.user?.id || '');
      res.json(result);
    } catch (error: any) {
      console.error("Error bulk approving mileage logs:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Mileage dispute endpoints
  app.get("/api/mileage-disputes", isAuthenticated, async (req, res) => {
    try {
      const { mileageLogId, status } = req.query;
      const disputes = await storage.getMileageDisputes(
        mileageLogId as string | undefined,
        status as string | undefined
      );
      res.json(disputes);
    } catch (error: any) {
      console.error("Error fetching mileage disputes:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/mileage-disputes", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertMileageDisputeSchema.parse({
        ...req.body,
        raisedBy: req.user?.id || ''
      });
      const dispute = await storage.createMileageDispute(validatedData);
      res.status(201).json(dispute);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating mileage dispute:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/mileage-disputes/:id", isAuthenticated, async (req, res) => {
    try {
      const dispute = await storage.updateMileageDispute(req.params.id, req.body);
      res.json(dispute);
    } catch (error: any) {
      console.error("Error updating mileage dispute:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/mileage-disputes/:id/resolve", isAuthenticated, async (req, res) => {
    try {
      const { resolution } = req.body;
      const dispute = await storage.resolveMileageDispute(
        req.params.id,
        resolution,
        req.user?.id || ''
      );
      res.json(dispute);
    } catch (error: any) {
      console.error("Error resolving mileage dispute:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // GDPR Compliance API Routes

  // User consent management routes
  app.get("/api/gdpr/consents/:userId", isAuthenticated, async (req, res) => {
    try {
      const consents = await storage.getUserConsents(req.params.userId);
      res.json(consents);
    } catch (error: any) {
      console.error("Error fetching user consents:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/gdpr/consents/:userId/:consentType", isAuthenticated, async (req, res) => {
    try {
      const consent = await storage.getUserConsentByType(req.params.userId, req.params.consentType);
      res.json(consent);
    } catch (error: any) {
      console.error("Error fetching user consent by type:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/gdpr/consents", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertUserConsentSchema.parse(req.body);
      const consent = await storage.createUserConsent(validatedData);
      
      // Log the consent action
      await storage.logDataAccess({
        userId: validatedData.userId,
        accessedBy: req.user?.id || '',
        entityType: 'user_consent',
        entityId: consent.id,
        action: 'create',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { consentType: validatedData.consentType, consentGiven: validatedData.consentGiven }
      });
      
      res.status(201).json(consent);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating user consent:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/gdpr/consents/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertUserConsentSchema.partial().parse(req.body);
      const consent = await storage.updateUserConsent(req.params.id, validatedData);
      
      // Log the update action
      await storage.logDataAccess({
        userId: consent.userId,
        accessedBy: req.user?.id || '',
        entityType: 'user_consent',
        entityId: consent.id,
        action: 'update',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: validatedData
      });
      
      res.json(consent);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating user consent:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/gdpr/consents/:id/revoke", isAuthenticated, async (req, res) => {
    try {
      const { revokedDate } = req.body;
      const consent = await storage.revokeUserConsent(
        req.params.id, 
        revokedDate ? new Date(revokedDate) : undefined
      );
      
      // Log the revocation action
      await storage.logDataAccess({
        userId: consent.userId,
        accessedBy: req.user?.id || '',
        entityType: 'user_consent',
        entityId: consent.id,
        action: 'revoke',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { revokedDate: consent.revokedDate }
      });
      
      res.json(consent);
    } catch (error: any) {
      console.error("Error revoking user consent:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Data access logging routes
  app.get("/api/gdpr/access-logs", isAuthenticated, requireResourcePermission('reports', 'read'), async (req, res) => {
    try {
      const { userId, entityType, action } = req.query;
      const logs = await storage.getDataAccessLogs(
        userId as string | undefined,
        entityType as string | undefined,
        action as string | undefined
      );
      res.json(logs);
    } catch (error: any) {
      console.error("Error fetching data access logs:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/gdpr/access-logs/:userId", isAuthenticated, async (req, res) => {
    try {
      // Users can only access their own logs unless they're admin/manager
      if (req.user?.id !== req.params.userId && !['admin', 'manager'].includes(req.user?.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { startDate, endDate } = req.query;
      const logs = await storage.getUserDataAccessLogs(
        req.params.userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(logs);
    } catch (error: any) {
      console.error("Error fetching user access logs:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/gdpr/access-logs", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertDataAccessLogSchema.parse(req.body);
      const log = await storage.logDataAccess(validatedData);
      res.status(201).json(log);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating data access log:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Data export request routes
  app.get("/api/gdpr/export-requests", isAuthenticated, async (req, res) => {
    try {
      const { userId, status } = req.query;
      
      // Regular users can only see their own requests
      const actualUserId = req.user?.role === 'admin' || req.user?.role === 'manager' 
        ? userId as string | undefined
        : req.user?.id;
      
      const requests = await storage.getDataExportRequests(actualUserId, status as string | undefined);
      res.json(requests);
    } catch (error: any) {
      console.error("Error fetching data export requests:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/gdpr/export-requests/:id", isAuthenticated, async (req, res) => {
    try {
      const request = await storage.getDataExportRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Export request not found" });
      }
      
      // Users can only access their own requests unless they're admin/manager
      if (req.user?.id !== request.userId && !['admin', 'manager'].includes(req.user?.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(request);
    } catch (error: any) {
      console.error("Error fetching data export request:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/gdpr/export-requests", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertDataExportRequestSchema.parse({
        ...req.body,
        requestedBy: req.user?.id
      });
      
      const request = await storage.createDataExportRequest(validatedData);
      
      // Log the export request
      await storage.logDataAccess({
        userId: validatedData.userId,
        accessedBy: req.user?.id || '',
        entityType: 'data_export_request',
        entityId: request.id,
        action: 'create',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { 
          exportFormat: validatedData.exportFormat,
          includePersonalData: validatedData.includePersonalData,
          includeServiceData: validatedData.includeServiceData,
          includeFinancialData: validatedData.includeFinancialData
        }
      });
      
      res.status(201).json(request);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating data export request:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/gdpr/export-requests/:id", isAuthenticated, requireResourcePermission('system-settings', 'update'), async (req, res) => {
    try {
      const validatedData = insertDataExportRequestSchema.partial().parse(req.body);
      const request = await storage.updateDataExportRequest(req.params.id, validatedData);
      
      // Log the update
      await storage.logDataAccess({
        userId: request.userId,
        accessedBy: req.user?.id || '',
        entityType: 'data_export_request',
        entityId: request.id,
        action: 'update',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: validatedData
      });
      
      res.json(request);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating data export request:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/gdpr/export-requests/:id/download", isAuthenticated, async (req, res) => {
    try {
      console.log(`Download request for ID: ${req.params.id} by user: ${req.user?.id}`);
      
      const request = await storage.getDataExportRequest(req.params.id);
      if (!request) {
        console.log(`Export request ${req.params.id} not found`);
        return res.status(404).json({ message: "Export request not found" });
      }
      
      console.log(`Request found - Status: ${request.status}, User ID: ${request.userId}`);
      
      // Users can only download their own data unless they're admin/manager
      if (req.user?.id !== request.userId && !['admin', 'manager'].includes(req.user?.role)) {
        console.log(`Access denied - User: ${req.user?.id}, Request User: ${request.userId}, Role: ${req.user?.role}`);
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (request.status !== 'completed') {
        console.log(`Export not ready - Status: ${request.status}`);
        return res.status(400).json({ message: "Export not ready for download" });
      }
      
      console.log(`Generating user data for userId: ${request.userId}`);
      
      // Generate user data
      const userData = await storage.getUserDataForExport(
        request.userId,
        request.includePersonalData || false,
        request.includeServiceData || false,
        request.includeFinancialData || false
      );
      
      console.log(`User data generated successfully, formatting as: ${request.exportFormat}`);
      
      // Format data based on requested export format
      let responseData: any;
      let contentType: string;
      let fileExtension: string;
      
      switch (request.exportFormat) {
        case 'csv':
          responseData = await storage.formatUserDataAsCsv(userData);
          contentType = 'text/csv';
          fileExtension = 'csv';
          break;
        case 'pdf':
          responseData = await storage.formatUserDataAsPdf(userData);
          contentType = 'application/pdf';
          fileExtension = 'pdf';
          break;
        case 'json':
        default:
          responseData = userData;
          contentType = 'application/json';
          fileExtension = 'json';
          break;
      }
      
      // Log the download
      await storage.logDataAccess({
        userId: request.userId,
        accessedBy: req.user?.id || '',
        entityType: 'data_export',
        entityId: request.id,
        action: 'download',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { exportFormat: request.exportFormat }
      });
      
      console.log(`Data export download successful for request: ${req.params.id} in ${request.exportFormat} format`);
      
      // Return appropriate format
      if (request.exportFormat === 'json') {
        res.json(responseData);
      } else {
        res.set({
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="user-data-export-${req.params.id}.${fileExtension}"`
        });
        res.send(responseData);
      }
    } catch (error: any) {
      console.error("Error downloading data export:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Data retention policy routes
  app.get("/api/gdpr/retention-policies", isAuthenticated, requireResourcePermission('reports', 'read'), async (req, res) => {
    try {
      const policies = await storage.getDataRetentionPolicies();
      res.json(policies);
    } catch (error: any) {
      console.error("Error fetching retention policies:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/gdpr/retention-policies/:entityType", isAuthenticated, requireResourcePermission('reports', 'read'), async (req, res) => {
    try {
      const policy = await storage.getDataRetentionPolicy(req.params.entityType);
      res.json(policy);
    } catch (error: any) {
      console.error("Error fetching retention policy:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/gdpr/retention-policies", isAuthenticated, requireResourcePermission('system-settings', 'create'), async (req, res) => {
    try {
      const validatedData = insertDataRetentionPolicySchema.parse(req.body);
      const policy = await storage.createDataRetentionPolicy(validatedData);
      
      // Log the policy creation
      await storage.logDataAccess({
        userId: req.user?.id || '',
        accessedBy: req.user?.id || '',
        entityType: 'retention_policy',
        entityId: policy.id,
        action: 'create',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { entityType: validatedData.entityType, retentionPeriodDays: validatedData.retentionPeriodDays }
      });
      
      res.status(201).json(policy);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating retention policy:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/gdpr/retention-policies/:id", isAuthenticated, requireResourcePermission('system-settings', 'update'), async (req, res) => {
    try {
      const validatedData = insertDataRetentionPolicySchema.partial().parse(req.body);
      const policy = await storage.updateDataRetentionPolicy(req.params.id, validatedData);
      
      // Log the policy update
      await storage.logDataAccess({
        userId: req.user?.id || '',
        accessedBy: req.user?.id || '',
        entityType: 'retention_policy',
        entityId: policy.id,
        action: 'update',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: validatedData
      });
      
      res.json(policy);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating retention policy:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/gdpr/expired-data", isAuthenticated, requireResourcePermission('system-settings', 'read'), async (req, res) => {
    try {
      const expiredData = await storage.getExpiredDataForDeletion();
      res.json(expiredData);
    } catch (error: any) {
      console.error("Error fetching expired data:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Data deletion request routes
  app.get("/api/gdpr/deletion-requests", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      
      // Regular users can only see their own requests
      let requests;
      if (req.user?.role === 'admin' || req.user?.role === 'manager') {
        requests = await storage.getDataDeletionRequests(status as string | undefined);
      } else {
        // Filter by user ID for regular users
        const allRequests = await storage.getDataDeletionRequests(status as string | undefined);
        requests = allRequests.filter(r => r.userId === req.user?.id);
      }
      
      res.json(requests);
    } catch (error: any) {
      console.error("Error fetching deletion requests:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/gdpr/deletion-requests/:id", isAuthenticated, async (req, res) => {
    try {
      const request = await storage.getDataDeletionRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Deletion request not found" });
      }
      
      // Users can only access their own requests unless they're admin/manager
      if (req.user?.id !== request.userId && !['admin', 'manager'].includes(req.user?.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(request);
    } catch (error: any) {
      console.error("Error fetching deletion request:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/gdpr/deletion-requests", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertDataDeletionRequestSchema.parse({
        ...req.body,
        requestedBy: req.user?.id
      });
      
      const request = await storage.createDataDeletionRequest(validatedData);
      
      // Log the deletion request
      await storage.logDataAccess({
        userId: validatedData.userId,
        accessedBy: req.user?.id || '',
        entityType: 'data_deletion_request',
        entityId: request.id,
        action: 'create',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { reason: validatedData.reason }
      });
      
      res.status(201).json(request);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating deletion request:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/gdpr/deletion-requests/:id", isAuthenticated, requireResourcePermission('system-settings', 'update'), async (req, res) => {
    try {
      const validatedData = insertDataDeletionRequestSchema.partial().parse(req.body);
      const request = await storage.updateDataDeletionRequest(req.params.id, validatedData);
      
      // Log the update
      await storage.logDataAccess({
        userId: request.userId,
        accessedBy: req.user?.id || '',
        entityType: 'data_deletion_request',
        entityId: request.id,
        action: 'update',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: validatedData
      });
      
      res.json(request);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating deletion request:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/gdpr/deletion-requests/:id/approve", isAuthenticated, requireResourcePermission('approvals', 'create'), async (req, res) => {
    try {
      const request = await storage.updateDataDeletionRequest(req.params.id, {
        status: 'approved',
        approvedBy: req.user?.id,
        approvedAt: new Date()
      });
      
      // Log the approval
      await storage.logDataAccess({
        userId: request.userId,
        accessedBy: req.user?.id || '',
        entityType: 'data_deletion_request',
        entityId: request.id,
        action: 'approve',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.json(request);
    } catch (error: any) {
      console.error("Error approving deletion request:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/gdpr/deletion-requests/:id/execute", isAuthenticated, requireResourcePermission('system-settings', 'delete'), async (req, res) => {
    try {
      const result = await storage.executeDataDeletion(req.params.id);
      
      // Log the execution
      await storage.logDataAccess({
        userId: req.user?.id || '',
        accessedBy: req.user?.id || '',
        entityType: 'data_deletion_execution',
        entityId: req.params.id,
        action: 'execute',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: result
      });
      
      res.json(result);
    } catch (error: any) {
      console.error("Error executing data deletion:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Data breach incident routes
  app.get("/api/gdpr/breach-incidents", isAuthenticated, requireResourcePermission('reports', 'read'), async (req, res) => {
    try {
      const { status } = req.query;
      const incidents = await storage.getDataBreachIncidents(status as string | undefined);
      res.json(incidents);
    } catch (error: any) {
      console.error("Error fetching breach incidents:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/gdpr/breach-incidents/:id", isAuthenticated, requireResourcePermission('reports', 'read'), async (req, res) => {
    try {
      const incident = await storage.getDataBreachIncident(req.params.id);
      if (!incident) {
        return res.status(404).json({ message: "Breach incident not found" });
      }
      res.json(incident);
    } catch (error: any) {
      console.error("Error fetching breach incident:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/gdpr/breach-incidents", isAuthenticated, requireResourcePermission('system-settings', 'create'), async (req, res) => {
    try {
      const validatedData = insertDataBreachIncidentSchema.parse({
        ...req.body,
        createdBy: req.user?.id
      });
      
      const incident = await storage.createDataBreachIncident(validatedData);
      
      // Log the incident creation
      await storage.logDataAccess({
        userId: req.user?.id || '',
        accessedBy: req.user?.id || '',
        entityType: 'data_breach_incident',
        entityId: incident.id,
        action: 'create',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { title: validatedData.title, severity: validatedData.severity }
      });
      
      res.status(201).json(incident);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating breach incident:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/gdpr/breach-incidents/:id", isAuthenticated, requireResourcePermission('system-settings', 'update'), async (req, res) => {
    try {
      const validatedData = insertDataBreachIncidentSchema.partial().parse(req.body);
      const incident = await storage.updateDataBreachIncident(req.params.id, validatedData);
      
      // Log the update
      await storage.logDataAccess({
        userId: req.user?.id || '',
        accessedBy: req.user?.id || '',
        entityType: 'data_breach_incident',
        entityId: incident.id,
        action: 'update',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: validatedData
      });
      
      res.json(incident);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating breach incident:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/gdpr/breach-incidents/:id/report", isAuthenticated, requireResourcePermission('system-settings', 'create'), async (req, res) => {
    try {
      const incident = await storage.markBreachReported(req.params.id);
      
      // Log the reporting
      await storage.logDataAccess({
        userId: req.user?.id || '',
        accessedBy: req.user?.id || '',
        entityType: 'data_breach_incident',
        entityId: incident.id,
        action: 'report',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.json(incident);
    } catch (error: any) {
      console.error("Error reporting breach incident:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/gdpr/breach-incidents/:id/notify-users", isAuthenticated, requireResourcePermission('system-settings', 'create'), async (req, res) => {
    try {
      const incident = await storage.markUsersNotified(req.params.id);
      
      // Log the notification
      await storage.logDataAccess({
        userId: req.user?.id || '',
        accessedBy: req.user?.id || '',
        entityType: 'data_breach_incident',
        entityId: incident.id,
        action: 'notify_users',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.json(incident);
    } catch (error: any) {
      console.error("Error notifying users of breach incident:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Document Management Routes (Phase 2 GDPR)
  
  // Get all documents with optional filters
  app.get("/api/documents", isAuthenticated, requireResourcePermission('documents', 'read'), async (req, res) => {
    try {
      const { category, entityType, entityId, isDeleted } = req.query;
      
      const filters: any = {};
      if (category) filters.category = category as string;
      if (entityType) filters.entityType = entityType as string;
      if (entityId) filters.entityId = entityId as string;
      if (isDeleted !== undefined) filters.isDeleted = isDeleted === 'true';
      
      const documentsRaw = await storage.getDocuments(filters);
      
      // Transform field names from snake_case to camelCase for frontend compatibility
      const documents = documentsRaw.map((doc: any) => ({
        id: doc.id,
        fileName: doc.file_name,
        originalName: doc.original_name,
        mimeType: doc.mime_type,
        fileSize: doc.file_size,
        storagePath: doc.storage_path,
        category: doc.category,
        entityType: doc.entity_type,
        entityId: doc.entity_id,
        isEncrypted: doc.is_encrypted,
        encryptionKeyId: doc.encryption_key_id,
        accessLevel: doc.access_level,
        tags: doc.tags,
        description: doc.description,
        version: doc.version,
        parentDocumentId: doc.parent_document_id,
        isLatestVersion: doc.is_latest_version,
        uploadedBy: doc.uploaded_by,
        lastAccessedAt: doc.last_accessed_at,
        lastAccessedBy: doc.last_accessed_by,
        retentionPolicyId: doc.retention_policy_id,
        scheduledDeletionAt: doc.scheduled_deletion_at,
        isDeleted: doc.is_deleted,
        deletedAt: doc.deleted_at,
        deletedBy: doc.deleted_by,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
      }));
      
      // Log data access for GDPR compliance
      await storage.logDataAccess({
        userId: req.user?.id || '',
        accessedBy: req.user?.id || '',
        entityType: "documents",
        action: "list",
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: filters
      });
      
      res.json(documents);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get specific document by ID (metadata)
  app.get("/api/documents/:id", isAuthenticated, requireResourcePermission('documents', 'read'), async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Log document access for GDPR audit trail
      await storage.createDocumentAccessLog({
        documentId: document.id,
        userId: req.user?.id || '',
        action: 'view',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      await storage.logDataAccess({
        userId: req.user?.id || '',
        accessedBy: req.user?.id || '',
        entityType: "documents",
        action: "view",
        entityId: document.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.json(document);
    } catch (error: any) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Serve document file content for viewing
  app.get("/api/documents/:id/view", isAuthenticated, requireResourcePermission('documents', 'read'), async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Log document view for GDPR audit trail
      await storage.createDocumentAccessLog({
        documentId: document.id,
        userId: req.user?.id || '',
        action: 'view',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      await storage.logDataAccess({
        userId: req.user?.id || '',
        accessedBy: req.user?.id || '',
        entityType: "documents",
        action: "view",
        entityId: document.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      // Set appropriate headers for HTML viewer
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);
      // Prevent caching to avoid Content-Type conflicts
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // For demonstration, return a simple HTML viewer
      // In a real implementation, you would stream the actual file content
      if (document.mimeType === 'application/pdf') {
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${document.originalName}</title>
            <style>
              body { margin: 0; font-family: Arial, sans-serif; }
              .viewer { height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f5; }
              .message { text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            </style>
          </head>
          <body>
            <div class="viewer">
              <div class="message">
                <h2>📄 ${document.originalName}</h2>
                <p>PDF Document (${(document.fileSize / 1024).toFixed(1)} KB)</p>
                <p>Uploaded: ${new Date(document.createdAt).toLocaleDateString()}</p>
                <p><strong>Encrypted:</strong> ${document.isEncrypted ? '🔒 Yes' : '❌ No'}</p>
                <p><strong>Access Level:</strong> ${document.accessLevel}</p>
                <br>
                <p><em>In a production system, the actual PDF content would be displayed here.</em></p>
              </div>
            </div>
          </body>
          </html>
        `);
      } else if (document.mimeType.startsWith('image/')) {
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${document.originalName}</title>
            <style>
              body { margin: 0; font-family: Arial, sans-serif; background: #000; }
              .viewer { height: 100vh; display: flex; align-items: center; justify-content: center; }
              .message { text-align: center; padding: 2rem; background: white; border-radius: 8px; color: #333; }
            </style>
          </head>
          <body>
            <div class="viewer">
              <div class="message">
                <h2>🖼️ ${document.originalName}</h2>
                <p>Image File (${(document.fileSize / 1024).toFixed(1)} KB)</p>
                <p>Uploaded: ${new Date(document.createdAt).toLocaleDateString()}</p>
                <p><strong>Encrypted:</strong> ${document.isEncrypted ? '🔒 Yes' : '❌ No'}</p>
                <br>
                <p><em>In a production system, the actual image would be displayed here.</em></p>
              </div>
            </div>
          </body>
          </html>
        `);
      } else {
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${document.originalName}</title>
            <style>
              body { margin: 0; font-family: Arial, sans-serif; }
              .viewer { height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f5; }
              .message { text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            </style>
          </head>
          <body>
            <div class="viewer">
              <div class="message">
                <h2>📎 ${document.originalName}</h2>
                <p>File Type: ${document.mimeType}</p>
                <p>Size: ${(document.fileSize / 1024).toFixed(1)} KB</p>
                <p>Uploaded: ${new Date(document.createdAt).toLocaleDateString()}</p>
                <p><strong>Encrypted:</strong> ${document.isEncrypted ? '🔒 Yes' : '❌ No'}</p>
                <p><strong>Access Level:</strong> ${document.accessLevel}</p>
                <br>
                <p><em>Preview not available for this file type. Use download to access the file.</em></p>
              </div>
            </div>
          </body>
          </html>
        `);
      }
    } catch (error: any) {
      console.error("Error viewing document:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Create new document
  app.post("/api/documents", isAuthenticated, requireResourcePermission('documents', 'create'), async (req, res) => {
    try {
      const validatedData = insertDocumentSchema.parse({
        ...req.body,
        uploadedBy: req.user?.id || ''
      });
      
      const document = await storage.createDocument(validatedData);
      
      // Log document creation for GDPR audit trail
      await storage.logDataAccess({
        userId: req.user?.id || '',
        accessedBy: req.user?.id || '',
        entityType: "documents",
        action: "create",
        entityId: document.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { fileName: document.fileName, category: document.category }
      });
      
      res.json(document);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating document:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Update document
  app.patch("/api/documents/:id", isAuthenticated, requireResourcePermission('documents', 'update'), async (req, res) => {
    try {
      const validatedData = insertDocumentSchema.partial().parse(req.body);
      const document = await storage.updateDocument(req.params.id, validatedData);
      
      // Log document modification for GDPR audit trail
      await storage.createDocumentAccessLog({
        documentId: document.id,
        userId: req.user?.id || '',
        action: 'modify',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { changes: validatedData }
      });
      
      await storage.logDataAccess({
        userId: req.user?.id || '',
        accessedBy: req.user?.id || '',
        entityType: "documents",
        action: "update",
        entityId: document.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: validatedData
      });
      
      res.json(document);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating document:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Download document file
  app.get("/api/documents/:id/download", isAuthenticated, requireResourcePermission('documents', 'read'), async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Log document download for GDPR audit trail
      await storage.createDocumentAccessLog({
        documentId: document.id,
        userId: req.user?.id || '',
        action: 'download',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      await storage.logDataAccess({
        userId: req.user?.id || '',
        accessedBy: req.user?.id || '',
        entityType: "documents",
        action: "download",
        entityId: document.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      // Set download headers
      res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Length', document.fileSize);
      
      // For demonstration, return document metadata with download info
      // In a real implementation, you would stream the file content from storage
      res.json({
        message: "Download initiated",
        document: {
          id: document.id,
          originalName: document.originalName,
          mimeType: document.mimeType,
          fileSize: document.fileSize,
          downloadUrl: document.storagePath
        }
      });
    } catch (error: any) {
      console.error("Error downloading document:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Delete document (GDPR compliant soft delete)
  app.delete("/api/documents/:id", isAuthenticated, requireResourcePermission('documents', 'delete'), async (req, res) => {
    try {
      await storage.deleteDocument(req.params.id, req.user?.id || '');
      
      // Log document deletion for GDPR audit trail
      await storage.logDataAccess({
        userId: req.user?.id || '',
        accessedBy: req.user?.id || '',
        entityType: "documents",
        action: "delete",
        entityId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { reason: "Manual deletion" }
      });
      
      res.json({ message: "Document deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Document Access Logs Routes
  app.get("/api/document-access-logs", isAuthenticated, requireResourcePermission('documents', 'read'), async (req, res) => {
    try {
      const { documentId } = req.query;
      const logs = await storage.getDocumentAccessLogs(documentId as string);
      
      // Log audit trail access
      await storage.logDataAccess({
        userId: req.user?.id || '',
        accessedBy: req.user?.id || '',
        entityType: "document_access_logs",
        action: "list",
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.json(logs);
    } catch (error: any) {
      console.error("Error fetching document access logs:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Document Retention Schedules Routes
  app.get("/api/document-retention-schedules", isAuthenticated, requireResourcePermission('documents', 'read'), async (req, res) => {
    try {
      const { status } = req.query;
      const schedules = await storage.getDocumentRetentionSchedules(status as string);
      
      // Log retention schedule access
      await storage.logDataAccess({
        userId: req.user?.id || '',
        accessedBy: req.user?.id || '',
        entityType: "document_retention_schedules",
        action: "list",
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.json(schedules);
    } catch (error: any) {
      console.error("Error fetching document retention schedules:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Execute document retention (GDPR compliant deletion)
  app.post("/api/document-retention-schedules/:id/execute", isAuthenticated, requireResourcePermission('documents', 'delete'), async (req, res) => {
    try {
      await storage.executeDocumentRetention(req.params.id, req.user?.id || '');
      
      // Log retention execution
      await storage.logDataAccess({
        userId: req.user?.id || '',
        accessedBy: req.user?.id || '',
        entityType: "document_retention_schedules",
        action: "execute",
        entityId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { executedBy: req.user?.id || '' }
      });
      
      res.json({ message: "Document retention executed successfully" });
    } catch (error: any) {
      console.error("Error executing document retention:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Payment Records Routes
  app.get("/api/payment-records", isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const { startDate, endDate, clientId, status, statuses, staffId, serviceType, paymentDue } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }

      console.log('Payment records API called with:', { 
        startDate, 
        endDate, 
        clientId, 
        status, 
        statuses,
        staffId, 
        serviceType, 
        paymentDue 
      });
      
      const paymentRecords = await storage.getPaymentRecords({
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
        clientId: clientId as string | undefined,
        statuses: statuses ? (statuses as string).split(',') : (status ? [status as string] : undefined),
        staffId: staffId as string | undefined,
        serviceType: serviceType as string | undefined,
        paymentDue: paymentDue as string | undefined
      });

      console.log('Payment records result:', paymentRecords.records.length, 'records found');
      
      res.json(paymentRecords);
    } catch (error: any) {
      console.error("Error fetching payment records:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Generate Payment Records PDF
  app.post("/api/payment-records/pdf", isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const { startDate, endDate, clientId, records, summary } = req.body;
      
      const pdf = await storage.generatePaymentRecordsPDF({
        startDate,
        endDate,
        clientId,
        records,
        summary
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="payment-records-${startDate}-to-${endDate}.pdf"`);
      res.send(pdf);
    } catch (error: any) {
      console.error("Error generating payment records PDF:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Calendar appointments routes
  app.get('/api/calendar/appointments', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const appointments = await storage.getCalendarAppointments();
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching calendar appointments:", error);
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.get('/api/calendar/appointments/:id', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const appointment = await storage.getCalendarAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ message: "Failed to fetch appointment" });
    }
  });

  app.post('/api/calendar/appointments', isAuthenticated, requireCrudPermission('create'), async (req, res) => {
    try {
      const validatedData = insertCalendarAppointmentSchema.parse({
        ...req.body,
        createdBy: req.user.id
      });
      
      const appointment = await storage.createCalendarAppointment(validatedData);
      
      // Send appointment creation notification
      await notificationService.sendAppointmentNotification(appointment, 'appointment_created');
      
      // Schedule automatic reminders
      await notificationService.scheduleAppointmentReminders(appointment);
      
      res.status(201).json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

  app.put('/api/calendar/appointments/:id', isAuthenticated, requireCrudPermission('update'), async (req, res) => {
    try {
      const validatedData = insertCalendarAppointmentSchema.partial().parse(req.body);
      const appointment = await storage.updateCalendarAppointment(req.params.id, validatedData);
      
      // Send appointment update notification
      await notificationService.sendAppointmentNotification(appointment, 'appointment_updated');
      
      res.json(appointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ message: "Failed to update appointment" });
    }
  });

  app.delete('/api/calendar/appointments/:id', isAuthenticated, requireCrudPermission('delete'), async (req, res) => {
    try {
      await storage.deleteCalendarAppointment(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting appointment:", error);
      res.status(500).json({ message: "Failed to delete appointment" });
    }
  });

  // Analytics and Reports routes (Phase 4)
  app.get('/api/analytics/data', isAuthenticated, requireCrudPermission('read'), getAnalyticsData);
  app.post('/api/reports/generate', isAuthenticated, requireCrudPermission('create'), generateReport);
  app.get('/api/reports', isAuthenticated, requireCrudPermission('read'), getGeneratedReports);

  // Automation and Workflow routes (Phase 5)
  app.get('/api/automation/workflows', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const workflows = workflowEngine.getActiveWorkflows();
      res.json(workflows);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      res.status(500).json({ message: "Failed to fetch workflows" });
    }
  });

  app.post('/api/automation/workflows', isAuthenticated, requireCrudPermission('create'), async (req, res) => {
    try {
      const workflow = await workflowEngine.registerWorkflow({
        ...req.body,
        createdBy: req.user?.id || 'system'
      });
      res.status(201).json(workflow);
    } catch (error) {
      console.error("Error creating workflow:", error);
      res.status(500).json({ message: "Failed to create workflow" });
    }
  });

  app.put('/api/automation/workflows/:id', isAuthenticated, requireCrudPermission('update'), async (req, res) => {
    try {
      const workflow = await workflowEngine.updateWorkflow(req.params.id, req.body);
      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }
      res.json(workflow);
    } catch (error) {
      console.error("Error updating workflow:", error);
      res.status(500).json({ message: "Failed to update workflow" });
    }
  });

  app.delete('/api/automation/workflows/:id', isAuthenticated, requireCrudPermission('delete'), async (req, res) => {
    try {
      const success = await workflowEngine.deleteWorkflow(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Workflow not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting workflow:", error);
      res.status(500).json({ message: "Failed to delete workflow" });
    }
  });

  app.get('/api/automation/metrics', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      // Mock metrics - in production, calculate from actual execution data
      const metrics = {
        totalWorkflows: workflowEngine.getActiveWorkflows().length,
        activeWorkflows: workflowEngine.getActiveWorkflows().filter(w => w.isActive).length,
        totalExecutions: 446,
        successRate: 97.3,
        automationSavings: {
          timeHours: 68.5,
          tasksAutomated: 446,
          errorReduction: 23.1
        },
        recentExecutions: workflowEngine.getExecutionHistory().slice(-10)
      };
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching automation metrics:", error);
      res.status(500).json({ message: "Failed to fetch automation metrics" });
    }
  });

  app.post('/api/automation/optimize-schedule', isAuthenticated, requireCrudPermission('create'), async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      const result = await schedulingAutomation.generateOptimizedSchedule(
        new Date(startDate),
        new Date(endDate)
      );
      res.json(result);
    } catch (error) {
      console.error("Error optimizing schedule:", error);
      res.status(500).json({ message: "Failed to optimize schedule" });
    }
  });

  app.get('/api/automation/scheduling-metrics', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      // Mock scheduling metrics - in production, calculate from actual data
      const metrics = {
        scheduledAppointments: 156,
        autoAssignments: 89,
        conflictsResolved: 12,
        optimizationScore: 8.7,
        travelTimeSaved: 45.2
      };
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching scheduling metrics:", error);
      res.status(500).json({ message: "Failed to fetch scheduling metrics" });
    }
  });

  app.post('/api/automation/auto-assign-staff', isAuthenticated, requireCrudPermission('update'), async (req, res) => {
    try {
      const { appointmentIds } = req.body;
      const result = await schedulingAutomation.autoAssignStaff(appointmentIds);
      res.json(result);
    } catch (error) {
      console.error("Error auto-assigning staff:", error);
      res.status(500).json({ message: "Failed to auto-assign staff" });
    }
  });

  app.post('/api/automation/resolve-conflicts', isAuthenticated, requireCrudPermission('update'), async (req, res) => {
    try {
      const { dateRange } = req.body;
      const result = await schedulingAutomation.resolveSchedulingConflicts(dateRange);
      res.json(result);
    } catch (error) {
      console.error("Error resolving conflicts:", error);
      res.status(500).json({ message: "Failed to resolve scheduling conflicts" });
    }
  });

  app.post('/api/automation/recurring-appointments', isAuthenticated, requireCrudPermission('create'), async (req, res) => {
    try {
      const { clientId, serviceType, pattern, dateRange } = req.body;
      const appointmentIds = await schedulingAutomation.generateRecurringAppointments(
        clientId,
        serviceType,
        pattern,
        dateRange
      );
      res.json({ appointmentIds, count: appointmentIds.length });
    } catch (error) {
      console.error("Error generating recurring appointments:", error);
      res.status(500).json({ message: "Failed to generate recurring appointments" });
    }
  });

  app.get('/api/automation/workflow-templates', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      res.json(Object.values(healthcareWorkflowTemplates));
    } catch (error) {
      console.error("Error fetching workflow templates:", error);
      res.status(500).json({ message: "Failed to fetch workflow templates" });
    }
  });

  app.post('/api/automation/initialize-templates', isAuthenticated, requireCrudPermission('create'), async (req, res) => {
    try {
      const initializedWorkflows = [];
      
      for (const [key, template] of Object.entries(healthcareWorkflowTemplates)) {
        const workflow = await workflowEngine.registerWorkflow({
          ...template,
          createdBy: req.user?.id || 'system'
        });
        initializedWorkflows.push(workflow);
      }
      
      res.json({ 
        message: "Healthcare workflow templates initialized successfully",
        workflows: initializedWorkflows,
        count: initializedWorkflows.length
      });
    } catch (error) {
      console.error("Error initializing workflow templates:", error);
      res.status(500).json({ message: "Failed to initialize workflow templates" });
    }
  });

  // Compensation Report API Endpoint
  app.get('/api/compensation-report', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }

      // Fetch all staff with their rates
      const staff = await storage.getStaff();
      
      // Fetch existing compensation records for the period
      const existingCompensations = await storage.getStaffCompensationsByDateRange(
        new Date(startDate as string),
        new Date(endDate as string)
      );

      // Calculate compensation data for each staff member
      const compensationData = [];
      
      for (const staffMember of staff) {
        // Look for existing compensation record with robust date comparison
        const existingCompensation = existingCompensations.find(
          comp => {
            if (comp.staffId !== staffMember.id) return false;
            if (!comp.periodStart || !comp.periodEnd) return false;
            
            try {
              // Convert dates to comparable strings safely
              let startStr = String(comp.periodStart).split('T')[0];
              let endStr = String(comp.periodEnd).split('T')[0];
              
              return startStr === startDate && endStr === endDate;
            } catch (error) {
              console.error('Date comparison error for compensation:', comp.id, error);
              return false;
            }
          }
        );

        let weekdayHours = 0;
        let holidayHours = 0;
        let totalMileage = 0;

        if (existingCompensation) {
          // Use stored data from compensation record
          weekdayHours = parseFloat(existingCompensation.regularHours || '0');
          holidayHours = parseFloat(existingCompensation.holidayHours || '0');
          totalMileage = parseFloat(existingCompensation.totalMileage || '0');
        } else {
          // Calculate from time logs (fallback)
          const timeLogs = await storage.getTimeLogsByDateRange(
            new Date(startDate as string),
            new Date(endDate as string)
          );
          const staffLogs = timeLogs.filter(log => log.staffId === staffMember.id);

          for (const log of staffLogs) {
            const logDate = new Date(log.serviceDate);
            const isHolidayOrSunday = isItalianHolidayOrSunday(logDate);
            
            if (isHolidayOrSunday) {
              holidayHours += parseFloat(log.hours || '0');
            } else {
              weekdayHours += parseFloat(log.hours || '0');
            }
            
            totalMileage += parseFloat(log.mileage || '0');
          }
        }

        const weekdayRate = parseFloat(staffMember.weekdayRate || '8');
        const holidayRate = parseFloat(staffMember.holidayRate || '9');
        const mileageRate = parseFloat(staffMember.mileageRate || '0.5');

        const weekdayTotal = weekdayHours * weekdayRate;
        const holidayTotal = holidayHours * holidayRate;
        const mileageTotal = totalMileage * mileageRate;
        const total = weekdayTotal + holidayTotal + mileageTotal;

        // Create compensation record if it doesn't exist
        let compensationId = existingCompensation?.id;
        if (!existingCompensation) {
          const newCompensation = await storage.createStaffCompensation({
            staffId: staffMember.id,
            periodStart: new Date(startDate as string),
            periodEnd: new Date(endDate as string),
            regularHours: weekdayHours.toString(),
            holidayHours: holidayHours.toString(),
            totalMileage: totalMileage.toString(),
            baseCompensation: weekdayTotal.toString(),
            holidayCompensation: holidayTotal.toString(),
            mileageReimbursement: mileageTotal.toString(),
            totalCompensation: total.toString(),
            status: 'draft'
          });
          compensationId = newCompensation.id;
        }

        compensationData.push({
          id: compensationId, // Always use compensation ID
          compensationId: compensationId, // Always available now
          staffId: staffMember.id,
          lastName: staffMember.lastName,
          firstName: staffMember.firstName,
          weekdayRate,
          weekdayHours,
          weekdayTotal,
          holidayRate,
          holidayHours,
          holidayTotal,
          mileage: totalMileage,
          mileageRate,
          mileageTotal,
          total,
          periodStart: startDate,
          periodEnd: endDate
        });
      }

      // Sort by lastName, firstName
      compensationData.sort((a, b) => {
        const lastNameCompare = a.lastName.localeCompare(b.lastName);
        if (lastNameCompare !== 0) return lastNameCompare;
        return a.firstName.localeCompare(b.firstName);
      });

      res.json(compensationData);
    } catch (error) {
      console.error("Error generating compensation report:", error);
      res.status(500).json({ message: "Failed to generate compensation report" });
    }
  });

  // PDF Export Endpoint for Compensation Report
  app.post('/api/compensation-report/pdf', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      
      // Fetch fresh data from database
      const staffMembers = await storage.getStaffMembers();
      const timeLogs = await storage.getTimeLogsByDateRange(new Date(startDate), new Date(endDate));
      
      // Process compensation data
      const compensationData = [];
      for (const staff of staffMembers) {
        const staffLogs = timeLogs.filter(log => log.staffId === staff.id);
        
        // Include all staff, even with no logs
        
        let weekdayHours = 0;
        let holidayHours = 0;
        let totalMileage = 0;

        for (const log of staffLogs) {
          const logDate = new Date(log.serviceDate);
          const isHolidayOrSunday = isItalianHolidayOrSunday(logDate);
          
          if (isHolidayOrSunday) {
            holidayHours += parseFloat(log.hours || '0');
          } else {
            weekdayHours += parseFloat(log.hours || '0');
          }
          
          totalMileage += parseFloat(log.mileage || '0');
        }
        
        // Calculate totals with staff rates
        const weekdayRate = parseFloat(staff.weekdayHourlyRate || '8');
        const holidayRate = parseFloat(staff.holidayHourlyRate || '9');
        const mileageRate = parseFloat(staff.mileageRate || '0.5');
        
        const weekdayTotal = weekdayHours * weekdayRate;
        const holidayTotal = holidayHours * holidayRate;
        const mileageTotal = totalMileage * mileageRate;
        const total = weekdayTotal + holidayTotal + mileageTotal;
        
        compensationData.push({
          lastName: staff.lastName,
          firstName: staff.firstName,
          startDate: startDate,
          endDate: endDate,
          weekdayRate: weekdayRate,
          weekdayHours,
          weekdayTotal,
          holidayRate: holidayRate,
          holidayHours,
          holidayTotal,
          mileage: totalMileage,
          mileageRate: mileageRate,
          mileageTotal,
          total
        });
      }
      
      // Sort by lastName, firstName
      compensationData.sort((a, b) => {
        const lastNameCompare = a.lastName.localeCompare(b.lastName);
        if (lastNameCompare !== 0) return lastNameCompare;
        return a.firstName.localeCompare(b.firstName);
      });
      
      // Generate PDF
      const doc = new PDFDocument({ 
        margin: 30,
        size: 'A4',
        layout: 'landscape'
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="compensi_collaboratori_${startDate}_${endDate}.pdf"`);
      
      doc.pipe(res);
      
      // Title
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('Tabella Compensi Collaboratori - Staff Compensation Table', { align: 'center' });
      doc.moveDown(0.5);
      
      // Month and Year
      const monthYear = new Date(startDate).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
      const monthYearEn = new Date(startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      doc.fontSize(12);
      doc.text(`${monthYear.charAt(0).toUpperCase() + monthYear.slice(1)} - ${monthYearEn}`, { align: 'center' });
      doc.moveDown(1.5);
      
      // Table setup
      doc.fontSize(7);
      const margin = 30;
      const pageWidth = doc.page.width - margin * 2;
      let y = doc.y;
      
      // Column widths - adjusted for all required columns
      const colWidths = {
        surname: 65,
        name: 65,
        startDate: 50,
        endDate: 50,
        weekdayRate: 45,
        weekdayHours: 45,
        weekdayTotal: 50,
        holidayRate: 45,
        holidayHours: 45,
        holidayTotal: 50,
        km: 35,
        kmRate: 40,
        kmTotal: 45,
        total: 50
      };
      
      // Helper function to draw headers
      const drawHeaders = (yPos) => {
        doc.font('Helvetica-Bold').fontSize(6);
        let x = margin;
        
        // Main header row
        doc.text('Cognome', x, yPos, { width: colWidths.surname, align: 'center' });
        x += colWidths.surname;
        doc.text('Nome', x, yPos, { width: colWidths.name, align: 'center' });
        x += colWidths.name;
        doc.text('Data Inizio', x, yPos, { width: colWidths.startDate, align: 'center' });
        x += colWidths.startDate;
        doc.text('Data Fine', x, yPos, { width: colWidths.endDate, align: 'center' });
        x += colWidths.endDate;
        doc.text('Tariffa Feriale', x, yPos, { width: colWidths.weekdayRate, align: 'center' });
        x += colWidths.weekdayRate;
        doc.text('Ore Feriali', x, yPos, { width: colWidths.weekdayHours, align: 'center' });
        x += colWidths.weekdayHours;
        doc.text('Tot. Feriale', x, yPos, { width: colWidths.weekdayTotal, align: 'center' });
        x += colWidths.weekdayTotal;
        doc.text('Tariffa Festiva', x, yPos, { width: colWidths.holidayRate, align: 'center' });
        x += colWidths.holidayRate;
        doc.text('Ore Festive', x, yPos, { width: colWidths.holidayHours, align: 'center' });
        x += colWidths.holidayHours;
        doc.text('Tot. Festivo', x, yPos, { width: colWidths.holidayTotal, align: 'center' });
        x += colWidths.holidayTotal;
        doc.text('Km', x, yPos, { width: colWidths.km, align: 'center' });
        x += colWidths.km;
        doc.text('Tariffa Km', x, yPos, { width: colWidths.kmRate, align: 'center' });
        x += colWidths.kmRate;
        doc.text('Tot. Km', x, yPos, { width: colWidths.kmTotal, align: 'center' });
        x += colWidths.kmTotal;
        doc.text('TOTALE', x, yPos, { width: colWidths.total, align: 'center' });
        
        // Units row
        yPos += 8;
        x = margin;
        doc.text('', x, yPos, { width: colWidths.surname });
        x += colWidths.surname;
        doc.text('', x, yPos, { width: colWidths.name });
        x += colWidths.name;
        doc.text('', x, yPos, { width: colWidths.startDate });
        x += colWidths.startDate;
        doc.text('', x, yPos, { width: colWidths.endDate });
        x += colWidths.endDate;
        doc.text('€/h', x, yPos, { width: colWidths.weekdayRate, align: 'center' });
        x += colWidths.weekdayRate;
        doc.text('', x, yPos, { width: colWidths.weekdayHours, align: 'center' });
        x += colWidths.weekdayHours;
        doc.text('€', x, yPos, { width: colWidths.weekdayTotal, align: 'center' });
        x += colWidths.weekdayTotal;
        doc.text('€/h', x, yPos, { width: colWidths.holidayRate, align: 'center' });
        x += colWidths.holidayRate;
        doc.text('', x, yPos, { width: colWidths.holidayHours, align: 'center' });
        x += colWidths.holidayHours;
        doc.text('€', x, yPos, { width: colWidths.holidayTotal, align: 'center' });
        x += colWidths.holidayTotal;
        doc.text('', x, yPos, { width: colWidths.km, align: 'center' });
        x += colWidths.km;
        doc.text('€/km', x, yPos, { width: colWidths.kmRate, align: 'center' });
        x += colWidths.kmRate;
        doc.text('€', x, yPos, { width: colWidths.kmTotal, align: 'center' });
        x += colWidths.kmTotal;
        doc.text('€', x, yPos, { width: colWidths.total, align: 'center' });
        
        return yPos + 12;
      };
      
      // Draw initial headers
      y = drawHeaders(y);
      
      // Draw horizontal line
      doc.moveTo(margin, y - 3).lineTo(doc.page.width - margin, y - 3).stroke();
      
      // Data rows
      doc.font('Helvetica').fontSize(6);
      let totalWeekdayHours = 0;
      let totalHolidayHours = 0;
      let totalKm = 0;
      let totalAmount = 0;
      
      for (const row of compensationData) {
        // Check if new page needed
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = 50;
          y = drawHeaders(y);
          doc.moveTo(margin, y - 3).lineTo(doc.page.width - margin, y - 3).stroke();
          doc.font('Helvetica').fontSize(6);
        }
        
        let x = margin;
        doc.font('Helvetica').fontSize(6);
        doc.text(row.lastName.toUpperCase(), x, y, { width: colWidths.surname, align: 'left' });
        x += colWidths.surname;
        doc.text(row.firstName.toUpperCase(), x, y, { width: colWidths.name, align: 'left' });
        x += colWidths.name;
        
        // Format dates as DD/MM/YYYY
        const startDateStr = new Date(row.startDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const endDateStr = new Date(row.endDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        doc.text(startDateStr, x, y, { width: colWidths.startDate, align: 'center' });
        x += colWidths.startDate;
        doc.text(endDateStr, x, y, { width: colWidths.endDate, align: 'center' });
        x += colWidths.endDate;
        doc.text((Number(row.weekdayRate) || 0).toFixed(2).replace('.', ','), x, y, { width: colWidths.weekdayRate, align: 'right' });
        x += colWidths.weekdayRate;
        doc.text((Number(row.weekdayHours) || 0).toFixed(2).replace('.', ','), x, y, { width: colWidths.weekdayHours, align: 'right' });
        x += colWidths.weekdayHours;
        doc.text((Number(row.weekdayTotal) || 0).toFixed(2).replace('.', ','), x, y, { width: colWidths.weekdayTotal, align: 'right' });
        x += colWidths.weekdayTotal;
        doc.text((Number(row.holidayRate) || 0).toFixed(2).replace('.', ','), x, y, { width: colWidths.holidayRate, align: 'right' });
        x += colWidths.holidayRate;
        doc.text((Number(row.holidayHours) || 0).toFixed(2).replace('.', ','), x, y, { width: colWidths.holidayHours, align: 'right' });
        x += colWidths.holidayHours;
        doc.text((Number(row.holidayTotal) || 0).toFixed(2).replace('.', ','), x, y, { width: colWidths.holidayTotal, align: 'right' });
        x += colWidths.holidayTotal;
        doc.text((Number(row.mileage) || 0).toFixed(2).replace('.', ','), x, y, { width: colWidths.km, align: 'right' });
        x += colWidths.km;
        doc.text((Number(row.mileageRate) || 0).toFixed(2).replace('.', ','), x, y, { width: colWidths.kmRate, align: 'right' });
        x += colWidths.kmRate;
        doc.text((Number(row.mileageTotal) || 0).toFixed(2).replace('.', ','), x, y, { width: colWidths.kmTotal, align: 'right' });
        x += colWidths.kmTotal;
        doc.text((Number(row.total) || 0).toFixed(2).replace('.', ','), x, y, { width: colWidths.total, align: 'right' });
        
        totalWeekdayHours += Number(row.weekdayHours) || 0;
        totalHolidayHours += Number(row.holidayHours) || 0;
        totalKm += Number(row.mileage) || 0;
        totalAmount += Number(row.total) || 0;
        
        y += 12;
      }
      
      // Summary section
      y += 20;
      doc.font('Helvetica-Bold').fontSize(8);
      doc.text('Riepilogo Totali / Summary Totals:', margin, y);
      y += 15;
      
      doc.font('Helvetica').fontSize(8);
      doc.text(`• Totale ore feriali / Total weekday hours: ${totalWeekdayHours.toFixed(2).replace('.', ',')} ore / hours`, margin, y);
      y += 12;
      doc.text(`• Totale ore festive / Total holiday hours: ${totalHolidayHours.toFixed(2).replace('.', ',')} ore / hours`, margin, y);
      y += 12;
      doc.text(`• Totale chilometri / Total kilometers: ${totalKm.toFixed(2).replace('.', ',')} km`, margin, y);
      y += 12;
      doc.text(`• Totale compensi / Total compensation: €${totalAmount.toFixed(2).replace('.', ',')}`, margin, y);
      
      // Notes
      y += 20;
      doc.fontSize(7);
      const monthName = new Date(startDate).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
      const monthNameEn = new Date(startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      doc.text(`Note / Notes: Dati estratti per il periodo ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} / Data extracted for ${monthNameEn}. `, margin, y, { continued: true });
      doc.text('Ore feriali: lunedì-sabato / Weekday hours: Monday-Saturday. ', { continued: true });
      doc.text('Ore festive: domeniche / Holiday hours: Sundays. ', { continued: true });
      doc.text('Fonte: Database cooperativa sanitaria / Source: Healthcare cooperative database.');
      
      // Footer
      y = doc.page.height - 50;
      doc.fontSize(8);
      const now = new Date();
      const dateStr = now.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      doc.text(`Documento generato il / Document generated on: ${dateStr} - ${timeStr}`, { align: 'center' });
      
      doc.end();
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // PATCH endpoint for staff compensations inline editing - FINAL FIXED VERSION  
  app.patch('/api/staff-compensations/:id', isAuthenticated, requireCrudPermission('update'), async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 'system';
      console.log(`🔧 COMPENSATION INLINE EDIT: ${id} by user: ${userId}`, JSON.stringify(req.body));
      
      // Get current compensation for audit comparison
      const currentCompensation = await storage.getStaffCompensationById(id);
      if (!currentCompensation) {
        return res.status(404).json({ message: "Compensation not found" });
      }
      
      // Map camelCase frontend → snake_case database fields
      const fieldMapping: Record<string, string> = {
        'regularHours': 'regular_hours',
        'holidayHours': 'holiday_hours', 
        'totalMileage': 'total_mileage'
      };
      
      const updates: any = {};
      const auditEntries: any[] = [];
      
      for (const [key, value] of Object.entries(req.body)) {
        const dbField = fieldMapping[key];
        if (dbField && value !== undefined && value !== null) {
          const numValue = parseFloat(String(value));
          if (!isNaN(numValue)) {
            updates[dbField] = numValue;
            
            // Get original value
            const originalValue = parseFloat(String((currentCompensation as any)[dbField] || 0));
            
            // Create audit entry if value changed
            if (originalValue !== numValue) {
              auditEntries.push({
                compensationId: id,
                adjustedBy: userId,
                adjustmentType: 'inline_edit',
                fieldName: dbField,
                originalValue: originalValue.toString(),
                newValue: numValue.toString(),
                amount: (numValue - originalValue).toString(), // Calculate difference
                reason: `Inline edit from compensation table - ${key}: ${originalValue} → ${numValue}`
              });
            }
          }
        }
      }
      
      console.log(`💾 Saving to database:`, JSON.stringify(updates));
      console.log(`📝 Audit entries:`, JSON.stringify(auditEntries));
      
      if (Object.keys(updates).length === 0) {
        console.log('❌ No valid updates');
        return res.status(400).json({ message: "No valid fields to update" });
      }
      
      // Use the audit-enabled update method
      const compensation = await storage.updateStaffCompensationWithAudit(id, updates, auditEntries);
      console.log(`✅ INLINE EDIT SUCCESS WITH AUDIT: ${compensation.id}`);
      res.json(compensation);
    } catch (error: any) {
      console.error("❌ INLINE EDIT ERROR:", error.message, error.stack);
      res.status(500).json({ message: "Failed to update staff compensation", error: error.message });
    }
  });



  // COMPENSATION TABLE INLINE EDITING - WITH AUDIT LOGGING
  app.patch('/api/compensation-inline/:id', isAuthenticated, requireCrudPermission('update'), async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      console.log(`🔧 INLINE COMPENSATION EDIT: ${id} by user: ${userId}`, JSON.stringify(req.body));
      
      // Get current compensation data for audit trail
      const currentCompensation = await storage.getStaffCompensationById(id);
      if (!currentCompensation) {
        return res.status(404).json({ message: "Compensation record not found" });
      }
      
      // Field mapping: frontend camelCase → database snake_case
      const fieldMapping: Record<string, string> = {
        'regularHours': 'regular_hours',
        'holidayHours': 'holiday_hours', 
        'totalMileage': 'total_mileage'
      };
      
      const updates: any = {};
      const auditEntries: any[] = [];
      
      for (const [key, value] of Object.entries(req.body)) {
        const dbField = fieldMapping[key];
        if (dbField && value !== undefined && value !== null) {
          const numValue = parseFloat(String(value));
          if (!isNaN(numValue)) {
            const originalValue = parseFloat(String(currentCompensation[dbField as keyof typeof currentCompensation] || 0));
            
            // Only update if value actually changed
            if (originalValue !== numValue) {
              updates[dbField] = numValue;
              
              // Create audit entry
              auditEntries.push({
                compensationId: id,
                adjustedBy: userId,
                adjustmentType: key.includes('Hours') || key.includes('Mileage') ? 'hours' : 'manual',
                fieldName: dbField,
                originalValue: originalValue,
                newValue: numValue,
                amount: numValue, // Required by database schema
                reason: `Inline edit: ${key} changed from ${originalValue} to ${numValue}`
              });
            }
          }
        }
      }
      
      if (Object.keys(updates).length > 0) {
        console.log('💾 Saving to database:', JSON.stringify(updates));
        console.log('📝 Creating audit entries:', auditEntries.length);
        
        // Debug: Log the audit entries to see what's being sent
        console.log('📋 AUDIT ENTRIES:', JSON.stringify(auditEntries, null, 2));
        
        // Update compensation and create audit trail
        const compensation = await storage.updateStaffCompensationWithAudit(id, updates, auditEntries);
        
        console.log(`✅ COMPENSATION SAVED: ${compensation.id} - values updated with audit trail`);
        res.json(compensation);
      } else {
        console.log('❌ No changes detected');
        res.status(400).json({ message: "No changes detected" });
      }
    } catch (error: any) {
      console.error("❌ COMPENSATION INLINE ERROR:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
