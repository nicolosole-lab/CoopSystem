import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, Home, Users, Euro, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Client, ClientBudgetConfig } from "@shared/schema";

interface BudgetType {
  code: string;
  name: string;
  amount: number;
  selected: boolean;
}

interface DayHours {
  ore: number;
  km: number;
}

interface WeeklySchedule {
  [key: string]: DayHours;
}

export default function HomeCarePlanning() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isItalian = i18n.language === 'it';

  // State for client selection
  const [selectedClientId, setSelectedClientId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [showBudgetDetails, setShowBudgetDetails] = useState(false);
  
  // Budget types state
  const [budgetTypes, setBudgetTypes] = useState<BudgetType[]>([]);

  // Weekly schedule state
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({
    lun: { ore: 0, km: 0 },
    mar: { ore: 0, km: 0 },
    mer: { ore: 0, km: 0 },
    gio: { ore: 0, km: 0 },
    ven: { ore: 0, km: 0 },
    sab: { ore: 0, km: 0 },
    dom: { ore: 0, km: 0 }
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

  // Update budget types when budget configs change
  useEffect(() => {
    if (budgetConfigs.length > 0) {
      setBudgetTypes(budgetConfigs.map(config => ({
        code: config.budgetCode,
        name: config.budgetName,
        amount: parseFloat(config.availableBalance),
        selected: false
      })));
    }
  }, [budgetConfigs]);

  // Create mutation for saving home care plan
  const createPlanMutation = useMutation({
    mutationFn: async (planData: any) => {
      const res = await apiRequest("POST", "/api/home-care-plans", planData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/home-care-plans"] });
      toast({
        title: isItalian ? "Pianificazione salvata" : "Planning saved",
        description: isItalian ? "La pianificazione è stata salvata con successo" : "The planning has been saved successfully",
      });
      // Reset form
      setSelectedClientId("");
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    },
    onError: (error: Error) => {
      toast({
        title: isItalian ? "Errore" : "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Calculate totals
  const calculateTotals = () => {
    // Calculate total available budget from all budget configurations
    const totalAvailableBudget = budgetConfigs.length > 0 
      ? budgetConfigs.reduce((sum, config) => sum + parseFloat(config.availableBalance), 0)
      : 0;
    
    const totalBudget = budgetTypes.reduce((sum, budget) => 
      budget.selected ? sum + budget.amount : sum, 0
    );
    
    const weeklyHours = Object.values(weeklySchedule).reduce((sum, day) => sum + day.ore, 0);
    const weeklyKm = Object.values(weeklySchedule).reduce((sum, day) => sum + day.km, 0);
    
    // Calculate for the period
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const weeks = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    const totalHours = weeklyHours * weeks;
    const totalKm = weeklyKm * weeks;
    const estimatedCost = totalHours * 22; // €22/hour as shown in screenshot
    
    return {
      totalBudget,
      totalAvailableBudget,
      weeklyHours,
      weeklyKm,
      totalHours,
      totalKm,
      estimatedCost,
      remainingBudget: totalBudget - estimatedCost
    };
  };

  const totals = calculateTotals();

  const handleBudgetToggle = (code: string) => {
    setBudgetTypes(budgetTypes.map(budget => 
      budget.code === code ? { ...budget, selected: !budget.selected } : budget
    ));
  };

  const handleScheduleChange = (day: string, field: 'ore' | 'km', value: string) => {
    const numValue = parseFloat(value) || 0;
    setWeeklySchedule({
      ...weeklySchedule,
      [day]: {
        ...weeklySchedule[day],
        [field]: numValue
      }
    });
  };

  const handleSavePlan = () => {
    if (!selectedClientId) {
      toast({
        title: isItalian ? "Errore" : "Error",
        description: isItalian ? "Seleziona un assistito" : "Please select a client",
        variant: "destructive",
      });
      return;
    }

    const selectedBudgetCodes = budgetTypes
      .filter(b => b.selected)
      .map(b => b.code);

    const planData = {
      clientId: selectedClientId,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      totalBudget: String(totals.totalBudget),
      estimatedCost: String(totals.estimatedCost),
      weeklySchedule,
      selectedBudgets: selectedBudgetCodes,
      status: "draft"
    };

    createPlanMutation.mutate(planData);
  };

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
              <Label className="mb-2">{isItalian ? "Data Inizio" : "Start Date"}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2">{isItalian ? "Data Fine" : "End Date"}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Budget Available */}
          <div className="mt-6 p-4 bg-cyan-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-lg">
                💰 {isItalian ? "Budget Disponibile" : "Available Budget"}: 
              </span>
              <span className="text-2xl font-bold text-cyan-600">
                € {totals.totalAvailableBudget.toFixed(2)} ({budgetConfigs.length} budget)
              </span>
              {budgetConfigs.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-cyan-600"
                  onClick={() => setShowBudgetDetails(!showBudgetDetails)}
                >
                  {isItalian ? "Dettagli Tariffe" : "Rate Details"}
                </Button>
              )}
            </div>
          </div>

          {/* Budget Details Table */}
          {showBudgetDetails && budgetConfigs.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left text-sm font-semibold">
                      {isItalian ? "Codice Budget" : "Budget Code"}
                    </th>
                    <th className="border p-2 text-left text-sm font-semibold">
                      {isItalian ? "Nome Budget" : "Budget Name"}
                    </th>
                    <th className="border p-2 text-right text-sm font-semibold">
                      {isItalian ? "Tariffa Feriale" : "Weekday Rate"}
                    </th>
                    <th className="border p-2 text-right text-sm font-semibold">
                      {isItalian ? "Tariffa Festiva" : "Holiday Rate"}
                    </th>
                    <th className="border p-2 text-right text-sm font-semibold">
                      {isItalian ? "Tariffa KM" : "KM Rate"}
                    </th>
                    <th className="border p-2 text-right text-sm font-semibold">
                      {isItalian ? "Saldo Disponibile" : "Available Balance"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {budgetConfigs.map((config) => (
                    <tr key={config.id} className="hover:bg-gray-50">
                      <td className="border p-2 text-sm font-medium">{config.budgetCode}</td>
                      <td className="border p-2 text-sm">{config.budgetName}</td>
                      <td className="border p-2 text-right text-sm">€{parseFloat(config.weekdayRate).toFixed(2)}</td>
                      <td className="border p-2 text-right text-sm">€{parseFloat(config.holidayRate).toFixed(2)}</td>
                      <td className="border p-2 text-right text-sm">
                        €{parseFloat(config.kilometerRate).toFixed(2)}
                        {config.canFundMileage && (
                          <span className="ml-1 text-green-600" title={isItalian ? "Può finanziare KM" : "Can fund mileage"}>
                            ✓
                          </span>
                        )}
                      </td>
                      <td className="border p-2 text-right text-sm font-semibold">
                        €{parseFloat(config.availableBalance).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 text-sm text-gray-600">
                <span className="text-green-600">✓</span> = {isItalian ? "Budget può finanziare chilometri" : "Budget can fund kilometers"}
              </div>
            </div>
          )}

          {/* Activity Period */}
          {selectedClientId && (
            <div className="mt-4 p-3 border-2 border-yellow-400 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <Calendar className="h-5 w-5" />
                <span className="font-semibold">
                  {isItalian ? "FESTIVITÀ NEL PERIODO:" : "HOLIDAYS IN PERIOD:"}
                </span>
                <span className="text-sm">
                  {isItalian ? "Ven 15/08/2025 - Ferragosto" : "Fri 15/08/2025 - Ferragosto"}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Section */}
      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {isItalian ? "Configurazione Assistenza" : "Care Configuration"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Budget Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              📋 {isItalian ? "Selezione Budget" : "Budget Selection"}
            </h3>
            {!selectedClientId ? (
              <div className="text-center py-8 text-gray-500">
                {isItalian ? "Seleziona un assistito per vedere i budget disponibili" : "Select a client to see available budgets"}
              </div>
            ) : budgetTypes.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-600 mb-4">
                  {isItalian 
                    ? "Nessun budget configurato per questo assistito. È necessario inizializzare i budget." 
                    : "No budgets configured for this client. You need to initialize the budgets."}
                </p>
                <Button
                  onClick={() => initializeBudgetsMutation.mutate(selectedClientId)}
                  disabled={initializeBudgetsMutation.isPending}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                >
                  {initializeBudgetsMutation.isPending 
                    ? (isItalian ? "Inizializzazione..." : "Initializing...") 
                    : (isItalian ? "Inizializza Budget" : "Initialize Budgets")}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {budgetTypes.map((budget) => (
                <div
                  key={budget.code}
                  className={cn(
                    "p-3 rounded-lg border-2 cursor-pointer transition-all",
                    budget.selected 
                      ? "border-cyan-500 bg-cyan-50" 
                      : "border-gray-300 bg-gray-50"
                  )}
                  onClick={() => handleBudgetToggle(budget.code)}
                >
                  <div className="flex items-center justify-between">
                    <Checkbox 
                      checked={budget.selected}
                      className="mr-2"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{budget.code}</div>
                      <div className="text-sm text-gray-600">€{budget.amount.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>

          {/* Direct Care Planning */}
          <div className="mt-8">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-4 rounded-t-lg">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                🏥 {isItalian ? "ASSISTENZA DIRETTA (KM)" : "DIRECT CARE (KM)"}
              </h3>
            </div>
            <div className="border-2 border-cyan-500 rounded-b-lg p-4">
              <div className="grid grid-cols-4 gap-4 text-center mb-4">
                <div className="font-semibold">{isItalian ? "Giorni Assistenza" : "Care Days"}</div>
                <div className="font-semibold">{isItalian ? "Ore Totali Pianificate" : "Total Planned Hours"}</div>
                <div className="font-semibold">{isItalian ? "Chilometri Totali" : "Total Kilometers"}</div>
                <div></div>
              </div>

              {/* Weekly Schedule Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {Object.entries({
                  lun: isItalian ? "Lun" : "Mon",
                  mar: isItalian ? "Mar" : "Tue",
                  mer: isItalian ? "Mer" : "Wed",
                  gio: isItalian ? "Gio" : "Thu",
                  ven: isItalian ? "Ven" : "Fri",
                  sab: isItalian ? "Sab" : "Sat",
                  dom: isItalian ? "Dom" : "Sun"
                }).map(([key, label]) => (
                  <div key={key} className="text-center">
                    <div className="font-semibold mb-2">{label}</div>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-gray-500">ORE</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={weeklySchedule[key].ore}
                          onChange={(e) => handleScheduleChange(key, 'ore', e.target.value)}
                          className="text-center"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">KM</Label>
                        <Input
                          type="number"
                          min="0"
                          value={weeklySchedule[key].km}
                          onChange={(e) => handleScheduleChange(key, 'km', e.target.value)}
                          className="text-center"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Summary */}
              <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                <Button 
                  variant="default" 
                  className="bg-cyan-500 hover:bg-cyan-600"
                >
                  {isItalian ? "Tutti" : "All"}
                </Button>
                <Button 
                  variant="outline"
                  className="border-gray-300"
                >
                  {isItalian ? "Solo Feriali" : "Weekdays Only"}
                </Button>
                <Button 
                  variant="outline"
                  className="bg-yellow-100 text-yellow-800 border-yellow-400"
                >
                  {isItalian ? "Azzera" : "Clear"}
                </Button>
                <div></div>
              </div>

              <div className="grid grid-cols-4 gap-4 mt-4 text-center font-semibold">
                <div>
                  <div className="text-sm text-gray-500">{isItalian ? "Ore Feriali" : "Weekday Hours"}</div>
                  <div className="text-lg">{totals.weeklyHours.toFixed(1)}h</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">{isItalian ? "Ore Festive" : "Holiday Hours"}</div>
                  <div className="text-lg">0.0h</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">{isItalian ? "Costo Stimato" : "Estimated Cost"}</div>
                  <div className="text-lg">€ {totals.estimatedCost.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">{isItalian ? "Residuo" : "Remaining"}</div>
                  <div className={cn(
                    "text-lg font-bold",
                    totals.remainingBudget >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    € {totals.remainingBudget.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Report Section */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              📊 {isItalian ? "Report Pianificazione Budget" : "Budget Planning Report"}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Budget</th>
                    <th className="border p-2 text-center">{isItalian ? "Importo" : "Amount"} €</th>
                    <th className="border p-2 text-center">{isItalian ? "Ore Feriali" : "Weekday Hours"}</th>
                    <th className="border p-2 text-center">{isItalian ? "Ore Festive" : "Holiday Hours"}</th>
                    <th className="border p-2 text-center">{isItalian ? "Chilometri" : "Kilometers"}</th>
                    <th className="border p-2 text-center">{isItalian ? "Costo Stimato" : "Est. Cost"}</th>
                    <th className="border p-2 text-center">{isItalian ? "Residuo" : "Remaining"}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-2">
                      {isItalian ? "ASSISTENZA DIRETTA (KM)" : "DIRECT CARE (KM)"}
                      <div className="text-xs text-gray-500">
                        (0.0h × €22.00) + (0.0h × €24.00) + (0km × €0.40) = €0.00
                      </div>
                    </td>
                    <td className="border p-2 text-center">€ 1500.00</td>
                    <td className="border p-2 text-center">0.0h</td>
                    <td className="border p-2 text-center">0.0h</td>
                    <td className="border p-2 text-center">0 km</td>
                    <td className="border p-2 text-center">€ 0.00</td>
                    <td className="border p-2 text-center text-green-600">€ 1500.00</td>
                  </tr>
                  <tr className="bg-gray-100 font-bold">
                    <td className="border p-2">{isItalian ? "TOTALI" : "TOTAL"}</td>
                    <td className="border p-2 text-center">€ 1500.00</td>
                    <td className="border p-2 text-center">0.0h</td>
                    <td className="border p-2 text-center">0.0h</td>
                    <td className="border p-2 text-center">0 km</td>
                    <td className="border p-2 text-center">€ 0.00</td>
                    <td className="border p-2 text-center text-green-600">€ 1500.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-6">
            <Button variant="outline" onClick={() => {
              setSelectedClientId("");
              setStartDate(new Date().toISOString().split('T')[0]);
              setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
            }}>
              <X className="h-4 w-4 mr-2" />
              {isItalian ? "Annulla" : "Cancel"}
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleSavePlan}
              disabled={createPlanMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {createPlanMutation.isPending 
                ? (isItalian ? "Salvataggio..." : "Saving...") 
                : (isItalian ? "Salva Pianificazione" : "Save Planning")
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}