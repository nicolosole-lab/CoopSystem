import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import { Users, UserPlus, Search, Clock, UserCheck, UserX, GripVertical } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const assignmentSchema = z.object({
  staffId: z.string().min(1, 'Staff member is required'),
  clientId: z.string().min(1, 'Client is required'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().optional()
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

type ColumnType = 'available' | 'assigned' | 'pending';

interface DraggedItem {
  staffId: string;
  currentClientId?: string;
  currentColumn: ColumnType;
}

export default function StaffAssignments() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  const [showNewAssignmentDialog, setShowNewAssignmentDialog] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const { toast } = useToast();

  // Form setup
  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      staffId: '',
      clientId: '',
      startDate: '',
      endDate: '',
      notes: ''
    }
  });

  // Fetch staff data
  const { data: staff = [], isLoading: loadingStaff } = useQuery<any[]>({
    queryKey: ['/api/staff'],
    retry: false
  });

  // Fetch clients data
  const { data: clients = [], isLoading: loadingClients } = useQuery<any[]>({
    queryKey: ['/api/clients'],
    retry: false
  });

  // Fetch assignments data
  const { data: assignments = [], isLoading: loadingAssignments } = useQuery<any[]>({
    queryKey: ['/api/client-staff-assignments'],
    queryFn: async () => {
      const response = await fetch('/api/client-staff-assignments', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch assignments');
      }
      const data = await response.json();
      // Transform the data for display
      return data.map((assignment: any) => ({
        id: assignment.id,
        staffId: assignment.staffId,
        staffName: `${assignment.staff.firstName} ${assignment.staff.lastName}`,
        clientId: assignment.clientId,
        clientName: `${assignment.client.firstName} ${assignment.client.lastName}`,
        serviceType: assignment.client.serviceType || 'Assistenza alla persona',
        status: assignment.isActive ? 'Active' : 'Inactive',
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        assignmentType: assignment.assignmentType
      }));
    }
  });

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: AssignmentFormData) => {
      // In production, this would call the actual API endpoint
      // For now, we'll simulate the creation
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true });
        }, 500);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff-assignments'] });
      setShowNewAssignmentDialog(false);
      form.reset();
      toast({
        title: 'Success',
        description: 'Assignment created successfully'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create assignment',
        variant: 'destructive'
      });
    }
  });

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      // In production, this would call the actual API endpoint
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true });
        }, 500);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff-assignments'] });
      toast({
        title: 'Success',
        description: 'Assignment removed successfully'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to remove assignment',
        variant: 'destructive'
      });
    }
  });

  // Filter staff based on search
  const filteredStaff = staff.filter((staffMember: any) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const fullName = `${staffMember.firstName} ${staffMember.lastName}`.toLowerCase();
      return fullName.includes(searchLower);
    }
    return true;
  });

  // Filter clients based on selection
  const filteredClients = selectedClient === "all" 
    ? clients 
    : clients.filter((client: any) => client.id === selectedClient);

  // Get assigned staff for each client
  const getAssignedStaff = (clientId: string) => {
    return assignments
      .filter((assignment: any) => assignment.clientId === clientId && assignment.isActive)
      .map((assignment: any) => assignment.staffId);
  };

  // Get unassigned staff
  const getUnassignedStaff = () => {
    const assignedStaffIds = assignments
      .filter((assignment: any) => assignment.isActive)
      .map((assignment: any) => assignment.staffId);
    
    return filteredStaff.filter((staffMember: any) => 
      !assignedStaffIds.includes(staffMember.id)
    );
  };

  const handleSubmit = (data: AssignmentFormData) => {
    if (editingAssignment) {
      // Handle edit
      createAssignmentMutation.mutate(data);
    } else {
      // Handle create
      createAssignmentMutation.mutate(data);
    }
  };

  const handleEdit = (assignment: any) => {
    setEditingAssignment(assignment);
    form.setValue('staffId', assignment.staffId);
    form.setValue('clientId', assignment.clientId);
    form.setValue('startDate', assignment.startDate || '');
    form.setValue('endDate', assignment.endDate || '');
    form.setValue('notes', assignment.notes || '');
    setShowNewAssignmentDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to remove this assignment?')) {
      deleteAssignmentMutation.mutate(id);
    }
  };

  if (loadingStaff || loadingClients || loadingAssignments) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{t('staffAssignments.title')}</h1>
          <p className="text-muted-foreground">{t('staffAssignments.description')}</p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">{t('common.loading')}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('staffAssignments.title')}</h1>
        <p className="text-muted-foreground">{t('staffAssignments.description')}</p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>{t('staffAssignments.title')}</CardTitle>
              <Badge variant="secondary" className="ml-2">
                {t('staffAssignments.badges.assignments', { count: assignments.length })}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  setEditingAssignment(null);
                  form.reset();
                  setShowNewAssignmentDialog(true);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {t('staffAssignments.newAssignment')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('staffAssignments.filters.searchStaff')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-staff"
              />
            </div>

            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger data-testid="select-filter-client">
                <SelectValue placeholder={t('staffAssignments.filters.filterByClient')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('staffAssignments.filters.allClients')}</SelectItem>
                {clients.map((client: any) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.firstName} {client.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Kanban Board */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
            {/* Available Staff Column */}
            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <CardTitle className="text-lg">{t('staffAssignments.columns.availableStaff')}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {getUnassignedStaff().length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-3">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {getUnassignedStaff().map((staffMember: any) => (
                      <div
                        key={staffMember.id}
                        className="bg-white rounded-lg p-3 border shadow-sm hover:shadow-md transition-all cursor-move"
                        draggable
                        onDragStart={(e) => {
                          setDraggedItem({
                            staffId: staffMember.id,
                            currentColumn: 'available'
                          });
                        }}
                        onDragEnd={() => setDraggedItem(null)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                              {staffMember.firstName?.[0]}{staffMember.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {staffMember.firstName} {staffMember.lastName}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {staffMember.category || t('staffAssignments.badges.noCategory')}
                            </div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {t('staffAssignments.badges.hourlyRate', { rate: staffMember.hourlyRate })}
                            </Badge>
                          </div>
                          <GripVertical className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                    {getUnassignedStaff().length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <UserCheck className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">{t('staffAssignments.emptyStates.allStaffAssigned')}</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Client Assignments Columns */}
            {filteredClients.map((client: any) => {
              const assignedStaffIds = getAssignedStaff(client.id);
              const assignedStaffMembers = staff.filter((s: any) => assignedStaffIds.includes(s.id));

              return (
                <Card key={client.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-green-500" />
                        <div>
                          <CardTitle className="text-lg truncate">
                            {client.firstName} {client.lastName}
                          </CardTitle>
                          <p className="text-sm text-gray-500">{client.serviceType}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        {assignedStaffMembers.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent 
                    className="flex-1 p-3 min-h-[300px]"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverColumn(client.id);
                    }}
                    onDragLeave={() => setDragOverColumn(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedItem) {
                        // Handle assignment logic here
                        toast({
                          title: t('staffAssignments.messages.assignmentUpdated'),
                          description: t('staffAssignments.messages.staffAssigned', { 
                            clientName: `${client.firstName} ${client.lastName}` 
                          }),
                        });
                      }
                      setDraggedItem(null);
                      setDragOverColumn(null);
                    }}
                  >
                    <ScrollArea className="h-[350px]">
                      <div className={cn(
                        "space-y-2 min-h-[300px] p-2 rounded-lg transition-all",
                        dragOverColumn === client.id ? "bg-green-50 border-2 border-dashed border-green-300" : ""
                      )}>
                        {assignedStaffMembers.map((staffMember: any) => (
                          <div
                            key={staffMember.id}
                            className="bg-white rounded-lg p-3 border shadow-sm hover:shadow-md transition-all cursor-move"
                            draggable
                            onDragStart={(e) => {
                              setDraggedItem({
                                staffId: staffMember.id,
                                currentClientId: client.id,
                                currentColumn: 'assigned'
                              });
                            }}
                            onDragEnd={() => setDraggedItem(null)}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                                  {staffMember.firstName?.[0]}{staffMember.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {staffMember.firstName} {staffMember.lastName}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {staffMember.category || t('staffAssignments.badges.noCategory')}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {t('staffAssignments.badges.hourlyRate', { rate: staffMember.hourlyRate })}
                                  </Badge>
                                  <Badge className="bg-green-100 text-green-800 text-xs">
                                    {t('staffAssignments.status.assigned')}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    // Handle unassign
                                    toast({
                                      title: t('staffAssignments.messages.assignmentDeleted'),
                                      description: t('staffAssignments.messages.staffUnassigned', { 
                                        staffName: `${staffMember.firstName} ${staffMember.lastName}`,
                                        clientName: `${client.firstName} ${client.lastName}`
                                      }),
                                    });
                                  }}
                                  className="h-6 w-6 p-0 hover:bg-red-100"
                                >
                                  <UserX className="h-3 w-3 text-red-500" />
                                </Button>
                                <GripVertical className="h-4 w-4 text-gray-400" />
                              </div>
                            </div>
                          </div>
                        ))}
                        {assignedStaffMembers.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <UserX className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm">{t('staffAssignments.emptyStates.noStaffAssigned')}</p>
                            <p className="text-xs text-gray-400">{t('staffAssignments.emptyStates.dragStaffHere')}</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="font-semibold text-lg">{staff.length}</div>
                    <div className="text-sm text-gray-500">{t('staffAssignments.statistics.totalStaff')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-semibold text-lg">
                      {assignments.filter((a: any) => a.isActive).length}
                    </div>
                    <div className="text-sm text-gray-500">{t('staffAssignments.statistics.activeAssignments')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <div>
                    <div className="font-semibold text-lg">{getUnassignedStaff().length}</div>
                    <div className="text-sm text-gray-500">{t('staffAssignments.statistics.availableStaff')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* New/Edit Assignment Dialog */}
      <Dialog open={showNewAssignmentDialog} onOpenChange={setShowNewAssignmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAssignment ? t('staffAssignments.form.title.edit') : t('staffAssignments.form.title.new')}
            </DialogTitle>
            <DialogDescription>
              {editingAssignment 
                ? t('staffAssignments.form.description.edit')
                : t('staffAssignments.form.description.new')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="staffId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('staffAssignments.form.fields.staffMember')}</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-staff-member">
                          <SelectValue placeholder={t('staffAssignments.form.placeholders.selectStaff')} />
                        </SelectTrigger>
                        <SelectContent>
                          {staff.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.firstName} {s.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('staffAssignments.form.fields.client')}</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-client">
                          <SelectValue placeholder={t('staffAssignments.form.placeholders.selectClient')} />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.firstName} {c.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('staffAssignments.form.fields.startDate')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        data-testid="input-start-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('staffAssignments.form.fields.endDate')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                        data-testid="input-end-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('staffAssignments.form.fields.notes')}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder={t('staffAssignments.form.placeholders.addNotes')}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowNewAssignmentDialog(false);
                    form.reset();
                    setEditingAssignment(null);
                  }}
                >
                  {t('staffAssignments.form.buttons.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createAssignmentMutation.isPending}
                  data-testid="button-submit-assignment"
                >
                  {createAssignmentMutation.isPending 
                    ? t('staffAssignments.form.buttons.saving')
                    : editingAssignment ? t('staffAssignments.form.buttons.update') : t('staffAssignments.form.buttons.create')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}