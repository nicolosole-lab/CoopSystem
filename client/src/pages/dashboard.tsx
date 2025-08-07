import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, Clock, Euro, Heart, Activity, Shield, Sparkles } from "lucide-react";
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
    <div className="p-4 sm:p-6 lg:p-8 min-h-full">
      {/* Page Header */}
      <div className="mb-8 relative">
        <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-br from-blue-200 to-green-200 rounded-full blur-3xl opacity-30 float-gentle"></div>
        <h2 className="text-3xl font-bold care-gradient-text mb-2" data-testid="text-dashboard-title">
          {t('dashboard.title')}
        </h2>
        <p className="text-gray-600 flex items-center gap-2" data-testid="text-dashboard-description">
          <Heart className="h-4 w-4 text-red-400 animate-pulse" />
          {t('dashboard.description')}
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="care-card group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <Users className="text-white text-xl" />
              </div>
              <span className="text-xs font-medium text-green-700 bg-gradient-to-r from-green-100 to-yellow-100 px-3 py-1 rounded-full">
                {t('dashboard.metrics.active')}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1" data-testid="text-active-clients">
              {metrics?.activeClients || 0}
            </h3>
            <p className="text-sm text-gray-600">{t('dashboard.metrics.activeClients')}</p>
          </CardContent>
        </Card>

        <Card className="care-card group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <UserCheck className="text-white text-xl" />
              </div>
              <span className="text-xs font-medium text-blue-700 bg-gradient-to-r from-blue-100 to-indigo-100 px-3 py-1 rounded-full">
                {t('dashboard.metrics.team')}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1" data-testid="text-staff-members">
              {metrics?.staffMembers || 0}
            </h3>
            <p className="text-sm text-gray-600">{t('dashboard.metrics.staffMembers')}</p>
          </CardContent>
        </Card>

        <Card className="care-card group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <Clock className="text-white text-xl" />
              </div>
              <span className="text-xs font-medium text-purple-700 bg-gradient-to-r from-purple-100 to-pink-100 px-3 py-1 rounded-full">
                {t('dashboard.metrics.thisMonth')}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1" data-testid="text-monthly-hours">
              {metrics?.monthlyHours?.toString() || "0"}
            </h3>
            <p className="text-sm text-gray-600">{t('dashboard.metrics.hoursLogged')}</p>
          </CardContent>
        </Card>

        <Card className="care-card group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <Euro className="text-white text-xl" />
              </div>
              <span className="text-xs font-medium text-orange-700 bg-gradient-to-r from-yellow-100 to-orange-100 px-3 py-1 rounded-full">
                {t('dashboard.metrics.revenue')}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1" data-testid="text-monthly-revenue">
              €{metrics?.monthlyRevenue ? metrics.monthlyRevenue.toFixed(2) : "0.00"}
            </h3>
            <p className="text-sm text-gray-600">{t('dashboard.metrics.monthlyRevenue')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="care-card">
            <CardHeader className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200 to-green-200 rounded-full blur-3xl opacity-20 -mr-16 -mt-16"></div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/time-tracking">
                <Button
                  variant="outline"
                  className="w-full justify-start border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 group"
                  data-testid="button-log-hours"
                >
                  <Clock className="mr-2 h-4 w-4 text-blue-600 group-hover:animate-pulse" />
                  Log Hours
                </Button>
              </Link>

              <Link href="/clients">
                <Button
                  variant="outline"
                  className="w-full justify-start border-2 border-dashed border-green-300 hover:border-green-500 hover:bg-green-50 transition-all duration-300 group"
                  data-testid="button-add-client"
                >
                  <Users className="mr-2 h-4 w-4 text-green-600 group-hover:animate-pulse" />
                  Manage Clients
                </Button>
              </Link>

              <Link href="/staff">
                <Button
                  variant="outline"
                  className="w-full justify-start border-2 border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50 transition-all duration-300 group"
                  data-testid="button-manage-staff"
                >
                  <UserCheck className="mr-2 h-4 w-4 text-purple-600 group-hover:animate-pulse" />
                  Manage Staff
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="care-card relative overflow-hidden">
            <CardHeader>
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-200 to-blue-200 rounded-full blur-2xl opacity-20 -mr-12 -mt-12"></div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-gray-400" />
                    All systems operational
                  </span>
                  <span className="text-sm font-medium text-green-600 flex items-center gap-1" data-testid="text-system-status">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Online
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last backup</span>
                  <span className="text-sm text-gray-900" data-testid="text-last-backup">
                    2 hours ago
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Data sync</span>
                  <span className="text-sm text-green-600 flex items-center gap-1" data-testid="text-data-sync">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
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
