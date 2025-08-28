import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Menu, Heart, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";
import logoPath from "@assets/privatassistenza_logo_1754399310858.jpeg";

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
    <header className="bg-white/90 backdrop-blur-md border-b border-blue-100 sticky top-0 z-[99] shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="lg:hidden hover:bg-blue-50"
              data-testid="button-menu-toggle"
            >
              <Menu className="h-5 w-5 text-blue-700" />
            </Button>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img 
                  src={logoPath} 
                  alt="PrivatAssistenza" 
                  className="h-10 w-10 object-contain rounded-lg shadow-sm"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-blue-400 to-green-400 rounded-full pulse-soft"></div>
              </div>
              <div>
                <h1 className="hidden sm:block text-xl font-bold care-gradient-text" data-testid="text-app-title">
                  Cooperative Care
                </h1>
                <p className="hidden sm:block text-xs text-blue-600">Caring for Life</p>
              </div>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center space-x-4">
            {/* Language Toggle */}
            <div className="hidden sm:flex items-center space-x-1 text-sm bg-blue-50 rounded-full p-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`px-3 py-1 rounded-full transition-all ${language === 'en' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-blue-700'}`}
                onClick={() => setLanguage('en')}
                data-testid="button-language-en"
              >
                EN
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`px-3 py-1 rounded-full transition-all ${language === 'it' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-blue-700'}`}
                onClick={() => setLanguage('it')}
                data-testid="button-language-it"
              >
                IT
              </Button>
            </div>

            {/* Notifications - Future feature */}
            <Button variant="ghost" size="sm" className="relative hover:bg-blue-50 rounded-lg transition-all" data-testid="button-notifications">
              <Bell className="h-5 w-5 text-blue-600" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-green-400 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                3
              </span>
            </Button>

            {/* User Menu */}
            <div className="flex items-center space-x-2">
              <Link href="/profile" className="flex items-center space-x-2 hover:opacity-80">
                <Avatar className="w-8 h-8 cursor-pointer ring-2 ring-blue-200 hover:ring-blue-400 transition-all">
                  <AvatarImage src={user?.profileImageUrl || ""} alt="User avatar" />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-green-500 text-white text-sm">
                    {getInitials(user?.firstName || undefined, user?.lastName || undefined)}
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
                size="icon"
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
