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
  FileText,
  Upload,
  Brain,
  UserPlus,
  Database
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
      section: "PRINCIPALE",
      items: [
        { name: "Dashboard", href: "/", icon: BarChart3 },
      ]
    },
    {
      section: "RENDICONTAZIONE ASSISTITI",
      items: [
        { name: "Gestione Assistiti", href: "/clients", icon: Users },
        { name: "Budget Assistiti", href: "/budgets", icon: Calculator },
        { name: "Gestione Pianificazioni", href: "/planning", icon: Calendar },
      ]
    },
    {
      section: "RENDICONTAZIONE COLLABORATORI",
      items: [
        { name: "Gestione Collaboratori", href: "/staff", icon: UserCheck },
        { name: "Ore Mensili", href: "/time-tracking", icon: Clock },
        { name: "Inserimento Ore Intelligente", href: "/smart-hours", icon: Brain },
        { name: "Importa da Excel", href: "/data-management", icon: Upload },
        { name: "Log Importazioni", href: "/data-management", icon: FileText },
        { name: "Assegnazioni Collaboratori", href: "/staff-assignments", icon: UserPlus },
        { name: "Object Storage", href: "/object-storage", icon: Database },
      ]
    },
    {
      section: "RENDICONTAZIONE BUDGET",
      items: [
        { name: "Pianificazione Domiciliare", href: "/home-planning", icon: Home },
        { name: "Calendario Assistenza", href: "/assistance-calendar", icon: Calendar },
      ]
    }
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
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
          "fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-white to-blue-50/50 border-r border-blue-100 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
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
