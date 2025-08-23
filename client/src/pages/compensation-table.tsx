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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Loader2,
  Eye
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
    display: 'flex',
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
    color: 'black',
  },
  tableCol: {
    width: '7.69%', // 100% / 13 columns
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bfbfbf',
    padding: 4,
  },
  blueCol: {
    width: '7.69%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bfbfbf',
    padding: 4,
    backgroundColor: '#dbeafe', // blue-50
  },
  greenCol: {
    width: '7.69%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bfbfbf',
    padding: 4,
    backgroundColor: '#dcfce7', // green-50
  },
  orangeCol: {
    width: '7.69%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bfbfbf',
    padding: 4,
    backgroundColor: '#fff7ed', // orange-50
  },
  purpleCol: {
    width: '7.69%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bfbfbf',
    padding: 4,
    backgroundColor: '#faf5ff', // purple-50
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
  const [periodStart, setPeriodStart] = useState<Date>(new Date(2025, 0, 1)); // January 1, 2025 
  const [periodEnd, setPeriodEnd] = useState<Date>(new Date(2025, 0, 1)); // January 1, 2025 (same day)
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingCells, setLoadingCells] = useState<Record<string, boolean>>({});
  const [staffTypeFilter, setStaffTypeFilter] = useState<'all' | 'internal' | 'external'>('all');
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
    staleTime: 30000, // 30 seconds
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

  // Function to handle sorting
  const handleSort = (field: 'lastName' | 'firstName') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
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

    const data = [
      headers,
      ...filteredCompensations.map(comp => [
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
            <View style={pdfStyles.blueCol}><Text style={pdfStyles.tableCell}>{t('compensations.table.headers.weekdayTotal')}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{t('compensations.table.headers.holidayRate')}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{t('compensations.table.headers.holidayHours')}</Text></View>
            <View style={pdfStyles.greenCol}><Text style={pdfStyles.tableCell}>{t('compensations.table.headers.holidayTotal')}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{t('compensations.table.headers.mileageRate')}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{t('compensations.table.headers.kilometers')}</Text></View>
            <View style={pdfStyles.orangeCol}><Text style={pdfStyles.tableCell}>{t('compensations.table.headers.mileageTotal')}</Text></View>
            <View style={pdfStyles.purpleCol}><Text style={pdfStyles.tableCell}>{t('compensations.table.headers.total')}</Text></View>
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
              <View style={pdfStyles.blueCol}>
                <Text style={pdfStyles.tableCell}>€{comp.weekdayTotal}</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableCell}>€{comp.staff.holidayRate}</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableCell}>{comp.holidayHours}</Text>
              </View>
              <View style={pdfStyles.greenCol}>
                <Text style={pdfStyles.tableCell}>€{comp.holidayTotal}</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableCell}>€{comp.staff.mileageRate}</Text>
              </View>
              <View style={pdfStyles.tableCol}>
                <Text style={pdfStyles.tableCell}>{comp.totalMileage}</Text>
              </View>
              <View style={pdfStyles.orangeCol}>
                <Text style={pdfStyles.tableCell}>€{comp.mileageTotal}</Text>
              </View>
              <View style={pdfStyles.purpleCol}>
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
            <View style={pdfStyles.blueCol}><Text style={pdfStyles.tableCell}>€{totals.weekdayTotal.toFixed(2)}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}></Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{totals.holidayHours.toFixed(2)}</Text></View>
            <View style={pdfStyles.greenCol}><Text style={pdfStyles.tableCell}>€{totals.holidayTotal.toFixed(2)}</Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}></Text></View>
            <View style={pdfStyles.tableCol}><Text style={pdfStyles.tableCell}>{totals.totalMileage.toFixed(2)}</Text></View>
            <View style={pdfStyles.orangeCol}><Text style={pdfStyles.tableCell}>€{totals.mileageTotal.toFixed(2)}</Text></View>
            <View style={pdfStyles.purpleCol}><Text style={pdfStyles.tableCell}>€{totals.totalAmount.toFixed(2)}</Text></View>
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

function AccessDialog({ isOpen, onClose, staffName, staffId, periodStart, periodEnd }: AccessDialogProps) {
  const { data: accessData = [], isLoading } = useQuery<AccessEntry[]>({
    queryKey: [`/api/staff/${staffId}/access-logs`, periodStart, periodEnd],
    queryFn: async () => {
      if (!staffId) return [];
      
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-blue-600">
            📋 Tabella Accessi - {staffName}
          </DialogTitle>
          <DialogDescription>
            Periodo: {format(periodStart, 'dd/MM/yyyy')} - {format(periodEnd, 'dd/MM/yyyy')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="mt-2">Caricamento accessi...</p>
            </div>
          ) : accessData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nessun accesso trovato per questo periodo</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Data</TableHead>
                    <TableHead className="w-40">Data Inizio Programmata</TableHead>
                    <TableHead className="w-40">Data Fine Programmata</TableHead>
                    <TableHead className="w-24 text-center">Durata</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="w-24 text-center">ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessData.map((entry, index) => {
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
                          "text-center text-xs font-mono",
                          isRedDay ? "text-red-600" : "text-gray-500"
                        )}>
                          {entry.identifier}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="font-bold">Totale Servizi</TableCell>
                    <TableCell className="text-center font-bold text-blue-600">
                      {accessData.reduce((total, entry) => {
                        const [hours, minutes] = entry.duration.split(':').map(Number);
                        return total + hours + (minutes / 60);
                      }, 0).toFixed(2)}h
                    </TableCell>
                    <TableCell colSpan={2} className="text-right font-bold">
                      {accessData.length} accessi
                    </TableCell>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}