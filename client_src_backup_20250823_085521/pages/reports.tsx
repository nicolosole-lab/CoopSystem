import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Download, 
  Calendar,
  Clock,
  Filter,
  Plus,
  Eye,
  Trash2,
  RefreshCw,
  Users,
  Euro,
  TrendingUp
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Client, Staff } from '@shared/schema';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'service' | 'financial' | 'staff' | 'client';
  format: 'pdf' | 'excel' | 'csv';
  parameters: Array<{
    name: string;
    label: string;
    type: 'date' | 'select' | 'multiselect' | 'text';
    required: boolean;
    options?: Array<{ value: string; label: string }>;
  }>;
}

interface GeneratedReport {
  id: string;
  name: string;
  type: string;
  format: string;
  generatedAt: string;
  generatedBy: string;
  downloadUrl: string;
  status: 'generating' | 'completed' | 'failed';
}

const reportTemplates: ReportTemplate[] = [
  {
    id: 'service-summary',
    name: 'Service Summary Report',
    description: 'Comprehensive overview of service delivery activities',
    type: 'service',
    format: 'pdf',
    parameters: [
      { name: 'startDate', label: 'Start Date', type: 'date', required: true },
      { name: 'endDate', label: 'End Date', type: 'date', required: true },
      { name: 'serviceType', label: 'Service Type', type: 'select', required: false, options: [] },
      { name: 'clientIds', label: 'Clients', type: 'multiselect', required: false, options: [] }
    ]
  },
  {
    id: 'financial-performance',
    name: 'Financial Performance Report',
    description: 'Budget utilization and cost analysis',
    type: 'financial',
    format: 'excel',
    parameters: [
      { name: 'startDate', label: 'Start Date', type: 'date', required: true },
      { name: 'endDate', label: 'End Date', type: 'date', required: true },
      { name: 'budgetCategory', label: 'Budget Category', type: 'select', required: false, options: [] }
    ]
  },
  {
    id: 'staff-productivity',
    name: 'Staff Productivity Report',
    description: 'Individual and team performance metrics',
    type: 'staff',
    format: 'pdf',
    parameters: [
      { name: 'startDate', label: 'Start Date', type: 'date', required: true },
      { name: 'endDate', label: 'End Date', type: 'date', required: true },
      { name: 'staffIds', label: 'Staff Members', type: 'multiselect', required: false, options: [] }
    ]
  },
  {
    id: 'client-service-history',
    name: 'Client Service History',
    description: 'Detailed service records for specific clients',
    type: 'client',
    format: 'pdf',
    parameters: [
      { name: 'clientId', label: 'Client', type: 'select', required: true, options: [] },
      { name: 'startDate', label: 'Start Date', type: 'date', required: true },
      { name: 'endDate', label: 'End Date', type: 'date', required: true },
      { name: 'includeFinancials', label: 'Include Financial Details', type: 'select', required: false, options: [
        { value: 'true', label: 'Yes' },
        { value: 'false', label: 'No' }
      ]}
    ]
  },
  {
    id: 'monthly-summary',
    name: 'Monthly Operations Summary',
    description: 'Complete monthly overview for management',
    type: 'service',
    format: 'excel',
    parameters: [
      { name: 'month', label: 'Month', type: 'date', required: true },
      { name: 'includeGraphs', label: 'Include Charts', type: 'select', required: false, options: [
        { value: 'true', label: 'Yes' },
        { value: 'false', label: 'No' }
      ]}
    ]
  }
];

export default function Reports() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { canRead, canCreate } = usePermissions();
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [reportParameters, setReportParameters] = useState<Record<string, any>>({});
  const [filterType, setFilterType] = useState<string>('all');

  // Fetch data for report options
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: canRead(),
  });

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
    enabled: canRead(),
  });

  // Mock generated reports data (would come from API)
  const { data: generatedReports = [] } = useQuery<GeneratedReport[]>({
    queryKey: ["/api/reports"],
    enabled: canRead(),
    // Mock data for demonstration
    initialData: [
      {
        id: '1',
        name: 'Service Summary - December 2024',
        type: 'service',
        format: 'pdf',
        generatedAt: '2024-12-15T10:30:00Z',
        generatedBy: 'Admin User',
        downloadUrl: '/api/reports/download/1',
        status: 'completed'
      },
      {
        id: '2',
        name: 'Financial Performance - Q4 2024',
        type: 'financial',
        format: 'excel',
        generatedAt: '2024-12-14T15:45:00Z',
        generatedBy: 'Manager User',
        downloadUrl: '/api/reports/download/2',
        status: 'completed'
      }
    ]
  });

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (data: { templateId: string; parameters: Record<string, any> }) => {
      return await apiRequest('POST', '/api/reports/generate', data);
    },
    onSuccess: (data) => {
      toast({
        title: "Report Generation Started",
        description: `Your report "${selectedTemplate?.name}" is being generated. You'll receive a notification when it's ready.`
      });
      setShowGenerateDialog(false);
      setSelectedTemplate(null);
      setReportParameters({});
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate report",
        variant: "destructive"
      });
    }
  });

  // Populate template parameters with client/staff options
  const getEnhancedTemplate = (template: ReportTemplate): ReportTemplate => {
    const enhancedParameters = template.parameters.map(param => {
      if (param.name === 'clientIds' || param.name === 'clientId') {
        return {
          ...param,
          options: clients.map(client => ({
            value: client.id,
            label: `${client.lastName}, ${client.firstName}`
          }))
        };
      }
      if (param.name === 'staffIds') {
        return {
          ...param,
          options: staff.map(staffMember => ({
            value: staffMember.id,
            label: `${staffMember.lastName}, ${staffMember.firstName}`
          }))
        };
      }
      if (param.name === 'serviceType') {
        return {
          ...param,
          options: [
            { value: 'assistenza-persona', label: 'Assistenza alla persona' },
            { value: 'home-care', label: 'Home Care' },
            { value: 'assistenza-sanitaria', label: 'Assistenza sanitaria' },
            { value: 'supporto-domestico', label: 'Supporto domestico' },
            { value: 'accompagnamento', label: 'Accompagnamento' },
            { value: 'assistenza-educativa', label: 'Assistenza educativa' },
            { value: 'supporto-psicologico', label: 'Supporto psicologico' },
            { value: 'fisioterapia', label: 'Fisioterapia' }
          ]
        };
      }
      return param;
    });

    return {
      ...template,
      parameters: enhancedParameters
    };
  };

  // Filter templates by type
  const filteredTemplates = reportTemplates.filter(template => 
    filterType === 'all' || template.type === filterType
  );

  const handleGenerateReport = () => {
    if (!selectedTemplate) return;

    // Validate required parameters
    const missingRequired = selectedTemplate.parameters
      .filter(param => param.required && !reportParameters[param.name])
      .map(param => param.label);

    if (missingRequired.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingRequired.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    generateReportMutation.mutate({
      templateId: selectedTemplate.id,
      parameters: reportParameters
    });
  };

  const handleParameterChange = (paramName: string, value: any) => {
    setReportParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'generating':
        return <Badge className="bg-yellow-100 text-yellow-800">Generating</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'service':
        return <Clock className="h-4 w-4" />;
      case 'financial':
        return <Euro className="h-4 w-4" />;
      case 'staff':
        return <Users className="h-4 w-4" />;
      case 'client':
        return <Users className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (!canRead()) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to view reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Generate comprehensive reports and export data</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40" data-testid="select-report-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reports</SelectItem>
              <SelectItem value="service">Service Reports</SelectItem>
              <SelectItem value="financial">Financial Reports</SelectItem>
              <SelectItem value="staff">Staff Reports</SelectItem>
              <SelectItem value="client">Client Reports</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" data-testid="button-refresh-reports">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates" data-testid="tab-templates">Report Templates</TabsTrigger>
          <TabsTrigger value="generated" data-testid="tab-generated">Generated Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          {/* Report Templates */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {getTypeIcon(template.type)}
                    {template.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm mb-4">{template.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{template.format.toUpperCase()}</Badge>
                      <Badge variant="outline" className="capitalize">{template.type}</Badge>
                    </div>
                    {canCreate() && (
                      <Button 
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate(getEnhancedTemplate(template));
                          setReportParameters({});
                          setShowGenerateDialog(true);
                        }}
                        data-testid={`button-generate-${template.id}`}
                      >
                        Generate
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="generated" className="space-y-6">
          {/* Generated Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {generatedReports.length > 0 ? (
                  generatedReports.map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        {getTypeIcon(report.type)}
                        <div>
                          <h4 className="font-medium">{report.name}</h4>
                          <p className="text-sm text-gray-600">
                            Generated on {format(new Date(report.generatedAt), 'dd/MM/yyyy HH:mm')} by {report.generatedBy}
                          </p>
                        </div>
                        {getStatusBadge(report.status)}
                      </div>
                      <div className="flex items-center gap-2">
                        {report.status === 'completed' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              data-testid={`button-view-${report.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              data-testid={`button-download-${report.id}`}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          data-testid={`button-delete-${report.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No reports generated yet</h3>
                    <p className="text-gray-600">Generate your first report using the templates above.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generate Report Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Report: {selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
              
              {selectedTemplate.parameters.map((param) => (
                <div key={param.name}>
                  <Label className="text-sm font-medium">
                    {param.label}
                    {param.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  
                  {param.type === 'date' && (
                    <Input
                      type="date"
                      value={reportParameters[param.name] || ''}
                      onChange={(e) => handleParameterChange(param.name, e.target.value)}
                      data-testid={`input-${param.name}`}
                    />
                  )}
                  
                  {param.type === 'select' && param.options && (
                    <Select
                      value={reportParameters[param.name] || ''}
                      onValueChange={(value) => handleParameterChange(param.name, value)}
                    >
                      <SelectTrigger data-testid={`select-${param.name}`}>
                        <SelectValue placeholder={`Select ${param.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {param.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {param.type === 'text' && (
                    <Input
                      value={reportParameters[param.name] || ''}
                      onChange={(e) => handleParameterChange(param.name, e.target.value)}
                      placeholder={param.label}
                      data-testid={`input-${param.name}`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowGenerateDialog(false)}
              data-testid="button-cancel-generate"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateReport}
              disabled={generateReportMutation.isPending}
              data-testid="button-confirm-generate"
            >
              {generateReportMutation.isPending ? 'Generating...' : 'Generate Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}