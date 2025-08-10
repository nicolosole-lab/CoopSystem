import React, { useState } from "react";
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
  AlertCircle,
  GripVertical
} from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

// DnD Kit imports
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverEvent,
  UniqueIdentifier,
  useDroppable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import {
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  type?: string;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  serviceType: string;
  status: string;
}

// Sortable Staff Card Component
function SortableStaffCard({ 
  staffMember, 
  assignments,
  clientId,
  isOverlay = false 
}: { 
  staffMember: StaffMember;
  assignments: Assignment[];
  clientId?: string;
  isOverlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: `${staffMember.id}-${clientId || 'pool'}`,
    data: {
      type: 'staff',
      staff: staffMember,
      clientId: clientId
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !isOverlay ? 0.5 : 1,
  };

  const initials = `${staffMember.firstName[0]}${staffMember.lastName[0]}`.toUpperCase();
  const totalAssignments = assignments.filter(a => 
    a.staffId === staffMember.id && a.isActive
  ).length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white rounded-lg p-4 shadow-sm border-2 cursor-move transition-all",
        "hover:shadow-md hover:border-blue-400",
        isDragging && !isOverlay && "opacity-50",
        "border-gray-200"
      )}
      data-testid={`staff-card-${staffMember.id}`}
    >
      <div className="flex items-start gap-3">
        <div {...attributes} {...listeners}>
          <GripVertical className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
        </div>
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-900">
            {staffMember.firstName} {staffMember.lastName}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {staffMember.category || 'No category'}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              €{staffMember.hourlyRate}/h
            </Badge>
            {totalAssignments > 0 && (
              <Badge variant="outline" className="text-xs">
                {totalAssignments} client{totalAssignments > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Droppable Staff Pool
function DroppableStaffPool({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'staff-pool',
    data: {
      type: 'pool'
    }
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "min-h-[600px] bg-gray-50 rounded-lg p-4 transition-colors",
        isOver && "bg-blue-50 ring-2 ring-blue-400"
      )}
    >
      {children}
    </div>
  );
}

// Droppable Client Zone
function DroppableClientZone({ 
  client, 
  assignedStaff,
  assignments 
}: { 
  client: Client;
  assignedStaff: StaffMember[];
  assignments: Assignment[];
}) {
  const {
    setNodeRef,
    isOver,
  } = useSortable({
    id: `client-${client.id}`,
    data: {
      type: 'client',
      client: client
    }
  });

  return (
    <div className="border border-gray-200 rounded-lg">
      <div className="bg-gradient-to-r from-blue-50 to-green-50 p-3 border-b">
        <h4 className="font-semibold text-sm">
          {client.firstName} {client.lastName}
        </h4>
        <p className="text-xs text-gray-500">
          {client.serviceType || 'No service type'} • {assignedStaff.length} staff assigned
        </p>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "p-3 min-h-[120px] bg-white rounded-b-lg transition-colors",
          isOver && "bg-green-50 ring-2 ring-green-400"
        )}
      >
        <SortableContext
          items={assignedStaff.map(s => `${s.id}-${client.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {assignedStaff.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                Drop staff here to assign
              </div>
            ) : (
              assignedStaff.map(staffMember => (
                <SortableStaffCard 
                  key={`${staffMember.id}-${client.id}`} 
                  staffMember={staffMember}
                  assignments={assignments}
                  clientId={client.id}
                />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

export default function StaffAssignmentsKanbanDnd() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // Filter staff based on search and exclude internal staff
  const filteredStaff = React.useMemo(() => {
    let filtered = staff.filter(s => s.type !== 'internal');
    
    if (searchTerm.trim()) {
      filtered = filtered.filter((s) => 
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [staff, searchTerm]);

  // Filter clients based on selection
  const filteredClients = selectedClient === "all" 
    ? clients 
    : clients.filter(c => c.id === selectedClient);

  // Get unassigned staff (staff pool)
  const unassignedStaff = React.useMemo(() => {
    // In the pool, show all staff (they can be assigned to multiple clients)
    return filteredStaff;
  }, [filteredStaff]);

  // Get staff assigned to each client
  const getAssignedStaff = (clientId: string) => {
    return filteredStaff.filter(s => 
      assignments.some(a => 
        a.staffId === s.id && 
        a.clientId === clientId && 
        a.isActive
      )
    );
  };

  // Find active staff member for overlay
  const activeStaff = React.useMemo(() => {
    if (!activeId) return null;
    
    const activeIdStr = activeId as string;
    const staffId = activeIdStr.includes('-') 
      ? activeIdStr.split('-')[0]
      : activeIdStr;
    
    return filteredStaff.find(s => s.id === staffId);
  }, [activeId, filteredStaff]);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  // Handle drag over
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    // Add visual feedback during drag over
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;
    
    // Extract staff ID and client ID from the drag item
    const activeId = active.id as string;
    const [staffId, sourceClientId] = activeId.includes('-') 
      ? activeId.split('-')
      : [activeId, null];
    
    // Dropping on a client zone
    if (overData?.type === 'client') {
      const targetClientId = overData.client.id;
      
      // Check if already assigned to this client
      const existingAssignment = assignments.find(a => 
        a.staffId === staffId && 
        a.clientId === targetClientId && 
        a.isActive
      );
      
      if (!existingAssignment) {
        createAssignmentMutation.mutate({ 
          staffId, 
          clientId: targetClientId 
        });
      } else {
        toast({
          title: "Already Assigned",
          description: "This staff member is already assigned to this client",
          variant: "default"
        });
      }
    }
    // Dropping on the staff pool (to remove assignment)
    else if (over.id === 'staff-pool') {
      // If dragging from a client zone, remove that assignment
      if (sourceClientId && sourceClientId !== 'pool') {
        const assignment = assignments.find(a => 
          a.staffId === staffId && 
          a.clientId === sourceClientId && 
          a.isActive
        );
        
        if (assignment) {
          deleteAssignmentMutation.mutate(assignment.id);
        }
      } else {
        toast({
          title: "Staff Available",
          description: "Staff member is in the pool and can be assigned to clients",
          variant: "default"
        });
      }
    }
    // Dropping on another client's staff (assign to that client)
    else if (overData?.type === 'staff' && overData.clientId) {
      const targetClientId = overData.clientId;
      
      // Check if already assigned to this client
      const existingAssignment = assignments.find(a => 
        a.staffId === staffId && 
        a.clientId === targetClientId && 
        a.isActive
      );
      
      if (!existingAssignment) {
        createAssignmentMutation.mutate({ 
          staffId, 
          clientId: targetClientId 
        });
      }
    }
    
    setActiveId(null);
  };

  const isLoading = loadingStaff || loadingClients || loadingAssignments;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side - Staff Pool */}
            <Card className="h-fit">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Staff Pool
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  All available staff • Drag to assign to clients
                </p>
              </CardHeader>
              <CardContent className="pt-4">
                <DroppableStaffPool>
                  <SortableContext
                    items={unassignedStaff.map(s => `${s.id}-pool`)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {unassignedStaff.length === 0 ? (
                        <div className="col-span-2 text-center py-16 text-gray-400">
                          <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm">No staff members found</p>
                          <p className="text-xs mt-2">Add staff members or adjust your search</p>
                        </div>
                      ) : (
                        unassignedStaff.map(staffMember => (
                          <SortableStaffCard 
                            key={`${staffMember.id}-pool`} 
                            staffMember={staffMember}
                            assignments={assignments}
                            clientId="pool"
                          />
                        ))
                      )}
                    </div>
                  </SortableContext>
                </DroppableStaffPool>
              </CardContent>
            </Card>

            {/* Right Side - Client Assignments */}
            <Card className="h-fit">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-green-600" />
                  Client Assignments
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Drop staff here to assign to clients
                </p>
              </CardHeader>
              <CardContent className="pt-4">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {filteredClients.map(client => (
                      <DroppableClientZone
                        key={client.id}
                        client={client}
                        assignedStaff={getAssignedStaff(client.id)}
                        assignments={assignments}
                      />
                    ))}
                  </div>
                </ScrollArea>
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
                  <div className="text-2xl font-bold">{filteredStaff.length}</div>
                  <div className="text-sm text-gray-500">External Staff</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{clients.length}</div>
                  <div className="text-sm text-gray-500">Total Clients</div>
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
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <UserCheck className="h-8 w-8 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {filteredStaff.length > 0 ? Math.round(assignments.filter(a => a.isActive).length / filteredStaff.length * 10) / 10 : 0}
                  </div>
                  <div className="text-sm text-gray-500">Avg Clients/Staff</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeStaff ? (
            <SortableStaffCard 
              staffMember={activeStaff}
              assignments={assignments}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}