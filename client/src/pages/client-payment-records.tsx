import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, FileText, Clock, DollarSign, Users, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
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
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('all');
  // Remove staff type filter since it's not available in the database
  // const [selectedStaffType, setSelectedStaffType] = useState('all');

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
  const paymentSummary: PaymentSummary = paymentData?.summary || {
    totalClients: 0,
    totalStaff: 0,
    totalHours: 0,
    totalAmount: 0,
    totalBudgetCoverage: 0,
    totalClientPayments: 0
  };

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
          records: paymentRecords,
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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Client Payment Records</h1>
          <p className="text-gray-600 mt-1">Track and manage client payment records with detailed breakdowns</p>
        </div>
        <Button 
          onClick={handleGeneratePDF}
          disabled={isLoading || paymentRecords.length === 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Generate PDF Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Payment Records
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Period Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Period</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_month">Current Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {selectedPeriod === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Start Date</label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">End Date</label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Client Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Client</label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Removed Staff Type Filter - not available in current schema */}
          </div>

          <Button onClick={() => refetch()} className="w-full md:w-auto">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Apply Filters
          </Button>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
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
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
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
                <p className="text-sm font-medium text-gray-600">Budget Coverage</p>
                <p className="text-2xl font-bold">€{paymentSummary.totalBudgetCoverage.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Client Payments</p>
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
          <CardTitle>Payment Records Detail</CardTitle>
          <p className="text-sm text-gray-600">
            Period: {format(new Date(startDate), 'MMM dd, yyyy')} - {format(new Date(endDate), 'MMM dd, yyyy')}
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading payment records...</div>
          ) : paymentRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No payment records found for the selected period and filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 text-sm font-medium text-gray-600">Client</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Staff</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Type</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Hours</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Total Amount</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Budget Coverage</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Client Payment</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Status</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paymentRecords.map((record, index) => (
                    <tr key={`${record.id}-${record.clientId}-${index}`} className="hover:bg-gray-50">
                      <td className="py-4 text-sm">
                        <Link href={`/clients/${record.clientId}`} className="text-blue-600 hover:underline font-medium">
                          {record.clientName}
                        </Link>
                      </td>
                      <td className="py-4 text-sm">
                        <Link href={`/staff/${record.staffId}`} className="text-blue-600 hover:underline">
                          {record.staffName}
                        </Link>
                      </td>
                      <td className="py-4">
                        <Badge variant={record.staffType === 'internal' ? 'default' : 'secondary'}>
                          {record.staffType}
                        </Badge>
                      </td>
                      <td className="py-4 text-sm">
                        <div>
                          <div className="font-medium">{record.totalHours.toFixed(1)}h total</div>
                          <div className="text-xs text-gray-500">
                            {record.weekdayHours.toFixed(1)}h weekday, {record.holidayHours.toFixed(1)}h holiday
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-sm font-medium">
                        €{record.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-4 text-sm">
                        <div className="space-y-1">
                          {record.budgetAllocations.map((allocation, idx) => (
                            <div key={idx} className="text-xs">
                              <Badge variant="outline" className="mr-1">
                                {allocation.budgetType}
                              </Badge>
                              €{allocation.amount.toFixed(2)}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 text-sm font-medium text-orange-600">
                        €{record.clientPaymentDue.toFixed(2)}
                      </td>
                      <td className="py-4">
                        <Badge 
                          variant={
                            record.paymentStatus === 'paid' ? 'default' :
                            record.paymentStatus === 'overdue' ? 'destructive' : 'secondary'
                          }
                        >
                          {record.paymentStatus}
                        </Badge>
                      </td>
                      <td className="py-4 text-sm text-gray-600">
                        {format(new Date(record.generatedAt), 'MMM dd, yyyy')}
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