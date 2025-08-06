import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, Home, Users, Euro, Save, Check, ChevronsUpDown, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Client } from "@shared/schema";

// Extended type for ClientBudgetConfig with budgetCode from API
interface ClientBudgetConfig {
  id: string;
  clientId: string;
  budgetTypeId: string;
  validFrom: Date | null;
  validTo: Date | null;
  weekdayRate: string;
  holidayRate: string;
  kilometerRate: string;
  availableBalance: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  budgetCode: string;
  budgetName: string;
}

interface DaySchedule {
  ore: string;
  km: string;
}

interface WeeklySchedule {
  lun: DaySchedule;
  mar: DaySchedule;
  mer: DaySchedule;
  gio: DaySchedule;
  ven: DaySchedule;
  sab: DaySchedule;
  dom: DaySchedule;
}

interface Holiday {
  date: Date;
  name: string;
}

// Function to get Italian holidays for a given year
function getItalianHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = [
    { date: new Date(year, 0, 1), name: "Capodanno" },
    { date: new Date(year, 0, 6), name: "Epifania" },
    { date: new Date(year, 3, 25), name: "Festa della Liberazione" },
    { date: new Date(year, 4, 1), name: "Festa del Lavoro" },
    { date: new Date(year, 4, 15), name: "San Simplicio - Patrono Olbia" },
    { date: new Date(year, 5, 2), name: "Festa della Repubblica" },
    { date: new Date(year, 7, 15), name: "Ferragosto" },
    { date: new Date(year, 10, 1), name: "Ognissanti" },
    { date: new Date(year, 11, 6), name: "San Nicola - Patrono Sassari" },
    { date: new Date(year, 11, 8), name: "Immacolata Concezione" },
    { date: new Date(year, 11, 25), name: "Natale" },
    { date: new Date(year, 11, 26), name: "Santo Stefano" },
  ];

  // Calculate Easter and related holidays
  const easter = calculateEaster(year);
  holidays.push({ date: easter, name: "Pasqua" });
  
  // Easter Monday (Lunedì dell'Angelo)
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  holidays.push({ date: easterMonday, name: "Lunedì dell'Angelo" });

  return holidays;
}

// Calculate Easter date using Gauss algorithm
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

// Get all Sundays in a date range
function getSundaysInRange(startDate: Date, endDate: Date): Holiday[] {
  const sundays: Holiday[] = [];
  const current = new Date(startDate);
  
  // Move to first Sunday
  while (current.getDay() !== 0) {
    current.setDate(current.getDate() + 1);
  }
  
  // Add all Sundays in range
  while (current <= endDate) {
    sundays.push({
      date: new Date(current),
      name: "Dom"
    });
    current.setDate(current.getDate() + 7);
  }
  
  return sundays;
}

export default function HomeCarePlanning() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isItalian = i18n.language === 'it';

  // State for client selection
  const [selectedClientId, setSelectedClientId] = useState("");
  const [openClientSearch, setOpenClientSearch] = useState(false);
  const [clientSearchValue, setClientSearchValue] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [selectedBudgets, setSelectedBudgets] = useState<string[]>([]);
  const [activeButton, setActiveButton] = useState<'all' | 'weekdays' | null>(null);
  const [showSundays, setShowSundays] = useState(true);
  
  // Weekly schedule state - initialized with empty strings for all fields
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({
    lun: { ore: "", km: "" },
    mar: { ore: "", km: "" },
    mer: { ore: "", km: "" },
    gio: { ore: "", km: "" },
    ven: { ore: "", km: "" },
    sab: { ore: "", km: "" },
    dom: { ore: "", km: "" }
  });

  // Fetch clients from database
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Fetch budget configurations for selected client
  const { data: budgetConfigs = [] } = useQuery<ClientBudgetConfig[]>({
    queryKey: [`/api/clients/${selectedClientId}/budget-configs`],
    enabled: !!selectedClientId,
  });

  // Initialize budgets mutation
  const initializeBudgetsMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/initialize-budgets`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${selectedClientId}/budget-configs`] });
      toast({
        title: isItalian ? "Budget inizializzati" : "Budgets initialized",
        description: isItalian ? "I budget sono stati configurati con successo" : "Budgets have been configured successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: isItalian ? "Errore" : "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize with first budget selected when budgets load
  useEffect(() => {
    if (budgetConfigs.length > 0 && selectedBudgets.length === 0) {
      setSelectedBudgets([budgetConfigs[0].budgetCode]);
    }
  }, [budgetConfigs, selectedBudgets]);

  // Calculate holidays in the selected period
  const getHolidaysInPeriod = (): Holiday[] => {
    if (!startDate || !endDate) return [];
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const holidays: Holiday[] = [];
    
    // Get years involved in the range
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    
    // Collect all Italian holidays for involved years
    for (let year = startYear; year <= endYear; year++) {
      const yearHolidays = getItalianHolidays(year);
      for (const holiday of yearHolidays) {
        if (holiday.date >= start && holiday.date <= end) {
          holidays.push(holiday);
        }
      }
    }
    
    // Add all Sundays in range only if showSundays is true
    if (showSundays) {
      const sundays = getSundaysInRange(start, end);
      
      // Merge holidays and Sundays, avoiding duplicates
      for (const sunday of sundays) {
        // Check if this Sunday is not already a holiday
        const isAlreadyHoliday = holidays.some(h => 
          h.date.toDateString() === sunday.date.toDateString()
        );
        
        if (!isAlreadyHoliday) {
          holidays.push(sunday);
        }
      }
    }
    
    // Sort by date
    holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    return holidays;
  };

  // Calculate totals
  const calculateTotals = () => {
    // Calculate total available budget from all configurations
    const totalAvailableBudget = budgetConfigs.reduce((sum, config) => 
      sum + parseFloat(config.availableBalance), 0
    );
    
    // Get the first selected budget for rate calculations
    const selectedBudgetConfig = budgetConfigs.find(b => selectedBudgets.includes(b.budgetCode));
    const availableBudget = selectedBudgets.length > 0 && selectedBudgetConfig
      ? parseFloat(selectedBudgetConfig.availableBalance) 
      : totalAvailableBudget;
    
    // Calculate weekly hours and km
    let weekdayHours = 0;
    let holidayHours = 0;
    let totalKm = 0;
    
    Object.entries(weeklySchedule).forEach(([day, schedule]) => {
      const hours = parseFloat(schedule.ore) || 0;
      const km = parseFloat(schedule.km) || 0;
      
      // Weekend days (sab, dom) are considered holiday
      if (day === 'sab' || day === 'dom') {
        holidayHours += hours;
      } else {
        weekdayHours += hours;
      }
      totalKm += km;
    });
    
    // Calculate costs based on rates
    const weekdayRate = selectedBudgetConfig ? parseFloat(selectedBudgetConfig.weekdayRate) : 0;
    const holidayRate = selectedBudgetConfig ? parseFloat(selectedBudgetConfig.holidayRate) : 0;
    const kmRate = selectedBudgetConfig ? parseFloat(selectedBudgetConfig.kilometerRate) : 0;
    
    const weekdayCost = weekdayHours * weekdayRate;
    const holidayCost = holidayHours * holidayRate;
    const kmCost = totalKm * kmRate;
    const estimatedCost = weekdayCost + holidayCost + kmCost;
    
    return {
      availableBudget,
      weekdayHours,
      holidayHours,
      totalKm,
      estimatedCost,
      remainingBudget: availableBudget - estimatedCost
    };
  };

  const totals = calculateTotals();

  const handleScheduleChange = (day: keyof WeeklySchedule, field: 'ore' | 'km', value: string) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
    // Clear active button when user manually edits
    setActiveButton(null);
  };

  const handleFillAll = () => {
    // Fill all days with default values
    const defaultOre = "1";
    const defaultKm = "0";
    setWeeklySchedule({
      lun: { ore: defaultOre, km: defaultKm },
      mar: { ore: defaultOre, km: defaultKm },
      mer: { ore: defaultOre, km: defaultKm },
      gio: { ore: defaultOre, km: defaultKm },
      ven: { ore: defaultOre, km: defaultKm },
      sab: { ore: defaultOre, km: defaultKm },
      dom: { ore: defaultOre, km: defaultKm }
    });
    setActiveButton('all');
  };

  const handleWeekdaysOnly = () => {
    // Fill weekdays with default values and clear weekends
    setWeeklySchedule({
      lun: { ore: "1", km: "0" },
      mar: { ore: "1", km: "0" },
      mer: { ore: "1", km: "0" },
      gio: { ore: "1", km: "0" },
      ven: { ore: "1", km: "0" },
      sab: { ore: "", km: "" },
      dom: { ore: "", km: "" }
    });
    setActiveButton('weekdays');
  };

  const handleClear = () => {
    setWeeklySchedule({
      lun: { ore: "", km: "" },
      mar: { ore: "", km: "" },
      mer: { ore: "", km: "" },
      gio: { ore: "", km: "" },
      ven: { ore: "", km: "" },
      sab: { ore: "", km: "" },
      dom: { ore: "", km: "" }
    });
    setActiveButton(null);
  };

  const days = [
    { key: 'lun' as keyof WeeklySchedule, label: isItalian ? 'Lun' : 'Mon' },
    { key: 'mar' as keyof WeeklySchedule, label: isItalian ? 'Mar' : 'Tue' },
    { key: 'mer' as keyof WeeklySchedule, label: isItalian ? 'Mer' : 'Wed' },
    { key: 'gio' as keyof WeeklySchedule, label: isItalian ? 'Gio' : 'Thu' },
    { key: 'ven' as keyof WeeklySchedule, label: isItalian ? 'Ven' : 'Fri' },
    { key: 'sab' as keyof WeeklySchedule, label: isItalian ? 'Sab' : 'Sat' },
    { key: 'dom' as keyof WeeklySchedule, label: isItalian ? 'Dom' : 'Sun' }
  ];

  return (
    <div className="container mx-auto py-2 space-y-3">
      {/* Header */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-cyan-500 to-blue-600">
        <CardHeader className="text-white py-3">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Home className="h-5 w-5" />
            {isItalian ? "Pianificatore Budget Domiciliare" : "Home Care Budget Planner"}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Client and Date Selection */}
      <Card className="shadow-md">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="flex items-center gap-1 mb-1 text-xs">
                <Users className="h-3 w-3" />
                {isItalian ? "Assistito" : "Client"}
              </Label>
              <Popover open={openClientSearch} onOpenChange={setOpenClientSearch}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openClientSearch}
                    className="w-full justify-between text-sm h-8"
                  >
                    {selectedClientId
                      ? clients.find((client) => client.id === selectedClientId)
                        ? `${clients.find((client) => client.id === selectedClientId)?.lastName}, ${clients.find((client) => client.id === selectedClientId)?.firstName}`
                        : isItalian ? "Seleziona assistito" : "Select client"
                      : isItalian ? "Seleziona assistito" : "Select client"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <div className="flex items-center border-b px-3">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <CommandInput 
                        placeholder={isItalian ? "Cerca per nome, email..." : "Search by name, email..."} 
                        value={clientSearchValue}
                        onValueChange={setClientSearchValue}
                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    <CommandList className="max-h-[300px] overflow-y-auto">
                      <CommandEmpty className="py-6 text-center text-sm">
                        {isItalian ? "Nessun assistito trovato" : "No clients found"}
                      </CommandEmpty>
                      <CommandGroup heading={clientSearchValue ? `${isItalian ? "Trovati" : "Found"} ${clients.filter(client => {
                        if (!clientSearchValue) return true;
                        const searchTerm = clientSearchValue.toLowerCase().trim();
                        const searchTerms = searchTerm.split(' ').filter(term => term.length > 0);
                        const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
                        const email = client.email?.toLowerCase() || '';
                        return searchTerms.every(term => 
                          fullName.includes(term) || email.includes(term)
                        );
                      }).length} ${isItalian ? "assistito/i" : "client(s)"}` : `${isItalian ? "Tutti gli Assistiti" : "All Clients"} (${clients.length})`}>
                        {clients
                          .filter(client => {
                            if (!clientSearchValue) return true;
                            const searchTerm = clientSearchValue.toLowerCase().trim();
                            const searchTerms = searchTerm.split(' ').filter(term => term.length > 0);
                            
                            const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
                            const email = client.email?.toLowerCase() || '';
                            
                            // Support multiple search terms (all must match)
                            return searchTerms.every(term => 
                              fullName.includes(term) || email.includes(term)
                            );
                          })
                          .sort((a, b) => {
                            // Sort by relevance - exact matches first, then alphabetical
                            const searchTerm = clientSearchValue.toLowerCase().trim();
                            const aFullName = `${a.firstName} ${a.lastName}`.toLowerCase();
                            const bFullName = `${b.firstName} ${b.lastName}`.toLowerCase();
                            
                            if (searchTerm) {
                              const aExactMatch = aFullName.startsWith(searchTerm);
                              const bExactMatch = bFullName.startsWith(searchTerm);
                              
                              if (aExactMatch && !bExactMatch) return -1;
                              if (!aExactMatch && bExactMatch) return 1;
                            }
                            
                            // Active clients first, then alphabetical by last name
                            if (a.status === 'active' && b.status !== 'active') return -1;
                            if (a.status !== 'active' && b.status === 'active') return 1;
                            
                            // Sort by last name, then first name
                            const lastNameCompare = a.lastName.localeCompare(b.lastName);
                            if (lastNameCompare !== 0) return lastNameCompare;
                            return a.firstName.localeCompare(b.firstName);
                          })
                          .map((client) => (
                            <CommandItem
                              key={client.id}
                              value={client.id}
                              onSelect={(currentValue) => {
                                setSelectedClientId(currentValue === selectedClientId ? "" : currentValue);
                                setOpenClientSearch(false);
                                setClientSearchValue("");
                              }}
                              className="flex items-center justify-between py-2 px-2 cursor-pointer hover:bg-accent"
                            >
                              <div className="flex items-center">
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedClientId === client.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {client.lastName}, {client.firstName}
                                  </span>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {client.email && (
                                      <span className="truncate max-w-[200px]">{client.email}</span>
                                    )}
                                    {client.status && (
                                      <Badge variant={client.status === 'active' ? 'default' : 'secondary'} className="h-4 px-1 text-[10px]">
                                        {client.status}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="flex items-center gap-1 mb-1 text-xs">
                <Calendar className="h-3 w-3" />
                {isItalian ? "Data Inizio" : "Start Date"}
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pr-8 h-8 text-sm"
                />
                <Calendar className="absolute right-2 top-2 h-3 w-3 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-1 mb-1 text-xs">
                <Calendar className="h-3 w-3" />
                {isItalian ? "Data Fine" : "End Date"}
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pr-8 h-8 text-sm"
                />
                <Calendar className="absolute right-2 top-2 h-3 w-3 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Budget Available */}
          {selectedClientId && (
            <div className="mt-3 p-2 bg-cyan-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs">
                  💰 {isItalian ? "Budget Disponibile" : "Available Budget"}: 
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-cyan-600">
                    € {totals.availableBudget.toFixed(2)} ({budgetConfigs.length} budget)
                  </span>
                  {budgetConfigs.length === 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => initializeBudgetsMutation.mutate(selectedClientId)}
                      disabled={initializeBudgetsMutation.isPending}
                      className="h-6 text-xs"
                    >
                      {isItalian ? "Inizializza" : "Initialize"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Holidays in Period */}
          {startDate && endDate && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <span className="text-red-600 text-xs">🎄</span>
                  <span className="font-semibold text-xs text-red-700">
                    {isItalian ? "FESTIVITÀ NEL PERIODO:" : "HOLIDAYS IN PERIOD:"}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Checkbox
                    id="show-sundays"
                    checked={showSundays}
                    onCheckedChange={(checked) => setShowSundays(checked as boolean)}
                    className="h-3 w-3 border-red-400 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                  />
                  <label
                    htmlFor="show-sundays"
                    className="text-[10px] font-medium text-red-700 cursor-pointer"
                  >
                    {isItalian ? "Mostra Domeniche" : "Show Sundays"}
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {getHolidaysInPeriod().map((holiday, index) => {
                  const dayOfWeek = holiday.date.toLocaleDateString('it-IT', { weekday: 'short' });
                  const dateOnly = holiday.date.toLocaleDateString('it-IT', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                  });
                  
                  // If it's a Sunday (Dom) and the holiday name is also "Dom", don't repeat it
                  const displayText = holiday.name === "Dom" 
                    ? `${dayOfWeek} ${dateOnly}` 
                    : `${dayOfWeek} ${dateOnly} - ${holiday.name}`;
                  
                  return (
                    <span 
                      key={index} 
                      className="inline-flex items-center px-1 py-0.5 bg-white text-red-700 border border-red-300 rounded text-[10px] font-medium"
                    >
                      {displayText}
                    </span>
                  );
                })}
                {getHolidaysInPeriod().length === 0 && (
                  <span className="text-[10px] text-gray-500 italic">
                    {isItalian ? "Nessuna festività nel periodo selezionato" : "No holidays in the selected period"}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Section */}
      {selectedClientId && budgetConfigs.length > 0 && (
        <Card className="shadow-md">
          <CardHeader className="bg-gradient-to-r from-gray-100 to-gray-200 py-2">
            <CardTitle className="flex items-center gap-1 text-gray-800 text-sm">
              <Users className="h-4 w-4" />
              {isItalian ? "Configurazione Assistenza" : "Care Configuration"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {/* Budget Selection with Checkboxes */}
            <div className="mb-3">
              <Label className="text-xs font-semibold mb-2 block">
                📋 {isItalian ? "Selezione Budget" : "Budget Selection"}
              </Label>
              <div className="flex flex-wrap gap-2">
                {budgetConfigs.map((budget) => (
                  <div
                    key={budget.id}
                    className={cn(
                      "flex items-center space-x-1 px-2 py-1 rounded-md border transition-all cursor-pointer",
                      selectedBudgets.includes(budget.budgetCode)
                        ? "bg-cyan-500 text-white border-cyan-600"
                        : "bg-white hover:bg-gray-50 border-gray-300"
                    )}
                    onClick={() => {
                      setSelectedBudgets(prev => 
                        prev.includes(budget.budgetCode)
                          ? prev.filter(b => b !== budget.budgetCode)
                          : [...prev, budget.budgetCode]
                      );
                    }}
                  >
                    <Checkbox
                      checked={selectedBudgets.includes(budget.budgetCode)}
                      className={cn(
                        "border h-3 w-3",
                        selectedBudgets.includes(budget.budgetCode)
                          ? "border-white data-[state=checked]:bg-white data-[state=checked]:text-cyan-500"
                          : "border-gray-400"
                      )}
                    />
                    <span className="text-xs font-medium">{budget.budgetCode}</span>
                    <span className="text-[10px]">€{parseFloat(budget.availableBalance).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Direct Care Section */}
            <Card className="border border-cyan-400">
              <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-2">
                <CardTitle className="text-sm">
                  🏥 {selectedBudgets.length > 0 ? selectedBudgets.join(", ") : "DIRECT CARE (KM)"} 
                  {selectedBudgets.length > 0 && budgetConfigs.find(b => selectedBudgets.includes(b.budgetCode)) && (
                    <span className="ml-2 text-xs font-normal">
                      (KM: €{parseFloat(budgetConfigs.find(b => selectedBudgets.includes(b.budgetCode))!.kilometerRate).toFixed(2)}/km)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                {/* Weekly Planning Grid */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left side - Care Days Grid */}
                    <div>
                      <div className="font-medium text-xs mb-2 text-gray-700">
                        {isItalian ? "Giorni Assistenza" : "Care Days"}
                      </div>
                      
                      {/* Days with checkboxes */}
                      <div className="space-y-2">
                        {/* First row: Mon-Wed */}
                        <div className="grid grid-cols-3 gap-2">
                          {days.slice(0, 3).map((day) => (
                            <div key={day.key} className="text-center">
                              <div className="text-[10px] font-medium mb-1">{day.label}</div>
                              <div className="flex items-center justify-center mb-1">
                                <Checkbox
                                  checked={weeklySchedule[day.key].ore !== "" || weeklySchedule[day.key].km !== ""}
                                  onCheckedChange={(checked) => {
                                    if (!checked) {
                                      handleScheduleChange(day.key, 'ore', '');
                                      handleScheduleChange(day.key, 'km', '');
                                    }
                                  }}
                                  className="mr-1 h-3 w-3"
                                />
                                <span className="text-[10px] text-gray-500">ORE</span>
                              </div>
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={weeklySchedule[day.key].ore}
                                onChange={(e) => handleScheduleChange(day.key, 'ore', e.target.value)}
                                placeholder="0"
                                className="text-center h-6 mb-1 text-xs"
                              />
                              <div className="text-[10px] text-gray-500 mb-1">KM</div>
                              <Input
                                type="number"
                                min="0"
                                value={weeklySchedule[day.key].km}
                                onChange={(e) => handleScheduleChange(day.key, 'km', e.target.value)}
                                placeholder="0"
                                className="text-center h-6 text-xs"
                              />
                            </div>
                          ))}
                        </div>

                        {/* Second row: Thu-Sat */}
                        <div className="grid grid-cols-3 gap-2">
                          {days.slice(3, 6).map((day) => (
                            <div key={day.key} className="text-center">
                              <div className="text-[10px] font-medium mb-1">{day.label}</div>
                              <div className="flex items-center justify-center mb-1">
                                <Checkbox
                                  checked={weeklySchedule[day.key].ore !== "" || weeklySchedule[day.key].km !== ""}
                                  onCheckedChange={(checked) => {
                                    if (!checked) {
                                      handleScheduleChange(day.key, 'ore', '');
                                      handleScheduleChange(day.key, 'km', '');
                                    }
                                  }}
                                  className="mr-1 h-3 w-3"
                                />
                                <span className="text-[10px] text-gray-500">ORE</span>
                              </div>
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={weeklySchedule[day.key].ore}
                                onChange={(e) => handleScheduleChange(day.key, 'ore', e.target.value)}
                                placeholder="0"
                                className="text-center h-6 mb-1 text-xs"
                              />
                              <div className="text-[10px] text-gray-500 mb-1">KM</div>
                              <Input
                                type="number"
                                min="0"
                                value={weeklySchedule[day.key].km}
                                onChange={(e) => handleScheduleChange(day.key, 'km', e.target.value)}
                                placeholder="0"
                                className="text-center h-6 text-xs"
                              />
                            </div>
                          ))}
                        </div>

                        {/* Third row: Sun */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center">
                            <div className="text-[10px] font-medium mb-1">{days[6].label}</div>
                            <div className="flex items-center justify-center mb-1">
                              <Checkbox
                                checked={weeklySchedule[days[6].key].ore !== "" || weeklySchedule[days[6].key].km !== ""}
                                onCheckedChange={(checked) => {
                                  if (!checked) {
                                    handleScheduleChange(days[6].key, 'ore', '');
                                    handleScheduleChange(days[6].key, 'km', '');
                                  }
                                }}
                                className="mr-1 h-3 w-3"
                              />
                              <span className="text-[10px] text-gray-500">ORE</span>
                            </div>
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              value={weeklySchedule[days[6].key].ore}
                              onChange={(e) => handleScheduleChange(days[6].key, 'ore', e.target.value)}
                              placeholder="0"
                              className="text-center h-6 mb-1 text-xs"
                            />
                            <div className="text-[10px] text-gray-500 mb-1">KM</div>
                            <Input
                              type="number"
                              min="0"
                              value={weeklySchedule[days[6].key].km}
                              onChange={(e) => handleScheduleChange(days[6].key, 'km', e.target.value)}
                              placeholder="0"
                              className="text-center h-6 text-xs"
                            />
                          </div>
                          {/* Empty cells for alignment */}
                          <div></div>
                          <div></div>
                        </div>
                      </div>
                    </div>

                    {/* Right side - Totals */}
                    <div className="space-y-2">
                      <div>
                        <div className="font-medium text-xs mb-1 text-gray-700">
                          {isItalian ? "Ore Totali Pianificate" : "Total Planned Hours"}
                        </div>
                        <div className="bg-cyan-100 rounded px-2 py-1 text-center">
                          <span className="text-sm font-semibold">{(totals.weekdayHours + totals.holidayHours).toFixed(1)}h</span>
                        </div>
                        <div className="text-[10px] text-gray-600 mt-1 text-center">
                          {isItalian ? "Esclusi domeniche e festivi" : "Excludes Sundays and holidays"}
                        </div>
                      </div>

                      <div>
                        <div className="font-medium text-xs mb-1 text-gray-700">
                          {isItalian ? "Chilometri Totali" : "Total Kilometers"}
                        </div>
                        <div className="bg-cyan-100 rounded px-2 py-1 text-center">
                          <span className="text-sm font-semibold">{totals.totalKm} km</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-1 mt-2">
                    <Button
                      onClick={handleFillAll}
                      className={cn(
                        "h-7 text-xs px-2",
                        activeButton === 'all' 
                          ? "bg-cyan-600 text-white" 
                          : "bg-cyan-500 hover:bg-cyan-600 text-white"
                      )}
                    >
                      {isItalian ? "Tutti" : "All"}
                    </Button>
                    <Button
                      onClick={handleWeekdaysOnly}
                      variant={activeButton === 'weekdays' ? "default" : "outline"}
                      className={cn("h-7 text-xs px-2", activeButton === 'weekdays' ? "bg-cyan-600" : "")}
                    >
                      {isItalian ? "Solo Feriali" : "Weekdays Only"}
                    </Button>
                    <Button
                      onClick={handleClear}
                      className="bg-yellow-400 hover:bg-yellow-500 text-black ml-auto h-7 text-xs px-2"
                    >
                      {isItalian ? "Pulisci" : "Clear"}
                    </Button>
                  </div>

                  {/* Summary Section */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 p-2 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-[10px] text-gray-600">{isItalian ? "Ore Feriali" : "Weekday Hours"}</div>
                      <div className="text-sm font-bold">{totals.weekdayHours.toFixed(1)}h</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-600">{isItalian ? "Ore Festive" : "Holiday Hours"}</div>
                      <div className="text-sm font-bold">{totals.holidayHours.toFixed(1)}h</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-600">{isItalian ? "Costo Stimato" : "Estimated Cost"}</div>
                      <div className="text-sm font-bold">€ {totals.estimatedCost.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-600">{isItalian ? "Residuo" : "Remaining"}</div>
                      <div className={cn(
                        "text-sm font-bold",
                        totals.remainingBudget >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        € {totals.remainingBudget.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
                </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}
    </div>
  );
}