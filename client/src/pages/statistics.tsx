import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, Users, Clock, Activity, BarChart3, FileText, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "react-i18next";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DurationStats {
  totalRecords: number;
  totalHours: number;
  averageHours: number;
  uniqueClients: number;
  uniqueOperators: number;
  yearlyComparison: {
    year: number;
    records: number;
    hours: number;
    clients: number;
    operators: number;
  }[];
  monthlyData: {
    month: string;
    records: number;
    hours: number;
  }[];
  topOperators: {
    name: string;
    hours: number;
    services: number;
  }[];
  topClients: {
    name: string;
    hours: number;
    services: number;
  }[];
  serviceDistribution: {
    range: string;
    count: number;
  }[];
}

export default function Statistics() {
  const { t } = useTranslation();
  const { locale } = useLanguage();
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const currentYear = new Date().getFullYear();
  const years = ["all", "2024", "2025"];

  const { data: stats, isLoading } = useQuery<DurationStats>({
    queryKey: ["/api/statistics/duration", selectedYear],
    queryFn: async () => {
      const yearParam = selectedYear === "all" ? "" : `?year=${selectedYear}`;
      const response = await fetch(`/api/statistics/duration${yearParam}`);
      if (!response.ok) throw new Error("Failed to fetch statistics");
      return response.json();
    },
  });

  const COLORS = ["#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"];

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(locale === "it" ? "it-IT" : "en-US").format(num);
  };

  const formatHours = (hours: number) => {
    return new Intl.NumberFormat(locale === "it" ? "it-IT" : "en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(hours);
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("navigation.items.statistics")}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {locale === "it" ? "Analisi dettagliata dei servizi di assistenza" : "Detailed analysis of care services"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{locale === "it" ? "Tutti" : "All Years"}</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-cyan-700">
              {locale === "it" ? "Totale Servizi" : "Total Services"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center justify-between">
              <p className="text-xl font-bold text-cyan-900">{formatNumber(stats?.totalRecords || 0)}</p>
              <Activity className="h-5 w-5 text-cyan-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-blue-700">
              {locale === "it" ? "Ore Totali" : "Total Hours"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center justify-between">
              <p className="text-xl font-bold text-blue-900">{formatHours(stats?.totalHours || 0)}</p>
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-purple-700">
              {locale === "it" ? "Media Ore" : "Average Hours"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center justify-between">
              <p className="text-xl font-bold text-purple-900">{formatHours(stats?.averageHours || 0)}</p>
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-pink-700">
              {locale === "it" ? "Assistiti" : "Clients"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center justify-between">
              <p className="text-xl font-bold text-pink-900">{formatNumber(stats?.uniqueClients || 0)}</p>
              <Users className="h-5 w-5 text-pink-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-amber-700">
              {locale === "it" ? "Operatori" : "Operators"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center justify-between">
              <p className="text-xl font-bold text-amber-900">{formatNumber(stats?.uniqueOperators || 0)}</p>
              <Users className="h-5 w-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Trend Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{locale === "it" ? "Andamento Mensile" : "Monthly Trend"}</CardTitle>
            <CardDescription className="text-xs">
              {locale === "it" ? "Servizi e ore per mese" : "Services and hours by month"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stats?.monthlyData || []}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => {
                    const [year, month] = value.split("-");
                    return locale === "it" 
                      ? format(new Date(parseInt(year), parseInt(month) - 1), "MMM", { locale: it })
                      : format(new Date(parseInt(year), parseInt(month) - 1), "MMM");
                  }}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  labelFormatter={(value) => {
                    const [year, month] = value.split("-");
                    return locale === "it"
                      ? format(new Date(parseInt(year), parseInt(month) - 1), "MMMM yyyy", { locale: it })
                      : format(new Date(parseInt(year), parseInt(month) - 1), "MMMM yyyy");
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line 
                  type="monotone" 
                  dataKey="records" 
                  stroke="#06b6d4" 
                  name={locale === "it" ? "Servizi" : "Services"}
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="hours" 
                  stroke="#8b5cf6" 
                  name={locale === "it" ? "Ore" : "Hours"}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Year Comparison */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {locale === "it" ? "Confronto Annuale" : "Yearly Comparison"}
            </CardTitle>
            <CardDescription className="text-xs">
              {locale === "it" ? "Statistiche per anno" : "Statistics by year"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats?.yearlyComparison || []}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="records" fill="#06b6d4" name={locale === "it" ? "Servizi" : "Services"} />
                <Bar dataKey="hours" fill="#8b5cf6" name={locale === "it" ? "Ore" : "Hours"} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Operators */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{locale === "it" ? "Top Operatori" : "Top Operators"}</CardTitle>
            <CardDescription className="text-xs">
              {locale === "it" ? "Per ore di servizio" : "By service hours"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats?.topOperators.slice(0, 5).map((op, index) => (
                <div key={index} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{op.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatNumber(op.services)} {locale === "it" ? "servizi" : "services"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-cyan-600">{formatHours(op.hours)}h</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{locale === "it" ? "Top Assistiti" : "Top Clients"}</CardTitle>
            <CardDescription className="text-xs">
              {locale === "it" ? "Per ore ricevute" : "By hours received"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats?.topClients.slice(0, 5).map((client, index) => (
                <div key={index} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{client.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatNumber(client.services)} {locale === "it" ? "servizi" : "services"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-purple-600">{formatHours(client.hours)}h</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Service Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {locale === "it" ? "Distribuzione Servizi" : "Service Distribution"}
            </CardTitle>
            <CardDescription className="text-xs">
              {locale === "it" ? "Per durata" : "By duration"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats?.serviceDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {stats?.serviceDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1">
              {stats?.serviceDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span>{item.range}</span>
                  </div>
                  <span className="font-medium">{formatNumber(item.count)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      {stats?.yearlyComparison && stats.yearlyComparison.length > 1 && (
        <Card className="bg-gradient-to-r from-cyan-50 via-blue-50 to-purple-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {locale === "it" ? "Riepilogo Crescita" : "Growth Summary"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(() => {
                const current = stats.yearlyComparison[stats.yearlyComparison.length - 1];
                const previous = stats.yearlyComparison[stats.yearlyComparison.length - 2];
                const servicesGrowth = ((current.records - previous.records) / previous.records * 100).toFixed(1);
                const hoursGrowth = ((current.hours - previous.hours) / previous.hours * 100).toFixed(1);
                const clientsGrowth = ((current.clients - previous.clients) / previous.clients * 100).toFixed(1);
                const operatorsGrowth = ((current.operators - previous.operators) / previous.operators * 100).toFixed(1);

                return (
                  <>
                    <div>
                      <p className="text-xs text-gray-600">{locale === "it" ? "Servizi" : "Services"}</p>
                      <p className="text-lg font-bold text-cyan-700">
                        {parseFloat(servicesGrowth) > 0 ? "+" : ""}{servicesGrowth}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">{locale === "it" ? "Ore" : "Hours"}</p>
                      <p className="text-lg font-bold text-blue-700">
                        {parseFloat(hoursGrowth) > 0 ? "+" : ""}{hoursGrowth}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">{locale === "it" ? "Assistiti" : "Clients"}</p>
                      <p className="text-lg font-bold text-purple-700">
                        {parseFloat(clientsGrowth) > 0 ? "+" : ""}{clientsGrowth}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">{locale === "it" ? "Operatori" : "Operators"}</p>
                      <p className="text-lg font-bold text-pink-700">
                        {parseFloat(operatorsGrowth) > 0 ? "+" : ""}{operatorsGrowth}%
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}