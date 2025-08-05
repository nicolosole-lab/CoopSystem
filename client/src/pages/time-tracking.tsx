import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, Euro, Calendar, Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { TimeLogForm } from "@/components/forms/time-log-form";
import type { TimeLog, Client, Staff } from "@shared/schema";
import { useTranslation } from 'react-i18next';

export default function TimeTracking() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTimeLog, setSelectedTimeLog] = useState<TimeLog | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: timeLogs = [], isLoading: timeLogsLoading, error: timeLogsError } = useQuery<TimeLog[]>({
    queryKey: ["/api/time-logs"],
    retry: false,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    retry: false,
  });

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
    retry: false,
  });

  const deleteTimeLogMutation = useMutation({
    mutationFn: async (timeLogId: string) => {
      await apiRequest("DELETE", `/api/time-logs/${timeLogId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: t('common.success'),
        description: t('timeTracking.deleteSuccess'),
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete time log",
        variant: "destructive",
      });
    },
  });

  if (timeLogsError && isUnauthorizedError(timeLogsError as Error)) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
    return null;
  }

  // Calculate quick stats
  const today = new Date();
  const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);

  const todayLogs = timeLogs.filter(log => {
    const logDate = new Date(log.serviceDate);
    return logDate.toDateString() === today.toDateString();
  });

  const weekLogs = timeLogs.filter(log => {
    const logDate = new Date(log.serviceDate);
    return logDate >= startOfWeek && logDate <= endOfWeek;
  });

  const todayHours = todayLogs.reduce((sum, log) => sum + parseFloat(log.hours), 0);
  const weekHours = weekLogs.reduce((sum, log) => sum + parseFloat(log.hours), 0);
  const weekRevenue = weekLogs.reduce((sum, log) => sum + parseFloat(log.totalCost), 0);

  const getServiceTypeBadge = (serviceType: string) => {
    const types = {
      "personal-care": { label: "Personal Care", className: "bg-primary/10 text-primary" },
      "home-support": { label: "Home Support", className: "bg-secondary/10 text-secondary" },
      "medical-assistance": { label: "Medical Assistance", className: "bg-accent/10 text-accent" },
      "social-support": { label: "Social Support", className: "bg-green-100 text-green-800" },
      "transportation": { label: "Transportation", className: "bg-orange-100 text-orange-800" },
    };
    const type = types[serviceType as keyof typeof types] || { label: serviceType, className: "bg-slate-100 text-slate-800" };
    return <Badge className={type.className}>{type.label}</Badge>;
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : "Unknown Client";
  };

  const getStaffName = (staffId: string) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : "Unknown Staff";
  };

  const handleEdit = (timeLog: TimeLog) => {
    setSelectedTimeLog(timeLog);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (timeLogId: string) => {
    if (confirm(t('timeTracking.confirmDelete'))) {
      deleteTimeLogMutation.mutate(timeLogId);
    }
  };

  const handleFormSuccess = () => {
    setIsAddDialogOpen(false);
    setIsEditDialogOpen(false);
    setSelectedTimeLog(null);
  };

  if (timeLogsLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2" data-testid="text-time-tracking-title">
            {t('timeTracking.title')}
          </h2>
          <p className="text-slate-600">{t('timeTracking.description')}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mt-4 sm:mt-0 bg-primary hover:bg-primary/90" data-testid="button-log-hours">
              <Plus className="mr-2 h-4 w-4" />
              {t('timeTracking.logHours')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('timeTracking.logServiceHours')}</DialogTitle>
            </DialogHeader>
            <TimeLogForm onSuccess={handleFormSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Clock className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{t('timeTracking.todayHours')}</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-2" data-testid="text-today-hours">
              {todayHours.toFixed(1)}
            </p>
            <p className="text-sm text-slate-600">hours logged today</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                <Calendar className="text-secondary" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{t('timeTracking.weekHours')}</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-2" data-testid="text-week-hours">
              {weekHours.toFixed(0)}
            </p>
            <p className="text-sm text-slate-600">hours across all clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Euro className="text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{t('timeTracking.weekRevenue')}</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-2" data-testid="text-week-revenue">
              €{weekRevenue.toFixed(2)}
            </p>
            <p className="text-sm text-slate-600">total revenue this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Time Logs */}
      <Card>
        <CardHeader>
          <CardTitle>{t('timeTracking.recentLogs')} ({timeLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {timeLogs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-600" data-testid="text-no-time-logs">
                {t('timeTracking.noLogsFound')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Date</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Client</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Staff</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Service</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Hours</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Cost</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {timeLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50" data-testid={`row-time-log-${log.id}`}>
                      <td className="py-4 px-6 text-sm text-slate-900" data-testid={`text-log-date-${log.id}`}>
                        {new Date(log.serviceDate).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-900" data-testid={`text-log-client-${log.id}`}>
                        {getClientName(log.clientId)}
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-900" data-testid={`text-log-staff-${log.id}`}>
                        {getStaffName(log.staffId)}
                      </td>
                      <td className="py-4 px-6" data-testid={`badge-log-service-${log.id}`}>
                        {getServiceTypeBadge(log.serviceType)}
                      </td>
                      <td className="py-4 px-6 text-sm font-medium text-slate-900" data-testid={`text-log-hours-${log.id}`}>
                        {parseFloat(log.hours).toFixed(1)}
                      </td>
                      <td className="py-4 px-6 text-sm font-medium text-green-600" data-testid={`text-log-cost-${log.id}`}>
                        €{parseFloat(log.totalCost).toFixed(2)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(log)}
                            data-testid={`button-edit-log-${log.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(log.id)}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-log-${log.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Time Log Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Time Log</DialogTitle>
          </DialogHeader>
          {selectedTimeLog && (
            <TimeLogForm
              timeLog={selectedTimeLog}
              onSuccess={handleFormSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
