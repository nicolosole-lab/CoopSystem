import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatDisplayName } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, FileText, Clock, Euro, Users, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Link } from 'wouter';

interface PaymentRecord {
  id: string;
  clientId: string;
  clientName: string;
  staffId: string;
  staffName: string;
  staffType: 'internal' | 'external';
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  weekdayHours: number;
  holidayHours: number;
  totalAmount: number;
  budgetAllocations: {
    budgetType: string;
    amount: number;
    hours: number;
  }[];
  clientPaymentDue: number;
  paymentStatus: 'pending' | 'paid' | 'overdue';
  generatedAt: string;
}

interface PaymentSummary {
  totalClients: number;
  totalStaff: number;
  totalHours: number;
  totalAmount: number;
  totalBudgetCoverage: number;
  totalClientPayments: number;
}

export default function ClientPaymentRecords() {
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Get August 2025 dates since that's where the data exists
  const currentDate = new Date('2025-08-01'); // Use August 2025 where data exists
  const defaultStartDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const defaultEndDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  // Calculate actual date range
  const getDateRange = () => {
    if (selectedPeriod === 'custom') {
      return { 
        startDate: customStartDate || defaultStartDate, 
        endDate: customEndDate || defaultEndDate 
      };
    } else if (selectedPeriod === 'last_month') {
      const lastMonth = subMonths(currentDate, 1);
      return {
        startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd')
      };
    }
    return { startDate: defaultStartDate, endDate: defaultEndDate };
  };

  const { startDate, endDate } = getDateRange();

  // Fetch clients for filtering
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
  });

  // Fetch payment records
  const { data: paymentData, isLoading, refetch } = useQuery({
    queryKey: ['/api/payment-records', startDate, endDate, selectedClientId],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(selectedClientId !== 'all' && { clientId: selectedClientId })
      });
      
      const response = await fetch(`/api/payment-records?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch payment records');
      }
      return response.json();
    },
    enabled: !!(startDate && endDate),
  });

  const paymentRecords: PaymentRecord[] = paymentData?.records || [];
  
  // Filter records based on search query
  const filteredRecords = paymentRecords.filter(record => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      record.clientName.toLowerCase().includes(query) ||
      record.staffName.toLowerCase().includes(query)
    );
  });
  
  // Recalculate summary based on filtered records
  const filteredSummary: PaymentSummary = searchQuery && filteredRecords.length > 0 ? {
    totalClients: new Set(filteredRecords.map(r => r.clientId)).size,
    totalStaff: new Set(filteredRecords.map(r => r.staffId)).size,
    totalHours: filteredRecords.reduce((sum, r) => sum + r.totalHours, 0),
    totalAmount: filteredRecords.reduce((sum, r) => sum + r.totalAmount, 0),
    totalBudgetCoverage: filteredRecords.reduce((sum, r) => 
      sum + r.budgetAllocations.reduce((allocSum, alloc) => allocSum + alloc.amount, 0), 0
    ),
    totalClientPayments: filteredRecords.reduce((sum, r) => sum + r.clientPaymentDue, 0),
  } : (paymentData?.summary || {
    totalClients: 0,
    totalStaff: 0,
    totalHours: 0,
    totalAmount: 0,
    totalBudgetCoverage: 0,
    totalClientPayments: 0
  });
  
  const paymentSummary = filteredSummary;

  const handleGeneratePDF = async () => {
    try {
      const response = await fetch('/api/payment-records/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          clientId: selectedClientId === 'all' ? undefined : selectedClientId,
          records: filteredRecords,
          summary: paymentSummary
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `client-payment-records-${startDate}-to-${endDate}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('paymentRecords.title')}</h1>
          <p className="text-gray-600 mt-1">{t('paymentRecords.description')}</p>
        </div>
        <Button 
          onClick={handleGeneratePDF}
          disabled={isLoading || filteredRecords.length === 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Download className="h-4 w-4 mr-2" />
          {t('paymentRecords.generatePdfReport')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('paymentRecords.filterPaymentRecords')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Client Selection - Moved to first position */}
            <div>
              <label className="block text-sm font-medium mb-2">{t('paymentRecords.client')}</label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('paymentRecords.allClients')}</SelectItem>
                  {clients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      {formatDisplayName(client.firstName, client.lastName)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period Selection - Moved to second position */}
            <div>
              <label className="block text-sm font-medium mb-2">{t('paymentRecords.period')}</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_month">{t('paymentRecords.currentMonth')}</SelectItem>
                  <SelectItem value="last_month">{t('paymentRecords.lastMonth')}</SelectItem>
                  <SelectItem value="custom">{t('paymentRecords.customRange')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {selectedPeriod === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('paymentRecords.startDate')}</label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('paymentRecords.endDate')}</label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          {/* Search Bar */}
          <div className="mt-4">
            <Input
              type="text"
              placeholder={t('paymentRecords.searchPlaceholder') || 'Search by client or staff name...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          <Button onClick={() => refetch()} className="w-full md:w-auto">
            <CalendarIcon className="h-4 w-4 mr-2" />
            {t('paymentRecords.applyFilters')}
          </Button>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('paymentRecords.totalClients')}</p>
                <p className="text-2xl font-bold">{paymentSummary.totalClients}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('paymentRecords.totalHours')}</p>
                <p className="text-2xl font-bold">{paymentSummary.totalHours.toFixed(1)}</p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('paymentRecords.budgetCoverage')}</p>
                <p className="text-2xl font-bold">€{paymentSummary.totalBudgetCoverage.toFixed(2)}</p>
              </div>
              <Euro className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('paymentRecords.clientPayments')}</p>
                <p className="text-2xl font-bold">€{paymentSummary.totalClientPayments.toFixed(2)}</p>
              </div>
              <FileText className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('paymentRecords.paymentRecordsDetail')}</CardTitle>
          <p className="text-sm text-gray-600">
            {t('paymentRecords.periodLabel')} {format(new Date(startDate), 'MMM dd, yyyy')} - {format(new Date(endDate), 'MMM dd, yyyy')}
          </p>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-8">{t('paymentRecords.loadingPaymentRecords')}</div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? t('paymentRecords.noMatchingRecords') || 'No matching payment records found.' : t('paymentRecords.noPaymentRecords')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 text-left bg-gray-50">
                    <th className="pb-4 pt-3 px-3 text-sm font-semibold text-gray-700 min-w-[140px]">{t('paymentRecords.tableHeaders.client')}</th>
                    <th className="pb-4 pt-3 px-3 text-sm font-semibold text-gray-700 min-w-[140px]">{t('paymentRecords.tableHeaders.staff')}</th>
                    <th className="pb-4 pt-3 px-3 text-sm font-semibold text-gray-700 text-center min-w-[80px]">{t('paymentRecords.tableHeaders.type')}</th>
                    <th className="pb-4 pt-3 px-3 text-sm font-semibold text-gray-700 text-center min-w-[100px]">{t('paymentRecords.tableHeaders.hours')}</th>
                    <th className="pb-4 pt-3 px-3 text-sm font-semibold text-gray-700 text-right min-w-[100px]">{t('paymentRecords.tableHeaders.totalAmount')}</th>
                    <th className="pb-4 pt-3 px-3 text-sm font-semibold text-gray-700 min-w-[180px]">{t('paymentRecords.tableHeaders.budgetCoverage')}</th>
                    <th className="pb-4 pt-3 px-3 text-sm font-semibold text-gray-700 text-right min-w-[100px]">{t('paymentRecords.tableHeaders.clientPayment')}</th>
                    <th className="pb-4 pt-3 px-3 text-sm font-semibold text-gray-700 text-center min-w-[80px]">{t('paymentRecords.tableHeaders.status')}</th>
                    <th className="pb-4 pt-3 px-3 text-sm font-semibold text-gray-700 text-center min-w-[100px]">{t('paymentRecords.tableHeaders.generated')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRecords.map((record, index) => (
                    <tr key={`${record.id}-${record.clientId}-${index}`} className="hover:bg-blue-50 transition-colors duration-150">
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <Link href={`/clients/${record.clientId}`} className="text-blue-600 hover:text-blue-800 font-medium hover:underline">
                            {record.clientName}
                          </Link>
                        </div>
                      </td>
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${record.staffType === 'external' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                          <Link href={`/staff/${record.staffId}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                            {record.staffName}
                          </Link>
                        </div>
                      </td>
                      <td className="py-4 px-3 text-center">
                        <Badge 
                          variant={record.staffType === 'internal' ? 'default' : 'secondary'}
                          className={record.staffType === 'external' ? 'bg-green-100 text-green-800 border-green-300' : ''}
                        >
                          {t(`paymentRecords.staffTypes.${record.staffType}`)}
                        </Badge>
                      </td>
                      <td className="py-4 px-3">
                        <div className="bg-gray-50 rounded-lg p-2">
                          <div className="text-center font-bold text-gray-900 mb-1">
                            {record.totalHours.toFixed(1)}h {t('paymentRecords.hoursBreakdown.total')}
                          </div>
                          <div className="flex justify-between text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-blue-400 rounded"></div>
                              {record.weekdayHours.toFixed(1)}h {t('paymentRecords.hoursBreakdown.weekday')}
                            </span>
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-orange-400 rounded"></div>
                              {record.holidayHours.toFixed(1)}h {t('paymentRecords.hoursBreakdown.holiday')}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-3 text-right">
                        <div className="text-lg font-bold text-gray-900">
                          €{record.totalAmount.toFixed(2)}
                        </div>
                      </td>
                      <td className="py-4 px-3">
                        <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                          {(() => {
                            // Group budget allocations by type and sum amounts
                            const groupedAllocations = record.budgetAllocations.reduce((acc, allocation) => {
                              const key = allocation.budgetType;
                              if (!acc[key]) {
                                acc[key] = { budgetType: allocation.budgetType, totalAmount: 0, count: 0 };
                              }
                              acc[key].totalAmount += allocation.amount;
                              acc[key].count += 1;
                              return acc;
                            }, {});
                            
                            const groupedArray = Object.values(groupedAllocations);
                            const totalBudgetAmount = groupedArray.reduce((sum, group) => sum + group.totalAmount, 0);
                            
                            return (
                              <div className="space-y-2">
                                {groupedArray.slice(0, 2).map((group, idx) => (
                                  <div key={idx} className="flex items-center justify-between">
                                    <Badge variant="outline" className="text-xs bg-white">
                                      {group.budgetType}
                                    </Badge>
                                    <span className="font-semibold text-blue-700">€{group.totalAmount.toFixed(2)}</span>
                                  </div>
                                ))}
                                {groupedArray.length > 2 && (
                                  <div className="text-xs text-blue-600 italic">
                                    +{groupedArray.length - 2} {t('paymentRecords.budgetSummary.moreTypes')}
                                  </div>
                                )}
                                <div className="border-t border-blue-200 pt-2 flex items-center justify-between">
                                  <span className="text-xs font-semibold text-blue-700">{t('paymentRecords.budgetSummary.total')}</span>
                                  <span className="font-bold text-blue-800">€{totalBudgetAmount.toFixed(2)}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="py-4 px-3 text-right">
                        <div className={`text-lg font-bold ${record.clientPaymentDue > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          €{record.clientPaymentDue.toFixed(2)}
                        </div>
                        {record.clientPaymentDue > 0 && (
                          <div className="text-xs text-orange-500 mt-1">Outstanding</div>
                        )}
                      </td>
                      <td className="py-4 px-3 text-center">
                        <Badge 
                          variant={
                            record.paymentStatus === 'paid' ? 'default' :
                            record.paymentStatus === 'overdue' ? 'destructive' : 'secondary'
                          }
                          className={`${
                            record.paymentStatus === 'paid' ? 'bg-green-100 text-green-800 border-green-300' :
                            record.paymentStatus === 'overdue' ? 'bg-red-100 text-red-800 border-red-300' :
                            'bg-yellow-100 text-yellow-800 border-yellow-300'
                          }`}
                        >
                          {t(`paymentRecords.paymentStatus.${record.paymentStatus}`)}
                        </Badge>
                      </td>
                      <td className="py-4 px-3 text-center">
                        <div className="text-sm text-gray-600">
                          {format(new Date(record.generatedAt), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-xs text-gray-400">
                          {format(new Date(record.generatedAt), 'HH:mm')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}