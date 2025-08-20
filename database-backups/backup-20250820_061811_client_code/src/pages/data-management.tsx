import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, Download, RefreshCw, AlertCircle, CheckCircle2, Eye, X, Check, CheckCircle, XCircle, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { getColumnLabel } from "@shared/columnMappings";
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDisplayName } from '@/lib/utils';

interface ImportRecord {
  id: string;
  filename: string;
  uploadedAt: string;
  uploadedByUserId: string;
  status: string;
  totalRows: string;
  processedRows: string;
  errorLog: string;
}

export default function DataManagement() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const { t } = useTranslation();
  const { canImportData } = usePermissions();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [syncStatuses, setSyncStatuses] = useState<Record<string, any>>({});
  const [manualValidationOverrides, setManualValidationOverrides] = useState<{[key: string]: boolean}>({});
  const [, navigate] = useLocation();

  // Toggle manual validation for a column
  const toggleColumnValidation = (columnIndex: string) => {
    setManualValidationOverrides(prev => ({
      ...prev,
      [columnIndex]: !prev[columnIndex]
    }));
  };

  // Get effective validation status (combining automatic and manual)
  const getEffectiveValidation = (columnValidation: any) => {
    if (!columnValidation) return columnValidation;

    let validCriticalColumns = columnValidation.validCriticalColumns || 0;
    let validColumns = columnValidation.validColumns || 0;
    
    // Apply manual overrides
    Object.entries(columnValidation.validationResults).forEach(([index, result]: [string, any]) => {
      const manualOverride = manualValidationOverrides[index];
      const isCurrentlyValid = result.isValid;
      const shouldBeValid = manualOverride !== undefined ? manualOverride : isCurrentlyValid;
      
      // Update counts based on changes
      if (shouldBeValid !== isCurrentlyValid) {
        if (shouldBeValid) {
          validColumns++;
          if (result.critical) validCriticalColumns++;
        } else {
          validColumns--;
          if (result.critical) validCriticalColumns--;
        }
      }
    });

    const totalCriticalColumns = columnValidation.totalCriticalColumns || columnValidation.totalColumns;
    const criticalValidationScore = Math.round((validCriticalColumns / totalCriticalColumns) * 100);
    const canProceedWithImport = criticalValidationScore >= 70;

    return {
      ...columnValidation,
      validColumns,
      validCriticalColumns,
      criticalValidationScore,
      canProceedWithImport
    };
  };

  // Clear manual overrides when new file is loaded
  const clearManualOverrides = () => {
    setManualValidationOverrides({});
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/auth";
      }, 500);
    }
  }, [user, authLoading, toast]);

  const { data: imports, isLoading } = useQuery<ImportRecord[]>({
    queryKey: ["/api/data/imports"],
    retry: false,
    enabled: !!user,
  });

  // Fetch sync status for all imports
  useEffect(() => {
    if (imports && imports.length > 0) {
      imports.forEach(async (importRecord) => {
        if (importRecord.status === 'completed' && !syncStatuses[importRecord.id]) {
          try {
            const response = await fetch(`/api/data/import/${importRecord.id}/sync-status`, {
              credentials: 'include'
            });
            if (response.ok) {
              const syncStatus = await response.json();
              setSyncStatuses(prev => ({
                ...prev,
                [importRecord.id]: syncStatus
              }));
            }
          } catch (error) {
            console.error('Failed to fetch sync status:', error);
          }
        }
      });
    }
  }, [imports]);

  // Preview mutation - parse file without saving
  const previewMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/data/preview", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setPreviewData(data);
      clearManualOverrides(); // Clear manual overrides for new file
      setShowPreviewDialog(true);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      
      // Handle specific error types
      let errorMessage = error.message;
      if (error.message.includes('File too large') || error.message.includes('LIMIT_FILE_SIZE')) {
        errorMessage = "File size exceeds the 50MB limit. Please use a smaller Excel file.";
      }
      
      toast({
        title: t('dataManagement.status.error'),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Import mutation - actually save the data
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/data/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: await response.text() };
        }
        
        // Handle duplicate filename error (409 Conflict)
        if (response.status === 409) {
          const error = new Error(errorData.error || errorData.message);
          (error as any).isDuplicate = true;
          (error as any).details = errorData.details;
          throw error;
        }
        
        throw new Error(errorData.message || errorData.error || await response.text());
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/data/imports"] });
      
      // Show success notification
      toast({
        title: t('dataManagement.messages.importSuccess'),
        description: t('dataManagement.messages.importCompleteDescription', { rowsImported: data.rowsImported }),
        className: "bg-green-50 border-green-200",
      });
      
      setSelectedFile(null);
      clearManualOverrides();
      
      // Redirect to import history after a short delay
      setTimeout(() => {
        navigate('/data-management');
      }, 2000);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      
      // Clear loading state on error
      setSelectedFile(null);
      
      // Handle duplicate filename error
      if ((error as any).isDuplicate) {
        const details = (error as any).details;
        toast({
          title: t('dataManagement.messages.fileAlreadyImported'),
          description: details ? 
            `${details.filename} was imported on ${new Date(details.importDate).toLocaleDateString()}. Re-importing may create duplicate data.` :
            error.message,
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
        toast({
          title: "Invalid File Type",
          description: "Please select an Excel file (.xlsx, .xls) or CSV file (.csv)",
          variant: "destructive",
        });
        return;
      }
      
      // Check file size (50MB limit)
      const maxSizeInBytes = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSizeInBytes) {
        toast({
          title: "File Too Large",
          description: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 50MB limit. Please use a smaller file.`,
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handlePreview = () => {
    if (selectedFile) {
      previewMutation.mutate(selectedFile);
    }
  };

  const handleConfirmImport = () => {
    if (selectedFile) {
      // Show loading notification
      toast({
        title: t('dataManagement.messages.importStarting'),
        description: t('dataManagement.messages.importStartingDescription'),
        className: "bg-blue-50 border-blue-200",
      });
      
      uploadMutation.mutate(selectedFile);
      setShowPreviewDialog(false);
      setPreviewData(null);
      // Don't clear selectedFile yet - wait for success/error
    }
  };

  const handleCancelImport = () => {
    setShowPreviewDialog(false);
    setPreviewData(null);
  };

  const handleViewDetails = (importId: string) => {
    navigate(`/import/${importId}`);
  };

  const handleDownload = async (importRecord: ImportRecord) => {
    try {
      const response = await fetch(`/api/data/import/${importRecord.id}/download`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      // Create blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = importRecord.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: t('dataManagement.messages.downloadStarted'),
        description: t('dataManagement.messages.downloadDescription', { filename: importRecord.filename }),
      });

    } catch (error: any) {
      toast({
        title: t('dataManagement.messages.downloadFailed'),
        description: error.message || t('dataManagement.messages.downloadError', 'Failed to download file'),
        variant: "destructive",
      });
    }
  };

  const getSyncStatusBadge = (importId: string) => {
    const syncStatus = syncStatuses[importId];
    
    if (!syncStatus) {
      return (
        <Badge className="bg-gray-100 text-gray-600 border-0">
          <RefreshCw className="w-2 h-2 mr-1" />
          Loading...
        </Badge>
      );
    }

    const { status, syncedCount, totalClients } = syncStatus;
    
    const statusConfig = {
      fully_synced: {
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle,
        text: language === 'it' ? 'Sincronizzato' : 'Synced'
      },
      partially_synced: {
        color: 'bg-yellow-100 text-yellow-800', 
        icon: AlertCircle,
        text: language === 'it' ? `Parziale (${syncedCount}/${totalClients})` : `Partial (${syncedCount}/${totalClients})`
      },
      not_synced: {
        color: 'bg-red-100 text-red-800',
        icon: XCircle,
        text: language === 'it' ? 'Non sincronizzato' : 'Not synced'
      },
      no_clients: {
        color: 'bg-gray-100 text-gray-600',
        icon: Circle,
        text: language === 'it' ? 'Nessun cliente' : 'No clients'
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_synced;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} border-0`}>
        <Icon className="w-2 h-2 mr-1 fill-current" />
        {config.text}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      processing: { className: "bg-blue-100 text-blue-800", icon: RefreshCw },
      completed: { className: "bg-green-100 text-green-800", icon: CheckCircle2 },
      failed: { className: "bg-red-100 text-red-800", icon: AlertCircle },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { 
      className: "bg-slate-100 text-slate-800", 
      icon: AlertCircle 
    };
    
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.className} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (authLoading || isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-64"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative p-4 sm:p-6 lg:p-8">
      {/* Loading Overlay during Import */}
      {uploadMutation.isPending && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center shadow-xl">
            <RefreshCw className="mx-auto h-12 w-12 text-primary animate-spin mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              {t('dataManagement.upload.importing')}
            </h3>
            <p className="text-slate-600 mb-4">
              {t('dataManagement.messages.importProgress', 'Please wait while we process your Excel file. This may take several minutes for large files.')}
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800 font-medium">
                ⚠️ {t('dataManagement.messages.doNotClose', 'Do not close this page or navigate away')}
              </p>
              <p className="text-xs text-amber-700">
                {t('dataManagement.messages.autoComplete', 'Your import is in progress and will complete automatically.')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2" data-testid="text-data-management-title">
          {t('dataManagement.title')}
        </h2>
        <p className="text-slate-600">
          {t('dataManagement.description', 'Import and manage data from Excel files. Upload your files to process client, staff, and service data.')}
        </p>
      </div>

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList>
          <TabsTrigger value="import">{t('dataManagement.tabs.importData')}</TabsTrigger>
          <TabsTrigger value="history">{t('dataManagement.tabs.importHistory')}</TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>{t('dataManagement.upload.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                  <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-primary hover:text-primary/80">
                          {t('dataManagement.upload.chooseFile')}
                        </span>
                        {" "}{t('dataManagement.upload.dragDrop')}
                      </Label>
                      <Input
                        id="file-upload"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                        data-testid="input-file-upload"
                      />
                      <p className="text-sm text-slate-500 mt-1">
                        {t('dataManagement.upload.fileTypes')}
                      </p>
                    </div>

                    {selectedFile && (
                      <div className="bg-slate-50 rounded-lg p-4 text-left">
                        <p className="text-sm font-medium text-slate-900">
                          {t('dataManagement.messages.fileSelected')}: {selectedFile.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t('common.size', 'Size')}: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {canImportData() && (
                  <>
                    <div className="flex justify-end">
                      <Button
                        onClick={handlePreview}
                        disabled={!selectedFile || previewMutation.isPending}
                        className="bg-primary hover:bg-primary/90"
                        data-testid="button-preview"
                      >
                        {previewMutation.isPending ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            {t('dataManagement.preview.loading')}
                          </>
                        ) : (
                          <>
                            <Eye className="mr-2 h-4 w-4" />
                            {t('dataManagement.preview.button')}
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-slate-900 mb-2">
                        {t('dataManagement.guidelines.title')}
                      </h4>
                      <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                        <li>{t('dataManagement.guidelines.rule1')}</li>
                        <li>{t('dataManagement.guidelines.rule2')}</li>
                        <li>{t('dataManagement.guidelines.rule3')}</li>
                        <li>{t('dataManagement.guidelines.rule4')}</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>{t('dataManagement.history.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              {imports && imports.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{getColumnLabel('filename', language)}</TableHead>
                      <TableHead>{getColumnLabel('uploaded', language)}</TableHead>
                      <TableHead>{getColumnLabel('validTag', language)}</TableHead>
                      <TableHead>{getColumnLabel('rows', language)}</TableHead>
                      <TableHead>{getColumnLabel('syncStatus', language)}</TableHead>
                      <TableHead>{getColumnLabel('actions', language)}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {imports.map((importRecord) => (
                      <TableRow key={importRecord.id}>
                        <TableCell className="font-medium">
                          {importRecord.filename}
                        </TableCell>
                        <TableCell>
                          {new Date(importRecord.uploadedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(importRecord.status)}
                        </TableCell>
                        <TableCell>
                          {importRecord.processedRows} / {importRecord.totalRows}
                        </TableCell>
                        <TableCell>
                          {importRecord.status === 'completed' ? getSyncStatusBadge(importRecord.id) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(importRecord.id)}
                              disabled={importRecord.status !== 'completed'}
                              data-testid={`button-view-${importRecord.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(importRecord)}
                              disabled={importRecord.status !== 'completed'}
                              data-testid={`button-download-${importRecord.id}`}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <p className="text-slate-600">{t('dataManagement.history.noImports')}</p>
                  <p className="text-sm text-slate-500">
                    {t('dataManagement.messages.uploadFirst', 'Upload an Excel file to get started with data import')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('dataManagement.preview.title')}</DialogTitle>
          </DialogHeader>
          
          {previewData && (
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">{t('dataManagement.preview.file')}</div>
                  <div className="text-lg font-semibold">{previewData.filename}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">{t('dataManagement.preview.totalRows')}</div>
                  <div className="text-lg font-semibold">{previewData.totalRows}</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="text-sm text-yellow-600 font-medium">{t('dataManagement.preview.previewRows')}</div>
                  <div className="text-lg font-semibold">{previewData.previewRows}</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-sm text-purple-600 font-medium">{t('dataManagement.preview.uniqueClients')}</div>
                  <div className="text-lg font-semibold">{previewData.uniqueClients.length}</div>
                </div>
              </div>

              {/* Language Detection */}
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="text-sm font-medium text-slate-600 mb-1">{t('dataManagement.preview.detectedLanguage')}</div>
                <Badge variant="outline" className="text-slate-700">
                  {previewData.detectedLanguage}
                </Badge>
              </div>

              {/* Column Validation */}
              {previewData.columnValidation && (() => {
                const effectiveValidation = getEffectiveValidation(previewData.columnValidation);
                return (
                  <div className="border rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-slate-900">Column Structure Validation</h4>
                        <Badge 
                          variant={effectiveValidation.canProceedWithImport ? "default" : "destructive"}
                          className={effectiveValidation.canProceedWithImport ? 
                            "bg-green-100 text-green-800 border-green-200" : 
                            "bg-red-100 text-red-800 border-red-200"
                          }
                        >
                          {effectiveValidation.canProceedWithImport ? "Import Ready" : "Missing Critical Data"}
                        </Badge>
                        <Badge 
                          variant="outline"
                          className="text-slate-600 border-slate-300"
                        >
                          {previewData.columnValidation.validationScore}% Overall
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-600">
                        Critical: {effectiveValidation.validCriticalColumns || effectiveValidation.validColumns} of {effectiveValidation.totalCriticalColumns || effectiveValidation.totalColumns} required columns
                      </div>
                    </div>
                    
                    <div className="mb-3 text-sm text-slate-600">
                      <strong>Tip:</strong> Click on any red column to manually mark it as valid if you know the data is correct.
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                      {Object.entries(previewData.columnValidation.validationResults).map(([index, result]: [string, any]) => {
                        const manualOverride = manualValidationOverrides[index];
                        const isEffectivelyValid = manualOverride !== undefined ? manualOverride : result.isValid;
                        const isManuallyOverridden = manualOverride !== undefined;
                        
                        return (
                          <div 
                            key={index} 
                            onClick={() => toggleColumnValidation(index)}
                            className={`p-3 rounded border-l-4 cursor-pointer transition-all hover:shadow-md ${
                              isEffectivelyValid 
                                ? "bg-green-50 border-l-green-500 hover:bg-green-100" 
                                : result.critical 
                                  ? "bg-red-50 border-l-red-500 hover:bg-red-100" 
                                  : "bg-yellow-50 border-l-yellow-500 hover:bg-yellow-100"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-mono bg-slate-200 px-1.5 py-0.5 rounded">
                                    {result.column}
                                  </span>
                                  {isEffectivelyValid ? (
                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                  ) : result.critical ? (
                                    <XCircle className="h-3 w-3 text-red-600" />
                                  ) : (
                                    <AlertCircle className="h-3 w-3 text-yellow-600" />
                                  )}
                                  {result.critical && (
                                    <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-medium">
                                      Required
                                    </span>
                                  )}
                                  {isManuallyOverridden && (
                                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                                      Manual
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-medium text-slate-900 truncate">
                                  {result.description}
                                </div>
                                <div className="text-xs text-slate-600 mt-1">
                                  Found: <span className="font-mono">{result.actualHeader}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {effectiveValidation.canProceedWithImport ? (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-green-800">
                          <strong>Ready to Import:</strong> All essential columns are correctly mapped. {!previewData.columnValidation.isOptimalStructure && "Some optional columns are missing, but the import will work perfectly with header-based mapping."}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-red-800">
                          <strong>Cannot Import:</strong> Critical columns are missing or incorrectly positioned. Click on red columns to manually validate them if you know the data is correct.
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Data Preview */}
              <div className="flex-1 overflow-hidden">
                <div className="text-sm font-medium text-slate-600 mb-2">
                  {t('dataManagement.preview.dataPreview', { count: previewData.previewRows })}
                </div>
                <ScrollArea className="h-64 border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Row</TableHead>
                        <TableHead>Client Name</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Operator</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.previewData.slice(0, 10).map((row: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-xs">
                            {row.originalRowIndex}
                          </TableCell>
                          <TableCell>
                            {formatDisplayName(row.assistedPersonFirstName, row.assistedPersonLastName)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.date || '-'}
                          </TableCell>
                          <TableCell>
                            {formatDisplayName(row.operatorFirstName, row.operatorLastName)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {row.duration || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.homeAddress || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              {/* Unique Clients Preview */}
              {previewData.uniqueClients.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-slate-600 mb-2">
                    {t('dataManagement.preview.uniqueClients')} ({previewData.uniqueClients.length})
                  </div>
                  <div className="border rounded-lg p-3 max-h-32 overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {previewData.uniqueClients.slice(0, 12).map((client: any, index: number) => (
                        <div key={index} className="text-sm text-slate-700">
                          {formatDisplayName(client.firstName, client.lastName)}
                        </div>
                      ))}
                      {previewData.uniqueClients.length > 12 && (
                        <div className="text-sm text-slate-500 italic">
                          +{previewData.uniqueClients.length - 12} more...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancelImport}
              disabled={uploadMutation.isPending}
            >
              <X className="mr-2 h-4 w-4" />
              {t('dataManagement.preview.cancel')}
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={(() => {
                if (uploadMutation.isPending) return true;
                if (!previewData?.columnValidation) return false;
                const effectiveValidation = getEffectiveValidation(previewData.columnValidation);
                return !effectiveValidation.canProceedWithImport;
              })()}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {uploadMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t('dataManagement.preview.importing')}
                </>
              ) : (() => {
                if (!previewData?.columnValidation) return (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    {t('dataManagement.preview.confirmImport')}
                  </>
                );
                const effectiveValidation = getEffectiveValidation(previewData.columnValidation);
                return !effectiveValidation.canProceedWithImport ? (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Cannot Import - Missing Critical Columns
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    {t('dataManagement.preview.confirmImport')}
                  </>
                );
              })()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}