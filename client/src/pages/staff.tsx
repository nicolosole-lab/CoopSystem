import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit, Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { StaffForm } from "@/components/forms/staff-form";
import type { Staff } from "@shared/schema";
import { useTranslation } from 'react-i18next';

export default function StaffPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: staffMembers = [], isLoading, error } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
    retry: false,
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (staffId: string) => {
      await apiRequest("DELETE", `/api/staff/${staffId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({
        title: t('common.success'),
        description: t('staff.deleteSuccess'),
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete staff member",
        variant: "destructive",
      });
    },
  });

  if (error && isUnauthorizedError(error as Error)) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
    return null;
  }

  const filteredStaff = staffMembers.filter((staff) => {
    const matchesSearch = 
      staff.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || staff.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statuses = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-slate-100 text-slate-800",
    };
    const className = statuses[status as keyof typeof statuses] || "bg-slate-100 text-slate-800";
    return <Badge className={className}>{t(`staff.status.${status}`)}</Badge>;
  };

  const handleEdit = (staff: Staff) => {
    setSelectedStaff(staff);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (staffId: string) => {
    if (confirm(t('staff.confirmDelete'))) {
      deleteStaffMutation.mutate(staffId);
    }
  };

  const handleFormSuccess = () => {
    setIsAddDialogOpen(false);
    setIsEditDialogOpen(false);
    setSelectedStaff(null);
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-64"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2" data-testid="text-staff-title">
            {t('staff.title')}
          </h2>
          <p className="text-slate-600">{t('staff.description')}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mt-4 sm:mt-0 bg-primary hover:bg-primary/90" data-testid="button-add-staff">
              <Plus className="mr-2 h-4 w-4" />
              {t('staff.addStaff')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('staff.addStaff')}</DialogTitle>
            </DialogHeader>
            <StaffForm onSuccess={handleFormSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="staff-search" className="block text-sm font-medium text-slate-700 mb-2">
                Search Staff
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="staff-search"
                  className="pl-10"
                  placeholder={t('staff.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-staff"
                />
              </div>
            </div>

            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-slate-700 mb-2">
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder={t('staff.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('staff.allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('staff.status.active')}</SelectItem>
                  <SelectItem value="inactive">{t('staff.status.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Members ({filteredStaff.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStaff.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-600" data-testid="text-no-staff">
                {staffMembers.length === 0 ? t('staff.startAdding') : t('common.noMatchingResults')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Staff Member</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Contact</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Hourly Rate</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Specializations</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Status</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50" data-testid={`row-staff-${staff.id}`}>
                      <td className="py-4 px-6">
                        <div>
                          <p className="text-sm font-medium text-slate-900" data-testid={`text-staff-name-${staff.id}`}>
                            {staff.firstName} {staff.lastName}
                          </p>
                          <p className="text-xs text-slate-600" data-testid={`text-staff-id-${staff.id}`}>
                            ID: {staff.id.slice(0, 8)}...
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm text-slate-900" data-testid={`text-staff-email-${staff.id}`}>
                          {staff.email || "No email"}
                        </p>
                        <p className="text-xs text-slate-600" data-testid={`text-staff-phone-${staff.id}`}>
                          {staff.phone || "No phone"}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm font-medium text-slate-900" data-testid={`text-staff-rate-${staff.id}`}>
                          €{parseFloat(staff.hourlyRate).toFixed(2)}/hr
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1" data-testid={`specializations-${staff.id}`}>
                          {staff.specializations && staff.specializations.length > 0 ? (
                            staff.specializations.map((spec, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {spec}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-slate-600">None specified</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6" data-testid={`badge-staff-status-${staff.id}`}>
                        {getStatusBadge(staff.status)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(staff)}
                            data-testid={`button-edit-staff-${staff.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(staff.id)}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-staff-${staff.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Staff Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <StaffForm
              staff={selectedStaff}
              onSuccess={handleFormSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
