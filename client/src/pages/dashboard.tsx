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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-white shadow-sm border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                  Active Clients
                </span>
                <h3 className="text-3xl font-bold text-gray-900 mt-1" data-testid="text-active-clients">
                  {metrics?.activeClients || 0}
                </h3>
                <p className="text-sm text-gray-500">Active Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  Team Members
                </span>
                <h3 className="text-3xl font-bold text-gray-900 mt-1" data-testid="text-staff-members">
                  {metrics?.staffMembers || 0}
                </h3>
                <p className="text-sm text-gray-500">Staff Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">
                  Hours This Month
                </span>
                <h3 className="text-3xl font-bold text-gray-900 mt-1" data-testid="text-monthly-hours">
                  {metrics?.monthlyHours?.toFixed(2) || "0.00"}
                </h3>
                <p className="text-sm text-gray-500">Hours Logged</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Euro className="h-6 w-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  Monthly Revenue
                </span>
                <h3 className="text-3xl font-bold text-gray-900 mt-1" data-testid="text-monthly-revenue">
                  €{metrics?.monthlyRevenue ? Number(metrics.monthlyRevenue).toFixed(2) : "0.00"}
                </h3>
                <p className="text-sm text-gray-500">Monthly Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions and System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="bg-white shadow-sm border-0">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/time-tracking">
              <div className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <span className="text-gray-700 group-hover:text-gray-900">Log Hours</span>
              </div>
            </Link>

            <Link href="/clients">
              <div className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mr-3">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
                <span className="text-gray-700 group-hover:text-gray-900">Manage Clients</span>
              </div>
            </Link>

            <Link href="/staff">
              <div className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center mr-3">
                  <UserCheck className="h-5 w-5 text-purple-500" />
                </div>
                <span className="text-gray-700 group-hover:text-gray-900">Manage Staff</span>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="bg-white shadow-sm border-0">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Shield className="h-5 w-5 text-blue-500" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-gray-400" />
                  All systems operational
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-600">Online</span>
                </div>
              </div>
              
              <div className="border-t pt-3">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Last backup</span>
                  <span className="text-sm text-gray-700 font-medium">2 hours ago</span>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Data sync</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
