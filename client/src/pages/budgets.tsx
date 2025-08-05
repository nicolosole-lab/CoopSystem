import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, AlertTriangle } from "lucide-react";
import { useTranslation } from 'react-i18next';

export default function Budgets() {
  const { t } = useTranslation();
  
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2" data-testid="text-budgets-title">
          {t('budgets.title')}
        </h2>
        <p className="text-slate-600">
          {t('budgets.description')}
        </p>
      </div>

      {/* Coming Soon Notice */}
      <Card>
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-xl mx-auto mb-6 flex items-center justify-center">
            <Calculator className="text-primary text-2xl" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-4">
            {t('budgets.comingSoon')}
          </h3>
          <p className="text-slate-600 max-w-md mx-auto mb-6">
            {t('budgets.inDevelopment')}
          </p>
          <Badge className="bg-primary/10 text-primary">
            {t('budgets.phase2')}
          </Badge>
        </CardContent>
      </Card>

      {/* Future Features Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-green-600" />
              </div>
              <h4 className="font-semibold text-slate-900">{t('budgets.futureFeatures.forecasting')}</h4>
            </div>
            <p className="text-sm text-slate-600">
              Predict future spending patterns and get recommendations for optimal budget allocation.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="text-orange-600" />
              </div>
              <h4 className="font-semibold text-slate-900">Budget Alerts</h4>
            </div>
            <p className="text-sm text-slate-600">
              Receive notifications when budgets are approaching limits or when spending patterns change.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calculator className="text-blue-600" />
              </div>
              <h4 className="font-semibold text-slate-900">Category Management</h4>
            </div>
            <p className="text-sm text-slate-600">
              Create and manage the 10 mandatory budget categories for each client with custom allocation rules.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
