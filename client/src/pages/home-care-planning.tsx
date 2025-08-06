import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, Home, Users, Euro, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [activeButton, setActiveButton] = useState<'all' | 'weekdays' | null>(null);
  
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
        title: t("homeCarePlanning.budgetInitialized"),
        description: t("homeCarePlanning.budgetInitializedDesc"),
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
    { key: 'lun' as keyof WeeklySchedule, label: t("homeCarePlanning.monShort") },
    { key: 'mar' as keyof WeeklySchedule, label: t("homeCarePlanning.tueShort") },
    { key: 'mer' as keyof WeeklySchedule, label: t("homeCarePlanning.wedShort") },
    { key: 'gio' as keyof WeeklySchedule, label: t("homeCarePlanning.thuShort") },
    { key: 'ven' as keyof WeeklySchedule, label: t("homeCarePlanning.friShort") },
    { key: 'sab' as keyof WeeklySchedule, label: t("homeCarePlanning.satShort") },
    { key: 'dom' as keyof WeeklySchedule, label: t("homeCarePlanning.sunShort") }
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-cyan-500 to-blue-600">
        <CardHeader className="text-white">
          <CardTitle className="text-2xl font-bold flex items-center gap-3">
            <Home className="h-8 w-8" />
            {t("homeCarePlanning.title")}
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
                {t("homeCarePlanning.client")}
              </Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="font-medium">
                  <SelectValue placeholder={t("homeCarePlanning.selectClient")} />
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
                {t("homeCarePlanning.startDate")}
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
                {t("homeCarePlanning.endDate")}
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
                  💰 {t("homeCarePlanning.availableBudget")}: 
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-cyan-600">
                    € {totals.availableBudget.toFixed(2)} ({budgetConfigs.length} {t("homeCarePlanning.budgets")})
                  </span>
                  {budgetConfigs.length === 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => initializeBudgetsMutation.mutate(selectedClientId)}
                      disabled={initializeBudgetsMutation.isPending}
                    >
                      {t("homeCarePlanning.initialize")}
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
              {t("homeCarePlanning.careConfiguration")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Budget Selection with Checkboxes */}
            <div className="mb-6">
              <Label className="text-sm font-semibold mb-3 block">
                📋 {t("homeCarePlanning.budgetSelection")}
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
                  <div className="grid grid-cols-2 gap-8">
                    {/* Left side - Care Days Grid */}
                    <div>
                      <div className="font-medium text-sm mb-4 text-gray-700">
                        {t("homeCarePlanning.careDays")}
                      </div>
                      
                      {/* Days with checkboxes */}
                      <div className="space-y-4">
                        {/* First row: Mon-Wed */}
                        <div className="grid grid-cols-3 gap-3">
                          {days.slice(0, 3).map((day) => (
                            <div key={day.key} className="text-center">
                              <div className="text-xs font-medium mb-1">{day.label}</div>
                              <div className="flex items-center justify-center mb-1">
                                <Checkbox
                                  checked={weeklySchedule[day.key].ore !== "" || weeklySchedule[day.key].km !== ""}
                                  onCheckedChange={(checked) => {
                                    if (!checked) {
                                      handleScheduleChange(day.key, 'ore', '');
                                      handleScheduleChange(day.key, 'km', '');
                                    }
                                  }}
                                  className="mr-2"
                                />
                                <span className="text-xs text-gray-500">ORE</span>
                              </div>
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={weeklySchedule[day.key].ore}
                                onChange={(e) => handleScheduleChange(day.key, 'ore', e.target.value)}
                                placeholder="0"
                                className="text-center h-7 mb-1 text-sm"
                              />
                              <div className="text-xs text-gray-500 mb-1">KM</div>
                              <Input
                                type="number"
                                min="0"
                                value={weeklySchedule[day.key].km}
                                onChange={(e) => handleScheduleChange(day.key, 'km', e.target.value)}
                                placeholder="0"
                                className="text-center h-7 text-sm"
                              />
                            </div>
                          ))}
                        </div>

                        {/* Second row: Thu-Sat */}
                        <div className="grid grid-cols-3 gap-3">
                          {days.slice(3, 6).map((day) => (
                            <div key={day.key} className="text-center">
                              <div className="text-xs font-medium mb-1">{day.label}</div>
                              <div className="flex items-center justify-center mb-1">
                                <Checkbox
                                  checked={weeklySchedule[day.key].ore !== "" || weeklySchedule[day.key].km !== ""}
                                  onCheckedChange={(checked) => {
                                    if (!checked) {
                                      handleScheduleChange(day.key, 'ore', '');
                                      handleScheduleChange(day.key, 'km', '');
                                    }
                                  }}
                                  className="mr-2"
                                />
                                <span className="text-xs text-gray-500">ORE</span>
                              </div>
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={weeklySchedule[day.key].ore}
                                onChange={(e) => handleScheduleChange(day.key, 'ore', e.target.value)}
                                placeholder="0"
                                className="text-center h-7 mb-1 text-sm"
                              />
                              <div className="text-xs text-gray-500 mb-1">KM</div>
                              <Input
                                type="number"
                                min="0"
                                value={weeklySchedule[day.key].km}
                                onChange={(e) => handleScheduleChange(day.key, 'km', e.target.value)}
                                placeholder="0"
                                className="text-center h-7 text-sm"
                              />
                            </div>
                          ))}
                        </div>

                        {/* Third row: Sun */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center">
                            <div className="text-xs font-medium mb-1">{days[6].label}</div>
                            <div className="flex items-center justify-center mb-1">
                              <Checkbox
                                checked={weeklySchedule[days[6].key].ore !== "" || weeklySchedule[days[6].key].km !== ""}
                                onCheckedChange={(checked) => {
                                  if (!checked) {
                                    handleScheduleChange(days[6].key, 'ore', '');
                                    handleScheduleChange(days[6].key, 'km', '');
                                  }
                                }}
                                className="mr-2"
                              />
                              <span className="text-xs text-gray-500">ORE</span>
                            </div>
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              value={weeklySchedule[days[6].key].ore}
                              onChange={(e) => handleScheduleChange(days[6].key, 'ore', e.target.value)}
                              placeholder="0"
                              className="text-center h-7 mb-1 text-sm"
                            />
                            <div className="text-xs text-gray-500 mb-1">KM</div>
                            <Input
                              type="number"
                              min="0"
                              value={weeklySchedule[days[6].key].km}
                              onChange={(e) => handleScheduleChange(days[6].key, 'km', e.target.value)}
                              placeholder="0"
                              className="text-center h-7 text-sm"
                            />
                          </div>
                          {/* Empty cells for alignment */}
                          <div></div>
                          <div></div>
                        </div>
                      </div>
                    </div>

                    {/* Right side - Totals */}
                    <div className="space-y-4">
                      <div>
                        <div className="font-medium text-sm mb-2 text-gray-700">
                          {t("homeCarePlanning.totalPlannedHours")}
                        </div>
                        <div className="bg-cyan-100 rounded px-3 py-2 text-center">
                          <span className="text-lg font-semibold">{(totals.weekdayHours + totals.holidayHours).toFixed(1)}h</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1 text-center">
                          {t("homeCarePlanning.excludesSundaysHolidays")}
                        </div>
                      </div>

                      <div>
                        <div className="font-medium text-sm mb-2 text-gray-700">
                          {t("homeCarePlanning.totalKilometers")}
                        </div>
                        <div className="bg-cyan-100 rounded px-3 py-2 text-center">
                          <span className="text-lg font-semibold">{totals.totalKm} km</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={handleFillAll}
                      className={cn(
                        activeButton === 'all' 
                          ? "bg-cyan-600 text-white" 
                          : "bg-cyan-500 hover:bg-cyan-600 text-white"
                      )}
                    >
                      {t("homeCarePlanning.all")}
                    </Button>
                    <Button
                      onClick={handleWeekdaysOnly}
                      variant={activeButton === 'weekdays' ? "default" : "outline"}
                      className={activeButton === 'weekdays' ? "bg-cyan-600" : ""}
                    >
                      {t("homeCarePlanning.weekdaysOnly")}
                    </Button>
                    <Button
                      onClick={handleClear}
                      className="bg-yellow-400 hover:bg-yellow-500 text-black ml-auto"
                    >
                      {t("homeCarePlanning.clear")}
                    </Button>
                  </div>

                  {/* Summary Section */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-600">{t("homeCarePlanning.weekdayHours")}</div>
                      <div className="text-xl font-bold">{totals.weekdayHours.toFixed(1)}h</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">{t("homeCarePlanning.holidayHours")}</div>
                      <div className="text-xl font-bold">{totals.holidayHours.toFixed(1)}h</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">{t("homeCarePlanning.estimatedCost")}</div>
                      <div className="text-xl font-bold">€ {totals.estimatedCost.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">{t("homeCarePlanning.remaining")}</div>
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