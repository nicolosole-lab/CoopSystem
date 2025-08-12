import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Bot, 
  Play, 
  Pause, 
  Settings, 
  Zap,
  Clock,
  Users,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Plus,
  Eye,
  Edit,
  Wrench
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useLocation } from 'wouter';

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  triggers: Array<{
    id: string;
    name: string;
    type: string;
    isActive: boolean;
  }>;
  actions: Array<{
    id: string;
    type: string;
    order: number;
  }>;
  createdAt: string;
  executionCount: number;
  lastExecution?: string;
}

interface AutomationMetrics {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successRate: number;
  automationSavings: {
    timeHours: number;
    tasksAutomated: number;
    errorReduction: number;
  };
  recentExecutions: Array<{
    id: string;
    workflowName: string;
    status: 'completed' | 'failed' | 'running';
    startedAt: string;
    completedAt?: string;
    duration?: number;
  }>;
}

interface SchedulingMetrics {
  scheduledAppointments: number;
  autoAssignments: number;
  conflictsResolved: number;
  optimizationScore: number;
  travelTimeSaved: number;
}

export default function AutomationDashboard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { canRead, canCreate, canUpdate } = usePermissions();
  const [, setLocation] = useLocation();
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    triggerType: 'event',
    actionType: 'notification'
  });

  // Fetch automation data
  const { data: workflows = [], refetch: refetchWorkflows } = useQuery<WorkflowDefinition[]>({
    queryKey: ["/api/automation/workflows"],
    enabled: canRead(),
    // Mock data for demonstration
    initialData: [
      {
        id: '1',
        name: 'Appointment Reminder Automation',
        description: 'Automatically send reminders 24 hours before appointments',
        isActive: true,
        triggers: [{ id: 't1', name: 'Appointment Created', type: 'event', isActive: true }],
        actions: [{ id: 'a1', type: 'notification', order: 1 }],
        createdAt: '2024-12-01T10:00:00Z',
        executionCount: 245,
        lastExecution: '2024-12-15T14:30:00Z'
      },
      {
        id: '2',
        name: 'Service Completion Workflow',
        description: 'Process service completion and update client records',
        isActive: true,
        triggers: [{ id: 't2', name: 'Service Completed', type: 'event', isActive: true }],
        actions: [
          { id: 'a2', type: 'data_update', order: 1 },
          { id: 'a3', type: 'notification', order: 2 }
        ],
        createdAt: '2024-12-01T10:00:00Z',
        executionCount: 189,
        lastExecution: '2024-12-15T16:45:00Z'
      },
      {
        id: '3',
        name: 'Budget Alert System',
        description: 'Alert managers when client budgets exceed thresholds',
        isActive: false,
        triggers: [{ id: 't3', name: 'Budget Threshold', type: 'condition', isActive: true }],
        actions: [{ id: 'a4', type: 'notification', order: 1 }],
        createdAt: '2024-12-05T15:20:00Z',
        executionCount: 12,
        lastExecution: '2024-12-14T09:15:00Z'
      }
    ]
  });

  const { data: metrics } = useQuery<AutomationMetrics>({
    queryKey: ["/api/automation/metrics"],
    enabled: canRead(),
    // Mock data for demonstration
    initialData: {
      totalWorkflows: 3,
      activeWorkflows: 2,
      totalExecutions: 446,
      successRate: 97.3,
      automationSavings: {
        timeHours: 68.5,
        tasksAutomated: 446,
        errorReduction: 23.1
      },
      recentExecutions: [
        {
          id: 'exec_1',
          workflowName: 'Service Completion Workflow',
          status: 'completed',
          startedAt: '2024-12-15T16:45:00Z',
          completedAt: '2024-12-15T16:45:30Z',
          duration: 30
        },
        {
          id: 'exec_2',
          workflowName: 'Appointment Reminder Automation',
          status: 'completed',
          startedAt: '2024-12-15T14:30:00Z',
          completedAt: '2024-12-15T14:30:15Z',
          duration: 15
        },
        {
          id: 'exec_3',
          workflowName: 'Budget Alert System',
          status: 'failed',
          startedAt: '2024-12-15T09:15:00Z',
          completedAt: '2024-12-15T09:15:45Z',
          duration: 45
        }
      ]
    }
  });

  const { data: schedulingMetrics } = useQuery<SchedulingMetrics>({
    queryKey: ["/api/automation/scheduling-metrics"],
    enabled: canRead(),
    // Mock data for demonstration
    initialData: {
      scheduledAppointments: 156,
      autoAssignments: 89,
      conflictsResolved: 12,
      optimizationScore: 8.7,
      travelTimeSaved: 45.2
    }
  });

  // Toggle workflow active status
  const toggleWorkflowMutation = useMutation({
    mutationFn: async (data: { workflowId: string; isActive: boolean }) => {
      return await apiRequest('PUT', `/api/automation/workflows/${data.workflowId}`, {
        isActive: data.isActive
      });
    },
    onSuccess: () => {
      toast({
        title: "Workflow Updated",
        description: "Workflow status has been updated successfully."
      });
      refetchWorkflows();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update workflow",
        variant: "destructive"
      });
    }
  });

  // Create new workflow
  const createWorkflowMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/automation/workflows', data);
    },
    onSuccess: () => {
      toast({
        title: "Workflow Created",
        description: "New automation workflow has been created successfully."
      });
      setShowCreateDialog(false);
      setNewWorkflow({ name: '', description: '', triggerType: 'event', actionType: 'notification' });
      refetchWorkflows();
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create workflow",
        variant: "destructive"
      });
    }
  });

  // Initialize healthcare workflow templates
  const initializeTemplatesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/automation/initialize-templates', {});
    },
    onSuccess: (data) => {
      toast({
        title: "Templates Initialized",
        description: `Successfully initialized ${data.count} healthcare workflow templates.`
      });
      refetchWorkflows();
    },
    onError: (error: any) => {
      toast({
        title: "Initialization Failed",
        description: error.message || "Failed to initialize workflow templates",
        variant: "destructive"
      });
    }
  });

  // Execute scheduling optimization
  const optimizeScheduleMutation = useMutation({
    mutationFn: async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      return await apiRequest('POST', '/api/automation/optimize-schedule', {
        startDate: today.toISOString(),
        endDate: tomorrow.toISOString()
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Schedule Optimized",
        description: `Optimized ${data.scheduled || 0} appointments successfully.`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Optimization Failed",
        description: error.message || "Failed to optimize schedule",
        variant: "destructive"
      });
    }
  });

  const handleToggleWorkflow = (workflowId: string, currentStatus: boolean) => {
    toggleWorkflowMutation.mutate({
      workflowId,
      isActive: !currentStatus
    });
  };

  const handleCreateWorkflow = () => {
    if (!newWorkflow.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Workflow name is required",
        variant: "destructive"
      });
      return;
    }

    createWorkflowMutation.mutate({
      name: newWorkflow.name,
      description: newWorkflow.description,
      triggers: [
        {
          name: `${newWorkflow.name} Trigger`,
          type: newWorkflow.triggerType,
          config: {},
          isActive: true
        }
      ],
      actions: [
        {
          type: newWorkflow.actionType,
          config: {},
          order: 1
        }
      ],
      isActive: true
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800">Running</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (!canRead()) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to view automation dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Automation Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage workflows and process automation</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setLocation('/workflow-builder')}
            data-testid="button-workflow-builder"
          >
            <Wrench className="h-4 w-4 mr-2" />
            Workflow Builder
          </Button>
          <Button
            onClick={() => optimizeScheduleMutation.mutate()}
            disabled={optimizeScheduleMutation.isPending}
            data-testid="button-optimize-schedule"
          >
            <Zap className="h-4 w-4 mr-2" />
            {optimizeScheduleMutation.isPending ? 'Optimizing...' : 'Optimize Schedule'}
          </Button>
          {canCreate() && (
            <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-workflow">
              <Plus className="h-4 w-4 mr-2" />
              New Workflow
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Workflows</p>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics?.activeWorkflows}/{metrics?.totalWorkflows}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Bot className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-3xl font-bold text-gray-900">{metrics?.successRate}%</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Time Saved</p>
                <p className="text-3xl font-bold text-gray-900">{metrics?.automationSavings.timeHours}h</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tasks Automated</p>
                <p className="text-3xl font-bold text-gray-900">{metrics?.automationSavings.tasksAutomated}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="workflows" className="space-y-6">
        <TabsList>
          <TabsTrigger value="workflows" data-testid="tab-workflows">Workflows</TabsTrigger>
          <TabsTrigger value="scheduling" data-testid="tab-scheduling">Smart Scheduling</TabsTrigger>
          <TabsTrigger value="executions" data-testid="tab-executions">Recent Executions</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-6">
          {/* Workflow Management */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {workflows.map((workflow) => (
              <Card key={workflow.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{workflow.name}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={workflow.isActive}
                        onCheckedChange={(checked) => handleToggleWorkflow(workflow.id, workflow.isActive)}
                        disabled={!canUpdate()}
                        data-testid={`switch-workflow-${workflow.id}`}
                      />
                      {workflow.isActive && (
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Triggers:</span>
                      <span className="font-medium">{workflow.triggers.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Actions:</span>
                      <span className="font-medium">{workflow.actions.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Executions:</span>
                      <span className="font-medium">{workflow.executionCount}</span>
                    </div>
                    {workflow.lastExecution && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Last Run:</span>
                        <span className="font-medium">
                          {format(new Date(workflow.lastExecution), 'dd/MM HH:mm')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedWorkflow(workflow)}
                      data-testid={`button-view-workflow-${workflow.id}`}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {canUpdate() && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        data-testid={`button-edit-workflow-${workflow.id}`}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scheduling" className="space-y-6">
          {/* Smart Scheduling */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Auto Scheduled</p>
                    <p className="text-2xl font-bold text-gray-900">{schedulingMetrics?.scheduledAppointments}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Auto Assignments</p>
                    <p className="text-2xl font-bold text-gray-900">{schedulingMetrics?.autoAssignments}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Conflicts Resolved</p>
                    <p className="text-2xl font-bold text-gray-900">{schedulingMetrics?.conflictsResolved}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Optimization Score</p>
                    <p className="text-2xl font-bold text-gray-900">{schedulingMetrics?.optimizationScore}/10</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Healthcare Workflow Templates</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => initializeTemplatesMutation.mutate()}
                disabled={initializeTemplatesMutation.isPending}
                data-testid="button-initialize-templates"
              >
                {initializeTemplatesMutation.isPending ? 'Initializing...' : 'Initialize Templates'}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Available Templates</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Appointment Reminder Automation</li>
                    <li>• Service Completion Workflow</li>
                    <li>• Budget Threshold Alert System</li>
                    <li>• Client Communication Automation</li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold">Smart Features</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Multi-channel notifications (Email, SMS)</li>
                    <li>• Automatic data updates</li>
                    <li>• Approval workflow automation</li>
                    <li>• Real-time condition monitoring</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scheduling Automation Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Smart Assignment</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Automatic staff assignment based on skills and availability</li>
                    <li>• Optimal route planning for home visits</li>
                    <li>• Load balancing across service teams</li>
                    <li>• Real-time conflict detection and resolution</li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold">Optimization Features</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Travel time minimization</li>
                    <li>• Resource utilization optimization</li>
                    <li>• Client preference consideration</li>
                    <li>• Automated recurring appointments</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="executions" className="space-y-6">
          {/* Recent Executions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Workflow Executions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics?.recentExecutions.map((execution) => (
                  <div key={execution.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(execution.status)}
                      <div>
                        <h4 className="font-medium">{execution.workflowName}</h4>
                        <p className="text-sm text-gray-600">
                          Started: {format(new Date(execution.startedAt), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {execution.duration && (
                        <span className="text-sm text-gray-600">{execution.duration}s</span>
                      )}
                      {getStatusBadge(execution.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Workflow Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="workflow-name">Workflow Name</Label>
              <Input
                id="workflow-name"
                value={newWorkflow.name}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                placeholder="Enter workflow name"
                data-testid="input-workflow-name"
              />
            </div>
            <div>
              <Label htmlFor="workflow-description">Description</Label>
              <Input
                id="workflow-description"
                value={newWorkflow.description}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                placeholder="Enter workflow description"
                data-testid="input-workflow-description"
              />
            </div>
            <div>
              <Label>Trigger Type</Label>
              <Select value={newWorkflow.triggerType} onValueChange={(value) => setNewWorkflow({ ...newWorkflow, triggerType: value })}>
                <SelectTrigger data-testid="select-trigger-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">Event Trigger</SelectItem>
                  <SelectItem value="schedule">Schedule Trigger</SelectItem>
                  <SelectItem value="condition">Condition Trigger</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Action Type</Label>
              <Select value={newWorkflow.actionType} onValueChange={(value) => setNewWorkflow({ ...newWorkflow, actionType: value })}>
                <SelectTrigger data-testid="select-action-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="notification">Send Notification</SelectItem>
                  <SelectItem value="api_call">API Call</SelectItem>
                  <SelectItem value="data_update">Update Data</SelectItem>
                  <SelectItem value="approval_request">Request Approval</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
              data-testid="button-cancel-workflow"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateWorkflow}
              disabled={createWorkflowMutation.isPending}
              data-testid="button-create-workflow-confirm"
            >
              {createWorkflowMutation.isPending ? 'Creating...' : 'Create Workflow'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}