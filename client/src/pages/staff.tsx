import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Edit, Plus, Search, Eye, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { StaffForm } from "@/components/forms/staff-form";
import type { StaffWithRates } from "@shared/schema";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { usePermissions } from '@/hooks/usePermissions';
import { formatDisplayName, searchMatchesName } from '@/lib/utils';

export default function StaffPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [staffTypeFilter, setStaffTypeFilter] = useState<string>("all");
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string>("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedStaff, setSelectedStaff] = useState<StaffWithRates | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const {
    data: staffMembers = [],
    isLoading,
    error,
  } = useQuery<StaffWithRates[]>({
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
        title: t("common.success"),
        description: t("staff.deleteSuccess"),
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

  // Get unique service categories and types for filter options
  const uniqueServiceCategories = Array.from(new Set(
    staffMembers.map(staff => staff.category).filter(Boolean)
  )).sort();
  
  const uniqueServiceTypes = Array.from(new Set(
    staffMembers.map(staff => staff.services).filter(Boolean)
  )).sort();

  const filteredStaff = staffMembers.filter((staff) => {
    const matchesSearch = searchMatchesName(searchTerm || '', staff.firstName, staff.lastName) ||
      staff.email?.toLowerCase().includes((searchTerm || '').toLowerCase());

    const matchesStatus =
      statusFilter === "all" || staff.status === statusFilter;

    const matchesStaffType =
      staffTypeFilter === "all" || staff.type === staffTypeFilter;

    const matchesServiceCategory =
      serviceCategoryFilter === "all" || staff.category === serviceCategoryFilter;

    const matchesServiceType =
      serviceTypeFilter === "all" || staff.services === serviceTypeFilter;

    return matchesSearch && matchesStatus && matchesStaffType && matchesServiceCategory && matchesServiceType;
  }).sort((a, b) => {
    const aLast = (a.lastName || '').toLowerCase();
    const bLast = (b.lastName || '').toLowerCase();
    const aFirst = (a.firstName || '').toLowerCase();
    const bFirst = (b.firstName || '').toLowerCase();
    
    // First sort by last name
    if (aLast !== bLast) {
      return aLast.localeCompare(bLast);
    }
    
    // Then by first name
    return aFirst.localeCompare(bFirst);
  });

  // Pagination logic
  const totalItems = filteredStaff.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStaff = filteredStaff.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, staffTypeFilter, serviceCategoryFilter, serviceTypeFilter]);

  const getStatusBadge = (status: string) => {
    const statuses = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-slate-100 text-slate-800",
    };
    const className =
      statuses[status as keyof typeof statuses] ||
      "bg-slate-100 text-slate-800";
    return <Badge className={className}>{t(`staff.status.${status}`)}</Badge>;
  };

  const handleEdit = (staff: StaffWithRates) => {
    setSelectedStaff(staff);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (staffId: string) => {
    if (confirm(t("staff.confirmDelete"))) {
      deleteStaffMutation.mutate(staffId);
    }
  };

  const handleFormSuccess = () => {
    setIsAddDialogOpen(false);
    setIsEditDialogOpen(false);
    setSelectedStaff(null);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setStaffTypeFilter("all");
    setServiceCategoryFilter("all");
    setServiceTypeFilter("all");
    setCurrentPage(1);
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
          <h2
            className="text-2xl font-bold text-slate-900 mb-2"
            data-testid="text-staff-title"
          >
            {t("staff.title")}
          </h2>
          <p className="text-slate-600">{t("staff.description")}</p>
        </div>
        {canCreate('staff') && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="mt-4 sm:mt-0 bg-primary hover:bg-primary/90"
                data-testid="button-add-staff"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("staff.addStaff")}
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("staff.addStaff")}</DialogTitle>
            </DialogHeader>
            <StaffForm onSuccess={handleFormSuccess} />
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Search and Filters */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-900">{t('staff.filters.title')}</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="text-slate-600 hover:text-slate-900"
              data-testid="button-clear-filters"
            >
              <X className="h-4 w-4 mr-1" />
              {t('staff.filters.clearAll')}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label
                htmlFor="staff-search"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                {t('staff.filters.searchStaff')}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="staff-search"
                  className="pl-10"
                  placeholder={t('staff.filters.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-staff"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="status-filter"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                {t('staff.filters.status')}
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue>
                    {statusFilter === "all"
                      ? t('staff.filters.allStatuses')
                      : statusFilter === "active"
                        ? t('staff.status.active')
                        : statusFilter === "inactive"
                          ? t('staff.status.inactive')
                          : t('staff.filters.allStatuses')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('staff.filters.allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('staff.status.active')}</SelectItem>
                  <SelectItem value="inactive">{t('staff.status.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label
                htmlFor="staff-type-filter"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                {t('staff.filters.staffType')}
              </label>
              <Select value={staffTypeFilter} onValueChange={setStaffTypeFilter}>
                <SelectTrigger data-testid="select-staff-type-filter">
                  <SelectValue>
                    {staffTypeFilter === "all"
                      ? t('staff.filters.allTypes')
                      : staffTypeFilter === "internal"
                        ? t('staff.staffType.internal')
                        : staffTypeFilter === "external"
                          ? t('staff.staffType.external')
                          : t('staff.filters.allTypes')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('staff.filters.allTypes')}</SelectItem>
                  <SelectItem value="internal">{t('staff.staffType.internal')}</SelectItem>
                  <SelectItem value="external">{t('staff.staffType.external')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label
                htmlFor="service-category-filter"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                {t('staff.filters.serviceCategory')}
              </label>
              <Select value={serviceCategoryFilter} onValueChange={setServiceCategoryFilter}>
                <SelectTrigger data-testid="select-service-category-filter">
                  <SelectValue>
                    {serviceCategoryFilter === "all" ? t('staff.filters.allCategories') : serviceCategoryFilter}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('staff.filters.allCategories')}</SelectItem>
                  {uniqueServiceCategories.map((category) => (
                    <SelectItem key={category} value={category || ""}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label
                htmlFor="service-type-filter"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                {t('staff.filters.serviceType')}
              </label>
              <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                <SelectTrigger data-testid="select-service-type-filter">
                  <SelectValue>
                    {serviceTypeFilter === "all" ? t('staff.filters.allServices') : serviceTypeFilter}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('staff.filters.allServices')}</SelectItem>
                  {uniqueServiceTypes.map((serviceType) => (
                    <SelectItem key={serviceType} value={serviceType || ""}>
                      {serviceType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('staff.staffMembers')} ({totalItems})
          </CardTitle>
          <p className="text-sm text-slate-600">
            {t('staff.pagination.showing')} {Math.min(startIndex + 1, totalItems)} {t('staff.pagination.to')} {Math.min(endIndex, totalItems)} {t('staff.pagination.of')} {totalItems} {t('staff.pagination.results')}
          </p>
        </CardHeader>
        <CardContent>
          {paginatedStaff.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-600" data-testid="text-no-staff">
                {staffMembers.length === 0
                  ? t("staff.startAdding")
                  : t("common.noMatchingResults")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">
                      {t("staff.table.staffMember")}
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">
                      {t('staff.table.staffType')}
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">
                      {t("staff.table.hourlyRate")}
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">
                      {t("staff.table.specializations")}
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">
                      {t("common.status")}
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedStaff.map((staff) => (
                    <tr
                      key={staff.id}
                      className="hover:bg-slate-50"
                      data-testid={`row-staff-${staff.id}`}
                    >
                      <td className="py-4 px-6">
                        <div>
                          <p
                            className="text-sm font-medium text-slate-900"
                            data-testid={`text-staff-name-${staff.id}`}
                          >
                            {formatDisplayName(staff.firstName, staff.lastName)}
                          </p>
                          <p
                            className="text-xs text-slate-600"
                            data-testid={`text-staff-id-${staff.id}`}
                          >
                            ID: {staff.id.slice(0, 8)}...
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge
                          variant="outline"
                          className={staff.type === 'internal' 
                            ? 'border-blue-500 text-blue-700 bg-blue-50' 
                            : 'border-green-500 text-green-700 bg-green-50'}
                          data-testid={`badge-staff-type-${staff.id}`}
                        >
                          {staff.type === 'internal' ? t('staff.staffType.internal') : t('staff.staffType.external')}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <p
                          className="text-sm font-medium text-slate-900"
                          data-testid={`text-staff-rate-${staff.id}`}
                        >
                          €{parseFloat(staff.displayHourlyRate || staff.hourlyRate).toFixed(2)}/hr
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <div
                          className="flex flex-wrap gap-1"
                          data-testid={`specializations-${staff.id}`}
                        >
                          {staff.specializations &&
                          staff.specializations.length > 0 ? (
                            staff.specializations.map((spec, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs"
                              >
                                {spec}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-slate-600">
                              {t('staff.specializations.noneSpecified')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className="py-4 px-6"
                        data-testid={`badge-staff-status-${staff.id}`}
                      >
                        {getStatusBadge(staff.status)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <Link href={`/staff/${staff.id}`}>
                            <Button
                              size="sm"
                              variant="ghost"
                              data-testid={`button-view-staff-${staff.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {canUpdate('staff') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(staff)}
                              data-testid={`button-edit-staff-${staff.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete('staff') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(staff.id)}
                              className="text-red-600 hover:text-red-700"
                              data-testid={`button-delete-staff-${staff.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                {t('staff.pagination.page')} {currentPage} {t('staff.pagination.of')} {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('staff.pagination.previous')}
                </Button>
                
                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="min-w-[40px]"
                        data-testid={`button-page-${pageNum}`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  {t('staff.pagination.next')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Edit Staff Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('staff.editStaff')}</DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <StaffForm staff={selectedStaff} onSuccess={handleFormSuccess} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
