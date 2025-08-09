import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Calculator, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  Calendar,
  Euro,
  Edit,
  Trash2,
  PieChart,
  BarChart3,
  Check,
  ChevronsUpDown,
  ChevronDown,
  Search,
  ExternalLink,
  CalendarIcon
} from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

type BudgetCategory = {
  id: string;
  name: string;
  description: string;
  isMandatory: boolean;
};

type BudgetType = {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  defaultWeekdayRate: string | null;
  defaultHolidayRate: string | null;
  defaultKilometerRate: string | null;
  displayOrder: number;
};

type Client = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
};

type ClientBudgetAllocation = {
  id: string;  
  clientId: string;
  budgetTypeId: string;
  allocatedAmount: string;
  usedAmount: string;
  startDate: string;
  endDate: string;
  status: string;
};

type BudgetExpense = {
  id: string;
  clientId: string;
  budgetTypeId: string;
  allocationId: string | null;
  amount: string;
  description: string;
  expenseDate: string;
  timeLogId: string | null;
};

type BudgetAnalysis = {
  budgetTypes: Array<{
    budgetType: BudgetType;
    allocations: Array<{
      id: string;
      allocated: number;
      spent: number;
      remaining: number;
      percentage: number;
    }>;
    totalAllocated: number;
    totalSpent: number;
    totalRemaining: number;
    percentage: number;
  }>;
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
};

export default function Budgets() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState<string>("");
  // Default to current month period
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [showAllocationDialog, setShowAllocationDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<ClientBudgetAllocation | null>(null);
  const [editingExpense, setEditingExpense] = useState<BudgetExpense | null>(null);
  const [expenseBudgetTypeId, setExpenseBudgetTypeId] = useState<string>("");
  const [openClientSearch, setOpenClientSearch] = useState(false);
  const [clientSearchValue, setClientSearchValue] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});

  // Fetch clients
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  // Fetch budget categories
  const { data: categories = [] } = useQuery<BudgetCategory[]>({
    queryKey: ['/api/budget-categories'],
  });

  // Fetch budget types
  const { data: budgetTypes = [] } = useQuery<BudgetType[]>({
    queryKey: ['/api/budget-types'],
  });

  // Fetch budget allocations for selected client and date range
  const { data: allocations = [], isLoading: allocationsLoading } = useQuery<ClientBudgetAllocation[]>({
    queryKey: ['/api/clients', selectedClient, 'budget-allocations', { startDate: startDate?.toISOString(), endDate: endDate?.toISOString() }],
    enabled: !!selectedClient && !!startDate && !!endDate,
    queryFn: async () => {
      const res = await fetch(`/api/clients/${selectedClient}/budget-allocations?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error('Failed to fetch allocations');
      }
      return res.json();
    }
  });

  // Fetch budget analysis for selected client and date range
  const { data: analysis } = useQuery<BudgetAnalysis>({
    queryKey: ['/api/clients', selectedClient, 'budget-analysis', { startDate: startDate?.toISOString(), endDate: endDate?.toISOString() }],
    enabled: !!selectedClient && !!startDate && !!endDate,
    queryFn: async () => {
      const res = await fetch(`/api/clients/${selectedClient}/budget-analysis?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch analysis');
      }
      const data = await res.json();
      // Debug logging to verify data
      if (data && data.budgetTypes) {
        const hcpq = data.budgetTypes.find((bt: any) => bt.budgetType?.name === 'Qualified HCP');
        if (hcpq) {
          console.log('HCPQ Data from API:', {
            totalAllocated: hcpq.totalAllocated,
            allocations: hcpq.allocations?.map((a: any) => ({
              id: a.id,
              allocated: a.allocated,
              spent: a.spent
            }))
          });
        }
        console.log('Total Allocated (all types):', data.totalAllocated);
      }
      return data;
    }
  });

  // Fetch budget expenses for selected client and date range
  const { data: expenses = [] } = useQuery<BudgetExpense[]>({
    queryKey: ['/api/budget-expenses', { clientId: selectedClient, startDate: startDate?.toISOString(), endDate: endDate?.toISOString() }],
    enabled: !!selectedClient && !!startDate && !!endDate,
    queryFn: () => 
      fetch(`/api/budget-expenses?clientId=${selectedClient}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
        .then(res => res.json())
  });

  // Mutations
  const createAllocationMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/clients/${selectedClient}/budget-allocations`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', selectedClient, 'budget-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', selectedClient, 'budget-analysis'] });
      setShowAllocationDialog(false);
      setEditingAllocation(null);
      toast({ title: "Budget allocation created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create budget allocation", variant: "destructive" });
    }
  });

  const updateAllocationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/budget-allocations/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', selectedClient, 'budget-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', selectedClient, 'budget-analysis'] });
      setShowAllocationDialog(false);
      setEditingAllocation(null);
      toast({ title: "Budget allocation updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update budget allocation", variant: "destructive" });
    }
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/budget-expenses", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budget-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', selectedClient, 'budget-analysis'] });
      setShowExpenseDialog(false);
      setEditingExpense(null);
      setExpenseBudgetTypeId("");
      toast({ title: t('budgets.budgetExpenseCreated') });
    },
    onError: () => {
      toast({ title: "Failed to create budget expense", variant: "destructive" });
    }
  });

  // Remove auto-selection - let user explicitly choose a client

  const handleCreateAllocation = (formData: FormData) => {
    if (!selectedClient) {
      toast({ 
        title: "Please select a client first", 
        description: "You need to select a client before creating budget allocations.",
        variant: "destructive" 
      });
      return;
    }

    const budgetTypeId = formData.get('budgetTypeId') as string;
    const allocatedAmount = formData.get('allocatedAmount') as string;
    const allocStartDate = formData.get('startDate') as string;
    const allocEndDate = formData.get('endDate') as string;

    if (editingAllocation) {
      // Convert date strings to ISO datetime format
      const startDateISO = allocStartDate 
        ? new Date(allocStartDate + 'T00:00:00').toISOString()
        : editingAllocation.startDate;
      const endDateISO = allocEndDate 
        ? new Date(allocEndDate + 'T00:00:00').toISOString()
        : editingAllocation.endDate;
        
      updateAllocationMutation.mutate({
        id: editingAllocation.id,
        data: { 
          budgetTypeId, 
          allocatedAmount, 
          startDate: startDateISO,
          endDate: endDateISO
        }
      });
    } else {
      // Convert date strings to ISO datetime format
      const startDateISO = allocStartDate 
        ? new Date(allocStartDate + 'T00:00:00').toISOString()
        : startDate.toISOString();
      const endDateISO = allocEndDate 
        ? new Date(allocEndDate + 'T00:00:00').toISOString()
        : endDate.toISOString();
        
      createAllocationMutation.mutate({
        budgetTypeId,
        allocatedAmount,
        startDate: startDateISO,
        endDate: endDateISO
      });
    }
  };

  const handleCreateExpense = (formData: FormData) => {
    const amount = formData.get('amount') as string;
    const description = formData.get('description') as string;
    const expenseDate = formData.get('expenseDate') as string;
    
    if (!expenseBudgetTypeId) {
      toast({ 
        title: "Please select a budget type", 
        variant: "destructive" 
      });
      return;
    }
    
    // Find matching allocation
    const allocation = allocations.find(a => a.budgetTypeId === expenseBudgetTypeId);

    createExpenseMutation.mutate({
      clientId: selectedClient,
      budgetTypeId: expenseBudgetTypeId,
      allocationId: allocation?.id || null,
      amount,
      description,
      expenseDate: new Date(expenseDate).toISOString()
    });
  };

  const selectedClientData = clients.find(c => c.id === selectedClient);

  return (
    <div className="p-4 sm:p-6 lg:p-8" data-testid="page-budgets">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2" data-testid="text-budgets-title">
          {t('budgets.title')}
        </h2>
        <p className="text-slate-600">
          {t('budgets.description')}
        </p>
      </div>

      {/* Client and Period Selection */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div>
          <Label htmlFor="client-select">{t('budgets.selectClient')}</Label>
          <div className="flex items-center gap-2">
            {selectedClient && (
              <Link href={`/clients/${selectedClient}`}>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-9 w-9"
                  title="View Client Details"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Popover open={openClientSearch} onOpenChange={setOpenClientSearch}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openClientSearch}
                  className="w-full justify-between font-normal"
                  data-testid="select-client"
                >
                  {selectedClient
                    ? clients.find(client => client.id === selectedClient)?.firstName + " " + clients.find(client => client.id === selectedClient)?.lastName
                    : t('budgets.chooseClient')}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command shouldFilter={false}>
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <CommandInput 
                    placeholder={t('common.search') + " by name, email..."} 
                    value={clientSearchValue}
                    onValueChange={setClientSearchValue}
                    className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <CommandList className="max-h-[300px] overflow-y-auto">
                  <CommandEmpty className="py-6 text-center text-sm">
                    {t('clients.noClientsFound')}
                  </CommandEmpty>
                  <CommandGroup heading={clientSearchValue ? `Found ${clients.filter(client => {
                    if (!clientSearchValue) return true;
                    const searchTerm = clientSearchValue.toLowerCase().trim();
                    const searchTerms = searchTerm.split(' ').filter(term => term.length > 0);
                    const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
                    const email = client.email?.toLowerCase() || '';
                    return searchTerms.every(term => 
                      fullName.includes(term) || email.includes(term)
                    );
                  }).length} client(s)` : `All Clients (${clients.length})`}>
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
                        
                        // Active clients first, then alphabetical
                        if (a.status === 'active' && b.status !== 'active') return -1;
                        if (a.status !== 'active' && b.status === 'active') return 1;
                        
                        return aFullName.localeCompare(bFullName);
                      })
                      .map((client) => (
                        <CommandItem
                          key={client.id}
                          value={client.id}
                          onSelect={(currentValue) => {
                            setSelectedClient(currentValue === selectedClient ? "" : currentValue);
                            setOpenClientSearch(false);
                            setClientSearchValue("");
                          }}
                          className="flex items-center justify-between py-2 px-2 cursor-pointer hover:bg-accent"
                        >
                          <div className="flex items-center">
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedClient === client.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {client.firstName} {client.lastName}
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
        </div>
        
        <div>
          <Label htmlFor="start-date">Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
                data-testid="select-start-date"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={startDate}
                onSelect={(date) => date && setStartDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label htmlFor="end-date">End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
                data-testid="select-end-date"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={endDate}
                onSelect={(date) => date && setEndDate(date)}
                disabled={(date) => startDate ? date < startDate : false}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-end gap-2">
          <Dialog open={showAllocationDialog} onOpenChange={setShowAllocationDialog}>
            <DialogTrigger asChild>
              <Button className="w-full" data-testid="button-add-allocation">
                <Plus className="w-4 h-4 mr-2" />
                {t('budgets.addBudget')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingAllocation ? t('budgets.editBudgetAllocation') : t('budgets.createBudgetAllocation')}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateAllocation(formData);
              }}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="budgetTypeId">{t('budgets.budgetType')}</Label>
                    <Select name="budgetTypeId" defaultValue={editingAllocation?.budgetTypeId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('budgets.selectBudgetType')} />
                      </SelectTrigger>
                      <SelectContent>
                        {budgetTypes.map((budgetType) => (
                          <SelectItem key={budgetType.id} value={budgetType.id}>
                            {budgetType.code} - {budgetType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="allocatedAmount">{t('budgets.allocatedAmount')}</Label>
                    <Input
                      name="allocatedAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      defaultValue={editingAllocation?.allocatedAmount}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="startDate">Budget Period Start Date</Label>
                    <Input
                      name="startDate"
                      type="date"
                      defaultValue={editingAllocation?.startDate ? format(new Date(editingAllocation.startDate), 'yyyy-MM-dd') : format(startDate, 'yyyy-MM-dd')}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">Budget Period End Date</Label>
                    <Input
                      name="endDate"
                      type="date"
                      defaultValue={editingAllocation?.endDate ? format(new Date(editingAllocation.endDate), 'yyyy-MM-dd') : format(endDate, 'yyyy-MM-dd')}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAllocationDialog(false);
                      setEditingAllocation(null);
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" data-testid="button-save-allocation">
                    {editingAllocation ? t('common.edit') : t('common.add')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!selectedClient ? (
        <Card className="p-8">
          <CardContent className="text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Calculator className="w-12 h-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">Select a Client to Get Started</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Choose a client from the dropdown above to view and manage their budget allocations
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Budget Overview */}
          {analysis && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Total Allocated</p>
                      <p className="text-2xl font-bold text-slate-900">
                        €{analysis.totalAllocated.toFixed(2)}
                      </p>
                    </div>
                    <Euro className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Total Spent</p>
                      <p className="text-2xl font-bold text-slate-900">
                        €{analysis.totalSpent.toFixed(2)}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Remaining</p>
                      <p className="text-2xl font-bold text-slate-900">
                        €{analysis.totalRemaining.toFixed(2)}
                      </p>
                    </div>
                    <Calculator className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Budget Usage</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {analysis.totalAllocated > 0 ? ((analysis.totalSpent / analysis.totalAllocated) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                    <PieChart className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Budget Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Budget Types</span>
                  <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-expense">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Expense
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Budget Expense</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        handleCreateExpense(formData);
                      }}>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="budgetTypeId">Budget Type</Label>
                            <Select 
                              value={expenseBudgetTypeId} 
                              onValueChange={setExpenseBudgetTypeId}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a budget type" />
                              </SelectTrigger>
                              <SelectContent>
                                {budgetTypes.map((budgetType) => (
                                  <SelectItem key={budgetType.id} value={budgetType.id}>
                                    {budgetType.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="amount">Amount (€)</Label>
                            <Input
                              name="amount"
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              name="description"
                              placeholder="Expense description"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="expenseDate">Expense Date</Label>
                            <Input
                              name="expenseDate"
                              type="date"
                              defaultValue={format(new Date(), 'yyyy-MM-dd')}
                              required
                            />
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-6">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowExpenseDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" data-testid="button-save-expense">
                            Add Expense
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis?.budgetTypes?.map((item) => {
                    const hasMultiple = item.allocations?.length > 1;
                    // Always expand multiple allocations for transparency
                    const isExpanded = hasMultiple ? true : false;
                    const categoryColor = item.budgetType.categoryId === 'cat-home' 
                      ? 'bg-blue-500' 
                      : 'bg-green-500';
                    
                    return (
                      <div key={item.budgetType.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${categoryColor}`} />
                            <span className="font-medium text-sm">
                              {item.budgetType.code} - {item.budgetType.name}
                            </span>
                            {hasMultiple && (
                              <Badge variant="secondary" className="text-xs">
                                {item.allocations.length} allocations
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-slate-600">
                              €{item.totalSpent?.toFixed(2) || '0.00'} / €{item.totalAllocated?.toFixed(2) || '0.00'}
                            </span>
                            {item.percentage > 90 && (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </div>
                        
                        {!hasMultiple ? (
                          <>
                            <Progress 
                              value={Math.min(item.percentage || 0, 100)} 
                              className="h-2"
                            />
                            <div className="flex justify-between text-xs text-slate-500">
                              <span>{(item.percentage || 0).toFixed(1)}% used</span>
                              <span>€{(item.totalRemaining || 0).toFixed(2)} remaining</span>
                            </div>
                          </>
                        ) : (
                          <div className="ml-4 space-y-3 border-l-2 border-slate-200 pl-4">
                            {item.allocations?.map((allocation, index) => (
                              <div key={allocation.id} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-slate-600">
                                    Allocation {index + 1}
                                  </span>
                                  <span className="text-xs text-slate-600">
                                    €{allocation.spent?.toFixed(2) || '0.00'} / €{allocation.allocated?.toFixed(2) || '0.00'}
                                  </span>
                                </div>
                                <Progress 
                                  value={Math.min(allocation.percentage || 0, 100)} 
                                  className="h-1.5"
                                />
                                <div className="flex justify-between text-xs text-slate-500">
                                  <span>{(allocation.percentage || 0).toFixed(1)}% used</span>
                                  <span className={allocation.remaining < 0 ? "text-red-500 font-medium" : ""}>
                                    €{(allocation.remaining || 0).toFixed(2)} {allocation.remaining < 0 ? 'over budget' : 'remaining'}
                                  </span>
                                </div>
                              </div>
                            ))}
                            <div className="pt-2 mt-2 border-t border-slate-200">
                              <div className="flex justify-between text-xs font-medium text-slate-700">
                                <span>Total {item.budgetType.name}</span>
                                <span>
                                  €{item.totalAllocated?.toFixed(2) || '0.00'} allocated
                                </span>
                              </div>
                              <div className="flex justify-between text-xs text-slate-500 mt-1">
                                <span>Total Remaining</span>
                                <span className={item.totalRemaining < 0 ? "text-red-500 font-medium" : "text-green-600"}>
                                  €{item.totalRemaining?.toFixed(2) || '0.00'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recent Expenses */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {expenses.slice(0, 10).map((expense) => {
                    const budgetType = budgetTypes.find(bt => bt.id === expense.budgetTypeId);
                    return (
                      <div key={expense.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{expense.description}</p>
                          <p className="text-xs text-slate-600">{budgetType ? `${budgetType.code} - ${budgetType.name}` : 'Unknown'}</p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(expense.expenseDate), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">€{parseFloat(expense.amount).toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })}
                  {expenses.length === 0 && (
                    <p className="text-center text-slate-500 py-8">
                      No expenses recorded for this period
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {!selectedClient && clients.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-xl mx-auto mb-6 flex items-center justify-center">
              <Calculator className="text-primary text-2xl" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-4">
              No Clients Available
            </h3>
            <p className="text-slate-600 max-w-md mx-auto mb-6">
              You need to add clients before you can manage their budgets.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
