import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compensations'] });
      toast({
        title: "Compenso aggiornato",
        description: "Il compenso è stato aggiornato con successo",
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      queryClient.invalidateQueries({ queryKey: ['/api/compensations'] });
      toast({
        title: "Tariffe aggiornate",
        description: "Le tariffe del collaboratore sono state aggiornate",
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
        
        // Force refresh to get updated calculations from database trigger
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/compensations'] });
          queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
        }, 100);
      } else {
        // Update compensation (database trigger will calculate totals automatically)
        await updateCompensationMutation.mutateAsync({
          id: compensationId,
          updates: { [field]: value },
        });
        
        // Force refresh to show updated calculations
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/compensations'] });
        }, 100);
      }
    } finally {
      setLoadingCells(prev => ({ ...prev, [cellKey]: false }));
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const csvData = filteredCompensations.map(comp => ({
      Cognome: comp.staff.lastName,
      Nome: comp.staff.firstName,
      'Data Inizio': format(new Date(comp.periodStart), 'dd/MM/yyyy'),
      'Data Fine': format(new Date(comp.periodEnd), 'dd/MM/yyyy'),
      'Tariffa Feriale €/h': comp.staff.weekdayRate,
      'Ore Feriali': comp.regularHours,
      'Tot. Feriale €': comp.weekdayTotal,
      'Tariffa Festiva €/h': comp.staff.holidayRate,
      'Ore Festive': comp.holidayHours,
      'Tot. Festivo €': comp.holidayTotal,
      'Tariffa Km €/km': comp.staff.mileageRate,
      'Km Percorsi': comp.totalMileage,
      'Tot. Km €': comp.mileageTotal,
      'TOTALE €': comp.totalAmount,
    }));

    const ws = XLSX.utils.json_to_sheet(csvData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Compensi");
    XLSX.writeFile(wb, `compensi_collaboratori_${format(periodStart, 'yyyy-MM-dd')}_${format(periodEnd, 'yyyy-MM-dd')}.csv`);
    
    toast({
      title: "Export completato",
      description: "Il file CSV è stato scaricato",
    });
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    
    // Header
    doc.setFontSize(16);
    doc.text('Tabella Compensi Collaboratori', 14, 20);
    doc.setFontSize(10);
    doc.text(`Periodo: ${format(periodStart, 'dd/MM/yyyy')} - ${format(periodEnd, 'dd/MM/yyyy')}`, 14, 28);

    // Table data
    const tableData = filteredCompensations.map(comp => [
      `${comp.staff.lastName}, ${comp.staff.firstName}`,
      format(new Date(comp.periodStart), 'dd/MM/yyyy'),
      format(new Date(comp.periodEnd), 'dd/MM/yyyy'),
      `€${comp.staff.weekdayRate}`,
      comp.regularHours,
      `€${comp.weekdayTotal}`,
      `€${comp.staff.holidayRate}`,
      comp.holidayHours,
      `€${comp.holidayTotal}`,
      `€${comp.staff.mileageRate}`,
      comp.totalMileage,
      `€${comp.mileageTotal}`,
      `€${comp.totalAmount}`,
    ]);

    // Add totals row
    tableData.push([
      'TOTALI',
      '',
      '',
      '',
      totals.regularHours.toFixed(2),
      `€${totals.weekdayTotal.toFixed(2)}`,
      '',
      totals.holidayHours.toFixed(2),
      `€${totals.holidayTotal.toFixed(2)}`,
      '',
      totals.totalMileage.toFixed(2),
      `€${totals.mileageTotal.toFixed(2)}`,
      `€${totals.totalAmount.toFixed(2)}`,
    ]);

    doc.autoTable({
      head: [[
        'Collaboratore',
        'Inizio',
        'Fine',
        'Tariffa Fer.',
        'Ore Fer.',
        'Tot. Fer.',
        'Tariffa Fest.',
        'Ore Fest.',
        'Tot. Fest.',
        'Tariffa Km',
        'Km',
        'Tot. Km',
        'TOTALE',
      ]],
      body: tableData,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`compensi_collaboratori_${format(periodStart, 'yyyy-MM-dd')}_${format(periodEnd, 'yyyy-MM-dd')}.pdf`);
    
    toast({
      title: "Export completato",
      description: "Il file PDF è stato scaricato",
    });
  };

  // Remove automatic initialization to prevent infinite loops
  // Users can manually trigger initialization if needed

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-blue-600">
            Tabella Compensi Collaboratori
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Data Inizio</label>
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
              <label className="text-sm font-medium">Data Fine</label>
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
              <label className="text-sm font-medium">Cerca Collaboratore</label>
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
              Applica Filtri
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Collaboratori</p>
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
                    <p className="text-sm text-gray-600">Ore Totali</p>
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
                    <p className="text-sm text-gray-600">Km Totali</p>
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
                    <p className="text-sm text-gray-600">Totale Compensi</p>
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
              CSV
            </Button>
            <Button onClick={exportToPDF} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
            {allStaff.length > 0 && compensations.length === 0 && !isLoading && (
              <Button onClick={initializeCompensations} className="bg-green-600 hover:bg-green-700">
                <Users className="mr-2 h-4 w-4" />
                Inizializza Compensi
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead rowSpan={2}>Cognome ↑</TableHead>
                  <TableHead rowSpan={2}>Nome ↑↓</TableHead>
                  <TableHead rowSpan={2}>Data Inizio ↓</TableHead>
                  <TableHead rowSpan={2}>Data Fine ↓</TableHead>
                  <TableHead colSpan={3} className="text-center bg-blue-50">
                    Tariffa Feriale
                  </TableHead>
                  <TableHead colSpan={3} className="text-center bg-green-50">
                    Tariffa Festiva
                  </TableHead>
                  <TableHead colSpan={3} className="text-center bg-orange-50">
                    Chilometri
                  </TableHead>
                  <TableHead rowSpan={2} className="text-center bg-purple-50">
                    TOTALE €
                  </TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="bg-blue-50">€/h</TableHead>
                  <TableHead className="bg-blue-50">Ore</TableHead>
                  <TableHead className="bg-blue-50">Tot. €</TableHead>
                  <TableHead className="bg-green-50">€/h</TableHead>
                  <TableHead className="bg-green-50">Ore</TableHead>
                  <TableHead className="bg-green-50">Tot. €</TableHead>
                  <TableHead className="bg-orange-50">€/km</TableHead>
                  <TableHead className="bg-orange-50">Km</TableHead>
                  <TableHead className="bg-orange-50">Tot. €</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                      <p className="mt-2">Caricamento dati...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredCompensations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8">
                      Nessun dato trovato per il periodo selezionato
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
                  <TableCell colSpan={4}>TOTALI</TableCell>
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