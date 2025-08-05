import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, Download, RefreshCw, AlertCircle, CheckCircle2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface ExcelDataRow {
  id: string;
  rowNumber: string;
  department: string;
  recordedStart: string;
  recordedEnd: string;
  scheduledStart: string;
  scheduledEnd: string;
  duration: string;
  nominalDuration: string;
  kilometers: string;
  calculatedKilometers: string;
  value: string;
  notes: string;
  appointmentType: string;
  serviceCategory: string;
  serviceType: string;
  cost1: string;
  cost2: string;
  cost3: string;
  categoryType: string;
  aggregation: string;
  assistedPersonFirstName: string;
  assistedPersonLastName: string;
  recordNumber: string;
  dateOfBirth: string;
  taxCode: string;
  primaryPhone: string;
  secondaryPhone: string;
  mobilePhone: string;
  phoneNotes: string;
  homeAddress: string;
  cityOfResidence: string;
  regionOfResidence: string;
  area: string;
  agreement: string;
  operatorFirstName: string;
  operatorLastName: string;
  requesterFirstName: string;
  requesterLastName: string;
  authorized: string;
  modifiedAfterRegistration: string;
  validTag: string;
  identifier: string;
  departmentId: string;
  appointmentTypeId: string;
  serviceId: string;
  serviceTypeId: string;
  categoryId: string;
  categoryTypeId: string;
  aggregationId: string;
  assistedPersonId: string;
  municipalityId: string;
  regionId: string;
  areaId: string;
  agreementId: string;
  operatorId: string;
  requesterId: string;
  assistanceId: string;
  ticketExemption: string;
  registrationNumber: string;
  xmpiCode: string;
  travelDuration: string;
}

export default function DataManagement() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);

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

  const { data: importData, isLoading: importDataLoading } = useQuery<ExcelDataRow[]>({
    queryKey: ["/api/data/import", selectedImportId],
    enabled: !!selectedImportId,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/data/import/${selectedImportId}`);
      return response.json();
    },
  });

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
        throw new Error(await response.text());
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data/imports"] });
      toast({
        title: "Success",
        description: "File uploaded successfully. Processing will begin shortly.",
      });
      setSelectedFile(null);
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
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
        toast({
          title: "Invalid File Type",
          description: "Please select an Excel file (.xlsx, .xls) or CSV file (.csv)",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleViewDetails = (importId: string) => {
    setSelectedImportId(importId);
    setViewDialogOpen(true);
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
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2" data-testid="text-data-management-title">
          Data Management
        </h2>
        <p className="text-slate-600">
          Import and manage data from Excel files. Upload your files to process client, staff, and service data.
        </p>
      </div>

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="history">Import History</TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>Import Excel Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                  <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-primary hover:text-primary/80">
                          Click to upload
                        </span>
                        {" "}or drag and drop
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
                        Excel files (.xlsx, .xls) or CSV files up to 10MB
                      </p>
                    </div>

                    {selectedFile && (
                      <div className="bg-slate-50 rounded-lg p-4 text-left">
                        <p className="text-sm font-medium text-slate-900">
                          Selected file: {selectedFile.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploadMutation.isPending}
                    className="bg-primary hover:bg-primary/90"
                    data-testid="button-upload"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload File
                      </>
                    )}
                  </Button>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-slate-900 mb-2">
                    Import Guidelines
                  </h4>
                  <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                    <li>Ensure your Excel file contains the required columns</li>
                    <li>All data will be imported as text to preserve formatting</li>
                    <li>Empty cells will be saved as empty strings</li>
                    <li>You can review the import status in the History tab</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Import History</CardTitle>
            </CardHeader>
            <CardContent>
              {imports && imports.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Filename</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>Actions</TableHead>
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
                  <p className="text-slate-600">No imports yet</p>
                  <p className="text-sm text-slate-500">
                    Upload your first Excel file to get started
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Imported Data Details</DialogTitle>
          </DialogHeader>
          {importDataLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : importData && importData.length > 0 ? (
            <ScrollArea className="h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-white">Row</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Operator</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="sticky left-0 bg-white font-medium">
                        {row.rowNumber}
                      </TableCell>
                      <TableCell>{row.department || '-'}</TableCell>
                      <TableCell>
                        {row.assistedPersonFirstName || row.assistedPersonLastName 
                          ? `${row.assistedPersonFirstName} ${row.assistedPersonLastName}`.trim()
                          : '-'}
                      </TableCell>
                      <TableCell>{row.serviceType || '-'}</TableCell>
                      <TableCell>{row.recordedStart || '-'}</TableCell>
                      <TableCell>{row.duration || '-'}</TableCell>
                      <TableCell>{row.value || '-'}</TableCell>
                      <TableCell>
                        {row.operatorFirstName || row.operatorLastName
                          ? `${row.operatorFirstName} ${row.operatorLastName}`.trim()
                          : '-'}
                      </TableCell>
                      <TableCell>{row.cityOfResidence || '-'}</TableCell>
                      <TableCell>{row.validTag || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-600">No data found for this import</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}