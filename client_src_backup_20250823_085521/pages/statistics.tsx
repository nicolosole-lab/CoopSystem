import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { 
  TrendingUp, TrendingDown, Users, Clock, Euro, 
  Calendar, Award, Target, Activity, AlertCircle,
  Download, Filter, ChevronUp, ChevronDown, Percent,
  UserCheck, Sparkles
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Link } from "wouter";

interface StatisticsData {
  // Overview stats
  totalRevenue: number;
  totalHours: number;
  totalServices: number;
  activeClients: number;
  activeStaff: number;
  avgServiceDuration: number;
  
  // Trends
  revenueByMonth: Array<{ month: string; revenue: number; hours: number; services: number }>;
  servicesByWeek: Array<{ week: string; count: number }>;
  
  // Top performers
  topClients: Array<{ id: string; name: string; revenue: number; hours: number; services: number }>;
  topStaff: Array<{ id: string; name: string; revenue: number; hours: number; services: number; rating?: number }>;
  
  // Service breakdown
  servicesByType: Array<{ type: string; count: number; revenue: number; percentage: number }>;
  servicesByCategory: Array<{ category: string; count: number; hours: number }>;
  
  // Budget utilization
  budgetUtilization: Array<{ 
    category: string; 
    allocated: number; 
    used: number; 
    percentage: number 
  }>;
  
  // Comparisons
  monthOverMonth: {
    revenue: { current: number; previous: number; change: number };
    services: { current: number; previous: number; change: number };
    hours: { current: number; previous: number; change: number };
  };
}

// Chart colors
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default function Statistics() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState("last30days");
  const [selectedMetric, setSelectedMetric] = useState("revenue");

  // Fetch comprehensive statistics
  const { data: stats, isLoading } = useQuery<StatisticsData>({
    queryKey: ['/api/statistics/comprehensive', dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/statistics/comprehensive?range=${dateRange}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch statistics');
      return response.json();
    }
  });

  // Calculate growth percentage with safety check
  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(value);
  };

  // Metric card component
  const MetricCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    color = "blue",
    suffix = "" 
  }: { 
    title: string; 
    value: number | string; 
    change?: number; 
    icon: any;
    color?: string;
    suffix?: string;
  }) => {
    const colorClasses = {
      blue: "bg-blue-100 text-blue-600",
      green: "bg-green-100 text-green-600",
      yellow: "bg-yellow-100 text-yellow-600",
      purple: "bg-purple-100 text-purple-600",
      red: "bg-red-100 text-red-600",
    };

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold mt-2">
                {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
              </p>
              {change !== undefined && (
                <div className="flex items-center mt-2">
                  {change > 0 ? (
                    <ChevronUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(change)}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">{t('statistics.vsLastPeriod')}</span>
                </div>
              )}
            </div>
            <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">{t('statistics.noData')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            {t('statistics.title')}
          </h1>
          <p className="text-gray-600 mt-2">
            {t('statistics.description')}
          </p>
        </div>
        <div className="flex gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last7days">{t('statistics.dateRanges.last7days')}</SelectItem>
              <SelectItem value="last30days">{t('statistics.dateRanges.last30days')}</SelectItem>
              <SelectItem value="last3months">{t('statistics.dateRanges.last3months')}</SelectItem>
              <SelectItem value="last6months">{t('statistics.dateRanges.last6months')}</SelectItem>
              <SelectItem value="lastyear">{t('statistics.dateRanges.lastyear')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {t('statistics.exportReport')}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard
          title={t('statistics.metrics.totalRevenue')}
          value={formatCurrency(stats.totalRevenue)}
          change={parseFloat(calculateGrowth(
            stats.monthOverMonth.revenue.current,
            stats.monthOverMonth.revenue.previous
          ))}
          icon={Euro}
          color="green"
        />
        <MetricCard
          title={t('statistics.metrics.totalHours')}
          value={stats.totalHours}
          change={parseFloat(calculateGrowth(
            stats.monthOverMonth.hours.current,
            stats.monthOverMonth.hours.previous
          ))}
          icon={Clock}
          color="blue"
          suffix=" hrs"
        />
        <MetricCard
          title={t('statistics.metrics.servicesDelivered')}
          value={stats.totalServices}
          change={parseFloat(calculateGrowth(
            stats.monthOverMonth.services.current,
            stats.monthOverMonth.services.previous
          ))}
          icon={Activity}
          color="purple"
        />
        <MetricCard
          title={t('statistics.metrics.activeClients')}
          value={stats.activeClients}
          icon={Users}
          color="yellow"
        />
        <MetricCard
          title={t('statistics.metrics.activeStaff')}
          value={stats.activeStaff}
          icon={Award}
          color="red"
        />
      </div>

      {/* Quick Actions */}
      <Card className="bg-white shadow-sm border-0">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            {t('statistics.quickActions.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link href="/time-tracking">
              <div className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group border border-gray-200">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <span className="text-gray-700 group-hover:text-gray-900 font-medium">{t('statistics.quickActions.logHours')}</span>
                  <p className="text-xs text-gray-500">{t('statistics.quickActions.trackServiceTime')}</p>
                </div>
              </div>
            </Link>

            <Link href="/clients">
              <div className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group border border-gray-200">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mr-3">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <span className="text-gray-700 group-hover:text-gray-900 font-medium">{t('statistics.quickActions.manageClients')}</span>
                  <p className="text-xs text-gray-500">{t('statistics.quickActions.viewEditClients')}</p>
                </div>
              </div>
            </Link>

            <Link href="/staff">
              <div className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group border border-gray-200">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center mr-3">
                  <UserCheck className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <span className="text-gray-700 group-hover:text-gray-900 font-medium">{t('statistics.quickActions.manageStaff')}</span>
                  <p className="text-xs text-gray-500">{t('statistics.quickActions.staffAssignments')}</p>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">{t('statistics.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="revenue">{t('statistics.tabs.revenue')}</TabsTrigger>
          <TabsTrigger value="clients">{t('statistics.tabs.clients')}</TabsTrigger>
          <TabsTrigger value="staff">{t('statistics.tabs.staff')}</TabsTrigger>
          <TabsTrigger value="services">{t('statistics.tabs.services')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  {t('statistics.charts.revenueTrend')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats.revenueByMonth}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10B981" 
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Service Volume */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  {t('statistics.charts.serviceVolumeTrend')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="services" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      name={t('statistics.charts.services')}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="hours" 
                      stroke="#8B5CF6" 
                      strokeWidth={2}
                      name={t('statistics.charts.hours')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Service Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  {t('statistics.charts.serviceTypeDistribution')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.servicesByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percentage }) => `${percentage.toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {stats.servicesByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Budget Utilization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5 text-yellow-600" />
                  {t('statistics.charts.budgetUtilization')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.budgetUtilization.slice(0, 5).map((budget, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{budget.category}</span>
                        <span className="text-gray-600">
                          {formatCurrency(budget.used)} / {formatCurrency(budget.allocated)}
                        </span>
                      </div>
                      <Progress 
                        value={Number(budget.percentage)} 
                        className="h-2"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {Number(budget.percentage).toFixed(1)}% {t('statistics.charts.utilized')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t('statistics.charts.monthlyRevenueAnalysis')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={stats.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#10B981" name={t('statistics.charts.revenueEuro')} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('statistics.charts.revenueByServiceType')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.servicesByType.map((service, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{service.type}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(service.revenue)}</p>
                        <p className="text-xs text-gray-500">{Number(service.percentage).toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('statistics.charts.periodComparison')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                    <p className="text-sm text-gray-600">{t('statistics.charts.currentPeriodRevenue')}</p>
                    <p className="text-2xl font-bold text-green-700">
                      {formatCurrency(stats.monthOverMonth.revenue.current)}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">{t('statistics.charts.previousPeriodRevenue')}</p>
                    <p className="text-xl font-semibold text-gray-700">
                      {formatCurrency(stats.monthOverMonth.revenue.previous)}
                    </p>
                  </div>
                  <div className="flex items-center justify-center p-4">
                    {Number(stats.monthOverMonth.revenue.change) > 0 ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <TrendingUp className="h-8 w-8" />
                        <span className="text-2xl font-bold">
                          +{Number(stats.monthOverMonth.revenue.change).toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600">
                        <TrendingDown className="h-8 w-8" />
                        <span className="text-2xl font-bold">
                          {Number(stats.monthOverMonth.revenue.change).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Top Clients Tab */}
        <TabsContent value="clients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                {t('statistics.charts.topClientsByRevenue')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topClients.map((client, index) => (
                  <div key={client.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-bold">{index + 1}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{client.name}</p>
                      <div className="flex gap-4 mt-1 text-sm text-gray-600">
                        <span>{client.services} {t('statistics.charts.servicesLower')}</span>
                        <span>{client.hours} {t('statistics.charts.hoursLower')}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(client.revenue)}</p>
                      <Badge variant="outline" className="mt-1">
                        {t('statistics.charts.top')} {index + 1}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('statistics.charts.clientRevenueDistribution')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.topClients.slice(0, 5)} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="revenue" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('statistics.charts.serviceHoursByClient')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={stats.topClients.slice(0, 6)}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" />
                    <PolarRadiusAxis />
                    <Radar 
                      name={t('statistics.charts.hours')} 
                      dataKey="hours" 
                      stroke="#10B981" 
                      fill="#10B981" 
                      fillOpacity={0.6} 
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Top Staff Tab */}
        <TabsContent value="staff" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-600" />
                {t('statistics.charts.topStaffPerformance')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topStaff.map((staff, index) => (
                  <div key={staff.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        {index === 0 ? (
                          <Award className="h-5 w-5 text-yellow-600" />
                        ) : (
                          <span className="text-purple-600 font-bold">{index + 1}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{staff.name}</p>
                      <div className="flex gap-4 mt-1 text-sm text-gray-600">
                        <span>{staff.services} services</span>
                        <span>{staff.hours} hours</span>
                        {staff.rating && (
                          <span className="flex items-center gap-1">
                            ⭐ {Number(staff.rating).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(staff.revenue)}</p>
                      {index === 0 && (
                        <Badge className="mt-1 bg-gradient-to-r from-yellow-400 to-yellow-600">
                          {t('statistics.charts.topPerformer')}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('statistics.charts.staffPerformanceMetrics')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.topStaff.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hours" fill="#8B5CF6" name={t('statistics.charts.hours')} />
                    <Bar dataKey="services" fill="#14B8A6" name={t('statistics.charts.services')} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('statistics.charts.revenueGenerationByStaff')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.topStaff.slice(0, 5)}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="revenue"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {stats.topStaff.slice(0, 5).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('statistics.charts.averageServiceDuration')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-4xl font-bold text-blue-600">
                    {Number(stats.avgServiceDuration).toFixed(1)}
                  </p>
                  <p className="text-gray-600 mt-2">{t('statistics.charts.hoursPerService')}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('statistics.charts.serviceCategories')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.servicesByCategory.slice(0, 5).map((category, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{category.category}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{category.count}</Badge>
                        <span className="text-xs text-gray-500">{category.hours}h</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('statistics.charts.weeklyServicePattern')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={stats.servicesByWeek}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#10B981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Service Type Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Service Type</th>
                      <th className="text-right p-3">Count</th>
                      <th className="text-right p-3">Revenue</th>
                      <th className="text-right p-3">Avg. Revenue</th>
                      <th className="text-right p-3">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.servicesByType.map((service, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{service.type}</td>
                        <td className="text-right p-3">{service.count}</td>
                        <td className="text-right p-3">{formatCurrency(service.revenue)}</td>
                        <td className="text-right p-3">
                          {formatCurrency(service.revenue / service.count)}
                        </td>
                        <td className="text-right p-3">
                          <Badge variant="outline">{Number(service.percentage).toFixed(1)}%</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}