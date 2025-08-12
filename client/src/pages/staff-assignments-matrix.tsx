import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, Clock, AlertCircle, Grid3X3 } from "lucide-react";

import { useTranslation } from "react-i18next";
import { formatDisplayName, searchMatchesName } from '@/lib/utils';
import type { StaffWithRates } from "@shared/schema";

interface Assignment {
  id: string;
  staffId: string;
  clientId: string;
  isActive: boolean;
  assignmentType: string;
  startDate: string | null;
  endDate: string | null;
}

interface StaffMember extends Omit<StaffWithRates, 'type'> {
  type?: string;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  serviceType: string;
}

interface WorkloadData {
  staffId: string;
  clientId: string;
  totalHours: number;
  lastServiceDate: string | null;
}

export default function StaffAssignmentsMatrix() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFilter, setSearchFilter] = useState<"staff" | "clients" | "both">("both");
  const [hoveredCell, setHoveredCell] = useState<{ staffId: string; clientId: string } | null>(null);

  // Fetch staff data
  const { data: staff = [], isLoading: loadingStaff } = useQuery({
    queryKey: ['/api/staff'],
    retry: false
  });

  // Fetch clients data
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['/api/clients'],
    retry: false
  });

  // Fetch assignments data
  const { data: assignments = [], isLoading: loadingAssignments, refetch: refetchAssignments } = useQuery<Assignment[]>({
    queryKey: ['/api/client-staff-assignments'],
    queryFn: async () => {
      const response = await fetch('/api/client-staff-assignments', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch assignments');
      }
      return response.json();
    }
  });

  // Fetch workload data (hours per staff-client combination)
  const { data: workloadData = [], isLoading: loadingWorkload } = useQuery<WorkloadData[]>({
    queryKey: ['/api/staff-client-workload'],
    queryFn: async () => {
      const response = await fetch('/api/staff-client-workload', {
        credentials: 'include'
      });
      if (!response.ok) {
        // If endpoint doesn't exist yet, return empty array
        return [];
      }
      return response.json();
    },
    retry: false
  });

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async ({ staffId, clientId }: { staffId: string; clientId: string }) => {
      const response = await fetch('/api/client-staff-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          staffId,
          clientId,
          assignmentType: 'primary',
          isActive: true,
          startDate: new Date().toISOString()
        })
      });
      if (!response.ok) {
        throw new Error('Failed to create assignment');
      }
      return response.json();
    },
    onSuccess: () => {
      refetchAssignments();
      toast({
        title: t('common.success'),
        description: "Assignment created successfully"
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: "Failed to create assignment",
        variant: "destructive"
      });
    }
  });

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const response = await fetch(`/api/client-staff-assignments/${assignmentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to delete assignment');
      }
    },
    onSuccess: () => {
      refetchAssignments();
      toast({
        title: t('common.success'),
        description: "Assignment removed successfully"
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: "Failed to remove assignment",
        variant: "destructive"
      });
    }
  });

  // Filter staff and clients based on search using enhanced search
  const filteredStaff = (searchTerm && (searchFilter === "staff" || searchFilter === "both"))
    ? (staff as StaffMember[]).filter((s: StaffMember) => 
        searchMatchesName(searchTerm, s.firstName, s.lastName)
      )
    : (staff as StaffMember[]);

  const filteredClients = (searchTerm && (searchFilter === "clients" || searchFilter === "both"))
    ? (clients as Client[]).filter((c: Client) => 
        searchMatchesName(searchTerm, c.firstName, c.lastName)
      )
    : (clients as Client[]);

  // Check if assignment exists
  const isAssigned = (staffId: string, clientId: string) => {
    return assignments.some(a => 
      a.staffId === staffId && 
      a.clientId === clientId && 
      a.isActive
    );
  };

  // Get assignment details
  const getAssignment = (staffId: string, clientId: string) => {
    return assignments.find(a => 
      a.staffId === staffId && 
      a.clientId === clientId && 
      a.isActive
    );
  };

  // Get workload hours for a staff-client combination
  const getWorkloadHours = (staffId: string, clientId: string) => {
    const workload = workloadData.find(w => 
      w.staffId === staffId && w.clientId === clientId
    );
    return workload?.totalHours || 0;
  };

  // Get color based on workload hours
  const getWorkloadColor = (hours: number) => {
    if (hours === 0) return '';
    if (hours < 20) return 'bg-green-100 hover:bg-green-200';
    if (hours < 40) return 'bg-yellow-100 hover:bg-yellow-200';
    if (hours < 60) return 'bg-orange-100 hover:bg-orange-200';
    return 'bg-red-100 hover:bg-red-200';
  };

  // Get workload intensity for text color
  const getWorkloadTextColor = (hours: number) => {
    if (hours === 0) return '';
    if (hours < 20) return 'text-green-700';
    if (hours < 40) return 'text-yellow-700';
    if (hours < 60) return 'text-orange-700';
    return 'text-red-700';
  };

  // Toggle assignment
  const toggleAssignment = async (staffId: string, clientId: string) => {
    const assignment = getAssignment(staffId, clientId);
    
    if (assignment) {
      await deleteAssignmentMutation.mutateAsync(assignment.id);
    } else {
      await createAssignmentMutation.mutateAsync({ staffId, clientId });
    }
  };

  // Calculate total assignments per staff
  const getStaffAssignmentCount = (staffId: string) => {
    return assignments.filter(a => a.staffId === staffId && a.isActive).length;
  };

  // Calculate total assignments per client
  const getClientAssignmentCount = (clientId: string) => {
    return assignments.filter(a => a.clientId === clientId && a.isActive).length;
  };

  const isLoading = loadingStaff || loadingClients || loadingAssignments;

  return (
    <div className="container mx-auto p-6 max-w-full">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            {t('navigation.items.staffAssignments')} - Matrix View
          </h1>
          <p className="text-gray-600 mt-2">
            Click checkboxes to assign staff to clients. Colors indicate workload intensity.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {/* Loading skeleton for search and legend */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center gap-4">
                <div className="h-10 bg-gray-200 rounded animate-pulse w-72"></div>
                <div className="flex gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-12"></div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading skeleton for matrix */}
          <Card>
            <CardContent className="p-6">
              <div className="overflow-auto">
                <div className="min-w-[800px]">
                  {/* Header row */}
                  <div className="flex border-b">
                    <div className="w-48 p-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                    </div>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="w-32 p-3 border-l">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Data rows */}
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex border-b">
                      <div className="w-48 p-3 flex items-center gap-2">
                        <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded animate-pulse flex-1"></div>
                      </div>
                      {[1, 2, 3, 4, 5].map((j) => (
                        <div key={j} className="w-32 p-3 border-l flex items-center justify-center">
                          <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="text-center mt-8">
                <div className="inline-flex items-center gap-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm font-medium">Loading assignment matrix...</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
      

      {/* Enhanced Search and Legend */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder={
                    searchFilter === "staff" ? "Search staff..." :
                    searchFilter === "clients" ? "Search clients..." :
                    "Search staff and clients..."
                  }
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="search-matrix"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={searchFilter === "staff" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSearchFilter("staff")}
                  data-testid="filter-staff"
                >
                  Staff
                </Button>
                <Button
                  variant={searchFilter === "clients" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSearchFilter("clients")}
                  data-testid="filter-clients"
                >
                  Clients
                </Button>
                <Button
                  variant={searchFilter === "both" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSearchFilter("both")}
                  data-testid="filter-both"
                >
                  Both
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Workload:</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-green-200 rounded" />
                  <span>Low</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-yellow-200 rounded" />
                  <span>Medium</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-orange-200 rounded" />
                  <span>High</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-red-200 rounded" />
                  <span>Very High</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matrix Grid */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              Loading assignment matrix...
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 bg-gray-50 border-b border-r p-4 text-left font-semibold">
                      Staff / Clients
                    </th>
                    {filteredClients.map((client: any) => (
                      <th 
                        key={client.id} 
                        className="bg-gray-50 border-b border-r p-4 text-center min-w-[120px]"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <div className="font-semibold text-sm">
                            {formatDisplayName(client.firstName, client.lastName)}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {getClientAssignmentCount(client.id)} staff
                          </Badge>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((staffMember: any) => {
                    const staffId = staffMember.id;
                    return (
                      <tr key={staffId}>
                        <td className="sticky left-0 z-10 bg-white border-b border-r p-4 font-medium">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="font-semibold">
                                {formatDisplayName(staffMember.firstName, staffMember.lastName)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {staffMember.category || 'No category'}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {getStaffAssignmentCount(staffId)} clients
                            </Badge>
                          </div>
                        </td>
                        {filteredClients.map((client: any) => {
                          const clientId = client.id;
                          const assigned = isAssigned(staffId, clientId);
                          const assignment = getAssignment(staffId, clientId);
                          const workloadHours = getWorkloadHours(staffId, clientId);
                          const isHovered = hoveredCell?.staffId === staffId && hoveredCell?.clientId === clientId;
                          
                          return (
                            <td 
                              key={clientId}
                              className={`border-b border-r p-4 text-center transition-all duration-200 ${
                                getWorkloadColor(workloadHours)
                              } ${isHovered ? 'ring-2 ring-blue-400' : ''}`}
                              onMouseEnter={() => setHoveredCell({ staffId, clientId })}
                              onMouseLeave={() => setHoveredCell(null)}
                            >
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex flex-col items-center gap-2">
                                      <Checkbox
                                        checked={assigned}
                                        onCheckedChange={() => toggleAssignment(staffId, clientId)}
                                        disabled={createAssignmentMutation.isPending || deleteAssignmentMutation.isPending}
                                        className="h-5 w-5"
                                        data-testid={`checkbox-${staffId}-${clientId}`}
                                      />
                                      {workloadHours > 0 && (
                                        <div className={`text-xs font-semibold ${getWorkloadTextColor(workloadHours)}`}>
                                          {workloadHours}h
                                        </div>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <div className="space-y-2">
                                      <div className="font-semibold">
                                        {formatDisplayName(staffMember.firstName, staffMember.lastName)} → {formatDisplayName(client.firstName, client.lastName)}
                                      </div>
                                      {assigned && assignment && (
                                        <>
                                          <div className="text-sm">
                                            <span className="text-gray-500">Type:</span> {assignment.assignmentType}
                                          </div>
                                          {assignment.startDate && (
                                            <div className="text-sm">
                                              <span className="text-gray-500">Since:</span> {new Date(assignment.startDate).toLocaleDateString()}
                                            </div>
                                          )}
                                        </>
                                      )}
                                      {workloadHours > 0 && (
                                        <div className="text-sm">
                                          <span className="text-gray-500">Total Hours:</span> {workloadHours}h this month
                                        </div>
                                      )}
                                      {!assigned && (
                                        <div className="text-sm text-gray-500">
                                          Click to assign
                                        </div>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{(staff as StaffMember[]).length}</div>
                <div className="text-sm text-gray-500">Total Staff</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{(clients as Client[]).length}</div>
                <div className="text-sm text-gray-500">Total Clients</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Grid3X3 className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{assignments.filter((a: Assignment) => a.isActive).length}</div>
                <div className="text-sm text-gray-500">Active Assignments</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
        </>
      )}
    </div>
  );
}