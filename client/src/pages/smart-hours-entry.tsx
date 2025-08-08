import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { format, startOfWeek, endOfWeek, isToday } from 'date-fns';
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
import { CalendarIcon, Clock, Check, ChevronsUpDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';

export default function SmartHoursEntry() {
  const { toast } = useToast();
  
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
  
  // Filter states for recent entries
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  // Fetch client budget allocations for the selected month
  const selectedMonth = selectedDate.getMonth() + 1; // JavaScript months are 0-indexed
  const selectedYear = selectedDate.getFullYear();
  
  const { data: budgetAllocations = [] } = useQuery<any[]>({
    queryKey: [`/api/clients/${selectedClient}/budget-allocations?month=${selectedMonth}&year=${selectedYear}`],
    enabled: !!selectedClient,
    retry: false
  });

  // Fetch time logs
  const { data: timeLogs = [] } = useQuery<any[]>({
    queryKey: ['/api/time-logs'],
    retry: false
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

  // Group budgets by type for display
  const budgetsByType = useMemo(() => {
    const grouped: Record<string, any> = {};
    
    // Debug: Log what we're receiving
    console.log('Budget allocations received:', budgetAllocations);
    
    budgetAllocations.forEach((allocation: any) => {
      // Check different possible property names
      const budgetType = allocation.budgetType || allocation.budget_type;
      const typeId = budgetType?.id || allocation.budgetTypeId || allocation.budget_type_id;
      
      if (!typeId) {
        console.log('Skipping allocation - no type ID found:', allocation);
        return;
      }
      
      if (!grouped[typeId]) {
        grouped[typeId] = {
          id: typeId,
          code: budgetType?.code || 'UNKNOWN',
          name: budgetType?.name || 'Budget',
          allocations: [],
          totalAvailable: 0
        };
      }
      
      const available = parseFloat(allocation.allocatedAmount || allocation.allocated_amount || '0') - 
                       parseFloat(allocation.usedAmount || allocation.used_amount || '0');
      grouped[typeId].allocations.push({
        ...allocation,
        available
      });
      grouped[typeId].totalAvailable += available;
    });
    
    console.log('Grouped budgets:', grouped);
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
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Time entry saved successfully'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/time-logs'] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${selectedClient}/budget-allocations?month=${selectedMonth}&year=${selectedYear}`] });
      
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
    
    const startDate = new Date(log.scheduledStartTime);
    const endDate = new Date(log.scheduledEndTime);
    
    // Simple UTC offset fix for display
    const offsetHours = 8; // Adjust based on timezone difference
    const displayStart = new Date(startDate.getTime() + offsetHours * 60 * 60 * 1000);
    const displayEnd = new Date(endDate.getTime() + offsetHours * 60 * 60 * 1000);
    
    return `${format(displayStart, 'HH:mm')} - ${format(displayEnd, 'HH:mm')}`;
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Smart Hours Entry</h1>

      {/* Main Entry Card */}
      <Card>
        <CardHeader>
          <CardTitle>Log Time Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Selection */}
          <div>
            <Label>Service Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
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
            <div>
              <Label>Time In</Label>
              <Input
                type="time"
                value={timeIn}
                onChange={(e) => setTimeIn(e.target.value)}
              />
            </div>
            <div>
              <Label>Time Out</Label>
              <Input
                type="time"
                value={timeOut}
                onChange={(e) => setTimeOut(e.target.value)}
              />
            </div>
            <div>
              <Label>Total Hours</Label>
              <div className="h-10 px-3 py-2 bg-gray-50 rounded-md border flex items-center">
                <Badge variant="secondary" className="text-lg">
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
                        "cursor-pointer transition-all",
                        selectedBudgetId === budget.allocations[0]?.id
                          ? "ring-2 ring-blue-500 bg-blue-50"
                          : "hover:shadow-md"
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
                          <p className="text-sm text-gray-600">Available</p>
                          <p className="text-lg font-bold text-green-600">
                            €{budget.totalAvailable.toFixed(2)}
                          </p>
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
          <div className="flex justify-end">
            <Button
              onClick={handleSaveEntry}
              disabled={!selectedStaff || !selectedClient || !selectedBudgetId || calculatedHours <= 0}
              className="px-8"
            >
              <Clock className="mr-2 h-4 w-4" />
              Save Time Entry
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Time Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today's Time Entries
            {todayLogs.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {filteredLogs.length} entries
              </Badge>
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
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">
                            {formatTimeDisplay(log)}
                          </TableCell>
                          <TableCell>
                            {staffMember ? (
                              <Link href={`/staff/${staffMember.id}`}>
                                <span className="text-blue-600 hover:underline cursor-pointer">
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
                          <TableCell className="text-muted-foreground text-sm">
                            {log.createdAt ? format(new Date(log.createdAt), 'HH:mm') : 'N/A'}
                          </TableCell>
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