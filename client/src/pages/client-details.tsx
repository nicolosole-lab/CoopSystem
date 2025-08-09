import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Phone, Mail, MapPin, Calendar, DollarSign, Users, Clock, FileText, Plus, X, UserPlus, Eye, Trash2, TrendingUp, Calculator } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Client, Staff, ClientStaffAssignment, TimeLog, StaffCompensation } from "@shared/schema";

type ClientWithDetails = Client & { 
  staffAssignments?: (ClientStaffAssignment & { staff: Staff })[];
  timeLogs?: TimeLog[];
};

export default function ClientDetails() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [assignmentType, setAssignmentType] = useState("secondary");

  const { data: client, isLoading: clientLoading, error: clientError } = useQuery<ClientWithDetails>({
    queryKey: [`/api/clients/${id}`],
    enabled: !!id,
  });

  const { data: staffAssignments = [], isLoading: staffLoading } = useQuery<(ClientStaffAssignment & { staff: Staff })[]>({
    queryKey: [`/api/clients/${id}/staff-assignments`],
    enabled: !!id && !!client,
  });

  const { data: timeLogs = [], isLoading: logsLoading } = useQuery<TimeLog[]>({
    queryKey: [`/api/time-logs?clientId=${id}`],
    enabled: !!id && !!client,
  });

  const { data: compensations = [], isLoading: compensationsLoading } = useQuery<StaffCompensation[]>({
    queryKey: [`/api/clients/${id}/compensations`],
    enabled: !!id && !!client,
  });

  // Query for budget allocations
  const { data: budgetAllocations = [] } = useQuery<any[]>({
    queryKey: [`/api/clients/${id}/budget-allocations`],
    enabled: !!id && !!client,
  });

  // Query for all staff members for the add dialog
  const { data: allStaff = [] } = useQuery<Staff[]>({
    queryKey: ['/api/staff'],
    enabled: showAddDialog,
  });

  // Mutation for adding a new staff assignment
  const addAssignmentMutation = useMutation({
    mutationFn: async (data: { staffId: string; assignmentType: string }) => {
      return await apiRequest('POST', `/api/clients/${id}/staff-assignments`, {
        staffId: data.staffId,
        assignmentType: data.assignmentType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${id}/staff-assignments`] });
      toast({
        title: "Success",
        description: "Collaborator added successfully",
      });
      setShowAddDialog(false);
      setSelectedStaffId("");
      setAssignmentType("secondary");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add collaborator",
        variant: "destructive",
      });
    },
  });

  // Mutation for removing a staff assignment
  const removeAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      return await apiRequest('DELETE', `/api/client-staff-assignments/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${id}/staff-assignments`] });
      toast({
        title: "Success",
        description: "Collaborator removed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove collaborator",
        variant: "destructive",
      });
    },
  });

  if (clientLoading || staffLoading || logsLoading || compensationsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg text-gray-600">Loading client details...</div>
      </div>
    );
  }

  if (clientError || !client) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg text-red-600">Error loading client details</div>
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

  const getServiceTypeBadge = (type: string) => {
    const typeColors = {
      "personal-care": "bg-blue-100 text-blue-800 border-blue-300",
      "home-support": "bg-purple-100 text-purple-800 border-purple-300",
      "medical-assistance": "bg-red-100 text-red-800 border-red-300",
      "social-support": "bg-green-100 text-green-800 border-green-300",
      "transportation": "bg-orange-100 text-orange-800 border-orange-300",
    };
    
    const displayNames: Record<string, string> = {
      "personal-care": "Personal Care",
      "personalcare": "Personal Care",
      "home-support": "Home Support", 
      "homesupport": "Home Support",
      "medical-assistance": "Medical Assistance",
      "medicalassistance": "Medical Assistance",
      "social-support": "Social Support",
      "socialsupport": "Social Support",
      "transportation": "Transportation",
    };
    
    const typeKey = type?.toLowerCase().replace(/[._]/g, '-') || '';
    const displayName = displayNames[typeKey] || displayNames[typeKey.replace('-', '')] || 
                       type?.split(/[.-]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 
                       'Unknown';
    
    return (
      <Badge variant="outline" className={typeColors[typeKey as keyof typeof typeColors] || "bg-gray-100 text-gray-800"}>
        {displayName}
      </Badge>
    );
  };

  const totalHours = timeLogs.reduce((sum, log) => sum + parseFloat(log.hours), 0);
  const totalCost = timeLogs.reduce((sum, log) => sum + parseFloat(log.totalCost), 0);
  const totalAllocated = budgetAllocations.reduce((sum, allocation) => 
    sum + (parseFloat(allocation.allocatedAmount) || 0), 0);
  const totalSpent = budgetAllocations.reduce((sum, allocation) => 
    sum + (parseFloat(allocation.usedAmount) || 0), 0);
  const totalRemaining = totalAllocated - totalSpent;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-800">Client Details</h1>
        </div>
        {getStatusBadge(client.status)}
      </div>

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Allocated</p>
                <p className="text-2xl font-bold text-gray-900">€{totalAllocated.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900">€{totalSpent.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Remaining</p>
                <p className="text-2xl font-bold text-gray-900">€{totalRemaining.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Calculator className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
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
                  {client.firstName} {client.lastName}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Fiscal Code</label>
                <p className="text-lg font-mono text-gray-900">
                  {client.fiscalCode || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">External ID</label>
                <p className="text-lg font-mono text-gray-900">
                  {client.externalId || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Service Type</label>
                <div className="mt-1">
                  {getServiceTypeBadge(client.serviceType)}
                </div>
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
                  <p className="text-gray-900">{client.email || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-500" />
                <div>
                  <label className="text-sm font-medium text-gray-600">Phone</label>
                  <p className="text-gray-900">{client.phone || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                <div>
                  <label className="text-sm font-medium text-gray-600">Address</label>
                  <p className="text-gray-900">{client.address || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Staff Card */}
          <Card className="care-card">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Assigned Collaborators ({staffAssignments.length})
                </CardTitle>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Collaborator</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="staff">Select Staff Member</Label>
                        <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                          <SelectTrigger id="staff">
                            <SelectValue placeholder="Choose a staff member" />
                          </SelectTrigger>
                          <SelectContent>
                            {allStaff
                              .filter(s => !staffAssignments.some(a => a.staffId === s.id))
                              .map((staff) => (
                                <SelectItem key={staff.id} value={staff.id}>
                                  {staff.firstName} {staff.lastName} - {staff.type === 'internal' ? 'Internal' : 'External'}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="type">Assignment Type</Label>
                        <Select value={assignmentType} onValueChange={setAssignmentType}>
                          <SelectTrigger id="type">
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
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => {
                            if (selectedStaffId) {
                              addAssignmentMutation.mutate({ 
                                staffId: selectedStaffId, 
                                assignmentType: assignmentType 
                              });
                            }
                          }}
                          disabled={!selectedStaffId || addAssignmentMutation.isPending}
                        >
                          {addAssignmentMutation.isPending ? 'Adding...' : 'Add Collaborator'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {staffAssignments.length > 0 ? (
                <div className="space-y-3">
                  {staffAssignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <Link href={`/staff/${assignment.staffId}`} className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            {assignment.staff ? (
                              <>
                                <p className="font-medium text-gray-900 hover:text-blue-600">
                                  {assignment.staff.firstName} {assignment.staff.lastName}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {assignment.staff.type === 'internal' ? 'Internal' : 'External'} Staff
                                </p>
                              </>
                            ) : (
                              <p className="text-gray-500">Staff member not found</p>
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
                            if (confirm('Are you sure you want to remove this collaborator?')) {
                              removeAssignmentMutation.mutate(assignment.id);
                            }
                          }}
                          disabled={removeAssignmentMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No collaborators assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Compensation Records */}
          <Card className="care-card">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Compensation Records
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {compensations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 text-sm font-medium text-gray-600">Staff</th>
                        <th className="pb-2 text-sm font-medium text-gray-600">Period</th>
                        <th className="pb-2 text-sm font-medium text-gray-600">Generated</th>
                        <th className="pb-2 text-sm font-medium text-gray-600">Total Hours</th>
                        <th className="pb-2 text-sm font-medium text-gray-600">Amount</th>
                        <th className="pb-2 text-sm font-medium text-gray-600">Status</th>
                        <th className="pb-2 text-sm font-medium text-gray-600">Payment</th>
                        <th className="pb-2 text-sm font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {compensations.map((comp) => (
                        <tr key={comp.id} className="hover:bg-gray-50">
                          <td className="py-3 text-sm">
                            <Link href={`/staff/${comp.staffId}`} className="text-blue-600 hover:underline">
                              {comp.staffName || 'Unknown Staff'}
                            </Link>
                          </td>
                          <td className="py-3 text-sm text-gray-900">
                            {new Date(comp.periodStart).toLocaleDateString()} - {new Date(comp.periodEnd).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-sm text-gray-600">
                            {comp.createdAt ? new Date(comp.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-3 text-sm text-gray-900">
                            {(parseFloat(comp.regularHours || '0') + 
                              parseFloat(comp.overtimeHours || '0') + 
                              parseFloat(comp.weekendHours || '0') + 
                              parseFloat(comp.holidayHours || '0')).toFixed(2)}h
                          </td>
                          <td className="py-3 text-sm font-medium text-green-600">
                            €{parseFloat(comp.totalCompensation || '0').toFixed(2)}
                          </td>
                          <td className="py-3">
                            <Badge 
                              variant={
                                comp.status === 'paid' ? 'default' : 
                                comp.status === 'approved' ? 'secondary' : 
                                'outline'
                              }
                              className={
                                comp.status === 'paid' ? 'bg-green-100 text-green-800 border-green-300' : 
                                comp.status === 'approved' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                comp.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                ''
                              }
                            >
                              {comp.status === 'pending_approval' ? 'Pending' : 
                               comp.status === 'approved' ? 'Approved' :
                               comp.status === 'paid' ? 'Paid' : 
                               comp.status}
                            </Badge>
                          </td>
                          <td className="py-3">
                            {budgetAllocations.length === 0 && comp.status === 'paid' ? (
                              <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                                Client Owes
                              </Badge>
                            ) : budgetAllocations.length > 0 ? (
                              <Badge className="bg-gray-100 text-gray-800 border-gray-300">
                                Budget
                              </Badge>
                            ) : (
                              <span className="text-sm text-gray-500">-</span>
                            )}
                          </td>
                          <td className="py-3">
                            <div className="flex gap-1">
                              <Link href={`/compensation/${comp.id}/budget-allocation`}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No compensation records found</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Budget Information */}
          <Card className="care-card">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Budget Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Monthly Budget</label>
                <p className="text-2xl font-bold text-green-600">
                  €{totalAllocated.toFixed(2)}
                </p>
                {budgetAllocations.length > 0 ? (
                  <p className="text-xs text-gray-500 mt-1">
                    From {budgetAllocations.length} allocation{budgetAllocations.length > 1 ? 's' : ''}
                  </p>
                ) : (
                  <p className="text-xs text-orange-600 mt-1">
                    No budget allocations - Client pays directly
                  </p>
                )}
              </div>
              {budgetAllocations.length === 0 && compensations.some(c => c.status === 'paid') && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm font-medium text-orange-800">Client Direct Payment</p>
                  <p className="text-xs text-orange-600 mt-1">
                    This client needs to pay €{compensations
                      .filter(c => c.status === 'paid')
                      .reduce((sum, c) => sum + parseFloat(c.totalCompensation || '0'), 0)
                      .toFixed(2)} directly to staff
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-600">Emergency Contact</label>
                <p className="text-gray-900">{(client as any).emergencyContact || 'Not provided'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Service Statistics */}
          <Card className="care-card">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Service Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Total Hours</span>
                <span className="text-lg font-bold text-blue-600">{totalHours.toFixed(2)}h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Total Cost</span>
                <span className="text-lg font-bold text-green-600">€{totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Service Logs</span>
                <span className="text-lg font-bold text-gray-700">{timeLogs.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {client.notes && (
            <Card className="care-card">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-gray-700 whitespace-pre-wrap">{client.notes}</p>
              </CardContent>
            </Card>
          )}

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
                  {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated</span>
                <span className="text-gray-900">
                  {client.updatedAt ? new Date(client.updatedAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Client ID</span>
                <span className="text-gray-900 font-mono text-xs">{client.id.slice(0, 8)}...</span>
              </div>
            </CardContent>
          </Card>

          {/* Import History */}
          {(client.importId || client.lastImportId) && (
            <Card className="care-card">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Import History
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-2 text-sm">
                {client.importId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created by Import</span>
                    <span className="text-gray-900 font-mono text-xs">{client.importId.slice(0, 8)}...</span>
                  </div>
                )}
                {client.lastImportId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Modified by Import</span>
                    <span className="text-gray-900 font-mono text-xs">{client.lastImportId.slice(0, 8)}...</span>
                  </div>
                )}
                {(client as any).importHistory && Array.isArray((client as any).importHistory) && (
                  <div className="mt-3 pt-3 border-t">
                    <span className="text-gray-600 block mb-2">Import Actions:</span>
                    <div className="space-y-1">
                      {((client as any).importHistory as any[]).slice(-5).reverse().map((history: any, idx: number) => (
                        <div key={idx} className="text-xs flex justify-between">
                          <span className="text-gray-700">{history.action || 'Unknown'}</span>
                          <span className="text-gray-500">
                            {history.timestamp ? new Date(history.timestamp).toLocaleDateString() : 'Unknown date'}
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
    </div>
  );
}