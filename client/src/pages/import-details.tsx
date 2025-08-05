import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, RefreshCw, FileSpreadsheet, Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";

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

interface ImportRecord {
  id: string;
  filename: string;
  uploadedAt: string;
  status: string;
  totalRows: string;
  processedRows: string;
  errorLog: string;
}

export default function ImportDetails() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams();
  const importId = params.id;

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [user, authLoading, toast]);

  const { data: importInfo } = useQuery<ImportRecord>({
    queryKey: ["/api/data/imports", importId],
    enabled: !!user && !!importId,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/data/imports");
      const imports = await response.json();
      return imports.find((imp: ImportRecord) => imp.id === importId);
    },
  });

  const { data: importData, isLoading: dataLoading } = useQuery<ExcelDataRow[]>({
    queryKey: ["/api/data/import", importId],
    enabled: !!user && !!importId,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/data/import/${importId}`);
      return response.json();
    },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/data-management")}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Data Management
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Import Details</h1>
            {importInfo && (
              <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <FileSpreadsheet className="h-4 w-4" />
                  {importInfo.filename}
                </span>
                <span>•</span>
                <span>{new Date(importInfo.uploadedAt).toLocaleString()}</span>
                <span>•</span>
                <span>{importInfo.processedRows} rows</span>
              </div>
            )}
          </div>
          <Button variant="outline" data-testid="button-export">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Imported Data</CardTitle>
        </CardHeader>
        <CardContent>
          {dataLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : importData && importData.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-300px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-white z-10">Row</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Tax Code</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Service Category</TableHead>
                    <TableHead>Recorded Start</TableHead>
                    <TableHead>Recorded End</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Kilometers</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Operator</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Agreement</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="sticky left-0 bg-white z-10 font-medium">
                        {row.rowNumber}
                      </TableCell>
                      <TableCell>{row.department || '-'}</TableCell>
                      <TableCell>
                        {row.assistedPersonFirstName || row.assistedPersonLastName 
                          ? `${row.assistedPersonFirstName} ${row.assistedPersonLastName}`.trim()
                          : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.taxCode || '-'}</TableCell>
                      <TableCell>{row.serviceType || '-'}</TableCell>
                      <TableCell>{row.serviceCategory || '-'}</TableCell>
                      <TableCell className="text-xs">{row.recordedStart || '-'}</TableCell>
                      <TableCell className="text-xs">{row.recordedEnd || '-'}</TableCell>
                      <TableCell>{row.duration || '-'}</TableCell>
                      <TableCell>{row.kilometers || '-'}</TableCell>
                      <TableCell className="font-medium">{row.value || '-'}</TableCell>
                      <TableCell>
                        {row.operatorFirstName || row.operatorLastName
                          ? `${row.operatorFirstName} ${row.operatorLastName}`.trim()
                          : '-'}
                      </TableCell>
                      <TableCell>{row.cityOfResidence || '-'}</TableCell>
                      <TableCell>{row.regionOfResidence || '-'}</TableCell>
                      <TableCell>{row.agreement || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate" title={row.notes || ''}>
                        {row.notes || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.validTag === '1' ? 'default' : 'secondary'}>
                          {row.validTag === '1' ? 'Valid' : 'Invalid'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center py-12">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <p className="text-slate-600">No data found for this import</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}