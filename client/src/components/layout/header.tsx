import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Menu, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const { language, setLanguage } = useLanguage();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="lg:hidden"
              data-testid="button-menu-toggle"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Users className="text-white text-sm" />
              </div>
              <h1 className="hidden sm:block text-xl font-semibold text-slate-900" data-testid="text-app-title">
                Cooperative Management
              </h1>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center space-x-4">
            {/* Language Toggle */}
            <div className="hidden sm:flex items-center space-x-2 text-sm">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`px-2 py-1 ${language === 'en' ? 'text-primary bg-primary/10' : ''}`}
                onClick={() => setLanguage('en')}
                data-testid="button-language-en"
              >
                EN
              </Button>
              <span className="text-slate-400">|</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`px-2 py-1 ${language === 'it' ? 'text-primary bg-primary/10' : ''}`}
                onClick={() => setLanguage('it')}
                data-testid="button-language-it"
              >
                IT
              </Button>
            </div>

            {/* Notifications - Future feature */}
            <Button variant="ghost" size="sm" className="relative" data-testid="button-notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </Button>

            {/* User Menu */}
            <div className="flex items-center space-x-2">
              <Link href="/profile" className="flex items-center space-x-2 hover:opacity-80">
                <Avatar className="w-8 h-8 cursor-pointer">
                  <AvatarImage src={user?.profileImageUrl || ""} alt="User avatar" />
                  <AvatarFallback className="bg-primary text-white text-sm">
                    {getInitials(user?.firstName, user?.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <span className="text-sm font-medium text-slate-700 cursor-pointer" data-testid="text-user-name">
                    {user?.firstName && user?.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user?.email || "User"
                    }
                  </span>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700"
                data-testid="button-logout"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
