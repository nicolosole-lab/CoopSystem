import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, UserPlus, Search, Filter, Edit, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const assignmentSchema = z.object({
  staffId: z.string().min(1, 'Staff member is required'),
  clientId: z.string().min(1, 'Client is required'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().optional()
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

export default function StaffAssignments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStaff, setFilterStaff] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [showNewAssignmentDialog, setShowNewAssignmentDialog] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
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
    queryKey: ['/api/staff-assignments'],
    queryFn: async () => {
      // For now, we'll create assignments by matching staff with clients
      // In production, this would come from a dedicated API endpoint
      const staffAssignments = staff.flatMap(s => 
        s.clients?.map((clientId: string) => {
          const client = clients.find(c => c.id === clientId);
          return client ? {
            id: `${s.id}-${clientId}`,
            staffId: s.id,
            staffName: `${s.firstName} ${s.lastName}`,
            clientId: client.id,
            clientName: `${client.firstName} ${client.lastName}`,
            serviceType: client.serviceType || 'Assistenza alla persona',
            status: 'Active',
            startDate: null,
            endDate: null
          } : null;
        }).filter(Boolean) || []
      );
      return staffAssignments;
    },
    enabled: !loadingStaff && !loadingClients
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

  // Apply filters
  const filteredAssignments = assignments.filter((assignment: any) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!assignment.staffName.toLowerCase().includes(searchLower) &&
          !assignment.clientName.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    if (filterStaff !== 'all' && assignment.staffId !== filterStaff) {
      return false;
    }
    if (filterClient !== 'all' && assignment.clientId !== filterClient) {
      return false;
    }
    return true;
  });

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
          <h1 className="text-3xl font-bold mb-2">Staff Assignments</h1>
          <p className="text-muted-foreground">Manage staff-client assignments and relationships</p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">Loading assignments...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Staff Assignments</h1>
        <p className="text-muted-foreground">Manage staff-client assignments and relationships</p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>Current Assignments</CardTitle>
              <Badge variant="secondary" className="ml-2">
                {filteredAssignments.length} assignments
              </Badge>
            </div>
            <Button 
              onClick={() => {
                setEditingAssignment(null);
                form.reset();
                setShowNewAssignmentDialog(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              New Assignment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff or client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-assignments"
              />
            </div>

            <Select value={filterStaff} onValueChange={setFilterStaff}>
              <SelectTrigger data-testid="select-filter-staff">
                <SelectValue placeholder="All Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {staff.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger data-testid="select-filter-client">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          {(searchTerm || (filterStaff && filterStaff !== 'all') || (filterClient && filterClient !== 'all')) && (
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterStaff('all');
                  setFilterClient('all');
                }}
                data-testid="button-clear-filters"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          )}

          {/* Assignments Table or Empty State */}
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {assignments.length === 0 
                ? "No staff assignments found. Create your first assignment to get started."
                : "No assignments match your filters. Try adjusting your search criteria."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map((assignment: any) => (
                    <TableRow key={assignment.id} data-testid={`row-assignment-${assignment.id}`}>
                      <TableCell>
                        <Link href={`/staff/${assignment.staffId}`}>
                          <span className="text-blue-600 hover:underline cursor-pointer">
                            {assignment.staffName}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/clients/${assignment.clientId}`}>
                          <span className="text-blue-600 hover:underline cursor-pointer">
                            {assignment.clientName}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {assignment.serviceType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          {assignment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEdit(assignment)}
                            data-testid={`button-edit-${assignment.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(assignment.id)}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-${assignment.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New/Edit Assignment Dialog */}
      <Dialog open={showNewAssignmentDialog} onOpenChange={setShowNewAssignmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAssignment ? 'Edit Assignment' : 'New Assignment'}
            </DialogTitle>
            <DialogDescription>
              {editingAssignment 
                ? 'Update the staff-client assignment details.'
                : 'Create a new staff-client assignment.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="staffId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff Member</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-staff-member">
                          <SelectValue placeholder="Select a staff member" />
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
                    <FormLabel>Client</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-client">
                          <SelectValue placeholder="Select a client" />
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
                    <FormLabel>Start Date (Optional)</FormLabel>
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
                    <FormLabel>End Date (Optional)</FormLabel>
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
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Add any notes about this assignment"
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
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createAssignmentMutation.isPending}
                  data-testid="button-submit-assignment"
                >
                  {createAssignmentMutation.isPending 
                    ? 'Saving...' 
                    : editingAssignment ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}