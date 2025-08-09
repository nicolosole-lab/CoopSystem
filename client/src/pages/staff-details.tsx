import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CompensationSlip from "@/components/CompensationSlip";
import { ArrowLeft, User, Phone, Mail, DollarSign, Users, Clock, Calendar, Briefcase, FileText, Calculator, Settings, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, RefreshCw, Plus, UserPlus, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

  const { data: calculatedCompensation, isLoading: calculatingComp } = useQuery<any>({
    queryKey: [`/api/staff/${id}/calculate-compensation`, periodStart, periodEnd],
    queryFn: async () => {
      if (!periodStart || !periodEnd) return null;
      const response = await fetch(`/api/staff/${id}/calculate-compensation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ periodStart, periodEnd }),
      });
      if (!response.ok) throw new Error('Failed to calculate compensation');
      return response.json();
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
        isActive: true
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

  // Form submission handler
  const handleRateSubmit = (data: StaffRateFormData) => {
    createStaffRateMutation.mutate(data);
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

  // Filter logs by date range
  const filteredLogs = timeLogs.filter(log => {
    const logDate = new Date(log.serviceDate);
    
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
  const totalEarnings = timeLogs.reduce((sum, log) => sum + parseFloat(log.totalCost), 0);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/staff">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Staff
            </Button>
          </Link>
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
                <span className="text-sm font-medium text-gray-600">Total Earnings</span>
                <span className="text-lg font-bold text-green-600">€{totalEarnings.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Service Logs</span>
                <span className="text-lg font-bold text-gray-700">{timeLogs.length}</span>
              </div>
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
                {staffMember.importHistory && Array.isArray(staffMember.importHistory) && (staffMember.importHistory as any[]).length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <span className="text-gray-600 block mb-2">Import Actions:</span>
                    <div className="space-y-1">
                      {(staffMember.importHistory as Array<any>).slice(-5).reverse().map((history: any, idx: number) => (
                        <div key={idx} className="text-xs flex justify-between">
                          <span className="text-gray-700">{history?.action || 'Unknown'}</span>
                          <span className="text-gray-500">
                            {history?.timestamp ? new Date(history.timestamp).toLocaleDateString() : 'N/A'}
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
                          onSelect={setLogStartDate}
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
                          onSelect={setLogEndDate}
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
                    {filteredLogs.slice(0, 10).map((log) => {
                      const client = clients.find(c => c.id === log.clientId);
                      return (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {new Date(log.serviceDate).toLocaleDateString()}
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
                    })}
                  </tbody>
                </table>
                {filteredLogs.length > 10 && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">
                      Showing 10 of {filteredLogs.length} logs
                    </p>
                  </div>
                )}
              </div>
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
            <CardContent className="pt-6">
            {/* Period Selection */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Compensation Period</h3>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm text-gray-600 mb-1 block">Period Start</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !periodStart && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {periodStart ? format(periodStart, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={periodStart}
                        onSelect={setPeriodStart}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm text-gray-600 mb-1 block">Period End</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !periodEnd && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {periodEnd ? format(periodEnd, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={periodEnd}
                        onSelect={setPeriodEnd}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={() => setShowCalculation(true)}
                    disabled={!periodStart || !periodEnd || calculatingComp}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    Calculate Compensation
                  </Button>
                </div>
              </div>
            </div>

            {/* Calculation Results */}
            {showCalculation && calculatedCompensation && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Compensation Calculation</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Regular Hours</p>
                    <p className="text-lg font-bold">{calculatedCompensation.regularHours?.toFixed(2) || 0}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Overtime Hours</p>
                    <p className="text-lg font-bold text-orange-600">{calculatedCompensation.overtimeHours?.toFixed(2) || 0}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Weekend Hours</p>
                    <p className="text-lg font-bold text-blue-600">{calculatedCompensation.weekendHours?.toFixed(2) || 0}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Holiday Hours</p>
                    <p className="text-lg font-bold text-green-600">{calculatedCompensation.holidayHours?.toFixed(2) || 0}h</p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Base Compensation</span>
                      <span className="font-semibold">€{calculatedCompensation.baseCompensation?.toFixed(2) || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Overtime Compensation</span>
                      <span className="font-semibold text-orange-600">€{calculatedCompensation.overtimeCompensation?.toFixed(2) || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Weekend Compensation</span>
                      <span className="font-semibold text-blue-600">€{calculatedCompensation.weekendCompensation?.toFixed(2) || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Holiday Compensation</span>
                      <span className="font-semibold text-green-600">€{calculatedCompensation.holidayCompensation?.toFixed(2) || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Mileage Reimbursement</span>
                      <span className="font-semibold">€{calculatedCompensation.mileageReimbursement?.toFixed(2) || 0}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-semibold text-gray-700">Total Compensation</span>
                      <span className="text-xl font-bold text-green-600">€{calculatedCompensation.totalCompensation?.toFixed(2) || 0}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={() => {
                        if (!periodStart || !periodEnd) return;
                        const compensationData = {
                          staffId: id,
                          periodStart: periodStart.toISOString(),
                          periodEnd: periodEnd.toISOString(),
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
                          notes: `Compensation for period ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`
                        };
                        console.log('Sending compensation data:', compensationData);
                        createCompensationMutation.mutate(compensationData);
                      }}
                      disabled={createCompensationMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Save Compensation Record
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowCalculation(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Rate Configuration Section */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Staff Rate Configuration
                </h3>
                <Dialog open={showRateDialog} onOpenChange={setShowRateDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline"
                      data-testid="button-configure-rates"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {staffRates.length > 0 ? "Add New Rate" : "Configure Rates"}
                    </Button>
                  </DialogTrigger>
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
                        <div className="grid grid-cols-2 gap-4">
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
              </div>

              {/* Display existing rates */}
              {staffRates.length > 0 ? (
                <div className="space-y-3">
                  {staffRates.filter(r => r.isActive).map((rate, index) => (
                    <div key={rate.id} className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm p-3 bg-white rounded border">
                      <div>
                        <span className="text-gray-600">Standard Rate:</span>
                        <span className="ml-2 font-semibold">€{rate.weekdayRate}/hr</span>
                        <div className="text-xs text-gray-500">Mon - Sun</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Holiday Rate:</span>
                        <span className="ml-2 font-semibold">€{rate.holidayRate}/hr</span>
                        <div className="text-xs text-gray-500">Italian official holidays</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Overtime:</span>
                        <span className="ml-2 font-semibold">x{rate.overtimeMultiplier}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Mileage:</span>
                        <span className="ml-2 font-semibold">€{rate.mileageRatePerKm}/km</span>
                      </div>
                    </div>
                  ))}
                  {staffRates.filter(r => r.isActive).length === 0 && (
                    <div className="text-center py-8">
                      <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-sm text-gray-500 mb-4">
                        No active rates configured for this staff member.
                      </p>
                      <p className="text-xs text-gray-400">
                        Configure rates to enable compensation calculations.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-500 mb-4">
                    No rates configured for this staff member.
                  </p>
                  <p className="text-xs text-gray-400">
                    Click "Configure Rates" to set up compensation rates.
                  </p>
                </div>
              )}
            </div>

            {/* Compensation History */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Compensation History</h3>
              {compensations.length > 0 ? (
                <div className="space-y-3">
                  {compensations
                    .sort((a, b) => new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime())
                    .map((comp) => (
                    <div 
                      key={comp.id} 
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/compensation/${comp.id}/budget-allocation`)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {comp.periodStart && comp.periodEnd ? (
                              `${format(new Date(comp.periodStart), 'MMM dd, yyyy')} - ${format(new Date(comp.periodEnd), 'MMM dd, yyyy')}`
                            ) : (
                              'No date range'
                            )}
                          </p>
                          <p className="text-sm text-gray-600">
                            Total: <span className="font-bold text-green-600">€{parseFloat(comp.totalCompensation).toFixed(2)}</span>
                          </p>
                          {comp.createdAt && (
                            <p className="text-xs text-gray-500 mt-1">
                              Created: {format(new Date(comp.createdAt), 'MMM dd, yyyy HH:mm')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {(comp.status === 'pending' || comp.status === 'pending_approval' || comp.status === 'draft') && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Pending Approval
                            </Badge>
                          )}
                          {comp.status === 'approved' && (
                            <>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Approved
                              </Badge>
                              {staffMember && (
                                <CompensationSlip 
                                  compensation={comp} 
                                  staff={staffMember} 
                                  clients={clients}
                                />
                              )}
                            </>
                          )}
                          {comp.status === 'paid' && (
                            <>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Paid
                              </Badge>
                              {staffMember && (
                                <CompensationSlip 
                                  compensation={comp} 
                                  staff={staffMember} 
                                  clients={clients}
                                />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                        <div>Regular: {parseFloat(comp.regularHours).toFixed(2)}h</div>
                        <div>Overtime: {parseFloat(comp.overtimeHours).toFixed(2)}h</div>
                        <div>Weekend: {parseFloat(comp.weekendHours).toFixed(2)}h</div>
                        <div>Holiday: {parseFloat(comp.holidayHours).toFixed(2)}h</div>
                      </div>
                      {(comp.status === 'pending' || comp.status === 'pending_approval' || comp.status === 'draft') && (
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              approveCompensationMutation.mutate(comp.id);
                            }}
                            disabled={approveCompensationMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Approve
                          </Button>
                        </div>
                      )}
                      {comp.status === 'approved' && (
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markPaidMutation.mutate(comp.id);
                            }}
                            disabled={markPaidMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Mark as Paid
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No compensation records found</p>
              )}
            </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}