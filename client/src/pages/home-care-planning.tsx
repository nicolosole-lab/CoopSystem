import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, Home, Users, Euro, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Client, ClientBudgetConfig } from "@shared/schema";

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

export default function HomeCarePlanning() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isItalian = i18n.language === 'it';

  // State for client selection
  const [selectedClientId, setSelectedClientId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [selectedBudgets, setSelectedBudgets] = useState<string[]>([]);
  
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

  // Calculate totals
  const calculateTotals = () => {
    // Get the first selected budget for calculations
    const selectedBudgetConfig = budgetConfigs.find(b => selectedBudgets.includes(b.budgetCode));
    const availableBudget = selectedBudgetConfig ? parseFloat(selectedBudgetConfig.availableBalance) : 0;
    
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
  };

  const handleFillAll = () => {
    // This function would fill all weekdays with same values
    const defaultOre = "1";
    const defaultKm = "0";
    setWeeklySchedule({
      lun: { ore: defaultOre, km: defaultKm },
      mar: { ore: defaultOre, km: defaultKm },
      mer: { ore: defaultOre, km: defaultKm },
      gio: { ore: defaultOre, km: defaultKm },
      ven: { ore: defaultOre, km: defaultKm },
      sab: { ore: "0", km: "0" },
      dom: { ore: "0", km: "0" }
    });
  };

  const handleWeekdaysOnly = () => {
    setWeeklySchedule(prev => ({
      ...prev,
      sab: { ore: "0", km: "0" },
      dom: { ore: "0", km: "0" }
    }));
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
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-cyan-500 to-blue-600">
        <CardHeader className="text-white">
          <CardTitle className="text-2xl font-bold flex items-center gap-3">
            <Home className="h-8 w-8" />
            {isItalian ? "Pianificatore Budget Domiciliare" : "Home Care Budget Planner"}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Client and Date Selection */}
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4" />
                {isItalian ? "Assistito" : "Client"}
              </Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="font-medium">
                  <SelectValue placeholder={isItalian ? "Seleziona assistito" : "Select client"} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.lastName}, {client.firstName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4" />
                {isItalian ? "Data Inizio" : "Start Date"}
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pr-10"
                />
                <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4" />
                {isItalian ? "Data Fine" : "End Date"}
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pr-10"
                />
                <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Budget Available */}
          {selectedClientId && (
            <div className="mt-6 p-4 bg-cyan-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-lg">
                  💰 {isItalian ? "Budget Disponibile" : "Available Budget"}: 
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-cyan-600">
                    € {totals.availableBudget.toFixed(2)} ({budgetConfigs.length} budget)
                  </span>
                  {budgetConfigs.length === 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => initializeBudgetsMutation.mutate(selectedClientId)}
                      disabled={initializeBudgetsMutation.isPending}
                    >
                      {isItalian ? "Inizializza" : "Initialize"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Section */}
      {selectedClientId && budgetConfigs.length > 0 && (
        <Card className="shadow-md">
          <CardHeader className="bg-gradient-to-r from-gray-100 to-gray-200">
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Users className="h-5 w-5" />
              {isItalian ? "Configurazione Assistenza" : "Care Configuration"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Budget Selection with Checkboxes */}
            <div className="mb-6">
              <Label className="text-sm font-semibold mb-3 block">
                📋 {isItalian ? "Selezione Budget" : "Budget Selection"}
              </Label>
              <div className="flex flex-wrap gap-3">
                {budgetConfigs.map((budget) => (
                  <div
                    key={budget.id}
                    className={cn(
                      "flex items-center space-x-2 px-3 py-2 rounded-md border transition-all cursor-pointer",
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
                        "border-2",
                        selectedBudgets.includes(budget.budgetCode)
                          ? "border-white data-[state=checked]:bg-white data-[state=checked]:text-cyan-500"
                          : "border-gray-400"
                      )}
                    />
                    <span className="font-medium">{budget.budgetCode}</span>
                    <span className="text-sm">€{parseFloat(budget.availableBalance).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Direct Care Section */}
            <Card className="border-2 border-cyan-400">
              <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                <CardTitle className="text-lg">
                  🏥 {selectedBudgets.length > 0 ? selectedBudgets.join(", ") : "DIRECT CARE (KM)"} 
                  {selectedBudgets.length > 0 && budgetConfigs.find(b => selectedBudgets.includes(b.budgetCode)) && (
                    <span className="ml-2 text-sm font-normal">
                      (KM: €{parseFloat(budgetConfigs.find(b => selectedBudgets.includes(b.budgetCode))!.kilometerRate).toFixed(2)}/km)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Weekly Planning Grid */}
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="font-semibold text-sm">{isItalian ? "Giorni Assistenza" : "Care Days"}</div>
                    <div className="font-semibold text-sm">{isItalian ? "Ore Totali Pianificate" : "Total Planned Hours"}</div>
                    <div className="font-semibold text-sm">{isItalian ? "Chilometri Totali" : "Total Kilometers"}</div>
                    <div></div>
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-4 gap-4">
                    {days.slice(0, 4).map((day) => (
                      <div key={day.key} className="space-y-3">
                        <div className="text-center font-semibold text-sm">{day.label}</div>
                        <div className="text-center text-xs text-gray-500 uppercase">
                          {weeklySchedule[day.key].ore || weeklySchedule[day.key].km ? "ORE" : ""}
                        </div>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={weeklySchedule[day.key].ore}
                          onChange={(e) => handleScheduleChange(day.key, 'ore', e.target.value)}
                          placeholder="0"
                          className="text-center"
                        />
                        <div className="text-center text-xs text-gray-500 uppercase">KM</div>
                        <Input
                          type="number"
                          min="0"
                          value={weeklySchedule[day.key].km}
                          onChange={(e) => handleScheduleChange(day.key, 'km', e.target.value)}
                          placeholder="0"
                          className="text-center"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Last 3 days */}
                  <div className="grid grid-cols-3 gap-4">
                    {days.slice(4).map((day) => (
                      <div key={day.key} className="space-y-3">
                        <div className="text-center font-semibold text-sm">{day.label}</div>
                        <div className="text-center text-xs text-gray-500 uppercase">
                          {weeklySchedule[day.key].ore || weeklySchedule[day.key].km ? "ORE" : ""}
                        </div>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={weeklySchedule[day.key].ore}
                          onChange={(e) => handleScheduleChange(day.key, 'ore', e.target.value)}
                          placeholder="0"
                          className="text-center"
                        />
                        <div className="text-center text-xs text-gray-500 uppercase">KM</div>
                        <Input
                          type="number"
                          min="0"
                          value={weeklySchedule[day.key].km}
                          onChange={(e) => handleScheduleChange(day.key, 'km', e.target.value)}
                          placeholder="0"
                          className="text-center"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={handleFillAll}
                      className="bg-cyan-500 hover:bg-cyan-600 text-white"
                    >
                      {isItalian ? "Tutti" : "All"}
                    </Button>
                    <Button
                      onClick={handleWeekdaysOnly}
                      variant="outline"
                    >
                      {isItalian ? "Solo Feriali" : "Weekdays Only"}
                    </Button>
                    <Button
                      onClick={handleClear}
                      className="bg-yellow-400 hover:bg-yellow-500 text-black ml-auto"
                    >
                      {isItalian ? "Pulisci" : "Clear"}
                    </Button>
                  </div>

                  {/* Summary Section */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-600">{isItalian ? "Ore Feriali" : "Weekday Hours"}</div>
                      <div className="text-xl font-bold">{totals.weekdayHours.toFixed(1)}h</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">{isItalian ? "Ore Festive" : "Holiday Hours"}</div>
                      <div className="text-xl font-bold">{totals.holidayHours.toFixed(1)}h</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">{isItalian ? "Costo Stimato" : "Estimated Cost"}</div>
                      <div className="text-xl font-bold">€ {totals.estimatedCost.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">{isItalian ? "Residuo" : "Remaining"}</div>
                      <div className={cn(
                        "text-xl font-bold",
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