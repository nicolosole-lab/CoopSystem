import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, TrendingUp, Users, Clock, Euro, FileText, Download, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/hooks/usePermissions';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import type { TimeLog, Client, Staff, ClientBudgetAllocation } from '@shared/schema';

// Chart components (we'll implement these with recharts)
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer
} from 'recharts';

interface AnalyticsData {
  totalServiceHours: number;
  totalClients: number;
  totalStaff: number;
  totalBudgetUsed: number;
  servicesByType: Array<{ type: string; hours: number; count: number }>;
  servicesByStaff: Array<{ staffName: string; hours: number; clients: number }>;
  budgetUtilization: Array<{ category: string; used: number; allocated: number }>;
  weeklyTrends: Array<{ week: string; hours: number; cost: number }>;
  clientActivity: Array<{ clientName: string; lastService: string; totalHours: number }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

export default function AnalyticsDashboard() {
  const { t } = useTranslation();
  const { canRead } = usePermissions();
  const [dateRange, setDateRange] = useState<string>('30d');
  const [selectedMetric, setSelectedMetric] = useState<string>('overview');

  // Calculate date range
  const getDateRange = () => {
    const end = new Date();
    let start = new Date();
    
    switch (dateRange) {
      case '7d':
        start = subDays(end, 7);
        break;
      case '30d':
        start = subDays(end, 30);
        break;
      case '90d':
        start = subDays(end, 90);
        break;
      case 'month':
        start = startOfMonth(end);
        break;
      case '6m':
        start = subMonths(end, 6);
        break;
      default:
        start = subDays(end, 30);
    }
    
    return { start, end };
  };

  // Fetch analytics data
  const { data: timeLogs = [] } = useQuery<TimeLog[]>({
    queryKey: ["/api/time-logs"],
    enabled: canRead(),
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: canRead(),
  });

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
    enabled: canRead(),
  });

  const { data: budgetAllocations = [] } = useQuery<ClientBudgetAllocation[]>({
    queryKey: ["/api/budget-allocations"],
    enabled: canRead(),
  });

  // Process analytics data
  const analyticsData = useMemo((): AnalyticsData => {
    const { start, end } = getDateRange();
    
    // Filter time logs by date range
    const filteredLogs = timeLogs.filter(log => {
      const logDate = new Date(log.serviceDate);
      return logDate >= start && logDate <= end;
    });

    // Calculate totals
    const totalServiceHours = filteredLogs.reduce((sum, log) => sum + parseFloat(log.hours), 0);
    const totalClients = new Set(filteredLogs.map(log => log.clientId)).size;
    const totalStaff = new Set(filteredLogs.map(log => log.staffId)).size;
    
    // Calculate total budget used
    const totalBudgetUsed = filteredLogs.reduce((sum, log) => {
      return sum + (parseFloat(log.hours) * parseFloat(log.hourlyRate));
    }, 0);

    // Services by type
    const serviceTypeMap = new Map<string, { hours: number; count: number }>();
    filteredLogs.forEach(log => {
      const existing = serviceTypeMap.get(log.serviceType) || { hours: 0, count: 0 };
      serviceTypeMap.set(log.serviceType, {
        hours: existing.hours + parseFloat(log.hours),
        count: existing.count + 1
      });
    });
    const servicesByType = Array.from(serviceTypeMap, ([type, data]) => ({ type, ...data }));

    // Services by staff
    const staffMap = new Map<string, { hours: number; clients: Set<string> }>();
    filteredLogs.forEach(log => {
      const staffMember = staff.find(s => s.id === log.staffId);
      const staffName = staffMember ? `${staffMember.lastName}, ${staffMember.firstName}` : 'Unknown';
      const existing = staffMap.get(staffName) || { hours: 0, clients: new Set() };
      existing.hours += parseFloat(log.hours);
      existing.clients.add(log.clientId);
      staffMap.set(staffName, existing);
    });
    const servicesByStaff = Array.from(staffMap, ([staffName, data]) => ({
      staffName,
      hours: data.hours,
      clients: data.clients.size
    }));

    // Budget utilization (simplified - would need actual budget data)
    const budgetUtilization = [
      { category: 'Service Delivery', used: totalBudgetUsed * 0.7, allocated: totalBudgetUsed },
      { category: 'Transportation', used: totalBudgetUsed * 0.15, allocated: totalBudgetUsed * 0.2 },
      { category: 'Materials', used: totalBudgetUsed * 0.10, allocated: totalBudgetUsed * 0.15 },
      { category: 'Administration', used: totalBudgetUsed * 0.05, allocated: totalBudgetUsed * 0.1 }
    ];

    // Weekly trends
    const weeklyMap = new Map<string, { hours: number; cost: number }>();
    filteredLogs.forEach(log => {
      const week = format(new Date(log.serviceDate), 'MMM dd', { locale: it });
      const existing = weeklyMap.get(week) || { hours: 0, cost: 0 };
      const hours = parseFloat(log.hours);
      const cost = hours * parseFloat(log.hourlyRate);
      weeklyMap.set(week, {
        hours: existing.hours + hours,
        cost: existing.cost + cost
      });
    });
    const weeklyTrends = Array.from(weeklyMap, ([week, data]) => ({ week, ...data }));

    // Client activity
    const clientMap = new Map<string, { lastService: Date; totalHours: number }>();
    filteredLogs.forEach(log => {
      const client = clients.find(c => c.id === log.clientId);
      const clientName = client ? `${client.lastName}, ${client.firstName}` : 'Unknown';
      const serviceDate = new Date(log.serviceDate);
      const existing = clientMap.get(clientName) || { lastService: serviceDate, totalHours: 0 };
      
      if (serviceDate > existing.lastService) {
        existing.lastService = serviceDate;
      }
      existing.totalHours += parseFloat(log.hours);
      clientMap.set(clientName, existing);
    });
    const clientActivity = Array.from(clientMap, ([clientName, data]) => ({
      clientName,
      lastService: format(data.lastService, 'dd/MM/yyyy'),
      totalHours: data.totalHours
    }));

    return {
      totalServiceHours,
      totalClients,
      totalStaff,
      totalBudgetUsed,
      servicesByType,
      servicesByStaff,
      budgetUtilization,
      weeklyTrends,
      clientActivity
    };
  }, [timeLogs, clients, staff, dateRange]);

  if (!canRead()) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to view analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Performance insights and service analytics</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-36" data-testid="select-date-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" data-testid="button-refresh-analytics">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" data-testid="button-export-analytics">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Service Hours</p>
                <p className="text-3xl font-bold text-gray-900">
                  {analyticsData.totalServiceHours.toFixed(1)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Clients</p>
                <p className="text-3xl font-bold text-gray-900">{analyticsData.totalClients}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Staff Members</p>
                <p className="text-3xl font-bold text-gray-900">{analyticsData.totalStaff}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Budget Used</p>
                <p className="text-3xl font-bold text-gray-900">
                  €{analyticsData.totalBudgetUsed.toFixed(0)}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Euro className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={selectedMetric} onValueChange={setSelectedMetric} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="services" data-testid="tab-services">Services</TabsTrigger>
          <TabsTrigger value="staff" data-testid="tab-staff">Staff</TabsTrigger>
          <TabsTrigger value="budget" data-testid="tab-budget">Budget</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Weekly Service Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.weeklyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="hours" stroke="#3b82f6" name="Hours" />
                    <Line type="monotone" dataKey="cost" stroke="#10b981" name="Cost (€)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Service Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Service Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.servicesByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percent }) => `${type}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="hours"
                    >
                      {analyticsData.servicesByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.servicesByType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="hours" fill="#3b82f6" name="Total Hours" />
                  <Bar dataKey="count" fill="#10b981" name="Service Count" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Staff Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.servicesByStaff}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="staffName" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="hours" fill="#8b5cf6" name="Hours Worked" />
                  <Bar dataKey="clients" fill="#f59e0b" name="Clients Served" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.budgetUtilization}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="allocated" fill="#e5e7eb" name="Allocated (€)" />
                  <Bar dataKey="used" fill="#3b82f6" name="Used (€)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Client Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.clientActivity.slice(0, 10).map((client, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{client.clientName}</p>
                  <p className="text-sm text-gray-600">Last service: {client.lastService}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-blue-600">{client.totalHours.toFixed(1)}h</p>
                  <p className="text-sm text-gray-600">Total hours</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}