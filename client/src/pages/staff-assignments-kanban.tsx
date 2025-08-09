import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Grid3X3, 
  List, 
  Users, 
  UserCheck, 
  UserX,
  Clock,
  AlertCircle,
  GripVertical,
  Plus
} from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface Assignment {
  id: string;
  staffId: string;
  clientId: string;
  isActive: boolean;
  assignmentType: string;
  startDate: string | null;
  endDate: string | null;
}

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  category: string;
  status: string;
  hourlyRate: string;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  serviceType: string;
  status: string;
}

type ColumnType = 'available' | 'assigned' | 'pending';

interface DraggedItem {
  staffId: string;
  currentClientId?: string;
  currentColumn: ColumnType;
}

export default function StaffAssignmentsKanban() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<string>("all");

  // Fetch staff data
  const { data: staff = [], isLoading: loadingStaff } = useQuery<StaffMember[]>({
    queryKey: ['/api/staff'],
    retry: false
  });



  // Fetch clients data
  const { data: clients = [], isLoading: loadingClients } = useQuery<Client[]>({
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

  // Debug log data
  useEffect(() => {
    console.log('Staff count:', staff.length);
    console.log('Assignments count:', assignments.length);
    console.log('Active assignments:', assignments.filter(a => a.isActive).length);
    const assignedStaffIds = new Set(assignments.filter(a => a.isActive).map(a => a.staffId));
    console.log('Assigned staff IDs:', assignedStaffIds.size);
    console.log('Available staff:', staff.filter(s => !assignedStaffIds.has(s.id)).length);
  }, [staff, assignments]);

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
        description: "Staff assigned successfully"
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: "Failed to assign staff",
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

  // Filter staff based on search
  const filteredStaff = searchTerm.trim() 
    ? staff.filter((s) => 
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : staff;

  // Filter clients based on selection
  const filteredClients = selectedClient === "all" 
    ? clients 
    : clients.filter(c => c.id === selectedClient);

  // Get staff for each column and client
  const getStaffForColumn = (column: ColumnType, clientId?: string) => {
    if (column === 'available') {
      // Staff not assigned to any client
      const availableStaff = filteredStaff.filter(s => 
        !assignments.some(a => a.staffId === s.id && a.isActive)
      );
      console.log('Available staff:', availableStaff.length, 'from total:', filteredStaff.length);
      return availableStaff;
    } else if (column === 'assigned' && clientId) {
      // Staff assigned to specific client
      return filteredStaff.filter(s => 
        assignments.some(a => 
          a.staffId === s.id && 
          a.clientId === clientId && 
          a.isActive
        )
      );
    } else if (column === 'pending') {
      // Staff with pending assignments (for future implementation)
      return [];
    }
    return [];
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, staffId: string, currentColumn: ColumnType, currentClientId?: string) => {
    setDraggedItem({ staffId, currentClientId, currentColumn });
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  // Handle drop
  const handleDrop = async (e: React.DragEvent, targetColumn: ColumnType, targetClientId?: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedItem) return;

    const { staffId, currentClientId, currentColumn } = draggedItem;

    // If dropping on available column, remove assignment
    if (targetColumn === 'available' && currentClientId) {
      const assignment = assignments.find(a => 
        a.staffId === staffId && 
        a.clientId === currentClientId && 
        a.isActive
      );
      if (assignment) {
        await deleteAssignmentMutation.mutateAsync(assignment.id);
      }
    }
    // If dropping on assigned column with a client, create or move assignment
    else if (targetColumn === 'assigned' && targetClientId) {
      // First remove existing assignment if moving from another client
      if (currentClientId && currentClientId !== targetClientId) {
        const existingAssignment = assignments.find(a => 
          a.staffId === staffId && 
          a.clientId === currentClientId && 
          a.isActive
        );
        if (existingAssignment) {
          await deleteAssignmentMutation.mutateAsync(existingAssignment.id);
        }
      }
      
      // Then create new assignment if not already assigned to target client
      const targetAssignment = assignments.find(a => 
        a.staffId === staffId && 
        a.clientId === targetClientId && 
        a.isActive
      );
      if (!targetAssignment) {
        await createAssignmentMutation.mutateAsync({ 
          staffId, 
          clientId: targetClientId 
        });
      }
    }

    setDraggedItem(null);
  };

  // Staff card component
  const StaffCard = ({ 
    staffMember, 
    column, 
    clientId 
  }: { 
    staffMember: StaffMember; 
    column: ColumnType; 
    clientId?: string 
  }) => {
    const initials = `${staffMember.firstName[0]}${staffMember.lastName[0]}`.toUpperCase();
    const assignment = assignments.find(a => 
      a.staffId === staffMember.id && 
      a.clientId === clientId && 
      a.isActive
    );

    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, staffMember.id, column, clientId)}
        className={cn(
          "bg-white rounded-lg p-3 shadow-sm border cursor-move transition-all",
          "hover:shadow-md hover:border-blue-300",
          draggedItem?.staffId === staffMember.id && "opacity-50"
        )}
        data-testid={`staff-card-${staffMember.id}`}
      >
        <div className="flex items-start gap-3">
          <GripVertical className="h-4 w-4 text-gray-400 mt-1" />
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-gradient-to-br from-blue-100 to-green-100">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">
              {staffMember.firstName} {staffMember.lastName}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {staffMember.category || 'No category'}
            </div>
            {assignment && assignment.startDate && (
              <div className="text-xs text-gray-400 mt-1">
                Since {new Date(assignment.startDate).toLocaleDateString()}
              </div>
            )}
          </div>
          <Badge variant="outline" className="text-xs">
            €{staffMember.hourlyRate}/h
          </Badge>
        </div>
      </div>
    );
  };

  // Column component
  const Column = ({ 
    title, 
    column, 
    clientId, 
    clientName,
    icon: Icon,
    color 
  }: { 
    title: string; 
    column: ColumnType; 
    clientId?: string;
    clientName?: string;
    icon: any;
    color: string;
  }) => {
    const columnId = clientId ? `${column}-${clientId}` : column;
    const staffList = getStaffForColumn(column, clientId);
    const isDropTarget = dragOverColumn === columnId;

    return (
      <div className="flex-1 min-w-[300px]">
        <div className={cn(
          "bg-gray-50 rounded-lg p-4 h-full",
          isDropTarget && "bg-blue-50 ring-2 ring-blue-400"
        )}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Icon className={cn("h-5 w-5", color)} />
              <h3 className="font-semibold text-sm">{title}</h3>
              {clientName && (
                <span className="text-xs text-gray-500">- {clientName}</span>
              )}
            </div>
            <Badge variant="secondary" className="text-xs">
              {staffList.length}
            </Badge>
          </div>
          
          <ScrollArea 
            className="h-[400px]"
            onDragOver={(e) => handleDragOver(e, columnId)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column, clientId)}
          >
            <div className="space-y-2 min-h-[100px]">
              {staffList.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  {column === 'available' ? 
                    'All staff are currently assigned. Drag staff from client assignments to make them available.' : 
                    'Drop staff here to assign'}
                </div>
              ) : (
                staffList.map(staffMember => (
                  <StaffCard 
                    key={staffMember.id} 
                    staffMember={staffMember} 
                    column={column}
                    clientId={clientId}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  };

  const isLoading = loadingStaff || loadingClients || loadingAssignments;

  return (
    <div className="container mx-auto p-6 max-w-full">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            {t('navigation.items.staffAssignments')} - Kanban View
          </h1>
          <p className="text-gray-600 mt-2">
            Drag and drop staff cards to assign them to clients
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/staff-assignments">
            <Button variant="outline">
              <List className="h-4 w-4 mr-2" />
              List View
            </Button>
          </Link>
          <Link href="/staff-assignments-matrix">
            <Button variant="outline">
              <Grid3X3 className="h-4 w-4 mr-2" />
              Matrix View
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search staff..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="search-kanban"
              />
            </div>
            <select
              className="px-4 py-2 border rounded-lg text-sm"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              data-testid="filter-client"
            >
              <option value="all">All Clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.firstName} {client.lastName}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            Loading kanban board...
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Available Staff Pool */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Staff Pool</CardTitle>
            </CardHeader>
            <CardContent>
              <Column
                title="Available Staff"
                column="available"
                icon={Users}
                color="text-gray-500"
              />
            </CardContent>
          </Card>

          {/* Client Assignments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Client Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredClients.map(client => (
                  <div key={client.id} className="border rounded-lg p-4">
                    <div className="mb-3">
                      <h4 className="font-semibold">
                        {client.firstName} {client.lastName}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {client.serviceType || 'No service type'}
                      </p>
                    </div>
                    <Column
                      title="Assigned Staff"
                      column="assigned"
                      clientId={client.id}
                      clientName={`${client.firstName} ${client.lastName}`}
                      icon={UserCheck}
                      color="text-green-500"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{staff.length}</div>
                <div className="text-sm text-gray-500">Total Staff</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {staff.filter(s => assignments.some(a => a.staffId === s.id && a.isActive)).length}
                </div>
                <div className="text-sm text-gray-500">Assigned Staff</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <UserX className="h-8 w-8 text-gray-500" />
              <div>
                <div className="text-2xl font-bold">
                  {staff.filter(s => !assignments.some(a => a.staffId === s.id && a.isActive)).length}
                </div>
                <div className="text-sm text-gray-500">Available Staff</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{assignments.filter(a => a.isActive).length}</div>
                <div className="text-sm text-gray-500">Active Assignments</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}