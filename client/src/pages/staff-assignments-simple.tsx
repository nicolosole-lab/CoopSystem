import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, Trash2, UserPlus } from "lucide-react";


// DnD Kit imports
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable
} from '@dnd-kit/core';

interface Assignment {
  id: string;
  staffId: string;
  clientId: string;
  isActive: boolean;
}

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  category: string;
  hourlyRate: string;
  type?: string;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  serviceType: string;
}

// Draggable Staff Card Component
function DraggableStaffCard({ 
  staff, 
  isDragging,
  showDelete = false,
  onDelete,
  dragId
}: { 
  staff: StaffMember; 
  isDragging?: boolean;
  showDelete?: boolean;
  onDelete?: () => void;
  dragId?: string;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: dragId || staff.id,
    data: { type: 'staff', staff }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className={`bg-white rounded-lg p-3 shadow-sm border cursor-move transition-all hover:shadow-md relative group ${
        isDragging ? 'opacity-50 z-50' : ''
      }`}
    >
      <div className="font-semibold text-sm">{staff.firstName} {staff.lastName}</div>
      <div className="text-xs text-gray-600 mt-1">{staff.category || 'No category'}</div>
      <Badge variant="secondary" className="text-xs mt-2">€{staff.hourlyRate}/h</Badge>
      
      {showDelete && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1 shadow-md"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </button>
      )}
    </div>
  );
}

// Static Staff Card for Overlay
function StaticStaffCard({ staff }: { staff: StaffMember }) {
  return (
    <div className="bg-white rounded-lg p-3 shadow-lg border-2 border-blue-400 cursor-move">
      <div className="font-semibold text-sm">{staff.firstName} {staff.lastName}</div>
      <div className="text-xs text-gray-600 mt-1">{staff.category || 'No category'}</div>
      <Badge variant="secondary" className="text-xs mt-2">€{staff.hourlyRate}/h</Badge>
    </div>
  );
}

// Droppable Client Zone
function DroppableClientZone({ 
  client,
  staffAssignments,
  onDeleteAssignment
}: { 
  client: Client;
  staffAssignments: { assignment: Assignment; staff: StaffMember }[];
  onDeleteAssignment: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `client-${client.id}`,
    data: { type: 'client', clientId: client.id }
  });

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{client.firstName} {client.lastName}</CardTitle>
        <p className="text-sm text-gray-600">
          {client.serviceType} • {staffAssignments.length} staff assigned
        </p>
      </CardHeader>
      <CardContent>
        <div 
          ref={setNodeRef}
          className={`min-h-[300px] bg-gray-50 rounded-lg p-4 transition-all ${
            isOver ? 'bg-blue-50 ring-2 ring-blue-400 scale-[1.02]' : ''
          }`}
        >
          <div className="space-y-2">
            {staffAssignments.map(({ assignment, staff }) => (
              <DraggableStaffCard
                key={assignment.id}
                staff={staff}
                dragId={`assigned-${assignment.id}`}
                showDelete
                onDelete={() => onDeleteAssignment(assignment.id)}
              />
            ))}
            {staffAssignments.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <UserPlus className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Drop staff here to assign</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Droppable Staff Pool
function DroppableStaffPool({ 
  staff,
  assignments,
  isDragging 
}: { 
  staff: StaffMember[];
  assignments: Assignment[];
  isDragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'staff-pool',
    data: { type: 'pool' }
  });

  // Get assigned staff IDs for visual indicator
  const assignedStaffIds = new Set(
    (assignments || []).filter(a => a.isActive).map(a => a.staffId)
  );

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">All Staff</CardTitle>
        <p className="text-sm text-gray-600">{staff.length} staff members</p>
      </CardHeader>
      <CardContent>
        <div 
          ref={setNodeRef}
          className={`min-h-[500px] max-h-[600px] overflow-y-auto bg-gray-50 rounded-lg p-4 transition-all ${
            isOver && isDragging ? 'bg-red-50 ring-2 ring-red-400' : ''
          }`}
        >
          <div className="space-y-2">
            {staff.map(staffMember => (
              <div key={staffMember.id} className="relative">
                <DraggableStaffCard
                  staff={staffMember}
                />
                {assignedStaffIds.has(staffMember.id) && (
                  <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded">
                    Assigned
                  </div>
                )}
              </div>
            ))}
            {staff.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-3" />
                <p>No staff available</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StaffAssignmentsSimple() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const clientsPerPage = 4;

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    })
  );

  // Fetch data
  const { data: staff = [], isLoading: loadingStaff } = useQuery<StaffMember[]>({
    queryKey: ['/api/staff']
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery<Client[]>({
    queryKey: ['/api/clients']
  });

  const { data: assignments = [], isLoading: loadingAssignments, refetch: refetchAssignments } = useQuery<Assignment[]>({
    queryKey: ['/api/client-staff-assignments']
  });

  // Mutations
  const createAssignment = useMutation({
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
      if (!response.ok) throw new Error('Failed to create assignment');
      return response.json();
    },
    onSuccess: () => {
      refetchAssignments();
      toast({ title: "Success", description: "Staff assigned successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to assign staff", variant: "destructive" });
    }
  });

  const deleteAssignment = useMutation({
    mutationFn: async (assignmentId: string) => {
      const response = await fetch(`/api/client-staff-assignments/${assignmentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      refetchAssignments();
      toast({ title: "Success", description: "Assignment removed" });
    }
  });

  // Filter and prepare data
  const externalStaff = (staff || []).filter(s => s.type !== 'internal');
  
  // Filter by search
  const filteredStaff = searchTerm 
    ? externalStaff.filter(s => 
        `${s.firstName} ${s.lastName}`.toLowerCase().includes((searchTerm || '').toLowerCase())
      )
    : externalStaff;

  // Get staff assignments for each client
  const getClientAssignments = (clientId: string) => {
    const clientAssignments = (assignments || []).filter(a => a.clientId === clientId && a.isActive);
    return clientAssignments.map(a => {
      const staffMember = (staff || []).find(s => s.id === a.staffId);
      return { assignment: a, staff: staffMember };
    }).filter(item => item.staff) as { assignment: Assignment; staff: StaffMember }[];
  };

  // Pagination
  const totalPages = Math.ceil((clients || []).length / clientsPerPage);
  const currentClients = (clients || []).slice(
    currentPage * clientsPerPage,
    (currentPage + 1) * clientsPerPage
  );

  // Find active staff for overlay
  const getActiveStaff = () => {
    if (!activeId) return null;
    // Check if it's an assigned staff (has "assigned-" prefix)
    if (activeId.startsWith('assigned-')) {
      const assignmentId = activeId.replace('assigned-', '');
      const assignment = (assignments || []).find(a => a.id === assignmentId);
      return assignment ? (staff || []).find(s => s.id === assignment.staffId) : null;
    }
    // Otherwise it's a direct staff ID
    return (staff || []).find(s => s.id === activeId);
  };
  const activeStaff = getActiveStaff();

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    // Extract the actual staff data from the drag event
    const activeData = active.data.current;
    const staffId = activeData?.staff?.id || active.id as string;
    const overData = over.data.current;

    // Handle drop on client
    if (overData?.type === 'client') {
      const clientId = overData.clientId;
      
      // Check if already assigned
      const existing = (assignments || []).find(a => 
        a.staffId === staffId && a.clientId === clientId && a.isActive
      );
      
      if (!existing) {
        createAssignment.mutate({ staffId, clientId });
      } else {
        toast({
          title: "Already Assigned",
          description: "This staff member is already assigned to this client",
          variant: "destructive"
        });
      }
    }
    // Handle drop back to pool (unassign from all clients)
    else if (overData?.type === 'pool') {
      const staffAssignments = (assignments || []).filter(a => 
        a.staffId === staffId && a.isActive
      );
      
      if (staffAssignments.length > 0) {
        // Delete all assignments for this staff member
        Promise.all(staffAssignments.map(a => 
          deleteAssignment.mutateAsync(a.id)
        ));
      }
    }

    setActiveId(null);
  };

  const isLoading = loadingStaff || loadingClients || loadingAssignments;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Staff Assignments</h1>
            <p className="text-gray-600 mt-2">Drag staff to assign them to clients</p>
          </div>
        </div>

        {/* Loading skeleton for search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 bg-gray-200 rounded animate-pulse flex-1 max-w-md"></div>
              <div className="flex gap-2">
                <div className="h-8 bg-gray-200 rounded animate-pulse w-20"></div>
                <div className="h-8 bg-gray-200 rounded animate-pulse w-12"></div>
                <div className="h-8 bg-gray-200 rounded animate-pulse w-20"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading skeleton for staff grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 bg-gray-200 rounded animate-pulse w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <div className="inline-flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm font-medium">Loading staff assignments...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Staff Assignments</h1>
            <p className="text-gray-600 mt-2">Drag staff to assign them to clients</p>
          </div>

        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search staff..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage === totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Staff Pool */}
          <div className="lg:col-span-1">
            <DroppableStaffPool 
              staff={filteredStaff}
              assignments={assignments}
              isDragging={activeId !== null}
            />
          </div>

          {/* Client Zones */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentClients.map(client => (
                <DroppableClientZone
                  key={client.id}
                  client={client}
                  staffAssignments={getClientAssignments(client.id)}
                  onDeleteAssignment={(id) => deleteAssignment.mutate(id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeStaff ? <StaticStaffCard staff={activeStaff} /> : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}