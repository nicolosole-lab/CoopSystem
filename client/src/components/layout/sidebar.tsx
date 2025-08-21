import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Calculator, 
  Clock, 
  HelpCircle, 
  Settings, 
  UserCheck, 
  Users,
  FileSpreadsheet,
  Calendar,
  Home,
  Upload,
  Brain,
  UserPlus,
  Database,
  Euro,
  Car,
  Shield,
  FileText,
  TrendingUp,
  Bot
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { t } = useTranslation();

  const navigation = [
    {
      section: t('navigation.sections.main'),
      items: [
        { name: t('navigation.items.dashboard'), href: "/", icon: BarChart3 },
      ]
    },
    {
      section: t('navigation.sections.clientReporting'),
      items: [
        { name: t('navigation.items.clientManagement'), href: "/clients", icon: Users },
        { name: "Client Payment Records", href: "/client-payment-records", icon: FileText },
        { name: t('navigation.items.clientBudgets'), href: "/budgets", icon: Calculator },
        { name: t('navigation.items.planningManagement'), href: "/planning-management", icon: Calendar },
      ]
    },
    {
      section: t('navigation.sections.staffReporting'),
      items: [
        { name: t('navigation.items.staffManagement'), href: "/staff", icon: UserCheck },
        { name: "Tabella Compensi", href: "/compensation-table", icon: FileText },
        { name: t('navigation.items.smartHoursEntry'), href: "/smart-hours-entry", icon: Brain },
        { name: t('navigation.items.mileageTracking'), href: "/mileage-tracking", icon: Car },
        { name: t('navigation.items.importFromExcel'), href: "/data-management", icon: Upload },
        { name: t('navigation.items.staffAssignments'), href: "/staff-assignments-kanban", icon: UserPlus },
        { name: t('navigation.items.objectStorage'), href: "/object-storage", icon: Database },
      ]
    },
    {
      section: t('navigation.sections.budgetReporting'),
      items: [
        { name: t('navigation.items.homePlanning'), href: "/home-care-planning", icon: Home },
        { name: t('navigation.items.assistanceCalendar'), href: "/assistance-calendar", icon: Calendar },
      ]
    },
    {
      section: "Analytics & Reports",
      items: [
        { name: "Analytics Dashboard", href: "/analytics-dashboard", icon: TrendingUp },
        { name: "Reports", href: "/reports", icon: FileText },
        { name: "Report Ore Giornaliere", href: "/daily-hours-report", icon: Clock },
      ]
    },
    {
      section: "Automation & AI",
      items: [
        { name: "Automation Dashboard", href: "/automation-dashboard", icon: Bot },
        { name: "Workflow Builder", href: "/workflow-builder", icon: Settings },
      ]
    },
    {
      section: t('navigation.sections.system'),
      items: [
        { name: t('navigation.items.systemManagement'), href: "/system-management", icon: Settings },
        { name: "Budget Configuration", href: "/budget-configuration", icon: Settings },
        { name: "GDPR Compliance", href: "/gdpr-dashboard", icon: Shield },
        { name: "Verifica Integrità Dati", href: "/integrity-verification", icon: Database },
      ]
    }
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    // Check for exact match or match with a slash (to handle sub-routes)
    return location === href || location.startsWith(href + '/');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-16 bottom-0 left-0 z-50 w-64 bg-gradient-to-b from-white/95 to-blue-50/95 backdrop-blur-sm border-r border-blue-100 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:h-full",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <nav className="flex-1 px-4 py-6 space-y-6">
            {navigation.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {section.section}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    
                    return (
                      <Link key={item.name} href={item.href}>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start space-x-3 h-10 transition-all duration-200",
                            active
                              ? "bg-gradient-to-r from-blue-100 to-green-100 text-blue-700 hover:from-blue-200 hover:to-green-200 shadow-sm"
                              : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                          )}
                          onClick={onClose}
                          data-testid={`nav-${item.href === "/" ? "dashboard" : item.href.slice(1).replace(/\//g, '-')}`}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-sm">{item.name}</span>
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
