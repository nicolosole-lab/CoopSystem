import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Euro, Calendar, Plus, Edit, Trash2, Search, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { TimeLogForm } from "@/components/forms/time-log-form";
import type { TimeLog, Client, Staff } from "@shared/schema";
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

export default function TimeTracking() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTimeLog, setSelectedTimeLog] = useState<TimeLog | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [selectedService, setSelectedService] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: timeLogs = [], isLoading: timeLogsLoading, error: timeLogsError } = useQuery<TimeLog[]>({
    queryKey: ["/api/time-logs"],
    retry: false,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    retry: false,
  });

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
    retry: false,
  });

  const deleteTimeLogMutation = useMutation({
    mutationFn: async (timeLogId: string) => {
      await apiRequest("DELETE", `/api/time-logs/${timeLogId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: t('common.success'),
        description: t('timeTracking.deleteSuccess'),
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete time log",
        variant: "destructive",
      });
    },
  });

  if (timeLogsError && isUnauthorizedError(timeLogsError as Error)) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
    return null;
  }

  // Calculate quick stats
  const today = new Date();
  const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);

  const todayLogs = timeLogs.filter(log => {
    const logDate = new Date(log.serviceDate);
    return logDate.toDateString() === today.toDateString();
  });

  const weekLogs = timeLogs.filter(log => {
    const logDate = new Date(log.serviceDate);
    return logDate >= startOfWeek && logDate <= endOfWeek;
  });

  const todayHours = todayLogs.reduce((sum, log) => sum + parseFloat(log.hours), 0);
  const weekHours = weekLogs.reduce((sum, log) => sum + parseFloat(log.hours), 0);
  const weekRevenue = weekLogs.reduce((sum, log) => sum + parseFloat(log.totalCost), 0);

  const getServiceTypeBadge = (serviceType: string) => {
    const types = {
      "personal-care": { label: "Personal Care", className: "bg-primary/10 text-primary" },
      "home-support": { label: "Home Support", className: "bg-secondary/10 text-secondary" },
      "medical-assistance": { label: "Medical Assistance", className: "bg-accent/10 text-accent" },
      "social-support": { label: "Social Support", className: "bg-green-100 text-green-800" },
      "transportation": { label: "Transportation", className: "bg-orange-100 text-orange-800" },
    };
    const type = types[serviceType as keyof typeof types] || { label: serviceType, className: "bg-slate-100 text-slate-800" };
    return <Badge className={type.className}>{type.label}</Badge>;
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : "Unknown Client";
  };

  const getStaffName = (staffId: string) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : "Unknown Staff";
  };

  const handleEdit = (timeLog: TimeLog) => {
    setSelectedTimeLog(timeLog);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (timeLogId: string) => {
    if (confirm(t('timeTracking.confirmDelete'))) {
      deleteTimeLogMutation.mutate(timeLogId);
    }
  };

  const handleFormSuccess = () => {
    setIsAddDialogOpen(false);
    setIsEditDialogOpen(false);
    setSelectedTimeLog(null);
  };

  // Filter and search logic
  const filteredTimeLogs = useMemo(() => {
    let filtered = [...timeLogs];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(log => {
        const clientName = getClientName(log.clientId).toLowerCase();
        const staffName = getStaffName(log.staffId).toLowerCase();
        const serviceType = log.serviceType.toLowerCase();
        const notes = (log.notes || '').toLowerCase();
        
        return clientName.includes(search) || 
               staffName.includes(search) || 
               serviceType.includes(search) ||
               notes.includes(search);
      });
    }

    // Client filter
    if (selectedClient !== "all") {
      filtered = filtered.filter(log => log.clientId === selectedClient);
    }

    // Staff filter
    if (selectedStaff !== "all") {
      filtered = filtered.filter(log => log.staffId === selectedStaff);
    }

    // Service type filter
    if (selectedService !== "all") {
      filtered = filtered.filter(log => log.serviceType === selectedService);
    }

    // Date filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateFilter === "today") {
      filtered = filtered.filter(log => {
        const logDate = new Date(log.serviceDate);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === today.getTime();
      });
    } else if (dateFilter === "week") {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(log => {
        const logDate = new Date(log.serviceDate);
        return logDate >= weekAgo && logDate <= today;
      });
    } else if (dateFilter === "month") {
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(log => {
        const logDate = new Date(log.serviceDate);
        return logDate >= monthAgo && logDate <= today;
      });
    } else if (dateFilter === "custom" && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      filtered = filtered.filter(log => {
        const logDate = new Date(log.serviceDate);
        return logDate >= start && logDate <= end;
      });
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());

    return filtered;
  }, [timeLogs, searchTerm, selectedClient, selectedStaff, selectedService, dateFilter, customStartDate, customEndDate]);

  // Pagination logic
  const totalPages = Math.ceil(filteredTimeLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTimeLogs = filteredTimeLogs.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedClient, selectedStaff, selectedService, dateFilter, customStartDate, customEndDate, itemsPerPage]);

  // Get unique service types
  const serviceTypes = useMemo(() => {
    const types = new Set(timeLogs.map(log => log.serviceType));
    return Array.from(types);
  }, [timeLogs]);

  if (timeLogsLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2" data-testid="text-time-tracking-title">
            {t('timeTracking.title')}
          </h2>
          <p className="text-slate-600">{t('timeTracking.description')}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mt-4 sm:mt-0 bg-primary hover:bg-primary/90" data-testid="button-log-hours">
              <Plus className="mr-2 h-4 w-4" />
              {t('timeTracking.logHours')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('timeTracking.logServiceHours')}</DialogTitle>
            </DialogHeader>
            <TimeLogForm onSuccess={handleFormSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Clock className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{t('timeTracking.todayHours')}</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-2" data-testid="text-today-hours">
              {todayHours.toFixed(1)}
            </p>
            <p className="text-sm text-slate-600">hours logged today</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                <Calendar className="text-secondary" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{t('timeTracking.weekHours')}</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-2" data-testid="text-week-hours">
              {weekHours.toFixed(0)}
            </p>
            <p className="text-sm text-slate-600">hours across all clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Euro className="text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{t('timeTracking.weekRevenue')}</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-2" data-testid="text-week-revenue">
              €{weekRevenue.toFixed(2)}
            </p>
            <p className="text-sm text-slate-600">total revenue this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by client, staff, service or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Client Filter */}
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.firstName} {client.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Staff Filter */}
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger>
                <SelectValue placeholder="All Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {staff.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.firstName} {member.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Service Type Filter */}
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger>
                <SelectValue placeholder="All Services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {serviceTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range */}
          {dateFilter === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Results Count and Clear Filters */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {paginatedTimeLogs.length} of {filteredTimeLogs.length} records
              {filteredTimeLogs.length !== timeLogs.length && ` (filtered from ${timeLogs.length} total)`}
            </p>
            {(searchTerm || selectedClient !== "all" || selectedStaff !== "all" || 
              selectedService !== "all" || dateFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedClient("all");
                  setSelectedStaff("all");
                  setSelectedService("all");
                  setDateFilter("all");
                  setCustomStartDate("");
                  setCustomEndDate("");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Time Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('timeTracking.recentLogs')} ({filteredTimeLogs.length})</CardTitle>
            {/* Items per page selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">per page</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {timeLogs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-600" data-testid="text-no-time-logs">
                {t('timeTracking.noLogsFound')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Date</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Start Time</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">End Time</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Client</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Staff</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Service</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Hours</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Cost</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedTimeLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50" data-testid={`row-time-log-${log.id}`}>
                      <td className="py-4 px-6 text-sm text-slate-900" data-testid={`text-log-date-${log.id}`}>
                        {format(new Date(log.serviceDate), 'dd/MM/yyyy')}
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-900" data-testid={`text-log-start-${log.id}`}>
                        {log.scheduledStartTime ? new Date(log.scheduledStartTime).toLocaleString() : '-'}
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-900" data-testid={`text-log-end-${log.id}`}>
                        {log.scheduledEndTime ? new Date(log.scheduledEndTime).toLocaleString() : '-'}
                      </td>
                      <td className="py-4 px-6 text-sm" data-testid={`text-log-client-${log.id}`}>
                        <Link href={`/clients/${log.clientId}`} className="text-blue-600 hover:underline">
                          {getClientName(log.clientId)}
                        </Link>
                      </td>
                      <td className="py-4 px-6 text-sm" data-testid={`text-log-staff-${log.id}`}>
                        <Link href={`/staff/${log.staffId}`} className="text-blue-600 hover:underline">
                          {getStaffName(log.staffId)}
                        </Link>
                      </td>
                      <td className="py-4 px-6" data-testid={`badge-log-service-${log.id}`}>
                        {getServiceTypeBadge(log.serviceType)}
                      </td>
                      <td className="py-4 px-6 text-sm font-medium text-slate-900" data-testid={`text-log-hours-${log.id}`}>
                        {parseFloat(log.hours).toFixed(1)}
                      </td>
                      <td className="py-4 px-6 text-sm font-medium text-green-600" data-testid={`text-log-cost-${log.id}`}>
                        €{parseFloat(log.totalCost).toFixed(2)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(log)}
                            data-testid={`button-edit-log-${log.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(log.id)}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-log-${log.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination Controls */}
          {filteredTimeLogs.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredTimeLogs.length)} of {filteredTimeLogs.length} entries
              </div>
              
              <div className="flex items-center gap-2">
                {/* First Page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                
                {/* Previous Page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {(() => {
                    const pageNumbers = [];
                    const maxPagesToShow = 5;
                    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
                    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
                    
                    if (endPage - startPage < maxPagesToShow - 1) {
                      startPage = Math.max(1, endPage - maxPagesToShow + 1);
                    }
                    
                    if (startPage > 1) {
                      pageNumbers.push(
                        <Button
                          key={1}
                          variant={currentPage === 1 ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          className="h-8 w-8 p-0"
                        >
                          1
                        </Button>
                      );
                      if (startPage > 2) {
                        pageNumbers.push(<span key="dots1" className="px-1">...</span>);
                      }
                    }
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pageNumbers.push(
                        <Button
                          key={i}
                          variant={currentPage === i ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(i)}
                          className="h-8 w-8 p-0"
                        >
                          {i}
                        </Button>
                      );
                    }
                    
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pageNumbers.push(<span key="dots2" className="px-1">...</span>);
                      }
                      pageNumbers.push(
                        <Button
                          key={totalPages}
                          variant={currentPage === totalPages ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          className="h-8 w-8 p-0"
                        >
                          {totalPages}
                        </Button>
                      );
                    }
                    
                    return pageNumbers;
                  })()}
                </div>
                
                {/* Next Page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                {/* Last Page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Time Log Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Time Log</DialogTitle>
          </DialogHeader>
          {selectedTimeLog && (
            <TimeLogForm
              timeLog={selectedTimeLog}
              onSuccess={handleFormSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
