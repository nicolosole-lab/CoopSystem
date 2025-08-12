import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "react-i18next";
import { usePermissions } from '@/hooks/usePermissions';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  X,
  Layers,
  Tag,
  Euro,
  FolderTree,
  ArrowUpDown,
  Check,
  AlertCircle,
  Users
} from "lucide-react";

interface ServiceCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number | null;
}

interface ServiceType {
  id: string;
  categoryId: string | null;
  code: string;
  name: string;
  description: string | null;
  defaultRate: string | null;
  isActive: boolean;
  displayOrder: number | null;
  categoryName?: string;
}

interface BudgetCategory {
  id: string;
  name: string;
  description: string | null;
}

interface BudgetType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  categoryId: string;
  categoryName?: string;
  defaultWeekdayRate: string | null;
  defaultHolidayRate: string | null;
  defaultKilometerRate: string | null;
  displayOrder: number | null;
}

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export default function SystemManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("service-categories");
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [editingType, setEditingType] = useState<ServiceType | null>(null);
  const [editingBudgetCategory, setEditingBudgetCategory] = useState<BudgetCategory | null>(null);
  const [editingBudgetType, setEditingBudgetType] = useState<BudgetType | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState<"category" | "type" | "budget-category" | "budget-type" | "user">("category");

  // Fetch Service Categories
  const { data: serviceCategories = [], isLoading: loadingCategories } = useQuery<ServiceCategory[]>({
    queryKey: ["/api/service-categories"],
  });

  // Fetch Service Types
  const { data: serviceTypes = [], isLoading: loadingTypes } = useQuery<ServiceType[]>({
    queryKey: ["/api/service-types"],
  });

  // Fetch Budget Categories
  const { data: budgetCategories = [], isLoading: loadingBudgetCategories } = useQuery<BudgetCategory[]>({
    queryKey: ["/api/budget-categories"],
  });

  // Fetch Budget Types
  const { data: budgetTypes = [], isLoading: loadingBudgetTypes } = useQuery<BudgetType[]>({
    queryKey: ["/api/budget-types"],
  });

  // Fetch Users
  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Get current user to check permissions
  const { data: currentUser } = useQuery({
    queryKey: ["/api/user"],
  });

  // Permission helper functions
  const { canCreate, canUpdate, canDelete } = usePermissions();

  // Service Category Mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data: Partial<ServiceCategory>) => 
      apiRequest("POST", "/api/service-categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-categories"] });
      toast({ title: t('systemManagement.serviceCategories.messages.created') });
      setShowDialog(false);
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ServiceCategory> }) =>
      apiRequest("PATCH", `/api/service-categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-categories"] });
      toast({ title: t('systemManagement.serviceCategories.messages.updated') });
      setShowDialog(false);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/service-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-categories"] });
      toast({ title: t('systemManagement.serviceCategories.messages.deleted') });
    },
  });

  // Service Type Mutations
  const createTypeMutation = useMutation({
    mutationFn: (data: Partial<ServiceType>) => 
      apiRequest("POST", "/api/service-types", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-types"] });
      toast({ title: t('systemManagement.serviceTypes.messages.created') });
      setShowDialog(false);
    },
  });

  const updateTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ServiceType> }) =>
      apiRequest("PATCH", `/api/service-types/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-types"] });
      toast({ title: t('systemManagement.serviceTypes.messages.updated') });
      setShowDialog(false);
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/service-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-types"] });
      toast({ title: t('systemManagement.serviceTypes.messages.deleted') });
    },
  });

  // Budget Category Mutations
  const createBudgetCategoryMutation = useMutation({
    mutationFn: (data: Partial<BudgetCategory>) => 
      apiRequest("POST", "/api/budget-categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-categories"] });
      toast({ title: t('systemManagement.budgetCategories.messages.created') });
      setShowDialog(false);
    },
  });

  const updateBudgetCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BudgetCategory> }) =>
      apiRequest("PATCH", `/api/budget-categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-categories"] });
      toast({ title: t('systemManagement.budgetCategories.messages.updated') });
      setShowDialog(false);
    },
  });

  // Budget Type Mutations
  const createBudgetTypeMutation = useMutation({
    mutationFn: (data: Partial<BudgetType>) => 
      apiRequest("POST", "/api/budget-types", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-types"] });
      toast({ title: t('systemManagement.budgetTypes.messages.created') });
      setShowDialog(false);
    },
  });

  const updateBudgetTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BudgetType> }) =>
      apiRequest("PATCH", `/api/budget-types/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-types"] });
      toast({ title: t('systemManagement.budgetTypes.messages.updated') });
      setShowDialog(false);
    },
  });

  const deleteBudgetTypeMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/budget-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-types"] });
      toast({ title: t('systemManagement.budgetTypes.messages.deleted') });
    },
  });

  // User Mutations
  const createUserMutation = useMutation({
    mutationFn: (data: Partial<User>) => 
      apiRequest("POST", "/api/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: t('systemManagement.users.messages.created') });
      setShowDialog(false);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      apiRequest("PATCH", `/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: t('systemManagement.users.messages.updated') });
      setShowDialog(false);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: locale === "it" ? "Utente eliminato" : "User deleted" });
    },
  });

  const handleOpenDialog = (type: typeof dialogType, item?: any) => {
    setDialogType(type);
    if (type === "category") {
      setEditingCategory(item || null);
    } else if (type === "type") {
      setEditingType(item || null);
    } else if (type === "budget-category") {
      setEditingBudgetCategory(item || null);
    } else if (type === "budget-type") {
      setEditingBudgetType(item || null);
    } else if (type === "user") {
      setEditingUser(item || null);
    }
    setShowDialog(true);
  };

  const handleSaveCategory = (formData: FormData) => {
    const data = {
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      description: formData.get("description") as string || null,
      isActive: formData.get("isActive") === "on",
      displayOrder: parseInt(formData.get("displayOrder") as string) || null,
    };

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const handleSaveType = (formData: FormData) => {
    const data = {
      categoryId: formData.get("categoryId") as string || null,
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      description: formData.get("description") as string || null,
      defaultRate: formData.get("defaultRate") as string || null,
      isActive: formData.get("isActive") === "on",
      displayOrder: parseInt(formData.get("displayOrder") as string) || null,
    };

    if (editingType) {
      updateTypeMutation.mutate({ id: editingType.id, data });
    } else {
      createTypeMutation.mutate(data);
    }
  };

  const handleSaveBudgetCategory = (formData: FormData) => {
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string || null,
    };

    if (editingBudgetCategory) {
      updateBudgetCategoryMutation.mutate({ id: editingBudgetCategory.id, data });
    } else {
      createBudgetCategoryMutation.mutate(data);
    }
  };

  const handleSaveBudgetType = (formData: FormData) => {
    const data = {
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      description: formData.get("description") as string || null,
      categoryId: formData.get("categoryId") as string,
      defaultWeekdayRate: formData.get("defaultWeekdayRate") as string || null,
      defaultHolidayRate: formData.get("defaultHolidayRate") as string || null,
      defaultKilometerRate: formData.get("defaultKilometerRate") as string || null,
      displayOrder: parseInt(formData.get("displayOrder") as string) || null,
    };

    if (editingBudgetType) {
      updateBudgetTypeMutation.mutate({ id: editingBudgetType.id, data });
    } else {
      createBudgetTypeMutation.mutate(data);
    }
  };

  const handleSaveUser = (formData: FormData) => {
    const data = {
      email: formData.get("email") as string,
      firstName: formData.get("firstName") as string || null,
      lastName: formData.get("lastName") as string || null,
      role: formData.get("role") as string,
      password: formData.get("password") as string || undefined,
    };

    // Only include password if it's provided (for updates, password is optional)
    if (!data.password && editingUser) {
      delete data.password;
    }

    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data });
    } else {
      createUserMutation.mutate(data);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6" />
            {t('systemManagement.title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('systemManagement.description')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="service-categories" className="text-xs">
            <Layers className="h-3 w-3 mr-1" />
            {t('systemManagement.tabs.serviceCategories')}
          </TabsTrigger>
          <TabsTrigger value="service-types" className="text-xs">
            <Tag className="h-3 w-3 mr-1" />
            {t('systemManagement.tabs.serviceTypes')}
          </TabsTrigger>
          <TabsTrigger value="budget-categories" className="text-xs">
            <FolderTree className="h-3 w-3 mr-1" />
            {t('systemManagement.tabs.budgetCategories')}
          </TabsTrigger>
          <TabsTrigger value="budget-types" className="text-xs">
            <Euro className="h-3 w-3 mr-1" />
            {t('systemManagement.tabs.budgetTypes')}
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {t('systemManagement.tabs.users')}
          </TabsTrigger>
        </TabsList>

        {/* Service Categories Tab */}
        <TabsContent value="service-categories">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">
                    {t('systemManagement.serviceCategories.title')}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t('systemManagement.serviceCategories.description')}
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => handleOpenDialog("category")}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('systemManagement.serviceCategories.addNew')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">{t('systemManagement.serviceCategories.table.code')}</TableHead>
                    <TableHead>{t('systemManagement.serviceCategories.table.name')}</TableHead>
                    <TableHead>{t('systemManagement.serviceCategories.table.description')}</TableHead>
                    <TableHead className="w-20">{t('systemManagement.serviceCategories.table.order')}</TableHead>
                    <TableHead className="w-20">{t('systemManagement.serviceCategories.table.status')}</TableHead>
                    <TableHead className="w-20">{t('systemManagement.serviceCategories.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingCategories ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        {t('systemManagement.common.loading')}
                      </TableCell>
                    </TableRow>
                  ) : serviceCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {t('systemManagement.common.noResults')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    serviceCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-mono text-sm">{category.code}</TableCell>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {category.description || "-"}
                        </TableCell>
                        <TableCell className="text-center">{category.displayOrder || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={category.isActive ? "default" : "secondary"} className="text-xs">
                            {category.isActive 
                              ? t('systemManagement.serviceCategories.status.active')
                              : t('systemManagement.serviceCategories.status.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleOpenDialog("category", category)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-600"
                              onClick={() => {
                                if (confirm(t('systemManagement.serviceCategories.messages.confirmDelete'))) {
                                  deleteCategoryMutation.mutate(category.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Types Tab */}
        <TabsContent value="service-types">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">
                    {t('systemManagement.serviceTypes.title')}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t('systemManagement.serviceTypes.description')}
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => handleOpenDialog("type")}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('systemManagement.serviceTypes.addNew')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">{t('systemManagement.serviceTypes.table.code')}</TableHead>
                    <TableHead>{t('systemManagement.serviceTypes.table.name')}</TableHead>
                    <TableHead>{t('systemManagement.serviceTypes.table.category')}</TableHead>
                    <TableHead className="w-24">{t('systemManagement.serviceTypes.table.defaultRate')}</TableHead>
                    <TableHead className="w-20">{t('systemManagement.serviceTypes.table.status')}</TableHead>
                    <TableHead className="w-20">{t('systemManagement.serviceTypes.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTypes ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        {t('systemManagement.common.loading')}
                      </TableCell>
                    </TableRow>
                  ) : serviceTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {t('systemManagement.common.noResults')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    serviceTypes.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell className="font-mono text-sm">{type.code}</TableCell>
                        <TableCell className="font-medium">{type.name}</TableCell>
                        <TableCell className="text-sm">
                          {type.categoryName || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {type.defaultRate ? `€${type.defaultRate}` : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={type.isActive ? "default" : "secondary"} className="text-xs">
                            {type.isActive 
                              ? t('systemManagement.serviceCategories.status.active')
                              : t('systemManagement.serviceCategories.status.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleOpenDialog("type", type)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-600"
                              onClick={() => {
                                if (confirm(t('systemManagement.serviceTypes.messages.confirmDelete'))) {
                                  deleteTypeMutation.mutate(type.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget Categories Tab */}
        <TabsContent value="budget-categories">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">
                    {t('systemManagement.budgetCategories.title')}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t('systemManagement.budgetCategories.description')}
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => handleOpenDialog("budget-category")}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('systemManagement.budgetCategories.addNew')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('systemManagement.budgetCategories.table.name')}</TableHead>
                    <TableHead>{t('systemManagement.budgetCategories.table.description')}</TableHead>
                    <TableHead className="w-20">{t('systemManagement.budgetCategories.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingBudgetCategories ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        {t('systemManagement.common.loading')}
                      </TableCell>
                    </TableRow>
                  ) : budgetCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                        {t('systemManagement.common.noResults')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    budgetCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {category.description || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleOpenDialog("budget-category", category)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget Types Tab */}
        <TabsContent value="budget-types">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">
                    {t('systemManagement.budgetTypes.title')}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t('systemManagement.budgetTypes.description')}
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => handleOpenDialog("budget-type")}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('systemManagement.budgetTypes.addNew')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">{t('systemManagement.budgetTypes.table.code')}</TableHead>
                    <TableHead>{t('systemManagement.budgetTypes.table.name')}</TableHead>
                    <TableHead>{t('systemManagement.budgetTypes.table.category')}</TableHead>
                    <TableHead className="w-20">{t('systemManagement.budgetTypes.table.weekdayRate')}</TableHead>
                    <TableHead className="w-20">{t('systemManagement.budgetTypes.table.holidayRate')}</TableHead>
                    <TableHead className="w-20">{t('systemManagement.budgetTypes.table.kilometerRate')}</TableHead>
                    <TableHead className="w-20">{t('systemManagement.budgetTypes.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingBudgetTypes ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        {t('systemManagement.common.loading')}
                      </TableCell>
                    </TableRow>
                  ) : budgetTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {t('systemManagement.common.noResults')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    budgetTypes.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell className="font-mono text-sm">{type.code}</TableCell>
                        <TableCell className="font-medium">{type.name}</TableCell>
                        <TableCell className="text-sm">{type.categoryName || "-"}</TableCell>
                        <TableCell className="text-sm">
                          {type.defaultWeekdayRate ? `€${type.defaultWeekdayRate}` : "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {type.defaultHolidayRate ? `€${type.defaultHolidayRate}` : "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {type.defaultKilometerRate ? `€${type.defaultKilometerRate}` : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleOpenDialog("budget-type", type)}
                              data-testid={`button-edit-budget-type-${type.id}`}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            {canDelete('budget-types') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete the budget type "${type.name}" (${type.code})? This action cannot be undone.`)) {
                                    deleteBudgetTypeMutation.mutate(type.id);
                                  }
                                }}
                                disabled={deleteBudgetTypeMutation.isPending}
                                data-testid={`button-delete-budget-type-${type.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">
                    {t('systemManagement.users.title')}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t('systemManagement.users.description')}
                  </CardDescription>
                </div>
                {canCreate('users') && (
                  <Button 
                    onClick={() => handleOpenDialog("user")}
                    size="sm"
                    data-testid="button-add-user"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t('systemManagement.users.addNew')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('systemManagement.users.table.email')}</TableHead>
                    <TableHead>{t('systemManagement.users.table.name')}</TableHead>
                    <TableHead>{t('systemManagement.users.table.role')}</TableHead>
                    <TableHead>{t('systemManagement.users.table.createdAt')}</TableHead>
                    <TableHead className="w-20">{t('systemManagement.users.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingUsers ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        {t('systemManagement.common.loading')}
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        {t('systemManagement.common.noResults')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-mono text-sm">{user.email}</TableCell>
                        <TableCell className="font-medium">
                          {user.firstName || user.lastName 
                            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              user.role === 'admin' ? 'destructive' :
                              user.role === 'manager' ? 'default' : 'secondary'
                            } 
                            className="text-xs capitalize"
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {canUpdate('users') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleOpenDialog("user", user)}
                                data-testid={`button-edit-user-${user.id}`}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                            {canDelete('users') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-600 hover:text-red-700"
                                onClick={() => deleteUserMutation.mutate(user.id)}
                                disabled={deleteUserMutation.isPending}
                                data-testid={`button-delete-user-${user.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                            {!canUpdate('users') && !canDelete('users') && (
                              <span className="text-xs text-gray-500 px-2 py-1">
                                {t('systemManagement.users.readOnly')}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog for editing/creating */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogType === "category" 
                ? (editingCategory 
                    ? t('systemManagement.dialogs.editCategory')
                    : t('systemManagement.dialogs.newCategory'))
                : dialogType === "type"
                ? (editingType
                    ? t('systemManagement.dialogs.editType')
                    : t('systemManagement.dialogs.newType'))
                : dialogType === "budget-category"
                ? (editingBudgetCategory
                    ? t('systemManagement.dialogs.editBudgetCategory')
                    : t('systemManagement.dialogs.newBudgetCategory'))
                : dialogType === "budget-type"
                ? (editingBudgetType
                    ? t('systemManagement.dialogs.editBudgetType')
                    : t('systemManagement.dialogs.newBudgetType'))
                : (editingUser
                    ? t('systemManagement.dialogs.editUser')
                    : t('systemManagement.dialogs.newUser'))}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            
            if (dialogType === "category") {
              handleSaveCategory(formData);
            } else if (dialogType === "type") {
              handleSaveType(formData);
            } else if (dialogType === "budget-category") {
              handleSaveBudgetCategory(formData);
            } else if (dialogType === "budget-type") {
              handleSaveBudgetType(formData);
            } else if (dialogType === "user") {
              handleSaveUser(formData);
            }
          }}>
            <div className="space-y-4 py-4">
              {/* Service Category Form */}
              {dialogType === "category" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="code">{t('systemManagement.forms.code')}</Label>
                      <Input
                        id="code"
                        name="code"
                        defaultValue={editingCategory?.code || ""}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="displayOrder">{t('systemManagement.forms.displayOrder')}</Label>
                      <Input
                        id="displayOrder"
                        name="displayOrder"
                        type="number"
                        defaultValue={editingCategory?.displayOrder || ""}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="name">{t('systemManagement.forms.name')}</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingCategory?.name || ""}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">{t('systemManagement.forms.description')}</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={editingCategory?.description || ""}
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      name="isActive"
                      defaultChecked={editingCategory?.isActive ?? true}
                    />
                    <Label htmlFor="isActive">{t('systemManagement.forms.isActive')}</Label>
                  </div>
                </>
              )}

              {/* Service Type Form */}
              {dialogType === "type" && (
                <>
                  <div>
                    <Label htmlFor="categoryId">{t('systemManagement.forms.category')}</Label>
                    <Select name="categoryId" defaultValue={editingType?.categoryId || ""}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('systemManagement.forms.selectCategory')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">
                          {t('systemManagement.forms.none')}
                        </SelectItem>
                        {serviceCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="code">{t('systemManagement.forms.code')}</Label>
                      <Input
                        id="code"
                        name="code"
                        defaultValue={editingType?.code || ""}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="defaultRate">{t('systemManagement.forms.defaultRate')}</Label>
                      <Input
                        id="defaultRate"
                        name="defaultRate"
                        type="number"
                        step="0.01"
                        defaultValue={editingType?.defaultRate || ""}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="name">{t('systemManagement.forms.name')}</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingType?.name || ""}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">{t('systemManagement.forms.description')}</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={editingType?.description || ""}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="displayOrder">{t('systemManagement.forms.displayOrder')}</Label>
                      <Input
                        id="displayOrder"
                        name="displayOrder"
                        type="number"
                        defaultValue={editingType?.displayOrder || ""}
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <Switch
                        id="isActive"
                        name="isActive"
                        defaultChecked={editingType?.isActive ?? true}
                      />
                      <Label htmlFor="isActive">{t('systemManagement.forms.isActive')}</Label>
                    </div>
                  </div>
                </>
              )}

              {/* Budget Category Form */}
              {dialogType === "budget-category" && (
                <>
                  <div>
                    <Label htmlFor="name">{t('systemManagement.forms.name')}</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingBudgetCategory?.name || ""}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">{t('systemManagement.forms.description')}</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={editingBudgetCategory?.description || ""}
                      rows={2}
                    />
                  </div>
                </>
              )}

              {/* Budget Type Form */}
              {dialogType === "budget-type" && (
                <>
                  <div>
                    <Label htmlFor="categoryId">{t('systemManagement.forms.category')}</Label>
                    <Select name="categoryId" defaultValue={editingBudgetType?.categoryId || ""} required>
                      <SelectTrigger>
                        <SelectValue placeholder={t('systemManagement.forms.selectCategory')} />
                      </SelectTrigger>
                      <SelectContent>
                        {budgetCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="code">{t('systemManagement.forms.code')}</Label>
                      <Input
                        id="code"
                        name="code"
                        defaultValue={editingBudgetType?.code || ""}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="displayOrder">{t('systemManagement.forms.displayOrder')}</Label>
                      <Input
                        id="displayOrder"
                        name="displayOrder"
                        type="number"
                        defaultValue={editingBudgetType?.displayOrder || ""}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="name">{t('systemManagement.forms.name')}</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingBudgetType?.name || ""}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">{t('systemManagement.forms.description')}</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={editingBudgetType?.description || ""}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="defaultWeekdayRate">{t('systemManagement.forms.weekdayRate')}</Label>
                      <Input
                        id="defaultWeekdayRate"
                        name="defaultWeekdayRate"
                        type="number"
                        step="0.01"
                        defaultValue={editingBudgetType?.defaultWeekdayRate || ""}
                      />
                    </div>
                    <div>
                      <Label htmlFor="defaultHolidayRate">{t('systemManagement.forms.holidayRate')}</Label>
                      <Input
                        id="defaultHolidayRate"
                        name="defaultHolidayRate"
                        type="number"
                        step="0.01"
                        defaultValue={editingBudgetType?.defaultHolidayRate || ""}
                      />
                    </div>
                    <div>
                      <Label htmlFor="defaultKilometerRate">{t('systemManagement.forms.kilometerRate')}</Label>
                      <Input
                        id="defaultKilometerRate"
                        name="defaultKilometerRate"
                        type="number"
                        step="0.01"
                        defaultValue={editingBudgetType?.defaultKilometerRate || ""}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* User Form */}
              {dialogType === "user" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">{t('systemManagement.forms.firstName')}</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        defaultValue={editingUser?.firstName || ""}
                        data-testid="input-first-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">{t('systemManagement.forms.lastName')}</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        defaultValue={editingUser?.lastName || ""}
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={editingUser?.email || ""}
                      required
                      data-testid="input-email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">
                      {editingUser 
                        ? t('systemManagement.forms.newPassword')
                        : t('systemManagement.forms.password')} 
                      {!editingUser && " *"}
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required={!editingUser}
                      data-testid="input-password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">{t('systemManagement.forms.role')} *</Label>
                    <Select name="role" defaultValue={editingUser?.role || "staff"} required>
                      <SelectTrigger data-testid="select-role">
                        <SelectValue placeholder={t('systemManagement.forms.selectRole')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">
                          {t('systemManagement.roles.staff')}
                        </SelectItem>
                        {/* Only allow manager+ to assign manager role */}
                        {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                          <SelectItem value="manager">
                            {t('systemManagement.roles.manager')}
                          </SelectItem>
                        )}
                        {/* Only allow admin to assign admin role */}
                        {currentUser?.role === 'admin' && (
                          <SelectItem value="admin">
                            {t('systemManagement.roles.admin')}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                <X className="h-4 w-4 mr-1" />
                {t('systemManagement.forms.cancel')}
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-1" />
                {t('systemManagement.forms.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}