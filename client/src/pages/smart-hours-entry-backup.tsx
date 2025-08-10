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
import { Link } from 'wouter';

export default function SmartHoursEntry() {
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
  const { data: staff = [] } = useQuery<any[]>({
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

  // Delete time log mutation
  const deleteTimeLogMutation = useMutation({
    mutationFn: async (timeLogId: string) => {
      await apiRequest("DELETE", `/api/time-logs/${timeLogId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-logs"] });
      toast({
        title: 'Success',
        description: 'Time log deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete time log",
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
        const staff = staff.find(s => s.id === log.staffId);
        const searchStr = `${client?.firstName} ${client?.lastName} ${staff?.firstName} ${staff?.lastName} ${log.serviceType}`.toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
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
  }, [timeLogs, dateFilter, customStartDate, customEndDate, searchTerm, selectedClientFilter, selectedStaffFilter, selectedService, clients, staff]);

  // Pagination for monthly view
  const totalPages = Math.ceil(filteredTimeLogs.length / itemsPerPage);
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

  // Group budgets by type for display
  const budgetsByType = useMemo(() => {
    const grouped: Record<string, any> = {};
    
    budgetAllocations.forEach((allocation: any) => {
      const budgetType = allocation.budgetType;
      const typeId = budgetType?.id || allocation.budgetTypeId;
      
      if (!typeId) return;
      
      if (!grouped[typeId]) {
        grouped[typeId] = {
          id: typeId,
          code: budgetType?.code || 'UNKNOWN',
          name: budgetType?.name || 'Budget',
          allocations: [],
          totalAvailable: 0
        };
      }
      
      const available = parseFloat(allocation.allocatedAmount || '0') - 
                       parseFloat(allocation.usedAmount || '0');
      grouped[typeId].allocations.push({
        ...allocation,
        available
      });
      grouped[typeId].totalAvailable += available;
    });
    
    return grouped;
  }, [budgetAllocations]);

  // Filter today's logs
  const todayLogs = useMemo(() => {
    return timeLogs.filter((log: any) => {
      const logDate = new Date(log.serviceDate);
      return isToday(logDate);
    }).sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [timeLogs]);

  // Filter logs based on search
  const filteredLogs = useMemo(() => {
    let filtered = [...todayLogs];
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((log: any) => {
        const staffName = staff.find(s => s.id === log.staffId);
        const clientName = clients.find(c => c.id === log.clientId);
        
        return (
          (staffName && `${staffName.firstName} ${staffName.lastName}`.toLowerCase().includes(search)) ||
          (clientName && `${clientName.firstName} ${clientName.lastName}`.toLowerCase().includes(search)) ||
          log.serviceType?.toLowerCase().includes(search)
        );
      });
    }
    
    return filtered;
  }, [todayLogs, searchTerm, staff, clients]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // Smart hour allocation mutation
  const allocateHoursMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/smart-hour-allocation', data);
    },
    onSuccess: (response: any) => {
      // Check if there are warnings (budget overage)
      if (response.warnings && response.warnings.length > 0) {
        toast({
          title: 'Time Entry Saved with Warning',
          description: response.warnings.join('\n'),
          variant: 'default'
        });
      } else {
        toast({
          title: 'Success',
          description: 'Time entry saved successfully'
        });
      }
      
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
            Smart Hours & Time Tracking
          </h1>
          <p className="text-gray-600 mt-1">Quick entry and monthly hours management</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            {todayLogs.length} entries today
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="entry" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Quick Entry
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Monthly View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entry" className="space-y-6">

      {/* Main Entry Card */}
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Log Time Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Quick Stats */}
          {todayLogs.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-gray-600">Entries Today</p>
                <p className="text-xl font-bold text-blue-600">{todayLogs.length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600">Total Hours</p>
                <p className="text-xl font-bold text-green-600">
                  {todayLogs.reduce((sum, log) => sum + parseFloat(log.hours || '0'), 0).toFixed(1)}h
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600">Total Cost</p>
                <p className="text-xl font-bold text-orange-600">
                  €{todayLogs.reduce((sum, log) => sum + parseFloat(log.totalCost || '0'), 0).toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600">Avg Hours/Entry</p>
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
              Service Date
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
              <Label>Staff Member</Label>
              <Popover open={openStaffCombobox} onOpenChange={setOpenStaffCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openStaffCombobox}
                    className="w-full justify-between font-normal"
                  >
                    {selectedStaff
                      ? staff.find((s: any) => s.id === selectedStaff)?.firstName + ' ' + 
                        staff.find((s: any) => s.id === selectedStaff)?.lastName
                      : "Select staff member"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search staff..." 
                      value={staffSearchValue}
                      onValueChange={setStaffSearchValue}
                    />
                    <CommandEmpty>No staff member found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-y-auto">
                      {staff.map((s: any) => (
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
                          <div className="flex flex-col">
                            <span>{s.firstName} {s.lastName}</span>
                            {s.externalId && (
                              <span className="text-xs text-gray-500">ID: {s.externalId}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Client Selection */}
            <div>
              <Label>Client</Label>
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
                      : "Select client"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search client..." 
                      value={clientSearchValue}
                      onValueChange={setClientSearchValue}
                    />
                    <CommandEmpty>No client found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-y-auto">
                      {clients.map((c: any) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.firstName} ${c.lastName} ${c.fiscalCode || ''}`}
                          onSelect={() => {
                            setSelectedClient(c.id);
                            setSelectedBudgetId('');
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
                          <div className="flex flex-col">
                            <span>{c.firstName} {c.lastName}</span>
                            {c.fiscalCode && (
                              <span className="text-xs text-gray-500">CF: {c.fiscalCode}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="group">
              <Label className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Time In
              </Label>
              <Input
                type="time"
                value={timeIn}
                onChange={(e) => setTimeIn(e.target.value)}
                className="transition-all group-hover:border-blue-400 focus:border-blue-500"
              />
            </div>
            <div className="group">
              <Label className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Time Out
              </Label>
              <Input
                type="time"
                value={timeOut}
                onChange={(e) => setTimeOut(e.target.value)}
                className="transition-all group-hover:border-blue-400 focus:border-blue-500"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Timer className="h-4 w-4 text-green-500" />
                Total Hours
              </Label>
              <div className="h-10 px-3 py-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-md border border-green-200 flex items-center justify-center">
                <Badge variant="outline" className="text-lg font-bold bg-white border-green-300 text-green-700">
                  {calculatedHours.toFixed(1)} hours
                </Badge>
              </div>
            </div>
          </div>

          {/* Budget Selection */}
          {selectedClient && (
            <div>
              <Label>Select Budget to Use</Label>
              {budgetAllocations.length === 0 ? (
                <div className="mt-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    No budgets available for {format(selectedDate, 'MMMM yyyy')}
                  </p>
                </div>
              ) : Object.keys(budgetsByType).length === 0 ? (
                <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Loading budget information...
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                  {Object.values(budgetsByType).map((budget: any) => (
                    <Card
                      key={budget.id}
                      className={cn(
                        "cursor-pointer transition-all transform hover:scale-105 duration-200",
                        selectedBudgetId === budget.allocations[0]?.id
                          ? "ring-2 ring-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg"
                          : "hover:shadow-lg hover:border-blue-300"
                      )}
                      onClick={() => setSelectedBudgetId(budget.allocations[0]?.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold">{budget.code}</p>
                            <p className="text-xs text-gray-600">{budget.name}</p>
                          </div>
                          {selectedBudgetId === budget.allocations[0]?.id && (
                            <Check className="h-5 w-5 text-blue-500" />
                          )}
                        </div>
                        <div className="mt-3">
                          <p className="text-sm text-gray-600">Available Balance</p>
                          <p className={cn(
                            "text-lg font-bold transition-colors",
                            budget.totalAvailable >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            €{budget.totalAvailable.toFixed(2)}
                          </p>
                          {budget.totalAvailable < 0 && (
                            <Badge variant="destructive" className="text-xs mt-1">
                              Overdrawn
                            </Badge>
                          )}
                          {budget.allocations.length > 1 && (
                            <p className="text-xs text-gray-500 mt-1">
                              {budget.allocations.length} allocations
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {selectedStaff && selectedClient && selectedBudgetId && calculatedHours > 0 ? (
                <span className="text-green-600 font-medium flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Ready to save
                </span>
              ) : (
                <span className="text-gray-500">
                  Please complete all fields to save
                </span>
              )}
            </div>
            <Button
              onClick={handleSaveEntry}
              disabled={!selectedStaff || !selectedClient || !selectedBudgetId || calculatedHours <= 0 || allocateHoursMutation.isPending}
              className={cn(
                "px-8 transition-all",
                selectedStaff && selectedClient && selectedBudgetId && calculatedHours > 0
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transform hover:scale-105"
                  : ""
              )}
            >
              {allocateHoursMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Save Time Entry
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Time Entries */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span>Today's Time Entries</span>
              {todayLogs.length > 0 && (
                <Badge variant="secondary" className="ml-2 animate-pulse">
                  {filteredLogs.length} entries
                </Badge>
              )}
            </div>
            {todayLogs.length > 0 && (
              <div className="text-sm text-gray-600">
                Total: <span className="font-bold text-blue-600">
                  {todayLogs.reduce((sum, log) => sum + parseFloat(log.hours || '0'), 0).toFixed(1)} hours
                </span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No time entries for today yet. Create your first entry using the form above!
            </p>
          ) : (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search entries..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Cost (€)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.map((log: any) => {
                      const staffMember = staff.find(s => s.id === log.staffId);
                      const client = clients.find(c => c.id === log.clientId);
                      
                      return (
                        <TableRow key={log.id} className="hover:bg-gray-50 transition-colors">
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-gray-400" />
                              {formatTimeDisplay(log)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {staffMember ? (
                              <Link href={`/staff/${staffMember.id}`}>
                                <span className="text-blue-600 hover:underline cursor-pointer font-medium">
                                  {staffMember.firstName} {staffMember.lastName}
                                </span>
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">Unknown</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {client ? (
                              <Link href={`/clients/${client.id}`}>
                                <span className="text-blue-600 hover:underline cursor-pointer font-medium">
                                  {client.firstName} {client.lastName}
                                </span>
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">Unknown</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {log.serviceType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-medium">
                              {log.hours}h
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {log.createdAt ? format(new Date(log.createdAt), 'HH:mm') : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={cn(
                              "font-bold text-lg",
                              parseFloat(log.totalCost) > 100 ? "text-orange-600" : "text-green-600"
                            )}>
                              €{parseFloat(log.totalCost).toFixed(2)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length} entries
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === currentPage ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}