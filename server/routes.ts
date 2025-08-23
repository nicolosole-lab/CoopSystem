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
  insertCompensationSchema,
  insertCompensationAuditLogSchema,
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
import { integrityService } from "./integrity-verification";

const scryptAsync = promisify(scrypt);

// Helper functions for Excel date/time conversion
function convertExcelDate(excelDate: any): string {
  if (!excelDate || excelDate === '' || excelDate === '-' || isNaN(Number(excelDate))) {
    return '';
  }
  
  const numericDate = Number(excelDate);
  
  // Excel serial date (days since January 1, 1900, with 1900 incorrectly treated as a leap year)
  const excelEpoch = new Date(1900, 0, 1);
  const jsDate = new Date(excelEpoch.getTime() + (numericDate - 2) * 24 * 60 * 60 * 1000);
  
  // Return in dd/mm/yyyy format for Italian users
  const day = jsDate.getDate().toString().padStart(2, '0');
  const month = (jsDate.getMonth() + 1).toString().padStart(2, '0');
  const year = jsDate.getFullYear();
  
  return `${day}/${month}/${year}`;
}

function convertExcelDateTime(excelDateTime: any): string {
  if (!excelDateTime || excelDateTime === '' || excelDateTime === '-' || isNaN(Number(excelDateTime))) {
    return '';
  }
  
  const numericDateTime = Number(excelDateTime);
  
  // Excel serial date (days since January 1, 1900)
  const excelEpoch = new Date(1900, 0, 1);
  const jsDate = new Date(excelEpoch.getTime() + (numericDateTime - 2) * 24 * 60 * 60 * 1000);
  
  // Return in dd/mm/yyyy HH:MM format
  const day = jsDate.getDate().toString().padStart(2, '0');
  const month = (jsDate.getMonth() + 1).toString().padStart(2, '0');
  const year = jsDate.getFullYear();
  const hours = jsDate.getHours().toString().padStart(2, '0');
  const minutes = jsDate.getMinutes().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function convertExcelDuration(excelDuration: any): string {
  if (!excelDuration || excelDuration === '' || excelDuration === '-' || isNaN(Number(excelDuration))) {
    return '';
  }
  
  const numericDuration = Number(excelDuration);
  
  // Excel duration is a fraction of a day, convert to hours and minutes
  const totalMinutes = Math.round(numericDuration * 24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

function isExcelDate(value: any): boolean {
  if (!value || value === '' || value === '-') return false;
  const numericValue = Number(value);
  // Excel dates are typically between 1 (1900-01-01) and 100000+ (far future)
  // Also check if it's a reasonable date range
  return !isNaN(numericValue) && numericValue > 1 && numericValue < 200000;
}

function isExcelDuration(value: any): boolean {
  if (!value || value === '' || value === '-') return false;
  const numericValue = Number(value);
  // Excel durations are typically small fractions (0 to 1 for up to 24 hours)
  return !isNaN(numericValue) && numericValue >= 0 && numericValue <= 10;
}

// New function to parse Italian date format DD/MM/YYYY HH:MM
function parseItalianDateTime(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') return dateStr;
  
  // Check if it matches Italian format DD/MM/YYYY HH:MM or DD/MM/YYYY H:MM
  const italianDateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/;
  const match = dateStr.match(italianDateRegex);
  
  if (match) {
    const [, day, month, year, hour, minute] = match;
    // Normalize to consistent format DD/MM/YYYY HH:MM
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year} ${hour.padStart(2, '0')}:${minute}`;
  }
  
  return dateStr; // Return original if not Italian format
}

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
  const server = createServer(app);
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

  // Staff access logs endpoint - retrieves access data from excel_data
  app.get('/api/staff/:id/access-logs', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const staffId = req.params.id;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate query parameters are required" });
      }

      const accessLogs = await storage.getStaffAccessLogs(staffId, startDate as string, endDate as string);
      res.json(accessLogs);
    } catch (error: any) {
      console.error("Error fetching staff access logs:", error);
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

  // Daily hours report endpoint
  app.get('/api/time-logs/daily-report/:date', isAuthenticated, requireCrudPermission('read'), async (req, res) => {
    try {
      const dateStr = req.params.date;
      const targetDate = new Date(dateStr);
      
      // Validate date
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
      }

      // Get daily report from storage
      const dailyReport = await storage.getDailyHoursReport(targetDate);
      res.json(dailyReport);
    } catch (error) {
      console.error("Error fetching daily hours report:", error);
      res.status(500).json({ message: "Failed to fetch daily hours report" });
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
                if (value === null || value === undefined || value === '') {
                  rowData[dbField] = '';
                } else {
                  // Apply appropriate conversion based on field type
                  if (dbField === 'date' && isExcelDate(value)) {
                    rowData[dbField] = convertExcelDate(value);
                  } else if ((dbField === 'recordedStart' || dbField === 'recordedEnd' || 
                             dbField === 'scheduledStart' || dbField === 'scheduledEnd') && isExcelDate(value)) {
                    rowData[dbField] = convertExcelDateTime(value);
                  } else if ((dbField === 'duration' || dbField === 'nominalDuration') && isExcelDuration(value)) {
                    rowData[dbField] = convertExcelDuration(value);
                  } else {
                    rowData[dbField] = String(value);
                  }
                }
              }
            });
            
            // Extract date from scheduledStart if not explicitly set
            if (!rowData.date && rowData.scheduledStart) {
              // If scheduledStart contains a space, it's already formatted as "dd/mm/yyyy HH:MM"
              if (rowData.scheduledStart.includes(' ')) {
                rowData.date = rowData.scheduledStart.split(' ')[0];
              } else if (isExcelDate(rowData.scheduledStart)) {
                rowData.date = convertExcelDate(rowData.scheduledStart);
              }
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
            rowData.recordedStart = isExcelDate(row[1]) ? convertExcelDateTime(row[1]) : (row[1] || '');
            rowData.recordedEnd = isExcelDate(row[2]) ? convertExcelDateTime(row[2]) : (row[2] || '');
            rowData.scheduledStart = isExcelDate(row[3]) ? convertExcelDateTime(row[3]) : (row[3] || '');  // Column D
            rowData.scheduledEnd = isExcelDate(row[4]) ? convertExcelDateTime(row[4]) : (row[4] || '');    // Column E
            rowData.duration = isExcelDuration(row[5]) ? convertExcelDuration(row[5]) : (row[5] || '');
            rowData.nominalDuration = isExcelDuration(row[6]) ? convertExcelDuration(row[6]) : (row[6] || '');
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
            if (isExcelDate(row[3])) {
              rowData.date = convertExcelDate(row[3]);
            } else if (row[3] && row[3].includes(' ')) {
              rowData.date = row[3].split(' ')[0];  // Extract date from already formatted scheduledStart
            } else {
              rowData.date = row[3] || '';
            }
          } else {
            // Fallback to header-based mapping for non-standard files
            headers.forEach((header, colIndex) => {
              const dbField = columnMapping[header];
              if (dbField) {
                const value = row[colIndex];
                if (value === null || value === undefined || value === '') {
                  rowData[dbField] = '';
                } else {
                  // Apply appropriate conversion based on field type
                  if (dbField === 'date' && isExcelDate(value)) {
                    rowData[dbField] = convertExcelDate(value);
                  } else if ((dbField === 'recordedStart' || dbField === 'recordedEnd' || 
                             dbField === 'scheduledStart' || dbField === 'scheduledEnd') && isExcelDate(value)) {
                    rowData[dbField] = convertExcelDateTime(value);
                  } else if ((dbField === 'duration' || dbField === 'nominalDuration') && isExcelDuration(value)) {
                    rowData[dbField] = convertExcelDuration(value);
                  } else {
                    rowData[dbField] = String(value);
                  }
                }
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
              rowData.recordedStart = isExcelDate(row[1]) ? convertExcelDateTime(row[1]) : (row[1] || '');
              rowData.recordedEnd = isExcelDate(row[2]) ? convertExcelDateTime(row[2]) : (row[2] || '');
              rowData.scheduledStart = isExcelDate(row[3]) ? convertExcelDateTime(row[3]) : (row[3] || '');  // Column D
              rowData.scheduledEnd = isExcelDate(row[4]) ? convertExcelDateTime(row[4]) : (row[4] || '');    // Column E
              rowData.duration = isExcelDuration(row[5]) ? convertExcelDuration(row[5]) : (row[5] || '');
              rowData.nominalDuration = isExcelDuration(row[6]) ? convertExcelDuration(row[6]) : (row[6] || '');
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
                  const value = row[colIndex];
                  if (value === null || value === undefined || value === '') {
                    rowData[dbField] = '';
                  } else {
                    // Apply appropriate conversion based on field type
                    if (dbField === 'date' && isExcelDate(value)) {
                      rowData[dbField] = convertExcelDate(value);
                    } else if ((dbField === 'recordedStart' || dbField === 'recordedEnd' || 
                               dbField === 'scheduledStart' || dbField === 'scheduledEnd') && isExcelDate(value)) {
                      rowData[dbField] = convertExcelDateTime(value);
                    } else if (dbField === 'scheduledStart' || dbField === 'scheduledEnd' || 
                               dbField === 'recordedStart' || dbField === 'recordedEnd') {
                      rowData[dbField] = parseItalianDateTime(String(value));
                    } else if ((dbField === 'duration' || dbField === 'nominalDuration' || dbField === 'travelDuration') && isExcelDuration(value)) {
                      rowData[dbField] = convertExcelDuration(value);
                    } else {
                      rowData[dbField] = String(value);
                    }
                  }
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
            processed: totalItems,
            total: totalItems,
            created: totalCreated || 0,
            updated: totalUpdated || 0,
            skipped: totalSkipped || 0,
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

  // ===== COMPENSATION MANAGEMENT ENDPOINTS =====
  app.get("/api/compensations", isAuthenticated, async (req, res, next) => {
    try {
      const { periodStart, periodEnd } = req.query;
      
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (periodStart) {
        startDate = new Date(periodStart as string);
      }
      if (periodEnd) {
        endDate = new Date(periodEnd as string);
      }
      
      const compensations = await storage.getCompensations(startDate, endDate);
      res.json(compensations);
    } catch (error) {
      next(error);
    }
  });

  // NEW: Dynamic compensation calculation from time logs
  app.get("/api/compensations/calculate", isAuthenticated, async (req, res, next) => {
    try {
      const { periodStart, periodEnd, staffType } = req.query;
      
      if (!periodStart || !periodEnd) {
        return res.status(400).json({ 
          message: "periodStart and periodEnd are required" 
        });
      }
      
      const startDate = new Date(periodStart as string);
      const endDate = new Date(periodEnd as string);
      const filterStaffType = staffType as 'all' | 'internal' | 'external' | undefined;
      
      console.log(`🎯 Calculating compensations for period: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      if (filterStaffType && filterStaffType !== 'all') {
        console.log(`📋 Filtering by staff type: ${filterStaffType}`);
      }
      
      // Calculate dynamic compensations from time logs
      const dynamicCompensations = await storage.calculateCompensationsFromTimeLogs(startDate, endDate, filterStaffType);
      
      res.json(dynamicCompensations);
    } catch (error) {
      console.error('❌ Error calculating compensations:', error);
      next(error);
    }
  });

  app.get("/api/compensations/:id", isAuthenticated, async (req, res, next) => {
    try {
      const compensation = await storage.getCompensation(req.params.id);
      if (!compensation) {
        return res.status(404).json({ error: "Compensation not found" });
      }
      res.json(compensation);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/compensations", isAuthenticated, async (req, res, next) => {
    try {
      const result = insertCompensationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      // Ensure dates are properly converted
      const compensationData = {
        ...result.data,
        periodStart: result.data.periodStart instanceof Date ? result.data.periodStart : new Date(result.data.periodStart),
        periodEnd: result.data.periodEnd instanceof Date ? result.data.periodEnd : new Date(result.data.periodEnd),
      };
      
      // Check if compensation already exists for staff and period
      const existing = await storage.getCompensationByStaffAndPeriod(
        compensationData.staffId,
        compensationData.periodStart,
        compensationData.periodEnd
      );
      
      if (existing) {
        return res.status(409).json({ error: "Compensation already exists for this staff and period" });
      }
      
      const compensation = await storage.createCompensation(compensationData);
      res.json(compensation);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/compensations/:id", isAuthenticated, async (req, res, next) => {
    try {
      const compensationId = req.params.id;
      const updates = req.body;
      const userId = req.user!.id;
      
      // Get current compensation for audit
      const currentCompensation = await storage.getCompensation(compensationId);
      if (!currentCompensation) {
        return res.status(404).json({ error: "Compensation not found" });
      }
      
      // Create audit log for each changed field
      for (const [fieldName, newValue] of Object.entries(updates)) {
        const originalValue = (currentCompensation as any)[fieldName];
        
        if (originalValue !== newValue) {
          await storage.createCompensationAuditLog({
            compensationId,
            adjustedBy: userId,
            adjustmentType: fieldName.includes('hours') ? 'hours' : fieldName.includes('mileage') ? 'mileage' : 'rate',
            fieldName,
            originalValue: originalValue?.toString() || '0',
            newValue: newValue?.toString() || '0',
            amount: null,
            reason: 'Inline edit',
          });
        }
      }
      
      // Update compensation with recalculated totals
      const updatedData = { ...updates };
      
      // Recalculate totals if hours or rates changed
      if ('regularHours' in updates || 'holidayHours' in updates || 'totalMileage' in updates) {
        // Get staff rates
        const staff = await storage.getStaff(currentCompensation.staffId);
        if (staff) {
          const regularHours = parseFloat(updates.regularHours || currentCompensation.regularHours || '0');
          const holidayHours = parseFloat(updates.holidayHours || currentCompensation.holidayHours || '0');
          const totalMileage = parseFloat(updates.totalMileage || currentCompensation.totalMileage || '0');
          
          const weekdayRate = parseFloat(staff.weekdayRate || '0');
          const holidayRate = parseFloat(staff.holidayRate || '0');
          const mileageRate = parseFloat(staff.mileageRate || '0');
          
          updatedData.weekdayTotal = (regularHours * weekdayRate).toFixed(2);
          updatedData.holidayTotal = (holidayHours * holidayRate).toFixed(2);
          updatedData.mileageTotal = (totalMileage * mileageRate).toFixed(2);
          updatedData.totalAmount = (
            parseFloat(updatedData.weekdayTotal) +
            parseFloat(updatedData.holidayTotal) +
            parseFloat(updatedData.mileageTotal)
          ).toFixed(2);
        }
      }
      
      const compensation = await storage.updateCompensation(compensationId, updatedData);
      res.json(compensation);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/compensations/:id", isAuthenticated, async (req, res, next) => {
    try {
      await storage.deleteCompensation(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/compensations/:id/audit", isAuthenticated, async (req, res, next) => {
    try {
      const logs = await storage.getCompensationAuditLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      next(error);
    }
  });

  // Staff rate update endpoint for compensation editing
  app.patch("/api/staff/:id/rates", isAuthenticated, async (req, res, next) => {
    try {
      const { weekday_rate, holiday_rate, mileage_rate, weekdayRate, holidayRate, mileageRate } = req.body;
      const updates: any = {};
      
      // Support both naming conventions for compatibility
      if (weekday_rate !== undefined) updates.weekday_rate = weekday_rate;
      if (holiday_rate !== undefined) updates.holiday_rate = holiday_rate;
      if (mileage_rate !== undefined) updates.mileage_rate = mileage_rate;
      
      // Legacy support
      if (weekdayRate !== undefined) updates.weekday_rate = weekdayRate;
      if (holidayRate !== undefined) updates.holiday_rate = holidayRate;
      if (mileageRate !== undefined) updates.mileage_rate = mileageRate;
      
      const staff = await storage.updateStaffMember(req.params.id, updates);
      res.json(staff);
    } catch (error) {
      next(error);
    }
  });

  // ===== WORKFLOW AUTOMATION ENDPOINTS =====
  app.get('/api/automation/workflows', isAuthenticated, async (req, res) => {
    try {
      const workflows = await workflowEngine.getWorkflows();
      res.json(workflows);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      res.status(500).json({ message: "Failed to fetch workflows" });
    }
  });

  // ===== DATA INTEGRITY VERIFICATION ENDPOINTS =====
  
  // Generate comprehensive integrity report (2019-2025)
  app.post('/api/integrity/verify', isAuthenticated, requireCrudPermission("admin"), async (req, res) => {
    try {
      console.log('🎯 Starting data integrity verification...');
      const reports = await integrityService.generateIntegrityReport();
      
      // Save reports to files
      await integrityService.saveReports(reports);
      
      // Return summary
      const summary = {
        totalPeriods: reports.length,
        avgIntegrity: Math.round(reports.reduce((sum, r) => sum + r.integrityPercentage, 0) / reports.length * 100) / 100,
        totalExcelRecords: reports.reduce((sum, r) => sum + r.excelRecords, 0),
        totalDbRecords: reports.reduce((sum, r) => sum + r.dbRecords, 0),
        totalMatched: reports.reduce((sum, r) => sum + r.matchedRecords, 0),
        totalDuplicates: reports.reduce((sum, r) => sum + r.duplicatesCount, 0),
        totalMissingData: reports.reduce((sum, r) => sum + r.missingDataCount, 0),
        byYear: reports.reduce((acc, r) => {
          if (!acc[r.year]) acc[r.year] = {
            periods: 0,
            integrity: 0,
            records: 0
          };
          acc[r.year].periods++;
          acc[r.year].integrity += r.integrityPercentage;
          acc[r.year].records += r.dbRecords;
          return acc;
        }, {} as Record<number, any>)
      };

      // Calculate averages
      Object.keys(summary.byYear).forEach(year => {
        const yearData = summary.byYear[parseInt(year)];
        yearData.integrity = Math.round(yearData.integrity / yearData.periods * 100) / 100;
      });

      res.json({
        message: 'Verifica integrità completata con successo',
        summary,
        reports: reports.slice(0, 10) // First 10 detailed reports
      });

    } catch (error) {
      console.error('❌ Errore durante verifica integrità:', error);
      res.status(500).json({ 
        message: 'Errore durante la verifica integrità', 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Get integrity reports status
  app.get('/api/integrity/status', isAuthenticated, async (req, res) => {
    try {
      // Quick status check - count records by year
      const statusQuery = `
        SELECT 
          EXTRACT(YEAR FROM tl.scheduled_start_time) as year,
          COUNT(*) as time_logs_count,
          COUNT(DISTINCT tl.client_id) as unique_clients,
          COUNT(DISTINCT tl.staff_id) as unique_staff,
          MIN(tl.scheduled_start_time) as earliest_service,
          MAX(tl.scheduled_start_time) as latest_service
        FROM time_logs tl
        WHERE tl.scheduled_start_time >= '2019-01-01'
        GROUP BY EXTRACT(YEAR FROM tl.scheduled_start_time)
        ORDER BY year
      `;
      
      res.json({
        message: 'Status integrità database disponibile',
        note: 'Usa POST /api/integrity/verify per analisi completa',
        quickStats: {
          availableYears: '2019-2025',
          totalTimeLogsInDb: 'Use verify endpoint for exact count',
          lastUpdate: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Errore status integrità:', error);
      res.status(500).json({ message: 'Errore nel recupero status integrità' });
    }
  });

  // ===== VALIDATION AND LOCK MANAGEMENT ENDPOINTS =====
  
  // Period validation endpoints
  app.get('/api/validation/periods', isAuthenticated, async (req, res) => {
    try {
      const validations = await storage.getPeriodValidations();
      res.json(validations);
    } catch (error) {
      console.error("Error fetching period validations:", error);
      res.status(500).json({ message: "Failed to fetch period validations" });
    }
  });

  app.post('/api/validation/periods', isAuthenticated, requireCrudPermission("manager"), async (req, res) => {
    try {
      const { startDate, endDate, notes } = req.body;
      
      // Check for existing validation in this period
      const existing = await storage.checkPeriodValidation(startDate, endDate);
      if (existing) {
        return res.status(409).json({ message: "Period is already validated" });
      }

      const validation = await storage.createPeriodValidation({
        startDate,
        endDate,
        validatedBy: req.user.id,
        notes,
        affectedRecordsCount: 0 // Will be calculated
      });

      // Log the validation action
      await storage.createSystemAuditLog({
        userId: req.user.id,
        action: 'validate',
        entityType: 'period_validation',
        entityId: validation.id,
        newValues: { startDate, endDate, notes },
        metadata: { ip: req.ip, userAgent: req.get('User-Agent') }
      });

      res.status(201).json(validation);
    } catch (error) {
      console.error("Error creating period validation:", error);
      res.status(500).json({ message: "Failed to create period validation" });
    }
  });

  // Period lock endpoints
  app.post('/api/locks/acquire', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, operationType } = req.body;
      const sessionId = req.sessionID;

      const lock = await storage.acquirePeriodLock(startDate, endDate, req.user.id, operationType, sessionId);
      
      if (!lock) {
        return res.status(409).json({ 
          message: "Period is already locked by another user",
          error: "PERIOD_LOCKED"
        });
      }

      await storage.createSystemAuditLog({
        userId: req.user.id,
        action: 'lock',
        entityType: 'period_lock',
        entityId: lock.id,
        newValues: { startDate, endDate, operationType },
        metadata: { ip: req.ip, userAgent: req.get('User-Agent'), sessionId }
      });

      res.status(201).json(lock);
    } catch (error) {
      console.error("Error acquiring period lock:", error);
      res.status(500).json({ message: "Failed to acquire period lock" });
    }
  });

  app.post('/api/locks/release/:lockId', isAuthenticated, async (req, res) => {
    try {
      const { lockId } = req.params;
      
      await storage.releasePeriodLock(lockId);
      
      await storage.createSystemAuditLog({
        userId: req.user.id,
        action: 'unlock',
        entityType: 'period_lock',
        entityId: lockId,
        metadata: { ip: req.ip, userAgent: req.get('User-Agent') }
      });

      res.json({ message: "Lock released successfully" });
    } catch (error) {
      console.error("Error releasing period lock:", error);
      res.status(500).json({ message: "Failed to release period lock" });
    }
  });

  app.get('/api/locks/check', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const activeLock = await storage.checkActiveLock(startDate as string, endDate as string);
      
      res.json({ 
        isLocked: !!activeLock,
        lock: activeLock 
      });
    } catch (error) {
      console.error("Error checking period lock:", error);
      res.status(500).json({ message: "Failed to check period lock" });
    }
  });

  // ===== INTELLIGENT EXCEL IMPORT ENDPOINTS =====
  
  // Direct intelligent import with file upload
  app.post('/api/data/import/intelligent-file', isAuthenticated, requireCrudPermission('create'), upload.single('file'), async (req: any, res) => {
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

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with all values as strings
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        raw: false,
        defval: ""
      });

      if (jsonData.length < 2) {
        throw new Error("File appears to be empty or has no data rows");
      }

      // Extract headers and map to our column names (reusing existing logic)
      const headers = (jsonData[0] as string[]).map(h => String(h || '').trim());
      const dataRows = jsonData.slice(1);

      // Process all data rows (not just preview)
      const processedData = dataRows
        .map((row: any[], originalRowIndex: number) => {
          const rowData: any = {
            rowNumber: String(originalRowIndex + 2), // +2 because we skip header and array is 0-indexed
            originalRowIndex: originalRowIndex + 2
          };

          // Use existing column mapping and conversion logic
          if (headers.length >= 57) {
            // Standard format with known column positions
            rowData.department = row[0] || '';
            rowData.recordedStart = isExcelDate(row[1]) ? convertExcelDateTime(row[1]) : parseItalianDateTime(row[1] || '');
            rowData.recordedEnd = isExcelDate(row[2]) ? convertExcelDateTime(row[2]) : parseItalianDateTime(row[2] || '');
            rowData.scheduledStart = isExcelDate(row[3]) ? convertExcelDateTime(row[3]) : parseItalianDateTime(row[3] || '');
            rowData.scheduledEnd = isExcelDate(row[4]) ? convertExcelDateTime(row[4]) : parseItalianDateTime(row[4] || '');
            rowData.duration = isExcelDuration(row[5]) ? convertExcelDuration(row[5]) : row[5] || '';
            rowData.nominalDuration = isExcelDuration(row[6]) ? convertExcelDuration(row[6]) : row[6] || '';
            
            // Person info
            rowData.assistedPersonFirstName = row[19] || '';  // Column T
            rowData.assistedPersonLastName = row[20] || '';   // Column U
            rowData.taxCode = row[23] || '';                  // Column X
            rowData.homeAddress = row[27] || '';              // Column AB
            
            // Operator info - check both possible column positions
            // First try columns 33/34 (Nome operatore/Cognome operatore)
            // Then fallback to columns 51/52 (AZ/BA) for older format
            const operatorFirstName33 = row[33] || '';
            const operatorLastName34 = row[34] || '';
            const operatorFirstName51 = row[51] || '';
            const operatorLastName51 = row[52] || '';
            
            // Use columns 33/34 if they contain actual names, otherwise use 51/52
            if (operatorFirstName33 && operatorFirstName33.length > 1 && operatorFirstName33 !== '1') {
              rowData.operatorFirstName = operatorFirstName33;
              rowData.operatorLastName = operatorLastName34;
            } else {
              rowData.operatorFirstName = operatorFirstName51;
              rowData.operatorLastName = operatorLastName51;
            }
            
            // Key fields for deduplication
            rowData.assistedPersonId = row[48] || '';         // Column AW
            rowData.operatorId = row[53] || '';               // Column BB  
            rowData.identifier = row[40] || '';               // Column AO
          }

          return rowData;
        })
        .filter(row => row.assistedPersonFirstName || row.operatorFirstName); // Only rows with actual data

      // Check for period locks before processing
      const dates = processedData.map(row => row.scheduledStart).filter(Boolean);
      console.log(`📅 Found ${dates.length} dates to process:`, dates.slice(0, 5));
      
      if (dates.length > 0) {
        // Filter out invalid dates before calculating min/max
        const validDates = dates
          .map((d, index) => {
            const parsed = new Date(d);
            if (isNaN(parsed.getTime())) {
              console.log(`❌ Invalid date at index ${index}: "${d}"`);
              return null;
            }
            return parsed;
          })
          .filter(date => date !== null);
        
        console.log(`✅ Valid dates: ${validDates.length}/${dates.length}`);
        
        if (validDates.length > 0) {
          const minDate = Math.min(...validDates.map(d => d.getTime()));
          const maxDate = Math.max(...validDates.map(d => d.getTime()));
          
          console.log(`📊 Date range: ${new Date(minDate).toISOString()} to ${new Date(maxDate).toISOString()}`);
          
          const activeLock = await storage.checkActiveLock(
            new Date(minDate).toISOString(),
            new Date(maxDate).toISOString()
          );
        
          if (activeLock && activeLock.lockedBy !== req.user.id) {
            return res.status(409).json({ 
              message: "Period is locked by another user",
              error: "PERIOD_LOCKED",
              lock: activeLock
            });
          }
        }
      }

      // Perform intelligent batch upsert
      const result = await storage.batchUpsertExcelDataIntelligent(importRecord.id, processedData, req.user.id);
      
      // Update import status
      await storage.updateDataImportStatus(importRecord.id, 'completed', result.inserted + result.updated);

      // Log the import operation
      await storage.createSystemAuditLog({
        userId: req.user.id,
        action: 'intelligent_import',
        entityType: 'excel_data',
        entityId: importRecord.id,
        newValues: { 
          recordsProcessed: result.inserted + result.updated + result.skipped,
          inserted: result.inserted,
          updated: result.updated,
          skipped: result.skipped
        },
        metadata: { 
          ip: req.ip, 
          userAgent: req.get('User-Agent'),
          errorCount: result.errors.length,
          filename: req.file.originalname
        },
        importId: importRecord.id
      });

      res.json({
        message: "🎯 Intelligent import completed successfully",
        importId: importRecord.id,
        result,
        rowsImported: result.inserted + result.updated
      });

    } catch (error) {
      console.error("Error during intelligent file import:", error);
      res.status(500).json({ 
        message: "Import failed", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.post('/api/data/import/intelligent', isAuthenticated, requireCrudPermission("manager"), async (req, res) => {
    try {
      const { importId, data } = req.body;
      
      if (!importId || !Array.isArray(data)) {
        return res.status(400).json({ message: "Invalid import data format" });
      }

      // Check for period locks
      const dates = data.map(row => row.scheduledStart).filter(Boolean);
      if (dates.length > 0) {
        const minDate = Math.min(...dates.map(d => new Date(d).getTime()));
        const maxDate = Math.max(...dates.map(d => new Date(d).getTime()));
        
        const activeLock = await storage.checkActiveLock(
          new Date(minDate).toISOString(),
          new Date(maxDate).toISOString()
        );
        
        if (activeLock && activeLock.lockedBy !== req.user.id) {
          return res.status(409).json({ 
            message: "Period is locked by another user",
            error: "PERIOD_LOCKED",
            lock: activeLock
          });
        }
      }

      // Perform intelligent batch upsert
      const result = await storage.batchUpsertExcelDataIntelligent(importId, data, req.user.id);
      
      // Log the import operation
      await storage.createSystemAuditLog({
        userId: req.user.id,
        action: 'import',
        entityType: 'excel_data',
        entityId: importId,
        newValues: { 
          recordsProcessed: result.inserted + result.updated + result.skipped,
          inserted: result.inserted,
          updated: result.updated,
          skipped: result.skipped
        },
        metadata: { 
          ip: req.ip, 
          userAgent: req.get('User-Agent'),
          errorCount: result.errors.length
        },
        importId
      });

      res.json({
        message: "Import completed successfully",
        result
      });
    } catch (error) {
      console.error("Error during intelligent import:", error);
      res.status(500).json({ 
        message: "Import failed", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Endpoint for finding existing records by composite key
  app.post('/api/data/find-existing', isAuthenticated, async (req, res) => {
    try {
      const { identifier, assistedPersonId, operatorId, scheduledStart } = req.body;
      
      const existing = await storage.findExistingRecordByKey(identifier, assistedPersonId, operatorId, scheduledStart);
      
      res.json({
        found: !!existing,
        record: existing
      });
    } catch (error) {
      console.error("Error finding existing record:", error);
      res.status(500).json({ message: "Failed to find existing record" });
    }
  });

  // ===== COMPENSATION VALIDATION ENDPOINTS =====
  
  app.post('/api/compensations/:id/validate', isAuthenticated, requireCrudPermission("manager"), async (req, res) => {
    try {
      const { id } = req.params;
      
      const compensation = await storage.validateCompensation(id, req.user.id);
      
      res.json({
        message: "Compenso validato con successo",
        compensation
      });
    } catch (error) {
      console.error("Error validating compensation:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Errore durante la validazione" 
      });
    }
  });

  app.post('/api/compensations/:id/unlock', isAuthenticated, requireCrudPermission("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      
      const compensation = await storage.unlockCompensation(id, req.user.id);
      
      res.json({
        message: "Compenso sbloccato con successo",
        compensation
      });
    } catch (error) {
      console.error("Error unlocking compensation:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Errore durante lo sblocco" 
      });
    }
  });

  app.get('/api/compensations/validation-status', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      // Get compensation validation status for period using storage method
      const compensationData = await storage.getCompensationsByPeriod(
        new Date(startDate as string),
        new Date(endDate as string)
      );

      const validationQuery = compensationData.map(comp => ({
        id: comp.id,
        staffId: comp.staffId,
        periodStart: comp.periodStart,
        periodEnd: comp.periodEnd,
        validationStatus: comp.validationStatus || 'draft',
        validationDate: comp.validationDate,
        validatedBy: comp.validatedBy,
        periodLockId: comp.periodLockId
      }));

      const summary = {
        totalCompensations: validationQuery.length,
        draftCount: validationQuery.filter(c => c.validationStatus === 'draft').length,
        validatedCount: validationQuery.filter(c => c.validationStatus === 'validated').length,
        unlockedCount: validationQuery.filter(c => c.validationStatus === 'unlocked').length,
        lockedCount: validationQuery.filter(c => c.periodLockId !== null).length
      };

      res.json({
        compensations: validationQuery,
        summary
      });
    } catch (error) {
      console.error("Error fetching compensation validation status:", error);
      res.status(500).json({ message: "Failed to fetch validation status" });
    }
  });

  // ===== AUDIT TRAIL ENDPOINTS =====
  
  app.get('/api/audit/logs', isAuthenticated, requireCrudPermission("admin"), async (req, res) => {
    try {
      const { entityType, entityId, startDate, endDate } = req.query;
      
      let logs;
      if (entityType && entityId) {
        logs = await storage.getAuditTrailByEntity(entityType as string, entityId as string);
      } else if (startDate && endDate) {
        logs = await storage.getAuditTrailByPeriod(startDate as string, endDate as string);
      } else {
        logs = await storage.getSystemAuditLogs();
      }
      
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Return the configured server
  return server;
}
