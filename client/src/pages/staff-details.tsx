import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CompensationSlip from "@/components/CompensationSlip";
import { ArrowLeft, User, Phone, Mail, DollarSign, Users, Clock, Calendar, Briefcase, FileText, Calculator, Settings, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, RefreshCw, Plus, UserPlus, X, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Staff, Client, ClientStaffAssignment, TimeLog, StaffRate, StaffCompensation, InsertStaffRate } from "@shared/schema";

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
  const [showRateDialog, setShowRateDialog] = useState(false);
  const [showAddClientDialog, setShowAddClientDialog] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientAssignmentType, setClientAssignmentType] = useState("secondary");
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;
  const [selectedBudgetAllocations, setSelectedBudgetAllocations] = useState<string[]>([]);
  const [budgetAmounts, setBudgetAmounts] = useState<{[key: string]: number}>({});

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

  const { data: staffRates = [] } = useQuery<StaffRate[]>({
    queryKey: [`/api/staff/${id}/rates`],
    enabled: !!id,
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

  // Initialize form with default values
  const rateForm = useForm<StaffRateFormData>({
    resolver: zodResolver(staffRateFormSchema),
    defaultValues: {
      standardRate: "20.00",
      holidayRate: "30.00",
      overtimeMultiplier: "1.50",
      mileageRatePerKm: "0.50",
      effectiveFrom: new Date()
    }
  });

  // Handle rate form submission
  const handleRateSubmit = (data: StaffRateFormData) => {
    createStaffRateMutation.mutate(data);
  };

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

  // Mutation for creating staff rates
  const createStaffRateMutation = useMutation({
    mutationFn: async (data: StaffRateFormData) => {
      const payload = {
        staffId: id,
        serviceTypeId: null, // General rate applies to all services
        weekdayRate: data.standardRate, // Mon-Sun all use standard rate
        weekendRate: data.standardRate, // Same rate for all days
        holidayRate: data.holidayRate, // Only Italian holidays are different
        overtimeMultiplier: data.overtimeMultiplier,
        mileageRatePerKm: data.mileageRatePerKm,
        effectiveFrom: new Date(data.effectiveFrom).toISOString(), // Ensure it's a Date object first
        isActive: staffRates.length === 0 // Set as active if it's the first rate
      };
      
      const response = await apiRequest("POST", `/api/staff/${id}/rates`, payload);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${id}/rates`] });
      toast({
        title: "Success",
        description: "Staff rates configured successfully",
      });
      setShowRateDialog(false);
      rateForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to configure staff rates",
        variant: "destructive",
      });
    },
  });

  // Mutation for toggling rate active status
  const toggleRateActiveMutation = useMutation({
    mutationFn: async (rateId: string) => {
      const response = await apiRequest("PUT", `/api/staff/rates/${rateId}/toggle-active`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${id}/rates`] });
      toast({
        title: "Success",
        description: "Rate status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update rate status",
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
    <div className="container mx-auto px-4 py-8">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
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
                  {staffMember.firstName} {staffMember.lastName}
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
              <div>
                <label className="text-sm font-medium text-gray-600">Hourly Rate</label>
                <p className="text-lg font-semibold text-green-600">
                  €{staffMember.hourlyRate ? parseFloat(staffMember.hourlyRate).toFixed(2) : '0.00'}/hr
                </p>
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
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-500" />
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-gray-900">{staffMember.email || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-500" />
                <div>
                  <label className="text-sm font-medium text-gray-600">Phone</label>
                  <p className="text-gray-900">{staffMember.phone || 'Not provided'}</p>
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
                                    {client.firstName} {client.lastName} - {client.fiscalCode || 'No Fiscal Code'}
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
        <div className="space-y-6">
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

          {/* Earnings Statistics */}
          <Card className="care-card">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Earnings Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Total Hours</span>
                <span className="text-lg font-bold text-blue-600">{totalHours.toFixed(2)}h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Total Earnings (All Time)</span>
                <span className="text-lg font-bold text-green-600">€{totalEarnings.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Service Logs</span>
                <span className="text-lg font-bold text-gray-700">{timeLogs.length}</span>
              </div>
              
              {/* Monthly Earnings Breakdown */}
              {compensations.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Monthly Earnings</h4>
                  <div className="space-y-2">
                    {(() => {
                      const monthlyEarnings = compensations
                        .filter(comp => comp.status === 'approved' || comp.status === 'paid')
                        .reduce((acc: { [key: string]: number }, comp) => {
                          const monthKey = format(new Date(comp.periodEnd), 'MMM yyyy');
                          acc[monthKey] = (acc[monthKey] || 0) + parseFloat(comp.totalCompensation);
                          return acc;
                        }, {});
                      
                      return Object.entries(monthlyEarnings)
                        .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                        .slice(0, 3)
                        .map(([month, amount]) => (
                          <div key={month} className="flex justify-between text-sm">
                            <span className="text-gray-600">{month}</span>
                            <span className="font-medium text-gray-900">€{amount.toFixed(2)}</span>
                          </div>
                        ));
                    })()}
                  </div>
                </div>
              )}
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
              <CardContent className="pt-6 space-y-2 text-sm">
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
                      {staffMember.importHistory.slice(-5).reverse().map((history, idx) => (
                        <div key={idx} className="text-xs flex justify-between">
                          <span className="text-gray-700">
                            {typeof history === 'object' && history && 'action' in history ? String(history.action) : 'Unknown'}
                          </span>
                          <span className="text-gray-500">
                            {typeof history === 'object' && history && 'timestamp' in history && history.timestamp 
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
            <CardContent className="pt-6">
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
                              <td className="py-3 px-4 text-sm text-gray-900">
                                {client ? `${client.firstName} ${client.lastName}` : 'Unknown Client'}
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
            <CardContent className="pt-6 space-y-6">
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
                      onClick={() => setShowCalculation(true)}
                      disabled={!periodStart || !periodEnd || calculatingComp}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Calculator className="mr-2 h-4 w-4" />
                      Calculate Compensation
                    </Button>
                  </div>
                </div>
              </div>

              {/* Staff Rate Configuration */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Staff Rate Configuration
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => setShowRateDialog(true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add New Rate
                  </Button>
                </div>
                
                {/* Display all rates with toggle functionality */}
                {staffRates && staffRates.length > 0 ? (
                  <div className="space-y-4">
                    {/* Current active rate summary */}
                    {(() => {
                      const activeRate = staffRates.find(r => r.isActive);
                      if (activeRate) {
                        return (
                          <div className="mb-4">
                            <p className="text-xs font-medium text-gray-600 mb-2">Currently Active Rate</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="bg-white p-3 rounded border border-gray-200">
                                <p className="text-xs text-gray-500">Standard Rate</p>
                                <p className="text-lg font-semibold">€{activeRate.weekdayRate}/hr</p>
                                <p className="text-xs text-gray-400">Mon - Sun</p>
                              </div>
                              <div className="bg-white p-3 rounded border border-gray-200">
                                <p className="text-xs text-gray-500">Holiday Rate</p>
                                <p className="text-lg font-semibold text-green-600">€{activeRate.holidayRate}/hr</p>
                                <p className="text-xs text-gray-400">Italian official holidays</p>
                              </div>
                              <div className="bg-white p-3 rounded border border-gray-200">
                                <p className="text-xs text-gray-500">Overtime</p>
                                <p className="text-lg font-semibold text-orange-600">x{activeRate.overtimeMultiplier}</p>
                                <p className="text-xs text-gray-400">After 40hrs/week</p>
                              </div>
                              <div className="bg-white p-3 rounded border border-gray-200">
                                <p className="text-xs text-gray-500">Mileage</p>
                                <p className="text-lg font-semibold">€{activeRate.mileageRatePerKm}/km</p>
                                <p className="text-xs text-gray-400">Travel reimbursement</p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {/* All rates list with toggle */}
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">All Rate Configurations ({staffRates.length})</p>
                      <div className="space-y-2">
                        {staffRates.sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()).map((rate) => (
                          <div key={rate.id} className={`bg-white p-3 rounded border ${rate.isActive ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <div>
                                    <p className="text-sm font-medium">
                                      €{rate.weekdayRate}/hr (Standard) | €{rate.holidayRate}/hr (Holiday)
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Effective from: {format(new Date(rate.effectiveFrom), 'MMM dd, yyyy')}
                                      {rate.effectiveTo && ` - ${format(new Date(rate.effectiveTo), 'MMM dd, yyyy')}`}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Overtime: x{rate.overtimeMultiplier} | Mileage: €{rate.mileageRatePerKm}/km
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {rate.isActive ? (
                                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                                ) : (
                                  <Badge variant="outline">Inactive</Badge>
                                )}
                                <Button
                                  size="sm"
                                  variant={rate.isActive ? "outline" : "default"}
                                  onClick={() => toggleRateActiveMutation.mutate(rate.id)}
                                  disabled={toggleRateActiveMutation.isPending}
                                  className={rate.isActive ? "" : "bg-blue-600 hover:bg-blue-700"}
                                >
                                  {rate.isActive ? "Deactivate" : "Activate"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                    <p className="text-sm">No rates configured for this staff member</p>
                    <p className="text-xs mt-1">Click "Add New Rate" to configure compensation rates</p>
                  </div>
                )}
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
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Compensation Calculation Results
                  </h3>
                  
                  {/* Hours breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {(() => {
                      // Get the most recent active rate or the latest rate
                      const activeRates = staffRates.filter(r => r.isActive);
                      const currentRate = activeRates.length > 0 
                        ? activeRates.sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime())[0]
                        : staffRates.sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime())[0];
                      
                      return (
                        <>
                          <div className="bg-white p-3 rounded border border-blue-200">
                            <p className="text-xs text-gray-500">Standard Hours</p>
                            <p className="text-lg font-bold">{calculatedCompensation.regularHours?.toFixed(2) || 0}h</p>
                            <p className="text-xs text-gray-400">€{currentRate?.weekdayRate || '20.00'}/hr</p>
                          </div>
                          <div className="bg-white p-3 rounded border border-orange-200">
                            <p className="text-xs text-gray-500">Overtime Hours</p>
                            <p className="text-lg font-bold text-orange-600">{calculatedCompensation.overtimeHours?.toFixed(2) || 0}h</p>
                            <p className="text-xs text-gray-400">x{currentRate?.overtimeMultiplier || '1.50'}</p>
                          </div>
                          <div className="bg-white p-3 rounded border border-blue-200">
                            <p className="text-xs text-gray-500">Weekend Hours</p>
                            <p className="text-lg font-bold text-blue-600">{calculatedCompensation.weekendHours?.toFixed(2) || 0}h</p>
                            <p className="text-xs text-gray-400">Same as standard</p>
                          </div>
                          <div className="bg-white p-3 rounded border border-green-200">
                            <p className="text-xs text-gray-500">Holiday Hours</p>
                            <p className="text-lg font-bold text-green-600">{calculatedCompensation.holidayHours?.toFixed(2) || 0}h</p>
                            <p className="text-xs text-gray-400">€{currentRate?.holidayRate || '30.00'}/hr</p>
                          </div>
                        </>
                      );
                    })()}
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
                      <DollarSign className="h-4 w-4" />
                      Select Budget Allocation
                    </h4>
                    <p className="text-xs text-gray-600 mb-3">
                      Choose which client budget(s) should pay for this compensation period.
                    </p>
                    
                    {availableBudgetAllocations.length > 0 ? (
                      <div className="space-y-3 max-h-48 overflow-y-auto">
                        {availableBudgetAllocations.map((allocation) => {
                          const isSelected = selectedBudgetAllocations.includes(allocation.id);
                          const selectedAmount = budgetAmounts[allocation.id] || 0;
                          const maxAvailable = parseFloat(allocation.allocatedAmount) - parseFloat(allocation.usedAmount);
                          
                          return (
                            <div key={allocation.id} className={`bg-white rounded border p-3 ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <input
                                      type="checkbox"
                                      id={`budget-${allocation.id}`}
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedBudgetAllocations(prev => [...prev, allocation.id]);
                                          setBudgetAmounts(prev => ({...prev, [allocation.id]: Math.min(maxAvailable, calculatedCompensation.totalCompensation || 0)}));
                                        } else {
                                          setSelectedBudgetAllocations(prev => prev.filter(id => id !== allocation.id));
                                          setBudgetAmounts(prev => {
                                            const newAmounts = {...prev};
                                            delete newAmounts[allocation.id];
                                            return newAmounts;
                                          });
                                        }
                                      }}
                                      className="rounded"
                                    />
                                    <label htmlFor={`budget-${allocation.id}`} className="font-medium text-sm text-gray-900 cursor-pointer">
                                      {allocation.clientName}
                                    </label>
                                    <Badge variant="outline" className="text-xs">
                                      {allocation.budgetTypeName}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-gray-600 space-y-1">
                                    <div>Available: €{maxAvailable.toFixed(2)} (€{allocation.allocatedAmount} - €{allocation.usedAmount} used)</div>
                                    <div>Period: {format(new Date(allocation.startDate), 'MMM dd')} - {format(new Date(allocation.endDate), 'MMM dd, yyyy')}</div>
                                  </div>
                                  {isSelected && (
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
                                        onChange={(e) => {
                                          const value = Math.min(parseFloat(e.target.value) || 0, maxAvailable);
                                          setBudgetAmounts(prev => ({...prev, [allocation.id]: value}));
                                        }}
                                        className="w-24 h-7 text-xs"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-3 text-blue-50 border border-blue-200 rounded-lg">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                        <p className="text-sm font-medium text-blue-700">Using Direct Assistance Budget</p>
                        <p className="text-xs text-blue-600">No specific client budgets found - using fallback allocation</p>
                        {/* Auto-select Direct assistance budget type */}
                        {(() => {
                          // Automatically create a virtual "Direct assistance" allocation
                          const directAssistanceId = 'direct-assistance-fallback';
                          const totalCompensation = calculatedCompensation?.totalCompensation || 0;
                          
                          // Auto-add to selections if not already there
                          if (!selectedBudgetAllocations.includes(directAssistanceId) && totalCompensation > 0) {
                            setTimeout(() => {
                              setSelectedBudgetAllocations([directAssistanceId]);
                              setBudgetAmounts(prev => ({
                                ...prev,
                                [directAssistanceId]: totalCompensation
                              }));
                            }, 100);
                          }
                          
                          return (
                            <div className="mt-2 text-xs text-blue-600">
                              <span className="font-medium">Amount: €{totalCompensation.toFixed(2)}</span>
                              <span className="mx-2">•</span>
                              <span>Budget Type: Direct Assistance</span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    
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

              {/* Rate Configuration Dialog */}
              <Dialog open={showRateDialog} onOpenChange={setShowRateDialog}>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Configure Staff Rates</DialogTitle>
                      <DialogDescription>
                        Set the hourly rates and compensation details for this staff member. 
                        These rates will be used for compensation calculations.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...rateForm}>
                      <form onSubmit={rateForm.handleSubmit(handleRateSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={rateForm.control}
                            name="standardRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Standard Rate (€/hour)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="20.00"
                                    data-testid="input-standard-rate"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Monday through Sunday hourly rate
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={rateForm.control}
                            name="holidayRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Holiday Rate (€/hour)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="30.00"
                                    data-testid="input-holiday-rate"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Italian official holidays only
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={rateForm.control}
                            name="overtimeMultiplier"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Overtime Multiplier</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="1.0"
                                    placeholder="1.50"
                                    data-testid="input-overtime-multiplier"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Overtime rate multiplier (e.g., 1.5 for 150%)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={rateForm.control}
                            name="mileageRatePerKm"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Mileage Rate (€/km)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.50"
                                    data-testid="input-mileage-rate"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Travel reimbursement per kilometer
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={rateForm.control}
                          name="effectiveFrom"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Effective From</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                      data-testid="button-effective-date"
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <CalendarComponent
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) =>
                                      date < new Date("1900-01-01")
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormDescription>
                                When these rates become effective
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowRateDialog(false)}
                            data-testid="button-cancel-rates"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={createStaffRateMutation.isPending}
                            data-testid="button-save-rates"
                          >
                            {createStaffRateMutation.isPending ? "Saving..." : "Save Rates"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>



              {/* Compensation History */}
              {compensations.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Compensation History
                  </h3>
                  <div className="space-y-3">
                    {compensations
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 5)
                      .map((comp) => (
                      <div key={comp.id} className="bg-white p-3 rounded border border-gray-200 hover:shadow-sm transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {format(new Date(comp.periodStart), 'MMM dd')} - {format(new Date(comp.periodEnd), 'MMM dd, yyyy')}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              Created: {format(new Date(comp.createdAt), 'MMM dd, yyyy - HH:mm')}
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
                              <DollarSign className="mr-1 h-3 w-3" />
                              Mark Paid
                            </Button>
                          )}
                          {comp.paySlipGenerated && staffMember && (
                            <CompensationSlip 
                              compensation={comp}
                              staff={staffMember}
                              clients={clients}
                            />
                          )}
                          
                          {/* Delete button - Only show for pending or rejected status */}
                          {(comp.status === 'pending_approval' || comp.status === 'rejected') && (
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
                          )}
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
  );
}