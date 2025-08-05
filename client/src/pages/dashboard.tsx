import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, Clock, Euro } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from 'react-i18next';

interface DashboardMetrics {
  activeClients: number;
  staffMembers: number;
  monthlyHours: number;
  monthlyRevenue: number;
}

export default function Dashboard() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();

  const { data: metrics, isLoading: metricsLoading, error } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
    retry: false,
    enabled: !!user, // Only fetch if user is authenticated
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/auth";
      }, 500);
    }
  }, [user, isLoading, toast]);

  if (isLoading || (!user && !isLoading)) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-96 mb-8"></div>
        </div>
      </div>
    );
  }

  if (metricsLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-96 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2" data-testid="text-dashboard-title">
          {t('dashboard.title')}
        </h2>
        <p className="text-slate-600" data-testid="text-dashboard-description">
          {t('dashboard.description')}
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="text-primary text-xl" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                {t('dashboard.metrics.active')}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-1" data-testid="text-active-clients">
              {metrics?.activeClients || 0}
            </h3>
            <p className="text-sm text-slate-600">{t('dashboard.metrics.activeClients')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <UserCheck className="text-secondary text-xl" />
              </div>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                {t('dashboard.metrics.team')}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-1" data-testid="text-staff-members">
              {metrics?.staffMembers || 0}
            </h3>
            <p className="text-sm text-slate-600">{t('dashboard.metrics.staffMembers')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Clock className="text-accent text-xl" />
              </div>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                {t('dashboard.metrics.thisMonth')}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-1" data-testid="text-monthly-hours">
              {metrics?.monthlyHours?.toString() || "0"}
            </h3>
            <p className="text-sm text-slate-600">{t('dashboard.metrics.hoursLogged')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Euro className="text-green-600 text-xl" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                {t('dashboard.metrics.revenue')}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-1" data-testid="text-monthly-revenue">
              €{metrics?.monthlyRevenue ? metrics.monthlyRevenue.toFixed(2) : "0.00"}
            </h3>
            <p className="text-sm text-slate-600">{t('dashboard.metrics.monthlyRevenue')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.quickActions.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/time-tracking">
                <Button
                  variant="outline"
                  className="w-full justify-start border-2 border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5"
                  data-testid="button-log-hours"
                >
                  <Clock className="mr-2 h-4 w-4 text-primary" />
                  {t('dashboard.quickActions.logHours')}
                </Button>
              </Link>

              <Link href="/clients">
                <Button
                  variant="outline"
                  className="w-full justify-start border-2 border-dashed border-secondary/30 hover:border-secondary/50 hover:bg-secondary/5"
                  data-testid="button-add-client"
                >
                  <Users className="mr-2 h-4 w-4 text-secondary" />
                  Manage Clients
                </Button>
              </Link>

              <Link href="/staff">
                <Button
                  variant="outline"
                  className="w-full justify-start border-2 border-dashed border-accent/30 hover:border-accent/50 hover:bg-accent/5"
                  data-testid="button-manage-staff"
                >
                  <UserCheck className="mr-2 h-4 w-4 text-accent" />
                  Manage Staff
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">System Status</span>
                  <span className="text-sm font-medium text-green-600" data-testid="text-system-status">
                    Online
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Last Backup</span>
                  <span className="text-sm text-slate-900" data-testid="text-last-backup">
                    Today, 3:00 AM
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Data Sync</span>
                  <span className="text-sm text-green-600" data-testid="text-data-sync">
                    Active
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
