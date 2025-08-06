import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertClientSchema, 
  insertStaffSchema, 
  insertTimeLogSchema,
  insertClientBudgetAllocationSchema,
  insertBudgetExpenseSchema,
  insertHomeCarePlanSchema,
  insertClientBudgetConfigSchema
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import * as XLSX from "xlsx";

export function registerRoutes(app: Express): Server {
  // Auth middleware
  setupAuth(app);

  // Protected route middleware
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Dashboard routes
  app.get('/api/dashboard/metrics', isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Client routes
  app.get('/api/clients', isAuthenticated, async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get('/api/clients/:id', isAuthenticated, async (req, res) => {
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

  app.post('/api/clients', isAuthenticated, async (req, res) => {
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

  app.put('/api/clients/:id', isAuthenticated, async (req, res) => {
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

  app.delete('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Staff routes
  app.get('/api/staff', isAuthenticated, async (req, res) => {
    try {
      const staffMembers = await storage.getStaffMembers();
      res.json(staffMembers);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  app.get('/api/staff/:id', isAuthenticated, async (req, res) => {
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

  app.post('/api/staff', isAuthenticated, async (req, res) => {
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

  app.put('/api/staff/:id', isAuthenticated, async (req, res) => {
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

  app.delete('/api/staff/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteStaffMember(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting staff member:", error);
      res.status(500).json({ message: "Failed to delete staff member" });
    }
  });

  // Time log routes
  app.get('/api/time-logs', isAuthenticated, async (req, res) => {
    try {
      const timeLogs = await storage.getTimeLogs();
      res.json(timeLogs);
    } catch (error) {
      console.error("Error fetching time logs:", error);
      res.status(500).json({ message: "Failed to fetch time logs" });
    }
  });

  app.post('/api/time-logs', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTimeLogSchema.parse(req.body);
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

  app.put('/api/time-logs/:id', isAuthenticated, async (req, res) => {
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

  app.delete('/api/time-logs/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTimeLog(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting time log:", error);
      res.status(500).json({ message: "Failed to delete time log" });
    }
  });

  // Budget category routes
  app.get('/api/budget-categories', isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getBudgetCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching budget categories:", error);
      res.status(500).json({ message: "Failed to fetch budget categories" });
    }
  });

  // Budget type routes
  app.get('/api/budget-types', isAuthenticated, async (req, res) => {
    try {
      const types = await storage.getBudgetTypes();
      res.json(types);
    } catch (error) {
      console.error("Error fetching budget types:", error);
      res.status(500).json({ message: "Failed to fetch budget types" });
    }
  });

  // Client budget allocation routes
  app.get('/api/clients/:id/budget-allocations', isAuthenticated, async (req, res) => {
    try {
      const { month, year } = req.query;
      const allocations = await storage.getClientBudgetAllocations(
        req.params.id,
        month ? parseInt(month as string) : undefined,
        year ? parseInt(year as string) : undefined
      );
      res.json(allocations);
    } catch (error) {
      console.error("Error fetching client budget allocations:", error);
      res.status(500).json({ message: "Failed to fetch client budget allocations" });
    }
  });

  app.post('/api/clients/:id/budget-allocations', isAuthenticated, async (req, res) => {
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

  app.put('/api/budget-allocations/:id', isAuthenticated, async (req, res) => {
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

  app.delete('/api/budget-allocations/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteClientBudgetAllocation(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting budget allocation:", error);
      res.status(500).json({ message: "Failed to delete budget allocation" });
    }
  });

  // Budget expense routes
  app.get('/api/budget-expenses', isAuthenticated, async (req, res) => {
    try {
      const { clientId, categoryId, month, year } = req.query;
      const expenses = await storage.getBudgetExpenses(
        clientId as string,
        categoryId as string,
        month ? parseInt(month as string) : undefined,
        year ? parseInt(year as string) : undefined
      );
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching budget expenses:", error);
      res.status(500).json({ message: "Failed to fetch budget expenses" });
    }
  });

  app.post('/api/budget-expenses', isAuthenticated, async (req, res) => {
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

  app.put('/api/budget-expenses/:id', isAuthenticated, async (req, res) => {
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

  app.delete('/api/budget-expenses/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteBudgetExpense(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting budget expense:", error);
      res.status(500).json({ message: "Failed to delete budget expense" });
    }
  });

  // Budget analysis routes
  app.get('/api/clients/:id/budget-analysis', isAuthenticated, async (req, res) => {
    try {
      const { month, year } = req.query;
      if (!month || !year) {
        return res.status(400).json({ message: "Month and year parameters are required" });
      }
      
      const analysis = await storage.getBudgetAnalysis(
        req.params.id,
        parseInt(month as string),
        parseInt(year as string)
      );
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching budget analysis:", error);
      res.status(500).json({ message: "Failed to fetch budget analysis" });
    }
  });

  // Data import routes
  app.get('/api/data/imports', isAuthenticated, async (req, res) => {
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
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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

      // Determine language and column mapping
      const isItalian = headers.some(header => 
        typeof header === 'string' && (
          header.toLowerCase().includes('persona assistita') ||
          header.toLowerCase().includes('operatore')
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
        'Nome della persona assistita': 'assistedPersonFirstName',
        'Cognome della persona assistita': 'assistedPersonLastName',
        'Nome operatore': 'operatorFirstName',
        'Cognome operatore': 'operatorLastName',
        'Indirizzo domicilio': 'homeAddress',
        'Data': 'date',
        'Dipartimento': 'department',
        'Inizio registrato': 'recordedStart',
        'Fine registrata': 'recordedEnd',
        'Inizio programmato': 'scheduledStart',
        'Fine programmata': 'scheduledEnd',
        'Durata': 'duration',
        'Durata nominale': 'nominalDuration',
        'Chilometri': 'kilometers',
        'Chilometri calcolati': 'calculatedKilometers',
        'Valore': 'value',
        'Note': 'notes',
        'Tipo di appuntamento': 'appointmentType',
        'Categoria di servizio': 'serviceCategory',
        'Tipo di servizio': 'serviceType',
        'Costo 1': 'cost1',
        'Costo 2': 'cost2',
        'Costo 3': 'cost3',
        'Tipo di categoria': 'categoryType',
        'Aggregazione': 'aggregation'
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

          headers.forEach((header, colIndex) => {
            const dbField = columnMapping[header];
            if (dbField) {
              const value = row[colIndex];
              rowData[dbField] = value === null || value === undefined ? '' : String(value);
            }
          });

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
        columnMapping: Object.entries(columnMapping).filter(([key]) => headers.includes(key))
      });

    } catch (error: any) {
      console.error("Error processing Excel preview:", error);
      res.status(500).json({ 
        message: "Failed to process Excel preview",
        error: error.message
      });
    }
  });

  app.post('/api/data/import', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
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

            // Map each column to our database fields
            headers.forEach((header, colIndex) => {
              const dbField = columnMapping[header];
              if (dbField) {
                // Convert to string and handle empty/null values
                const value = row[colIndex];
                rowData[dbField] = value === null || value === undefined ? '' : String(value);
              }
            });
            
            // Log first few rows to debug
            if (index < 3) {
              console.log(`Row ${index + 2} data:`, rowData);
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
            uniqueClients.set(clientKey, {
              firstName,
              lastName: lastName || '',
              email: row.email || '',
              phone: row.primaryPhone || row.mobilePhone || '',
              address: row.homeAddress || '',
              dateOfBirth: row.dateOfBirth || null,
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
  app.get('/api/data/import/:id', isAuthenticated, async (req, res) => {
    try {
      const importData = await storage.getExcelDataByImportId(req.params.id);
      res.json(importData);
    } catch (error) {
      console.error("Error fetching import data:", error);
      res.status(500).json({ message: "Failed to fetch import data" });
    }
  });

  app.get('/api/data/import/:id/sync-status', isAuthenticated, async (req, res) => {
    try {
      const syncStatus = await storage.getImportSyncStatus(req.params.id);
      res.json(syncStatus);
    } catch (error) {
      console.error("Error fetching sync status:", error);
      res.status(500).json({ message: "Failed to fetch sync status" });
    }
  });

  // Manual client sync endpoint
  app.post("/api/imports/:id/sync-clients", isAuthenticated, async (req, res) => {
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
      
      // Get all budget categories to match with allocations
      const categories = await storage.getBudgetCategories();
      
      // Update available balance based on allocations
      const updatedConfigs = await Promise.all(configs.map(async config => {
        // Match budget code to category name
        const categoryMap: Record<string, string> = {
          'HCPQ': 'Personal Care Services',
          'HCPB': 'Home Support Services',
          'FP_QUALIFICATA': 'Medical Assistance',
          'LEGGE162': 'Law 162',
          'RAC': 'RAC',
          'ASSISTENZA_DIRETTA': 'Direct Assistance',
          'FP_BASE': 'Basic Support',
          'SADQ': 'Social Support',
          'SADB': 'Basic Social Support',
          'EDUCATIVA': 'Educational Support'
        };
        
        const categoryName = categoryMap[config.budgetCode];
        const category = categories.find(c => c.name === categoryName);
        
        if (category) {
          const allocation = allAllocations.find(a => a.categoryId === category.id);
          if (allocation) {
            const remaining = parseFloat(allocation.allocatedAmount) - parseFloat(allocation.usedAmount);
            console.log(`Updating ${config.budgetCode} balance from ${config.availableBalance} to ${remaining.toFixed(2)}`);
            return {
              ...config,
              availableBalance: remaining.toFixed(2)
            };
          }
        }
        
        return config;
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

  const httpServer = createServer(app);
  return httpServer;
}
