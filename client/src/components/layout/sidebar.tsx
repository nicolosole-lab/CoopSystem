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
  FileSpreadsheet 
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
    { name: t('navigation.dashboard'), href: "/", icon: BarChart3 },
    { name: t('navigation.clientManagement'), href: "/clients", icon: Users },
    { name: t('navigation.staffManagement'), href: "/staff", icon: UserCheck },
    { name: t('navigation.timeTracking'), href: "/time-tracking", icon: Clock },
    { name: t('navigation.budgetManagement'), href: "/budgets", icon: Calculator },
    { name: t('navigation.dataManagement'), href: "/data-management", icon: FileSpreadsheet },
  ];

  const secondaryNavigation = [
    { name: t('navigation.settings'), href: "/settings", icon: Settings },
    { name: t('navigation.helpSupport'), href: "/help", icon: HelpCircle },
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
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
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
                    data-testid={`nav-${item.href === "/" ? "dashboard" : item.href.slice(1)}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Button>
                </Link>
              );
            })}

            <hr className="my-4 border-blue-100" />

            {secondaryNavigation.map((item) => {
              const Icon = item.icon;
              
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start space-x-3 h-10 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200"
                    onClick={onClose}
                    data-testid={`nav-${item.href.slice(1)}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
