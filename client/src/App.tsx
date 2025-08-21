import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { ProtectedRoute } from "@/lib/protected-route";
import Clients from "@/pages/clients";
import ClientDetails from "@/pages/client-details";
import StaffPage from "@/pages/staff";
import StaffDetails from "@/pages/staff-details";
import TimeTracking from "@/pages/time-tracking";
import Budgets from "@/pages/budgets";
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";
import DataManagement from "@/pages/data-management";
import ImportDetails from "@/pages/import-details";
import Profile from "@/pages/profile";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Planning from "@/pages/planning";
import HomeCarePlanning from "@/pages/home-care-planning";
import PlanningManagement from "@/pages/planning-management";
import Statistics from "@/pages/statistics";
import SystemManagement from "@/pages/system-management";
import CompensationDashboard from "@/pages/compensation-dashboard";
import CompensationBudgetAllocationPage from "@/pages/compensation-budget-allocation";
import MileageTracking from "@/pages/mileage-tracking";
import SmartHoursEntry from "@/pages/smart-hours-entry";
import StaffAssignments from "@/pages/staff-assignments";
import StaffAssignmentsMatrix from "@/pages/staff-assignments-matrix";
import StaffAssignmentsKanban from "@/pages/staff-assignments-simple";
import ObjectStorage from "@/pages/object-storage";
import AssistanceCalendar from "@/pages/assistance-calendar";
import GDPRDashboard from "@/pages/gdpr-dashboard";
import ClientPaymentRecords from "@/pages/client-payment-records";
import AnalyticsDashboard from "@/pages/analytics-dashboard";
import Reports from "@/pages/reports";
import AutomationDashboard from "@/pages/automation-dashboard";
import WorkflowBuilder from "@/pages/workflow-builder";
import BudgetConfiguration from "@/pages/budget-configuration";
import CompensationTable from "@/pages/compensation-table";
import IntegrityVerification from "@/pages/IntegrityVerification";
import DailyHoursReport from "@/pages/DailyHoursReport";

import backgroundImage from '@assets/generated_images/Healthcare_facility_background_2463fb2c.png';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-xl mx-auto mb-4 flex items-center justify-center animate-pulse">
            <div className="w-8 h-8 bg-primary rounded-lg"></div>
          </div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="/" component={AuthPage} />
        <Route component={AuthPage} />
      </Switch>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" style={{
      backgroundImage: `url(${backgroundImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed'
    }}>
      <div className="min-h-screen bg-white/90 backdrop-blur-sm">
        <Header onMenuClick={toggleSidebar} />
        <div className="flex min-h-[calc(100vh-4rem)]">
          <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
          <main className="flex-1 bg-transparent relative">
            <Switch>
            <Route path="/" component={Statistics} />
            <Route path="/dashboard" component={Statistics} />
            <Route path="/clients" component={Clients} />
            <Route path="/clients/:id" component={ClientDetails} />
            <Route path="/client-payment-records" component={ClientPaymentRecords} />
            <Route path="/staff" component={StaffPage} />
            <Route path="/staff/:id" component={StaffDetails} />
            <Route path="/time-tracking">
              {() => {
                window.location.replace('/smart-hours-entry');
                return null;
              }}
            </Route>
            <Route path="/budgets" component={Budgets} />
            <Route path="/data-management" component={DataManagement} />
            <Route path="/import/:id" component={ImportDetails} />
            <Route path="/profile" component={Profile} />
            <Route path="/planning" component={Planning} />
            <Route path="/home-care-planning" component={HomeCarePlanning} />
            <Route path="/planning-management" component={PlanningManagement} />
            <Route path="/system-management" component={SystemManagement} />
            <Route path="/compensations" component={CompensationDashboard} />
            <Route path="/compensation-dashboard" component={CompensationDashboard} />

            <Route path="/compensation/:compensationId/budget-allocation" component={CompensationBudgetAllocationPage} />
            <Route path="/mileage-tracking" component={MileageTracking} />
            <Route path="/smart-hours-entry" component={SmartHoursEntry} />
            <Route path="/staff-assignments" component={StaffAssignments} />
            <Route path="/staff-assignments-matrix" component={StaffAssignmentsMatrix} />
            <Route path="/staff-assignments-kanban" component={StaffAssignmentsKanban} />
            <Route path="/object-storage" component={ObjectStorage} />
            <Route path="/assistance-calendar" component={AssistanceCalendar} />
            <Route path="/gdpr-dashboard" component={GDPRDashboard} />
            <Route path="/analytics-dashboard" component={AnalyticsDashboard} />
            <Route path="/reports" component={Reports} />
            <Route path="/automation-dashboard" component={AutomationDashboard} />
            <Route path="/workflow-builder" component={WorkflowBuilder} />
            <Route path="/budget-configuration" component={BudgetConfiguration} />
            <Route path="/compensation-table" component={CompensationTable} />
            <Route path="/integrity-verification" component={IntegrityVerification} />
            <Route path="/daily-hours-report" component={DailyHoursReport} />
            <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <AppContent />
          </TooltipProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
