import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Phone, Mail, DollarSign, Users, Clock, Calendar, Briefcase, FileText, Calculator, Settings, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import type { Staff, Client, ClientStaffAssignment, TimeLog, StaffRate, StaffCompensation } from "@shared/schema";

type StaffWithDetails = Staff & { 
  clientAssignments?: (ClientStaffAssignment & { client: Client })[];
  timeLogs?: TimeLog[];
};

export default function StaffDetails() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [periodStart, setPeriodStart] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [periodEnd, setPeriodEnd] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  );
  const [showCalculation, setShowCalculation] = useState(false);

  const { data: staffMember, isLoading: staffLoading, error: staffError } = useQuery<StaffWithDetails>({
    queryKey: [`/api/staff/${id}`],
    enabled: !!id,
  });

  const { data: clientAssignments = [], isLoading: clientsLoading } = useQuery<(ClientStaffAssignment & { client: Client })[]>({
    queryKey: [`/api/staff/${id}/client-assignments`],
    enabled: !!id && !!staffMember,
  });

  const { data: timeLogs = [], isLoading: logsLoading } = useQuery<TimeLog[]>({
    queryKey: [`/api/time-logs?staffId=${id}`],
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
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Assigned Clients ({clientAssignments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {clientAssignments.length > 0 ? (
                <div className="space-y-3">
                  {clientAssignments.map((assignment) => (
                    <Link key={assignment.id} href={`/client/${assignment.clientId}`}>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
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
                        <Badge 
                          variant="outline" 
                          className={assignment.assignmentType === 'primary' 
                            ? 'border-blue-500 text-blue-700 bg-blue-50' 
                            : 'border-gray-400 text-gray-600'}
                        >
                          {assignment.assignmentType || 'secondary'}
                        </Badge>
                      </div>
                    </Link>
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
        </div>
      </div>

      {/* Service Logs Section */}
      <div className="mt-8">
        <Card className="care-card">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Service Logs
            </CardTitle>
            <CardDescription>
              Recent service activities and time entries
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {timeLogs.length > 0 ? (
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
                    {timeLogs.slice(0, 10).map((log) => {
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
                {timeLogs.length > 10 && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">
                      Showing 10 of {timeLogs.length} logs
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
        </Card>
      </div>

      {/* Compensation Management Section */}
      <div className="mt-8">
        <Card className="care-card">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Compensation Management
            </CardTitle>
            <CardDescription>
              Calculate and manage staff compensation for worked hours
            </CardDescription>
          </CardHeader>
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
                        const compensationData = {
                          staffId: id,
                          periodStart: new Date(periodStart).toISOString(),
                          periodEnd: new Date(periodEnd).toISOString(),
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
                          notes: `Compensation for period ${new Date(periodStart).toLocaleDateString()} - ${new Date(periodEnd).toLocaleDateString()}`
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

            {/* Active Rate Information */}
            {staffRates.length > 0 && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Active Rate Configuration
                </h3>
                {staffRates.filter(r => r.isActive).map((rate, index) => (
                  <div key={rate.id} className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Weekday:</span>
                      <span className="ml-2 font-semibold">€{rate.weekdayRate}/hr</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Weekend:</span>
                      <span className="ml-2 font-semibold">€{rate.weekendRate}/hr</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Holiday:</span>
                      <span className="ml-2 font-semibold">€{rate.holidayRate}/hr</span>
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
                  <p className="text-sm text-gray-500">No active rate configured. Please configure rates to calculate compensation.</p>
                )}
              </div>
            )}

            {/* Compensation History */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Compensation History</h3>
              {compensations.length > 0 ? (
                <div className="space-y-3">
                  {compensations.map((comp) => (
                    <div key={comp.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {format(new Date(comp.periodStart), 'MMM dd, yyyy')} - {format(new Date(comp.periodEnd), 'MMM dd, yyyy')}
                          </p>
                          <p className="text-sm text-gray-600">
                            Total: <span className="font-bold text-green-600">€{parseFloat(comp.totalCompensation).toFixed(2)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {(comp.status === 'pending' || comp.status === 'pending_approval' || comp.status === 'draft') && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Pending Approval
                            </Badge>
                          )}
                          {comp.status === 'approved' && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Approved
                            </Badge>
                          )}
                          {comp.status === 'paid' && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Paid
                            </Badge>
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
                            onClick={() => approveCompensationMutation.mutate(comp.id)}
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
                            onClick={() => markPaidMutation.mutate(comp.id)}
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
        </Card>
      </div>
    </div>
  );
}