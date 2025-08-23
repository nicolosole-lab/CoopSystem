import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CompensationSlip from "@/components/CompensationSlip";
import { ArrowLeft, User, Phone, Mail, Euro, Users, Clock, Calendar, Briefcase, FileText, Calculator, Settings, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, RefreshCw, Plus, UserPlus, X, Trash2, Download, BarChart3 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn, formatDisplayName } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Staff, Client, ClientStaffAssignment, TimeLog, StaffCompensation } from "@shared/schema";

type StaffWithDetails = Staff & { 
  clientAssignments?: (ClientStaffAssignment & { client: Client })[];
  timeLogs?: TimeLog[];
};

// Form validation schema for staff rate configuration
const staffRateFormSchema = z.object({
  standardRate: z.string().min(1, "Standard rate is required").refine(val => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Must be a positive number"),
  holidayRate: z.string().min(1, "Holiday rate is required").refine(val => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Must be a positive number"),
  overtimeMultiplier: z.string().min(1, "Overtime multiplier is required").refine(val => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 1.0;
  }, "Must be 1.0 or greater"),
  mileageRatePerKm: z.string().min(1, "Mileage rate is required").refine(val => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, "Must be a positive number or zero"),
  effectiveFrom: z.date({
    required_error: "Effective date is required"
  })
});

type StaffRateFormData = z.infer<typeof staffRateFormSchema>;

export default function StaffDetails() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [periodStart, setPeriodStart] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [periodEnd, setPeriodEnd] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  );
  const [showCalculation, setShowCalculation] = useState(false);
  const [isServiceLogsExpanded, setIsServiceLogsExpanded] = useState(false);
  const [isCompensationExpanded, setIsCompensationExpanded] = useState(false);
  const [logStartDate, setLogStartDate] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
  );
  const [logEndDate, setLogEndDate] = useState<Date | undefined>(
    new Date()
  );
  const [isSyncing, setIsSyncing] = useState(false);

  const [showAddClientDialog, setShowAddClientDialog] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientAssignmentType, setClientAssignmentType] = useState("secondary");
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;
  const [selectedBudgetAllocations, setSelectedBudgetAllocations] = useState<string[]>([]);
  const [budgetAmounts, setBudgetAmounts] = useState<{[key: string]: number}>({});
  
  // State for inline editing contact information and rates
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingRates, setIsEditingRates] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [phoneValue, setPhoneValue] = useState('');
  const [weekdayRateValue, setWeekdayRateValue] = useState('15.00');
  const [holidayRateValue, setHolidayRateValue] = useState('20.00');
  const [mileageRateValue, setMileageRateValue] = useState('0.50');

  const { data: staffMember, isLoading: staffLoading, error: staffError } = useQuery<StaffWithDetails>({
    queryKey: [`/api/staff/${id}`],
    enabled: !!id,
  });

  const { data: clientAssignments = [], isLoading: clientsLoading } = useQuery<(ClientStaffAssignment & { client: Client })[]>({
    queryKey: [`/api/staff/${id}/client-assignments`],
    enabled: !!id && !!staffMember,
  });

  const { data: timeLogs = [], isLoading: logsLoading } = useQuery<TimeLog[]>({
    queryKey: [`/api/staff/${id}/time-logs`],
    enabled: !!id && !!staffMember,
  });



  const { data: compensations = [] } = useQuery<StaffCompensation[]>({
    queryKey: [`/api/compensations?staffId=${id}`],
    enabled: !!id,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    enabled: !!id,
  });

  // Query to get all available budget allocations for staff's assigned clients
  const { data: availableBudgetAllocations = [] } = useQuery<any[]>({
    queryKey: [`/api/staff/${id}/available-budget-allocations`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/staff/${id}/available-budget-allocations`);
      return response.json();
    },
    enabled: !!id && !!showCalculation,
  });

  // Query to get all budget types for the dropdown
  const { data: budgetTypes = [] } = useQuery<any[]>({
    queryKey: ['/api/budget-types'],
    enabled: !!showCalculation,
  });



  // Sync mutation to refresh staff data
  const syncStaffDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/staff/${id}/sync-data`);
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate relevant queries to trigger refresh
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${id}/client-assignments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${id}/time-logs`] });
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${id}`] });
      
      toast({
        title: "Data Synced",
        description: `Successfully synced ${data.clientsAssigned || 0} clients and ${data.serviceLogs || 0} service logs`,
      });
      setIsSyncing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync staff data",
        variant: "destructive",
      });
      setIsSyncing(false);
    },
  });

  const handleSyncData = () => {
    setIsSyncing(true);
    syncStaffDataMutation.mutate();
  };

  const { data: calculatedCompensation, isLoading: calculatingComp, error: compensationError } = useQuery<any>({
    queryKey: [`/api/staff/${id}/calculate-compensation`, periodStart, periodEnd],
    queryFn: async () => {
      if (!periodStart || !periodEnd) return null;
      const startDateStr = format(periodStart, 'yyyy-MM-dd');
      const endDateStr = format(periodEnd, 'yyyy-MM-dd');
      console.log('Calculating compensation for period:', startDateStr, 'to', endDateStr);
      const response = await fetch(`/api/staff/${id}/calculate-compensation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          periodStart: format(periodStart, 'yyyy-MM-dd'), 
          periodEnd: format(periodEnd, 'yyyy-MM-dd') 
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Compensation calculation failed:', response.status, errorText);
        throw new Error(`Failed to calculate compensation: ${response.status}`);
      }
      const result = await response.json();
      console.log('Compensation calculation result:', result);
      return result;
    },
    enabled: !!id && !!periodStart && !!periodEnd && showCalculation,
  });

  const createCompensationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/compensations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error('Compensation save error:', result);
        throw new Error(result.message || 'Failed to create compensation');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/compensations?staffId=${id}`] });
      toast({
        title: "Success",
        description: "Compensation record created successfully",
      });
      setShowCalculation(false);
    },
    onError: (error: any) => {
      console.error('Error saving compensation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create compensation record",
        variant: "destructive",
      });
    },
  });



  const approveCompensationMutation = useMutation({
    mutationFn: async (compensationId: string) => {
      const response = await fetch(`/api/compensations/${compensationId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to approve compensation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/compensations?staffId=${id}`] });
      toast({
        title: "Success",
        description: "Compensation approved successfully",
      });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (compensationId: string) => {
      const response = await fetch(`/api/compensations/${compensationId}/mark-paid`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to mark as paid');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/compensations?staffId=${id}`] });
      toast({
        title: "Success",
        description: "Compensation marked as paid",
      });
    },
  });

  const deleteCompensationMutation = useMutation({
    mutationFn: async (compensationId: string) => {
      const response = await apiRequest("DELETE", `/api/compensations/${compensationId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/compensations?staffId=${id}`] });
      toast({
        title: "Success",
        description: "Compensation record deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete compensation record",
        variant: "destructive",
      });
    },
  });

  // Mutation for adding a new client assignment
  const addClientAssignmentMutation = useMutation({
    mutationFn: async (data: { clientId: string; assignmentType: string }) => {
      return await apiRequest('POST', `/api/staff/${id}/client-assignments`, {
        clientId: data.clientId,
        assignmentType: data.assignmentType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${id}/client-assignments`] });
      toast({
        title: "Success",
        description: "Client assigned successfully",
      });
      setShowAddClientDialog(false);
      setSelectedClientId("");
      setClientAssignmentType("secondary");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign client",
        variant: "destructive",
      });
    },
  });

  // Mutation for removing a client assignment
  const removeClientAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      return await apiRequest('DELETE', `/api/client-staff-assignments/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${id}/client-assignments`] });
      toast({
        title: "Success",
        description: "Client removed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove client",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating staff contact information
  const updateStaffContactMutation = useMutation({
    mutationFn: async (data: { email?: string; phone?: string }) => {
      return await apiRequest('PATCH', `/api/staff/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${id}`] });
      toast({
        title: "Success",
        description: "Contact information updated successfully",
      });
      setIsEditingEmail(false);
      setIsEditingPhone(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update contact information",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating staff rates
  const updateStaffRatesMutation = useMutation({
    mutationFn: async (data: { weekdayRate?: string; holidayRate?: string; mileageRate?: string }) => {
      return await apiRequest('PATCH', `/api/staff/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({
        title: "Success",
        description: "Staff rates updated successfully",
      });
      setIsEditingRates(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update staff rates",
        variant: "destructive",
      });
    },
  });

  // Helper functions for editing contact information
  const handleEditEmail = () => {
    setEmailValue(staffMember.email || '');
    setIsEditingEmail(true);
  };

  const handleEditPhone = () => {
    setPhoneValue(staffMember.phone || '');
    setIsEditingPhone(true);
  };

  const handleSaveEmail = () => {
    if (emailValue !== (staffMember.email || '')) {
      updateStaffContactMutation.mutate({ email: emailValue });
    } else {
      setIsEditingEmail(false);
    }
  };

  const handleSavePhone = () => {
    if (phoneValue !== (staffMember.phone || '')) {
      updateStaffContactMutation.mutate({ phone: phoneValue });
    } else {
      setIsEditingPhone(false);
    }
  };

  const handleCancelEmailEdit = () => {
    setEmailValue('');
    setIsEditingEmail(false);
  };

  const handleCancelPhoneEdit = () => {
    setPhoneValue('');
    setIsEditingPhone(false);
  };

  // Helper functions for editing rates
  const handleEditRates = () => {
    setWeekdayRateValue(staffMember?.weekdayRate || '15.00');
    setHolidayRateValue(staffMember?.holidayRate || '20.00');
    setMileageRateValue(staffMember?.mileageRate || '0.50');
    setIsEditingRates(true);
  };

  const handleSaveRates = () => {
    const hasChanges = 
      weekdayRateValue !== (staffMember?.weekdayRate || '15.00') ||
      holidayRateValue !== (staffMember?.holidayRate || '20.00') ||
      mileageRateValue !== (staffMember?.mileageRate || '0.50');

    if (hasChanges) {
      updateStaffRatesMutation.mutate({
        weekdayRate: weekdayRateValue,
        holidayRate: holidayRateValue,
        mileageRate: mileageRateValue,
      });
    } else {
      setIsEditingRates(false);
    }
  };

  const handleCancelRatesEdit = () => {
    setWeekdayRateValue('15.00');
    setHolidayRateValue('20.00');
    setMileageRateValue('0.50');
    setIsEditingRates(false);
  };

  if (staffLoading || clientsLoading || logsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg text-gray-600">Loading staff details...</div>
      </div>
    );
  }

  if (staffError || !staffMember) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg text-red-600">Error loading staff details</div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: "bg-green-100 text-green-800 border-green-300",
      inactive: "bg-gray-100 text-gray-800 border-gray-300",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    };
    const displayName = status === 'active' ? 'Active' : status === 'inactive' ? 'Inactive' : status === 'pending' ? 'Pending' : status;
    return (
      <Badge variant="outline" className={statusColors[status as keyof typeof statusColors] || statusColors.pending}>
        {displayName}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeColors = {
      internal: "bg-blue-100 text-blue-800 border-blue-300",
      external: "bg-purple-100 text-purple-800 border-purple-300",
    };
    const displayName = type === 'internal' ? 'Internal' : type === 'external' ? 'External' : type;
    return (
      <Badge variant="outline" className={typeColors[type as keyof typeof typeColors] || "bg-gray-100 text-gray-800"}>
        {displayName}
      </Badge>
    );
  };

  // Filter logs by date range using scheduled times
  const filteredLogs = timeLogs.filter(log => {
    // Use scheduledStartTime for filtering, fallback to scheduledEndTime, then serviceDate
    const logDate = log.scheduledStartTime 
      ? new Date(log.scheduledStartTime)
      : log.scheduledEndTime 
        ? new Date(log.scheduledEndTime)
        : new Date(log.serviceDate);
    
    if (logStartDate) {
      const startDate = new Date(logStartDate);
      startDate.setHours(0, 0, 0, 0);
      if (logDate < startDate) return false;
    }
    
    if (logEndDate) {
      const endDate = new Date(logEndDate);
      endDate.setHours(23, 59, 59, 999);
      if (logDate > endDate) return false;
    }
    
    return true;
  });

  const totalHours = timeLogs.reduce((sum, log) => sum + parseFloat(log.hours), 0);
  // Calculate total earnings from approved and paid compensations
  const totalEarnings = compensations
    .filter(comp => comp.status === 'approved' || comp.status === 'paid')
    .reduce((sum, comp) => sum + parseFloat(comp.totalCompensation), 0);

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="px-4 py-6 max-w-full">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-gray-800">Staff Details</h1>
          </div>
          {getStatusBadge(staffMember.status)}
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6 min-h-0">
          {/* Basic Information Card */}
          <Card className="care-card">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Full Name</label>
                <p className="text-lg font-semibold text-gray-900">
                  {formatDisplayName(staffMember.firstName, staffMember.lastName)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">External ID</label>
                <p className="text-lg font-mono text-gray-900">
                  {staffMember.externalId || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Staff Type</label>
                <div className="mt-1">
                  {getTypeBadge(staffMember.type)}
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-600">Staff Rates</label>
                  {!isEditingRates && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleEditRates}
                      className="text-blue-600 hover:text-blue-700 p-1"
                      data-testid="button-edit-rates"
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {isEditingRates ? (
                  <div className="mt-2 space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Weekday (€/hr)</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={weekdayRateValue}
                          onChange={(e) => setWeekdayRateValue(e.target.value)}
                          className="text-center"
                          data-testid="input-weekday-rate-edit"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Holiday (€/hr)</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={holidayRateValue}
                          onChange={(e) => setHolidayRateValue(e.target.value)}
                          className="text-center"
                          data-testid="input-holiday-rate-edit"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Mileage (€/km)</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={mileageRateValue}
                          onChange={(e) => setMileageRateValue(e.target.value)}
                          className="text-center"
                          data-testid="input-mileage-rate-edit"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveRates}
                        disabled={updateStaffRatesMutation.isPending}
                        data-testid="button-save-rates"
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelRatesEdit}
                        disabled={updateStaffRatesMutation.isPending}
                        data-testid="button-cancel-rates"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Weekday</div>
                      <div className="text-lg font-semibold text-green-600">
                        €{staffMember.weekdayRate ? parseFloat(staffMember.weekdayRate).toFixed(2) : '15.00'}/hr
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Holiday</div>
                      <div className="text-lg font-semibold text-blue-600">
                        €{staffMember.holidayRate ? parseFloat(staffMember.holidayRate).toFixed(2) : '20.00'}/hr
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Mileage</div>
                      <div className="text-lg font-semibold text-orange-600">
                        €{staffMember.mileageRate ? parseFloat(staffMember.mileageRate).toFixed(2) : '0.50'}/km
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Information Card */}
          <Card className="care-card">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Email Field */}
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-500" />
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  {isEditingEmail ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="email"
                        value={emailValue}
                        onChange={(e) => setEmailValue(e.target.value)}
                        placeholder="Enter email address"
                        className="flex-1"
                        data-testid="input-email-edit"
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveEmail}
                        disabled={updateStaffContactMutation.isPending}
                        data-testid="button-save-email"
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEmailEdit}
                        disabled={updateStaffContactMutation.isPending}
                        data-testid="button-cancel-email"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-gray-900 flex-1">{staffMember.email || 'Not provided'}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleEditEmail}
                        className="text-blue-600 hover:text-blue-700 p-1"
                        data-testid="button-edit-email"
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Phone Field */}
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-500" />
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-600">Phone</label>
                  {isEditingPhone ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="tel"
                        value={phoneValue}
                        onChange={(e) => setPhoneValue(e.target.value)}
                        placeholder="Enter phone number"
                        className="flex-1"
                        data-testid="input-phone-edit"
                      />
                      <Button
                        size="sm"
                        onClick={handleSavePhone}
                        disabled={updateStaffContactMutation.isPending}
                        data-testid="button-save-phone"
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelPhoneEdit}
                        disabled={updateStaffContactMutation.isPending}
                        data-testid="button-cancel-phone"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-gray-900 flex-1">{staffMember.phone || 'Not provided'}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleEditPhone}
                        className="text-blue-600 hover:text-blue-700 p-1"
                        data-testid="button-edit-phone"
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Clients Card */}
          <Card className="care-card">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Assigned Clients ({clientAssignments.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Dialog open={showAddClientDialog} onOpenChange={setShowAddClientDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Client</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="client">Select Client</Label>
                          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                            <SelectTrigger id="client">
                              <SelectValue placeholder="Choose a client" />
                            </SelectTrigger>
                            <SelectContent>
                              {clients
                                .filter(c => !clientAssignments.some(a => a.clientId === c.id))
                                .map((client) => (
                                  <SelectItem key={client.id} value={client.id}>
                                    {formatDisplayName(client.firstName, client.lastName)} - {client.fiscalCode || 'No Fiscal Code'}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="assignment-type">Assignment Type</Label>
                          <Select value={clientAssignmentType} onValueChange={setClientAssignmentType}>
                            <SelectTrigger id="assignment-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="primary">Primary</SelectItem>
                              <SelectItem value="secondary">Secondary</SelectItem>
                              <SelectItem value="temporary">Temporary</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowAddClientDialog(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={() => {
                              if (selectedClientId) {
                                addClientAssignmentMutation.mutate({ 
                                  clientId: selectedClientId, 
                                  assignmentType: clientAssignmentType 
                                });
                              }
                            }}
                            disabled={!selectedClientId || addClientAssignmentMutation.isPending}
                          >
                            {addClientAssignmentMutation.isPending ? 'Adding...' : 'Add Client'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncData}
                    disabled={isSyncing}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {clientAssignments.length > 0 ? (
                <div className="space-y-3">
                  {clientAssignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <Link href={`/clients/${assignment.clientId}`} className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            {assignment.client ? (
                              <>
                                <p className="font-medium text-gray-900 hover:text-blue-600">
                                  {assignment.client.firstName} {assignment.client.lastName}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {assignment.client.serviceType?.replace('-', ' ')}
                                </p>
                              </>
                            ) : (
                              <p className="text-gray-500">Client not found</p>
                            )}
                          </div>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={assignment.assignmentType === 'primary' 
                            ? 'border-blue-500 text-blue-700 bg-blue-50' 
                            : 'border-gray-400 text-gray-600'}
                        >
                          {assignment.assignmentType || 'secondary'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (confirm('Are you sure you want to remove this client?')) {
                              removeClientAssignmentMutation.mutate(assignment.id);
                            }
                          }}
                          disabled={removeClientAssignmentMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No clients assigned</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 min-h-0 max-h-fit">
          {/* Professional Information */}
          <Card className="care-card">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Professional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Specializations</label>
                <p className="text-gray-900">
                  {staffMember.specializations && staffMember.specializations.length > 0 
                    ? staffMember.specializations.join(', ') 
                    : 'None specified'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Phone Number</label>
                <p className="text-gray-900">{staffMember.phone || 'Not provided'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Comprehensive Work Statistics */}
          <Card className="care-card">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Work Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {(() => {
                // Calculate statistics directly from time logs
                const totalHours = timeLogs.reduce((sum, log) => sum + parseFloat(log.hours || '0'), 0);
                const totalServices = timeLogs.length;
                
                // Calculate hours breakdown by service type
                const serviceTypeBreakdown = timeLogs.reduce((acc: { [key: string]: number }, log) => {
                  const serviceType = log.service_type || 'other';
                  acc[serviceType] = (acc[serviceType] || 0) + parseFloat(log.hours || '0');
                  return acc;
                }, {});

                // Monthly breakdown from time logs
                const monthlyData = timeLogs.reduce((acc: { [key: string]: { hours: number; services: number; serviceBreakdown: { [key: string]: number } } }, log) => {
                  // Validate date before formatting
                  if (!log.service_date) return acc;
                  const serviceDate = new Date(log.service_date);
                  if (isNaN(serviceDate.getTime())) return acc; // Skip invalid dates
                  
                  const monthKey = format(serviceDate, 'MMM yyyy');
                  if (!acc[monthKey]) {
                    acc[monthKey] = { 
                      hours: 0, 
                      services: 0,
                      serviceBreakdown: {}
                    };
                  }
                  acc[monthKey].hours += parseFloat(log.hours || '0');
                  acc[monthKey].services += 1;
                  
                  const serviceType = log.serviceType || 'other';
                  acc[monthKey].serviceBreakdown[serviceType] = (acc[monthKey].serviceBreakdown[serviceType] || 0) + parseFloat(log.hours || '0');
                  
                  return acc;
                }, {});

                // Recent activity (last 7 days)
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                const recentLogs = timeLogs.filter(log => {
                  if (!log.serviceDate) return false;
                  const serviceDate = new Date(log.serviceDate);
                  return !isNaN(serviceDate.getTime()) && serviceDate >= oneWeekAgo;
                });
                const recentHours = recentLogs.reduce((sum, log) => sum + parseFloat(log.hours || '0'), 0);

                // Current month estimated earnings
                const currentDate = new Date();
                const currentYear = currentDate.getFullYear();
                const currentMonth = currentDate.getMonth();
                const currentMonthStart = new Date(currentYear, currentMonth, 1);
                const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);
                
                // Filter for current month logs - use serviceDate field which should contain the actual service date
                const currentMonthLogs = timeLogs.filter(log => {
                  // Try multiple date fields in case serviceDate is not populated
                  const dateToCheck = log.serviceDate || log.scheduledStartTime || log.createdAt;
                  if (!dateToCheck) return false;
                  
                  const serviceDate = new Date(dateToCheck);
                  const isValidDate = !isNaN(serviceDate.getTime());
                  const isInCurrentMonth = isValidDate && serviceDate >= currentMonthStart && serviceDate <= currentMonthEnd;
                  
                  return isInCurrentMonth;
                });
                
                const currentMonthHours = currentMonthLogs.reduce((sum, log) => sum + parseFloat(log.hours || '0'), 0);
                
                // Calculate estimated earnings using default rate from staff profile
                const hourlyRate = parseFloat(staffMember.hourlyRate || '20');
                const estimatedEarnings = currentMonthHours * hourlyRate;

                return (
                  <>
                    {/* Total Statistics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{totalHours.toFixed(1)}h</div>
                        <div className="text-xs text-blue-700">Total Hours</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{totalServices}</div>
                        <div className="text-xs text-green-700">Total Services</div>
                      </div>
                    </div>

                    {/* Current Month Estimated Earnings */}
                    {currentMonthHours > 0 && (
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-purple-700">Current Month ({format(currentDate, 'MMM yyyy')})</span>
                          <div className="text-right">
                            <div className="font-bold text-purple-600">€{estimatedEarnings.toFixed(2)}</div>
                            <div className="text-xs text-purple-600">Est. earnings</div>
                          </div>
                        </div>
                        <div className="text-xs text-purple-600 mt-1">
                          {currentMonthHours.toFixed(1)}h × €{hourlyRate.toFixed(2)}/hr
                        </div>
                      </div>
                    )}

                    {/* Recent Activity */}
                    {recentHours > 0 && (
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-yellow-700">Recent Activity (7 days)</span>
                          <div className="text-right">
                            <div className="font-bold text-yellow-600">{recentHours.toFixed(1)}h</div>
                            <div className="text-xs text-yellow-600">{recentLogs.length} services</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Service Type Breakdown */}
                    {Object.keys(serviceTypeBreakdown).length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-600">Hours by Service Type</h4>
                        <div className="grid grid-cols-1 gap-2 text-xs">
                          {Object.entries(serviceTypeBreakdown)
                            .sort(([,a], [,b]) => b - a)
                            .map(([serviceType, hours]) => (
                              <div key={serviceType} className="flex justify-between p-2 bg-gray-50 rounded">
                                <span className="text-gray-600 capitalize">{serviceType.replace('-', ' ')}</span>
                                <span className="font-medium">{hours.toFixed(1)}h</span>
                              </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Monthly Breakdown */}
                    {Object.keys(monthlyData).length > 0 && (
                      <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium text-gray-600 mb-3">Monthly Activity</h4>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {Object.entries(monthlyData)
                            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                            .map(([month, data]) => (
                              <div key={month} className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium text-gray-700">{month}</span>
                                  <div className="text-right">
                                    <div className="font-bold text-blue-600">{data.hours.toFixed(1)}h</div>
                                    <div className="text-xs text-gray-600">{data.services} services</div>
                                  </div>
                                </div>
                                {Object.keys(data.serviceBreakdown).length > 1 && (
                                  <div className="text-xs text-gray-600">
                                    {Object.entries(data.serviceBreakdown).map(([serviceType, hours]) => (
                                      <div key={serviceType} className="flex justify-between">
                                        <span className="ml-2 capitalize">{serviceType.replace('-', ' ')}:</span>
                                        <span>{hours.toFixed(1)}h</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No Data Message */}
                    {totalHours === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No time logs found for this staff member</p>
                        <p className="text-xs">Statistics will appear once time logs are recorded</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>



          {/* Metadata */}
          <Card className="care-card">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Record Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Created</span>
                <span className="text-gray-900">
                  {staffMember.createdAt ? new Date(staffMember.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated</span>
                <span className="text-gray-900">
                  {staffMember.updatedAt ? new Date(staffMember.updatedAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Staff ID</span>
                <span className="text-gray-900 font-mono text-xs">{staffMember.id.slice(0, 8)}...</span>
              </div>
            </CardContent>
          </Card>

          {/* Import History */}
          {(staffMember.importId || staffMember.lastImportId) && (
            <Card className="care-card">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Import History
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-2 text-sm max-h-64 overflow-y-auto">
                {staffMember.importId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created by Import</span>
                    <span className="text-gray-900 font-mono text-xs">{staffMember.importId.slice(0, 8)}...</span>
                  </div>
                )}
                {staffMember.lastImportId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Modified by Import</span>
                    <span className="text-gray-900 font-mono text-xs">{staffMember.lastImportId.slice(0, 8)}...</span>
                  </div>
                )}
                {staffMember.importHistory && Array.isArray(staffMember.importHistory) && staffMember.importHistory.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <span className="text-gray-600 block mb-2">Import Actions:</span>
                    <div className="space-y-1">
                      {staffMember.importHistory.slice(-5).reverse().map((history: any, idx: number) => (
                        <div key={idx} className="text-xs flex justify-between">
                          <span className="text-gray-700">
                            {history?.action ? String(history.action) : 'Unknown'}
                          </span>
                          <span className="text-gray-500">
                            {history?.timestamp 
                              ? new Date(String(history.timestamp)).toLocaleDateString() 
                              : 'N/A'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Service Logs Section */}
      <div className="mt-8">
        <Card className="care-card">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50 cursor-pointer" onClick={() => setIsServiceLogsExpanded(!isServiceLogsExpanded)}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Service Logs
                </CardTitle>
                <CardDescription>
                  Recent service activities and time entries
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-white/50"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsServiceLogsExpanded(!isServiceLogsExpanded);
                }}
              >
                {isServiceLogsExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </Button>
            </div>
          </CardHeader>
          {isServiceLogsExpanded && (
            <CardContent className="pt-6 max-h-[600px] overflow-y-auto">
              {/* Date Filter Section */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter by Date Range</h3>
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Start Date
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !logStartDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {logStartDate ? format(logStartDate, "PPP") : <span>Select start date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={logStartDate}
                          onSelect={(date) => {
                            setLogStartDate(date);
                            setCurrentPage(1);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      End Date
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !logEndDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {logEndDate ? format(logEndDate, "PPP") : <span>Select end date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={logEndDate}
                          onSelect={(date) => {
                            setLogEndDate(date);
                            setCurrentPage(1);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLogStartDate(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
                        setLogEndDate(new Date());
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
                {filteredLogs.length !== timeLogs.length && (
                  <div className="mt-2 text-sm text-gray-600">
                    Showing {filteredLogs.length} of {timeLogs.length} total logs
                  </div>
                )}
              </div>

              {filteredLogs.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Client</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Start Time</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">End Time</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Service Type</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Hours</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(() => {
                        const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
                        const startIndex = (currentPage - 1) * logsPerPage;
                        const endIndex = startIndex + logsPerPage;
                        const currentLogs = filteredLogs.slice(startIndex, endIndex);
                        
                        return currentLogs.map((log) => {
                          const client = clients.find(c => c.id === log.clientId);
                          // Safely parse the service date to avoid timezone conversion issues
                          const displayDate = log.serviceDate 
                            ? new Date(new Date(log.serviceDate).toISOString().split('T')[0] + 'T00:00:00')
                            : new Date();
                          
                          return (
                            <tr key={log.id} className="hover:bg-gray-50">
                              <td className="py-3 px-4 text-sm text-gray-900">
                                {log.serviceDate ? format(displayDate, 'dd/MM/yyyy') : 'N/A'}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                {client ? (
                                  <Link 
                                    href={`/clients/${client.id}`} 
                                    className="text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
                                    data-testid={`link-client-${client.id}`}
                                  >
                                    {client.firstName} {client.lastName}
                                  </Link>
                                ) : (
                                  <span className="text-gray-500">Unknown Client</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-900">
                                {log.scheduledStartTime 
                                  ? format(new Date(log.scheduledStartTime), 'HH:mm')
                                  : '-'}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-900">
                                {log.scheduledEndTime 
                                  ? format(new Date(log.scheduledEndTime), 'HH:mm')
                                  : '-'}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                <Badge variant="outline" className="capitalize">
                                  {log.serviceType.replace('-', ' ')}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                {parseFloat(log.hours).toFixed(2)}h
                              </td>
                              <td className="py-3 px-4 text-sm font-medium text-green-600">
                                €{parseFloat(log.totalCost).toFixed(2)}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                {filteredLogs.length > logsPerPage && (
                  <div className="mt-4 flex items-center justify-between border-t pt-4">
                    <div className="text-sm text-gray-600">
                      Showing {((currentPage - 1) * logsPerPage) + 1} to {Math.min(currentPage * logsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      
                      {/* Page Numbers */}
                      <div className="flex gap-1">
                        {(() => {
                          const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
                          const pageNumbers = [];
                          const maxVisiblePages = 5;
                          
                          let startPage = Math.max(1, currentPage - 2);
                          let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                          
                          if (endPage - startPage < maxVisiblePages - 1) {
                            startPage = Math.max(1, endPage - maxVisiblePages + 1);
                          }
                          
                          for (let i = startPage; i <= endPage; i++) {
                            pageNumbers.push(
                              <Button
                                key={i}
                                variant={currentPage === i ? "default" : "outline"}
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setCurrentPage(i)}
                              >
                                {i}
                              </Button>
                            );
                          }
                          
                          return pageNumbers;
                        })()}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredLogs.length / logsPerPage), prev + 1))}
                        disabled={currentPage === Math.ceil(filteredLogs.length / logsPerPage)}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                No service logs found for this staff member
              </p>
            )}
            </CardContent>
          )}
        </Card>
      </div>

      {/* Compensation Management Section */}
      <div className="mt-8">
        <Card className="care-card">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50 cursor-pointer" onClick={() => setIsCompensationExpanded(!isCompensationExpanded)}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Compensation Management
                </CardTitle>
                <CardDescription>
                  Calculate and manage staff compensation for worked hours
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-white/50"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCompensationExpanded(!isCompensationExpanded);
                }}
              >
                {isCompensationExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </Button>
            </div>
          </CardHeader>
          {isCompensationExpanded && (
            <CardContent className="pt-6 space-y-6 max-h-[600px] overflow-y-auto">
              {/* Period Selection */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Compensation Period</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm">Period Start</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !periodStart && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {periodStart ? format(periodStart, "MMM dd, yyyy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={periodStart}
                          onSelect={(date) => {
                            if (date) {
                              // Create timezone-neutral date at local midnight
                              const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                              setPeriodStart(localDate);
                            } else {
                              setPeriodStart(undefined);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div>
                    <Label className="text-sm">Period End</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !periodEnd && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {periodEnd ? format(periodEnd, "MMM dd, yyyy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={periodEnd}
                          onSelect={(date) => {
                            if (date) {
                              // Create timezone-neutral date at local midnight
                              const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                              setPeriodEnd(localDate);
                            } else {
                              setPeriodEnd(undefined);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="flex items-end">
                    <Button 
                      onClick={() => {
                        setShowCalculation(true);
                        // Auto-scroll to results after a brief delay
                        setTimeout(() => {
                          const resultsElement = document.querySelector('[data-testid="compensation-results"]');
                          if (resultsElement) {
                            resultsElement.scrollIntoView({ 
                              behavior: 'smooth', 
                              block: 'start',
                              inline: 'nearest' 
                            });
                          }
                        }, 300);
                      }}
                      disabled={!periodStart || !periodEnd || calculatingComp}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Calculator className="mr-2 h-4 w-4" />
                      Calculate Compensation
                    </Button>
                  </div>
                </div>
              </div>



              {/* Calculation Status */}
              {showCalculation && (
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  {calculatingComp && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Calculating compensation...</span>
                    </div>
                  )}
                  {compensationError && (
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-4 w-4" />
                      <span>Error: {compensationError.message}</span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setShowCalculation(false)}
                        className="ml-auto"
                      >
                        Close
                      </Button>
                    </div>
                  )}
                  {!calculatingComp && !compensationError && !calculatedCompensation && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>No calculation data available</span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setShowCalculation(false)}
                        className="ml-auto"
                      >
                        Close
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Calculation Results */}
              {showCalculation && calculatedCompensation && (
                <div className="bg-blue-50 rounded-lg p-4" data-testid="compensation-results">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Compensation Calculation Results
                  </h3>
                  
                  {/* Hours breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <>
                      <div className="bg-white p-3 rounded border border-blue-200">
                        <p className="text-xs text-gray-500">Standard Hours</p>
                        <p className="text-lg font-bold">{calculatedCompensation.regularHours?.toFixed(2) || 0}h</p>
                        <p className="text-xs text-gray-400">Budget Allocated Rate</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-orange-200">
                        <p className="text-xs text-gray-500">Mileage</p>
                        <p className="text-lg font-bold text-orange-600">{calculatedCompensation.totalMileage || 0} km</p>
                        <p className="text-xs text-gray-400">Travel Distance</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-blue-200">
                        <p className="text-xs text-gray-500">Weekend Hours</p>
                        <p className="text-lg font-bold text-blue-600">{calculatedCompensation.weekendHours?.toFixed(2) || 0}h</p>
                        <p className="text-xs text-gray-400">Budget Rate</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-green-200">
                        <p className="text-xs text-gray-500">Holiday Hours</p>
                        <p className="text-lg font-bold text-green-600">{calculatedCompensation.holidayHours?.toFixed(2) || 0}h</p>
                        <p className="text-xs text-gray-400">Holiday Budget Rate</p>
                      </div>
                    </>
                  </div>
                  
                  {/* Compensation breakdown */}
                  <div className="bg-white rounded p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Base Compensation</span>
                      <span className="font-medium">€{calculatedCompensation.baseCompensation?.toFixed(2) || 0}</span>
                    </div>
                    {calculatedCompensation.overtimeCompensation > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Overtime Compensation</span>
                        <span className="font-medium text-orange-600">€{calculatedCompensation.overtimeCompensation?.toFixed(2) || 0}</span>
                      </div>
                    )}
                    {calculatedCompensation.weekendCompensation > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Weekend Compensation</span>
                        <span className="font-medium text-blue-600">€{calculatedCompensation.weekendCompensation?.toFixed(2) || 0}</span>
                      </div>
                    )}
                    {calculatedCompensation.holidayCompensation > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Holiday Compensation</span>
                        <span className="font-medium text-green-600">€{calculatedCompensation.holidayCompensation?.toFixed(2) || 0}</span>
                      </div>
                    )}
                    {calculatedCompensation.mileageReimbursement > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Mileage Reimbursement</span>
                        <span className="font-medium">€{calculatedCompensation.mileageReimbursement?.toFixed(2) || 0}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 mt-2 border-t border-gray-200">
                      <span className="font-semibold text-gray-700">Total Compensation</span>
                      <span className="text-xl font-bold text-green-600">€{calculatedCompensation.totalCompensation?.toFixed(2) || 0}</span>
                    </div>
                  </div>
                  
                  {/* Budget Allocation Selection */}
                  <div className="mt-4 bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Euro className="h-4 w-4" />
                      Select Budget Allocation
                    </h4>
                    <p className="text-xs text-gray-600 mb-3">
                      Choose which client budget(s) should pay for this compensation period.
                    </p>
                    
                    {/* Group allocations by client for dropdown display */}
                    {(() => {
                      // Group budget allocations by client
                      const clientBudgets = availableBudgetAllocations.reduce((acc, allocation) => {
                        const clientId = allocation.clientId;
                        if (!acc[clientId]) {
                          acc[clientId] = {
                            clientName: allocation.clientName,
                            allocations: []
                          };
                        }
                        acc[clientId].allocations.push(allocation);
                        return acc;
                      }, {} as Record<string, { clientName: string; allocations: any[] }>);

                      const hasAllocations = Object.keys(clientBudgets).length > 0;

                      // If no allocations, auto-select Assistenza Diretta
                      if (!hasAllocations) {
                        const assistenzaId = 'assistenza-diretta';
                        const totalCompensation = calculatedCompensation?.totalCompensation || 0;
                        
                        // Auto-add to selections if not already there
                        if (!selectedBudgetAllocations.includes(assistenzaId) && totalCompensation > 0) {
                          setTimeout(() => {
                            setSelectedBudgetAllocations([assistenzaId]);
                            setBudgetAmounts({
                              [assistenzaId]: totalCompensation
                            });
                          }, 100);
                        }
                      }

                      return hasAllocations ? (
                        <div className="space-y-3">
                          {Object.entries(clientBudgets).map(([clientId, { clientName, allocations }]) => (
                            <div key={clientId} className="bg-white rounded-lg border border-gray-200 p-3">
                              <div className="font-medium text-sm text-gray-900 mb-2">
                                {clientName}
                              </div>
                              
                              {/* Budget Type Dropdown for this client */}
                              <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-700">
                                  Select Budget Type
                                </label>
                                <select
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  value={selectedBudgetAllocations[0] || ''}
                                  onChange={(e) => {
                                    const selectedId = e.target.value;
                                    
                                    // Clear all previous selections (only one allowed)
                                    setSelectedBudgetAllocations([]);
                                    setBudgetAmounts({});
                                    
                                    // Add new selection
                                    if (selectedId) {
                                      if (selectedId === 'assistenza-diretta') {
                                        // Special handling for Assistenza Diretta (Direct Assistance)
                                        setSelectedBudgetAllocations([selectedId]);
                                        setBudgetAmounts({
                                          [selectedId]: calculatedCompensation?.totalCompensation || 0
                                        });
                                      } else {
                                        const allocation = allocations.find(a => a.id === selectedId);
                                        if (allocation) {
                                          const maxAvailable = parseFloat(allocation.allocatedAmount) - parseFloat(allocation.usedAmount);
                                          const compensationAmount = calculatedCompensation?.totalCompensation || 0;
                                          setSelectedBudgetAllocations([selectedId]);
                                          setBudgetAmounts({
                                            [selectedId]: Math.min(maxAvailable, compensationAmount)
                                          });
                                        }
                                      }
                                    }
                                  }}
                                >
                                  <option value="">Select a budget type...</option>
                                  {/* Always show Assistenza Diretta as first option - always enabled */}
                                  <option key="assistenza-diretta" value="assistenza-diretta">
                                    Assistenza Diretta - No allocation
                                  </option>
                                  
                                  {/* Show all other budget types */}
                                  {(() => {
                                    // Define all budget types (alphabetically sorted, excluding Assistenza Diretta)
                                    const mandatoryBudgetTypes = [
                                      'Educativa',
                                      'FP Base',
                                      'FP Qualificata',
                                      'HCP Base',
                                      'HCP Qualificata',
                                      'Legge 162',
                                      'RAC',
                                      'SAD Base',
                                      'SAD Qualificata'
                                    ];
                                    
                                    // Create a map of allocated budgets
                                    const allocatedMap = allocations.reduce((map, alloc) => {
                                      map[alloc.budgetTypeName] = alloc;
                                      return map;
                                    }, {} as Record<string, any>);
                                    
                                    // Display all budget types, showing availability
                                    return mandatoryBudgetTypes.map((typeName) => {
                                      const allocation = allocatedMap[typeName];
                                      
                                      // Educativa special handling - only if allocated
                                      if (typeName === 'Educativa') {
                                        if (allocation) {
                                          const maxAvailable = parseFloat(allocation.allocatedAmount) - parseFloat(allocation.usedAmount);
                                          const weekdayRate = allocation.weekdayRate || '0.00';
                                          const holidayRate = allocation.holidayRate || '0.00';
                                          return (
                                            <option key={allocation.id} value={allocation.id}>
                                              {typeName} - Special allocation (Manual rates)
                                            </option>
                                          );
                                        } else {
                                          // Educativa is disabled without allocation
                                          return (
                                            <option key="educativa-no-alloc" value="" disabled>
                                              {typeName} - No allocation
                                            </option>
                                          );
                                        }
                                      }
                                      
                                      if (allocation) {
                                        const maxAvailable = parseFloat(allocation.allocatedAmount) - parseFloat(allocation.usedAmount);
                                        const weekdayRate = allocation.weekdayRate || '0.00';
                                        const holidayRate = allocation.holidayRate || '0.00';
                                        return (
                                          <option key={allocation.id} value={allocation.id}>
                                            {typeName} - Available: €{maxAvailable.toFixed(2)} | Rates: €{weekdayRate}/€{holidayRate}
                                          </option>
                                        );
                                      } else {
                                        return (
                                          <option key={typeName} value="" disabled>
                                            {typeName} - No allocation
                                          </option>
                                        );
                                      }
                                    });
                                  })()}
                                </select>
                                
                                {/* Show selected budget details */}
                                {(() => {
                                  const selectedId = selectedBudgetAllocations[0];
                                  if (!selectedId) return null;
                                  
                                  // Handle special Assistenza Diretta case
                                  if (selectedId === 'assistenza-diretta') {
                                    const selectedAmount = budgetAmounts[selectedId] || 0;
                                    return (
                                      <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                        <div className="text-xs text-gray-600 space-y-1">
                                          <div className="font-medium">Assistenza Diretta - Direct Assistance</div>
                                          <div>No budget limit - manual allocation</div>
                                          <div>Rate: Manual entry</div>
                                        </div>
                                        <div className="mt-2">
                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Amount to charge (€)
                                          </label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={selectedAmount}
                                            disabled
                                            className="w-32 h-8 text-sm bg-gray-100"
                                          />
                                        </div>
                                      </div>
                                    );
                                  }
                                  
                                  // Regular allocation
                                  const selectedAllocation = allocations.find(a => a.id === selectedId);
                                  if (!selectedAllocation) return null;
                                  
                                  const maxAvailable = parseFloat(selectedAllocation.allocatedAmount) - parseFloat(selectedAllocation.usedAmount);
                                  const selectedAmount = budgetAmounts[selectedAllocation.id] || 0;
                                  
                                  return (
                                    <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                      <div className="text-xs text-gray-600 space-y-1">
                                        <div>Period: {format(new Date(selectedAllocation.startDate), 'MMM dd')} - {format(new Date(selectedAllocation.endDate), 'MMM dd, yyyy')}</div>
                                        <div>Used: €{selectedAllocation.usedAmount} of €{selectedAllocation.allocatedAmount}</div>
                                        <div>Weekday Rate: €{selectedAllocation.weekdayRate || '0.00'}/hour</div>
                                        <div>Holiday Rate: €{selectedAllocation.holidayRate || '0.00'}/hour</div>
                                      </div>
                                      <div className="mt-2">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          Amount to charge (€)
                                        </label>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          max={maxAvailable}
                                          value={selectedAmount}
                                          disabled
                                          className="w-32 h-8 text-sm bg-gray-100"
                                        />
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                          <p className="text-sm font-medium text-blue-700">Direct Assistance Selected</p>
                          <p className="text-xs text-blue-600 mt-1">No client budgets available - using Direct Assistance allocation</p>
                          <div className="mt-3 text-sm font-medium text-blue-800">
                            Amount: €{(calculatedCompensation?.totalCompensation || 0).toFixed(2)}
                          </div>
                        </div>
                      );
                    })()}
                    
                    {selectedBudgetAllocations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-yellow-200">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total Selected:</span>
                          <span className="font-medium">€{Object.values(budgetAmounts).reduce((sum, amount) => sum + amount, 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Compensation:</span>
                          <span className="font-medium">€{calculatedCompensation.totalCompensation?.toFixed(2) || 0}</span>
                        </div>
                        {Object.values(budgetAmounts).reduce((sum, amount) => sum + amount, 0) !== (calculatedCompensation.totalCompensation || 0) && (
                          <div className="mt-1 p-2 bg-yellow-100 rounded text-xs text-yellow-700">
                            <AlertCircle className="h-3 w-3 inline mr-1" />
                            Budget allocation (€{Object.values(budgetAmounts).reduce((sum, amount) => sum + amount, 0).toFixed(2)}) doesn't match compensation (€{calculatedCompensation.totalCompensation?.toFixed(2) || 0})
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={() => {
                        if (!periodStart || !periodEnd) return;
                        
                        // Validate budget allocation before saving
                        const totalBudgetAllocated = Object.values(budgetAmounts).reduce((sum, amount) => sum + amount, 0);
                        const totalCompensation = calculatedCompensation.totalCompensation || 0;
                        
                        if (selectedBudgetAllocations.length === 0) {
                          toast({
                            title: "Budget Allocation Required",
                            description: "Please select at least one budget allocation to pay for this compensation.",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        if (Math.abs(totalBudgetAllocated - totalCompensation) > 0.01) {
                          toast({
                            title: "Budget Allocation Mismatch",
                            description: `Budget allocation (€${totalBudgetAllocated.toFixed(2)}) must match compensation amount (€${totalCompensation.toFixed(2)}).`,
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        const compensationData = {
                          staffId: id,
                          periodStart: format(periodStart, "yyyy-MM-dd'T'00:00:00.000'Z'"),
                          periodEnd: format(periodEnd, "yyyy-MM-dd'T'23:59:59.999'Z'"),
                          regularHours: String(calculatedCompensation.regularHours || 0),
                          overtimeHours: String(calculatedCompensation.overtimeHours || 0), 
                          weekendHours: String(calculatedCompensation.weekendHours || 0),
                          holidayHours: String(calculatedCompensation.holidayHours || 0),
                          totalMileage: String(calculatedCompensation.totalMileage || 0),
                          baseCompensation: String(calculatedCompensation.baseCompensation || 0),
                          overtimeCompensation: String(calculatedCompensation.overtimeCompensation || 0),
                          weekendCompensation: String(calculatedCompensation.weekendCompensation || 0),
                          holidayCompensation: String(calculatedCompensation.holidayCompensation || 0),
                          mileageReimbursement: String(calculatedCompensation.mileageReimbursement || 0),
                          totalCompensation: String(calculatedCompensation.totalCompensation || 0),
                          status: 'pending_approval',
                          notes: `Compensation for period ${format(periodStart, 'MMM dd, yyyy')} - ${format(periodEnd, 'MMM dd, yyyy')}`,
                          budgetAllocations: selectedBudgetAllocations.map(allocationId => ({
                            budgetAllocationId: allocationId,
                            amount: budgetAmounts[allocationId] || 0
                          }))
                        };
                        createCompensationMutation.mutate(compensationData);
                      }}
                      disabled={createCompensationMutation.isPending || selectedBudgetAllocations.length === 0}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {createCompensationMutation.isPending ? 'Saving...' : 'Save Compensation Record'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowCalculation(false)}
                      className="flex-1"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}





              {/* Compensation History */}
              {compensations.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Compensation History
                  </h3>
                  <div className="space-y-3">
                    {compensations
                      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                      .slice(0, 5)
                      .map((comp) => (
                      <div key={comp.id} className="bg-white p-3 rounded border border-gray-200 hover:shadow-sm transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {format(new Date(comp.periodStart), 'MMM dd')} - {format(new Date(comp.periodEnd), 'MMM dd, yyyy')}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              Created: {format(new Date(comp.createdAt || 0), 'MMM dd, yyyy - HH:mm')}
                            </p>
                            {comp.notes && (
                              <p className="text-xs text-gray-500 mt-1">{comp.notes}</p>
                            )}
                            <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-gray-600">
                              <div>
                                <span className="text-gray-400">Regular: </span>
                                <span className="font-medium">{parseFloat(comp.regularHours).toFixed(1)}h</span>
                              </div>
                              {parseFloat(comp.overtimeHours) > 0 && (
                                <div>
                                  <span className="text-gray-400">Overtime: </span>
                                  <span className="font-medium text-orange-600">{parseFloat(comp.overtimeHours).toFixed(1)}h</span>
                                </div>
                              )}
                              {parseFloat(comp.holidayHours) > 0 && (
                                <div>
                                  <span className="text-gray-400">Holiday: </span>
                                  <span className="font-medium text-green-600">{parseFloat(comp.holidayHours).toFixed(1)}h</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge 
                              variant={
                                comp.status === 'paid' ? 'default' :
                                comp.status === 'approved' ? 'secondary' :
                                comp.status === 'pending_approval' ? 'outline' : 'destructive'
                              }
                              className="mb-2"
                            >
                              {comp.status === 'pending_approval' ? 'Pending' : 
                               comp.status === 'approved' ? 'Approved' :
                               comp.status === 'paid' ? 'Paid' : comp.status}
                            </Badge>
                            <div className="text-lg font-bold text-green-600">
                              €{parseFloat(comp.totalCompensation).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                          {comp.status === 'pending_approval' && (
                            <Button
                              size="sm"
                              onClick={() => approveCompensationMutation.mutate(comp.id)}
                              disabled={approveCompensationMutation.isPending}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              data-testid={`button-approve-${comp.id}`}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Approve
                            </Button>
                          )}
                          {comp.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markPaidMutation.mutate(comp.id)}
                              disabled={markPaidMutation.isPending}
                              data-testid={`button-mark-paid-${comp.id}`}
                            >
                              <Euro className="mr-1 h-3 w-3" />
                              Mark Paid
                            </Button>
                          )}
                          {comp.status === 'paid' && staffMember && (
                            <CompensationSlip 
                              compensation={comp}
                              staff={staffMember}
                              clients={clients}
                            />
                          )}
                          {comp.paySlipGenerated && comp.status !== 'paid' && staffMember && (
                            <CompensationSlip 
                              compensation={comp}
                              staff={staffMember}
                              clients={clients}
                            />
                          )}
                          
                          {/* Delete button - Now shows for all status types including paid */}
                          <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                                  data-testid={`button-delete-${comp.id}`}
                                >
                                  <Trash2 className="mr-1 h-3 w-3" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Compensation Record</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this compensation record for the period 
                                    {format(new Date(comp.periodStart), ' MMM dd')} - {format(new Date(comp.periodEnd), 'MMM dd, yyyy')}?
                                    <br />
                                    <strong>This action cannot be undone.</strong>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel data-testid={`button-cancel-delete-${comp.id}`}>
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteCompensationMutation.mutate(comp.id)}
                                    disabled={deleteCompensationMutation.isPending}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    data-testid={`button-confirm-delete-${comp.id}`}
                                  >
                                    {deleteCompensationMutation.isPending ? "Deleting..." : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                        </div>
                      </div>
                    ))}
                    
                    {compensations.length > 5 && (
                      <div className="text-center pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/compensation-dashboard?staffId=${id}`)}
                        >
                          View All ({compensations.length} total)
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>
      </div>
    </div>
  );
}