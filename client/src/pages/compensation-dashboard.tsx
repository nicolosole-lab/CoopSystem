import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, isValid, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { 
  Calculator, 
  Download, 
  FileText, 
  Filter, 
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  AlertTriangle,
  Settings,
  Trash2,
  Wallet
} from 'lucide-react';
import { Link, useLocation } from 'wouter';

interface Compensation {
  id: string;
  staffId: string;
  staffName?: string;
  periodStart: string;
  periodEnd: string;
  regularHours: string;
  overtimeHours: string;
  weekendHours: string;
  holidayHours: string;
  totalMileage: string;
  baseCompensation: string;
  overtimeCompensation: string;
  weekendCompensation: string;
  holidayCompensation: string;
  mileageReimbursement: string;
  adjustments: string;
  totalCompensation: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'paid' | 'cancelled';
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  notes?: string;
  paySlipGenerated?: boolean;
  paySlipUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface Staff {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  hasActiveRate?: boolean;
  rateCount?: number;
}

// Helper function to safely parse and format dates
const formatDate = (dateStr: string | null | undefined, formatStr: string = 'MMM dd, yyyy'): string => {
  if (!dateStr) return 'N/A';
  
  try {
    // Try to parse the date string
    let date: Date;
    
    // Check if it's already a valid date string
    if (typeof dateStr === 'string') {
      // Try parsing as ISO string first
      date = parseISO(dateStr);
      
      // If that doesn't work, try direct Date constructor
      if (!isValid(date)) {
        date = new Date(dateStr);
      }
    } else {
      date = new Date(dateStr);
    }
    
    // Check if date is valid
    if (!isValid(date)) {
      console.error('Invalid date:', dateStr);
      return 'Invalid Date';
    }
    
    // Check for Unix epoch (Jan 1, 1970) which usually indicates a problem
    if (date.getFullYear() === 1970 && date.getMonth() === 0 && date.getDate() === 1) {
      console.error('Unix epoch date detected:', dateStr);
      return 'Invalid Date';
    }
    
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting date:', dateStr, error);
    return 'Invalid Date';
  }
};

export default function CompensationDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | 'last' | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [batchPeriodStart, setBatchPeriodStart] = useState('');
  const [batchPeriodEnd, setBatchPeriodEnd] = useState('');
  const [staffSearchTerm, setStaffSearchTerm] = useState('');

  // Fetch all compensations
  const { data: compensations = [], isLoading: compensationsLoading } = useQuery<Compensation[]>({
    queryKey: ['/api/compensations/all'],
  });

  // Fetch all staff with rate status
  const { data: staff = [], isLoading: staffLoading } = useQuery<Staff[]>({
    queryKey: ['/api/staff?includeRateStatus=true'],
  });

  // Calculate statistics
  const stats = {
    total: compensations.length,
    pending: compensations.filter(c => c.status === 'pending_approval').length,
    approved: compensations.filter(c => c.status === 'approved').length,
    paid: compensations.filter(c => c.status === 'paid').length,
    totalAmount: compensations.reduce((sum, c) => sum + parseFloat(c.totalCompensation || '0'), 0),
    paidAmount: compensations.filter(c => c.status === 'paid').reduce((sum, c) => sum + parseFloat(c.totalCompensation || '0'), 0),
    pendingAmount: compensations.filter(c => c.status === 'pending_approval').reduce((sum, c) => sum + parseFloat(c.totalCompensation || '0'), 0),
  };

  // Filter and sort compensations
  const filteredCompensations = compensations
    .filter(comp => {
      const matchesStatus = statusFilter === 'all' || comp.status === statusFilter;
      const matchesSearch = !searchTerm || 
        comp.staffName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comp.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesPeriod = true;
      if (selectedPeriod === 'current') {
        const currentMonth = new Date().getMonth();
        const compMonth = new Date(comp.periodStart).getMonth();
        matchesPeriod = currentMonth === compMonth;
      } else if (selectedPeriod === 'last') {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const compMonth = new Date(comp.periodStart).getMonth();
        matchesPeriod = lastMonth.getMonth() === compMonth;
      }
      
      return matchesStatus && matchesSearch && matchesPeriod;
    })
    .sort((a, b) => {
      // Sort by createdAt in descending order (newest first)
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

  // Batch generate compensations
  const batchGenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/compensations/batch-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          staffIds: selectedStaff,
          periodStart: batchPeriodStart,
          periodEnd: batchPeriodEnd,
        }),
      });
      if (!response.ok) throw new Error('Failed to generate compensations');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/compensations/all'] });
      toast({
        title: "Success",
        description: `Generated ${data.count} compensation records`,
      });
      setSelectedStaff([]);
      setBatchPeriodStart('');
      setBatchPeriodEnd('');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate compensations",
        variant: "destructive",
      });
    },
  });

  // Export to Excel
  const exportToExcelMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/compensations/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          compensationIds: filteredCompensations.map(c => c.id),
        }),
      });
      if (!response.ok) throw new Error('Failed to export compensations');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compensations_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Compensations exported successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to export compensations",
        variant: "destructive",
      });
    },
  });

  // Batch approve compensations
  const batchApproveMutation = useMutation({
    mutationFn: async (compensationIds: string[]) => {
      const response = await fetch('/api/compensations/batch-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ compensationIds }),
      });
      if (!response.ok) throw new Error('Failed to approve compensations');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/compensations/all'] });
      toast({
        title: "Success",
        description: `Approved ${data.count} compensation records`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve compensations",
        variant: "destructive",
      });
    },
  });



  // Delete compensation
  const deleteCompensationMutation = useMutation({
    mutationFn: async (compensationId: string) => {
      const response = await fetch(`/api/compensations/${compensationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete compensation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compensations/all'] });
      toast({
        title: "Success",
        description: "Compensation record deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete compensation record",
        variant: "destructive",
      });
    },
  });

  if (compensationsLoading || staffLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading compensation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
          Compensation Dashboard
        </h1>
        <div className="flex gap-2">
          <Button
            onClick={() => exportToExcelMutation.mutate()}
            disabled={exportToExcelMutation.isPending || filteredCompensations.length === 0}
            variant="outline"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Compensations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              €{stats.totalAmount.toFixed(2)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              €{stats.pendingAmount.toFixed(2)} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">
              Ready for payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            <p className="text-xs text-muted-foreground">
              €{stats.paidAmount.toFixed(2)} paid
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Batch Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Batch Compensation Generation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label className="text-base font-semibold">Select Staff Members</Label>
              <div className="mt-3 space-y-2">
                <div className="text-sm text-muted-foreground mb-3 flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span>Staff without configured rates cannot be selected</span>
                </div>
                
                {/* Search and Select All Controls */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        type="text"
                        placeholder="Search staff by name..."
                        value={staffSearchTerm}
                        onChange={(e) => setStaffSearchTerm(e.target.value)}
                        className="pl-10 text-base h-12"
                      />
                      <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const filteredStaff = staff.filter(s => {
                          const searchLower = staffSearchTerm.toLowerCase();
                          const matchesSearch = !staffSearchTerm || 
                            s.firstName.toLowerCase().includes(searchLower) ||
                            s.lastName.toLowerCase().includes(searchLower) ||
                            `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchLower);
                          return matchesSearch && s.hasActiveRate === true;
                        });
                        const staffIds = filteredStaff.map(s => s.id);
                        setSelectedStaff(staffIds);
                      }}
                      className="text-base px-4 h-12"
                      disabled={staff.filter(s => s.hasActiveRate === true).length === 0}
                    >
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Select All with Rates
                    </Button>
                  </div>
                  
                  {/* Selection Status */}
                  {selectedStaff.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-700">
                        {selectedStaff.length} staff member{selectedStaff.length !== 1 ? 's' : ''} selected
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedStaff([])}
                        className="text-blue-700 hover:text-blue-900"
                      >
                        Clear Selection
                      </Button>
                    </div>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto border-2 rounded-lg p-3 bg-white">
                  {(() => {
                    const filteredStaff = staff.filter(s => {
                      const searchLower = staffSearchTerm.toLowerCase();
                      return s.firstName.toLowerCase().includes(searchLower) ||
                             s.lastName.toLowerCase().includes(searchLower) ||
                             `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchLower);
                    });

                    if (filteredStaff.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-base">No staff members found</p>
                          {staffSearchTerm && (
                            <p className="text-sm mt-2">Try adjusting your search term</p>
                          )}
                        </div>
                      );
                    }

                    return (
                      <>
                        <div className="text-sm text-gray-600 mb-2 sticky top-0 bg-white pb-2 border-b">
                          Showing {filteredStaff.length} of {staff.length} staff members
                        </div>
                        {filteredStaff.map(s => {
                          const hasRate = s.hasActiveRate === true;
                          const isDisabled = !hasRate;
                          
                          return (
                            <label 
                              key={s.id} 
                              className={`flex items-center gap-3 p-3 rounded-lg mb-2 border ${
                                isDisabled 
                                  ? 'opacity-60 cursor-not-allowed bg-gray-100 border-gray-200' 
                                  : 'hover:bg-blue-50 cursor-pointer border-gray-300 hover:border-blue-400'
                              }`}
                              title={isDisabled ? 'This staff member needs rate configuration before compensation can be generated' : ''}
                            >
                              <input
                                type="checkbox"
                                checked={selectedStaff.includes(s.id)}
                                onChange={(e) => {
                                  if (!isDisabled) {
                                    if (e.target.checked) {
                                      setSelectedStaff([...selectedStaff, s.id]);
                                    } else {
                                      setSelectedStaff(selectedStaff.filter(id => id !== s.id));
                                    }
                                  }
                                }}
                                disabled={isDisabled}
                                className="w-5 h-5 rounded border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                              <span className="text-base flex-1 font-medium">{s.firstName} {s.lastName}</span>
                              {!hasRate && (
                                <div className="flex items-center gap-2">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>No active rates configured</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Link 
                                          href={`/staff/${s.id}`}
                                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline p-1"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Settings className="h-5 w-5" />
                                        </Link>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Configure rates</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              )}
                            </label>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="batch-start" className="text-base font-semibold">Period Start</Label>
              <Input
                id="batch-start"
                type="date"
                value={batchPeriodStart}
                onChange={(e) => setBatchPeriodStart(e.target.value)}
                className="mt-2 text-base h-12"
              />
            </div>
            <div>
              <Label htmlFor="batch-end" className="text-base font-semibold">Period End</Label>
              <Input
                id="batch-end"
                type="date"
                value={batchPeriodEnd}
                onChange={(e) => setBatchPeriodEnd(e.target.value)}
                className="mt-2 text-base h-12"
              />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <Button
              onClick={() => batchGenerateMutation.mutate()}
              disabled={batchGenerateMutation.isPending || selectedStaff.length === 0 || !batchPeriodStart || !batchPeriodEnd}
              className="bg-blue-600 hover:bg-blue-700 text-base px-6 py-6 h-auto"
            >
              <Calculator className="mr-2 h-5 w-5" />
              Generate Compensations ({selectedStaff.length} staff)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by staff name or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="period">Period</Label>
              <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
                <SelectTrigger id="period">
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
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setSelectedPeriod('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compensations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Compensation Records</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCompensations.length > 0 ? (
            <>
              {statusFilter === 'pending_approval' && filteredCompensations.length > 0 && (
                <div className="mb-4">
                  <Button
                    onClick={() => batchApproveMutation.mutate(filteredCompensations.map(c => c.id))}
                    disabled={batchApproveMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve All ({filteredCompensations.length})
                  </Button>
                </div>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Generated</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompensations.map((comp) => {
                      const totalHours = parseFloat(comp.regularHours) + parseFloat(comp.overtimeHours) + 
                                        parseFloat(comp.weekendHours) + parseFloat(comp.holidayHours);
                      
                      return (
                        <TableRow key={comp.id}>
                          <TableCell className="font-medium">
                            <Link href={`/staff/${comp.staffId}`} className="text-blue-600 hover:underline">
                              {comp.staffName || 'Unknown Staff'}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {formatDate(comp.periodStart, 'MMM dd')} - {formatDate(comp.periodEnd, 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className="text-sm">{formatDate(comp.createdAt, 'MMM dd, yyyy')}</div>
                                <div className="text-xs text-gray-500">{formatDate(comp.createdAt, 'HH:mm')}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{totalHours.toFixed(2)}h</TableCell>
                          <TableCell className="font-semibold text-green-600">
                            €{parseFloat(comp.totalCompensation).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {comp.status === 'pending_approval' && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                <Clock className="mr-1 h-3 w-3" />
                                Pending
                              </Badge>
                            )}
                            {comp.status === 'approved' && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Approved
                              </Badge>
                            )}
                            {comp.status === 'paid' && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                <DollarSign className="mr-1 h-3 w-3" />
                                Paid
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Link href={`/staff/${comp.staffId}?tab=compensation`}>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              {comp.status === 'pending_approval' && (
                                <Link href={`/compensation/${comp.id}/budget-allocation`}>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                                  >
                                    <Wallet className="h-4 w-4" />
                                  </Button>
                                </Link>
                              )}
                              {comp.status === 'approved' && comp.paySlipGenerated && (
                                <Button size="sm" variant="outline">
                                  <FileText className="h-4 w-4" />
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this compensation record?')) {
                                    deleteCompensationMutation.mutate(comp.id);
                                  }
                                }}
                                disabled={deleteCompensationMutation.isPending}
                                className="hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No compensation records found matching your filters.
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
}