import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, List, Grid3X3, Users, UserCheck, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

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

// Draggable Staff Card
function DraggableStaffCard({ staff, isDragging }: { staff: StaffMember; isDragging?: boolean }) {
  return (
    <div 
      className={`bg-white rounded-lg p-3 shadow-sm border cursor-move transition-all hover:shadow-md ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="font-semibold text-sm">{staff.firstName} {staff.lastName}</div>
      <div className="text-xs text-gray-600 mt-1">{staff.category || 'No category'}</div>
      <Badge variant="secondary" className="text-xs mt-2">€{staff.hourlyRate}/h</Badge>
    </div>
  );
}

// Droppable Zone Component
function DroppableZone({ 
  id, 
  children, 
  title,
  subtitle,
  isActive 
}: { 
  id: string;
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  isActive?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <Card className={`h-full ${isActive ? 'border-blue-500' : ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        <div 
          ref={setNodeRef}
          className={`min-h-[400px] bg-gray-50 rounded-lg p-4 transition-colors ${
            isOver ? 'bg-blue-50 ring-2 ring-blue-400' : ''
          }`}
        >
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

export default function StaffAssignmentsSimple() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  // DnD sensor
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  );

  // Fetch data
  const { data: staff = [] } = useQuery<StaffMember[]>({
    queryKey: ['/api/staff']
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients']
  });

  const { data: assignments = [], refetch: refetchAssignments } = useQuery<Assignment[]>({
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

  // Filter external staff only
  const externalStaff = staff.filter(s => s.type !== 'internal');
  
  // Filter by search
  const filteredStaff = searchTerm 
    ? externalStaff.filter(s => 
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : externalStaff;

  // Get staff assignments for each client
  const getClientAssignments = (clientId: string) => {
    const clientAssignments = assignments.filter(a => a.clientId === clientId && a.isActive);
    return clientAssignments.map(a => {
      const staffMember = staff.find(s => s.id === a.staffId);
      return { assignment: a, staff: staffMember };
    }).filter(item => item.staff);
  };

  // Find active staff for overlay
  const activeStaff = activeId ? staff.find(s => s.id === activeId) : null;

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

    const staffId = active.id as string;
    const dropZoneId = over.id as string;

    // If dropped on a client zone
    if (dropZoneId.startsWith('client-')) {
      const clientId = dropZoneId.replace('client-', '');
      
      // Check if already assigned
      const existing = assignments.find(a => 
        a.staffId === staffId && a.clientId === clientId && a.isActive
      );
      
      if (!existing) {
        createAssignment.mutate({ staffId, clientId });
      } else {
        toast({
          title: "Already Assigned",
          description: "This staff member is already assigned to this client"
        });
      }
    }

    setActiveId(null);
  };

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

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search staff..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Staff Pool */}
          <DroppableZone
            id="staff-pool"
            title="Available Staff"
            subtitle={`${filteredStaff.length} staff members`}
          >
            <div className="space-y-2">
              {filteredStaff.map(staffMember => (
                <div
                  key={staffMember.id}
                  id={staffMember.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    handleDragStart({ active: { id: staffMember.id }, over: null } as any);
                  }}
                  onDragEnd={() => setActiveId(null)}
                >
                  <DraggableStaffCard 
                    staff={staffMember} 
                    isDragging={activeId === staffMember.id}
                  />
                </div>
              ))}
              {filteredStaff.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Users className="h-12 w-12 mx-auto mb-3" />
                  <p>No staff found</p>
                </div>
              )}
            </div>
          </DroppableZone>

          {/* Client Zones */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clients.slice(0, 4).map(client => {
                const clientAssignments = getClientAssignments(client.id);
                return (
                  <DroppableZone
                    key={client.id}
                    id={`client-${client.id}`}
                    title={`${client.firstName} ${client.lastName}`}
                    subtitle={`${clientAssignments.length} staff assigned`}
                  >
                    <div className="space-y-2">
                      {clientAssignments.map(({ assignment, staff }) => (
                        <div key={assignment.id} className="relative group">
                          <DraggableStaffCard staff={staff!} />
                          <button
                            onClick={() => deleteAssignment.mutate(assignment.id)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      ))}
                      {clientAssignments.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          Drop staff here
                        </div>
                      )}
                    </div>
                  </DroppableZone>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeStaff ? <DraggableStaffCard staff={activeStaff} isDragging /> : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}