import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  ArrowRight, 
  Settings, 
  Play,
  Save,
  Zap,
  Bell,
  Globe,
  Database,
  CheckCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

interface WorkflowTrigger {
  id: string;
  name: string;
  type: 'event' | 'schedule' | 'condition';
  config: Record<string, any>;
  isActive: boolean;
}

interface WorkflowAction {
  id: string;
  type: 'notification' | 'api_call' | 'data_update' | 'approval_request';
  config: Record<string, any>;
  order: number;
}

interface WorkflowDefinition {
  id?: string;
  name: string;
  description: string;
  triggers: WorkflowTrigger[];
  actions: WorkflowAction[];
  isActive: boolean;
}

export default function WorkflowBuilder() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [workflow, setWorkflow] = useState<WorkflowDefinition>({
    name: '',
    description: '',
    triggers: [],
    actions: [],
    isActive: true
  });
  const [selectedTrigger, setSelectedTrigger] = useState<WorkflowTrigger | null>(null);
  const [selectedAction, setSelectedAction] = useState<WorkflowAction | null>(null);

  const triggerTypes = [
    { value: 'event', label: 'Event Trigger', icon: Zap },
    { value: 'schedule', label: 'Schedule Trigger', icon: Settings },
    { value: 'condition', label: 'Condition Trigger', icon: CheckCircle }
  ];

  const actionTypes = [
    { value: 'notification', label: 'Send Notification', icon: Bell },
    { value: 'api_call', label: 'API Call', icon: Globe },
    { value: 'data_update', label: 'Update Data', icon: Database },
    { value: 'approval_request', label: 'Request Approval', icon: CheckCircle }
  ];

  const eventTypes = [
    'appointment_created',
    'appointment_updated',
    'appointment_cancelled',
    'service_completed',
    'client_created',
    'staff_assigned',
    'budget_threshold_exceeded',
    'document_uploaded',
    'compliance_check_failed'
  ];

  const addTrigger = () => {
    const newTrigger: WorkflowTrigger = {
      id: `trigger_${Date.now()}`,
      name: 'New Trigger',
      type: 'event',
      config: {},
      isActive: true
    };
    setWorkflow(prev => ({
      ...prev,
      triggers: [...prev.triggers, newTrigger]
    }));
    setSelectedTrigger(newTrigger);
  };

  const addAction = () => {
    const newAction: WorkflowAction = {
      id: `action_${Date.now()}`,
      type: 'notification',
      config: {},
      order: workflow.actions.length + 1
    };
    setWorkflow(prev => ({
      ...prev,
      actions: [...prev.actions, newAction]
    }));
    setSelectedAction(newAction);
  };

  const updateTrigger = (triggerId: string, updates: Partial<WorkflowTrigger>) => {
    setWorkflow(prev => ({
      ...prev,
      triggers: prev.triggers.map(trigger =>
        trigger.id === triggerId ? { ...trigger, ...updates } : trigger
      )
    }));
    if (selectedTrigger?.id === triggerId) {
      setSelectedTrigger(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const updateAction = (actionId: string, updates: Partial<WorkflowAction>) => {
    setWorkflow(prev => ({
      ...prev,
      actions: prev.actions.map(action =>
        action.id === actionId ? { ...action, ...updates } : action
      )
    }));
    if (selectedAction?.id === actionId) {
      setSelectedAction(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteTrigger = (triggerId: string) => {
    setWorkflow(prev => ({
      ...prev,
      triggers: prev.triggers.filter(t => t.id !== triggerId)
    }));
    if (selectedTrigger?.id === triggerId) {
      setSelectedTrigger(null);
    }
  };

  const deleteAction = (actionId: string) => {
    setWorkflow(prev => ({
      ...prev,
      actions: prev.actions.filter(a => a.id !== actionId).map((action, index) => ({
        ...action,
        order: index + 1
      }))
    }));
    if (selectedAction?.id === actionId) {
      setSelectedAction(null);
    }
  };

  const saveWorkflow = async () => {
    if (!workflow.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Workflow name is required",
        variant: "destructive"
      });
      return;
    }

    if (workflow.triggers.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one trigger is required",
        variant: "destructive"
      });
      return;
    }

    if (workflow.actions.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one action is required",
        variant: "destructive"
      });
      return;
    }

    try {
      // In a real implementation, save to API
      console.log('Saving workflow:', workflow);
      
      toast({
        title: "Workflow Saved",
        description: "Your workflow has been saved successfully."
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save workflow",
        variant: "destructive"
      });
    }
  };

  const testWorkflow = async () => {
    try {
      // In a real implementation, trigger a test execution
      console.log('Testing workflow:', workflow);
      
      toast({
        title: "Test Started",
        description: "Workflow test execution initiated."
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Failed to test workflow",
        variant: "destructive"
      });
    }
  };

  const renderTriggerConfig = (trigger: WorkflowTrigger) => {
    switch (trigger.type) {
      case 'event':
        return (
          <div className="space-y-4">
            <div>
              <Label>Event Type</Label>
              <Select
                value={trigger.config.eventType || ''}
                onValueChange={(value) => updateTrigger(trigger.id, {
                  config: { ...trigger.config, eventType: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      
      case 'schedule':
        return (
          <div className="space-y-4">
            <div>
              <Label>Cron Expression</Label>
              <Input
                value={trigger.config.cronExpression || ''}
                onChange={(e) => updateTrigger(trigger.id, {
                  config: { ...trigger.config, cronExpression: e.target.value }
                })}
                placeholder="0 9 * * 1-5"
              />
            </div>
          </div>
        );
      
      case 'condition':
        return (
          <div className="space-y-4">
            <div>
              <Label>Condition Expression</Label>
              <Textarea
                value={trigger.config.condition || ''}
                onChange={(e) => updateTrigger(trigger.id, {
                  config: { ...trigger.config, condition: e.target.value }
                })}
                placeholder="{budgetUsage} > {budgetLimit} * 0.8"
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const renderActionConfig = (action: WorkflowAction) => {
    switch (action.type) {
      case 'notification':
        return (
          <div className="space-y-4">
            <div>
              <Label>Recipient</Label>
              <Input
                value={action.config.recipient || ''}
                onChange={(e) => updateAction(action.id, {
                  config: { ...action.config, recipient: e.target.value }
                })}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={action.config.message || ''}
                onChange={(e) => updateAction(action.id, {
                  config: { ...action.config, message: e.target.value }
                })}
                placeholder="Your appointment is scheduled for {appointment.startDateTime}"
              />
            </div>
            <div>
              <Label>Channel</Label>
              <Select
                value={action.config.channel || 'email'}
                onValueChange={(value) => updateAction(action.id, {
                  config: { ...action.config, channel: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="push">Push Notification</SelectItem>
                  <SelectItem value="in_app">In-App Notification</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      
      case 'api_call':
        return (
          <div className="space-y-4">
            <div>
              <Label>URL</Label>
              <Input
                value={action.config.url || ''}
                onChange={(e) => updateAction(action.id, {
                  config: { ...action.config, url: e.target.value }
                })}
                placeholder="https://api.example.com/webhook"
              />
            </div>
            <div>
              <Label>Method</Label>
              <Select
                value={action.config.method || 'POST'}
                onValueChange={(value) => updateAction(action.id, {
                  config: { ...action.config, method: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Headers (JSON)</Label>
              <Textarea
                value={action.config.headers ? JSON.stringify(action.config.headers, null, 2) : '{}'}
                onChange={(e) => {
                  try {
                    const headers = JSON.parse(e.target.value);
                    updateAction(action.id, {
                      config: { ...action.config, headers }
                    });
                  } catch (error) {
                    // Invalid JSON, don't update
                  }
                }}
                placeholder='{"Authorization": "Bearer token"}'
              />
            </div>
          </div>
        );
      
      case 'data_update':
        return (
          <div className="space-y-4">
            <div>
              <Label>Entity Type</Label>
              <Select
                value={action.config.entity || ''}
                onValueChange={(value) => updateAction(action.id, {
                  config: { ...action.config, entity: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appointment">Appointment</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="time_log">Time Log</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Entity ID</Label>
              <Input
                value={action.config.entityId || ''}
                onChange={(e) => updateAction(action.id, {
                  config: { ...action.config, entityId: e.target.value }
                })}
                placeholder="{appointment.id}"
              />
            </div>
            <div>
              <Label>Updates (JSON)</Label>
              <Textarea
                value={action.config.updates ? JSON.stringify(action.config.updates, null, 2) : '{}'}
                onChange={(e) => {
                  try {
                    const updates = JSON.parse(e.target.value);
                    updateAction(action.id, {
                      config: { ...action.config, updates }
                    });
                  } catch (error) {
                    // Invalid JSON, don't update
                  }
                }}
                placeholder='{"status": "completed"}'
              />
            </div>
          </div>
        );
      
      case 'approval_request':
        return (
          <div className="space-y-4">
            <div>
              <Label>Approvers</Label>
              <Input
                value={action.config.approvers || ''}
                onChange={(e) => updateAction(action.id, {
                  config: { ...action.config, approvers: e.target.value }
                })}
                placeholder="manager@example.com,admin@example.com"
              />
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                value={action.config.subject || ''}
                onChange={(e) => updateAction(action.id, {
                  config: { ...action.config, subject: e.target.value }
                })}
                placeholder="Approval Required: Budget Change"
              />
            </div>
            <div>
              <Label>Details</Label>
              <Textarea
                value={action.config.details || ''}
                onChange={(e) => updateAction(action.id, {
                  config: { ...action.config, details: e.target.value }
                })}
                placeholder="Please approve the budget change for client {client.name}"
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workflow Builder</h1>
          <p className="text-gray-600 mt-1">Create and configure automation workflows</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={testWorkflow} data-testid="button-test-workflow">
            <Play className="h-4 w-4 mr-2" />
            Test
          </Button>
          <Button onClick={saveWorkflow} data-testid="button-save-workflow">
            <Save className="h-4 w-4 mr-2" />
            Save Workflow
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Main Canvas */}
        <div className="col-span-8 space-y-6">
          {/* Workflow Info */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="workflow-name">Workflow Name</Label>
                <Input
                  id="workflow-name"
                  value={workflow.name}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter workflow name"
                  data-testid="input-workflow-name"
                />
              </div>
              <div>
                <Label htmlFor="workflow-description">Description</Label>
                <Textarea
                  id="workflow-description"
                  value={workflow.description}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this workflow does"
                  data-testid="textarea-workflow-description"
                />
              </div>
            </CardContent>
          </Card>

          {/* Triggers */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Triggers</CardTitle>
              <Button size="sm" onClick={addTrigger} data-testid="button-add-trigger">
                <Plus className="h-4 w-4 mr-2" />
                Add Trigger
              </Button>
            </CardHeader>
            <CardContent>
              {workflow.triggers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No triggers configured. Add a trigger to get started.</p>
              ) : (
                <div className="space-y-4">
                  {workflow.triggers.map((trigger) => (
                    <div
                      key={trigger.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedTrigger?.id === trigger.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedTrigger(trigger)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <Zap className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">{trigger.name}</h4>
                            <p className="text-sm text-gray-600 capitalize">{trigger.type} trigger</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={trigger.isActive ? "default" : "secondary"}>
                            {trigger.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTrigger(trigger.id);
                            }}
                            data-testid={`button-delete-trigger-${trigger.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Actions</CardTitle>
              <Button size="sm" onClick={addAction} data-testid="button-add-action">
                <Plus className="h-4 w-4 mr-2" />
                Add Action
              </Button>
            </CardHeader>
            <CardContent>
              {workflow.actions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No actions configured. Add an action to define what happens.</p>
              ) : (
                <div className="space-y-4">
                  {workflow.actions.map((action, index) => (
                    <div key={action.id} className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{index + 1}</span>
                        {index < workflow.actions.length - 1 && <ArrowRight className="h-4 w-4" />}
                      </div>
                      <div
                        className={`flex-1 p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedAction?.id === action.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedAction(action)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-full">
                              <Bell className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <h4 className="font-medium capitalize">{action.type.replace('_', ' ')}</h4>
                              <p className="text-sm text-gray-600">Order: {action.order}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteAction(action.id);
                            }}
                            data-testid={`button-delete-action-${action.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Configuration Panel */}
        <div className="col-span-4">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>
                {selectedTrigger ? 'Configure Trigger' : selectedAction ? 'Configure Action' : 'Configuration'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTrigger && (
                <div className="space-y-4">
                  <div>
                    <Label>Trigger Name</Label>
                    <Input
                      value={selectedTrigger.name}
                      onChange={(e) => updateTrigger(selectedTrigger.id, { name: e.target.value })}
                      data-testid="input-trigger-name"
                    />
                  </div>
                  <div>
                    <Label>Trigger Type</Label>
                    <Select
                      value={selectedTrigger.type}
                      onValueChange={(value: any) => updateTrigger(selectedTrigger.id, { type: value })}
                    >
                      <SelectTrigger data-testid="select-trigger-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {triggerTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {renderTriggerConfig(selectedTrigger)}
                </div>
              )}

              {selectedAction && (
                <div className="space-y-4">
                  <div>
                    <Label>Action Type</Label>
                    <Select
                      value={selectedAction.type}
                      onValueChange={(value: any) => updateAction(selectedAction.id, { type: value })}
                    >
                      <SelectTrigger data-testid="select-action-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {actionTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {renderActionConfig(selectedAction)}
                </div>
              )}

              {!selectedTrigger && !selectedAction && (
                <div className="text-center text-gray-500 py-8">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Select a trigger or action to configure</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}