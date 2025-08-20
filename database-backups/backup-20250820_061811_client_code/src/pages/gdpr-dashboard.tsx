import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, Download, Eye, FileText, Shield, Trash2, UserCheck, Users, Database, Lock, Clock, Settings } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import type { 
  UserConsent, 
  DataAccessLog, 
  DataExportRequest, 
  DataRetentionPolicy, 
  DataDeletionRequest, 
  DataBreachIncident 
} from "@shared/schema";

// Form schemas
const exportRequestSchema = z.object({
  userId: z.string().min(1, "User is required"),
  exportFormat: z.enum(["json", "csv", "pdf"]).default("json"),
  includePersonalData: z.boolean().default(true),
  includeServiceData: z.boolean().default(true),
  includeFinancialData: z.boolean().default(false)
});

const deletionRequestSchema = z.object({
  userId: z.string().min(1, "User is required"),
  reason: z.enum(["user_request", "account_closure", "gdpr_right", "data_minimization", "other"]),
  notes: z.string().optional()
});

const retentionPolicySchema = z.object({
  entityType: z.string().min(1, "Entity type is required"),
  retentionPeriodDays: z.number().min(1, "Retention period must be at least 1 day"),
  description: z.string().min(1, "Description is required"),
  isActive: z.boolean().default(true)
});

const breachIncidentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  severity: z.enum(["low", "medium", "high", "critical"]),
  detectedAt: z.string().min(1, "Detection date is required"),
  affectedUserCount: z.number().min(0).default(0),
  affectedDataTypes: z.array(z.string()).default([])
});

export default function GDPRDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("overview");
  const { t } = useTranslation();

  // Queries
  const { data: user } = useQuery<any>({ queryKey: ['/api/user'] });
  const { data: users } = useQuery<any[]>({ queryKey: ['/api/users'] });
  const { data: exportRequests } = useQuery<DataExportRequest[]>({ queryKey: ['/api/gdpr/export-requests'] });
  const { data: deletionRequests } = useQuery<DataDeletionRequest[]>({ queryKey: ['/api/gdpr/deletion-requests'] });
  const { data: retentionPolicies } = useQuery<DataRetentionPolicy[]>({ queryKey: ['/api/gdpr/retention-policies'] });
  const { data: breachIncidents } = useQuery<DataBreachIncident[]>({ queryKey: ['/api/gdpr/breach-incidents'] });
  const { data: accessLogs } = useQuery<DataAccessLog[]>({ queryKey: ['/api/gdpr/access-logs'] });

  // Phase 2: Document Management queries
  const { data: documents } = useQuery<any[]>({ queryKey: ['/api/documents'] });
  const { data: documentAccessLogs } = useQuery<any[]>({ queryKey: ['/api/document-access-logs'] });
  const { data: documentRetentionSchedules } = useQuery<any[]>({ queryKey: ['/api/document-retention-schedules'] });

  // Mutations
  const createExportRequestMutation = useMutation({
    mutationFn: (data: z.infer<typeof exportRequestSchema>) => 
      apiRequest("POST", "/api/gdpr/export-requests", data),
    onSuccess: () => {
      toast({ title: t('gdpr.messages.exportRequestCreated') });
      queryClient.invalidateQueries({ queryKey: ['/api/gdpr/export-requests'] });
    },
    onError: (error: any) => {
      toast({
        title: t('gdpr.messages.errorCreatingExportRequest'),
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const createDeletionRequestMutation = useMutation({
    mutationFn: (data: z.infer<typeof deletionRequestSchema>) =>
      apiRequest("POST", "/api/gdpr/deletion-requests", data),
    onSuccess: () => {
      toast({ title: t('gdpr.messages.deletionRequestCreated') });
      queryClient.invalidateQueries({ queryKey: ['/api/gdpr/deletion-requests'] });
    },
    onError: (error: any) => {
      toast({
        title: t('gdpr.messages.errorCreatingDeletionRequest'),
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const createRetentionPolicyMutation = useMutation({
    mutationFn: (data: z.infer<typeof retentionPolicySchema>) =>
      apiRequest("POST", "/api/gdpr/retention-policies", data),
    onSuccess: () => {
      toast({ title: t('gdpr.messages.retentionPolicyCreated') });
      queryClient.invalidateQueries({ queryKey: ['/api/gdpr/retention-policies'] });
    },
    onError: (error: any) => {
      toast({
        title: t('gdpr.messages.errorCreatingRetentionPolicy'),
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const createBreachIncidentMutation = useMutation({
    mutationFn: (data: z.infer<typeof breachIncidentSchema>) =>
      apiRequest("POST", "/api/gdpr/breach-incidents", {
        ...data,
        detectedAt: new Date(data.detectedAt).toISOString()
      }),
    onSuccess: () => {
      toast({ title: t('gdpr.messages.breachIncidentReported') });
      queryClient.invalidateQueries({ queryKey: ['/api/gdpr/breach-incidents'] });
    },
    onError: (error: any) => {
      toast({
        title: t('gdpr.messages.errorReportingBreachIncident'),
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const downloadExportMutation = useMutation({
    mutationFn: async (requestId: string) => {
      console.log(`Starting download for request: ${requestId}`);
      
      // First get the export request to check the format
      const exportRequest = exportRequests?.find(req => req.id === requestId);
      const exportFormat = exportRequest?.exportFormat || 'json';
      console.log(`Export format: ${exportFormat}`);
      
      const response = await apiRequest("GET", `/api/gdpr/export-requests/${requestId}/download`);
      console.log('Raw response received:', response);
      
      let fileData: string | ArrayBuffer;
      let contentType: string;
      let fileExtension: string;
      let dataDescription: string;
      
      // Handle different response formats
      switch (exportFormat) {
        case 'csv':
          fileData = await response.text();
          contentType = 'text/csv';
          fileExtension = 'csv';
          dataDescription = `${fileData.split('\n').length - 1} rows`;
          break;
        case 'pdf':
          fileData = await response.arrayBuffer();
          contentType = 'application/pdf';
          fileExtension = 'pdf';
          dataDescription = 'PDF document';
          break;
        case 'json':
        default:
          const userData = await response.json();
          fileData = JSON.stringify(userData, null, 2);
          contentType = 'application/json';
          fileExtension = 'json';
          dataDescription = `${Object.keys(userData || {}).length} data sections`;
          console.log('Parsed userData:', userData);
          console.log('UserData keys:', Object.keys(userData || {}));
          
          // Validate JSON data
          if (!userData || Object.keys(userData).length === 0) {
            throw new Error("The exported data appears to be empty. Please check your permissions.");
          }
          break;
      }
      
      console.log(`File data prepared: ${typeof fileData === 'string' ? fileData.length + ' characters' : 'binary data'}`);
      
      return { fileData, contentType, fileExtension, requestId, dataDescription, exportFormat };
    },
    onSuccess: ({ fileData, contentType, fileExtension, requestId, dataDescription, exportFormat }) => {
      console.log(`Download mutation success for format: ${exportFormat}`);
      
      // Create and download file based on format
      const blob = new Blob([fileData], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-export-${requestId}.${fileExtension}`;
      a.setAttribute('data-testid', 'download-link');
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({ 
        title: t('gdpr.messages.dataExportDownloaded'),
        description: `Downloaded ${dataDescription} as ${fileExtension.toUpperCase()} format`
      });
    },
    onError: (error: any) => {
      console.error('Download mutation error:', error);
      toast({
        title: t('gdpr.messages.errorDownloadingExport'),
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Permission checks
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  // Forms
  const exportForm = useForm<z.infer<typeof exportRequestSchema>>({
    resolver: zodResolver(exportRequestSchema),
    defaultValues: {
      exportFormat: "json",
      includePersonalData: true,
      includeServiceData: true,
      includeFinancialData: false
    }
  });

  const deletionForm = useForm<z.infer<typeof deletionRequestSchema>>({
    resolver: zodResolver(deletionRequestSchema)
  });

  const retentionForm = useForm<z.infer<typeof retentionPolicySchema>>({
    resolver: zodResolver(retentionPolicySchema),
    defaultValues: {
      isActive: true
    }
  });

  const breachForm = useForm<z.infer<typeof breachIncidentSchema>>({
    resolver: zodResolver(breachIncidentSchema),
    defaultValues: {
      affectedUserCount: 0,
      affectedDataTypes: []
    }
  });

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      processing: "secondary",
      completed: "default",
      approved: "default",
      rejected: "destructive",
      active: "default",
      inactive: "secondary"
    };

    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  // Severity badge component
  const SeverityBadge = ({ severity }: { severity: string }) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      low: "secondary",
      medium: "outline" as any,
      high: "default",
      critical: "destructive"
    };

    return <Badge variant={variants[severity] || "outline"}>{severity}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="gdpr-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('gdpr.title')}</h1>
          <p className="text-muted-foreground">
            {t('gdpr.description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Shield className="h-8 w-8 text-blue-600" />
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">{t('gdpr.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="export-requests">{t('gdpr.tabs.dataExports')}</TabsTrigger>
          <TabsTrigger value="deletion-requests">{t('gdpr.tabs.dataDeletion')}</TabsTrigger>
          <TabsTrigger value="retention-policies" disabled={!isManager}>{t('gdpr.tabs.retention')}</TabsTrigger>
          <TabsTrigger value="breach-incidents" disabled={!isManager}>{t('gdpr.tabs.incidents')}</TabsTrigger>
          <TabsTrigger value="access-logs" disabled={!isManager}>{t('gdpr.tabs.accessLogs')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('gdpr.overview.exportRequests')}</CardTitle>
                <Download className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{exportRequests?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {exportRequests?.filter((r) => r.status === 'pending').length || 0} {t('gdpr.overview.pending')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('gdpr.overview.deletionRequests')}</CardTitle>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{deletionRequests?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {deletionRequests?.filter((r) => r.status === 'pending').length || 0} {t('gdpr.overview.pending')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('gdpr.overview.activePolicies')}</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {retentionPolicies?.filter((p) => p.isActive).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">{t('gdpr.overview.retentionPolicies')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('gdpr.overview.securityIncidents')}</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{breachIncidents?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {breachIncidents?.filter((i) => 
                    i.status === 'detected' || i.status === 'investigating'
                  ).length || 0} {t('gdpr.overview.active')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Phase 2: Document Management GDPR Compliance */}
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Shield className="h-5 w-5" />
                {t('gdpr.overview.phase2.title')}
                <Badge className="bg-green-100 text-green-800 ml-2">NEW</Badge>
              </CardTitle>
              <CardDescription>
                {t('gdpr.overview.phase2.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className="flex items-center justify-center mb-2">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{documents?.length || 0}</div>
                  <div className="text-sm text-gray-600">{t('gdpr.overview.phase2.encryptedDocuments')}</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className="flex items-center justify-center mb-2">
                    <Eye className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="text-2xl font-bold text-orange-600">{documentAccessLogs?.length || 0}</div>
                  <div className="text-sm text-gray-600">{t('gdpr.overview.phase2.accessLogs')}</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-purple-600">{documentRetentionSchedules?.length || 0}</div>
                  <div className="text-sm text-gray-600">{t('gdpr.overview.phase2.retentionSchedules')}</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className="flex items-center justify-center mb-2">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">100%</div>
                  <div className="text-sm text-gray-600">{t('gdpr.overview.phase2.gdprCompliant')}</div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className="bg-blue-100 text-blue-800">
                  <Lock className="h-3 w-3 mr-1" />
                  {t('gdpr.overview.phase2.features.autoEncryption')}
                </Badge>
                <Badge className="bg-green-100 text-green-800">
                  <Shield className="h-3 w-3 mr-1" />
                  {t('gdpr.overview.phase2.features.accessControl')}
                </Badge>
                <Badge className="bg-orange-100 text-orange-800">
                  <Eye className="h-3 w-3 mr-1" />
                  {t('gdpr.overview.phase2.features.auditTrail')}
                </Badge>
                <Badge className="bg-purple-100 text-purple-800">
                  <Clock className="h-3 w-3 mr-1" />
                  {t('gdpr.overview.phase2.features.automatedRetention')}
                </Badge>
                <Badge className="bg-red-100 text-red-800">
                  <Trash2 className="h-3 w-3 mr-1" />
                  {t('gdpr.overview.phase2.features.secureDeletion')}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <a href="/object-storage">
                    <Settings className="h-4 w-4 mr-2" />
                    {t('gdpr.overview.phase2.actions.manageDocuments')}
                  </a>
                </Button>
                <Button variant="outline" disabled>
                  <FileText className="h-4 w-4 mr-2" />
                  {t('gdpr.overview.phase2.actions.viewAuditReports')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('gdpr.overview.quickActions.title')}</CardTitle>
              <CardDescription>{t('gdpr.overview.quickActions.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-20 flex-col">
                      <Download className="h-6 w-6 mb-2" />
                      {t('gdpr.overview.quickActions.requestDataExport')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{t('gdpr.dialogs.exportRequest.title')}</DialogTitle>
                      <DialogDescription>
                        {t('gdpr.dialogs.exportRequest.description')}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...exportForm}>
                      <form 
                        onSubmit={exportForm.handleSubmit((data) => createExportRequestMutation.mutate(data))}
                        className="space-y-4"
                      >
                        <FormField
                          control={exportForm.control}
                          name="userId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('gdpr.dialogs.exportRequest.selectUser')}</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t('gdpr.dialogs.exportRequest.selectUserPlaceholder')} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {users?.map((u: any) => (
                                    <SelectItem key={u.id} value={u.id}>
                                      {u.email} ({u.firstName} {u.lastName})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={exportForm.control}
                          name="exportFormat"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('gdpr.dialogs.exportRequest.exportFormat')}</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="json">JSON</SelectItem>
                                  <SelectItem value="csv">CSV</SelectItem>
                                  <SelectItem value="pdf">PDF</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="space-y-3">
                          <FormField
                            control={exportForm.control}
                            name="includePersonalData"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>{t('gdpr.dialogs.exportRequest.includePersonalData')}</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={exportForm.control}
                            name="includeServiceData"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>{t('gdpr.dialogs.exportRequest.includeServiceData')}</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={exportForm.control}
                            name="includeFinancialData"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>{t('gdpr.dialogs.exportRequest.includeFinancialData')}</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>

                        <Button type="submit" disabled={createExportRequestMutation.isPending}>
                          {createExportRequestMutation.isPending ? t('gdpr.dialogs.exportRequest.submitting') : t('gdpr.dialogs.exportRequest.submit')}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-20 flex-col">
                      <Trash2 className="h-6 w-6 mb-2" />
                      {t('gdpr.overview.quickActions.requestDataDeletion')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{t('gdpr.dialogs.deletionRequest.title')}</DialogTitle>
                      <DialogDescription>
                        {t('gdpr.dialogs.deletionRequest.description')}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...deletionForm}>
                      <form 
                        onSubmit={deletionForm.handleSubmit((data) => createDeletionRequestMutation.mutate(data))}
                        className="space-y-4"
                      >
                        <FormField
                          control={deletionForm.control}
                          name="userId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>User</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select user" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {users?.map((u: any) => (
                                    <SelectItem key={u.id} value={u.id}>
                                      {u.email} ({u.firstName} {u.lastName})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={deletionForm.control}
                          name="reason"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reason</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select reason" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="user_request">User Request</SelectItem>
                                  <SelectItem value="account_closure">Account Closure</SelectItem>
                                  <SelectItem value="gdpr_right">GDPR Right to Erasure</SelectItem>
                                  <SelectItem value="data_minimization">Data Minimization</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={deletionForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes (Optional)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Additional details about the deletion request..."
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button type="submit" disabled={createDeletionRequestMutation.isPending}>
                          {createDeletionRequestMutation.isPending ? "Creating..." : "Create Request"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                {isManager && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-20 flex-col">
                        <AlertTriangle className="h-6 w-6 mb-2" />
                        {t('gdpr.overview.quickActions.reportSecurityIncident')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>{t('gdpr.dialogs.breachIncident.title')}</DialogTitle>
                        <DialogDescription>
                          {t('gdpr.dialogs.breachIncident.description')}
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...breachForm}>
                        <form 
                          onSubmit={breachForm.handleSubmit((data) => createBreachIncidentMutation.mutate(data))}
                          className="space-y-4"
                        >
                          <FormField
                            control={breachForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('gdpr.dialogs.breachIncident.incidentTitle')}</FormLabel>
                                <FormControl>
                                  <Input placeholder={t('gdpr.dialogs.breachIncident.incidentTitle')} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={breachForm.control}
                            name="severity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('gdpr.dialogs.breachIncident.severity')}</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={t('gdpr.dialogs.breachIncident.severity')} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="low">{t('gdpr.dialogs.breachIncident.severityLevels.low')}</SelectItem>
                                    <SelectItem value="medium">{t('gdpr.dialogs.breachIncident.severityLevels.medium')}</SelectItem>
                                    <SelectItem value="high">{t('gdpr.dialogs.breachIncident.severityLevels.high')}</SelectItem>
                                    <SelectItem value="critical">{t('gdpr.dialogs.breachIncident.severityLevels.critical')}</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={breachForm.control}
                            name="detectedAt"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('gdpr.dialogs.breachIncident.detectedAt')}</FormLabel>
                                <FormControl>
                                  <Input type="datetime-local" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={breachForm.control}
                            name="affectedUserCount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('gdpr.dialogs.breachIncident.affectedUserCount')}</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={breachForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('gdpr.dialogs.breachIncident.incidentDescription')}</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder={t('gdpr.dialogs.breachIncident.incidentDescription')}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button type="submit" disabled={createBreachIncidentMutation.isPending}>
                            {createBreachIncidentMutation.isPending ? t('gdpr.dialogs.breachIncident.submitting') : t('gdpr.dialogs.breachIncident.submit')}
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export-requests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('gdpr.tabs.dataExports')}</CardTitle>
              <CardDescription>
                {t('gdpr.tabs.dataExportsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('gdpr.table.user')}</TableHead>
                    <TableHead>{t('gdpr.table.format')}</TableHead>
                    <TableHead>{t('gdpr.table.dataTypes')}</TableHead>
                    <TableHead>{t('gdpr.table.status')}</TableHead>
                    <TableHead>{t('gdpr.table.created')}</TableHead>
                    <TableHead>{t('gdpr.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportRequests?.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        {users?.find((u) => u.id === request.userId)?.email || request.userId}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{request.exportFormat}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {request.includePersonalData && <Badge variant="secondary" className="mr-1">{t('gdpr.dataTypes.personal')}</Badge>}
                          {request.includeServiceData && <Badge variant="secondary" className="mr-1">{t('gdpr.dataTypes.service')}</Badge>}
                          {request.includeFinancialData && <Badge variant="secondary" className="mr-1">{t('gdpr.dataTypes.financial')}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={request.status} />
                      </TableCell>
                      <TableCell>
                        {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {request.status === 'pending' && user?.role === 'admin' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Process/approve export request
                                apiRequest("PUT", `/api/gdpr/export-requests/${request.id}`, {
                                  status: 'completed'
                                })
                                  .then(() => {
                                    toast({ title: t('gdpr.messages.exportRequestApproved') });
                                    queryClient.invalidateQueries({ queryKey: ['/api/gdpr/export-requests'] });
                                  })
                                  .catch((error) => {
                                    toast({
                                      title: t('gdpr.messages.errorProcessingRequest'),
                                      description: error.message,
                                      variant: "destructive"
                                    });
                                  });
                              }}
                              data-testid={`approve-export-${request.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {t('gdpr.actions.approve')}
                            </Button>
                          )}
                          {request.status === 'completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadExportMutation.mutate(request.id)}
                              disabled={downloadExportMutation.isPending}
                              data-testid={`download-export-${request.id}`}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              {t('gdpr.actions.download')}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )) || []}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deletion-requests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('gdpr.tabs.dataDeletion')}</CardTitle>
              <CardDescription>
                {t('gdpr.tabs.dataDeletionDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('gdpr.table.user')}</TableHead>
                    <TableHead>{t('gdpr.table.reason')}</TableHead>
                    <TableHead>{t('gdpr.table.status')}</TableHead>
                    <TableHead>{t('gdpr.table.requested')}</TableHead>
                    <TableHead>{t('gdpr.table.approvedBy')}</TableHead>
                    <TableHead>{t('gdpr.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deletionRequests?.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        {users?.find((u) => u.id === request.userId)?.email || request.userId}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{request.reason.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={request.status} />
                      </TableCell>
                      <TableCell>
                        {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {request.approvedBy ? 
                          users?.find((u) => u.id === request.approvedBy)?.email || 'Unknown' :
                          '-'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {request.status === 'pending' && isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Approve deletion request
                                apiRequest("POST", `/api/gdpr/deletion-requests/${request.id}/approve`, {})
                                  .then(() => {
                                    toast({ title: "Deletion request approved" });
                                    queryClient.invalidateQueries({ queryKey: ['/api/gdpr/deletion-requests'] });
                                  })
                                  .catch((error) => {
                                    toast({
                                      title: "Error approving request",
                                      description: error.message,
                                      variant: "destructive"
                                    });
                                  });
                              }}
                              data-testid={`approve-deletion-${request.id}`}
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          )}
                          {request.status === 'approved' && isAdmin && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                // Execute deletion
                                apiRequest(`/api/gdpr/deletion-requests/${request.id}/execute`, "POST", {})
                                  .then(() => {
                                    toast({ title: "Data deletion executed" });
                                    queryClient.invalidateQueries({ queryKey: ['/api/gdpr/deletion-requests'] });
                                  })
                                  .catch((error) => {
                                    toast({
                                      title: "Error executing deletion",
                                      description: error.message,
                                      variant: "destructive"
                                    });
                                  });
                              }}
                              data-testid={`execute-deletion-${request.id}`}
                            >
                              Execute
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {isManager && (
          <>
            <TabsContent value="retention-policies" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Data Retention Policies</CardTitle>
                    <CardDescription>
                      Manage how long different types of data are retained
                    </CardDescription>
                  </div>
                  {isAdmin && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button data-testid="create-retention-policy">
                          Add Policy
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Create Retention Policy</DialogTitle>
                          <DialogDescription>
                            Define how long data should be retained
                          </DialogDescription>
                        </DialogHeader>
                        <Form {...retentionForm}>
                          <form 
                            onSubmit={retentionForm.handleSubmit((data) => createRetentionPolicyMutation.mutate(data))}
                            className="space-y-4"
                          >
                            <FormField
                              control={retentionForm.control}
                              name="entityType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Entity Type</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., time_logs" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={retentionForm.control}
                              name="retentionPeriodDays"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Retention Period (Days)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number"
                                      min="1"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={retentionForm.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Describe this retention policy..."
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <Button type="submit" disabled={createRetentionPolicyMutation.isPending}>
                              {createRetentionPolicyMutation.isPending ? "Creating..." : "Create Policy"}
                            </Button>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entity Type</TableHead>
                        <TableHead>Retention Period</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Review</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {retentionPolicies?.map((policy: DataRetentionPolicy) => (
                        <TableRow key={policy.id}>
                          <TableCell className="font-medium">{policy.entityType}</TableCell>
                          <TableCell>{policy.retentionPeriodDays} days</TableCell>
                          <TableCell>{policy.description}</TableCell>
                          <TableCell>
                            <StatusBadge status={policy.isActive ? 'active' : 'inactive'} />
                          </TableCell>
                          <TableCell>
                            {policy.lastReviewDate ? 
                              new Date(policy.lastReviewDate).toLocaleDateString() :
                              'Never'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="breach-incidents" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Security Incidents</CardTitle>
                  <CardDescription>
                    Track and manage data breach incidents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Affected Users</TableHead>
                        <TableHead>Detected</TableHead>
                        <TableHead>Reported</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {breachIncidents?.map((incident: DataBreachIncident) => (
                        <TableRow key={incident.id}>
                          <TableCell className="font-medium">{incident.title}</TableCell>
                          <TableCell>
                            <SeverityBadge severity={incident.severity} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={incident.status} />
                          </TableCell>
                          <TableCell>{incident.affectedUserCount}</TableCell>
                          <TableCell>
                            {new Date(incident.detectedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {incident.reportedToAuthorityAt ? 
                              new Date(incident.reportedToAuthorityAt).toLocaleDateString() :
                              'Not reported'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="access-logs" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Data Access Logs</CardTitle>
                  <CardDescription>
                    Monitor data access and operations for compliance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Accessed By</TableHead>
                        <TableHead>Entity Type</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accessLogs?.slice(0, 50).map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {users?.find((u) => u.id === log.userId)?.email || log.userId}
                          </TableCell>
                          <TableCell>
                            {users?.find((u) => u.id === log.accessedBy)?.email || log.accessedBy}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.entityType}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{log.action}</Badge>
                          </TableCell>
                          <TableCell>{log.ipAddress || 'N/A'}</TableCell>
                          <TableCell>
                            {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A'}
                          </TableCell>
                        </TableRow>
                      )) || []}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}