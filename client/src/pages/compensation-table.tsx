import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Download,
  FileSpreadsheet,
  Filter,
  Calendar,
  Euro,
  Users,
  Clock,
  Car,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Check,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CompensationData {
  id: string;
  staffId: string;
  lastName: string;
  firstName: string;
  weekdayRate: number;
  weekdayHours: number;
  weekdayTotal: number;
  holidayRate: number;
  holidayHours: number;
  holidayTotal: number;
  mileage: number;
  mileageRate: number;
  mileageTotal: number;
  total: number;
  periodStart: string;
  periodEnd: string;
}

type SortField = keyof CompensationData;
type SortDirection = 'asc' | 'desc';

// Editable cell component for inline editing
interface EditableCellProps {
  value: number;
  onChange: (value: number) => Promise<void>;
  fieldType: 'rate' | 'hours' | 'km';
  isLoading?: boolean;
}

function EditableCell({ value, onChange, fieldType, isLoading }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());
  const [isSaving, setIsSaving] = useState(false);

  // Update editValue when the value prop changes (after successful update)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value.toString());
    }
  }, [value, isEditing]);

  const handleSave = async () => {
    const numValue = parseFloat(editValue);
    console.log('💾 EDITABLE CELL SAVE:', { fieldType, value, editValue, numValue }); // Debug log
    if (isNaN(numValue) || numValue < 0) {
      setEditValue(value.toString());
      setIsEditing(false);
      return;
    }
    
    setIsSaving(true);
    try {
      console.log('🔥 CALLING ONCHANGE:', { fieldType, numValue }); // Debug log
      await onChange(numValue);
      console.log('✅ ONCHANGE SUCCESS:', { fieldType, numValue }); // Debug log
      setIsEditing(false);
    } catch (error) {
      console.error('❌ ONCHANGE ERROR:', { fieldType, error }); // Debug log
      setEditValue(value.toString());
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value.toString());
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    console.log('📝 EDITABLE CELL IN EDIT MODE:', { fieldType, value, editValue }); // Debug log
    return (
      <div className="flex items-center gap-1" data-testid={`edit-${fieldType}`}>
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyPress}
          onBlur={handleSave}
          className="h-6 text-xs px-1 w-16"
          type="number"
          step="0.01"
          min="0"
          disabled={isSaving}
          autoFocus
          data-testid={`input-${fieldType}`}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSave}
          disabled={isSaving}
          className="h-6 w-6 p-0"
          data-testid={`save-${fieldType}`}
        >
          <Check className="h-3 w-3 text-green-600" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={isSaving}
          className="h-6 w-6 p-0"
          data-testid={`cancel-${fieldType}`}
        >
          <X className="h-3 w-3 text-red-600" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      className="flex items-center justify-between group cursor-pointer hover:bg-muted/50 px-2 py-1 rounded"
      onClick={() => {
        console.log('🖱️ EDITABLE CELL CLICKED:', { fieldType, value }); // Debug log
        setIsEditing(true);
      }}
      data-testid={`cell-${fieldType}-${value}`}
    >
      <span className="text-right flex-1">
        {value.toFixed(2)}
      </span>
      <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-50 ml-1" />
    </div>
  );
}

export default function CompensationTable() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState('2025-08-01');
  const [endDate, setEndDate] = useState('2025-08-31');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('lastName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Fetch compensation data from API
  const { data: compensationData = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/compensation-report', startDate, endDate],
    queryFn: async () => {
      const response = await fetch(`/api/compensation-report?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) throw new Error('Failed to fetch compensation data');
      return response.json();
    }
  });

  // Mutation for updating staff rates
  const updateStaffRateMutation = useMutation({
    mutationFn: async ({ staffId, field, value }: { staffId: string; field: string; value: number }) => {
      console.log('🔧 STAFF RATE UPDATE:', { staffId, field, value }); // Debug log
      const response = await fetch(`/api/staff/${staffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!response.ok) throw new Error('Failed to update staff rate');
      const result = await response.json();
      console.log('✅ STAFF RATE UPDATE SUCCESS:', result); // Debug log
      return result;
    },
    onSuccess: () => {
      console.log('♻️ INVALIDATING COMPENSATION CACHE'); // Debug log
      // Invalidate all compensation report queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['/api/compensation-report'] });
      // Also force refetch to ensure immediate update
      refetch();
      toast({
        title: t('compensation.edit.success', 'Aggiornato con successo'),
        description: t('compensation.edit.rateUpdated', 'Tariffa aggiornata nel database'),
      });
    },
    onError: (error) => {
      toast({
        title: t('compensation.edit.error', 'Errore durante aggiornamento'),
        description: String(error),
        variant: 'destructive',
      });
    },
  });

  // Mutation for updating compensation hours/km
  const updateCompensationMutation = useMutation({
    mutationFn: async ({ compensationId, field, value }: { compensationId: string; field: string; value: number }) => {
      const response = await fetch(`/api/compensation-inline/${compensationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!response.ok) throw new Error('Failed to update compensation data');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compensation-report', startDate, endDate] });
      toast({
        title: t('compensation.edit.success', 'Aggiornato con successo'),
        description: t('compensation.edit.hoursUpdated', 'Ore/Km aggiornati nel database'),
      });
    },
    onError: (error) => {
      toast({
        title: t('compensation.edit.error', 'Errore durante aggiornamento'),
        description: String(error),
        variant: 'destructive',
      });
    },
  });

  // Filter data based on search term
  const filteredData = compensationData.filter((item: CompensationData) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.lastName.toLowerCase().includes(searchLower) ||
      item.firstName.toLowerCase().includes(searchLower)
    );
  });

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (typeof aValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue as string)
        : (bValue as string).localeCompare(aValue);
    }
    
    return sortDirection === 'asc'
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calculate totals
  const totals = sortedData.reduce((acc, item) => ({
    weekdayHours: acc.weekdayHours + item.weekdayHours,
    weekdayTotal: acc.weekdayTotal + item.weekdayTotal,
    holidayHours: acc.holidayHours + item.holidayHours,
    holidayTotal: acc.holidayTotal + item.holidayTotal,
    mileage: acc.mileage + item.mileage,
    mileageTotal: acc.mileageTotal + item.mileageTotal,
    total: acc.total + item.total
  }), {
    weekdayHours: 0,
    weekdayTotal: 0,
    holidayHours: 0,
    holidayTotal: 0,
    mileage: 0,
    mileageTotal: 0,
    total: 0
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />;
  };

  const exportToCSV = () => {
    const headers = [
      'Cognome/Surname',
      'Nome/Name',
      'Data Inizio/Start Date',
      'Data Fine/End Date',
      'Tariffa Feriale/Weekday Rate €/h',
      'Ore Feriali/Weekday Hours',
      'Prodotto Feriale/Weekday Total €',
      'Tariffa Festiva/Holiday Rate €/h',
      'Ore Festive/Holiday Hours',
      'Prodotto Festivo/Holiday Total €',
      'N. Km/Kilometers',
      'Tariffa Km/Km Rate €/km',
      'Prodotto Km/Km Total €',
      'TOTALE/TOTAL €'
    ];

    const rows = sortedData.map(item => [
      item.lastName,
      item.firstName,
      item.periodStart,
      item.periodEnd,
      item.weekdayRate.toFixed(2),
      item.weekdayHours.toFixed(2),
      item.weekdayTotal.toFixed(2),
      item.holidayRate.toFixed(2),
      item.holidayHours.toFixed(2),
      item.holidayTotal.toFixed(2),
      item.mileage.toFixed(2),
      item.mileageRate.toFixed(2),
      item.mileageTotal.toFixed(2),
      item.total.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    // Check if on mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // On mobile, open CSV in new tab
      window.open(url, '_blank');
      
      // Clean up after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);
    } else {
      // On desktop, download directly
      const a = document.createElement('a');
      a.href = url;
      a.download = `compensi_collaboratori_${startDate}_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }

    toast({
      title: t('compensation.export.success'),
      description: t('compensation.export.csvDownloaded')
    });
  };

  const exportToPDF = async () => {
    try {
      // Prepare data for PDF with all required fields
      const pdfData = sortedData.map(item => ({
        lastName: item.lastName,
        firstName: item.firstName,
        weekdayHours: item.weekdayHours,
        holidayHours: item.holidayHours,
        totalMileage: item.mileage,
        totalAmount: item.total
      }));

      const response = await fetch('/api/compensation-report/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          startDate, 
          endDate,
          data: pdfData
        })
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Check if on mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // On mobile, open PDF in new tab
        window.open(url, '_blank');
        
        // Clean up after a delay
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 100);
      } else {
        // On desktop, download directly
        const a = document.createElement('a');
        a.href = url;
        a.download = `compensi_collaboratori_${startDate}_${endDate}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }

      toast({
        title: t('compensation.export.success'),
        description: isMobile 
          ? t('compensation.export.pdfOpened', 'PDF aperto in una nuova scheda') 
          : t('compensation.export.pdfDownloaded')
      });
    } catch (error) {
      toast({
        title: t('compensation.export.error'),
        description: t('compensation.export.pdfError'),
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary">
          {t('compensation.table.title', 'Tabella Compensi Collaboratori')}
        </h1>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button onClick={exportToPDF} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('compensation.filters.title', 'Filtri')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">
                {t('compensation.filters.startDate', 'Data Inizio')}
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endDate">
                {t('compensation.filters.endDate', 'Data Fine')}
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="search">
                {t('compensation.filters.search', 'Cerca Collaboratore')}
              </Label>
              <Input
                id="search"
                type="text"
                placeholder={t('compensation.filters.searchPlaceholder', 'Nome o Cognome...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={() => refetch()} className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                {t('compensation.filters.apply', 'Applica Filtri')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('compensation.stats.totalStaff', 'Collaboratori')}
                </p>
                <p className="text-2xl font-bold">{sortedData.length}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('compensation.stats.totalHours', 'Ore Totali')}
                </p>
                <p className="text-2xl font-bold">
                  {(totals.weekdayHours + totals.holidayHours).toFixed(2)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('compensation.stats.totalKm', 'Km Totali')}
                </p>
                <p className="text-2xl font-bold">{totals.mileage.toFixed(2)}</p>
              </div>
              <Car className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('compensation.stats.totalAmount', 'Totale Compensi')}
                </p>
                <p className="text-2xl font-bold">€{totals.total.toFixed(2)}</p>
              </div>
              <Euro className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/10">
                  <TableHead 
                    className="cursor-pointer hover:bg-primary/20"
                    onClick={() => handleSort('lastName')}
                  >
                    <div className="flex items-center gap-1">
                      {t('compensation.table.surname', 'Cognome')}
                      {getSortIcon('lastName')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-primary/20"
                    onClick={() => handleSort('firstName')}
                  >
                    <div className="flex items-center gap-1">
                      {t('compensation.table.name', 'Nome')}
                      {getSortIcon('firstName')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-primary/20"
                    onClick={() => handleSort('periodStart')}
                  >
                    <div className="flex items-center gap-1">
                      {t('compensation.table.startDate', 'Data Inizio')}
                      {getSortIcon('periodStart')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-primary/20"
                    onClick={() => handleSort('periodEnd')}
                  >
                    <div className="flex items-center gap-1">
                      {t('compensation.table.endDate', 'Data Fine')}
                      {getSortIcon('periodEnd')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-primary/20 text-right"
                    onClick={() => handleSort('weekdayRate')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t('compensation.table.weekdayRate', 'Tariffa Feriale €/h')}
                      {getSortIcon('weekdayRate')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-primary/20 text-right"
                    onClick={() => handleSort('weekdayHours')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t('compensation.table.weekdayHours', 'Ore Feriali')}
                      {getSortIcon('weekdayHours')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-primary/20 text-right"
                    onClick={() => handleSort('weekdayTotal')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t('compensation.table.weekdayTotal', 'Tot. Feriale €')}
                      {getSortIcon('weekdayTotal')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-primary/20 text-right"
                    onClick={() => handleSort('holidayRate')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t('compensation.table.holidayRate', 'Tariffa Festiva €/h')}
                      {getSortIcon('holidayRate')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-primary/20 text-right"
                    onClick={() => handleSort('holidayHours')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t('compensation.table.holidayHours', 'Ore Festive')}
                      {getSortIcon('holidayHours')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-primary/20 text-right"
                    onClick={() => handleSort('holidayTotal')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t('compensation.table.holidayTotal', 'Tot. Festivo €')}
                      {getSortIcon('holidayTotal')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-primary/20 text-right"
                    onClick={() => handleSort('mileage')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t('compensation.table.km', 'Km')}
                      {getSortIcon('mileage')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-primary/20 text-right"
                    onClick={() => handleSort('mileageRate')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t('compensation.table.kmRate', 'Tariffa Km €/km')}
                      {getSortIcon('mileageRate')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-primary/20 text-right"
                    onClick={() => handleSort('mileageTotal')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t('compensation.table.kmTotal', 'Tot. Km €')}
                      {getSortIcon('mileageTotal')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-primary/20 text-right"
                    onClick={() => handleSort('total')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t('compensation.table.total', 'TOTALE €')}
                      {getSortIcon('total')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8">
                      {t('compensation.loading', 'Caricamento dati...')}
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8">
                      {t('compensation.noData', 'Nessun dato trovato per il periodo selezionato')}
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {paginatedData.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{item.lastName}</TableCell>
                        <TableCell>{item.firstName}</TableCell>
                        <TableCell>{format(new Date(item.periodStart), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{format(new Date(item.periodEnd), 'dd/MM/yyyy')}</TableCell>
                        
                        {/* Editable Weekday Rate */}
                        <TableCell className="text-right">
                          <EditableCell
                            value={item.weekdayRate}
                            onChange={async (value) => {
                              console.log('🎯 WEEKDAY RATE CHANGE TRIGGERED:', { staffId: item.staffId, value }); // Debug log
                              await updateStaffRateMutation.mutateAsync({
                                staffId: item.staffId,
                                field: 'weekdayRate',
                                value
                              });
                            }}
                            fieldType="rate"
                            isLoading={updateStaffRateMutation.isPending}
                          />
                        </TableCell>
                        
                        {/* Editable Weekday Hours */}
                        <TableCell className="text-right">
                          <EditableCell
                            value={item.weekdayHours}
                            onChange={async (value) => {
                              await updateCompensationMutation.mutateAsync({
                                compensationId: item.compensationId,
                                field: 'regularHours',
                                value
                              });
                            }}
                            fieldType="hours"
                            isLoading={updateCompensationMutation.isPending}
                          />
                        </TableCell>
                        
                        {/* Calculated Weekday Total - NOT editable */}
                        <TableCell className="text-right font-semibold bg-muted/20">
                          €{item.weekdayTotal.toFixed(2)}
                        </TableCell>
                        
                        {/* Editable Holiday Rate */}
                        <TableCell className="text-right">
                          <EditableCell
                            value={item.holidayRate}
                            onChange={async (value) => {
                              console.log('🎯 HOLIDAY RATE CHANGE TRIGGERED:', { staffId: item.staffId, value }); // Debug log
                              await updateStaffRateMutation.mutateAsync({
                                staffId: item.staffId,
                                field: 'holidayRate',
                                value
                              });
                            }}
                            fieldType="rate"
                            isLoading={updateStaffRateMutation.isPending}
                          />
                        </TableCell>
                        
                        {/* Editable Holiday Hours */}
                        <TableCell className="text-right">
                          <EditableCell
                            value={item.holidayHours}
                            onChange={async (value) => {
                              await updateCompensationMutation.mutateAsync({
                                compensationId: item.compensationId,
                                field: 'holidayHours',
                                value
                              });
                            }}
                            fieldType="hours"
                            isLoading={updateCompensationMutation.isPending}
                          />
                        </TableCell>
                        
                        {/* Calculated Holiday Total - NOT editable */}
                        <TableCell className="text-right font-semibold bg-muted/20">
                          €{item.holidayTotal.toFixed(2)}
                        </TableCell>
                        
                        {/* Editable Mileage */}
                        <TableCell className="text-right">
                          <EditableCell
                            value={item.mileage}
                            onChange={async (value) => {
                              await updateCompensationMutation.mutateAsync({
                                compensationId: item.compensationId,
                                field: 'totalMileage',
                                value
                              });
                            }}
                            fieldType="km"
                            isLoading={updateCompensationMutation.isPending}
                          />
                        </TableCell>
                        
                        {/* Editable Mileage Rate */}
                        <TableCell className="text-right">
                          <EditableCell
                            value={item.mileageRate}
                            onChange={async (value) => {
                              console.log('🎯 MILEAGE RATE CHANGE TRIGGERED:', { staffId: item.staffId, value }); // Debug log
                              await updateStaffRateMutation.mutateAsync({
                                staffId: item.staffId,
                                field: 'mileageRate',
                                value
                              });
                            }}
                            fieldType="rate"
                            isLoading={updateStaffRateMutation.isPending}
                          />
                        </TableCell>
                        
                        {/* Calculated Mileage Total - NOT editable */}
                        <TableCell className="text-right font-semibold bg-muted/20">
                          €{item.mileageTotal.toFixed(2)}
                        </TableCell>
                        
                        {/* Calculated TOTAL - NOT editable */}
                        <TableCell className="text-right font-bold text-primary bg-primary/10">
                          €{item.total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-primary/10 font-bold">
                      <TableCell colSpan={4} className="text-right">
                        {t('compensation.table.totals', 'TOTALI')}:
                      </TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">{totals.weekdayHours.toFixed(2)}</TableCell>
                      <TableCell className="text-right">€{totals.weekdayTotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">{totals.holidayHours.toFixed(2)}</TableCell>
                      <TableCell className="text-right">€{totals.holidayTotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{totals.mileage.toFixed(2)}</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">€{totals.mileageTotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-primary">
                        €{totals.total.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                {t('compensation.pagination.showing', 'Mostrando')} {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, sortedData.length)} {t('compensation.pagination.of', 'di')} {sortedData.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {t('compensation.pagination.page', 'Pagina')} {currentPage} {t('compensation.pagination.of', 'di')} {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}