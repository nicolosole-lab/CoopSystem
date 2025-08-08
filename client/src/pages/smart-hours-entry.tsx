import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { format, addDays, startOfWeek, endOfWeek, isWeekend, parseISO } from 'date-fns';
import { 
  Clock, 
  Calendar as CalendarIcon,
  Save,
  Copy,
  Zap,
  Users,
  Activity,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Info,
  Timer,
  Target,
  Sparkles,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface TimeTemplate {
  id: string;
  name: string;
  description: string;
  hours: number;
  serviceType: string;
  notes: string;
  isDefault?: boolean;
}

interface QuickEntry {
  clientId: string;
  clientName: string;
  staffId: string;
  staffName: string;
  date: string;
  hours: number;
  serviceType: string;
  mileage?: number;
  notes?: string;
}

interface SmartSuggestion {
  type: 'recurring' | 'pattern' | 'missing';
  message: string;
  entries: QuickEntry[];
  confidence: number;
}

interface BudgetAvailability {
  hasAvailableCredit: boolean;
  totalAvailable: number;
  allocations: any[];
  warnings: string[];
}

interface AllocationResult {
  success: boolean;
  timeLogId?: string;
  allocations: any[];
  totalCost: number;
  warnings: string[];
  receipt?: {
    required: boolean;
    amount: number;
    reason: string;
  };
}

export default function SmartHoursEntry() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedWeek, setSelectedWeek] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [bulkEntries, setBulkEntries] = useState<QuickEntry[]>([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TimeTemplate | null>(null);
  const [activeTab, setActiveTab] = useState('quick');
  const [openStaffCombobox, setOpenStaffCombobox] = useState(false);
  const [staffSearchValue, setStaffSearchValue] = useState("");
  const [openClientCombobox, setOpenClientCombobox] = useState(false);
  const [clientSearchValue, setClientSearchValue] = useState("");
  
  // Budget checking states
  const [budgetAvailability, setBudgetAvailability] = useState<BudgetAvailability | null>(null);
  const [showBudgetWarning, setShowBudgetWarning] = useState(false);
  const [allocationResult, setAllocationResult] = useState<AllocationResult | null>(null);
  const [showAllocationResult, setShowAllocationResult] = useState(false);
  
  // State for Recent Time Entries filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStaff, setFilterStaff] = useState<string>('');
  const [filterClient, setFilterClient] = useState<string>('');
  const [filterServiceType, setFilterServiceType] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch data
  const { data: staff = [] } = useQuery<any[]>({
    queryKey: ['/api/staff'],
    retry: false
  });

  // Fetch all clients
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/clients'],
    retry: false
  });

  // Fetch clients assigned to selected staff
  const { data: staffClientAssignments = [] } = useQuery<any[]>({
    queryKey: [`/api/staff/${selectedStaff}/client-assignments`],
    enabled: !!selectedStaff,
    retry: false
  });
  
  // Extract assigned clients from assignments
  const assignedClients = staffClientAssignments.map((assignment: any) => assignment.client).filter(Boolean);

  const { data: recentLogs = [] } = useQuery<any[]>({
    queryKey: ['/api/time-logs'],
    retry: false
  });

  // Query for budget availability when client is selected
  const { data: availableBudgets = [] } = useQuery<any[]>({
    queryKey: [`/api/clients/${selectedClient}/available-budgets`, { 
      month: new Date().getMonth() + 1, 
      year: new Date().getFullYear() 
    }],
    enabled: !!selectedClient,
    retry: false
  });

  // Queries to load staff and clients data for the table
  const staffQuery = useQuery<any[]>({
    queryKey: ['/api/staff'],
    retry: false
  });

  const clientsQuery = useQuery<any[]>({
    queryKey: ['/api/clients'],
    retry: false
  });

  // Calculate today's logs
  const todayLogs = recentLogs.filter((log: any) => {
    const logDate = new Date(log.serviceDate);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  });

  // Filter clients based on selected staff assignments
  const filteredClients = selectedStaff && assignedClients.length > 0 
    ? assignedClients 
    : clients;

  // Smart hour allocation mutation
  const allocateHoursMutation = useMutation({
    mutationFn: async (data: {
      clientId: string;
      staffId: string;
      hours: number;
      serviceDate: string;
      serviceType: string;
      mileage?: number;
      notes?: string;
    }) => {
      return await apiRequest('POST', '/api/smart-hour-allocation', data);
    },
    onSuccess: (result: AllocationResult) => {
      setAllocationResult(result);
      setShowAllocationResult(true);
      
      if (result.success) {
        toast({
          title: "Hours Allocated Successfully",
          description: `Allocated €${result.totalCost.toFixed(2)} across ${result.allocations.length} budget(s)`,
        });
        
        // Refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/time-logs'] });
        queryClient.invalidateQueries({ queryKey: [`/api/clients/${selectedClient}/available-budgets`] });
      } else {
        toast({
          title: "Budget Issue Detected",
          description: result.warnings[0] || "Unable to allocate hours",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Allocation Failed",
        description: "Failed to allocate hours to budgets",
        variant: "destructive",
      });
      console.error('Allocation error:', error);
    },
  });

  // Check budget availability
  const checkBudgetAvailability = async (clientId: string, estimatedCost: number) => {
    try {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      const response = await apiRequest('GET', `/api/clients/${clientId}/budget-availability?amount=${estimatedCost}&month=${month}&year=${year}`);
      setBudgetAvailability(response);
      
      if (!response.hasAvailableCredit || response.warnings.length > 0) {
        setShowBudgetWarning(true);
      }
    } catch (error) {
      console.error('Error checking budget availability:', error);
    }
  };

  // Apply filters to today's logs
  const filteredLogs = todayLogs.filter((log: any) => {
    // Search filter
    if (searchTerm) {
      const staff = staffQuery.data?.find(s => s.id === log.staffId);
      const client = clientsQuery.data?.find(c => c.id === log.clientId);
      const searchLower = searchTerm.toLowerCase();
      
      const matchStaff = staff && `${staff.firstName} ${staff.lastName}`.toLowerCase().includes(searchLower);
      const matchClient = client && `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchLower);
      const matchService = log.serviceType && log.serviceType.toLowerCase().includes(searchLower);
      
      if (!matchStaff && !matchClient && !matchService) {
        return false;
      }
    }
    
    // Staff filter
    if (filterStaff && log.staffId !== filterStaff) {
      return false;
    }
    
    // Client filter
    if (filterClient && log.clientId !== filterClient) {
      return false;
    }
    
    // Service type filter
    if (filterServiceType && log.serviceType !== filterServiceType) {
      return false;
    }
    
    return true;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // Get unique service types for filter dropdown
  const serviceTypes = [...new Set(todayLogs.map((log: any) => log.serviceType))].filter(Boolean);

  // Time templates (in production, these would come from the database)
  const templates: TimeTemplate[] = [
    {
      id: '1',
      name: 'Standard Daily Care',
      description: 'Regular daily assistance and care',
      hours: 8,
      serviceType: '1. Assistenza alla persona',
      notes: 'Standard daily care routine completed',
      isDefault: true
    },
    {
      id: '2',
      name: 'Half Day Support',
      description: 'Morning or afternoon support',
      hours: 4,
      serviceType: '1. Assistenza alla persona',
      notes: 'Half day support provided'
    },
    {
      id: '3',
      name: 'Medical Appointment',
      description: 'Accompany to medical appointment',
      hours: 3,
      serviceType: '5. Accompagnamento',
      notes: 'Medical appointment assistance'
    },
    {
      id: '4',
      name: 'Weekend Care',
      description: 'Weekend care services',
      hours: 6,
      serviceType: '1. Assistenza alla persona',
      notes: 'Weekend care services provided'
    }
  ];

  // Smart suggestions based on patterns
  const getSmartSuggestions = (): SmartSuggestion[] => {
    const suggestions: SmartSuggestion[] = [];
    
    // Analyze recent logs for patterns
    if (recentLogs.length > 0 && selectedStaff) {
      // Find recurring weekly patterns
      const staffLogs = recentLogs.filter((log: any) => log.staffId === selectedStaff);
      const weeklyPatterns = new Map();
      
      staffLogs.forEach((log: any) => {
        const dayOfWeek = new Date(log.serviceDate).getDay();
        const key = `${log.clientId}-${dayOfWeek}-${log.serviceType}`;
        if (!weeklyPatterns.has(key)) {
          weeklyPatterns.set(key, {
            count: 0,
            clientId: log.clientId,
            hours: log.hours,
            serviceType: log.serviceType,
            dayOfWeek
          });
        }
        weeklyPatterns.get(key).count++;
      });

      // Suggest recurring entries
      weeklyPatterns.forEach((pattern, key) => {
        if (pattern.count >= 3) { // Pattern appears at least 3 times
          const targetDate = addDays(startOfWeek(selectedWeek, { weekStartsOn: 1 }), pattern.dayOfWeek);
          const client = clients.find((c: any) => c.id === pattern.clientId);
          if (client) {
            suggestions.push({
              type: 'recurring',
              message: `Recurring ${getDayName(pattern.dayOfWeek)} service for ${client.firstName} ${client.lastName}`,
              entries: [{
                clientId: pattern.clientId,
                clientName: `${client.firstName} ${client.lastName}`,
                staffId: selectedStaff,
                staffName: staff.find((s: any) => s.id === selectedStaff)?.firstName + ' ' + staff.find((s: any) => s.id === selectedStaff)?.lastName,
                date: format(targetDate, 'yyyy-MM-dd'),
                hours: pattern.hours,
                serviceType: pattern.serviceType
              }],
              confidence: 0.85
            });
          }
        }
      });
    }

    return suggestions;
  };

  const getDayName = (dayIndex: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex];
  };

  // Create time log mutation
  const createTimeLogMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/time-logs', data);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Time entry created successfully'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/time-logs'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create time entry',
        variant: 'destructive'
      });
    }
  });

  // Bulk create mutation
  const bulkCreateMutation = useMutation({
    mutationFn: async (entries: QuickEntry[]) => {
      const promises = entries.map(entry => {
        const startTime = new Date(entry.date);
        startTime.setHours(9, 0, 0, 0); // Default start at 9:00 AM
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + entry.hours);
        const hourlyRate = 20; // Default hourly rate
        
        return apiRequest('POST', '/api/time-logs', {
          staffId: entry.staffId,
          clientId: entry.clientId,
          serviceDate: new Date(entry.date).toISOString(),
          scheduledStartTime: startTime.toISOString(),
          scheduledEndTime: endTime.toISOString(),
          hours: entry.hours.toString(),
          hourlyRate: hourlyRate.toString(),
          serviceType: entry.serviceType,
          notes: entry.notes || ''
          // totalCost is calculated on the server side
        });
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `${bulkEntries.length} time entries created successfully`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/time-logs'] });
      setBulkEntries([]);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create time entries',
        variant: 'destructive'
      });
    }
  });

  const handleQuickEntry = async (template?: TimeTemplate) => {
    if (!selectedStaff || !selectedClient) {
      toast({
        title: 'Missing Information',
        description: 'Please select both staff and client',
        variant: 'destructive'
      });
      return;
    }

    const hours = template?.hours || 8;
    const serviceType = template?.serviceType || '1. Assistenza alla persona';
    const notes = template?.notes || '';
    const serviceDate = selectedDate.toISOString();
    
    // Use smart allocation instead of direct time log creation
    allocateHoursMutation.mutate({
      clientId: selectedClient,
      staffId: selectedStaff,
      hours: hours,
      serviceDate: serviceDate,
      serviceType: serviceType,
      mileage: 0, // Default to 0, can be enhanced to include mileage input
      notes: notes
    });
  };

  const handleAddToBulk = () => {
    if (!selectedStaff || !selectedClient) return;

    const client = clients.find((c: any) => c.id === selectedClient);
    const staffMember = staff.find((s: any) => s.id === selectedStaff);

    const entry: QuickEntry = {
      clientId: selectedClient,
      clientName: client ? `${client.firstName} ${client.lastName}` : 'Unknown',
      staffId: selectedStaff,
      staffName: staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : 'Unknown',
      date: format(selectedDate, 'yyyy-MM-dd'),
      hours: 8,
      serviceType: '1. Assistenza alla persona',
      notes: ''
    };

    setBulkEntries([...bulkEntries, entry]);
  };

  const handleApplySuggestion = (suggestion: SmartSuggestion) => {
    setBulkEntries([...bulkEntries, ...suggestion.entries]);
    toast({
      title: 'Suggestion Applied',
      description: `Added ${suggestion.entries.length} entries to bulk list`
    });
  };

  const suggestions = getSmartSuggestions();

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-blue-500" />
            Smart Hours Entry
          </h1>
          <p className="text-gray-600 mt-1">Quick and intelligent time tracking with AI-powered suggestions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => queryClient.invalidateQueries()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Entries</p>
                <p className="text-2xl font-bold">
                  {recentLogs.filter((log: any) => 
                    format(new Date(log.serviceDate), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                  ).length}
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-2xl font-bold">
                  {recentLogs.filter((log: any) => {
                    const logDate = new Date(log.serviceDate);
                    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
                    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
                    return logDate >= weekStart && logDate <= weekEnd;
                  }).length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Templates</p>
                <p className="text-2xl font-bold">{templates.length}</p>
              </div>
              <Copy className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Bulk Queue</p>
                <p className="text-2xl font-bold">{bulkEntries.length}</p>
              </div>
              <Zap className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="quick">Quick Entry</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Entry</TabsTrigger>
          <TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
        </TabsList>

        {/* Quick Entry Tab */}
        <TabsContent value="quick" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Time Entry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                          : "Select staff"}
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
                                setSelectedClient(''); // Clear client selection when staff changes
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

                <div className="space-y-2">
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
                          {filteredClients.map((c: any) => (
                            <CommandItem
                              key={c.id}
                              value={`${c.firstName} ${c.lastName} ${c.fiscalCode || ''}`}
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
                              <div className="flex flex-col">
                                <span>{c.firstName} {c.lastName}</span>
                                {c.fiscalCode && (
                                  <span className="text-xs text-gray-500">FC: {c.fiscalCode}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {/* Budget Status Display */}
                  {selectedClient && availableBudgets.length > 0 && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-md">
                      <div className="text-xs font-medium text-gray-700 mb-1">Available Budgets:</div>
                      {availableBudgets.map((budget: any) => (
                        <div key={budget.id} className="flex justify-between items-center text-xs">
                          <span className="text-gray-600">{budget.budgetTypeCode}</span>
                          <span className={cn("font-medium", 
                            budget.availableBalance > 100 ? "text-green-600" : 
                            budget.availableBalance > 50 ? "text-yellow-600" : "text-red-600"
                          )}>
                            €{budget.availableBalance.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedClient && availableBudgets.length === 0 && (
                    <div className="mt-2 p-2 bg-red-50 rounded-md">
                      <div className="flex items-center text-xs text-red-600">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        No available budgets - Direct financing required
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(selectedDate, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Templates */}
              <div>
                <Label className="mb-2 block">Quick Templates</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {templates.map((template) => (
                    <Card 
                      key={template.id} 
                      className="cursor-pointer hover:border-blue-500 transition-colors"
                      onClick={() => handleQuickEntry(template)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{template.name}</p>
                            <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {template.hours}h
                              </Badge>
                              {template.isDefault && (
                                <Badge variant="default" className="text-xs">Default</Badge>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => handleQuickEntry()} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save Entry (8h Default)
                </Button>
                <Button onClick={handleAddToBulk} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Bulk
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Entry Tab */}
        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Time Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {bulkEntries.length > 0 ? (
                <div className="space-y-4">
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {bulkEntries.map((entry, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{entry.date}</Badge>
                            <span className="font-medium">{entry.clientName}</span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-600">{entry.staffName}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {entry.hours}h
                            </Badge>
                            <span className="text-xs text-gray-600">{entry.serviceType}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setBulkEntries(bulkEntries.filter((_, i) => i !== index));
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => bulkCreateMutation.mutate(bulkEntries)}
                      disabled={bulkCreateMutation.isPending}
                      className="flex-1"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save All ({bulkEntries.length} entries)
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setBulkEntries([])}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Zap className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No bulk entries added yet</p>
                  <p className="text-sm mt-1">Add entries from Quick Entry or AI Suggestions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                AI-Powered Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedStaff ? (
                suggestions.length > 0 ? (
                  <div className="space-y-4">
                    {suggestions.map((suggestion, index) => (
                      <Card key={index} className="border-blue-200 bg-blue-50/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {suggestion.type === 'recurring' && (
                                  <Badge variant="default" className="bg-blue-500">
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Recurring Pattern
                                  </Badge>
                                )}
                                <Badge variant="outline">
                                  {Math.round(suggestion.confidence * 100)}% confidence
                                </Badge>
                              </div>
                              <p className="font-medium">{suggestion.message}</p>
                              <div className="mt-2 space-y-1">
                                {suggestion.entries.map((entry, i) => (
                                  <div key={i} className="text-sm text-gray-600">
                                    • {entry.date} - {entry.clientName} ({entry.hours}h)
                                  </div>
                                ))}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleApplySuggestion(suggestion)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Apply
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Info className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No suggestions available</p>
                    <p className="text-sm mt-1">Suggestions will appear based on your historical patterns</p>
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 text-yellow-400" />
                  <p>Please select a staff member</p>
                  <p className="text-sm mt-1">AI suggestions require staff selection to analyze patterns</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Time Entries */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Time Entries
            {todayLogs.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {filteredLogs.length} of {todayLogs.length} entries
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No time entries for today yet. Create your first entry using the templates above!
            </p>
          ) : (
            <div className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search staff, client, or service..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9"
                  />
                </div>

                {/* Staff Filter */}
                <Select 
                  value={filterStaff} 
                  onValueChange={(value) => {
                    setFilterStaff(value === 'all' ? '' : value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {staffQuery.data?.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Client Filter */}
                <Select 
                  value={filterClient} 
                  onValueChange={(value) => {
                    setFilterClient(value === 'all' ? '' : value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clientsQuery.data?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Service Type Filter */}
                <Select 
                  value={filterServiceType} 
                  onValueChange={(value) => {
                    setFilterServiceType(value === 'all' ? '' : value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Service Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Service Types</SelectItem>
                    {serviceTypes.map((type: string) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters Button */}
              {(searchTerm || filterStaff || filterClient || filterServiceType) && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterStaff('');
                      setFilterClient('');
                      setFilterServiceType('');
                      setCurrentPage(1);
                    }}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                </div>
              )}

              {/* Table */}
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No entries match your filters. Try adjusting your search criteria.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Staff</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Service Type</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead className="text-right">Cost (€)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedLogs.map((log: any) => {
                          const staff = staffQuery.data?.find(s => s.id === log.staffId);
                          const client = clientsQuery.data?.find(c => c.id === log.clientId);
                          const startTime = log.scheduledStartTime ? format(new Date(log.scheduledStartTime), 'HH:mm') : '--:--';
                          const endTime = log.scheduledEndTime ? format(new Date(log.scheduledEndTime), 'HH:mm') : '--:--';
                          
                          return (
                            <TableRow key={log.id}>
                              <TableCell className="font-mono text-sm">
                                {startTime} - {endTime}
                              </TableCell>
                              <TableCell>
                                {staff ? (
                                  <Link href={`/staff/${staff.id}`}>
                                    <span className="text-blue-600 hover:underline cursor-pointer">
                                      {staff.firstName} {staff.lastName}
                                    </span>
                                  </Link>
                                ) : (
                                  <span className="text-muted-foreground">Unknown</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {client ? (
                                  <Link href={`/clients/${client.id}`}>
                                    <span className="text-blue-600 hover:underline cursor-pointer">
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
                              <TableCell>{log.hours}h</TableCell>
                              <TableCell className="text-right font-semibold">
                                €{parseFloat(log.totalCost).toFixed(2)}
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
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <Button
                              key={page}
                              variant={page === currentPage ? "default" : "outline"}
                              size="sm"
                              className="w-8 h-8 p-0"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </Button>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* View All Link */}
                  <div className="text-center pt-2">
                    <Link href="/time-tracking">
                      <span className="text-blue-600 hover:underline text-sm cursor-pointer">
                        View full time tracking history →
                      </span>
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Warning Dialog */}
      <Dialog open={showBudgetWarning} onOpenChange={setShowBudgetWarning}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Budget Alert
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {budgetAvailability?.warnings.map((warning, index) => (
              <div key={index} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">{warning}</p>
              </div>
            ))}
            {budgetAvailability && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Available Credit:</h4>
                <p className="text-lg font-bold text-green-600">
                  €{budgetAvailability.totalAvailable.toFixed(2)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBudgetWarning(false)}>
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Allocation Result Dialog */}
      <Dialog open={showAllocationResult} onOpenChange={setShowAllocationResult}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {allocationResult?.success ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Hours Successfully Allocated
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Budget Insufficient
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {allocationResult?.success ? (
              <>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800 font-medium">
                    Total Cost: €{allocationResult.totalCost.toFixed(2)}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Time Log ID: {allocationResult.timeLogId}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Budget Allocations:</h4>
                  {allocationResult.allocations.map((allocation, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <span className="text-sm font-medium">{allocation.budgetCode}</span>
                        <span className="text-xs text-gray-600 ml-2">
                          {allocation.hours}h @ €{allocation.hourlyRate}/h
                          {allocation.mileage ? ` + ${allocation.mileage}km` : ''}
                        </span>
                      </div>
                      <span className="font-medium">€{allocation.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {allocationResult?.warnings.map((warning, index) => (
                  <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-800">{warning}</p>
                  </div>
                ))}
                
                {allocationResult?.receipt && (
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <h4 className="font-medium text-sm text-orange-800">Receipt Required:</h4>
                    <p className="text-sm text-orange-700 mt-1">
                      Amount: €{allocationResult.receipt.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      Reason: {allocationResult.receipt.reason}
                    </p>
                  </div>
                )}
              </>
            )}
            
            {allocationResult?.warnings && allocationResult.warnings.length > 0 && allocationResult.success && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Warnings:</h4>
                {allocationResult.warnings.map((warning, index) => (
                  <div key={index} className="p-2 bg-yellow-50 rounded border border-yellow-200">
                    <p className="text-xs text-yellow-800">{warning}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowAllocationResult(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}