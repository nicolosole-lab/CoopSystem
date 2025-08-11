import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { format, startOfWeek, endOfWeek, isToday, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarIcon, Clock, Check, ChevronsUpDown, Search, ChevronLeft, ChevronRight, Timer, Plus, Edit, Trash2, Filter, List, ChevronsLeft, ChevronsRight, Euro } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export default function SmartHoursEntry() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<string>("entry");
  
  // Date and time states
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [timeIn, setTimeIn] = useState<string>('09:00');
  const [timeOut, setTimeOut] = useState<string>('17:00');
  
  // Selection states
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');
  
  // Combobox states
  const [openStaffCombobox, setOpenStaffCombobox] = useState(false);
  const [staffSearchValue, setStaffSearchValue] = useState("");
  const [openClientCombobox, setOpenClientCombobox] = useState(false);
  const [clientSearchValue, setClientSearchValue] = useState("");
  
  // Monthly view states
  const [selectedTimeLog, setSelectedTimeLog] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>("all");
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>("all");
  const [selectedService, setSelectedService] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("current-month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch staff data
  const { data: staffData = [] } = useQuery<any[]>({
    queryKey: ['/api/staff'],
    retry: false
  });

  // Fetch all clients
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/clients'],
    retry: false
  });

  // Fetch client budget allocations for the selected date
  const { data: budgetAllocations = [] } = useQuery<any[]>({
    queryKey: [`/api/clients/${selectedClient}/budget-allocations`, { date: selectedDate.toISOString() }],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${selectedClient}/budget-allocations?startDate=${selectedDate.toISOString()}&endDate=${selectedDate.toISOString()}`);
      if (!res.ok) throw new Error('Failed to fetch budget allocations');
      return res.json();
    },
    enabled: !!selectedClient,
    retry: false
  });

  // Fetch time logs
  const { data: timeLogs = [] } = useQuery<any[]>({
    queryKey: ['/api/time-logs'],
    retry: false
  });

  // Today's logs for quick stats
  const todayLogs = useMemo(() => {
    const today = new Date();
    return timeLogs.filter(log => {
      const logDate = new Date(log.serviceDate);
      return logDate.toDateString() === today.toDateString();
    });
  }, [timeLogs]);

  // Delete time log mutation
  const deleteTimeLogMutation = useMutation({
    mutationFn: async (timeLogId: string) => {
      await apiRequest("DELETE", `/api/time-logs/${timeLogId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-logs"] });
      toast({
        title: t('common.success'),
        description: t('timeTracking.deleteSuccess'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: t('timeTracking.messages.deleteError'),
        variant: "destructive",
      });
    },
  });

  // Calculate available hours
  const calculateHours = (start: string, end: string): number => {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return Math.max(0, (endMinutes - startMinutes) / 60);
  };

  const calculatedHours = useMemo(() => {
    return calculateHours(timeIn, timeOut);
  }, [timeIn, timeOut]);

  // Filtering logic for monthly view
  const filteredTimeLogs = useMemo(() => {
    let filtered = [...timeLogs];

    // Date filtering
    if (dateFilter === "current-month") {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      filtered = filtered.filter(log => {
        const logDate = parseISO(log.serviceDate);
        return logDate >= start && logDate <= end;
      });
    } else if (dateFilter === "custom" && customStartDate && customEndDate) {
      const start = parseISO(customStartDate);
      const end = parseISO(customEndDate);
      filtered = filtered.filter(log => {
        const logDate = parseISO(log.serviceDate);
        return logDate >= start && logDate <= end;
      });
    }

    // Search filtering
    if (searchTerm) {
      filtered = filtered.filter(log => {
        const client = clients.find(c => c.id === log.clientId);
        const staff = staffData.find(s => s.id === log.staffId);
        const searchStr = `${client?.firstName} ${client?.lastName} ${staff?.firstName} ${staff?.lastName} ${log.serviceType}`.toLowerCase();
        return searchStr.includes((searchTerm || '').toLowerCase());
      });
    }

    // Client filtering
    if (selectedClientFilter !== "all") {
      filtered = filtered.filter(log => log.clientId === selectedClientFilter);
    }

    // Staff filtering
    if (selectedStaffFilter !== "all") {
      filtered = filtered.filter(log => log.staffId === selectedStaffFilter);
    }

    // Service type filtering
    if (selectedService !== "all") {
      filtered = filtered.filter(log => log.serviceType === selectedService);
    }

    return filtered.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
  }, [timeLogs, dateFilter, customStartDate, customEndDate, searchTerm, selectedClientFilter, selectedStaffFilter, selectedService, clients, staffData]);

  // Pagination for monthly view
  const totalPagesCount = Math.ceil(filteredTimeLogs.length / itemsPerPage);
  const paginatedTimeLogs = filteredTimeLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calculate monthly stats
  const monthlyStats = useMemo(() => {
    const totalHours = filteredTimeLogs.reduce((sum, log) => sum + parseFloat(log.hours || '0'), 0);
    const totalCost = filteredTimeLogs.reduce((sum, log) => sum + parseFloat(log.totalCost || '0'), 0);
    const uniqueClients = new Set(filteredTimeLogs.map(log => log.clientId)).size;
    const uniqueStaff = new Set(filteredTimeLogs.map(log => log.staffId)).size;
    
    return {
      totalEntries: filteredTimeLogs.length,
      totalHours: totalHours.toFixed(1),
      totalCost: totalCost.toFixed(2),
      uniqueClients,
      uniqueStaff
    };
  }, [filteredTimeLogs]);

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

  // Allocate hours mutation
  const allocateHoursMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/time-logs', data);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Time entry saved successfully!'
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/time-logs'] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${selectedClient}/budget-allocations`] });
      
      // Reset form
      setTimeIn('09:00');
      setTimeOut('17:00');
      setSelectedBudgetId('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save time entry',
        variant: 'destructive'
      });
    }
  });

  const handleSaveEntry = async () => {
    if (!selectedStaff || !selectedClient) {
      toast({
        title: 'Missing Information',
        description: 'Please select both staff and client',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedBudgetId) {
      toast({
        title: 'Budget Required',
        description: 'Please select a budget to use',
        variant: 'destructive'
      });
      return;
    }

    const serviceDate = format(selectedDate, 'yyyy-MM-dd');
    
    // Create proper datetime for start and end times
    const startTime = new Date(selectedDate);
    const [startHour, startMin] = timeIn.split(':').map(Number);
    startTime.setHours(startHour, startMin, 0, 0);
    
    const endTime = new Date(selectedDate);
    const [endHour, endMin] = timeOut.split(':').map(Number);
    endTime.setHours(endHour, endMin, 0, 0);
    
    allocateHoursMutation.mutate({
      clientId: selectedClient,
      staffId: selectedStaff,
      hours: calculatedHours,
      serviceDate: serviceDate,
      serviceType: '1. Assistenza alla persona',
      budgetId: selectedBudgetId,
      mileage: 0,
      notes: '',
      scheduledStartTime: startTime.toISOString(),
      scheduledEndTime: endTime.toISOString()
    });
  };

  // Format time for display
  const formatTimeDisplay = (log: any) => {
    if (!log.scheduledStartTime || !log.scheduledEndTime) {
      return '--:-- - --:--';
    }
    
    // Parse the times and extract just the time portion
    const startDate = new Date(log.scheduledStartTime);
    const endDate = new Date(log.scheduledEndTime);
    
    // Get local time components
    const startHours = startDate.getUTCHours();
    const startMinutes = startDate.getUTCMinutes();
    const endHours = endDate.getUTCHours();
    const endMinutes = endDate.getUTCMinutes();
    
    // Format times with padding
    const formatTime = (hours: number, minutes: number) => {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };
    
    return `${formatTime(startHours, startMinutes)} - ${formatTime(endHours, endMinutes)}`;
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            {t('timeTracking.title')}
          </h1>
          <p className="text-gray-600 mt-1">{t('timeTracking.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            {t('timeTracking.entriesToday', { count: todayLogs.length })}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="entry" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('timeTracking.tabs.quickEntry')}
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            {t('timeTracking.tabs.monthlyView')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entry" className="space-y-6">
          {/* Main Entry Card */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                {t('timeTracking.logTimeEntry')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Quick Stats */}
              {todayLogs.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-xs text-gray-600">{t('timeTracking.statistics.entriesToday')}</p>
                    <p className="text-xl font-bold text-blue-600">{todayLogs.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">{t('timeTracking.statistics.totalHours')}</p>
                    <p className="text-xl font-bold text-green-600">
                      {todayLogs.reduce((sum, log) => sum + parseFloat(log.hours || '0'), 0).toFixed(1)}h
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">{t('timeTracking.statistics.totalCost')}</p>
                    <p className="text-xl font-bold text-orange-600">
                      €{todayLogs.reduce((sum, log) => sum + parseFloat(log.totalCost || '0'), 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">{t('timeTracking.statistics.avgHoursEntry')}</p>
                    <p className="text-xl font-bold text-purple-600">
                      {(todayLogs.reduce((sum, log) => sum + parseFloat(log.hours || '0'), 0) / todayLogs.length).toFixed(1)}h
                    </p>
                  </div>
                </div>
              )}

              {/* Date Selection */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="h-4 w-4 text-blue-500" />
                  {t('timeTracking.form.serviceDate')}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal hover:border-blue-400 transition-colors">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Staff Selection */}
                <div>
                  <Label>{t('timeTracking.form.staffMember')}</Label>
                  <Popover open={openStaffCombobox} onOpenChange={setOpenStaffCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openStaffCombobox}
                        className="w-full justify-between font-normal"
                      >
                        {selectedStaff
                          ? staffData.find((s: any) => s.id === selectedStaff)?.firstName + ' ' + 
                            staffData.find((s: any) => s.id === selectedStaff)?.lastName
                          : t('timeTracking.form.selectStaffMember')}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder={t('timeTracking.monthlyView.searchPlaceholder')} 
                          value={staffSearchValue}
                          onValueChange={setStaffSearchValue}
                        />
                        <CommandEmpty>{t('staff.noStaffFound')}</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-y-auto">
                          {staffData.map((s: any) => (
                            <CommandItem
                              key={s.id}
                              value={`${s.firstName} ${s.lastName} ${s.externalId || ''}`}
                              onSelect={() => {
                                setSelectedStaff(s.id);
                                setOpenStaffCombobox(false);
                                setStaffSearchValue("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedStaff === s.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {s.firstName} {s.lastName}
                              {s.externalId && <span className="text-xs text-gray-500 ml-2">({s.externalId})</span>}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Client Selection */}
                <div>
                  <Label>{t('timeTracking.form.client')}</Label>
                  <Popover open={openClientCombobox} onOpenChange={setOpenClientCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openClientCombobox}
                        className="w-full justify-between font-normal"
                      >
                        {selectedClient
                          ? clients.find((c: any) => c.id === selectedClient)?.firstName + ' ' + 
                            clients.find((c: any) => c.id === selectedClient)?.lastName
                          : t('timeTracking.form.selectClient')}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder={t('timeTracking.monthlyView.searchPlaceholder')} 
                          value={clientSearchValue}
                          onValueChange={setClientSearchValue}
                        />
                        <CommandEmpty>{t('clients.noClientsFound')}</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-y-auto">
                          {clients.map((c: any) => (
                            <CommandItem
                              key={c.id}
                              value={`${c.firstName} ${c.lastName} ${c.externalId || ''}`}
                              onSelect={() => {
                                setSelectedClient(c.id);
                                setOpenClientCombobox(false);
                                setClientSearchValue("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedClient === c.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {c.firstName} {c.lastName}
                              {c.externalId && <span className="text-xs text-gray-500 ml-2">({c.externalId})</span>}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Time Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('timeTracking.form.timeIn')}</Label>
                  <Input
                    type="time"
                    value={timeIn}
                    onChange={(e) => setTimeIn(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label>{t('timeTracking.form.timeOut')}</Label>
                  <Input
                    type="time"
                    value={timeOut}
                    onChange={(e) => setTimeOut(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>

              {/* Calculated Hours Display */}
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">{t('timeTracking.form.calculatedHours')}</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">
                    {calculatedHours.toFixed(1)}h
                  </span>
                </div>
              </div>

              {/* Budget Selection */}
              {selectedClient && (
                <div>
                  <Label>Budget to Use</Label>
                  <Select value={selectedBudgetId} onValueChange={setSelectedBudgetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select budget allocation" />
                    </SelectTrigger>
                    <SelectContent>
                      {budgetAllocations.map((allocation: any) => (
                        <SelectItem key={allocation.id} value={allocation.id}>
                          {allocation.budgetType?.name} - €{allocation.remainingAmount} available
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button 
                onClick={handleSaveEntry} 
                disabled={allocateHoursMutation.isPending}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                size="lg"
              >
                {allocateHoursMutation.isPending ? t('common.saving') : t('timeTracking.form.saveTimeEntry')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6">
          {/* Monthly Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{t('timeTracking.statistics.entriesToday')}</p>
                  <p className="text-2xl font-bold text-blue-600">{monthlyStats.totalEntries}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{t('timeTracking.statistics.totalHours')}</p>
                  <p className="text-2xl font-bold text-green-600">{monthlyStats.totalHours}h</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{t('timeTracking.statistics.totalCost')}</p>
                  <p className="text-2xl font-bold text-orange-600">€{monthlyStats.totalCost}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{t('clients.uniqueClients')}</p>
                  <p className="text-2xl font-bold text-purple-600">{monthlyStats.uniqueClients}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Unique Staff</p>
                  <p className="text-2xl font-bold text-indigo-600">{monthlyStats.uniqueStaff}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Search</Label>
                  <Input
                    placeholder="Search by name, service..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label>Date Range</Label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="current-month">Current Month</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Client</Label>
                  <Select value={selectedClientFilter} onValueChange={setSelectedClientFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {clients.map((client: any) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.firstName} {client.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Staff</Label>
                  <Select value={selectedStaffFilter} onValueChange={setSelectedStaffFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Staff</SelectItem>
                      {staffData.map((staff: any) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.firstName} {staff.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {dateFilter === "custom" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Time Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTimeLogs.map((log: any) => {
                    const client = clients.find(c => c.id === log.clientId);
                    const staff = staffData.find(s => s.id === log.staffId);
                    
                    return (
                      <TableRow key={log.id}>
                        <TableCell>{format(parseISO(log.serviceDate), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="font-mono text-sm">{formatTimeDisplay(log)}</TableCell>
                        <TableCell>
                          {client ? `${client.firstName} ${client.lastName}` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {staff ? `${staff.firstName} ${staff.lastName}` : 'N/A'}
                        </TableCell>
                        <TableCell>{getServiceTypeBadge(log.serviceType)}</TableCell>
                        <TableCell className="font-medium">{parseFloat(log.hours).toFixed(1)}h</TableCell>
                        <TableCell className="font-medium">€{parseFloat(log.totalCost).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteTimeLogMutation.mutate(log.id)}
                            disabled={deleteTimeLogMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPagesCount > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <Label>Items per page:</Label>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPagesCount}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPagesCount}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPagesCount)}
                      disabled={currentPage === totalPagesCount}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}