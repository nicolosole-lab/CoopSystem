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
  DollarSign,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimeLog {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  hours: string;
  totalCost: string;
  serviceType?: string;
  notes?: string;
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
  
  // Fetch available budget types for clients without allocations
  const { data: budgetTypes } = useQuery({
    queryKey: ["/api/budget-types"],
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
  const uniqueServiceGroups = new Map<string, number>();
  budgetData?.forEach((budget) => {
    const key = `${budget.clientId}-${budget.serviceType}`;
    if (!uniqueServiceGroups.has(key)) {
      uniqueServiceGroups.set(key, budget.totalCost);
    }
  });
  const actualTotalCompensation = Array.from(
    uniqueServiceGroups.values(),
  ).reduce((sum, cost) => sum + cost, 0);

  // Calculate totals
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
      toast({
        title: "Success",
        description: "Compensation approved and allocated to budgets",
      });
      setLocation("/compensations");
      
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
      // Small delay to ensure toast is shown
      setTimeout(() => {
        setLocation("/compensations");
      }, 500);
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
          <ScrollArea className="h-[500px]">
            {budgetData && budgetData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Service Cost</TableHead>
                    <TableHead>Budget Type</TableHead>
                    <TableHead>Remaining Cost</TableHead>
                    <TableHead>Status</TableHead>
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

                        return (
                          <TableRow key={idx}>
                            <TableCell>
                              <Link href={`/clients/${serviceGroup.clientId}`}>
                                <div className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">
                                  {serviceGroup.clientName}
                                </div>
                              </Link>
                              <div className="text-sm text-muted-foreground">
                                ID: {serviceGroup.clientId.slice(0, 8)}...
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="font-medium">
                                  {serviceGroup.serviceType}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {serviceGroup.totalHours.toFixed(2)}h
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                €{serviceGroup.totalCost.toFixed(2)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {serviceGroup.budgets[0]?.noBudget || availableBudgets.length === 0 ? (
                                // For clients without budget allocations show ASSISTENZA_DIRETTA
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300">
                                    ASSISTENZA_DIRETTA
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    Direct Assistance
                                  </span>
                                </div>
                              ) : (
                                // For clients with available budget allocations
                                <Select
                                  value={selectedBudget?.allocationId || undefined}
                                  onValueChange={(value) => {
                                    // Clear any previous selection for this service
                                    const newAllocations = new Map(
                                      selectedAllocations,
                                    );
                                    serviceGroup.budgets.forEach((b) => {
                                      if (b.allocationId) {
                                        newAllocations.delete(b.allocationId);
                                      }
                                    });

                                    if (value && value !== "none") {
                                      const budget = serviceGroup.budgets.find(
                                        (b) => b.allocationId === value,
                                      );
                                      if (budget) {
                                        newAllocations.set(budget.allocationId, {
                                          clientBudgetAllocationId:
                                            budget.allocationId,
                                          clientId: budget.clientId,
                                          budgetTypeId: budget.budgetTypeId,
                                          timeLogIds: budget.timeLogs.map(
                                            (log) => log.id,
                                          ),
                                          allocatedAmount: serviceGroup.totalCost,
                                          allocatedHours: serviceGroup.totalHours,
                                          notes: `Compensation for ${serviceGroup.serviceType}`,
                                        });
                                      }
                                    }
                                    setSelectedAllocations(newAllocations);
                                  }}
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Select budget" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {serviceGroup.budgets
                                      .filter((b) => b.available > 0)
                                      .map((budget) => (
                                        <SelectItem
                                          key={budget.allocationId}
                                          value={budget.allocationId}
                                        >
                                          <div className="flex justify-between items-center w-full">
                                            <span>{budget.budgetTypeName}</span>
                                            <span className="text-sm text-muted-foreground ml-2">
                                              €{budget.total.toFixed(2)}
                                            </span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                            <TableCell>
                              {selectedBudget ? (
                                <div className="text-sm font-medium text-green-600">
                                  €0.00
                                </div>
                              ) : (
                                <div className="text-sm font-medium text-orange-600">
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
          </ScrollArea>
        </CardContent>
      </Card>

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
                  <DollarSign className="mr-2 h-4 w-4" />
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
    </div>
  );
}
