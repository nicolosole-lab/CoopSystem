import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit, Eye, Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { ClientForm } from "@/components/forms/client-form";
import type { Client } from "@shared/schema";
import { useTranslation } from 'react-i18next';

export default function Clients() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: clients = [], isLoading, error } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    retry: false,
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      await apiRequest("DELETE", `/api/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Success",
        description: "Client deleted successfully",
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
        description: "Failed to delete client",
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

  const filteredClients = clients.filter((client) => {
    const matchesSearch = 
      client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || client.status === statusFilter;
    const matchesServiceType = !serviceTypeFilter || client.serviceType === serviceTypeFilter;
    
    return matchesSearch && matchesStatus && matchesServiceType;
  });

  const getServiceTypeBadge = (serviceType: string) => {
    const types = {
      "personal-care": { label: t('clients.serviceTypes.personalCare'), className: "bg-primary/10 text-primary" },
      "home-support": { label: t('clients.serviceTypes.homeSupport'), className: "bg-secondary/10 text-secondary" },
      "medical-assistance": { label: t('clients.serviceTypes.medicalAssistance'), className: "bg-accent/10 text-accent" },
      "social-support": { label: t('clients.serviceTypes.socialSupport'), className: "bg-green-100 text-green-800" },
    };
    const type = types[serviceType as keyof typeof types] || { label: serviceType, className: "bg-slate-100 text-slate-800" };
    return <Badge className={type.className}>{type.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statuses = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-slate-100 text-slate-800",
      pending: "bg-yellow-100 text-yellow-800",
    };
    const className = statuses[status as keyof typeof statuses] || "bg-slate-100 text-slate-800";
    return <Badge className={className}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (clientId: string) => {
    if (confirm("Are you sure you want to delete this client?")) {
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
          <h2 className="text-2xl font-bold text-slate-900 mb-2" data-testid="text-clients-title">
            {t('clients.title')}
          </h2>
          <p className="text-slate-600">{t('clients.description')}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mt-4 sm:mt-0 bg-primary hover:bg-primary/90" data-testid="button-add-client">
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>
            <ClientForm onSuccess={handleFormSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="client-search" className="block text-sm font-medium text-slate-700 mb-2">
                Search Clients
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="client-search"
                  className="pl-10"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-clients"
                />
              </div>
            </div>

            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-slate-700 mb-2">
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="All Statuses" />
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
                Service Type
              </label>
              <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                <SelectTrigger data-testid="select-service-filter">
                  <SelectValue placeholder="All Services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="personal-care">Personal Care</SelectItem>
                  <SelectItem value="home-support">Home Support</SelectItem>
                  <SelectItem value="medical-assistance">Medical Assistance</SelectItem>
                  <SelectItem value="social-support">Social Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clients ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-600" data-testid="text-no-clients">
                {clients.length === 0 ? "No clients found. Add your first client to get started." : "No clients match your search criteria."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Client</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Contact</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Service Type</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Monthly Budget</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Status</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50" data-testid={`row-client-${client.id}`}>
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
                        <p className="text-sm text-slate-900" data-testid={`text-client-email-${client.id}`}>
                          {client.email || "No email"}
                        </p>
                        <p className="text-xs text-slate-600" data-testid={`text-client-phone-${client.id}`}>
                          {client.phone || "No phone"}
                        </p>
                      </td>
                      <td className="py-4 px-6" data-testid={`badge-service-type-${client.id}`}>
                        {getServiceTypeBadge(client.serviceType)}
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm font-medium text-slate-900" data-testid={`text-client-budget-${client.id}`}>
                          {client.monthlyBudget ? `€${parseFloat(client.monthlyBudget).toFixed(2)}` : "Not set"}
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
                            onClick={() => handleEdit(client)}
                            data-testid={`button-edit-client-${client.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(client.id)}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-client-${client.id}`}
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

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
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
