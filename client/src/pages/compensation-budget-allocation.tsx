import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Euro,
  CheckCircle,
  AlertCircle,
  User,
  Loader2,
  ChevronLeft,
  Info,
  AlertTriangle,
  Calendar,
  MapPin,
  Clock,
  Edit,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TimeLog {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  hours: string;
  totalCost: string;
  serviceType?: string;
  notes?: string;
  mileage?: string;
}

interface BudgetAvailability {
  clientId: string;
  clientName: string;
  serviceType: string;
  budgetTypeId: string;
  budgetTypeName: string;
  allocationId: string;
  available: number;
  total: number;
  used: number;
  percentage: number;
  timeLogs: TimeLog[];
  totalHours: number;
  totalCost: number;
  noBudget?: boolean;
}

interface Compensation {
  id: string;
  staffId: string;
  staffName?: string;
  periodStart: string;
  periodEnd: string;
  totalCompensation: string;
  status: string;
  existingAllocations?: Array<{
    id: string;
    compensationId: string;
    clientBudgetAllocationId: string;
    clientId: string;
    budgetTypeId: string;
    timeLogId?: string;
    allocatedAmount: string;
    allocatedHours: string;
    notes?: string;
  }>;
}

export default function CompensationBudgetAllocationPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { compensationId } = useParams();

  const [selectedAllocations, setSelectedAllocations] = useState<
    Map<
      string,
      {
        clientBudgetAllocationId: string;
        clientId: string;
        budgetTypeId: string;
        timeLogIds: string[];
        allocatedAmount: number;
        allocatedHours: number;
        notes?: string;
      }
    >
  >(new Map());
  const [isApproving, setIsApproving] = useState(false);
  const [warningAccepted, setWarningAccepted] = useState(false);
  const [allocationsLoaded, setAllocationsLoaded] = useState(false);
  const [autoAllocationApplied, setAutoAllocationApplied] = useState(false);
  const [selectedServiceGroup, setSelectedServiceGroup] = useState<any>(null);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);

  // Fetch compensation details
  const { data: compensation, isLoading: compensationLoading } =
    useQuery<Compensation>({
      queryKey: [`/api/compensations/${compensationId}`],
      enabled: !!compensationId,
    });

  // Fetch budget availability for this compensation period
  const { data: budgetData, isLoading: budgetLoading } = useQuery<
    BudgetAvailability[]
  >({
    queryKey: [`/api/compensations/${compensationId}/budget-availability`],
    enabled: !!compensationId,
  });
  
  // Fetch saved calculation details for approved compensations
  const { data: calculationDetails } = useQuery<any[]>({
    queryKey: [`/api/compensations/${compensationId}/calculation-details`],
    enabled: !!compensationId && compensation?.status === 'approved',
  });
  
  // Fetch available budget types for clients without allocations
  const { data: budgetTypes } = useQuery({
    queryKey: ["/api/budget-types"],
  });
  
  // Fetch all client budget allocations for getting start/end dates
  const { data: clientBudgetAllocations } = useQuery({
    queryKey: [`/api/admin/budget-allocations`],
    enabled: !!compensationId && !!budgetData,
    select: (data: any[]) => {
      // Create a map of allocation ID to allocation details
      const allocationsMap: Record<string, any> = {};
      if (data && Array.isArray(data)) {
        data.forEach(allocation => {
          allocationsMap[allocation.id] = allocation;
        });
      }
      return allocationsMap;
    }
  });

  // Auto-select budgets based on priority logic
  const autoSelectBudgets = () => {
    if (!budgetData) return;
    
    const newAllocations = new Map();
    
    // Group budgets by client and service type
    const serviceGroups = new Map<string, BudgetAvailability[]>();
    budgetData.forEach((budget) => {
      const key = `${budget.clientId}-${budget.serviceType}`;
      if (!serviceGroups.has(key)) {
        serviceGroups.set(key, []);
      }
      serviceGroups.get(key)?.push(budget);
    });
    
    // For each service group, apply priority logic
    serviceGroups.forEach((budgets, key) => {
      const [clientId, serviceType] = key.split('-');
      
      // Filter out budgets with no availability
      const availableBudgets = budgets.filter(b => b.available > 0 && !b.noBudget);
      
      if (availableBudgets.length === 0) return;
      
      // Priority 1: Service Type Matching
      // Map service types to budget categories
      const serviceTypeToBudgetMap: Record<string, string> = {
        'Assistenza alla persona feriale': 'SAI',
        'Assistenza alla persona festivo': 'SAI',
        'Home Care': 'SAD',
        'Assistenza Domiciliare': 'SAD',
        'Trasporto': 'TRASPORTO',
        'Educativa': 'EDUCATIVA',
        // Add more mappings as needed
      };
      
      const preferredBudgetCode = serviceTypeToBudgetMap[serviceType];
      let selectedBudget = availableBudgets.find(b => 
        b.budgetTypeName?.includes(preferredBudgetCode || '')
      );
      
      // Priority 2: Expiration Date (if no service type match)
      if (!selectedBudget) {
        // Sort by expiration date (assuming period_end field exists)
        const sortedByExpiration = [...availableBudgets].sort((a, b) => {
          // For now, we'll assume budgets don't have expiration dates
          // This can be enhanced when expiration dates are added to the schema
          return 0;
        });
        selectedBudget = sortedByExpiration[0];
      }
      
      // Priority 3: Available Balance (highest available)
      if (!selectedBudget) {
        const sortedByBalance = [...availableBudgets].sort((a, b) => 
          b.available - a.available
        );
        selectedBudget = sortedByBalance[0];
      }
      
      // Default to first available if no other criteria
      if (!selectedBudget) {
        selectedBudget = availableBudgets[0];
      }
      
      // Add the selected budget to allocations
      if (selectedBudget) {
        const serviceGroup = budgets[0]; // Use first budget for service info
        newAllocations.set(selectedBudget.allocationId, {
          clientBudgetAllocationId: selectedBudget.allocationId,
          clientId: selectedBudget.clientId,
          budgetTypeId: selectedBudget.budgetTypeId,
          timeLogIds: serviceGroup.timeLogs.map(log => log.id),
          allocatedAmount: serviceGroup.totalCost,
          allocatedHours: serviceGroup.totalHours,
          notes: `Auto-selected: ${serviceType}`
        });
      }
    });
    
    setSelectedAllocations(newAllocations);
    setAutoAllocationApplied(true);
    
    toast({
      title: "Budget Auto-Selection Applied",
      description: "Budgets have been automatically selected based on service type, expiration, and availability",
    });
  };

  // Load existing allocations when compensation data is fetched
  useEffect(() => {
    if (compensation?.existingAllocations && budgetData && !allocationsLoaded) {
      const newAllocations = new Map(selectedAllocations);
      
      // Group existing allocations by client and service to match the budget data structure
      compensation.existingAllocations.forEach((allocation) => {
        // Find matching budget data entry
        const matchingBudget = budgetData.find(
          b => b.clientId === allocation.clientId && 
          b.budgetTypeId === allocation.budgetTypeId
        );
        
        if (matchingBudget) {
          newAllocations.set(matchingBudget.allocationId, {
            clientBudgetAllocationId: allocation.clientBudgetAllocationId,
            clientId: allocation.clientId,
            budgetTypeId: allocation.budgetTypeId,
            timeLogIds: matchingBudget.timeLogs.map(log => log.id),
            allocatedAmount: parseFloat(allocation.allocatedAmount),
            allocatedHours: parseFloat(allocation.allocatedHours),
            notes: allocation.notes
          });
        }
      });
      
      setSelectedAllocations(newAllocations);
      setAllocationsLoaded(true);
    }
  }, [compensation, budgetData, allocationsLoaded]);
  
  // Auto-select budgets for new compensations
  useEffect(() => {
    if (budgetData && !allocationsLoaded && !autoAllocationApplied && compensation?.status === 'pending_approval') {
      autoSelectBudgets();
    }
  }, [budgetData, allocationsLoaded, autoAllocationApplied, compensation]);

  // Calculate actual total from time logs in budget data
  // Group by clientId and serviceType to avoid counting duplicates
  const uniqueServiceGroups = new Map<string, { originalCost: number, calculatedCost: number }>();
  budgetData?.forEach((budget) => {
    const key = `${budget.clientId}-${budget.serviceType}`;
    if (!uniqueServiceGroups.has(key)) {
      // Check if this service has a selected budget allocation
      const selectedBudget = selectedAllocations.get(budget.allocationId);
      let calculatedCost = budget.totalCost;
      
      if (selectedBudget) {
        // Use the allocated amount which was calculated based on budget type rates
        calculatedCost = selectedBudget.allocatedAmount;
      }
      
      uniqueServiceGroups.set(key, {
        originalCost: budget.totalCost,
        calculatedCost: calculatedCost
      });
    }
  });
  
  // Use the staff's actual compensation amount from the compensation record
  const actualTotalCompensation = parseFloat(compensation?.totalCompensation || '0');
  
  // Calculate totals using the calculated costs
  const totalAllocated = Array.from(selectedAllocations.values()).reduce(
    (sum, alloc) => sum + alloc.allocatedAmount,
    0,
  );
  const remainingToAllocate = actualTotalCompensation - totalAllocated;
  const hasOverBudget = budgetData?.some((budget) => {
    const allocation = selectedAllocations.get(budget.allocationId);
    return allocation && allocation.allocatedAmount > budget.available;
  });

  // Approve with budget allocation mutation
  const approveWithBudgetMutation = useMutation({
    mutationFn: async (
      allocations: Array<{
        clientBudgetAllocationId: string;
        clientId: string;
        budgetTypeId: string;
        timeLogId?: string;
        allocatedAmount: number;
        allocatedHours: number;
        notes?: string;
      }>,
    ) => {
      return apiRequest(
        "POST",
        `/api/compensations/${compensationId}/approve`,
        { budgetAllocations: allocations },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compensations"] });
      queryClient.invalidateQueries({ queryKey: [`/api/compensations/${compensationId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/compensations/all"] });
      toast({
        title: "Success",
        description: "Compensation approved and allocated to budgets",
      });
      // Stay on the same page after approval
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve compensation",
        variant: "destructive",
      });
    },
  });

  // Mark as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        "PATCH",
        `/api/compensations/${compensationId}/status`,
        { status: "paid" },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compensations"] });
      queryClient.invalidateQueries({ queryKey: [`/api/compensations/${compensationId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/compensations/all"] });
      toast({
        title: "Success",
        description: "Compensation marked as paid",
      });
      // Stay on the same page after marking as paid
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark as paid",
        variant: "destructive",
      });
    },
  });

  // Handle approval
  const handleApprove = async () => {
    if (!warningAccepted && hasOverBudget) {
      setWarningAccepted(true);
      return;
    }

    setIsApproving(true);
    try {
      const allocations = Array.from(selectedAllocations.values()).flatMap(
        (alloc) =>
          alloc.timeLogIds.map((timeLogId) => ({
            clientBudgetAllocationId: alloc.clientBudgetAllocationId,
            clientId: alloc.clientId,
            budgetTypeId: alloc.budgetTypeId,
            timeLogId,
            allocatedAmount: alloc.allocatedAmount / alloc.timeLogIds.length,
            allocatedHours: alloc.allocatedHours / alloc.timeLogIds.length,
            notes: alloc.notes,
          })),
      );
      await approveWithBudgetMutation.mutateAsync(allocations);
    } catch (error) {
      console.error("Approval failed:", error);
      setWarningAccepted(false);
    } finally {
      setIsApproving(false);
    }
  };

  if (compensationLoading || budgetLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!compensation || !budgetData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg text-muted-foreground">
          Compensation record not found
        </p>
        <Button
          variant="outline"
          onClick={() => setLocation("/compensation")}
          className="mt-4"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Allocate Compensation to Client Budgets
          </h1>
          <p className="text-muted-foreground mt-2">
            Review and allocate {compensation.staffName}'s compensation for{" "}
            {format(new Date(compensation.periodStart), "MMM d")} -{" "}
            {format(new Date(compensation.periodEnd), "MMM d, yyyy")}
          </p>
        </div>
        <Button variant="outline" onClick={() => window.history.back()}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <Separator />

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Compensation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{actualTotalCompensation.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              Allocated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              €{totalAllocated.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">
              Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                remainingToAllocate > 0 ? "text-yellow-600" : "text-gray-600",
              )}
            >
              €{remainingToAllocate.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clients Affected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {budgetData ? new Set(budgetData.map((b) => b.clientId)).size : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget allocations table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Budget Allocations</CardTitle>
            <div className="flex items-center gap-2">
              {autoAllocationApplied && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Auto-selected
                </Badge>
              )}
              {compensation.status === 'pending_approval' && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={autoSelectBudgets}
                  className="hover:bg-blue-50"
                >
                  Auto-select Budgets
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <div className="min-w-fit">
              {budgetData && budgetData.length > 0 ? (
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Client</TableHead>
                      <TableHead className="whitespace-nowrap">Service Type</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Hours</TableHead>

                      <TableHead className="whitespace-nowrap">Budget Type</TableHead>
                      <TableHead className="whitespace-nowrap">Period</TableHead>
                      <TableHead className="whitespace-nowrap">Rates (W/H/M)</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Calculated Cost</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {(() => {
                    // Group by client and service type to show unique services
                    const serviceGroups = new Map<
                      string,
                      {
                        clientId: string;
                        clientName: string;
                        serviceType: string;
                        totalCost: number;
                        totalHours: number;
                        timeLogs: TimeLog[];
                        budgets: BudgetAvailability[];
                      }
                    >();

                    budgetData.forEach((budget) => {
                      const key = `${budget.clientId}-${budget.serviceType}`;
                      if (!serviceGroups.has(key)) {
                        serviceGroups.set(key, {
                          clientId: budget.clientId,
                          clientName: budget.clientName,
                          serviceType: budget.serviceType,
                          totalCost: budget.totalCost,
                          totalHours: budget.totalHours,
                          timeLogs: budget.timeLogs,
                          budgets: [],
                        });
                      }
                      serviceGroups.get(key)!.budgets.push(budget);
                    });

                    return Array.from(serviceGroups.values()).map(
                      (serviceGroup, idx) => {
                        // Get available budgets for this service (budgets with available > 0)
                        const availableBudgets = serviceGroup.budgets.filter(
                          (b) => b.available > 0,
                        );

                        // Check if any budget is selected for this service
                        const selectedBudget = serviceGroup.budgets.find((b) =>
                          selectedAllocations.has(b.allocationId),
                        );

                        // Calculate remaining cost for this service
                        const allocatedAmount = selectedBudget
                          ? selectedAllocations.get(selectedBudget.allocationId)
                              ?.allocatedAmount || 0
                          : 0;
                        const remainingCost =
                          serviceGroup.totalCost - allocatedAmount;

                        // Calculate cost based on selected budget type rates
                        const selectedAllocation = selectedBudget?.allocationId ? clientBudgetAllocations?.[selectedBudget.allocationId] : undefined;
                        const selectedBudgetType = Array.isArray(budgetTypes) ? budgetTypes.find((bt: any) => 
                          bt.id === selectedBudget?.budgetTypeId
                        ) : undefined;
                        
                        // Check if Direct Assistance NO ALLOCATION is selected (special case)
                        const isDirectAssistanceNoAllocation = !selectedBudget || selectedBudget?.allocationId === 'ASSISTENZA_DIRETTA';
                        
                        // Calculate cost based on budget type rates and actual service dates
                        let calculatedCost = serviceGroup.totalCost;
                        let weekdayRate = 10.00;
                        let holidayRate = 30.00;
                        let mileageRate = 0.00;
                        
                        if (isDirectAssistanceNoAllocation) {
                          // Use default Direct Assistance rates for NO ALLOCATION case
                          weekdayRate = 10.00;
                          holidayRate = 30.00;
                          mileageRate = 0.00;
                          // Calculate based on staff compensation rate (proportional to hours)
                          calculatedCost = actualTotalCompensation * (serviceGroup.totalHours / (budgetData?.reduce((total, b) => total + b.totalHours, 0) || 1));
                        } else if (selectedBudget && selectedBudgetType) {
                          // Use the budget type's rates and recalculate based on actual dates
                          weekdayRate = parseFloat(selectedBudgetType.defaultWeekdayRate || '10.00');
                          holidayRate = parseFloat(selectedBudgetType.defaultHolidayRate || '30.00');
                          mileageRate = parseFloat(selectedBudgetType.defaultKilometerRate || '0.00');
                          
                          // Recalculate cost based on actual service dates and selected budget type rates
                          calculatedCost = 0;
                          serviceGroup.timeLogs.forEach((log) => {
                            const serviceDate = new Date(log.date);
                            const isHoliday = serviceDate.getDay() === 0; // Sunday
                            const hourlyRate = isHoliday ? holidayRate : weekdayRate;
                            calculatedCost += parseFloat(log.hours) * hourlyRate;
                          });
                        }

                        return (
                          <TableRow 
                            key={idx} 
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => {
                              setSelectedServiceGroup(serviceGroup);
                              setBudgetModalOpen(true);
                            }}
                            data-testid={`row-service-${serviceGroup.clientId}`}
                          >
                            <TableCell className="whitespace-nowrap">
                              <Link 
                                href={`/clients/${serviceGroup.clientId}`}
                                onClick={(e) => e.stopPropagation()} // Prevent row click when clicking client link
                              >
                                <div className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">
                                  {serviceGroup.clientName}
                                </div>
                              </Link>
                              <div className="text-sm text-muted-foreground">
                                ID: {serviceGroup.clientId.slice(0, 8)}...
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {serviceGroup.serviceType}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-medium">
                                {serviceGroup.totalHours.toFixed(2)}h
                              </div>
                            </TableCell>

                            <TableCell className="min-w-[200px]">
                              {/* Budget Type Display - Click anywhere to edit */}
                              <div className="flex items-center justify-between p-2 rounded border bg-background">
                                <div className="flex flex-col items-start">
                                  <span className="text-sm font-medium">
                                    {selectedBudget ? selectedBudget.budgetTypeName : 'Assistenza Diretta'}
                                  </span>
                                  {selectedBudget && (
                                    <span className="text-xs text-muted-foreground">
                                      Available: €{selectedBudget.available?.toFixed(2) || '0.00'}
                                    </span>
                                  )}
                                </div>
                                <Edit className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </TableCell>
                            <TableCell>
                              {/* Period Column */}
                              {selectedBudget && selectedAllocation ? (
                                <div className="text-xs">
                                  {format(new Date(selectedAllocation.startDate), 'dd/MM/yyyy')} -<br/>
                                  {format(new Date(selectedAllocation.endDate), 'dd/MM/yyyy')}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {/* Rates Column (W/H/M) */}
                              {isDirectAssistanceNoAllocation ? (
                                <div className="text-xs">
                                  €{weekdayRate.toFixed(2)}/
                                  €{holidayRate.toFixed(2)}/
                                  €{mileageRate.toFixed(2)}
                                </div>
                              ) : selectedBudgetType ? (
                                <div className="text-xs">
                                  €{selectedBudgetType.defaultWeekdayRate || '10.00'}/
                                  €{selectedBudgetType.defaultHolidayRate || '30.00'}/
                                  €{selectedBudgetType.defaultKilometerRate || '0.00'}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {/* Calculated Cost Column */}
                              {isDirectAssistanceNoAllocation || selectedBudget ? (
                                <div className={`font-medium ${calculatedCost !== serviceGroup.totalCost ? 'text-blue-600' : ''}`}>
                                  €{calculatedCost.toFixed(2)}
                                  {calculatedCost !== serviceGroup.totalCost && (
                                    <div className="text-xs text-muted-foreground">
                                      (was €{serviceGroup.totalCost.toFixed(2)})
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="font-medium">
                                  €{serviceGroup.totalCost.toFixed(2)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {serviceGroup.budgets[0]?.noBudget || availableBudgets.length === 0 ? (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                  No Budget
                                </Badge>
                              ) : selectedBudget ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
                                  Available
                                </Badge>
                              ) : (
                                <Badge variant="outline">Available</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      },
                    );
                  })()}
                </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                  <Info className="h-12 w-12 mb-2" />
                  <p>No time logs found for this compensation period</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saved Calculation Details for Approved Compensations */}
      {compensation?.status === 'approved' && calculationDetails && calculationDetails.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Approved Payment Details</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              These are the final payment amounts that were calculated and saved when this compensation was approved.
            </p>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Budget Type</TableHead>
                    <TableHead className="text-right">Regular Hours</TableHead>
                    <TableHead className="text-right">Holiday Hours</TableHead>
                    <TableHead className="text-right">Mileage (km)</TableHead>
                    <TableHead className="text-right">Payment Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculationDetails.map((detail: any) => (
                    <TableRow key={detail.id}>
                      <TableCell className="font-medium">{detail.clientName}</TableCell>
                      <TableCell>{detail.budgetTypeName}</TableCell>
                      <TableCell className="text-right">{detail.regularHours || '0.00'}</TableCell>
                      <TableCell className="text-right">{detail.holidayHours || '0.00'}</TableCell>
                      <TableCell className="text-right">{detail.totalMileage || '0.00'}</TableCell>
                      <TableCell className="text-right font-semibold">
                        €{parseFloat(detail.paymentAmount).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={5} className="font-semibold">Total</TableCell>
                    <TableCell className="text-right font-semibold">
                      €{calculationDetails.reduce((sum: number, d: any) => 
                        sum + parseFloat(d.paymentAmount), 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings and Actions */}
      <div className="space-y-4">
        {hasOverBudget && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Budget Exceeded Warning</AlertTitle>
            <AlertDescription>
              Some allocations exceed the available budget. This will create a
              negative balance.
              {warningAccepted
                ? " Click Approve again to confirm."
                : " Are you sure you want to continue?"}
            </AlertDescription>
          </Alert>
        )}

        {remainingToAllocate > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Unallocated Amount</AlertTitle>
            <AlertDescription>
              €{remainingToAllocate.toFixed(2)} of the compensation has not been
              allocated to any budget. This amount will need to be handled
              separately.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation("/compensations")}
            disabled={isApproving}
          >
            Cancel
          </Button>
          {compensation.status === 'approved' ? (
            <Button
              onClick={() => markAsPaidMutation.mutate()}
              disabled={markAsPaidMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {markAsPaidMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Euro className="mr-2 h-4 w-4" />
                  Mark as Paid
                </>
              )}
            </Button>
          ) : compensation.status === 'paid' ? (
            <Button
              disabled
              className="bg-gray-600"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Already Paid
            </Button>
          ) : (
            <Button
              onClick={handleApprove}
              disabled={isApproving}
              variant={
                hasOverBudget && !warningAccepted ? "destructive" : "default"
              }
            >
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : hasOverBudget && !warningAccepted ? (
                "Acknowledge Warning"
              ) : (
                `Approve & Allocate (€${totalAllocated.toFixed(2)})`
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Service Details & Budget Selection Modal */}
      <Dialog open={budgetModalOpen} onOpenChange={setBudgetModalOpen}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Service Details & Budget Selection</DialogTitle>
            <DialogDescription>
              View detailed information and manage budget allocation for {selectedServiceGroup?.clientName}'s services
            </DialogDescription>
          </DialogHeader>

          {selectedServiceGroup && (
            <div className="space-y-6">
              {/* Service Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Service Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Client</Label>
                      <p className="font-medium">{selectedServiceGroup.clientName}</p>
                      <p className="text-xs text-muted-foreground">ID: {selectedServiceGroup.clientId.slice(0, 8)}...</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Service Type</Label>
                      <p className="font-medium">{selectedServiceGroup.serviceType}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Total Hours</Label>
                      <p className="font-medium">{selectedServiceGroup.totalHours.toFixed(2)}h</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Current Cost</Label>
                      <p className="font-medium">€{selectedServiceGroup.totalCost.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Service Analytics Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Service Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    let weekdayHours = 0;
                    let holidayHours = 0;
                    let totalMileage = 0;

                    selectedServiceGroup.timeLogs.forEach((log: any) => {
                      const serviceDate = new Date(log.date);
                      const isHoliday = serviceDate.getDay() === 0; // Sunday
                      const hours = parseFloat(log.hours);
                      const mileage = parseFloat(log.mileage || '0');

                      if (isHoliday) {
                        holidayHours += hours;
                      } else {
                        weekdayHours += hours;
                      }
                      totalMileage += mileage;
                    });

                    // Get the selected budget type for mileage rate
                    const selectedBudget = selectedServiceGroup.budgets.find((b: any) => 
                      selectedAllocations.has(b.allocationId)
                    );
                    const selectedBudgetType = Array.isArray(budgetTypes) ? budgetTypes.find((bt: any) => 
                      bt.id === selectedBudget?.budgetTypeId
                    ) : undefined;
                    
                    const mileageRate = selectedBudgetType ? 
                      parseFloat(selectedBudgetType.defaultKilometerRate || '0.00') : 0.00;
                    const totalMileageCost = totalMileage * mileageRate;

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg border">
                          <div className="text-2xl font-bold text-blue-600">{weekdayHours.toFixed(1)}h</div>
                          <div className="text-sm text-blue-600 font-medium">Weekday Hours</div>
                          <div className="text-xs text-muted-foreground">Monday - Saturday</div>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg border">
                          <div className="text-2xl font-bold text-orange-600">{holidayHours.toFixed(1)}h</div>
                          <div className="text-sm text-orange-600 font-medium">Holiday Hours</div>
                          <div className="text-xs text-muted-foreground">Sundays & Holidays</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg border">
                          <div className="text-2xl font-bold text-green-600">{totalMileage.toFixed(1)}km</div>
                          <div className="text-sm text-green-600 font-medium">Total Mileage</div>
                          <div className="text-xs text-muted-foreground">
                            Cost: €{totalMileageCost.toFixed(2)} (@€{mileageRate.toFixed(2)}/km)
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Time Logs Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Service Sessions ({selectedServiceGroup.timeLogs.length} entries)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedServiceGroup.timeLogs.map((log: any, idx: number) => {
                      const serviceDate = new Date(log.date);
                      const isHoliday = serviceDate.getDay() === 0; // Sunday
                      const mileage = parseFloat(log.mileage || '0');
                      return (
                        <div key={idx} className="flex justify-between items-center p-2 border rounded">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="font-medium">{format(serviceDate, 'dd/MM/yyyy')}</p>
                              <p className="text-xs text-muted-foreground">
                                {isHoliday ? '🌅 Sunday (Holiday)' : '📅 Weekday'}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium">{parseFloat(log.hours).toFixed(2)}h</p>
                              <p className="text-xs text-muted-foreground">€{parseFloat(log.totalCost).toFixed(2)}</p>
                            </div>
                            {mileage > 0 && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">{mileage.toFixed(1)}km</span>
                              </div>
                            )}
                          </div>
                          {log.notes && (
                            <div className="text-sm text-muted-foreground max-w-xs truncate">
                              {log.notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Current Budget Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Euro className="h-5 w-5" />
                    Current Budget Allocation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const currentSelection = selectedAllocations.get(
                      selectedServiceGroup.budgets.find((b: any) => selectedAllocations.has(b.allocationId))?.allocationId || ''
                    );
                    const selectedBudget = selectedServiceGroup.budgets.find((b: any) => 
                      selectedAllocations.has(b.allocationId)
                    );

                    if (currentSelection && selectedBudget) {
                      return (
                        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                          <div>
                            <p className="font-medium text-green-800">{selectedBudget.budgetTypeName}</p>
                            <p className="text-sm text-green-600">
                              Allocated: €{currentSelection.allocatedAmount.toFixed(2)} for {currentSelection.allocatedHours.toFixed(2)}h
                            </p>
                          </div>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        </div>
                      );
                    } else {
                      return (
                        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded">
                          <div>
                            <p className="font-medium text-blue-800">Assistenza Diretta</p>
                            <p className="text-sm text-blue-600">
                              No budget allocation - Using default rates
                            </p>
                          </div>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            Default
                          </Badge>
                        </div>
                      );
                    }
                  })()}
                </CardContent>
              </Card>

              {/* Budget Options */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Change Budget Allocation</h3>
                
                {/* Direct Assistance - No Allocation (Always Available) */}
                <Card 
                  className="cursor-pointer border-2 hover:border-blue-300 transition-colors"
                  onClick={() => {
                    // Handle Direct Assistance selection (no allocation)
                    const newAllocations = new Map(selectedAllocations);
                    selectedServiceGroup.budgets.forEach((b: any) => {
                      if (b.allocationId) {
                        newAllocations.delete(b.allocationId);
                      }
                    });
                    setSelectedAllocations(newAllocations);
                    setBudgetModalOpen(false);
                  }}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full border-2 border-blue-500 bg-blue-50"></div>
                          <div>
                            <h4 className="font-semibold">Assistenza Diretta</h4>
                            <p className="text-sm text-muted-foreground">No budget allocation - Use default rates</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Rates (W/H/M)</div>
                        <div className="font-medium">€10.00/€30.00/€0.00</div>
                        <div className="text-sm font-medium text-green-600">
                          Cost: €{(actualTotalCompensation * (selectedServiceGroup.totalHours / (budgetData?.reduce((total, b) => total + b.totalHours, 0) || 1))).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Budget Allocations */}
                {selectedServiceGroup.budgets.filter((b: any) => !b.noBudget).map((budget: any) => {
                  const budgetType = Array.isArray(budgetTypes) ? budgetTypes.find((bt: any) => 
                    bt.id === budget.budgetTypeId
                  ) : undefined;
                  
                  const isAvailable = budget.available > 0;
                  
                  // Calculate cost with this budget type
                  let calculatedCost = 0;
                  if (budgetType) {
                    const weekdayRate = parseFloat(budgetType.defaultWeekdayRate || '10.00');
                    const holidayRate = parseFloat(budgetType.defaultHolidayRate || '30.00');
                    
                    selectedServiceGroup.timeLogs.forEach((log: any) => {
                      const serviceDate = new Date(log.date);
                      const isHoliday = serviceDate.getDay() === 0; // Sunday
                      const hourlyRate = isHoliday ? holidayRate : weekdayRate;
                      calculatedCost += parseFloat(log.hours) * hourlyRate;
                    });
                  }

                  // Get budget allocation dates
                  const allocation = clientBudgetAllocations?.[budget.allocationId];
                  const budgetStartDate = allocation?.startDate;
                  const budgetEndDate = allocation?.endDate;

                  return (
                    <Card 
                      key={budget.allocationId}
                      className={cn(
                        "cursor-pointer border-2 transition-colors",
                        isAvailable 
                          ? "hover:border-green-300 border-green-200" 
                          : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                      )}
                      onClick={() => {
                        if (!isAvailable) return;
                        
                        // Handle budget allocation selection
                        const newAllocations = new Map(selectedAllocations);
                        selectedServiceGroup.budgets.forEach((b: any) => {
                          if (b.allocationId) {
                            newAllocations.delete(b.allocationId);
                          }
                        });

                        newAllocations.set(budget.allocationId, {
                          clientBudgetAllocationId: budget.allocationId,
                          clientId: budget.clientId,
                          budgetTypeId: budget.budgetTypeId,
                          timeLogIds: budget.timeLogs.map((log: any) => log.id),
                          allocatedAmount: calculatedCost,
                          allocatedHours: selectedServiceGroup.totalHours,
                          notes: `Compensation for ${selectedServiceGroup.serviceType}`,
                        });
                        
                        setSelectedAllocations(newAllocations);
                        setBudgetModalOpen(false);
                      }}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-4 h-4 rounded-full border-2",
                                isAvailable 
                                  ? "border-green-500 bg-green-50" 
                                  : "border-gray-300 bg-gray-100"
                              )}></div>
                              <div>
                                <h4 className="font-semibold">{budget.budgetTypeName}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Available: €{budget.available.toFixed(2)} of €{budget.total.toFixed(2)}
                                </p>
                                {budgetStartDate && budgetEndDate && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(budgetStartDate), 'dd/MM/yyyy')} - {format(new Date(budgetEndDate), 'dd/MM/yyyy')}
                                  </p>
                                )}
                                {budget.available < calculatedCost && (
                                  <p className="text-sm text-red-600">
                                    ⚠️ Insufficient funds (need €{calculatedCost.toFixed(2)})
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Rates (W/H/M)</div>
                            <div className="font-medium">
                              €{budgetType?.defaultWeekdayRate || '10.00'}/
                              €{budgetType?.defaultHolidayRate || '30.00'}/
                              €{budgetType?.defaultKilometerRate || '0.00'}
                            </div>
                            <div className="text-sm font-medium text-green-600">
                              Cost: €{calculatedCost.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setBudgetModalOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
