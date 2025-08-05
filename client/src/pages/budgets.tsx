import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Calculator, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  Calendar,
  DollarSign,
  Edit,
  Trash2,
  PieChart,
  BarChart3
} from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type BudgetCategory = {
  id: string;
  name: string;
  description: string;
  isMandatory: boolean;
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
  categoryId: string;
  allocatedAmount: string;
  usedAmount: string;
  month: number;
  year: number;
};

type BudgetExpense = {
  id: string;
  clientId: string;
  categoryId: string;
  allocationId: string | null;
  amount: string;
  description: string;
  expenseDate: string;
  timeLogId: string | null;
};

type BudgetAnalysis = {
  categories: Array<{
    category: BudgetCategory;
    allocated: number;
    spent: number;
    remaining: number;
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
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showAllocationDialog, setShowAllocationDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<ClientBudgetAllocation | null>(null);
  const [editingExpense, setEditingExpense] = useState<BudgetExpense | null>(null);
  const [expenseCategoryId, setExpenseCategoryId] = useState<string>("");

  // Fetch clients
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  // Fetch budget categories
  const { data: categories = [] } = useQuery<BudgetCategory[]>({
    queryKey: ['/api/budget-categories'],
  });

  // Fetch budget allocations for selected client and month/year
  const { data: allocations = [], isLoading: allocationsLoading } = useQuery<ClientBudgetAllocation[]>({
    queryKey: ['/api/clients', selectedClient, 'budget-allocations', { month: selectedMonth, year: selectedYear }],
    enabled: !!selectedClient,
    queryFn: async () => {
      const res = await fetch(`/api/clients/${selectedClient}/budget-allocations?month=${selectedMonth}&year=${selectedYear}`);
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error('Failed to fetch allocations');
      }
      return res.json();
    }
  });

  // Fetch budget analysis for selected client and month/year
  const { data: analysis } = useQuery<BudgetAnalysis>({
    queryKey: ['/api/clients', selectedClient, 'budget-analysis', { month: selectedMonth, year: selectedYear }],
    enabled: !!selectedClient,
    queryFn: async () => {
      const res = await fetch(`/api/clients/${selectedClient}/budget-analysis?month=${selectedMonth}&year=${selectedYear}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch analysis');
      }
      return res.json();
    }
  });

  // Fetch budget expenses for selected client and month/year
  const { data: expenses = [] } = useQuery<BudgetExpense[]>({
    queryKey: ['/api/budget-expenses', { clientId: selectedClient, month: selectedMonth, year: selectedYear }],
    enabled: !!selectedClient,
    queryFn: () => 
      fetch(`/api/budget-expenses?clientId=${selectedClient}&month=${selectedMonth}&year=${selectedYear}`)
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
      setExpenseCategoryId("");
      toast({ title: t('budgets.budgetExpenseCreated') });
    },
    onError: () => {
      toast({ title: "Failed to create budget expense", variant: "destructive" });
    }
  });

  // Auto-select first client if available
  useEffect(() => {
    if (clients.length > 0 && !selectedClient) {
      setSelectedClient(clients[0].id);
    }
  }, [clients, selectedClient]);

  const handleCreateAllocation = (formData: FormData) => {
    if (!selectedClient) {
      toast({ 
        title: "Please select a client first", 
        description: "You need to select a client before creating budget allocations.",
        variant: "destructive" 
      });
      return;
    }

    const categoryId = formData.get('categoryId') as string;
    const allocatedAmount = formData.get('allocatedAmount') as string;

    if (editingAllocation) {
      updateAllocationMutation.mutate({
        id: editingAllocation.id,
        data: { categoryId, allocatedAmount, month: selectedMonth, year: selectedYear }
      });
    } else {
      createAllocationMutation.mutate({
        categoryId,
        allocatedAmount,
        month: selectedMonth,
        year: selectedYear
      });
    }
  };

  const handleCreateExpense = (formData: FormData) => {
    const amount = formData.get('amount') as string;
    const description = formData.get('description') as string;
    const expenseDate = formData.get('expenseDate') as string;
    
    if (!expenseCategoryId) {
      toast({ 
        title: "Please select a category", 
        variant: "destructive" 
      });
      return;
    }
    
    // Find matching allocation
    const allocation = allocations.find(a => a.categoryId === expenseCategoryId);

    createExpenseMutation.mutate({
      clientId: selectedClient,
      categoryId: expenseCategoryId,
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
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger data-testid="select-client">
              <SelectValue placeholder={t('budgets.chooseClient')} />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.firstName} {client.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="month-select">{t('budgets.month')}</Label>
          <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
            <SelectTrigger data-testid="select-month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {format(new Date(2024, i, 1), 'MMMM')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="year-select">{t('budgets.year')}</Label>
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger data-testid="select-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2023, 2024, 2025, 2026].map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                    <Label htmlFor="categoryId">{t('budgets.category')}</Label>
                    <Select name="categoryId" defaultValue={editingAllocation?.categoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('budgets.selectCategory')} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
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

      {selectedClient && (
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
                        ${analysis.totalAllocated.toFixed(2)}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Total Spent</p>
                      <p className="text-2xl font-bold text-slate-900">
                        ${analysis.totalSpent.toFixed(2)}
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
                        ${analysis.totalRemaining.toFixed(2)}
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
                  <span>Budget Categories</span>
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
                            <Label htmlFor="categoryId">{t('budgets.category')}</Label>
                            <Select 
                              value={expenseCategoryId} 
                              onValueChange={setExpenseCategoryId}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('budgets.selectCategory')} />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((category) => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="amount">Amount ($)</Label>
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
                  {analysis?.categories.map((item) => (
                    <div key={item.category.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{item.category.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-slate-600">
                            ${item.spent.toFixed(2)} / ${item.allocated.toFixed(2)}
                          </span>
                          {item.percentage > 90 && (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </div>
                      <Progress 
                        value={Math.min(item.percentage, 100)} 
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>{item.percentage.toFixed(1)}% used</span>
                        <span>${item.remaining.toFixed(2)} remaining</span>
                      </div>
                    </div>
                  ))}
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
                    const category = categories.find(c => c.id === expense.categoryId);
                    return (
                      <div key={expense.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{expense.description}</p>
                          <p className="text-xs text-slate-600">{category?.name}</p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(expense.expenseDate), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${parseFloat(expense.amount).toFixed(2)}</p>
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
