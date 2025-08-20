import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CalendarIcon, 
  Download, 
  FileText, 
  Users, 
  Clock, 
  Car, 
  Euro,
  Filter,
  Check,
  X,
  Edit2,
  Loader2
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { Staff, Compensation } from "@shared/schema";
import * as XLSX from 'xlsx';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';

// PDF Styles
const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 10,
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bfbfbf',
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: '#3b82f6',
    color: 'white',
  },
  tableCol: {
    width: '7.69%', // 100% / 13 columns
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bfbfbf',
    padding: 4,
  },
  tableCell: {
    fontSize: 8,
    textAlign: 'center',
  },
  totalRow: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
  },
});

// Editable cell component
function EditableCell({
  value,
  onChange,
  type = "number",
  isLoading = false,
  decimals = 2,
  prefix = "",
  suffix = "",
}: {
  value: string | number;
  onChange: (newValue: string) => void;
  type?: "number" | "text";
  isLoading?: boolean;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());
  const [error, setError] = useState("");

  useEffect(() => {
    setEditValue(value.toString());
  }, [value]);

  const handleSave = () => {
    if (type === "number") {
      const numValue = parseFloat(editValue.replace(',', '.'));
      if (isNaN(numValue) || numValue < 0) {
        setError("Valore non valido");
        return;
      }
      onChange(numValue.toFixed(decimals));
    } else {
      onChange(editValue);
    }
    setIsEditing(false);
    setError("");
  };

  const handleCancel = () => {
    setEditValue(value.toString());
    setIsEditing(false);
    setError("");
  };

  const formatDisplay = (val: string | number) => {
    if (type === "number") {
      const num = parseFloat(val.toString());
      return `${prefix}${num.toFixed(decimals).replace('.', ',')}${suffix}`;
    }
    return `${prefix}${val}${suffix}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-8">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          className="h-8 w-24"
          autoFocus
        />
        <Button size="sm" variant="ghost" onClick={handleSave}>
          <Check className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel}>
          <X className="h-3 w-3" />
        </Button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  }

  return (
    <div
      className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded flex items-center gap-1"
      onClick={() => setIsEditing(true)}
    >
      <span>{formatDisplay(value)}</span>
      <Edit2 className="h-3 w-3 text-gray-400" />
    </div>
  );
}

export default function CompensationTable() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [periodStart, setPeriodStart] = useState<Date>(startOfMonth(new Date()));
  const [periodEnd, setPeriodEnd] = useState<Date>(endOfMonth(new Date()));
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingCells, setLoadingCells] = useState<Record<string, boolean>>({});

  // Fetch compensations
  const { data: compensations = [], isLoading } = useQuery<(Compensation & { staff: Staff })[]>({
    queryKey: ['/api/compensations', periodStart.toISOString(), periodEnd.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      });
      const response = await fetch(`/api/compensations?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
  });

  // Fetch all staff
  const { data: allStaff = [] } = useQuery<Staff[]>({
    queryKey: ['/api/staff'],
  });

  // Update compensation mutation
  const updateCompensationMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await fetch(`/api/compensations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: async () => {
      // Invalidate queries and wait for re-fetch
      await queryClient.invalidateQueries({ queryKey: ['/api/compensations'] });
      toast({
        title: "Compenso aggiornato",
        description: "I totali sono stati ricalcolati automaticamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Errore nell'aggiornamento del compenso",
        variant: "destructive",
      });
    },
  });

  // Update staff rates mutation
  const updateStaffRatesMutation = useMutation({
    mutationFn: async ({ staffId, rates }: { staffId: string; rates: any }) => {
      const response = await fetch(`/api/staff/${staffId}/rates`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rates),
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: async () => {
      // Invalidate queries and wait for re-fetch
      await queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/compensations'] });
      toast({
        title: "Tariffe aggiornate",
        description: "I totali sono stati ricalcolati automaticamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Errore nell'aggiornamento delle tariffe",
        variant: "destructive",
      });
    },
  });

  // Create compensation mutation
  const createCompensationMutation = useMutation({
    mutationFn: async (data: any) => {
      // Convert Date objects to ISO strings for transmission
      const payload = {
        ...data,
        periodStart: data.periodStart instanceof Date ? data.periodStart.toISOString() : data.periodStart,
        periodEnd: data.periodEnd instanceof Date ? data.periodEnd.toISOString() : data.periodEnd,
      };
      
      const response = await fetch('/api/compensations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compensations'] });
    },
  });

  // Initialize compensations for staff without records
  const initializeCompensations = async () => {
    if (!allStaff.length || compensations.length > 0) return;
    
    const existingStaffIds = compensations.map(c => c.staffId);
    const missingStaff = allStaff.filter(s => !existingStaffIds.includes(s.id));
    
    for (const staff of missingStaff) {
      try {
        await createCompensationMutation.mutateAsync({
          staffId: staff.id,
          periodStart: periodStart,
          periodEnd: periodEnd,
          regularHours: "0.00",
          holidayHours: "0.00",
          totalMileage: "0.00",
          weekdayTotal: "0.00",
          holidayTotal: "0.00",
          mileageTotal: "0.00",
          totalAmount: "0.00",
        });
      } catch (error) {
        console.error(`Failed to create compensation for staff ${staff.id}:`, error);
      }
    }
  };

  // Filter compensations by search
  const filteredCompensations = compensations.filter(comp => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      comp.staff.firstName.toLowerCase().includes(searchLower) ||
      comp.staff.lastName.toLowerCase().includes(searchLower)
    );
  });

  // Calculate totals
  const totals = filteredCompensations.reduce((acc, comp) => {
    acc.regularHours += parseFloat(comp.regularHours || '0');
    acc.holidayHours += parseFloat(comp.holidayHours || '0');
    acc.totalMileage += parseFloat(comp.totalMileage || '0');
    acc.weekdayTotal += parseFloat(comp.weekdayTotal || '0');
    acc.holidayTotal += parseFloat(comp.holidayTotal || '0');
    acc.mileageTotal += parseFloat(comp.mileageTotal || '0');
    acc.totalAmount += parseFloat(comp.totalAmount || '0');
    return acc;
  }, {
    regularHours: 0,
    holidayHours: 0,
    totalMileage: 0,
    weekdayTotal: 0,
    holidayTotal: 0,
    mileageTotal: 0,
    totalAmount: 0,
  });

  // Calculate totals based on rates and values
  const calculateTotals = (compensation: any, staff: any) => {
    const regularHours = parseFloat(compensation.regularHours || '0');
    const holidayHours = parseFloat(compensation.holidayHours || '0');
    const totalMileage = parseFloat(compensation.totalMileage || '0');
    
    const weekdayRate = parseFloat(staff.weekdayRate || '0');
    const holidayRate = parseFloat(staff.holidayRate || '0');
    const mileageRate = parseFloat(staff.mileageRate || '0');
    
    const weekdayTotal = regularHours * weekdayRate;
    const holidayTotal = holidayHours * holidayRate;
    const mileageTotal = totalMileage * mileageRate;
    const totalAmount = weekdayTotal + holidayTotal + mileageTotal;
    
    return {
      weekdayTotal: weekdayTotal.toFixed(2),
      holidayTotal: holidayTotal.toFixed(2),
      mileageTotal: mileageTotal.toFixed(2),
      totalAmount: totalAmount.toFixed(2)
    };
  };

  // Handle cell update
  const handleCellUpdate = async (
    compensationId: string,
    staffId: string,
    field: string,
    value: string
  ) => {
    const cellKey = `${compensationId}-${field}`;
    setLoadingCells(prev => ({ ...prev, [cellKey]: true }));

    try {
      if (field === 'weekdayRate' || field === 'holidayRate' || field === 'mileageRate') {
        // Update staff rates
        await updateStaffRatesMutation.mutateAsync({
          staffId,
          rates: { [field]: value },
        });
      } else {
        // Update compensation (database trigger will calculate totals automatically)
        await updateCompensationMutation.mutateAsync({
          id: compensationId,
          updates: { [field]: value },
        });
      }
    } finally {
      setLoadingCells(prev => ({ ...prev, [cellKey]: false }));
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const csvData = filteredCompensations.map(comp => ({
      [t('compensations.table.headers.surname')]: comp.staff.lastName,
      [t('compensations.table.headers.name')]: comp.staff.firstName,
      [t('compensations.table.headers.startDate')]: format(new Date(comp.periodStart), 'dd/MM/yyyy'),
      [t('compensations.table.headers.endDate')]: format(new Date(comp.periodEnd), 'dd/MM/yyyy'),
      [t('compensations.table.headers.weekdayRate') + ' €/h']: comp.staff.weekdayRate,
      [t('compensations.table.headers.weekdayHours')]: comp.regularHours,
      [t('compensations.table.headers.weekdayTotal') + ' €']: comp.weekdayTotal,
      [t('compensations.table.headers.holidayRate') + ' €/h']: comp.staff.holidayRate,
      [t('compensations.table.headers.holidayHours')]: comp.holidayHours,
      [t('compensations.table.headers.holidayTotal') + ' €']: comp.holidayTotal,
      [t('compensations.table.headers.mileageRate')]: comp.staff.mileageRate,
      [t('compensations.table.headers.kilometers')]: comp.totalMileage,
      [t('compensations.table.headers.mileageTotal') + ' €']: comp.mileageTotal,
      [t('compensations.table.headers.total') + ' €']: comp.totalAmount,
    }));

    const ws = XLSX.utils.json_to_sheet(csvData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Compensi");
    XLSX.writeFile(wb, `compensi_collaboratori_${format(periodStart, 'yyyy-MM-dd')}_${format(periodEnd, 'yyyy-MM-dd')}.csv`);
    
    toast({
      title: t('compensations.messages.exportSuccess'),
      description: t('compensations.messages.exportSuccess'),
    });
  };

  // PDF Document Component
  const CompensationTablePDF = () => (
    <Document>
      <Page size="A4" orientation="landscape" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>{t('compensations.table.title')}</Text>
          <Text style={pdfStyles.subtitle}>
            {t('budgets.period')}: {format(periodStart, 'dd/MM/yyyy')} - {format(periodEnd, 'dd/MM/yyyy')}
          </Text>
        </View>

        <View style={pdfStyles.table}>
          {/* Header Row */}
          <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{t('compensations.table.headers.surname')}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{t('compensations.table.headers.startDate')}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{t('compensations.table.headers.endDate')}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{t('compensations.table.headers.weekdayRate')}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{t('compensations.table.headers.weekdayHours')}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{t('compensations.table.headers.weekdayTotal')}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{t('compensations.table.headers.holidayRate')}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{t('compensations.table.headers.holidayHours')}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{t('compensations.table.headers.holidayTotal')}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{t('compensations.table.headers.mileageRate')}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{t('compensations.table.headers.kilometers')}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{t('compensations.table.headers.mileageTotal')}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{t('compensations.table.headers.total')}</Text></View>
          </View>

          {/* Data Rows */}
          {filteredCompensations.map((comp, index) => (
            <View key={comp.id} style={pdfStyles.tableRow}>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableCell}>{comp.staff.lastName}, {comp.staff.firstName}</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableCell}>{format(new Date(comp.periodStart), 'dd/MM/yyyy')}</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableCell}>{format(new Date(comp.periodEnd), 'dd/MM/yyyy')}</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableCell}>€{comp.staff.weekdayRate}</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableCell}>{comp.regularHours}</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableCell}>€{comp.weekdayTotal}</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableCell}>€{comp.staff.holidayRate}</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableCell}>{comp.holidayHours}</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableCell}>€{comp.holidayTotal}</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableCell}>€{comp.staff.mileageRate}</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableCell}>{comp.totalMileage}</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableCell}>€{comp.mileageTotal}</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableCell}>€{comp.totalAmount}</Text>
              </View>
            </View>
          ))}

          {/* Totals Row */}
          <View style={[pdfStyles.tableRow, pdfStyles.totalRow]}>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{t('compensations.table.totals')}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}></Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}></Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}></Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{totals.regularHours.toFixed(2)}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>€{totals.weekdayTotal.toFixed(2)}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}></Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{totals.holidayHours.toFixed(2)}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>€{totals.holidayTotal.toFixed(2)}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}></Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{totals.totalMileage.toFixed(2)}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>€{totals.mileageTotal.toFixed(2)}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>€{totals.totalAmount.toFixed(2)}</Text></View>
          </View>
        </View>
      </Page>
    </Document>
  );

  // Remove automatic initialization to prevent infinite loops
  // Users can manually trigger initialization if needed

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-blue-600">
            {t('compensations.table.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t('compensations.table.startDate')}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !periodStart && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {periodStart ? format(periodStart, "dd/MM/yyyy") : "Seleziona data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={periodStart}
                    onSelect={(date) => date && setPeriodStart(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t('compensations.table.endDate')}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !periodEnd && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {periodEnd ? format(periodEnd, "dd/MM/yyyy") : "Seleziona data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={periodEnd}
                    onSelect={(date) => date && setPeriodEnd(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t('compensations.table.searchCollaborator')}</label>
              <Input
                placeholder="Nome o Cognome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[200px]"
              />
            </div>

            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/compensations'] })}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Filter className="mr-2 h-4 w-4" />
              {t('compensations.table.applyFilters')}
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('compensations.table.collaborators')}</p>
                    <p className="text-2xl font-bold">{filteredCompensations.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('compensations.table.totalHours')}</p>
                    <p className="text-2xl font-bold">
                      {(totals.regularHours + totals.holidayHours).toFixed(2)}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('compensations.table.totalKm')}</p>
                    <p className="text-2xl font-bold">{totals.totalMileage.toFixed(2)}</p>
                  </div>
                  <Car className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t('compensations.table.totalCompensations')}</p>
                    <p className="text-2xl font-bold">€{totals.totalAmount.toFixed(2)}</p>
                  </div>
                  <Euro className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export and Action Buttons */}
          <div className="flex gap-2 mb-4">
            <Button onClick={exportToCSV} variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              {t('compensations.table.exportButtons.csv')}
            </Button>
            <PDFDownloadLink
              document={<CompensationTablePDF />}
              fileName={`compensation_table_${format(periodStart, 'yyyy-MM-dd')}_${format(periodEnd, 'yyyy-MM-dd')}.pdf`}
            >
              {({ blob, url, loading, error }) => (
                <Button variant="outline" disabled={loading}>
                  <Download className="mr-2 h-4 w-4" />
                  {loading ? t('common.loading') : t('compensations.table.exportButtons.pdf')}
                </Button>
              )}
            </PDFDownloadLink>
            {allStaff.length > 0 && compensations.length === 0 && !isLoading && (
              <Button onClick={initializeCompensations} className="bg-green-600 hover:bg-green-700">
                <Users className="mr-2 h-4 w-4" />
                {t('compensations.table.initializeCompensations')}
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead rowSpan={2}>{t('compensations.table.headers.surname')} ↑</TableHead>
                  <TableHead rowSpan={2}>{t('compensations.table.headers.name')} ↑↓</TableHead>
                  <TableHead rowSpan={2}>{t('compensations.table.headers.startDate')} ↓</TableHead>
                  <TableHead rowSpan={2}>{t('compensations.table.headers.endDate')} ↓</TableHead>
                  <TableHead colSpan={3} className="text-center bg-blue-50">
                    {t('compensations.table.headers.weekdayRate')}
                  </TableHead>
                  <TableHead colSpan={3} className="text-center bg-green-50">
                    {t('compensations.table.headers.holidayRate')}
                  </TableHead>
                  <TableHead colSpan={3} className="text-center bg-orange-50">
                    {t('compensations.table.headers.kilometers')}
                  </TableHead>
                  <TableHead rowSpan={2} className="text-center bg-purple-50">
                    {t('compensations.table.headers.total')} €
                  </TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="bg-blue-50">€/h</TableHead>
                  <TableHead className="bg-blue-50">{t('compensations.table.headers.weekdayHours')}</TableHead>
                  <TableHead className="bg-blue-50">{t('compensations.table.headers.weekdayTotal')}</TableHead>
                  <TableHead className="bg-green-50">€/h</TableHead>
                  <TableHead className="bg-green-50">{t('compensations.table.headers.holidayHours')}</TableHead>
                  <TableHead className="bg-green-50">{t('compensations.table.headers.holidayTotal')}</TableHead>
                  <TableHead className="bg-orange-50">{t('compensations.table.headers.mileageRate')}</TableHead>
                  <TableHead className="bg-orange-50">{t('compensations.table.headers.kilometers')}</TableHead>
                  <TableHead className="bg-orange-50">{t('compensations.table.headers.mileageTotal')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                      <p className="mt-2">{t('compensations.table.loading')}</p>
                    </TableCell>
                  </TableRow>
                ) : filteredCompensations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8">
                      {t('compensations.table.noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompensations.map((comp) => (
                    <TableRow key={comp.id}>
                      <TableCell className="font-medium">{comp.staff.lastName}</TableCell>
                      <TableCell>{comp.staff.firstName}</TableCell>
                      <TableCell>{format(new Date(comp.periodStart), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{format(new Date(comp.periodEnd), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="bg-blue-50">
                        <EditableCell
                          value={comp.staff.weekdayRate || '0'}
                          onChange={(value) => handleCellUpdate(comp.id, comp.staffId, 'weekdayRate', value)}
                          isLoading={loadingCells[`${comp.id}-weekdayRate`]}
                          prefix="€"
                        />
                      </TableCell>
                      <TableCell className="bg-blue-50">
                        <EditableCell
                          value={comp.regularHours}
                          onChange={(value) => handleCellUpdate(comp.id, comp.staffId, 'regularHours', value)}
                          isLoading={loadingCells[`${comp.id}-regularHours`]}
                        />
                      </TableCell>
                      <TableCell className="bg-blue-50 font-medium">
                        €{parseFloat(comp.weekdayTotal).toFixed(2).replace('.', ',')}
                      </TableCell>
                      <TableCell className="bg-green-50">
                        <EditableCell
                          value={comp.staff.holidayRate || '0'}
                          onChange={(value) => handleCellUpdate(comp.id, comp.staffId, 'holidayRate', value)}
                          isLoading={loadingCells[`${comp.id}-holidayRate`]}
                          prefix="€"
                        />
                      </TableCell>
                      <TableCell className="bg-green-50">
                        <EditableCell
                          value={comp.holidayHours}
                          onChange={(value) => handleCellUpdate(comp.id, comp.staffId, 'holidayHours', value)}
                          isLoading={loadingCells[`${comp.id}-holidayHours`]}
                        />
                      </TableCell>
                      <TableCell className="bg-green-50 font-medium">
                        €{parseFloat(comp.holidayTotal).toFixed(2).replace('.', ',')}
                      </TableCell>
                      <TableCell className="bg-orange-50">
                        <EditableCell
                          value={comp.staff.mileageRate || '0'}
                          onChange={(value) => handleCellUpdate(comp.id, comp.staffId, 'mileageRate', value)}
                          isLoading={loadingCells[`${comp.id}-mileageRate`]}
                          prefix="€"
                        />
                      </TableCell>
                      <TableCell className="bg-orange-50">
                        <EditableCell
                          value={comp.totalMileage}
                          onChange={(value) => handleCellUpdate(comp.id, comp.staffId, 'totalMileage', value)}
                          isLoading={loadingCells[`${comp.id}-totalMileage`]}
                        />
                      </TableCell>
                      <TableCell className="bg-orange-50 font-medium">
                        €{parseFloat(comp.mileageTotal).toFixed(2).replace('.', ',')}
                      </TableCell>
                      <TableCell className="bg-purple-50 font-bold text-lg">
                        €{parseFloat(comp.totalAmount).toFixed(2).replace('.', ',')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-gray-100 font-bold">
                  <TableCell colSpan={4}>{t('compensations.table.totals')}</TableCell>
                  <TableCell className="bg-blue-100"></TableCell>
                  <TableCell className="bg-blue-100">
                    {totals.regularHours.toFixed(2).replace('.', ',')}
                  </TableCell>
                  <TableCell className="bg-blue-100">
                    €{totals.weekdayTotal.toFixed(2).replace('.', ',')}
                  </TableCell>
                  <TableCell className="bg-green-100"></TableCell>
                  <TableCell className="bg-green-100">
                    {totals.holidayHours.toFixed(2).replace('.', ',')}
                  </TableCell>
                  <TableCell className="bg-green-100">
                    €{totals.holidayTotal.toFixed(2).replace('.', ',')}
                  </TableCell>
                  <TableCell className="bg-orange-100"></TableCell>
                  <TableCell className="bg-orange-100">
                    {totals.totalMileage.toFixed(2).replace('.', ',')}
                  </TableCell>
                  <TableCell className="bg-orange-100">
                    €{totals.mileageTotal.toFixed(2).replace('.', ',')}
                  </TableCell>
                  <TableCell className="bg-purple-100 text-lg">
                    €{totals.totalAmount.toFixed(2).replace('.', ',')}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}