import { Request, Response } from 'express';
import { storage } from './storage';

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Analytics endpoint for dashboard data
export const getAnalyticsData = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get query parameters for filtering
    const { startDate, endDate, clientId, staffId, serviceType } = req.query;

    // Fetch all time logs - storage doesn't support filtering, so we'll filter in memory
    const timeLogs = await storage.getTimeLogs();

    // Fetch related data
    const clients = await storage.getClients();
    const staff = await storage.getStaff();
    const budgetAllocations = await storage.getClientBudgetAllocations({ clientId: '' });

    // Calculate analytics metrics
    const analytics = {
      totalServiceHours: timeLogs.reduce((sum, log) => sum + parseFloat(log.hours), 0),
      totalClients: new Set(timeLogs.map(log => log.clientId)).size,
      totalStaff: new Set(timeLogs.map(log => log.staffId)).size,
      totalCost: timeLogs.reduce((sum, log) => sum + (parseFloat(log.hours) * parseFloat(log.hourlyRate)), 0),
      
      // Service distribution
      servicesByType: timeLogs.reduce((acc, log) => {
        const type = log.serviceType;
        if (!acc[type]) {
          acc[type] = { hours: 0, count: 0, cost: 0 };
        }
        acc[type].hours += parseFloat(log.hours);
        acc[type].count += 1;
        acc[type].cost += parseFloat(log.hours) * parseFloat(log.hourlyRate);
        return acc;
      }, {} as Record<string, { hours: number; count: number; cost: number }>),

      // Staff performance
      staffPerformance: timeLogs.reduce((acc, log) => {
        const staffMember = staff.find((s: any) => s.id === log.staffId);
        const staffName = staffMember ? `${staffMember.lastName}, ${staffMember.firstName}` : 'Unknown';
        
        if (!acc[staffName]) {
          acc[staffName] = { 
            hours: 0, 
            clients: new Set(), 
            services: 0,
            earnings: 0
          };
        }
        
        acc[staffName].hours += parseFloat(log.hours);
        acc[staffName].clients.add(log.clientId);
        acc[staffName].services += 1;
        acc[staffName].earnings += parseFloat(log.hours) * parseFloat(log.hourlyRate);
        
        return acc;
      }, {} as Record<string, { hours: number; clients: Set<string>; services: number; earnings: number }>),

      // Client activity
      clientActivity: timeLogs.reduce((acc, log) => {
        const client = clients.find(c => c.id === log.clientId);
        const clientName = client ? `${client.lastName}, ${client.firstName}` : 'Unknown';
        
        if (!acc[clientName]) {
          acc[clientName] = {
            hours: 0,
            services: 0,
            lastService: log.serviceDate,
            cost: 0
          };
        }
        
        acc[clientName].hours += parseFloat(log.hours);
        acc[clientName].services += 1;
        acc[clientName].cost += parseFloat(log.hours) * parseFloat(log.hourlyRate);
        
        if (new Date(log.serviceDate) > new Date(acc[clientName].lastService)) {
          acc[clientName].lastService = log.serviceDate;
        }
        
        return acc;
      }, {} as Record<string, { hours: number; services: number; lastService: string; cost: number }>),

      // Weekly trends (last 12 weeks)
      weeklyTrends: generateWeeklyTrends(timeLogs),
      
      // Budget utilization
      budgetUtilization: calculateBudgetUtilization(budgetAllocations, timeLogs)
    };

    // Convert staff performance Set to number for JSON serialization
    const serializedStaffPerformance = Object.fromEntries(
      Object.entries(analytics.staffPerformance).map(([key, value]) => [
        key,
        { ...value, clients: value.clients.size }
      ])
    );

    res.json({
      ...analytics,
      staffPerformance: serializedStaffPerformance
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
};

// Generate report endpoint
export const generateReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { templateId, parameters } = req.body;

    // Mock report generation (in a real system, this would generate actual PDFs/Excel files)
    const reportId = `report_${Date.now()}`;
    const reportName = getReportName(templateId, parameters);
    
    // Simulate report generation process
    setTimeout(async () => {
      // In a real implementation, you would:
      // 1. Generate the actual report file (PDF/Excel)
      // 2. Store it in object storage
      // 3. Send notification to user
      // 4. Update report status in database
      
      console.log(`Report ${reportId} generated successfully`);
    }, 5000);

    res.json({
      id: reportId,
      name: reportName,
      status: 'generating',
      estimatedCompletion: new Date(Date.now() + 30000).toISOString()
    });

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

// Get generated reports
export const getGeneratedReports = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Mock data - in a real system, this would come from database
    const reports = [
      {
        id: '1',
        name: 'Service Summary - December 2024',
        type: 'service',
        format: 'pdf',
        generatedAt: '2024-12-15T10:30:00Z',
        generatedBy: req.user.email,
        downloadUrl: '/api/reports/download/1',
        status: 'completed'
      },
      {
        id: '2',
        name: 'Financial Performance - Q4 2024',
        type: 'financial',
        format: 'excel',
        generatedAt: '2024-12-14T15:45:00Z',
        generatedBy: req.user.email,
        downloadUrl: '/api/reports/download/2',
        status: 'completed'
      }
    ];

    res.json(reports);

  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

// Helper functions
function generateWeeklyTrends(timeLogs: any[]) {
  const weeks = new Map<string, { hours: number; cost: number; services: number }>();
  
  timeLogs.forEach(log => {
    const date = new Date(log.serviceDate);
    // Create new date object to avoid modifying original
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay() + 1); // Monday
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeks.has(weekKey)) {
      weeks.set(weekKey, { hours: 0, cost: 0, services: 0 });
    }
    
    const week = weeks.get(weekKey)!;
    week.hours += parseFloat(log.hours);
    week.cost += parseFloat(log.hours) * parseFloat(log.hourlyRate);
    week.services += 1;
  });
  
  return Array.from(weeks.entries())
    .map(([week, data]) => ({ week, ...data }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-12); // Last 12 weeks
}

function calculateBudgetUtilization(budgetAllocations: any[], timeLogs: any[]) {
  const utilization = new Map<string, { allocated: number; used: number }>();
  
  budgetAllocations.forEach(allocation => {
    const category = allocation.budgetCategory || 'General';
    if (!utilization.has(category)) {
      utilization.set(category, { allocated: 0, used: 0 });
    }
    utilization.get(category)!.allocated += parseFloat(allocation.allocatedAmount);
  });
  
  timeLogs.forEach(log => {
    const category = 'Service Delivery'; // Simplified - would map based on service type
    if (!utilization.has(category)) {
      utilization.set(category, { allocated: 0, used: 0 });
    }
    utilization.get(category)!.used += parseFloat(log.hours) * parseFloat(log.hourlyRate);
  });
  
  return Array.from(utilization.entries()).map(([category, data]) => ({
    category,
    ...data
  }));
}

function getReportName(templateId: string, parameters: any): string {
  const templates: Record<string, string> = {
    'service-summary': 'Service Summary Report',
    'financial-performance': 'Financial Performance Report',
    'staff-productivity': 'Staff Productivity Report',
    'client-service-history': 'Client Service History',
    'monthly-summary': 'Monthly Operations Summary'
  };
  
  const baseName = templates[templateId] || 'Custom Report';
  const dateRange = parameters.startDate && parameters.endDate 
    ? ` (${parameters.startDate} to ${parameters.endDate})`
    : '';
  
  return `${baseName}${dateRange}`;
}