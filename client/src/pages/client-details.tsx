import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Phone, Mail, MapPin, Calendar, DollarSign, Users, Clock, FileText } from "lucide-react";
import { useTranslation } from 'react-i18next';
import type { Client, Staff, ClientStaffAssignment, TimeLog } from "@shared/schema";

type ClientWithDetails = Client & { 
  staffAssignments?: (ClientStaffAssignment & { staff: Staff })[];
  timeLogs?: TimeLog[];
};

export default function ClientDetails() {
  const { t } = useTranslation();
  const { id } = useParams();

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

  if (clientLoading || staffLoading || logsLoading) {
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Clients
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Client Details</h1>
        </div>
        {getStatusBadge(client.status)}
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
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Assigned Collaborators ({staffAssignments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {staffAssignments.length > 0 ? (
                <div className="space-y-3">
                  {staffAssignments.map((assignment) => (
                    <Link key={assignment.id} href={`/staff/${assignment.staffId}`}>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
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
                <p className="text-gray-500 text-center py-4">No collaborators assigned</p>
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
                  €{client.monthlyBudget ? parseFloat(client.monthlyBudget).toFixed(2) : '0.00'}
                </p>
              </div>
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