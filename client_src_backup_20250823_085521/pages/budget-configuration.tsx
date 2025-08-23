import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Settings, Euro, Calendar, MapPin, AlertCircle, Check, X, Edit2, Save, Plus } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

interface BudgetType {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  canFundMileage: boolean;
  defaultWeekdayRate: string;
  defaultHolidayRate: string;
  defaultKilometerRate: string;
  isActive: boolean;
}

interface ClientBudgetAllocation {
  id: string;
  clientId: string;
  clientName: string;
  budgetTypeId: string;
  budgetTypeName: string;
  allocatedAmount: string;
  usedAmount: string;
  startDate: string;
  endDate: string;
  weekdayRate: string | null;
  holidayRate: string | null;
  kilometerRate: string | null;
  status: string;
}

const MANDATORY_BUDGET_CODES = [
  'HCPQ', 'HCPB', 'FP_QUALIFICATA', 'LEGGE162', 'RAC', 
  'DIRECT', 'FP_BASE', 'SADQ', 'SADB', 'AES'
];

const BUDGETS_WITH_MILEAGE = ['LEGGE162', 'RAC', 'DIRECT'];

export default function BudgetConfiguration() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedBudget, setSelectedBudget] = useState<BudgetType | null>(null);
  const [isEditingAllocation, setIsEditingAllocation] = useState<string | null>(null);
  const [editedRates, setEditedRates] = useState<{
    weekdayRate: string;
    holidayRate: string;
    kilometerRate: string;
  }>({ weekdayRate: "", holidayRate: "", kilometerRate: "" });

  // Fetch budget types
  const { data: budgetTypes = [], isLoading: loadingTypes } = useQuery<BudgetType[]>({
    queryKey: ["/api/budget-types"],
  });

  // Fetch all client budget allocations for admin view
  const { data: allocations = [], isLoading: loadingAllocations } = useQuery<ClientBudgetAllocation[]>({
    queryKey: ["/api/admin/budget-allocations"],
  });

  // Update budget type configuration
  const updateBudgetType = useMutation({
    mutationFn: async (data: { id: string; canFundMileage: boolean; isActive: boolean }) => {
      return apiRequest(`/api/budget-types/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Budget Type Updated",
        description: "Budget configuration has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/budget-types"] });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update client budget allocation rates
  const updateAllocationRates = useMutation({
    mutationFn: async (data: { 
      id: string; 
      weekdayRate: string | null;
      holidayRate: string | null;
      kilometerRate: string | null;
    }) => {
      return apiRequest(`/api/admin/budget-allocations/${data.id}/rates`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Rates Updated",
        description: "Budget allocation rates have been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/budget-allocations"] });
      setIsEditingAllocation(null);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveRates = (allocationId: string, budgetCode: string) => {
    const canHaveMileage = BUDGETS_WITH_MILEAGE.includes(budgetCode);
    
    updateAllocationRates.mutate({
      id: allocationId,
      weekdayRate: editedRates.weekdayRate || null,
      holidayRate: editedRates.holidayRate || null,
      kilometerRate: canHaveMileage ? (editedRates.kilometerRate || null) : null,
    });
  };

  const startEditingRates = (allocation: ClientBudgetAllocation) => {
    setIsEditingAllocation(allocation.id);
    setEditedRates({
      weekdayRate: allocation.weekdayRate || "",
      holidayRate: allocation.holidayRate || "",
      kilometerRate: allocation.kilometerRate || "",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Budget Configuration Center</h1>
          <p className="text-muted-foreground mt-2">
            Centralized management of budget types and client allocations
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Settings className="w-4 h-4 mr-2" />
          Admin Only
        </Badge>
      </div>

      <Tabs defaultValue="types" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="types">Budget Types Configuration</TabsTrigger>
          <TabsTrigger value="allocations">Client Allocations</TabsTrigger>
        </TabsList>

        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mandatory Budget Types</CardTitle>
              <CardDescription>
                Configure the 10 mandatory budget types. Only LEGGE162, RAC, and ASSISTENZA DIRETTA can have mileage rates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Mileage Enabled</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Default Rates (Reference Only)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetTypes
                    .filter(bt => MANDATORY_BUDGET_CODES.includes(bt.code))
                    .sort((a, b) => a.code.localeCompare(b.code))
                    .map((budgetType) => {
                      const shouldHaveMileage = BUDGETS_WITH_MILEAGE.includes(budgetType.code);
                      const mileageCorrect = budgetType.canFundMileage === shouldHaveMileage;
                      
                      return (
                        <TableRow key={budgetType.id}>
                          <TableCell className="font-medium">
                            {budgetType.code}
                          </TableCell>
                          <TableCell>{budgetType.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {budgetType.categoryId.replace('cat-', '').replace('-', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              {shouldHaveMileage ? (
                                <Badge variant={mileageCorrect ? "default" : "destructive"}>
                                  <MapPin className="w-3 h-3 mr-1" />
                                  Required
                                </Badge>
                              ) : (
                                <Badge variant={!budgetType.canFundMileage ? "secondary" : "destructive"}>
                                  Not Allowed
                                </Badge>
                              )}
                              {!mileageCorrect && (
                                <AlertCircle className="w-4 h-4 text-destructive" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={budgetType.isActive ? "default" : "secondary"}>
                              {budgetType.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs space-y-1">
                              <div>Weekday: €{budgetType.defaultWeekdayRate}/hr</div>
                              <div>Holiday: €{budgetType.defaultHolidayRate}/hr</div>
                              {budgetType.canFundMileage && (
                                <div>Mileage: €{budgetType.defaultKilometerRate}/km</div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Important Note</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-medium text-yellow-900">
                      Manual Rate Entry Required
                    </p>
                    <p className="text-sm text-yellow-800">
                      All rates must be manually entered for each client budget allocation. 
                      The default rates shown above are for reference only and will not be automatically applied.
                    </p>
                    <ul className="text-sm text-yellow-800 list-disc list-inside mt-2">
                      <li>Each allocation requires manual entry of weekday and holiday rates</li>
                      <li>LEGGE162, RAC, and ASSISTENZA DIRETTA also require kilometer rates</li>
                      <li>Rates are specific to each client and time period</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Budget Allocations</CardTitle>
              <CardDescription>
                Manage rates for all client budget allocations. All rates must be manually entered.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Budget Type</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Rates</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.map((allocation) => {
                      const budgetType = budgetTypes.find(bt => bt.id === allocation.budgetTypeId);
                      const canHaveMileage = budgetType && BUDGETS_WITH_MILEAGE.includes(budgetType.code);
                      const isEditing = isEditingAllocation === allocation.id;

                      return (
                        <TableRow key={allocation.id}>
                          <TableCell className="font-medium">
                            {allocation.clientName}
                          </TableCell>
                          <TableCell>
                            <Badge>{allocation.budgetTypeName}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(allocation.startDate), 'dd/MM/yyyy')} - 
                            {format(new Date(allocation.endDate), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>€{allocation.allocatedAmount}</div>
                              <div className="text-muted-foreground">
                                Used: €{allocation.usedAmount}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs w-20">Weekday:</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="€/hr"
                                    value={editedRates.weekdayRate}
                                    onChange={(e) => setEditedRates({
                                      ...editedRates,
                                      weekdayRate: e.target.value
                                    })}
                                    className="h-8 w-24"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs w-20">Holiday:</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="€/hr"
                                    value={editedRates.holidayRate}
                                    onChange={(e) => setEditedRates({
                                      ...editedRates,
                                      holidayRate: e.target.value
                                    })}
                                    className="h-8 w-24"
                                  />
                                </div>
                                {canHaveMileage && (
                                  <div className="flex items-center gap-2">
                                    <Label className="text-xs w-20">Mileage:</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="€/km"
                                      value={editedRates.kilometerRate}
                                      onChange={(e) => setEditedRates({
                                        ...editedRates,
                                        kilometerRate: e.target.value
                                      })}
                                      className="h-8 w-24"
                                    />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm space-y-1">
                                {allocation.weekdayRate ? (
                                  <>
                                    <div>Weekday: €{allocation.weekdayRate}/hr</div>
                                    <div>Holiday: €{allocation.holidayRate}/hr</div>
                                    {canHaveMileage && allocation.kilometerRate && (
                                      <div>Mileage: €{allocation.kilometerRate}/km</div>
                                    )}
                                  </>
                                ) : (
                                  <Badge variant="destructive" className="text-xs">
                                    Rates Not Set
                                  </Badge>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveRates(allocation.id, budgetType?.code || '')}
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setIsEditingAllocation(null)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditingRates(allocation)}
                              >
                                <Edit2 className="w-4 h-4 mr-1" />
                                Set Rates
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}