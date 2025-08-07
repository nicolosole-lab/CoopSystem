import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Phone, Mail, DollarSign, Users, Clock, Calendar, Briefcase, FileText } from "lucide-react";
import { useTranslation } from 'react-i18next';
import type { Staff, Client, ClientStaffAssignment, TimeLog } from "@shared/schema";

type StaffWithDetails = Staff & { 
  clientAssignments?: (ClientStaffAssignment & { client: Client })[];
  timeLogs?: TimeLog[];
};

export default function StaffDetails() {
  const { t } = useTranslation();
  const { id } = useParams();

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
    return (
      <Badge variant="outline" className={statusColors[status as keyof typeof statusColors] || statusColors.pending}>
        {t(`staff.status.${status}`)}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeColors = {
      internal: "bg-blue-100 text-blue-800 border-blue-300",
      external: "bg-purple-100 text-purple-800 border-purple-300",
    };
    return (
      <Badge variant="outline" className={typeColors[type as keyof typeof typeColors] || "bg-gray-100 text-gray-800"}>
        {t(`staff.type.${type}`)}
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
                <label className="text-sm font-medium text-gray-600">Emergency Contact</label>
                <p className="text-gray-900">{staffMember.emergencyContact || 'Not provided'}</p>
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

          {/* Notes */}
          {staffMember.notes && (
            <Card className="care-card">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-gray-700 whitespace-pre-wrap">{staffMember.notes}</p>
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
    </div>
  );
}