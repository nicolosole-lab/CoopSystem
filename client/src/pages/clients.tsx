import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit, Eye, Plus, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { ClientForm } from "@/components/forms/client-form";
import type { Client, Staff, ClientStaffAssignment } from "@shared/schema";
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/hooks/usePermissions';

export default function Clients() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  type ClientWithStaff = Client & { 
    staffAssignments?: (ClientStaffAssignment & { staff: Staff })[] 
  };

  const { data: clients = [], isLoading, error } = useQuery<ClientWithStaff[]>({
    queryKey: ["/api/clients?includeStaff=true"],
    retry: false,
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      await apiRequest("DELETE", `/api/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: t('common.success'),
        description: t('clients.messages.deleteSuccess'),
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: t('common.unauthorized'),
          description: t('common.loggingIn'),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t('common.error'),
        description: t('clients.messages.deleteError'),
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch = 
        client.firstName.toLowerCase().includes((searchTerm || '').toLowerCase()) ||
        client.lastName.toLowerCase().includes((searchTerm || '').toLowerCase()) ||
        client.email?.toLowerCase().includes((searchTerm || '').toLowerCase());
      
      const matchesStatus = !statusFilter || statusFilter === "all" || client.status === statusFilter;
      const matchesServiceType = !serviceTypeFilter || serviceTypeFilter === "all" || client.serviceType === serviceTypeFilter;
      
      return matchesSearch && matchesStatus && matchesServiceType;
    });
  }, [clients, searchTerm, statusFilter, serviceTypeFilter]);
  
  // Pagination logic
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);
  
  // Reset to first page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, serviceTypeFilter, itemsPerPage]);

  const getServiceTypeBadge = (serviceType: string) => {
    const types = {
      "personal-care": { label: "Personal Care", className: "bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 border border-purple-200" },
      "home-support": { label: "Home Support", className: "bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200" },
      "medical-assistance": { label: "Medical Assistance", className: "bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200" },
      "social-support": { label: "Social Support", className: "bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200" },
      "transportation": { label: "Transportation", className: "bg-gradient-to-r from-orange-100 to-orange-50 text-orange-800 border border-orange-200" },
    };
    const type = types[serviceType as keyof typeof types] || { label: serviceType, className: "bg-gray-100 text-gray-800" };
    return <Badge className={type.className}>{type.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statuses = {
      active: "bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200",
      inactive: "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border border-gray-200",
      pending: "bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border border-yellow-200",
    };
    const className = statuses[status as keyof typeof statuses] || "bg-gray-100 text-gray-800";
    const statusLabels: Record<string, string> = {
      active: "Active",
      inactive: "Inactive",
      pending: "Pending"
    };
    const label = statusLabels[status] || status.charAt(0).toUpperCase() + status.slice(1);
    return <Badge className={className}>{label}</Badge>;
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (clientId: string) => {
    if (confirm(t('clients.confirmDelete'))) {
      deleteClientMutation.mutate(clientId);
    }
  };

  const handleFormSuccess = () => {
    setIsAddDialogOpen(false);
    setIsEditDialogOpen(false);
    setSelectedClient(null);
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
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent mb-2" data-testid="text-clients-title">
            {t('clients.title')}
          </h2>
          <p className="text-gray-600">{t('clients.description')}</p>
        </div>
        {canCreate('clients') && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-4 sm:mt-0 care-button text-white shadow-lg" data-testid="button-add-client">
                <Plus className="mr-2 h-4 w-4" />
                {t('clients.actions.addClient')}
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('clients.dialogs.addTitle')}</DialogTitle>
            </DialogHeader>
            <ClientForm onSuccess={handleFormSuccess} />
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Search and Filters */}
      <Card className="mb-8 care-card">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="client-search" className="block text-sm font-medium text-slate-700 mb-2">
                {t('clients.search.label')}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="client-search"
                  className="pl-10"
                  placeholder={t('clients.search.placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-clients"
                />
              </div>
            </div>

            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-slate-700 mb-2">
                {t('clients.filters.status')}
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder={t('clients.filters.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="service-filter" className="block text-sm font-medium text-slate-700 mb-2">
                {t('clients.filters.serviceType')}
              </label>
              <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                <SelectTrigger data-testid="select-service-filter">
                  <SelectValue placeholder={t('clients.filters.allServices')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="personal-care">Personal Care</SelectItem>
                  <SelectItem value="home-support">Home Support</SelectItem>
                  <SelectItem value="medical-assistance">Medical Assistance</SelectItem>
                  <SelectItem value="social-support">Social Support</SelectItem>
                  <SelectItem value="transportation">Transportation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card className="care-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-gray-800">{t('clients.table.title')} ({filteredClients.length})</CardTitle>
            {/* Items per page selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">per page</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paginatedClients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-600" data-testid="text-no-clients">
                {clients.length === 0 ? t('clients.table.noClients') : t('clients.table.noResults')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-50 to-green-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">{t('clients.table.headers.client')}</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Collaborators</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">{t('clients.table.headers.serviceType')}</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">{t('clients.table.headers.monthlyBudget')}</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">{t('clients.table.headers.status')}</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">{t('clients.table.headers.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedClients.map((client) => (
                    <tr key={client.id} className="hover:bg-blue-50/30 transition-colors duration-200" data-testid={`row-client-${client.id}`}>
                      <td className="py-4 px-6">
                        <div>
                          <p className="text-sm font-medium text-slate-900" data-testid={`text-client-name-${client.id}`}>
                            {client.firstName} {client.lastName}
                          </p>
                          <p className="text-xs text-slate-600" data-testid={`text-client-id-${client.id}`}>
                            ID: {client.id.slice(0, 8)}...
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1" data-testid={`collaborators-${client.id}`}>
                          {client.staffAssignments && client.staffAssignments.length > 0 ? (
                            <>
                              {client.staffAssignments.slice(0, 2).map((assignment) => (
                                <Badge
                                  key={assignment.id}
                                  variant="outline"
                                  className={`text-xs ${
                                    assignment.assignmentType === 'primary' 
                                      ? 'border-blue-500 text-blue-700 bg-blue-50' 
                                      : 'border-gray-400 text-gray-600'
                                  }`}
                                >
                                  {assignment.staff.firstName} {assignment.staff.lastName}
                                </Badge>
                              ))}
                              {client.staffAssignments.length > 2 && (
                                <Badge variant="outline" className="text-xs border-gray-400 text-gray-600">
                                  +{client.staffAssignments.length - 2} more
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-gray-500 italic">No collaborators</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6" data-testid={`badge-service-type-${client.id}`}>
                        {getServiceTypeBadge(client.serviceType)}
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm font-medium text-slate-900" data-testid={`text-client-budget-${client.id}`}>
                          {client.monthlyBudget ? `€${parseFloat(client.monthlyBudget).toFixed(2)}` : t('clients.table.budgetNotSet')}
                        </p>
                      </td>
                      <td className="py-4 px-6" data-testid={`badge-client-status-${client.id}`}>
                        {getStatusBadge(client.status)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setLocation(`/clients/${client.id}`)}
                            data-testid={`button-view-client-${client.id}`}
                            title={t('common.view')}
                            className="hover:bg-green-50"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canUpdate('clients') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(client)}
                              data-testid={`button-edit-client-${client.id}`}
                              title={t('common.edit')}
                              className="hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete('clients') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(client.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              data-testid={`button-delete-client-${client.id}`}
                              title={t('common.delete')}
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
          
          {/* Pagination Controls */}
          {filteredClients.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredClients.length)} of {filteredClients.length} entries
              </div>
              
              <div className="flex items-center gap-2">
                {/* First Page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                
                {/* Previous Page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {(() => {
                    const pageNumbers = [];
                    const maxPagesToShow = 5;
                    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
                    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
                    
                    if (endPage - startPage < maxPagesToShow - 1) {
                      startPage = Math.max(1, endPage - maxPagesToShow + 1);
                    }
                    
                    if (startPage > 1) {
                      pageNumbers.push(
                        <Button
                          key={1}
                          variant={currentPage === 1 ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          className="h-8 w-8 p-0"
                        >
                          1
                        </Button>
                      );
                      if (startPage > 2) {
                        pageNumbers.push(<span key="dots1" className="px-1">...</span>);
                      }
                    }
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pageNumbers.push(
                        <Button
                          key={i}
                          variant={currentPage === i ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(i)}
                          className="h-8 w-8 p-0"
                        >
                          {i}
                        </Button>
                      );
                    }
                    
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pageNumbers.push(<span key="dots2" className="px-1">...</span>);
                      }
                      pageNumbers.push(
                        <Button
                          key={totalPages}
                          variant={currentPage === totalPages ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          className="h-8 w-8 p-0"
                        >
                          {totalPages}
                        </Button>
                      );
                    }
                    
                    return pageNumbers;
                  })()}
                </div>
                
                {/* Next Page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                {/* Last Page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('clients.dialogs.editTitle')}</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <ClientForm
              client={selectedClient}
              onSuccess={handleFormSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
