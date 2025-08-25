import { useState, useEffect, useMemo } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  Loader2,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Maximize
} from "lucide-react";
import { format, startOfMonth, endOfMonth, parse, isValid, getDay } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { Staff, Compensation } from "@shared/schema";
import * as XLSX from 'xlsx';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';

// Italian holidays calculation
interface Holiday {
  date: Date;
  name: string;
}

// Function to calculate Easter date
function calculateEaster(year: number): Date {
  const f = Math.floor;
  const G = year % 19;
  const C = f(year / 100);
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
  const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;
  const L = I - J;
  const month = 3 + f((L + 40) / 44);
  const day = L + 28 - 31 * f(month / 4);
  return new Date(year, month - 1, day);
}

// Function to get Italian holidays for a given year
function getItalianHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = [
    { date: new Date(year, 0, 1), name: "Capodanno" },
    { date: new Date(year, 0, 6), name: "Epifania" },
    { date: new Date(year, 3, 25), name: "Festa della Liberazione" },
    { date: new Date(year, 4, 1), name: "Festa del Lavoro" },
    { date: new Date(year, 4, 15), name: "Festa Patronale Olbia" }, // 15 maggio
    { date: new Date(year, 5, 2), name: "Festa della Repubblica" },
    { date: new Date(year, 7, 15), name: "Ferragosto" },
    { date: new Date(year, 10, 1), name: "Ognissanti" },
    { date: new Date(year, 11, 6), name: "San Nicola - Sassari" }, // 6 dicembre
    { date: new Date(year, 11, 8), name: "Immacolata Concezione" },
    { date: new Date(year, 11, 25), name: "Natale" },
    { date: new Date(year, 11, 26), name: "Santo Stefano" },
  ];

  // Calculate Easter and related holidays
  const easter = calculateEaster(year);
  holidays.push({ date: easter, name: "Pasqua" });
  
  // Easter Monday (Lunedì dell'Angelo)
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  holidays.push({ date: easterMonday, name: "Lunedì dell'Angelo" });

  return holidays;
}

// Function to check if a date is a holiday or Sunday
function isHolidayOrSunday(date: Date): boolean {
  // Check if it's Sunday
  if (getDay(date) === 0) return true;
  
  // Check if it's an Italian holiday
  const year = date.getFullYear();
  const holidays = getItalianHolidays(year);
  
  return holidays.some(holiday => 
    holiday.date.getFullYear() === date.getFullYear() &&
    holiday.date.getMonth() === date.getMonth() &&
    holiday.date.getDate() === date.getDate()
  );
}

interface AccessEntry {
  date: string;
  scheduledStart: string;
  scheduledEnd: string;
  duration: string;
  client: string;
  identifier: string;
  mileage?: string;
}

// Date Input Component with manual input and calendar
interface DateInputProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

function DateInput({ value, onChange, placeholder = "gg/mm/aaaa o ggmmaaaa", className }: DateInputProps) {
  const [inputValue, setInputValue] = useState(value ? format(value, "dd/MM/yyyy") : "");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    if (value) {
      setInputValue(format(value, "dd/MM/yyyy"));
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Try to parse different date formats
    let parsedDate: Date | null = null;
    
    if (newValue.length === 10 && newValue.includes('/')) {
      // DD/MM/YYYY format
      try {
        parsedDate = parse(newValue, "dd/MM/yyyy", new Date());
      } catch {}
    } else if (newValue.length === 8 && /^\d{8}$/.test(newValue)) {
      // DDMMYYYY format (01012025)
      try {
        const day = newValue.substring(0, 2);
        const month = newValue.substring(2, 4);
        const year = newValue.substring(4, 8);
        const formattedDate = `${day}/${month}/${year}`;
        parsedDate = parse(formattedDate, "dd/MM/yyyy", new Date());
        // Update input to show formatted version
        if (isValid(parsedDate)) {
          setInputValue(formattedDate);
        }
      } catch {}
    }

    if (parsedDate && isValid(parsedDate)) {
      onChange(parsedDate);
    } else if (newValue === "") {
      onChange(undefined);
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    onChange(date);
    setIsCalendarOpen(false);
  };

  return (
    <div className="flex">
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={cn("rounded-r-none border-r-0 w-[140px]", className)}
        maxLength={10}
      />
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="rounded-l-none px-3"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleCalendarSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// PDF Styles - Excel Style
const pdfStyles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 8,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 25,
    textAlign: 'center',
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1e40af',
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 5,
    color: '#374151',
  },
  table: {
    display: 'flex',
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 2,
    borderBottomColor: '#374151',
    paddingVertical: 8,
  },
  // Colonne con larghezze ottimizzate per Excel style
  nameCol: {
    width: '15%',
    borderRightWidth: 1,
    borderRightColor: '#374151',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#ffffff',
  },
  dateCol: {
    width: '9%',
    borderRightWidth: 1,
    borderRightColor: '#374151',
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: '#ffffff',
  },
  rateCol: {
    width: '7%',
    borderRightWidth: 1,
    borderRightColor: '#374151',
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: '#ffffff',
  },
  hoursCol: {
    width: '6%',
    borderRightWidth: 1,
    borderRightColor: '#374151',
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: '#ffffff',
  },
  totalCol: {
    width: '8%',
    borderRightWidth: 1,
    borderRightColor: '#374151',
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: '#ffffff',
  },
  // Colonne colorate per sezioni
  weekdaySection: {
    backgroundColor: '#eff6ff', // blue-50
  },
  holidaySection: {
    backgroundColor: '#f0fdf4', // green-50
  },
  kmSection: {
    backgroundColor: '#fff7ed', // orange-50
  },
  grandTotalCol: {
    width: '8%',
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: '#faf5ff', // purple-50
    fontWeight: 'bold',
  },
  // Stili del testo
  headerText: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f2937',
  },
  cellText: {
    fontSize: 7,
    textAlign: 'center',
    color: '#374151',
  },
  nameText: {
    fontSize: 7,
    textAlign: 'left',
    color: '#374151',
    fontWeight: 'bold',
  },
  euroText: {
    fontSize: 7,
    textAlign: 'right',
    color: '#374151',
  },
  totalText: {
    fontSize: 7,
    textAlign: 'right',
    color: '#1f2937',
    fontWeight: 'bold',
  },
  totalRowStyle: {
    backgroundColor: '#f9fafb',
    borderTopWidth: 2,
    borderTopColor: '#374151',
    paddingVertical: 8,
  },
  // Footer per numerazione pagine
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  pageNumber: {
    fontSize: 8,
    color: '#6b7280',
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
  const [editValue, setEditValue] = useState(value?.toString() || "0");
  const [error, setError] = useState("");

  useEffect(() => {
    setEditValue(value?.toString() || "0");
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
  const [periodStart, setPeriodStart] = useState<Date>(new Date(2025, 7, 1)); // August 1, 2025 
  const [periodEnd, setPeriodEnd] = useState<Date>(() => {
    const endDate = new Date(2025, 7, 23); // August 23, 2025
    endDate.setHours(23, 59, 59, 999); // Set to end of day to include entire day
    return endDate;
  }); // August 23, 2025 end of day
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingCells, setLoadingCells] = useState<Record<string, boolean>>({});
  const [staffTypeFilter, setStaffTypeFilter] = useState<'all' | 'internal' | 'external'>('all');
  const [includedStaff, setIncludedStaff] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'lastName' | 'firstName'>('lastName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Access dialog state
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false);
  const [selectedStaffName, setSelectedStaffName] = useState<string>("");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  // Helper function to format date for API without timezone conversion
  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T00:00:00.000Z`;
  };

  // Fetch calculated compensations from time logs
  const { data: compensations = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/compensations/calculate', formatDateForAPI(periodStart), formatDateForAPI(periodEnd), staffTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        periodStart: formatDateForAPI(periodStart),
        periodEnd: formatDateForAPI(periodEnd),
        staffType: staffTypeFilter,
      });
      const response = await fetch(`/api/compensations/calculate?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    refetchOnWindowFocus: false,
    staleTime: 0, // Force fresh data after tariff changes
  });

  // Fetch all staff
  const { data: allStaff = [] } = useQuery<Staff[]>({
    queryKey: ['/api/staff'],
  });

  // Initialize all staff as included when compensations change
  useEffect(() => {
    if (compensations.length > 0) {
      const allStaffIds = new Set(compensations.map(comp => comp.staffId));
      setIncludedStaff(allStaffIds);
    }
  }, [compensations]);

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

  // Function to handle sorting
  const handleSort = (field: 'lastName' | 'firstName') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Checkbox functions
  const handleToggleStaff = (staffId: string) => {
    setIncludedStaff(prev => {
      const newSet = new Set(prev);
      if (newSet.has(staffId)) {
        newSet.delete(staffId);
      } else {
        newSet.add(staffId);
      }
      return newSet;
    });
  };

  const handleToggleAll = () => {
    if (includedStaff.size === filteredCompensations.length) {
      // All are included, exclude all
      setIncludedStaff(new Set());
    } else {
      // Some are excluded, include all
      const allStaffIds = new Set(filteredCompensations.map(comp => comp.staffId));
      setIncludedStaff(allStaffIds);
    }
  };

  // Filter and sort compensations
  const filteredCompensations = compensations
    .filter(comp => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        comp.staff.firstName.toLowerCase().includes(searchLower) ||
        comp.staff.lastName.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      const fieldA = a.staff[sortField].toLowerCase();
      const fieldB = b.staff[sortField].toLowerCase();
      
      if (sortDirection === 'asc') {
        return fieldA.localeCompare(fieldB, 'it');
      } else {
        return fieldB.localeCompare(fieldA, 'it');
      }
    });

  // Calculate totals only for included staff
  const totals = filteredCompensations
    .filter(comp => includedStaff.has(comp.staffId))
    .reduce((acc, comp) => {
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

  // Calculate included collaborators count
  const includedCollaboratorsCount = filteredCompensations.filter(comp => includedStaff.has(comp.staffId)).length;

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

  // Export to Excel with colors
  const exportToExcel = () => {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Prepare data with headers
    const headers = [
      t('compensations.table.headers.surname'),
      t('compensations.table.headers.name'),
      t('compensations.table.headers.startDate'),
      t('compensations.table.headers.endDate'),
      t('compensations.table.headers.weekdayRate') + ' €/h',
      t('compensations.table.headers.weekdayHours'),
      t('compensations.table.headers.weekdayTotal') + ' €',
      t('compensations.table.headers.holidayRate') + ' €/h',
      t('compensations.table.headers.holidayHours'),
      t('compensations.table.headers.holidayTotal') + ' €',
      t('compensations.table.headers.mileageRate'),
      t('compensations.table.headers.kilometers'),
      t('compensations.table.headers.mileageTotal') + ' €',
      t('compensations.table.headers.total') + ' €'
    ];

    const includedCompensations = filteredCompensations.filter(comp => includedStaff.has(comp.staffId));
    
    const data = [
      headers,
      ...includedCompensations.map(comp => [
        comp.staff.lastName,
        comp.staff.firstName,
        format(new Date(comp.periodStart), 'dd/MM/yyyy'),
        format(new Date(comp.periodEnd), 'dd/MM/yyyy'),
        comp.staff.weekdayRate || '0',
        comp.regularHours,
        comp.weekdayTotal,
        comp.staff.holidayRate || '0',
        comp.holidayHours,
        comp.holidayTotal,
        comp.staff.mileageRate || '0',
        comp.totalMileage,
        comp.mileageTotal,
        comp.totalAmount
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    ws['!cols'] = headers.map(() => ({ width: 15 }));
    
    // Remove debug logs for production
    // console.log('Worksheet created:', ws);
    // console.log('Worksheet range:', ws['!ref']);
    
    // Apply styling to specific columns
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    
    for (let R = 0; R <= range.e.r; ++R) {
      for (let C = 0; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellAddress]) continue;
        
        // Initialize cell style
        if (!ws[cellAddress].s) ws[cellAddress].s = {};
        
        // Header row - blue background with white text
        if (R === 0) {
          ws[cellAddress].s = {
            fill: { 
              patternType: "solid",
              fgColor: { rgb: "3B82F6" },
              bgColor: { rgb: "3B82F6" }
            },
            font: { 
              color: { rgb: "FFFFFF" }, 
              bold: true,
              sz: 12
            },
            alignment: { 
              horizontal: "center", 
              vertical: "center",
              wrapText: true
            },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } }
            }
          };
        } else {
          // Data rows - apply colors based on column index
          const baseStyle = {
            border: {
              top: { style: "thin", color: { rgb: "CCCCCC" } },
              bottom: { style: "thin", color: { rgb: "CCCCCC" } },
              left: { style: "thin", color: { rgb: "CCCCCC" } },
              right: { style: "thin", color: { rgb: "CCCCCC" } }
            }
          };
          
          if (C === 6) { // Weekday Total
            ws[cellAddress].s = { 
              ...baseStyle,
              fill: { 
                patternType: "solid",
                fgColor: { rgb: "DBEAFE" },
                bgColor: { rgb: "DBEAFE" }
              }
            };
          } else if (C === 9) { // Holiday Total
            ws[cellAddress].s = { 
              ...baseStyle,
              fill: { 
                patternType: "solid",
                fgColor: { rgb: "DCFCE7" },
                bgColor: { rgb: "DCFCE7" }
              }
            };
          } else if (C === 12) { // Mileage Total
            ws[cellAddress].s = { 
              ...baseStyle,
              fill: { 
                patternType: "solid",
                fgColor: { rgb: "FFF7ED" },
                bgColor: { rgb: "FFF7ED" }
              }
            };
          } else if (C === 13) { // Total
            ws[cellAddress].s = { 
              ...baseStyle,
              fill: { 
                patternType: "solid",
                fgColor: { rgb: "FAF5FF" },
                bgColor: { rgb: "FAF5FF" }
              }
            };
          } else {
            ws[cellAddress].s = baseStyle;
          }
        }
      }
    }
    
    XLSX.utils.book_append_sheet(wb, ws, "Compensi");
    
    // Remove debug logs for production
    // console.log('Workbook created:', wb);
    // console.log('Sample cell styling:', ws['A1']?.s);
    
    XLSX.writeFile(wb, `compensi_collaboratori_${format(periodStart, 'yyyy-MM-dd')}_${format(periodEnd, 'yyyy-MM-dd')}.xlsx`);
    
    toast({
      title: t('compensations.messages.exportSuccess'),
      description: t('compensations.messages.csvDownloaded'),
    });
  };

  // PDF Document Component - Excel Style
  const CompensationTablePDF = () => {
    const includedCompensationsForPDF = filteredCompensations.filter(comp => includedStaff.has(comp.staffId));
    const pdfTotals = includedCompensationsForPDF.reduce((acc, comp) => {
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

    return (
    <Document>
      <Page size="A4" orientation="landscape" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>Tabella Compensi Collaboratori</Text>
          <Text style={pdfStyles.subtitle}>
            Periodo: {format(periodStart, 'dd/MM/yyyy')} - {format(periodEnd, 'dd/MM/yyyy')}
          </Text>
        </View>

        {/* Header principale con gruppi di colonne */}
        <View style={pdfStyles.table}>
          {/* Prima riga header - gruppi */}
          <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
            <View style={[pdfStyles.nameCol]}><Text style={pdfStyles.headerText}>Collaboratore</Text></View>
            <View style={[pdfStyles.dateCol]}><Text style={pdfStyles.headerText}>Data Inizio</Text></View>
            <View style={[pdfStyles.dateCol]}><Text style={pdfStyles.headerText}>Data Fine</Text></View>
            
            {/* Sezione Feriali */}
            <View style={[pdfStyles.rateCol, pdfStyles.weekdaySection]}><Text style={pdfStyles.headerText}>Tariffa &#8364;/h</Text></View>
            <View style={[pdfStyles.hoursCol, pdfStyles.weekdaySection]}><Text style={pdfStyles.headerText}>Ore</Text></View>
            <View style={[pdfStyles.totalCol, pdfStyles.weekdaySection]}><Text style={pdfStyles.headerText}>Totale &#8364;</Text></View>
            
            {/* Sezione Festivi */}
            <View style={[pdfStyles.rateCol, pdfStyles.holidaySection]}><Text style={pdfStyles.headerText}>Tariffa &#8364;/h</Text></View>
            <View style={[pdfStyles.hoursCol, pdfStyles.holidaySection]}><Text style={pdfStyles.headerText}>Ore</Text></View>
            <View style={[pdfStyles.totalCol, pdfStyles.holidaySection]}><Text style={pdfStyles.headerText}>Totale &#8364;</Text></View>
            
            {/* Sezione KM */}
            <View style={[pdfStyles.rateCol, pdfStyles.kmSection]}><Text style={pdfStyles.headerText}>&#8364;/km</Text></View>
            <View style={[pdfStyles.hoursCol, pdfStyles.kmSection]}><Text style={pdfStyles.headerText}>Km</Text></View>
            <View style={[pdfStyles.totalCol, pdfStyles.kmSection]}><Text style={pdfStyles.headerText}>Totale &#8364;</Text></View>
            
            <View style={[pdfStyles.grandTotalCol]}><Text style={pdfStyles.headerText}>TOTALE</Text></View>
          </View>

          {/* Righe dati */}
          {includedCompensationsForPDF.map((comp, index) => (
            <View key={comp.id} style={pdfStyles.tableRow}>
              <View style={pdfStyles.nameCol}>
                <Text style={pdfStyles.nameText}>{comp.staff.lastName}, {comp.staff.firstName}</Text>
              </View>
              <View style={pdfStyles.dateCol}>
                <Text style={pdfStyles.cellText}>{format(new Date(comp.periodStart), 'dd/MM/yyyy')}</Text>
              </View>
              <View style={pdfStyles.dateCol}>
                <Text style={pdfStyles.cellText}>{format(new Date(comp.periodEnd), 'dd/MM/yyyy')}</Text>
              </View>
              
              {/* Sezione Feriali */}
              <View style={[pdfStyles.rateCol, pdfStyles.weekdaySection]}>
                <Text style={pdfStyles.euroText}>&#8364;{comp.staff.weekdayRate}</Text>
              </View>
              <View style={[pdfStyles.hoursCol, pdfStyles.weekdaySection]}>
                <Text style={pdfStyles.cellText}>{comp.regularHours}</Text>
              </View>
              <View style={[pdfStyles.totalCol, pdfStyles.weekdaySection]}>
                <Text style={pdfStyles.euroText}>&#8364;{comp.weekdayTotal}</Text>
              </View>
              
              {/* Sezione Festivi */}
              <View style={[pdfStyles.rateCol, pdfStyles.holidaySection]}>
                <Text style={pdfStyles.euroText}>&#8364;{comp.staff.holidayRate}</Text>
              </View>
              <View style={[pdfStyles.hoursCol, pdfStyles.holidaySection]}>
                <Text style={pdfStyles.cellText}>{comp.holidayHours}</Text>
              </View>
              <View style={[pdfStyles.totalCol, pdfStyles.holidaySection]}>
                <Text style={pdfStyles.euroText}>&#8364;{comp.holidayTotal}</Text>
              </View>
              
              {/* Sezione KM */}
              <View style={[pdfStyles.rateCol, pdfStyles.kmSection]}>
                <Text style={pdfStyles.euroText}>&#8364;{comp.staff.mileageRate}</Text>
              </View>
              <View style={[pdfStyles.hoursCol, pdfStyles.kmSection]}>
                <Text style={pdfStyles.cellText}>{comp.totalMileage}</Text>
              </View>
              <View style={[pdfStyles.totalCol, pdfStyles.kmSection]}>
                <Text style={pdfStyles.euroText}>&#8364;{comp.mileageTotal}</Text>
              </View>
              
              <View style={pdfStyles.grandTotalCol}>
                <Text style={pdfStyles.totalText}>&#8364;{comp.totalAmount}</Text>
              </View>
            </View>
          ))}

          {/* Riga Totali */}
          <View style={[pdfStyles.tableRow, pdfStyles.totalRowStyle]}>
            <View style={pdfStyles.nameCol}>
              <Text style={pdfStyles.totalText}>TOTALI</Text>
            </View>
            <View style={pdfStyles.dateCol}><Text style={pdfStyles.cellText}></Text></View>
            <View style={pdfStyles.dateCol}><Text style={pdfStyles.cellText}></Text></View>
            
            {/* Totali Feriali */}
            <View style={[pdfStyles.rateCol, pdfStyles.weekdaySection]}><Text style={pdfStyles.cellText}></Text></View>
            <View style={[pdfStyles.hoursCol, pdfStyles.weekdaySection]}>
              <Text style={pdfStyles.totalText}>{pdfTotals.regularHours.toFixed(2)}</Text>
            </View>
            <View style={[pdfStyles.totalCol, pdfStyles.weekdaySection]}>
              <Text style={pdfStyles.totalText}>&#8364;{pdfTotals.weekdayTotal.toFixed(2)}</Text>
            </View>
            
            {/* Totali Festivi */}
            <View style={[pdfStyles.rateCol, pdfStyles.holidaySection]}><Text style={pdfStyles.cellText}></Text></View>
            <View style={[pdfStyles.hoursCol, pdfStyles.holidaySection]}>
              <Text style={pdfStyles.totalText}>{pdfTotals.holidayHours.toFixed(2)}</Text>
            </View>
            <View style={[pdfStyles.totalCol, pdfStyles.holidaySection]}>
              <Text style={pdfStyles.totalText}>&#8364;{pdfTotals.holidayTotal.toFixed(2)}</Text>
            </View>
            
            {/* Totali KM */}
            <View style={[pdfStyles.rateCol, pdfStyles.kmSection]}><Text style={pdfStyles.cellText}></Text></View>
            <View style={[pdfStyles.hoursCol, pdfStyles.kmSection]}>
              <Text style={pdfStyles.totalText}>{pdfTotals.totalMileage.toFixed(2)}</Text>
            </View>
            <View style={[pdfStyles.totalCol, pdfStyles.kmSection]}>
              <Text style={pdfStyles.totalText}>&#8364;{pdfTotals.mileageTotal.toFixed(2)}</Text>
            </View>
            
            <View style={pdfStyles.grandTotalCol}>
              <Text style={pdfStyles.totalText}>&#8364;{pdfTotals.totalAmount.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Footer fisso con numerazione pagine */}
        <View style={pdfStyles.footer}>
          <Text style={pdfStyles.pageNumber}>Pagina 1 di 1</Text>
        </View>
      </Page>
    </Document>
    );
  };

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
              <DateInput
                value={periodStart}
                onChange={(date) => date && setPeriodStart(date)}
                placeholder="dd/mm/aaaa o ddmmaaaa"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t('compensations.table.endDate')}</label>
              <DateInput
                value={periodEnd}
                onChange={(date) => date && setPeriodEnd(date)}
                placeholder="dd/mm/aaaa o ddmmaaaa"
              />
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

            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Tipo Appuntamenti:</label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="staffType"
                    value="all"
                    checked={staffTypeFilter === 'all'}
                    onChange={(e) => setStaffTypeFilter(e.target.value as 'all' | 'internal' | 'external')}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="text-sm">Tutti</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="staffType"
                    value="internal"
                    checked={staffTypeFilter === 'internal'}
                    onChange={(e) => setStaffTypeFilter(e.target.value as 'all' | 'internal' | 'external')}
                    className="form-radio h-4 w-4 text-green-600"
                  />
                  <span className="text-sm">Interni</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="staffType"
                    value="external"
                    checked={staffTypeFilter === 'external'}
                    onChange={(e) => setStaffTypeFilter(e.target.value as 'all' | 'internal' | 'external')}
                    className="form-radio h-4 w-4 text-orange-600"
                  />
                  <span className="text-sm">Esterni</span>
                </label>
              </div>
            </div>

            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/compensations/calculate'] })}
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
                    <p className="text-2xl font-bold">
                      {includedCollaboratorsCount}/{filteredCompensations.length}
                    </p>
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
            <Button onClick={exportToExcel} variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Excel
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
                  <TableHead 
                    rowSpan={2} 
                    className="text-center"
                  >
                    <Checkbox
                      checked={includedStaff.size === filteredCompensations.length && filteredCompensations.length > 0}
                      onCheckedChange={handleToggleAll}
                      data-testid="checkbox-master-include"
                    />
                  </TableHead>
                  <TableHead 
                    rowSpan={2} 
                    className="cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('lastName')}
                  >
                    <div className="flex items-center gap-1">
                      {t('compensations.table.headers.surname')}
                      {sortField === 'lastName' ? (
                        sortDirection === 'asc' ? '↑' : '↓'
                      ) : '↕'}
                    </div>
                  </TableHead>
                  <TableHead 
                    rowSpan={2}
                    className="cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('firstName')}
                  >
                    <div className="flex items-center gap-1">
                      {t('compensations.table.headers.name')}
                      {sortField === 'firstName' ? (
                        sortDirection === 'asc' ? '↑' : '↓'
                      ) : '↕'}
                    </div>
                  </TableHead>
                  <TableHead rowSpan={2}>{t('compensations.table.headers.startDate')}</TableHead>
                  <TableHead rowSpan={2}>{t('compensations.table.headers.endDate')}</TableHead>
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
                    <TableCell colSpan={15} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                      <p className="mt-2">{t('compensations.table.loading')}</p>
                    </TableCell>
                  </TableRow>
                ) : filteredCompensations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center py-8">
                      {t('compensations.table.noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompensations.map((comp) => {
                    const isIncluded = includedStaff.has(comp.staffId);
                    return (
                      <TableRow 
                        key={comp.id}
                        className={!isIncluded ? "opacity-50 text-gray-500" : ""}
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isIncluded}
                            onCheckedChange={() => handleToggleStaff(comp.staffId)}
                            data-testid={`checkbox-staff-${comp.staffId}`}
                          />
                        </TableCell>
                        <TableCell 
                          className="font-medium cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          onClick={() => {
                            setSelectedStaffName(`${comp.staff.firstName} ${comp.staff.lastName}`);
                            setSelectedStaffId(comp.staffId);
                            setIsAccessDialogOpen(true);
                          }}
                          title="Clicca per visualizzare gli accessi"
                        >
                        <div className="flex items-center gap-2">
                          {comp.staff.lastName}
                          <Eye className="h-3 w-3 opacity-60" />
                        </div>
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        onClick={() => {
                          setSelectedStaffName(`${comp.staff.firstName} ${comp.staff.lastName}`);
                          setSelectedStaffId(comp.staffId);
                          setIsAccessDialogOpen(true);
                        }}
                        title="Clicca per visualizzare gli accessi"
                      >
                        <div className="flex items-center gap-2">
                          {comp.staff.firstName}
                          <Eye className="h-3 w-3 opacity-60" />
                        </div>
                      </TableCell>
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
                    );
                  })
                )}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-gray-100 font-bold">
                  <TableCell colSpan={5}>{t('compensations.table.totals')}</TableCell>
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
      
      {/* Access Dialog */}
      <AccessDialog 
        isOpen={isAccessDialogOpen}
        onClose={() => setIsAccessDialogOpen(false)}
        staffName={selectedStaffName}
        staffId={selectedStaffId}
        periodStart={periodStart}
        periodEnd={periodEnd}
      />
    </div>
  );
}

// Access Dialog Component
interface AccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  staffName: string;
  staffId: string;
  periodStart: Date;
  periodEnd: Date;
}

// PDF Component for Access Table Export (A4 optimized)
const AccessTablePDF = ({ data, staffName, periodStart, periodEnd, totalHours, totalRecords }: {
  data: AccessEntry[];
  staffName: string;
  periodStart: Date;
  periodEnd: Date;
  totalHours: string;
  totalRecords: number;
}) => (
  <Document>
    <Page size="A4" style={accessPdfStyles.page}>
      <View style={accessPdfStyles.header}>
        <Text style={accessPdfStyles.title}>Tabella Accessi</Text>
        <Text style={accessPdfStyles.subtitle}>{staffName}</Text>
        <Text style={accessPdfStyles.period}>
          Periodo: {format(periodStart, 'dd/MM/yyyy')} - {format(periodEnd, 'dd/MM/yyyy')}
        </Text>
      </View>
      
      <View style={accessPdfStyles.table}>
        <View style={accessPdfStyles.tableHeader}>
          <Text style={accessPdfStyles.headerCell1}>Data</Text>
          <Text style={accessPdfStyles.headerCell2}>Inizio</Text>
          <Text style={accessPdfStyles.headerCell3}>Fine</Text>
          <Text style={accessPdfStyles.headerCell4}>Durata</Text>
          <Text style={accessPdfStyles.headerCell5}>Cliente</Text>
          <Text style={accessPdfStyles.headerCell6}>Km</Text>
        </View>
        
        {data
          // Sort data chronologically from first to last day of the month
          .sort((a, b) => {
            // Parse dates for sorting
            const parseDate = (entry: any): Date => {
              try {
                if (entry.scheduledStart) {
                  const datePart = entry.scheduledStart.split(' ')[0];
                  if (datePart && datePart.includes('/')) {
                    const [day, month, year] = datePart.split('/');
                    return new Date(Number(year), Number(month) - 1, Number(day));
                  }
                }
              } catch (error) {
                // Return far future date for invalid entries (will be sorted last)
                return new Date(9999, 11, 31);
              }
              return new Date(9999, 11, 31);
            };
            
            const dateA = parseDate(a);
            const dateB = parseDate(b);
            return dateA.getTime() - dateB.getTime();
          })
          .map((entry, index) => {
          // Parse date for holiday detection
          let entryDate: Date | null = null;
          let isValidDate = false;
          try {
            if (entry.scheduledStart) {
              const datePart = entry.scheduledStart.split(' ')[0];
              if (datePart && datePart.includes('/')) {
                const [day, month, year] = datePart.split('/');
                entryDate = new Date(Number(year), Number(month) - 1, Number(day));
                isValidDate = entryDate && !isNaN(entryDate.getTime());
              }
            }
          } catch (error) {
            isValidDate = false;
          }
          
          const isRedDay = isValidDate ? isHolidayOrSunday(entryDate!) : false;
          
          return (
            <View key={index} style={isRedDay ? accessPdfStyles.tableRowHoliday : accessPdfStyles.tableRow}>
              <Text style={[accessPdfStyles.cell1, ...(isRedDay ? [{ color: '#dc2626', fontWeight: 'bold' }] : [])]}>
                {isValidDate ? format(entryDate!, 'dd/MM/yyyy') : entry.scheduledStart?.split(' ')[0] || 'N/A'}
              </Text>
              <Text style={[accessPdfStyles.cell2, ...(isRedDay ? [{ color: '#dc2626', fontWeight: 'bold' }] : [])]}>{entry.scheduledStart || 'N/A'}</Text>
              <Text style={[accessPdfStyles.cell3, ...(isRedDay ? [{ color: '#dc2626', fontWeight: 'bold' }] : [])]}>{entry.scheduledEnd || 'N/A'}</Text>
              <Text style={[accessPdfStyles.cell4, ...(isRedDay ? [{ color: '#dc2626', fontWeight: 'bold' }] : [])]}>{entry.duration}</Text>
              <Text style={[accessPdfStyles.cell5, ...(isRedDay ? [{ color: '#dc2626', fontWeight: 'bold' }] : [])]}>{entry.client}</Text>
              <Text style={[accessPdfStyles.cell6, ...(isRedDay ? [{ color: '#dc2626', fontWeight: 'bold' }] : [])]}>{entry.mileage || '0'}</Text>
            </View>
          );
        })}
      </View>
      
      <View style={accessPdfStyles.footer}>
        <View style={accessPdfStyles.totalBox}>
          <Text style={accessPdfStyles.totalHours}>
            TOTALE ORE: {totalHours}h • SERVIZI: {totalRecords}
          </Text>
          <Text style={accessPdfStyles.totalServices}>
            KM TOTALI: {(() => {
              const totalKm = data.reduce((sum, entry) => {
                return sum + (parseFloat(entry.mileage || '0') || 0);
              }, 0);
              return totalKm.toFixed(1);
            })()}km
          </Text>
        </View>
        
        <View style={accessPdfStyles.breakdownBox}>
          <Text style={accessPdfStyles.breakdownTitle}>DETTAGLIO ORE:</Text>
          <View style={accessPdfStyles.breakdownRow}>
            <Text style={accessPdfStyles.weekdayText}>
              Ore Feriali: {(() => {
                const weekdayHours = data.reduce((sum, entry) => {
                  // Parse date for holiday detection
                  let entryDate: Date | null = null;
                  let isValidDate = false;
                  try {
                    if (entry.scheduledStart) {
                      const datePart = entry.scheduledStart.split(' ')[0];
                      if (datePart && datePart.includes('/')) {
                        const [day, month, year] = datePart.split('/');
                        entryDate = new Date(Number(year), Number(month) - 1, Number(day));
                        isValidDate = entryDate && !isNaN(entryDate.getTime());
                      }
                    }
                  } catch (error) {
                    isValidDate = false;
                  }
                  
                  const isRedDay = isValidDate ? isHolidayOrSunday(entryDate!) : false;
                  if (!isRedDay) {
                    const hours = parseFloat(entry.duration) || 0;
                    return sum + hours;
                  }
                  return sum;
                }, 0);
                return weekdayHours.toFixed(2);
              })()}h
            </Text>
            <Text style={accessPdfStyles.holidayText}>
              Ore Festive: {(() => {
                const holidayHours = data.reduce((sum, entry) => {
                  // Parse date for holiday detection
                  let entryDate: Date | null = null;
                  let isValidDate = false;
                  try {
                    if (entry.scheduledStart) {
                      const datePart = entry.scheduledStart.split(' ')[0];
                      if (datePart && datePart.includes('/')) {
                        const [day, month, year] = datePart.split('/');
                        entryDate = new Date(Number(year), Number(month) - 1, Number(day));
                        isValidDate = entryDate && !isNaN(entryDate.getTime());
                      }
                    }
                  } catch (error) {
                    isValidDate = false;
                  }
                  
                  const isRedDay = isValidDate ? isHolidayOrSunday(entryDate!) : false;
                  if (isRedDay) {
                    const hours = parseFloat(entry.duration) || 0;
                    return sum + hours;
                  }
                  return sum;
                }, 0);
                return holidayHours.toFixed(2);
              })()}h
            </Text>
          </View>
        </View>
        
        <Text style={accessPdfStyles.legend}>
          Legenda: Righe ROSSE = Domeniche e Festivita Italiane
        </Text>
      </View>
    </Page>
  </Document>
);

// PDF Styles optimized for A4 Access Table
const accessPdfStyles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 20,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  period: {
    fontSize: 11,
    color: '#666',
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#d1d5db',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 5,
    borderBottomWidth: 0.5,
    borderColor: '#e5e7eb',
  },
  tableRowHoliday: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 5,
    borderBottomWidth: 0.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
  },
  headerCell1: { width: '13%', fontWeight: 'bold', fontSize: 8 },
  headerCell2: { width: '20%', fontWeight: 'bold', fontSize: 8 },
  headerCell3: { width: '20%', fontWeight: 'bold', fontSize: 8 },
  headerCell4: { width: '10%', fontWeight: 'bold', fontSize: 8, textAlign: 'center' },
  headerCell5: { width: '27%', fontWeight: 'bold', fontSize: 8 },
  headerCell6: { width: '10%', fontWeight: 'bold', fontSize: 8, textAlign: 'center' },
  cell1: { width: '13%', fontSize: 8 },
  cell2: { width: '20%', fontSize: 8 },
  cell3: { width: '20%', fontSize: 8 },
  cell4: { width: '10%', fontSize: 8, textAlign: 'center' },
  cell5: { width: '27%', fontSize: 8 },
  cell6: { width: '10%', fontSize: 8, textAlign: 'center' },
  footer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 2,
    borderColor: '#2563eb',
  },
  totalBox: {
    backgroundColor: '#eff6ff',
    padding: 12,
    marginBottom: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  totalHours: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1d4ed8',
    textAlign: 'center',
    marginBottom: 5,
  },
  totalServices: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ea580c',
    textAlign: 'center',
  },
  breakdownBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  breakdownTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 5,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weekdayText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#059669',
  },
  holidayText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  legend: {
    fontSize: 9,
    color: '#dc2626',
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#fef2f2',
    padding: 5,
    borderRadius: 3,
  },
});

function AccessDialog({ isOpen, onClose, staffName, staffId, periodStart, periodEnd }: AccessDialogProps) {
  // Sorting and filtering states
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    date: '',
    startTime: '',
    endTime: '',
    duration: '',
    client: '',
    mileage: '',
    identifier: ''
  });

  // Aggregation states
  const [viewMode, setViewMode] = useState<'detail' | 'aggregated'>('detail');
  const [aggregateBy, setAggregateBy] = useState<'client' | 'date' | 'dayOfWeek'>('client');
  
  const { data: accessResponse, isLoading } = useQuery<{
    data: AccessEntry[];
    totalHours: string;
    totalRecords: number;
  }>({
    queryKey: [`/api/staff/${staffId}/access-logs`, periodStart, periodEnd],
    queryFn: async () => {
      if (!staffId) return { data: [], totalHours: '0.00', totalRecords: 0 };
      
      const response = await fetch(
        `/api/staff/${staffId}/access-logs?startDate=${periodStart.toISOString()}&endDate=${periodEnd.toISOString()}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch access data');
      }
      
      return response.json();
    },
    enabled: isOpen && !!staffId,
  });
  
  const rawAccessData = accessResponse?.data || [];
  const totalHours = accessResponse?.totalHours || '0.00';
  const totalRecords = accessResponse?.totalRecords || 0;

  // Sort and filter functions
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4" /> 
      : <ArrowDown className="h-4 w-4" />;
  };

  const resetFilters = () => {
    setFilters({
      date: '',
      startTime: '',
      endTime: '',
      duration: '',
      client: '',
      mileage: '',
      identifier: ''
    });
  };

  // Apply filtering and sorting with useMemo for performance
  const accessData = useMemo(() => {
    let filtered = rawAccessData.filter(entry => {
      // Date filter
      if (filters.date) {
        const dateStr = entry.scheduledStart?.split(' ')[0] || '';
        if (!dateStr.toLowerCase().includes(filters.date.toLowerCase())) return false;
      }

      // Start time filter
      if (filters.startTime && entry.scheduledStart) {
        if (!entry.scheduledStart.toLowerCase().includes(filters.startTime.toLowerCase())) return false;
      }

      // End time filter
      if (filters.endTime && entry.scheduledEnd) {
        if (!entry.scheduledEnd.toLowerCase().includes(filters.endTime.toLowerCase())) return false;
      }

      // Duration filter
      if (filters.duration && entry.duration) {
        if (!entry.duration.toLowerCase().includes(filters.duration.toLowerCase())) return false;
      }

      // Client filter
      if (filters.client && entry.client) {
        if (!entry.client.toLowerCase().includes(filters.client.toLowerCase())) return false;
      }

      // Mileage filter
      if (filters.mileage && entry.mileage) {
        if (!entry.mileage.toLowerCase().includes(filters.mileage.toLowerCase())) return false;
      }

      // Identifier filter
      if (filters.identifier && entry.identifier) {
        if (!entry.identifier.toLowerCase().includes(filters.identifier.toLowerCase())) return false;
      }

      return true;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'date':
          const parseDate = (entry: any): Date => {
            try {
              if (entry.scheduledStart) {
                const datePart = entry.scheduledStart.split(' ')[0];
                if (datePart && datePart.includes('/')) {
                  const [day, month, year] = datePart.split('/');
                  return new Date(Number(year), Number(month) - 1, Number(day));
                }
              }
            } catch (error) {
              return new Date(0);
            }
            return new Date(0);
          };
          aValue = parseDate(a);
          bValue = parseDate(b);
          break;
        case 'startTime':
          aValue = a.scheduledStart || '';
          bValue = b.scheduledStart || '';
          break;
        case 'endTime':
          aValue = a.scheduledEnd || '';
          bValue = b.scheduledEnd || '';
          break;
        case 'duration':
          aValue = parseFloat(a.duration || '0');
          bValue = parseFloat(b.duration || '0');
          break;
        case 'client':
          aValue = (a.client || '').toLowerCase();
          bValue = (b.client || '').toLowerCase();
          break;
        case 'mileage':
          aValue = parseFloat(a.mileage || '0');
          bValue = parseFloat(b.mileage || '0');
          break;
        case 'identifier':
          aValue = (a.identifier || '').toLowerCase();
          bValue = (b.identifier || '').toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [rawAccessData, filters, sortField, sortDirection]);

  // Aggregated data calculation
  const aggregatedData = useMemo(() => {
    if (viewMode !== 'aggregated') return [];

    const grouped = accessData.reduce((acc, entry) => {
      let groupKey = '';

      switch (aggregateBy) {
        case 'client':
          groupKey = entry.client || 'N/A';
          break;
        case 'date':
          groupKey = entry.scheduledStart?.split(' ')[0] || 'N/A';
          break;
        case 'dayOfWeek':
          try {
            const datePart = entry.scheduledStart?.split(' ')[0];
            if (datePart && datePart.includes('/')) {
              const [day, month, year] = datePart.split('/');
              const date = new Date(Number(year), Number(month) - 1, Number(day));
              const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
              groupKey = dayNames[date.getDay()] || 'N/A';
            } else {
              groupKey = 'N/A';
            }
          } catch {
            groupKey = 'N/A';
          }
          break;
        default:
          groupKey = 'N/A';
      }

      if (!acc[groupKey]) {
        acc[groupKey] = {
          groupKey,
          totalHours: 0,
          totalMileage: 0,
          recordCount: 0,
          weekdayHours: 0,
          holidayHours: 0,
          entries: []
        };
      }

      const duration = parseFloat(entry.duration || '0');
      const mileage = parseFloat(entry.mileage || '0');

      // Check if it's a holiday/Sunday
      let isRedDay = false;
      try {
        if (entry.scheduledStart) {
          const datePart = entry.scheduledStart.split(' ')[0];
          if (datePart && datePart.includes('/')) {
            const [day, month, year] = datePart.split('/');
            const entryDate = new Date(Number(year), Number(month) - 1, Number(day));
            isRedDay = isHolidayOrSunday(entryDate);
          }
        }
      } catch (error) {
        isRedDay = false;
      }

      acc[groupKey].totalHours += duration;
      acc[groupKey].totalMileage += mileage;
      acc[groupKey].recordCount++;
      acc[groupKey].entries.push(entry);

      if (isRedDay) {
        acc[groupKey].holidayHours += duration;
      } else {
        acc[groupKey].weekdayHours += duration;
      }

      return acc;
    }, {} as Record<string, {
      groupKey: string;
      totalHours: number;
      totalMileage: number;
      recordCount: number;
      weekdayHours: number;
      holidayHours: number;
      entries: any[];
    }>);

    return Object.values(grouped).sort((a, b) => {
      switch (aggregateBy) {
        case 'client':
          return a.groupKey.localeCompare(b.groupKey);
        case 'date':
          try {
            const parseDate = (dateStr: string): Date => {
              if (dateStr.includes('/')) {
                const [day, month, year] = dateStr.split('/');
                return new Date(Number(year), Number(month) - 1, Number(day));
              }
              return new Date(0);
            };
            return parseDate(a.groupKey).getTime() - parseDate(b.groupKey).getTime();
          } catch {
            return a.groupKey.localeCompare(b.groupKey);
          }
        case 'dayOfWeek':
          const dayOrder = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
          return dayOrder.indexOf(a.groupKey) - dayOrder.indexOf(b.groupKey);
        default:
          return 0;
      }
    });
  }, [accessData, viewMode, aggregateBy]);

  // Excel Export Function
  const exportToExcel = () => {
    if (accessData.length === 0) {
      return;
    }

    const excelData = [
      ['Tabella Accessi - ' + staffName],
      ['Periodo: ' + format(periodStart, 'dd/MM/yyyy') + ' - ' + format(periodEnd, 'dd/MM/yyyy')],
      [], // Empty row
      ['Data', 'Data Inizio Programmata', 'Data Fine Programmata', 'Durata', 'Cliente', 'Km', 'ID', 'Tipo Giorno'],
      ...accessData
        // Sort chronologically from first to last day of the month
        .sort((a, b) => {
          // Parse dates for sorting
          const parseDate = (entry: any): Date => {
            try {
              if (entry.scheduledStart) {
                const datePart = entry.scheduledStart.split(' ')[0];
                if (datePart && datePart.includes('/')) {
                  const [day, month, year] = datePart.split('/');
                  return new Date(Number(year), Number(month) - 1, Number(day));
                }
              }
            } catch (error) {
              return new Date(9999, 11, 31); // Invalid entries sorted last
            }
            return new Date(9999, 11, 31);
          };
          
          const dateA = parseDate(a);
          const dateB = parseDate(b);
          return dateA.getTime() - dateB.getTime();
        })
        .map(entry => {
        // Parse date for holiday detection  
        let entryDate: Date | null = null;
        let isValidDate = false;
        try {
          if (entry.scheduledStart) {
            const datePart = entry.scheduledStart.split(' ')[0];
            if (datePart && datePart.includes('/')) {
              const [day, month, year] = datePart.split('/');
              entryDate = new Date(Number(year), Number(month) - 1, Number(day));
              isValidDate = entryDate && !isNaN(entryDate.getTime());
            }
          }
        } catch (error) {
          isValidDate = false;
        }
        
        const isRedDay = isValidDate ? isHolidayOrSunday(entryDate!) : false;
        
        return [
          isValidDate ? format(entryDate!, 'dd/MM/yyyy') : entry.scheduledStart?.split(' ')[0] || 'N/A',
          entry.scheduledStart || 'N/A',
          entry.scheduledEnd || 'N/A',
          entry.duration,
          entry.client,
          entry.mileage || '0',
          entry.identifier,
          isRedDay ? 'Festivo/Domenica' : 'Feriale'
        ];
      }),
      [], // Empty row
      ['TOTALI:', totalHours + 'h', '', '', '', (() => {
        const totalKm = accessData.reduce((sum, entry) => {
          return sum + (parseFloat(entry.mileage) || 0);
        }, 0);
        return totalKm.toFixed(1);
      })() + 'km', totalRecords + ' accessi', ''],
      [], // Empty row
      ['Ore Feriali:', (() => {
        const weekdayHours = accessData.reduce((sum, entry) => {
          // Parse date for holiday detection
          let entryDate: Date | null = null;
          let isValidDate = false;
          try {
            if (entry.scheduledStart) {
              const datePart = entry.scheduledStart.split(' ')[0];
              if (datePart && datePart.includes('/')) {
                const [day, month, year] = datePart.split('/');
                entryDate = new Date(Number(year), Number(month) - 1, Number(day));
                isValidDate = entryDate && !isNaN(entryDate.getTime());
              }
            }
          } catch (error) {
            isValidDate = false;
          }
          
          const isRedDay = isValidDate ? isHolidayOrSunday(entryDate!) : false;
          if (!isRedDay) {
            const hours = parseFloat(entry.duration) || 0;
            return sum + hours;
          }
          return sum;
        }, 0);
        return weekdayHours.toFixed(2);
      })() + 'h', 'Ore Festive:', (() => {
        const holidayHours = accessData.reduce((sum, entry) => {
          // Parse date for holiday detection
          let entryDate: Date | null = null;
          let isValidDate = false;
          try {
            if (entry.scheduledStart) {
              const datePart = entry.scheduledStart.split(' ')[0];
              if (datePart && datePart.includes('/')) {
                const [day, month, year] = datePart.split('/');
                entryDate = new Date(Number(year), Number(month) - 1, Number(day));
                isValidDate = entryDate && !isNaN(entryDate.getTime());
              }
            }
          } catch (error) {
            isValidDate = false;
          }
          
          const isRedDay = isValidDate ? isHolidayOrSunday(entryDate!) : false;
          if (isRedDay) {
            const hours = parseFloat(entry.duration) || 0;
            return sum + hours;
          }
          return sum;
        }, 0);
        return holidayHours.toFixed(2);
      })() + 'h', '', '', '']
    ];

    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // Data
      { wch: 18 }, // Data Inizio Programmata
      { wch: 18 }, // Data Fine Programmata
      { wch: 8 },  // Durata
      { wch: 22 }, // Cliente
      { wch: 6 },  // Km
      { wch: 8 },  // ID
      { wch: 16 }  // Tipo Giorno
    ];

    // Style header
    ws['A1'].s = { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } };
    ws['A2'].s = { font: { bold: true }, alignment: { horizontal: 'center' } };
    
    // Style table headers
    ['A4', 'B4', 'C4', 'D4', 'E4', 'F4', 'G4', 'H4'].forEach(cell => {
      if (ws[cell]) {
        ws[cell].s = { font: { bold: true }, fill: { fgColor: { rgb: 'F3F4F6' } } };
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tabella Accessi');
    
    const fileName = `Tabella_Accessi_${staffName.replace(/[^a-zA-Z0-9]/g, '_')}_${format(periodStart, 'dd-MM-yyyy')}_${format(periodEnd, 'dd-MM-yyyy')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="min-w-[800px] max-w-[95vw] min-h-[600px] max-h-[95vh] w-[1200px] h-[80vh] resize overflow-auto border-2 border-gray-300">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <DialogTitle className="text-xl font-bold text-blue-600">
                  📋 Tabella Accessi - {staffName}
                </DialogTitle>
                <DialogDescription>
                  Periodo: {format(periodStart, 'dd/MM/yyyy')} - {format(periodEnd, 'dd/MM/yyyy')}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-1 text-gray-400 text-xs">
                <Maximize className="h-4 w-4" />
                <span>Ridimensionabile</span>
              </div>
            </div>
            {/* Export Buttons */}
            {accessData.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToExcel}
                  className="gap-2"
                  data-testid="button-export-excel-access"
                >
                  <Download className="h-4 w-4" />
                  Excel
                </Button>
                <PDFDownloadLink
                  document={
                    <AccessTablePDF 
                      data={accessData}
                      staffName={staffName}
                      periodStart={periodStart}
                      periodEnd={periodEnd}
                      totalHours={totalHours}
                      totalRecords={totalRecords}
                    />
                  }
                  fileName={`Tabella_Accessi_${staffName.replace(/[^a-zA-Z0-9]/g, '_')}_${format(periodStart, 'dd-MM-yyyy')}_${format(periodEnd, 'dd-MM-yyyy')}.pdf`}
                >
                  {({ blob, url, loading, error }) => (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      className="gap-2"
                      data-testid="button-export-pdf-access"
                    >
                      <FileText className="h-4 w-4" />
                      {loading ? 'Generando...' : 'PDF'}
                    </Button>
                  )}
                </PDFDownloadLink>
              </div>
            )}
          </div>
        </DialogHeader>
        
        <div className="mt-4">
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="mt-2">Caricamento accessi...</p>
            </div>
          ) : rawAccessData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nessun accesso trovato per questo periodo</p>
            </div>
          ) : (
            <>
              {/* View Mode Toggle and Aggregation Controls */}
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-blue-700">📊 Visualizzazione Dati</h4>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="view-toggle" className="text-sm text-blue-700">Vista:</Label>
                      <Button
                        variant={viewMode === 'detail' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('detail')}
                        data-testid="button-detail-view"
                      >
                        📋 Dettaglio
                      </Button>
                      <Button
                        variant={viewMode === 'aggregated' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('aggregated')}
                        data-testid="button-aggregated-view"
                      >
                        📊 Aggregata
                      </Button>
                    </div>
                    
                    {viewMode === 'aggregated' && (
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-blue-700">Raggruppa per:</Label>
                        <select
                          value={aggregateBy}
                          onChange={(e) => setAggregateBy(e.target.value as 'client' | 'date' | 'dayOfWeek')}
                          className="text-sm border border-blue-300 rounded px-2 py-1 bg-white"
                          data-testid="select-aggregate-by"
                        >
                          <option value="client">👤 Cliente</option>
                          <option value="date">📅 Giorno</option>
                          <option value="dayOfWeek">🗓️ Giorno della Settimana</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Column Filters Panel - Only show in detail view */}
              {viewMode === 'detail' && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-700">Filtri per Colonna</h4>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        data-testid="button-toggle-access-filters"
                      >
                        <Filter className="h-4 w-4 mr-2" />
                        {showFilters ? 'Nascondi Filtri' : 'Mostra Filtri'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetFilters}
                        data-testid="button-reset-access-filters"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reset Filtri
                      </Button>
                    </div>
                  </div>

                {showFilters && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600">Data</Label>
                      <div className="relative">
                        <Search className="h-3 w-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                          placeholder="DD/MM/YYYY"
                          value={filters.date}
                          onChange={(e) => setFilters(prev => ({...prev, date: e.target.value}))}
                          className="pl-7 text-xs h-8"
                          data-testid="filter-access-date"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-600">Inizio</Label>
                      <div className="relative">
                        <Search className="h-3 w-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                          placeholder="Data/ora inizio"
                          value={filters.startTime}
                          onChange={(e) => setFilters(prev => ({...prev, startTime: e.target.value}))}
                          className="pl-7 text-xs h-8"
                          data-testid="filter-access-start"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-600">Fine</Label>
                      <div className="relative">
                        <Search className="h-3 w-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                          placeholder="Data/ora fine"
                          value={filters.endTime}
                          onChange={(e) => setFilters(prev => ({...prev, endTime: e.target.value}))}
                          className="pl-7 text-xs h-8"
                          data-testid="filter-access-end"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-600">Durata</Label>
                      <div className="relative">
                        <Search className="h-3 w-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                          placeholder="2.00"
                          value={filters.duration}
                          onChange={(e) => setFilters(prev => ({...prev, duration: e.target.value}))}
                          className="pl-7 text-xs h-8"
                          data-testid="filter-access-duration"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-600">Cliente</Label>
                      <div className="relative">
                        <Search className="h-3 w-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                          placeholder="Nome cliente"
                          value={filters.client}
                          onChange={(e) => setFilters(prev => ({...prev, client: e.target.value}))}
                          className="pl-7 text-xs h-8"
                          data-testid="filter-access-client"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-600">Km</Label>
                      <div className="relative">
                        <Search className="h-3 w-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                          placeholder="0"
                          value={filters.mileage}
                          onChange={(e) => setFilters(prev => ({...prev, mileage: e.target.value}))}
                          className="pl-7 text-xs h-8"
                          data-testid="filter-access-mileage"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-600">ID</Label>
                      <div className="relative">
                        <Search className="h-3 w-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                          placeholder="Identificativo"
                          value={filters.identifier}
                          onChange={(e) => setFilters(prev => ({...prev, identifier: e.target.value}))}
                          className="pl-7 text-xs h-8"
                          data-testid="filter-access-identifier"
                        />
                      </div>
                    </div>
                  </div>
                )}

                  <div className="mt-3 text-sm text-gray-600">
                    Mostrando <strong>{accessData.length}</strong> di <strong>{rawAccessData.length}</strong> registrazioni totali
                  </div>
                </div>
              )}

              {/* Aggregated Data Summary */}
              {viewMode === 'aggregated' && (
                <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-green-700">📈 Riepilogo Aggregato</h4>
                    <div className="flex gap-4 text-sm text-green-700">
                      <span><strong>{aggregatedData.length}</strong> gruppi</span>
                      <span><strong>{accessData.length}</strong> registrazioni totali</span>
                      <span><strong>{accessData.reduce((sum, entry) => sum + (parseFloat(entry.duration || '0')), 0).toFixed(2)}h</strong> ore totali</span>
                    </div>
                  </div>
                </div>
              )}

              {accessData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Filter className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nessun accesso corrisponde ai filtri applicati</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="mt-2"
                  >
                    Reset Filtri
                  </Button>
                </div>
              ) : (
            <div className="overflow-x-auto">
              <Table>
                {viewMode === 'detail' ? (
                  // Detail View Headers
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('date')}
                          className="flex items-center gap-2 font-medium text-gray-700 hover:text-gray-900 -ml-2 h-8"
                          data-testid="sort-access-date"
                        >
                          Data
                          {getSortIcon('date')}
                        </Button>
                      </TableHead>
                    <TableHead className="w-40">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('startTime')}
                        className="flex items-center gap-2 font-medium text-gray-700 hover:text-gray-900 -ml-2 h-8"
                        data-testid="sort-access-start"
                      >
                        Data Inizio Programmata
                        {getSortIcon('startTime')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-40">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('endTime')}
                        className="flex items-center gap-2 font-medium text-gray-700 hover:text-gray-900 -ml-2 h-8"
                        data-testid="sort-access-end"
                      >
                        Data Fine Programmata
                        {getSortIcon('endTime')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-24 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('duration')}
                        className="flex items-center gap-2 font-medium text-gray-700 hover:text-gray-900 -ml-2 h-8"
                        data-testid="sort-access-duration"
                      >
                        Durata
                        {getSortIcon('duration')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('client')}
                        className="flex items-center gap-2 font-medium text-gray-700 hover:text-gray-900 -ml-2 h-8"
                        data-testid="sort-access-client"
                      >
                        Cliente
                        {getSortIcon('client')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-20 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('mileage')}
                        className="flex items-center gap-2 font-medium text-gray-700 hover:text-gray-900 -ml-2 h-8"
                        data-testid="sort-access-mileage"
                      >
                        Km
                        {getSortIcon('mileage')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-24 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('identifier')}
                        className="flex items-center gap-2 font-medium text-gray-700 hover:text-gray-900 -ml-2 h-8"
                        data-testid="sort-access-identifier"
                      >
                        ID
                        {getSortIcon('identifier')}
                      </Button>
                    </TableHead>
                    </TableRow>
                  </TableHeader>
                ) : (
                  // Aggregated View Headers
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {aggregateBy === 'client' && '👤 Cliente'}
                        {aggregateBy === 'date' && '📅 Giorno'}
                        {aggregateBy === 'dayOfWeek' && '🗓️ Giorno della Settimana'}
                      </TableHead>
                      <TableHead className="text-center">📊 N° Accessi</TableHead>
                      <TableHead className="text-center">⏰ Ore Totali</TableHead>
                      <TableHead className="text-center">🟢 Ore Feriali</TableHead>
                      <TableHead className="text-center">🔴 Ore Festive</TableHead>
                      <TableHead className="text-center">🚗 Km Totali</TableHead>
                    </TableRow>
                  </TableHeader>
                )}

                <TableBody>
                  {viewMode === 'detail' ? (
                    // Detail View Rows
                    accessData.map((entry, index) => {
                    // Parse the date safely from DD/MM/YYYY HH:MM format
                    let entryDate: Date | null = null;
                    let isValidDate = false;
                    
                    try {
                      if (entry.scheduledStart) {
                        // Parse DD/MM/YYYY HH:MM format
                        const datePart = entry.scheduledStart.split(' ')[0];
                        if (datePart && datePart.includes('/')) {
                          const [day, month, year] = datePart.split('/');
                          entryDate = new Date(Number(year), Number(month) - 1, Number(day));
                          isValidDate = entryDate && !isNaN(entryDate.getTime());
                        }
                      }
                    } catch (error) {
                      console.error('Error parsing date:', entry.scheduledStart, error);
                      isValidDate = false;
                    }
                    
                    const isRedDay = isValidDate ? isHolidayOrSunday(entryDate!) : false;
                    
                    return (
                      <TableRow key={index} className={isRedDay ? "bg-red-50" : ""}>
                        <TableCell className={cn(
                          "font-medium",
                          isRedDay ? "text-red-600" : ""
                        )}>
                          {isValidDate ? format(entryDate!, 'dd/MM/yyyy') : entry.scheduledStart?.split(' ')[0] || 'N/A'}
                        </TableCell>
                        <TableCell className={cn(
                          "font-mono text-sm",
                          isRedDay ? "text-red-600" : ""
                        )}>
                          {entry.scheduledStart || 'N/A'}
                        </TableCell>
                        <TableCell className={cn(
                          "font-mono text-sm",
                          isRedDay ? "text-red-600" : ""
                        )}>
                          {entry.scheduledEnd || 'N/A'}
                        </TableCell>
                        <TableCell className={cn(
                          "text-center font-semibold",
                          isRedDay ? "text-red-600" : "text-blue-600"
                        )}>
                          {entry.duration}
                        </TableCell>
                        <TableCell className={isRedDay ? "text-red-600" : ""}>
                          {entry.client}
                        </TableCell>
                        <TableCell className={cn(
                          "text-center text-sm font-semibold",
                          isRedDay ? "text-red-600" : "text-orange-600"
                        )}>
                          {entry.mileage || '0'}
                        </TableCell>
                        <TableCell className={cn(
                          "text-center text-xs font-mono",
                          isRedDay ? "text-red-600" : "text-gray-500"
                        )}>
                          {entry.identifier}
                        </TableCell>
                      </TableRow>
                    );
                  })
                  ) : (
                    // Aggregated View Rows
                    aggregatedData.map((group, index) => {
                      const isHolidayGroup = aggregateBy === 'dayOfWeek' && group.groupKey === 'Domenica';
                      
                      return (
                        <TableRow key={index} className={isHolidayGroup ? "bg-red-50" : ""}>
                          <TableCell className={cn(
                            "font-semibold",
                            isHolidayGroup ? "text-red-600" : "text-blue-600"
                          )}>
                            {group.groupKey}
                          </TableCell>
                          <TableCell className="text-center font-medium text-gray-700">
                            {group.recordCount}
                          </TableCell>
                          <TableCell className={cn(
                            "text-center font-bold text-lg",
                            isHolidayGroup ? "text-red-600" : "text-blue-600"
                          )}>
                            {group.totalHours.toFixed(2)}h
                          </TableCell>
                          <TableCell className="text-center font-semibold text-green-600">
                            {group.weekdayHours.toFixed(2)}h
                          </TableCell>
                          <TableCell className="text-center font-semibold text-red-600">
                            {group.holidayHours.toFixed(2)}h
                          </TableCell>
                          <TableCell className="text-center font-semibold text-orange-600">
                            {group.totalMileage.toFixed(1)}km
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-blue-50">
                    <TableCell colSpan={3} className="font-bold text-blue-700">Totali Periodo</TableCell>
                    <TableCell className="text-center font-bold text-blue-600">
                      {totalHours}h
                    </TableCell>
                    <TableCell className="text-center text-xs text-gray-600">
                      {totalRecords} accessi
                    </TableCell>
                    <TableCell className="text-center font-bold text-orange-600">
                      {(() => {
                        const totalKm = accessData.reduce((sum, entry) => {
                          return sum + (parseFloat(entry.mileage || '0') || 0);
                        }, 0);
                        return totalKm.toFixed(1);
                      })()}km
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  <TableRow className="bg-gray-50">
                    <TableCell colSpan={2} className="font-semibold text-gray-700">Ore Feriali:</TableCell>
                    <TableCell className="text-center font-bold text-green-600">
                      {(() => {
                        const weekdayHours = accessData.reduce((sum, entry) => {
                          // Parse date for holiday detection
                          let entryDate: Date | null = null;
                          let isValidDate = false;
                          try {
                            if (entry.scheduledStart) {
                              const datePart = entry.scheduledStart.split(' ')[0];
                              if (datePart && datePart.includes('/')) {
                                const [day, month, year] = datePart.split('/');
                                entryDate = new Date(Number(year), Number(month) - 1, Number(day));
                                isValidDate = entryDate && !isNaN(entryDate.getTime());
                              }
                            }
                          } catch (error) {
                            isValidDate = false;
                          }
                          
                          const isRedDay = isValidDate ? isHolidayOrSunday(entryDate!) : false;
                          if (!isRedDay) {
                            const hours = parseFloat(entry.duration || '0') || 0;
                            return sum + hours;
                          }
                          return sum;
                        }, 0);
                        return weekdayHours.toFixed(2);
                      })()}h
                    </TableCell>
                    <TableCell colSpan={2} className="font-semibold text-gray-700">Ore Festive:</TableCell>
                    <TableCell className="text-center font-bold text-red-600">
                      {(() => {
                        const holidayHours = accessData.reduce((sum, entry) => {
                          // Parse date for holiday detection
                          let entryDate: Date | null = null;
                          let isValidDate = false;
                          try {
                            if (entry.scheduledStart) {
                              const datePart = entry.scheduledStart.split(' ')[0];
                              if (datePart && datePart.includes('/')) {
                                const [day, month, year] = datePart.split('/');
                                entryDate = new Date(Number(year), Number(month) - 1, Number(day));
                                isValidDate = entryDate && !isNaN(entryDate.getTime());
                              }
                            }
                          } catch (error) {
                            isValidDate = false;
                          }
                          
                          const isRedDay = isValidDate ? isHolidayOrSunday(entryDate!) : false;
                          if (isRedDay) {
                            const hours = parseFloat(entry.duration || '0') || 0;
                            return sum + hours;
                          }
                          return sum;
                        }, 0);
                        return holidayHours.toFixed(2);
                      })()}h
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
              
              {/* Legend */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-semibold mb-2">📌 Legenda:</p>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                    <span>Domeniche e Festività</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
                    <span>Giorni Feriali</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  * Include: Festività Nazionali, 15/05 (Olbia), 06/12 (Sassari), Domeniche
                </p>
              </div>
            </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}