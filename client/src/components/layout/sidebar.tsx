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

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3 },
    { name: "Client Management", href: "/clients", icon: Users },
    { name: "Staff Management", href: "/staff", icon: UserCheck },
    { name: "Time Tracking", href: "/time-tracking", icon: Clock },
    { name: "Budget Management", href: "/budgets", icon: Calculator },
    { name: "Data Management", href: "/data-management", icon: FileSpreadsheet },
  ];

  const secondaryNavigation = [
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Help & Support", href: "/help", icon: HelpCircle },
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
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
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
                      "w-full justify-start space-x-3 h-10",
                      active
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "text-slate-700 hover:bg-slate-100"
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

            <hr className="my-4 border-slate-200" />

            {secondaryNavigation.map((item) => {
              const Icon = item.icon;
              
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start space-x-3 h-10 text-slate-700 hover:bg-slate-100"
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
