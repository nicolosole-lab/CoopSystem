import { storage } from './storage';

export interface WorkflowTrigger {
  id: string;
  name: string;
  type: 'event' | 'schedule' | 'condition';
  config: Record<string, any>;
  isActive: boolean;
}

export interface WorkflowAction {
  id: string;
  type: 'notification' | 'api_call' | 'data_update' | 'approval_request';
  config: Record<string, any>;
  order: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  triggers: WorkflowTrigger[];
  actions: WorkflowAction[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  triggeredBy: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  context: Record<string, any>;
  logs: WorkflowLog[];
}

export interface WorkflowLog {
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
  data?: Record<string, any>;
}

class WorkflowEngine {
  private activeWorkflows: Map<string, WorkflowDefinition> = new Map();
  private executionQueue: WorkflowExecution[] = [];
  private isProcessing = false;

  constructor() {
    this.startProcessing();
  }

  /**
   * Register a new workflow definition
   */
  async registerWorkflow(workflow: Omit<WorkflowDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkflowDefinition> {
    const newWorkflow: WorkflowDefinition = {
      ...workflow,
      id: `workflow_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.activeWorkflows.set(newWorkflow.id, newWorkflow);
    
    // In a real implementation, persist to database
    console.log(`Workflow registered: ${newWorkflow.name} (${newWorkflow.id})`);
    
    return newWorkflow;
  }

  /**
   * Trigger workflow execution based on event
   */
  async triggerWorkflow(eventType: string, eventData: Record<string, any>, userId: string): Promise<void> {
    for (const [workflowId, workflow] of this.activeWorkflows) {
      if (!workflow.isActive) continue;

      const matchingTriggers = workflow.triggers.filter(trigger => 
        trigger.isActive && this.evaluateTrigger(trigger, eventType, eventData)
      );

      if (matchingTriggers.length > 0) {
        const execution: WorkflowExecution = {
          id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          workflowId,
          triggeredBy: userId,
          status: 'running',
          startedAt: new Date(),
          context: {
            eventType,
            eventData,
            triggers: matchingTriggers.map(t => t.id)
          },
          logs: []
        };

        this.executionQueue.push(execution);
        console.log(`Workflow execution queued: ${workflow.name} (${execution.id})`);
      }
    }
  }

  /**
   * Execute workflow actions
   */
  private async executeWorkflow(execution: WorkflowExecution): Promise<void> {
    const workflow = this.activeWorkflows.get(execution.workflowId);
    if (!workflow) {
      execution.status = 'failed';
      execution.logs.push({
        timestamp: new Date(),
        level: 'error',
        message: 'Workflow definition not found'
      });
      return;
    }

    execution.logs.push({
      timestamp: new Date(),
      level: 'info',
      message: `Starting workflow execution: ${workflow.name}`
    });

    try {
      // Sort actions by order
      const sortedActions = workflow.actions.sort((a, b) => a.order - b.order);

      for (const action of sortedActions) {
        await this.executeAction(action, execution);
      }

      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.logs.push({
        timestamp: new Date(),
        level: 'info',
        message: 'Workflow execution completed successfully'
      });

    } catch (error) {
      execution.status = 'failed';
      execution.logs.push({
        timestamp: new Date(),
        level: 'error',
        message: `Workflow execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: { error: error instanceof Error ? error.stack : error }
      });
    }
  }

  /**
   * Execute individual workflow action
   */
  private async executeAction(action: WorkflowAction, execution: WorkflowExecution): Promise<void> {
    execution.logs.push({
      timestamp: new Date(),
      level: 'info',
      message: `Executing action: ${action.type}`,
      data: { actionId: action.id }
    });

    switch (action.type) {
      case 'notification':
        await this.executeNotificationAction(action, execution);
        break;
      
      case 'api_call':
        await this.executeApiCallAction(action, execution);
        break;
      
      case 'data_update':
        await this.executeDataUpdateAction(action, execution);
        break;
      
      case 'approval_request':
        await this.executeApprovalRequestAction(action, execution);
        break;
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Execute notification action
   */
  private async executeNotificationAction(action: WorkflowAction, execution: WorkflowExecution): Promise<void> {
    const { recipient, message, channel } = action.config;
    
    // In a real implementation, integrate with notification service
    console.log(`Sending ${channel} notification to ${recipient}: ${message}`);
    
    execution.logs.push({
      timestamp: new Date(),
      level: 'info',
      message: `Notification sent via ${channel} to ${recipient}`
    });
  }

  /**
   * Execute API call action
   */
  private async executeApiCallAction(action: WorkflowAction, execution: WorkflowExecution): Promise<void> {
    const { url, method, headers, body } = action.config;
    
    // In a real implementation, make actual HTTP request
    console.log(`Making ${method} request to ${url}`);
    
    execution.logs.push({
      timestamp: new Date(),
      level: 'info',
      message: `API call completed: ${method} ${url}`
    });
  }

  /**
   * Execute data update action
   */
  private async executeDataUpdateAction(action: WorkflowAction, execution: WorkflowExecution): Promise<void> {
    const { entity, entityId, updates } = action.config;
    
    // In a real implementation, update database
    console.log(`Updating ${entity} ${entityId}:`, updates);
    
    execution.logs.push({
      timestamp: new Date(),
      level: 'info',
      message: `Data updated: ${entity} ${entityId}`
    });
  }

  /**
   * Execute approval request action
   */
  private async executeApprovalRequestAction(action: WorkflowAction, execution: WorkflowExecution): Promise<void> {
    const { approvers, subject, details } = action.config;
    
    // In a real implementation, create approval request
    console.log(`Creating approval request for: ${subject}`);
    
    execution.logs.push({
      timestamp: new Date(),
      level: 'info',
      message: `Approval request created: ${subject}`
    });
  }

  /**
   * Evaluate if trigger conditions are met
   */
  private evaluateTrigger(trigger: WorkflowTrigger, eventType: string, eventData: Record<string, any>): boolean {
    switch (trigger.type) {
      case 'event':
        return trigger.config.eventType === eventType;
      
      case 'condition':
        return this.evaluateCondition(trigger.config.condition, eventData);
      
      case 'schedule':
        // Schedule triggers are handled separately by cron jobs
        return false;
      
      default:
        return false;
    }
  }

  /**
   * Evaluate condition expressions
   */
  private evaluateCondition(condition: string, data: Record<string, any>): boolean {
    // Simple condition evaluation - in a real implementation, use a proper expression engine
    try {
      // Replace placeholders with actual values
      let evaluatedCondition = condition;
      for (const [key, value] of Object.entries(data)) {
        evaluatedCondition = evaluatedCondition.replace(
          new RegExp(`\\{${key}\\}`, 'g'), 
          JSON.stringify(value)
        );
      }
      
      // Evaluate simple conditions (unsafe - use proper expression engine in production)
      return eval(evaluatedCondition);
    } catch (error) {
      console.error('Condition evaluation error:', error);
      return false;
    }
  }

  /**
   * Start workflow processing loop
   */
  private startProcessing(): void {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.processQueue();
  }

  /**
   * Process workflow execution queue
   */
  private async processQueue(): Promise<void> {
    while (this.executionQueue.length > 0) {
      const execution = this.executionQueue.shift();
      if (execution) {
        await this.executeWorkflow(execution);
        console.log(`Workflow execution completed: ${execution.id} (${execution.status})`);
      }
    }
    
    // Continue processing after delay
    setTimeout(() => this.processQueue(), 1000);
  }

  /**
   * Get workflow execution history
   */
  getExecutionHistory(workflowId?: string): WorkflowExecution[] {
    // In a real implementation, fetch from database
    return [];
  }

  /**
   * Get active workflows
   */
  getActiveWorkflows(): WorkflowDefinition[] {
    return Array.from(this.activeWorkflows.values());
  }

  /**
   * Update workflow definition
   */
  async updateWorkflow(workflowId: string, updates: Partial<WorkflowDefinition>): Promise<WorkflowDefinition | null> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return null;

    const updatedWorkflow = {
      ...workflow,
      ...updates,
      updatedAt: new Date()
    };

    this.activeWorkflows.set(workflowId, updatedWorkflow);
    return updatedWorkflow;
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(workflowId: string): Promise<boolean> {
    return this.activeWorkflows.delete(workflowId);
  }
}

// Export singleton instance
export const workflowEngine = new WorkflowEngine();

// Predefined workflow templates for healthcare automation
export const healthcareWorkflowTemplates = {
  // Automated appointment reminder workflow
  appointmentReminder: {
    name: 'Appointment Reminder Automation',
    description: 'Automatically send reminders for upcoming appointments',
    triggers: [
      {
        id: 'trigger_1',
        name: 'Appointment Created',
        type: 'event' as const,
        config: { eventType: 'appointment_created' },
        isActive: true
      }
    ],
    actions: [
      {
        id: 'action_1',
        type: 'notification' as const,
        config: {
          recipient: '{appointment.clientEmail}',
          message: 'Your appointment is scheduled for {appointment.startDateTime}',
          channel: 'email'
        },
        order: 1
      }
    ],
    isActive: true
  },

  // Service completion workflow
  serviceCompletion: {
    name: 'Service Completion Automation',
    description: 'Automatically process service completion tasks',
    triggers: [
      {
        id: 'trigger_2',
        name: 'Service Completed',
        type: 'event' as const,
        config: { eventType: 'service_completed' },
        isActive: true
      }
    ],
    actions: [
      {
        id: 'action_2',
        type: 'data_update' as const,
        config: {
          entity: 'appointment',
          entityId: '{appointment.id}',
          updates: { status: 'completed' }
        },
        order: 1
      },
      {
        id: 'action_3',
        type: 'notification' as const,
        config: {
          recipient: '{appointment.clientEmail}',
          message: 'Your service has been completed. Thank you!',
          channel: 'email'
        },
        order: 2
      }
    ],
    isActive: true
  },

  // Budget threshold alert workflow
  budgetAlert: {
    name: 'Budget Threshold Alert',
    description: 'Alert when client budget usage exceeds threshold',
    triggers: [
      {
        id: 'trigger_3',
        name: 'Budget Threshold Exceeded',
        type: 'condition' as const,
        config: { 
          condition: '{budgetUsage} > {budgetLimit} * 0.8' 
        },
        isActive: true
      }
    ],
    actions: [
      {
        id: 'action_4',
        type: 'notification' as const,
        config: {
          recipient: 'manager@healthcare.com',
          message: 'Client {client.name} has exceeded 80% of budget allocation',
          channel: 'email'
        },
        order: 1
      }
    ],
    isActive: true
  }
};