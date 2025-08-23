import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Clock, Calculator, BarChart3 } from "lucide-react";
import { useTranslation } from 'react-i18next';

export default function Landing() {
  const { t } = useTranslation();
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/10">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-primary rounded-xl mx-auto mb-6 flex items-center justify-center">
            <Users className="text-white text-3xl" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            {t('landing.title')}
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            {t('landing.subtitle')}
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {t('landing.features.clientManagement')}
              </h3>
              <p className="text-slate-600">
                {t('landing.features.clientManagementDesc')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="w-12 h-12 text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Time Tracking
              </h3>
              <p className="text-slate-600">
                Log service hours with automatic cost calculation based on staff rates.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Calculator className="w-12 h-12 text-accent mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Budget Management
              </h3>
              <p className="text-slate-600">
                Allocate budgets across categories and track spending in real-time.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                Get Started Today
              </h2>
              <p className="text-slate-600 mb-6">
                Sign in to access your cooperative management dashboard.
              </p>
              <Button 
                onClick={handleLogin}
                className="w-full bg-primary hover:bg-primary/90"
                data-testid="button-login"
              >
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
