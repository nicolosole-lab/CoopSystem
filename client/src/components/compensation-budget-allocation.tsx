import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Info,
  User,
  Calendar,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

interface CompensationBudgetAllocationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compensationId: string;
  staffId: string;
  staffName: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  onApprove: (allocations: Array<{
    clientBudgetAllocationId: string;
    clientId: string;
    budgetTypeId: string;
    timeLogId?: string;
    allocatedAmount: number;
    allocatedHours: number;
    notes?: string;
  }>) => Promise<void>;
}

export function CompensationBudgetAllocation({
  open,
  onOpenChange,
  compensationId,
  staffId,
  staffName,
  periodStart,
  periodEnd,
  totalAmount,
  onApprove
}: CompensationBudgetAllocationProps) {
  const [selectedAllocations, setSelectedAllocations] = useState<Map<string, {
    clientBudgetAllocationId: string;
    clientId: string;
    budgetTypeId: string;
    timeLogIds: string[];
    allocatedAmount: number;
    allocatedHours: number;
    notes?: string;
  }>>(new Map());
  const [isApproving, setIsApproving] = useState(false);
  const [warningAccepted, setWarningAccepted] = useState(false);

  // Fetch budget availability for this compensation period
  const { data: budgetData, isLoading } = useQuery<BudgetAvailability[]>({
    queryKey: [`/api/compensations/${compensationId}/budget-availability`],
    enabled: open && !!compensationId,
  });

  // Calculate totals
  const totalAllocated = Array.from(selectedAllocations.values()).reduce(
    (sum, alloc) => sum + alloc.allocatedAmount, 0
  );
  const remainingToAllocate = totalAmount - totalAllocated;
  const hasOverBudget = budgetData?.some(budget => {
    const allocation = selectedAllocations.get(budget.allocationId);
    return allocation && allocation.allocatedAmount > budget.available;
  });





  // Handle approval
  const handleApprove = async () => {
    if (!warningAccepted && hasOverBudget) {
      setWarningAccepted(true);
      return;
    }

    setIsApproving(true);
    try {
      const allocations = Array.from(selectedAllocations.values()).flatMap(alloc =>
        alloc.timeLogIds.map(timeLogId => ({
          clientBudgetAllocationId: alloc.clientBudgetAllocationId,
          clientId: alloc.clientId,
          budgetTypeId: alloc.budgetTypeId,
          timeLogId,
          allocatedAmount: alloc.allocatedAmount / alloc.timeLogIds.length,
          allocatedHours: alloc.allocatedHours / alloc.timeLogIds.length,
          notes: alloc.notes
        }))
      );
      
      await onApprove(allocations);
      onOpenChange(false);
      setSelectedAllocations(new Map());
      setWarningAccepted(false);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Allocate Compensation to Client Budgets</DialogTitle>
          <DialogDescription>
            Review and allocate {staffName}'s compensation for {format(new Date(periodStart), 'MMM d')} - {format(new Date(periodEnd), 'MMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Total Compensation</Label>
              </div>
              <div className="text-2xl font-bold">€{totalAmount.toFixed(2)}</div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <Label className="text-sm">Allocated</Label>
              </div>
              <div className="text-2xl font-bold text-green-600">€{totalAllocated.toFixed(2)}</div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <Label className="text-sm">Remaining</Label>
              </div>
              <div className={cn("text-2xl font-bold", remainingToAllocate > 0 ? "text-yellow-600" : "text-gray-600")}>
                €{remainingToAllocate.toFixed(2)}
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Clients Affected</Label>
              </div>
              <div className="text-2xl font-bold">
                {budgetData ? new Set(budgetData.map(b => b.clientId)).size : 0}
              </div>
            </Card>
          </div>



          {/* Budget allocations table */}
          <ScrollArea className="h-[400px] border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : budgetData && budgetData.length > 0 ? (
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
                    // Group budgets by client first
                    const groupedByClient = budgetData.reduce((acc, budget) => {
                      if (!acc[budget.clientId]) {
                        acc[budget.clientId] = {
                          clientName: budget.clientName,
                          clientId: budget.clientId,
                          entries: []
                        };
                      }
                      acc[budget.clientId].entries.push(budget);
                      return acc;
                    }, {} as Record<string, { clientName: string; clientId: string; entries: typeof budgetData }>);

                    // Sort clients and render
                    return Object.values(groupedByClient)
                      .sort((a, b) => a.clientName.localeCompare(b.clientName))
                      .map((clientGroup) => {
                        // Group by service type to merge rows
                        const serviceTypeGroups = clientGroup.entries.reduce((acc, entry) => {
                          if (!acc[entry.serviceType]) {
                            acc[entry.serviceType] = {
                              serviceType: entry.serviceType,
                              totalHours: entry.totalHours,
                              totalCost: entry.totalCost,
                              timeLogs: entry.timeLogs,
                              budgetOptions: []
                            };
                          }
                          acc[entry.serviceType].budgetOptions.push(entry);
                          return acc;
                        }, {} as Record<string, any>);

                        let rowIndex = 0;
                        const totalRows = Object.values(serviceTypeGroups).length; // One row per service type now

                        return Object.values(serviceTypeGroups).map((serviceGroup: any) => {
                          const isFirstRow = rowIndex === 0;
                          rowIndex++;
                          
                          // Filter out budgets with no available funds
                          const availableBudgets = serviceGroup.budgetOptions.filter((b: any) => b.available > 0);
                          
                          // Find selected allocation for this service
                          const selectedBudgetKey = Array.from(selectedAllocations.keys()).find(key => 
                            key.startsWith(`${serviceGroup.serviceType}-`)
                          );
                          const selectedBudget = selectedBudgetKey ? 
                            serviceGroup.budgetOptions.find((b: any) => 
                              selectedBudgetKey === `${serviceGroup.serviceType}-${b.allocationId}`
                            ) : null;

                          return (
                            <TableRow key={`${serviceGroup.serviceType}-${clientGroup.clientId}`}>
                              {isFirstRow && (
                                <TableCell rowSpan={totalRows} className="align-top border-r">
                                  <div className="space-y-1">
                                    <div className="font-medium">{clientGroup.clientName}</div>
                                    <div className="text-sm text-muted-foreground">
                                      ID: {clientGroup.clientId.slice(0, 8)}
                                    </div>
                                  </div>
                                </TableCell>
                              )}
                              <TableCell>
                                <div className="text-sm">{serviceGroup.serviceType}</div>
                                <div className="text-xs text-muted-foreground">{serviceGroup.totalHours.toFixed(1)}h</div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">€{serviceGroup.totalCost.toFixed(2)}</div>
                              </TableCell>
                              <TableCell>
                                {availableBudgets.length > 0 ? (
                                  <Select
                                    value={selectedBudgetKey || ""}
                                    onValueChange={(value) => {
                                      const newAllocations = new Map(selectedAllocations);
                                      
                                      // Clear any previous allocation for this service type
                                      Array.from(newAllocations.keys()).forEach(key => {
                                        if (key.startsWith(`${serviceGroup.serviceType}-`)) {
                                          newAllocations.delete(key);
                                        }
                                      });
                                      
                                      if (value && value !== "none") {
                                        const budget = serviceGroup.budgetOptions.find((b: any) => 
                                          `${serviceGroup.serviceType}-${b.allocationId}` === value
                                        );
                                        if (budget) {
                                          const allocAmount = Math.min(serviceGroup.totalCost, budget.available);
                                          newAllocations.set(value, {
                                            clientBudgetAllocationId: budget.allocationId,
                                            clientId: budget.clientId,
                                            budgetTypeId: budget.budgetTypeId,
                                            timeLogIds: serviceGroup.timeLogs.map((log: any) => log.id),
                                            allocatedAmount: allocAmount,
                                            allocatedHours: serviceGroup.totalHours,
                                          });
                                        }
                                      }
                                      setSelectedAllocations(newAllocations);
                                    }}
                                  >
                                    <SelectTrigger className="w-[220px]">
                                      <SelectValue placeholder="Select budget" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">
                                        <div className="flex items-center gap-2">
                                          <span>None</span>
                                        </div>
                                      </SelectItem>
                                      {availableBudgets.map((budget: any) => {
                                        const isSelected = selectedBudgetKey === `${serviceGroup.serviceType}-${budget.allocationId}`;
                                        
                                        return (
                                          <SelectItem 
                                            key={budget.allocationId} 
                                            value={`${serviceGroup.serviceType}-${budget.allocationId}`}
                                          >
                                            <div className="flex items-center justify-between w-full gap-4">
                                              <div className="flex items-center gap-2">
                                                {isSelected && <CheckCircle className="w-4 h-4 text-green-600" />}
                                                <span>{budget.budgetTypeName}</span>
                                              </div>
                                              <span className="text-sm font-medium text-green-600">
                                                €{budget.available.toFixed(2)}
                                              </span>
                                            </div>
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge variant="secondary">No Budget Available</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {selectedBudget ? (
                                  <div className="text-sm">
                                    {(() => {
                                      const allocatedAmount = Math.min(serviceGroup.totalCost, selectedBudget.available);
                                      const remainingCost = serviceGroup.totalCost - allocatedAmount;
                                      return (
                                        <>
                                          <div className={cn(
                                            "font-medium",
                                            remainingCost === 0 ? "text-green-600" : "text-orange-600"
                                          )}>
                                            €{remainingCost.toFixed(2)}
                                          </div>
                                          {remainingCost > 0 && (
                                            <div className="text-xs text-muted-foreground">
                                              Budget covers €{allocatedAmount.toFixed(2)}
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                ) : (
                                  <div className="text-sm font-medium text-orange-600">
                                    €{serviceGroup.totalCost.toFixed(2)}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {selectedBudget ? (
                                  <Badge variant="success">Allocated</Badge>
                                ) : availableBudgets.length === 0 ? (
                                  <Badge variant="secondary">No Budget</Badge>
                                ) : (
                                  <Badge variant="outline">Available</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })
                      .flat();
                  })()}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Info className="h-12 w-12 mb-2" />
                <p>No time logs found for this compensation period</p>
              </div>
            )}
          </ScrollArea>

          {/* Warnings */}
          {hasOverBudget && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Budget Exceeded Warning</AlertTitle>
              <AlertDescription>
                Some allocations exceed the available budget. This will create a negative balance.
                {warningAccepted ? " Click Approve again to confirm." : " Are you sure you want to continue?"}
              </AlertDescription>
            </Alert>
          )}

          {remainingToAllocate > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Unallocated Amount</AlertTitle>
              <AlertDescription>
                €{remainingToAllocate.toFixed(2)} of the compensation has not been allocated to any budget.
                This amount will need to be handled separately.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isApproving}>
            Cancel
          </Button>
          <Button 
            onClick={handleApprove}
            disabled={isApproving || selectedAllocations.size === 0}
            variant={hasOverBudget && !warningAccepted ? "destructive" : "default"}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add missing Card component if not imported
const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}>
    {children}
  </div>
);