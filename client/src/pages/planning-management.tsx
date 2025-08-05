import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Euro, Users, FileText, Edit, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface HomeCareplan {
  id: string;
  clientId: string;
  clientName: string;
  planName: string;
  validFrom: string;
  validTo: string;
  totalBudget: string;
  status: 'active' | 'draft' | 'expired';
  createdAt: string;
  budgetConfigs: Array<{
    budgetCode: string;
    budgetName: string;
    availableBalance: string;
    weekdayRate: string;
    holidayRate: string;
  }>;
}

export default function PlanningManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<HomeCareplan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const [viewPlan, setViewPlan] = useState<HomeCareplan | null>(null);

  // Fetch home care plans
  const { data: plans = [], isLoading } = useQuery<HomeCareplan[]>({
    queryKey: ['/api/home-care-plans'],
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (planId: string) => {
      await apiRequest('DELETE', `/api/home-care-plans/${planId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/home-care-plans'] });
      toast({
        title: t('planningManagement.deleteSuccess'),
        description: t('planningManagement.deleteSuccessDescription'),
      });
      setPlanToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: t('planningManagement.deleteError'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      draft: "secondary",
      expired: "destructive"
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {t(`planningManagement.status.${status}`)}
      </Badge>
    );
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(parseFloat(amount));
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gradient">
            {t('planningManagement.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('planningManagement.description')}
          </p>
        </div>
        <Button
          onClick={() => window.location.href = '/home-care-planning'}
          className="bg-gradient-to-r from-primary to-primary-light hover:opacity-90"
        >
          <FileText className="mr-2 h-4 w-4" />
          {t('planningManagement.createNew')}
        </Button>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">{t('planningManagement.tabs.active')}</TabsTrigger>
          <TabsTrigger value="draft">{t('planningManagement.tabs.draft')}</TabsTrigger>
          <TabsTrigger value="expired">{t('planningManagement.tabs.expired')}</TabsTrigger>
        </TabsList>

        {['active', 'draft', 'expired'].map(status => (
          <TabsContent key={status} value={status} className="mt-6">
            <Card className="care-card">
              <CardHeader>
                <CardTitle>{t(`planningManagement.tabs.${status}`)}</CardTitle>
                <CardDescription>
                  {t(`planningManagement.tabDescriptions.${status}`)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {plans.filter(plan => plan.status === status).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('planningManagement.noPlans')}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('planningManagement.table.client')}</TableHead>
                        <TableHead>{t('planningManagement.table.planName')}</TableHead>
                        <TableHead>{t('planningManagement.table.period')}</TableHead>
                        <TableHead>{t('planningManagement.table.totalBudget')}</TableHead>
                        <TableHead>{t('planningManagement.table.status')}</TableHead>
                        <TableHead>{t('planningManagement.table.createdAt')}</TableHead>
                        <TableHead className="text-right">{t('planningManagement.table.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans
                        .filter(plan => plan.status === status)
                        .map(plan => (
                          <TableRow key={plan.id}>
                            <TableCell className="font-medium">{plan.clientName}</TableCell>
                            <TableCell>{plan.planName}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(plan.validFrom), 'dd/MM/yyyy')} - 
                                {format(new Date(plan.validTo), 'dd/MM/yyyy')}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">{formatCurrency(plan.totalBudget)}</TableCell>
                            <TableCell>{getStatusBadge(plan.status)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(plan.createdAt), 'dd/MM/yyyy')}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setViewPlan(plan)}
                                  title={t('planningManagement.actions.view')}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => window.location.href = `/home-care-planning?editPlan=${plan.id}`}
                                  title={t('planningManagement.actions.edit')}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setPlanToDelete(plan.id)}
                                  title={t('planningManagement.actions.delete')}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* View Plan Dialog */}
      <Dialog open={!!viewPlan} onOpenChange={() => setViewPlan(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('planningManagement.viewPlan.title')}</DialogTitle>
          </DialogHeader>
          {viewPlan && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('planningManagement.viewPlan.client')}</Label>
                  <p className="font-medium">{viewPlan.clientName}</p>
                </div>
                <div>
                  <Label>{t('planningManagement.viewPlan.planName')}</Label>
                  <p className="font-medium">{viewPlan.planName}</p>
                </div>
                <div>
                  <Label>{t('planningManagement.viewPlan.period')}</Label>
                  <p className="font-medium">
                    {format(new Date(viewPlan.validFrom), 'dd/MM/yyyy')} - 
                    {format(new Date(viewPlan.validTo), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div>
                  <Label>{t('planningManagement.viewPlan.totalBudget')}</Label>
                  <p className="font-medium text-primary">{formatCurrency(viewPlan.totalBudget)}</p>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">{t('planningManagement.viewPlan.budgetDetails')}</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('planningManagement.viewPlan.budgetCategory')}</TableHead>
                      <TableHead>{t('planningManagement.viewPlan.availableBalance')}</TableHead>
                      <TableHead>{t('planningManagement.viewPlan.weekdayRate')}</TableHead>
                      <TableHead>{t('planningManagement.viewPlan.holidayRate')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewPlan.budgetConfigs.map((config, index) => (
                      <TableRow key={index}>
                        <TableCell>{config.budgetName}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(config.availableBalance)}</TableCell>
                        <TableCell>{formatCurrency(config.weekdayRate)}/h</TableCell>
                        <TableCell>{formatCurrency(config.holidayRate)}/h</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!planToDelete} onOpenChange={() => setPlanToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('planningManagement.deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('planningManagement.deleteConfirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => planToDelete && deleteMutation.mutate(planToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}