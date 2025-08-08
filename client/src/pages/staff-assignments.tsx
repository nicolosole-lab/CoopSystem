import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, UserPlus, Search, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function StaffAssignments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStaff, setFilterStaff] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');

  // Fetch staff data
  const { data: staff = [] } = useQuery<any[]>({
    queryKey: ['/api/staff'],
    retry: false
  });

  // Fetch clients data
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/clients'],
    retry: false
  });

  // For now, we'll create mock assignments by matching staff with clients
  // In production, this would come from a dedicated API endpoint
  const assignments = staff.flatMap(s => 
    s.clients?.map((clientId: string) => {
      const client = clients.find(c => c.id === clientId);
      return client ? {
        id: `${s.id}-${clientId}`,
        staffId: s.id,
        staffName: `${s.firstName} ${s.lastName}`,
        clientId: client.id,
        clientName: `${client.firstName} ${client.lastName}`,
        serviceType: client.serviceType || '1. Assistenza alla persona',
        status: 'Active'
      } : null;
    }).filter(Boolean) || []
  );

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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Staff Assignments</h1>
        <p className="text-muted-foreground">Manage staff-client assignments and relationships</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Current Assignments
              <Badge variant="secondary">{filteredAssignments.length} assignments</Badge>
            </div>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              New Assignment
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff or client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterStaff} onValueChange={setFilterStaff}>
              <SelectTrigger>
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
              <SelectTrigger>
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

          {/* Clear Filters */}
          {(searchTerm || filterStaff || filterClient) && (
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterStaff('');
                  setFilterClient('');
                }}
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          )}

          {/* Assignments Table */}
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
                    <TableRow key={assignment.id}>
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
                        <Badge variant="default" className="text-xs">
                          {assignment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}