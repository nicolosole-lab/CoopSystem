import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import StaffPage from "@/pages/staff";
import TimeTracking from "@/pages/time-tracking";
import Budgets from "@/pages/budgets";
import NotFound from "@/pages/not-found";

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
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

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header onMenuClick={toggleSidebar} />
      <div className="flex h-screen pt-16">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <main className="flex-1 overflow-y-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/clients" component={Clients} />
            <Route path="/staff" component={StaffPage} />
            <Route path="/time-tracking" component={TimeTracking} />
            <Route path="/budgets" component={Budgets} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
