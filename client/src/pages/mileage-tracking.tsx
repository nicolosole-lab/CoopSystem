import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { 
  MapPin, 
  Navigation, 
  DollarSign,
  Calendar,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  Edit,
  Trash2,
  Plus,
  Car,
  Route,
  FileText
} from 'lucide-react';

interface MileageLog {
  id: string;
  staffId: string;
  staffName?: string;
  clientId?: string;
  clientName?: string;
  date: string;
  startLocation: string;
  endLocation: string;
  distance: number;
  purpose: string;
  ratePerKm: number;
  totalReimbursement: number;
  status: 'pending' | 'approved' | 'rejected' | 'disputed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface MileageDispute {
  id: string;
  mileageLogId: string;
  raisedBy: string;
  reason: string;
  proposedDistance?: number;
  proposedRate?: number;
  status: 'open' | 'resolved' | 'rejected';
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export default function MileageTracking() {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | 'last' | 'all'>('current');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [selectedLog, setSelectedLog] = useState<MileageLog | null>(null);
  
  // Form states for new mileage log
  const [newLog, setNewLog] = useState({
    staffId: '',
    clientId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startLocation: '',
    endLocation: '',
    distance: '',
    purpose: '',
    ratePerKm: '0.50',
    notes: ''
  });

  // Form state for dispute
  const [disputeForm, setDisputeForm] = useState({
    reason: '',
    proposedDistance: '',
    proposedRate: ''
  });

  // Fetch mileage logs
  const { data: mileageLogs = [], isLoading: logsLoading } = useQuery<MileageLog[]>({
    queryKey: ['/api/mileage-logs'],
  });

  // Fetch staff for dropdown
  const { data: staff = [] } = useQuery<any[]>({
    queryKey: ['/api/staff'],
  });

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/clients'],
  });

  // Calculate statistics
  const stats = {
    totalLogs: mileageLogs.length,
    totalDistance: mileageLogs.reduce((sum, log) => sum + log.distance, 0),
    totalReimbursement: mileageLogs.reduce((sum, log) => sum + log.totalReimbursement, 0),
    pendingLogs: mileageLogs.filter(log => log.status === 'pending').length,
    disputedLogs: mileageLogs.filter(log => log.status === 'disputed').length,
    avgDistancePerTrip: mileageLogs.length > 0 ? 
      (mileageLogs.reduce((sum, log) => sum + log.distance, 0) / mileageLogs.length).toFixed(1) : 0
  };

  // Filter logs
  const filteredLogs = mileageLogs.filter(log => {
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    
    let matchesPeriod = true;
    if (selectedPeriod === 'current') {
      const currentMonth = new Date().getMonth();
      const logMonth = new Date(log.date).getMonth();
      matchesPeriod = currentMonth === logMonth;
    } else if (selectedPeriod === 'last') {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const logMonth = new Date(log.date).getMonth();
      matchesPeriod = lastMonth.getMonth() === logMonth;
    }
    
    return matchesStatus && matchesPeriod;
  });

  // Create mileage log
  const createMileageLogMutation = useMutation({
    mutationFn: async () => {
      const totalReimbursement = parseFloat(newLog.distance) * parseFloat(newLog.ratePerKm);
      return await apiRequest('POST', '/api/mileage-logs', {
        ...newLog,
        clientId: newLog.clientId === 'none' ? null : newLog.clientId,
        distance: parseFloat(newLog.distance),
        ratePerKm: parseFloat(newLog.ratePerKm),
        totalReimbursement,
        status: 'pending'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mileage-logs'] });
      toast({
        title: "Success",
        description: "Mileage log created successfully",
      });
      setShowAddDialog(false);
      setNewLog({
        staffId: '',
        clientId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        startLocation: '',
        endLocation: '',
        distance: '',
        purpose: '',
        ratePerKm: '0.50',
        notes: ''
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create mileage log",
        variant: "destructive",
      });
    },
  });

  // Approve mileage log
  const approveMileageLogMutation = useMutation({
    mutationFn: async (logId: string) => {
      return await apiRequest('POST', `/api/mileage-logs/${logId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mileage-logs'] });
      toast({
        title: "Success",
        description: "Mileage log approved",
      });
    },
  });

  // Reject mileage log
  const rejectMileageLogMutation = useMutation({
    mutationFn: async (logId: string) => {
      return await apiRequest('POST', `/api/mileage-logs/${logId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mileage-logs'] });
      toast({
        title: "Success",
        description: "Mileage log rejected",
      });
    },
  });

  // Create dispute
  const createDisputeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLog) return;
      return await apiRequest('POST', '/api/mileage-disputes', {
        mileageLogId: selectedLog.id,
        ...disputeForm,
        proposedDistance: disputeForm.proposedDistance ? parseFloat(disputeForm.proposedDistance) : undefined,
        proposedRate: disputeForm.proposedRate ? parseFloat(disputeForm.proposedRate) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mileage-logs'] });
      toast({
        title: "Success",
        description: "Dispute raised successfully",
      });
      setShowDisputeDialog(false);
      setDisputeForm({
        reason: '',
        proposedDistance: '',
        proposedRate: ''
      });
    },
  });

  // Bulk approve
  const bulkApproveMutation = useMutation({
    mutationFn: async () => {
      const pendingLogIds = filteredLogs
        .filter(log => log.status === 'pending')
        .map(log => log.id);
      
      return await apiRequest('POST', '/api/mileage-logs/bulk-approve', { 
        logIds: pendingLogIds 
      });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/mileage-logs'] });
      toast({
        title: "Success",
        description: `Approved ${data.count} mileage logs`,
      });
    },
  });

  if (logsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading mileage data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
          Mileage Tracking
        </h1>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Mileage Log
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Mileage Log</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="staff">Staff Member</Label>
                  <Select value={newLog.staffId} onValueChange={(value) => setNewLog({...newLog, staffId: value})}>
                    <SelectTrigger id="staff">
                      <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.firstName} {s.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="client">Client (Optional)</Label>
                  <Select value={newLog.clientId} onValueChange={(value) => setNewLog({...newLog, clientId: value})}>
                    <SelectTrigger id="client">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.firstName} {c.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newLog.date}
                    onChange={(e) => setNewLog({...newLog, date: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="distance">Distance (km)</Label>
                  <Input
                    id="distance"
                    type="number"
                    step="0.1"
                    value={newLog.distance}
                    onChange={(e) => setNewLog({...newLog, distance: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start">Start Location</Label>
                  <Input
                    id="start"
                    value={newLog.startLocation}
                    onChange={(e) => setNewLog({...newLog, startLocation: e.target.value})}
                    placeholder="e.g., Office"
                  />
                </div>
                <div>
                  <Label htmlFor="end">End Location</Label>
                  <Input
                    id="end"
                    value={newLog.endLocation}
                    onChange={(e) => setNewLog({...newLog, endLocation: e.target.value})}
                    placeholder="e.g., Client's home"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purpose">Purpose</Label>
                  <Input
                    id="purpose"
                    value={newLog.purpose}
                    onChange={(e) => setNewLog({...newLog, purpose: e.target.value})}
                    placeholder="e.g., Client visit"
                  />
                </div>
                <div>
                  <Label htmlFor="rate">Rate per km (€)</Label>
                  <Input
                    id="rate"
                    type="number"
                    step="0.01"
                    value={newLog.ratePerKm}
                    onChange={(e) => setNewLog({...newLog, ratePerKm: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={newLog.notes}
                  onChange={(e) => setNewLog({...newLog, notes: e.target.value})}
                  placeholder="Additional notes..."
                />
              </div>
              {newLog.distance && newLog.ratePerKm && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Reimbursement:</p>
                  <p className="text-2xl font-bold text-green-600">
                    €{(parseFloat(newLog.distance) * parseFloat(newLog.ratePerKm)).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMileageLogMutation.mutate()}
                disabled={createMileageLogMutation.isPending || !newLog.staffId || !newLog.distance || !newLog.startLocation || !newLog.endLocation}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create Log
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
            <Route className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDistance.toFixed(1)} km</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalLogs} trips recorded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reimbursement</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">€{stats.totalReimbursement.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Avg €{stats.avgDistancePerTrip}/trip
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingLogs}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disputed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.disputedLogs}</div>
            <p className="text-xs text-muted-foreground">
              Require resolution
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div>
              <Label htmlFor="period">Period</Label>
              <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
                <SelectTrigger id="period" className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Month</SelectItem>
                  <SelectItem value="last">Last Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status" className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {statusFilter === 'pending' && filteredLogs.filter(log => log.status === 'pending').length > 0 && (
              <div className="flex items-end">
                <Button
                  onClick={() => bulkApproveMutation.mutate()}
                  disabled={bulkApproveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Bulk Approve ({filteredLogs.filter(log => log.status === 'pending').length})
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mileage Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Mileage Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{format(new Date(log.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{log.staffName || 'Unknown'}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {log.startLocation}
                          </div>
                          <div className="flex items-center gap-1 text-gray-500">
                            <Navigation className="h-3 w-3" />
                            {log.endLocation}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{log.distance} km</TableCell>
                      <TableCell>{log.purpose}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        €{log.totalReimbursement.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {log.status === 'pending' && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                            <Clock className="mr-1 h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                        {log.status === 'approved' && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Approved
                          </Badge>
                        )}
                        {log.status === 'rejected' && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                            Rejected
                          </Badge>
                        )}
                        {log.status === 'disputed' && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Disputed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {log.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => approveMileageLogMutation.mutate(log.id)}
                                disabled={approveMileageLogMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => rejectMileageLogMutation.mutate(log.id)}
                                disabled={rejectMileageLogMutation.isPending}
                              >
                                <AlertTriangle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedLog(log);
                              setShowDisputeDialog(true);
                            }}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No mileage logs found matching your filters.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dispute Dialog */}
      <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise Dispute</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <p><strong>Log:</strong> {format(new Date(selectedLog.date), 'MMM dd, yyyy')}</p>
                <p><strong>Route:</strong> {selectedLog.startLocation} → {selectedLog.endLocation}</p>
                <p><strong>Current Distance:</strong> {selectedLog.distance} km</p>
                <p><strong>Current Rate:</strong> €{selectedLog.ratePerKm}/km</p>
              </div>
              <div>
                <Label htmlFor="reason">Reason for Dispute</Label>
                <Textarea
                  id="reason"
                  value={disputeForm.reason}
                  onChange={(e) => setDisputeForm({...disputeForm, reason: e.target.value})}
                  placeholder="Explain the reason for this dispute..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="proposedDistance">Proposed Distance (km)</Label>
                  <Input
                    id="proposedDistance"
                    type="number"
                    step="0.1"
                    value={disputeForm.proposedDistance}
                    onChange={(e) => setDisputeForm({...disputeForm, proposedDistance: e.target.value})}
                    placeholder="Leave empty if no change"
                  />
                </div>
                <div>
                  <Label htmlFor="proposedRate">Proposed Rate (€/km)</Label>
                  <Input
                    id="proposedRate"
                    type="number"
                    step="0.01"
                    value={disputeForm.proposedRate}
                    onChange={(e) => setDisputeForm({...disputeForm, proposedRate: e.target.value})}
                    placeholder="Leave empty if no change"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDisputeDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createDisputeMutation.mutate()}
                  disabled={createDisputeMutation.isPending || !disputeForm.reason}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Raise Dispute
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}