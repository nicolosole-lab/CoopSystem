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
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  X,
  Layers,
  Tag,
  DollarSign,
  FolderTree,
  ArrowUpDown,
  Check,
  AlertCircle
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

export default function SystemManagement() {
  const { t } = useTranslation();
  const { locale } = useLanguage();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("service-categories");
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [editingType, setEditingType] = useState<ServiceType | null>(null);
  const [editingBudgetCategory, setEditingBudgetCategory] = useState<BudgetCategory | null>(null);
  const [editingBudgetType, setEditingBudgetType] = useState<BudgetType | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState<"category" | "type" | "budget-category" | "budget-type">("category");

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

  // Service Category Mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data: Partial<ServiceCategory>) => 
      apiRequest("/api/service-categories", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-categories"] });
      toast({ title: locale === "it" ? "Categoria creata" : "Category created" });
      setShowDialog(false);
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ServiceCategory> }) =>
      apiRequest(`/api/service-categories/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-categories"] });
      toast({ title: locale === "it" ? "Categoria aggiornata" : "Category updated" });
      setShowDialog(false);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/service-categories/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-categories"] });
      toast({ title: locale === "it" ? "Categoria eliminata" : "Category deleted" });
    },
  });

  // Service Type Mutations
  const createTypeMutation = useMutation({
    mutationFn: (data: Partial<ServiceType>) => 
      apiRequest("/api/service-types", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-types"] });
      toast({ title: locale === "it" ? "Tipo creato" : "Type created" });
      setShowDialog(false);
    },
  });

  const updateTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ServiceType> }) =>
      apiRequest(`/api/service-types/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-types"] });
      toast({ title: locale === "it" ? "Tipo aggiornato" : "Type updated" });
      setShowDialog(false);
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/service-types/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-types"] });
      toast({ title: locale === "it" ? "Tipo eliminato" : "Type deleted" });
    },
  });

  // Budget Category Mutations
  const createBudgetCategoryMutation = useMutation({
    mutationFn: (data: Partial<BudgetCategory>) => 
      apiRequest("/api/budget-categories", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-categories"] });
      toast({ title: locale === "it" ? "Categoria budget creata" : "Budget category created" });
      setShowDialog(false);
    },
  });

  const updateBudgetCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BudgetCategory> }) =>
      apiRequest(`/api/budget-categories/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-categories"] });
      toast({ title: locale === "it" ? "Categoria budget aggiornata" : "Budget category updated" });
      setShowDialog(false);
    },
  });

  // Budget Type Mutations
  const createBudgetTypeMutation = useMutation({
    mutationFn: (data: Partial<BudgetType>) => 
      apiRequest("/api/budget-types", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-types"] });
      toast({ title: locale === "it" ? "Tipo budget creato" : "Budget type created" });
      setShowDialog(false);
    },
  });

  const updateBudgetTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BudgetType> }) =>
      apiRequest(`/api/budget-types/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-types"] });
      toast({ title: locale === "it" ? "Tipo budget aggiornato" : "Budget type updated" });
      setShowDialog(false);
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

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6" />
            {locale === "it" ? "Gestione Sistema" : "System Management"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {locale === "it" 
              ? "Configura categorie di servizio, tipi e impostazioni di budget" 
              : "Configure service categories, types and budget settings"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="service-categories" className="text-xs">
            <Layers className="h-3 w-3 mr-1" />
            {locale === "it" ? "Categorie" : "Categories"}
          </TabsTrigger>
          <TabsTrigger value="service-types" className="text-xs">
            <Tag className="h-3 w-3 mr-1" />
            {locale === "it" ? "Tipi" : "Types"}
          </TabsTrigger>
          <TabsTrigger value="budget-categories" className="text-xs">
            <FolderTree className="h-3 w-3 mr-1" />
            {locale === "it" ? "Cat. Budget" : "Budget Cat."}
          </TabsTrigger>
          <TabsTrigger value="budget-types" className="text-xs">
            <DollarSign className="h-3 w-3 mr-1" />
            {locale === "it" ? "Tipi Budget" : "Budget Types"}
          </TabsTrigger>
        </TabsList>

        {/* Service Categories Tab */}
        <TabsContent value="service-categories">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">
                    {locale === "it" ? "Categorie di Servizio" : "Service Categories"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {locale === "it" 
                      ? "Gestisci le categorie principali dei servizi" 
                      : "Manage main service categories"}
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => handleOpenDialog("category")}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {locale === "it" ? "Aggiungi" : "Add"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">{locale === "it" ? "Codice" : "Code"}</TableHead>
                    <TableHead>{locale === "it" ? "Nome" : "Name"}</TableHead>
                    <TableHead>{locale === "it" ? "Descrizione" : "Description"}</TableHead>
                    <TableHead className="w-20">{locale === "it" ? "Ordine" : "Order"}</TableHead>
                    <TableHead className="w-20">{locale === "it" ? "Stato" : "Status"}</TableHead>
                    <TableHead className="w-20">{locale === "it" ? "Azioni" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingCategories ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        {locale === "it" ? "Caricamento..." : "Loading..."}
                      </TableCell>
                    </TableRow>
                  ) : serviceCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {locale === "it" ? "Nessuna categoria trovata" : "No categories found"}
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
                              ? (locale === "it" ? "Attivo" : "Active")
                              : (locale === "it" ? "Inattivo" : "Inactive")}
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
                                if (confirm(locale === "it" ? "Eliminare questa categoria?" : "Delete this category?")) {
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
                    {locale === "it" ? "Tipi di Servizio" : "Service Types"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {locale === "it" 
                      ? "Gestisci i tipi specifici di servizio per categoria" 
                      : "Manage specific service types by category"}
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => handleOpenDialog("type")}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {locale === "it" ? "Aggiungi" : "Add"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">{locale === "it" ? "Codice" : "Code"}</TableHead>
                    <TableHead>{locale === "it" ? "Nome" : "Name"}</TableHead>
                    <TableHead>{locale === "it" ? "Categoria" : "Category"}</TableHead>
                    <TableHead className="w-24">{locale === "it" ? "Tariffa" : "Rate"}</TableHead>
                    <TableHead className="w-20">{locale === "it" ? "Stato" : "Status"}</TableHead>
                    <TableHead className="w-20">{locale === "it" ? "Azioni" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTypes ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        {locale === "it" ? "Caricamento..." : "Loading..."}
                      </TableCell>
                    </TableRow>
                  ) : serviceTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {locale === "it" ? "Nessun tipo trovato" : "No types found"}
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
                              ? (locale === "it" ? "Attivo" : "Active")
                              : (locale === "it" ? "Inattivo" : "Inactive")}
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
                                if (confirm(locale === "it" ? "Eliminare questo tipo?" : "Delete this type?")) {
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
                    {locale === "it" ? "Categorie di Budget" : "Budget Categories"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {locale === "it" 
                      ? "Gestisci le categorie di allocazione budget" 
                      : "Manage budget allocation categories"}
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => handleOpenDialog("budget-category")}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {locale === "it" ? "Aggiungi" : "Add"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{locale === "it" ? "Nome" : "Name"}</TableHead>
                    <TableHead>{locale === "it" ? "Descrizione" : "Description"}</TableHead>
                    <TableHead className="w-20">{locale === "it" ? "Azioni" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingBudgetCategories ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        {locale === "it" ? "Caricamento..." : "Loading..."}
                      </TableCell>
                    </TableRow>
                  ) : budgetCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                        {locale === "it" ? "Nessuna categoria trovata" : "No categories found"}
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
                    {locale === "it" ? "Tipi di Budget" : "Budget Types"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {locale === "it" 
                      ? "Gestisci i tipi di budget con tariffe predefinite" 
                      : "Manage budget types with default rates"}
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => handleOpenDialog("budget-type")}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {locale === "it" ? "Aggiungi" : "Add"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">{locale === "it" ? "Codice" : "Code"}</TableHead>
                    <TableHead>{locale === "it" ? "Nome" : "Name"}</TableHead>
                    <TableHead>{locale === "it" ? "Categoria" : "Category"}</TableHead>
                    <TableHead className="w-20">{locale === "it" ? "Feriale" : "Weekday"}</TableHead>
                    <TableHead className="w-20">{locale === "it" ? "Festivo" : "Holiday"}</TableHead>
                    <TableHead className="w-20">Km</TableHead>
                    <TableHead className="w-20">{locale === "it" ? "Azioni" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingBudgetTypes ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        {locale === "it" ? "Caricamento..." : "Loading..."}
                      </TableCell>
                    </TableRow>
                  ) : budgetTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {locale === "it" ? "Nessun tipo trovato" : "No types found"}
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
      </Tabs>

      {/* Dialog for editing/creating */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogType === "category" 
                ? (editingCategory 
                    ? (locale === "it" ? "Modifica Categoria" : "Edit Category")
                    : (locale === "it" ? "Nuova Categoria" : "New Category"))
                : dialogType === "type"
                ? (editingType
                    ? (locale === "it" ? "Modifica Tipo" : "Edit Type")
                    : (locale === "it" ? "Nuovo Tipo" : "New Type"))
                : dialogType === "budget-category"
                ? (editingBudgetCategory
                    ? (locale === "it" ? "Modifica Categoria Budget" : "Edit Budget Category")
                    : (locale === "it" ? "Nuova Categoria Budget" : "New Budget Category"))
                : (editingBudgetType
                    ? (locale === "it" ? "Modifica Tipo Budget" : "Edit Budget Type")
                    : (locale === "it" ? "Nuovo Tipo Budget" : "New Budget Type"))}
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
            } else {
              handleSaveBudgetType(formData);
            }
          }}>
            <div className="space-y-4 py-4">
              {/* Service Category Form */}
              {dialogType === "category" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="code">{locale === "it" ? "Codice" : "Code"}</Label>
                      <Input
                        id="code"
                        name="code"
                        defaultValue={editingCategory?.code || ""}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="displayOrder">{locale === "it" ? "Ordine" : "Order"}</Label>
                      <Input
                        id="displayOrder"
                        name="displayOrder"
                        type="number"
                        defaultValue={editingCategory?.displayOrder || ""}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="name">{locale === "it" ? "Nome" : "Name"}</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingCategory?.name || ""}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">{locale === "it" ? "Descrizione" : "Description"}</Label>
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
                    <Label htmlFor="isActive">{locale === "it" ? "Attivo" : "Active"}</Label>
                  </div>
                </>
              )}

              {/* Service Type Form */}
              {dialogType === "type" && (
                <>
                  <div>
                    <Label htmlFor="categoryId">{locale === "it" ? "Categoria" : "Category"}</Label>
                    <Select name="categoryId" defaultValue={editingType?.categoryId || ""}>
                      <SelectTrigger>
                        <SelectValue placeholder={locale === "it" ? "Seleziona categoria" : "Select category"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">
                          {locale === "it" ? "Nessuna" : "None"}
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
                      <Label htmlFor="code">{locale === "it" ? "Codice" : "Code"}</Label>
                      <Input
                        id="code"
                        name="code"
                        defaultValue={editingType?.code || ""}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="defaultRate">{locale === "it" ? "Tariffa" : "Rate"}</Label>
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
                    <Label htmlFor="name">{locale === "it" ? "Nome" : "Name"}</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingType?.name || ""}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">{locale === "it" ? "Descrizione" : "Description"}</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={editingType?.description || ""}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="displayOrder">{locale === "it" ? "Ordine" : "Order"}</Label>
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
                      <Label htmlFor="isActive">{locale === "it" ? "Attivo" : "Active"}</Label>
                    </div>
                  </div>
                </>
              )}

              {/* Budget Category Form */}
              {dialogType === "budget-category" && (
                <>
                  <div>
                    <Label htmlFor="name">{locale === "it" ? "Nome" : "Name"}</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingBudgetCategory?.name || ""}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">{locale === "it" ? "Descrizione" : "Description"}</Label>
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
                    <Label htmlFor="categoryId">{locale === "it" ? "Categoria" : "Category"}</Label>
                    <Select name="categoryId" defaultValue={editingBudgetType?.categoryId || ""} required>
                      <SelectTrigger>
                        <SelectValue placeholder={locale === "it" ? "Seleziona categoria" : "Select category"} />
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
                      <Label htmlFor="code">{locale === "it" ? "Codice" : "Code"}</Label>
                      <Input
                        id="code"
                        name="code"
                        defaultValue={editingBudgetType?.code || ""}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="displayOrder">{locale === "it" ? "Ordine" : "Order"}</Label>
                      <Input
                        id="displayOrder"
                        name="displayOrder"
                        type="number"
                        defaultValue={editingBudgetType?.displayOrder || ""}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="name">{locale === "it" ? "Nome" : "Name"}</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingBudgetType?.name || ""}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">{locale === "it" ? "Descrizione" : "Description"}</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={editingBudgetType?.description || ""}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="defaultWeekdayRate">{locale === "it" ? "Tariffa Feriale" : "Weekday Rate"}</Label>
                      <Input
                        id="defaultWeekdayRate"
                        name="defaultWeekdayRate"
                        type="number"
                        step="0.01"
                        defaultValue={editingBudgetType?.defaultWeekdayRate || ""}
                      />
                    </div>
                    <div>
                      <Label htmlFor="defaultHolidayRate">{locale === "it" ? "Tariffa Festivo" : "Holiday Rate"}</Label>
                      <Input
                        id="defaultHolidayRate"
                        name="defaultHolidayRate"
                        type="number"
                        step="0.01"
                        defaultValue={editingBudgetType?.defaultHolidayRate || ""}
                      />
                    </div>
                    <div>
                      <Label htmlFor="defaultKilometerRate">Km</Label>
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
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                <X className="h-4 w-4 mr-1" />
                {locale === "it" ? "Annulla" : "Cancel"}
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-1" />
                {locale === "it" ? "Salva" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}