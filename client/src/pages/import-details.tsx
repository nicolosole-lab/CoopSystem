import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, RefreshCw, FileSpreadsheet, Download, Search, Filter, Settings2, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { getColumnLabel, ColumnKey } from "@shared/columnMappings";
import { useTranslation } from 'react-i18next';
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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

// Define available columns
const availableColumns: { key: ColumnKey; default: boolean }[] = [
  { key: 'rowNumber', default: true },
  { key: 'department', default: true },
  { key: 'clientName', default: true },
  { key: 'taxCode', default: true },
  { key: 'serviceType', default: true },
  { key: 'serviceCategory', default: true },
  { key: 'recordedStart', default: true },
  { key: 'recordedEnd', default: true },
  { key: 'duration', default: true },
  { key: 'kilometers', default: true },
  { key: 'value', default: true },
  { key: 'operator', default: false },
  { key: 'cityOfResidence', default: false },
  { key: 'regionOfResidence', default: false },
  { key: 'agreement', default: false },
  { key: 'notes', default: false },
  { key: 'validTag', default: false },
  { key: 'appointmentType', default: false },
  { key: 'cost1', default: false },
  { key: 'cost2', default: false },
  { key: 'cost3', default: false },
];

export default function ImportDetails() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const [, navigate] = useLocation();
  const params = useParams();
  const importId = params.id;

  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    availableColumns.filter(col => col.default).map(col => col.key)
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [filterField, setFilterField] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);

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

  // Sync clients mutation
  const syncClientsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/imports/${importId}/sync-clients`);
      return response.json();
    },
    onSuccess: (data) => {
      setSyncResults(data);
      setShowSyncDialog(true);
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      const description = data.summary 
        ? data.summary.message 
        : `${data.added} clients added, ${data.skipped} clients skipped`;
      toast({
        title: t('importDetails.syncSuccess'),
        description,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('importDetails.syncError'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter and search logic
  const filteredData = useMemo(() => {
    if (!importData) return [];
    
    let filtered = [...importData];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(row => {
        const searchLower = searchQuery.toLowerCase();
        return Object.values(row).some(value => 
          String(value).toLowerCase().includes(searchLower)
        );
      });
    }
    
    // Apply field-specific filter
    if (filterField && filterValue) {
      filtered = filtered.filter(row => {
        const value = row[filterField as keyof ExcelDataRow] || '';
        return String(value).toLowerCase().includes(filterValue.toLowerCase());
      });
    }
    
    return filtered;
  }, [importData, searchQuery, filterField, filterValue]);

  // Pagination logic
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Handle column selection
  const toggleColumn = (columnKey: string) => {
    setSelectedColumns(prev => 
      prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  // Get display value for a cell
  const getCellValue = (row: ExcelDataRow, columnKey: string) => {
    switch (columnKey) {
      case 'clientName':
        return row.assistedPersonFirstName || row.assistedPersonLastName 
          ? `${row.assistedPersonFirstName} ${row.assistedPersonLastName}`.trim()
          : '-';
      case 'operator':
        return row.operatorFirstName || row.operatorLastName
          ? `${row.operatorFirstName} ${row.operatorLastName}`.trim()
          : '-';
      default:
        return row[columnKey as keyof ExcelDataRow] || '-';
    }
  };

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
          {t('common.back')}
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('importDetails.title')}</h1>
            {importInfo && (
              <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <FileSpreadsheet className="h-4 w-4" />
                  {importInfo.filename}
                </span>
                <span>•</span>
                <span>{new Date(importInfo.uploadedAt).toLocaleString()}</span>
                <span>•</span>
                <span>{importInfo.processedRows} {t('importDetails.rows')}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              data-testid="button-sync-clients"
              onClick={() => syncClientsMutation.mutate()}
              disabled={syncClientsMutation.isPending}
            >
              {syncClientsMutation.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Users className="mr-2 h-4 w-4" />
              )}
              {t('importDetails.syncClients')}
            </Button>
            <Button variant="outline" data-testid="button-export">
              <Download className="mr-2 h-4 w-4" />
              {t('importDetails.exportData')}
            </Button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder={t('importDetails.search')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
              data-testid="input-search"
            />
          </div>

          {/* Field Filter */}
          <div className="flex gap-2">
            <Select value={filterField || "all"} onValueChange={(value) => setFilterField(value === "all" ? "" : value)}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-field">
                <SelectValue placeholder={t('importDetails.filterByField')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('importDetails.allFields')}</SelectItem>
                {availableColumns.map(col => (
                  <SelectItem key={col.key} value={col.key}>{getColumnLabel(col.key, language)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterField && (
              <Input
                type="text"
                placeholder={`Filter ${getColumnLabel(filterField as ColumnKey, language)}...`}
                value={filterValue}
                onChange={(e) => {
                  setFilterValue(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-[200px]"
                data-testid="input-filter-value"
              />
            )}
          </div>

          {/* Column Settings */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" data-testid="button-columns">
                <Settings2 className="mr-2 h-4 w-4" />
                {t('importDetails.columnSettings')} ({selectedColumns.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[250px]">
              <div className="space-y-2">
                <h4 className="font-medium text-sm mb-2">{t('importDetails.selectColumns')}</h4>
                <ScrollArea className="h-[300px]">
                  {availableColumns.map(col => (
                    <div key={col.key} className="flex items-center space-x-2 py-1">
                      <Checkbox
                        id={col.key}
                        checked={selectedColumns.includes(col.key)}
                        onCheckedChange={() => toggleColumn(col.key)}
                      />
                      <label
                        htmlFor={col.key}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {getColumnLabel(col.key, language)}
                      </label>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Results info */}
        <div className="text-sm text-slate-600">
          {t('importDetails.showingResults', {
            from: Math.min((currentPage - 1) * itemsPerPage + 1, filteredData.length),
            to: Math.min(currentPage * itemsPerPage, filteredData.length),
            total: filteredData.length
          })}
          {searchQuery || filterValue ? ` ${t('importDetails.filtered')}` : ''}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('importDetails.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {dataLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : filteredData.length > 0 ? (
            <>
              <ScrollArea className="h-[calc(100vh-450px)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {selectedColumns.map(colKey => {
                        return (
                          <TableHead 
                            key={colKey} 
                            className={colKey === 'rowNumber' ? 'sticky left-0 bg-white z-10' : ''}
                          >
                            {getColumnLabel(colKey as ColumnKey, language)}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((row) => (
                      <TableRow key={row.id}>
                        {selectedColumns.map(colKey => (
                          <TableCell 
                            key={colKey}
                            className={
                              colKey === 'rowNumber' ? 'sticky left-0 bg-white z-10 font-medium' :
                              colKey === 'taxCode' ? 'font-mono text-xs' :
                              colKey === 'value' ? 'font-medium' :
                              colKey === 'notes' ? 'max-w-xs truncate' :
                              (colKey === 'recordedStart' || colKey === 'recordedEnd') ? 'text-xs' : ''
                            }
                            title={colKey === 'notes' ? String(getCellValue(row, colKey)) : undefined}
                          >
                            {colKey === 'validTag' ? (
                              row.validTag === '1' ? (
                                <Badge variant="default">Valid</Badge>
                              ) : (
                                <Badge variant="secondary">Invalid</Badge>
                              )
                            ) : (
                              getCellValue(row, colKey)
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Pagination */}
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">{t('importDetails.rowsPerPage')}:</span>
                  <Select 
                    value={String(itemsPerPage)} 
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t('importDetails.previous')}
                  </Button>
                  <span className="text-sm text-slate-600">
                    {t('importDetails.page')} {currentPage} {t('importDetails.of')} {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    {t('importDetails.next')}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <p className="text-slate-600">
                {searchQuery || filterValue ? t('importDetails.noData') : t('importDetails.noData')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Sync Results Dialog */}
      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('importDetails.clientSyncResults')}</DialogTitle>
          </DialogHeader>
          {syncResults && (
            <div className="mt-4">
              <div className="flex gap-4 mb-4">
                <Badge variant="outline" className="text-green-600">
                  {t('importDetails.added')}: {syncResults.added}
                </Badge>
                <Badge variant="outline" className="text-yellow-600">
                  {t('importDetails.skipped')}: {syncResults.skipped}
                </Badge>
                {syncResults.errors > 0 && (
                  <Badge variant="outline" className="text-red-600">
                    {t('importDetails.error')}: {syncResults.errors}
                  </Badge>
                )}
                <Badge variant="outline" className="text-blue-600">
                  {t('importDetails.total')}: {syncResults.total}
                </Badge>
              </div>
              {syncResults.summary && (
                <div className="text-sm text-gray-600 mb-2">
                  {syncResults.summary.message}
                </div>
              )}
            </div>
          )}
          
          {syncResults && syncResults.details && (
            <div className="mt-4">
              <ScrollArea className="h-[400px] border rounded-md p-4">
                <div className="space-y-2">
                  {syncResults.details.map((result: any, index: number) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded-md border ${
                        result.action === 'added' ? 'bg-green-50 border-green-200' : 
                        result.action === 'error' ? 'bg-red-50 border-red-200' : 
                        'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{result.name}</span>
                          {result.email && (
                            <span className="text-sm text-gray-500 ml-2">({result.email})</span>
                          )}
                        </div>
                        <Badge 
                          variant={
                            result.action === 'added' ? 'default' : 
                            result.action === 'error' ? 'destructive' : 
                            'secondary'
                          }
                        >
                          {result.action === 'added' ? t('importDetails.added') : 
                           result.action === 'error' ? t('importDetails.error') :
                           t('importDetails.skipped')}
                        </Badge>
                      </div>
                      {result.reason && (
                        <p className="text-sm text-gray-600 mt-1">{result.reason}</p>
                      )}
                      {result.phone && (
                        <p className="text-sm text-gray-600 mt-1">Phone: {result.phone}</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}