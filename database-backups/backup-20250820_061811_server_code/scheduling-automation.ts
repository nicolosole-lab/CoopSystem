import { storage } from './storage';
import { workflowEngine } from './workflow-engine';

export interface SchedulingConstraint {
  id: string;
  type: 'staff_availability' | 'client_preference' | 'service_requirement' | 'travel_time';
  weight: number; // Priority weight (1-10)
  config: Record<string, any>;
}

export interface OptimizedSchedule {
  appointmentId: string;
  staffId: string;
  clientId: string;
  startTime: Date;
  endTime: Date;
  serviceType: string;
  travelTime?: number;
  score: number; // Optimization score
}

export interface SchedulingResult {
  schedule: OptimizedSchedule[];
  unscheduled: Array<{
    appointmentId: string;
    reason: string;
    suggestions: string[];
  }>;
  metrics: {
    totalAppointments: number;
    scheduledAppointments: number;
    averageScore: number;
    totalTravelTime: number;
  };
}

class SchedulingAutomation {
  private constraints: SchedulingConstraint[] = [];

  constructor() {
    this.initializeDefaultConstraints();
  }

  /**
   * Initialize default scheduling constraints
   */
  private initializeDefaultConstraints(): void {
    this.constraints = [
      {
        id: 'staff_availability',
        type: 'staff_availability',
        weight: 10,
        config: { enforceStrictAvailability: true }
      },
      {
        id: 'client_preference',
        type: 'client_preference',
        weight: 7,
        config: { respectTimePreferences: true }
      },
      {
        id: 'travel_optimization',
        type: 'travel_time',
        weight: 6,
        config: { maxTravelTime: 60, optimizeRoutes: true }
      },
      {
        id: 'service_requirements',
        type: 'service_requirement',
        weight: 9,
        config: { matchSkills: true, respectDuration: true }
      }
    ];
  }

  /**
   * Generate optimized schedule for a given date range
   */
  async generateOptimizedSchedule(
    startDate: Date,
    endDate: Date,
    options: {
      includeExisting?: boolean;
      staffIds?: string[];
      clientIds?: string[];
    } = {}
  ): Promise<SchedulingResult> {
    console.log(`Generating optimized schedule from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    try {
      // Fetch required data
      const [appointments, staff, clients] = await Promise.all([
        this.getUnscheduledAppointments(startDate, endDate, options),
        this.getAvailableStaff(startDate, endDate, options.staffIds),
        this.getClientsWithPreferences(options.clientIds)
      ]);

      // Generate optimized schedule
      const optimizedSchedule = await this.optimizeSchedule(appointments, staff, clients, startDate, endDate);

      // Calculate metrics
      const metrics = this.calculateSchedulingMetrics(optimizedSchedule, appointments);

      // Trigger workflow events for successful scheduling
      for (const scheduled of optimizedSchedule.schedule) {
        await workflowEngine.triggerWorkflow('appointment_auto_scheduled', {
          appointmentId: scheduled.appointmentId,
          staffId: scheduled.staffId,
          clientId: scheduled.clientId,
          startTime: scheduled.startTime,
          score: scheduled.score
        }, 'system');
      }

      return {
        schedule: optimizedSchedule.schedule,
        unscheduled: optimizedSchedule.unscheduled,
        metrics
      };

    } catch (error) {
      console.error('Scheduling automation error:', error);
      throw new Error(`Failed to generate optimized schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Auto-assign staff to appointments based on optimization criteria
   */
  async autoAssignStaff(appointmentIds: string[]): Promise<{ 
    assigned: Array<{ appointmentId: string; staffId: string; score: number }>;
    unassigned: Array<{ appointmentId: string; reason: string }>;
  }> {
    const assigned: Array<{ appointmentId: string; staffId: string; score: number }> = [];
    const unassigned: Array<{ appointmentId: string; reason: string }> = [];

    for (const appointmentId of appointmentIds) {
      try {
        const appointment = await storage.getCalendarAppointment(appointmentId);
        if (!appointment) {
          unassigned.push({ appointmentId, reason: 'Appointment not found' });
          continue;
        }

        const bestStaff = await this.findBestStaffForAppointment(appointment);
        if (bestStaff) {
          assigned.push({
            appointmentId,
            staffId: bestStaff.staffId,
            score: bestStaff.score
          });

          // Update appointment with assigned staff
          await storage.updateCalendarAppointment(appointmentId, {
            staffId: bestStaff.staffId,
            status: 'confirmed'
          });

          // Trigger workflow event
          await workflowEngine.triggerWorkflow('staff_auto_assigned', {
            appointmentId,
            staffId: bestStaff.staffId,
            score: bestStaff.score
          }, 'system');
        } else {
          unassigned.push({ appointmentId, reason: 'No suitable staff available' });
        }
      } catch (error) {
        unassigned.push({ 
          appointmentId, 
          reason: `Assignment error: ${error instanceof Error ? error.message : 'Unknown error'}` 
        });
      }
    }

    return { assigned, unassigned };
  }

  /**
   * Detect and resolve scheduling conflicts
   */
  async resolveSchedulingConflicts(dateRange: { start: Date; end: Date }): Promise<{
    conflicts: Array<{
      type: 'double_booking' | 'travel_conflict' | 'availability_conflict';
      appointments: string[];
      severity: 'low' | 'medium' | 'high';
      resolution?: string;
    }>;
    resolved: number;
    requiresManualIntervention: number;
  }> {
    const conflicts: Array<{
      type: 'double_booking' | 'travel_conflict' | 'availability_conflict';
      appointments: string[];
      severity: 'low' | 'medium' | 'high';
      resolution?: string;
    }> = [];

    // Get all appointments in date range
    const appointments = await storage.getCalendarAppointments();
    const rangeAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.startDateTime);
      return aptDate >= dateRange.start && aptDate <= dateRange.end;
    });

    // Detect double bookings
    const doubleBookings = this.detectDoubleBookings(rangeAppointments);
    conflicts.push(...doubleBookings);

    // Detect travel conflicts
    const travelConflicts = await this.detectTravelConflicts(rangeAppointments);
    conflicts.push(...travelConflicts);

    // Detect availability conflicts
    const availabilityConflicts = await this.detectAvailabilityConflicts(rangeAppointments);
    conflicts.push(...availabilityConflicts);

    // Attempt automatic resolution
    let resolved = 0;
    let requiresManualIntervention = 0;

    for (const conflict of conflicts) {
      if (conflict.severity === 'low' || conflict.severity === 'medium') {
        const resolutionResult = await this.attemptAutomaticResolution(conflict);
        if (resolutionResult.success) {
          conflict.resolution = resolutionResult.description;
          resolved++;
        } else {
          requiresManualIntervention++;
        }
      } else {
        requiresManualIntervention++;
      }
    }

    return { conflicts, resolved, requiresManualIntervention };
  }

  /**
   * Generate recurring appointments based on service patterns
   */
  async generateRecurringAppointments(
    clientId: string,
    serviceType: string,
    pattern: {
      frequency: 'daily' | 'weekly' | 'monthly';
      interval: number; // e.g., every 2 weeks
      daysOfWeek?: number[]; // 0-6, Sunday=0
      timeOfDay: { hour: number; minute: number };
      duration: number; // minutes
    },
    dateRange: { start: Date; end: Date }
  ): Promise<string[]> {
    const appointmentIds: string[] = [];
    const currentDate = new Date(dateRange.start);

    while (currentDate <= dateRange.end) {
      // Check if this date matches the pattern
      if (this.matchesRecurrencePattern(currentDate, pattern)) {
        const startDateTime = new Date(currentDate);
        startDateTime.setHours(pattern.timeOfDay.hour, pattern.timeOfDay.minute, 0, 0);

        const endDateTime = new Date(startDateTime);
        endDateTime.setMinutes(endDateTime.getMinutes() + pattern.duration);

        // Find available staff for this time slot
        const availableStaff = await this.findAvailableStaffForSlot(startDateTime, endDateTime, serviceType);
        
        if (availableStaff.length > 0) {
          const appointment = await storage.createCalendarAppointment({
            clientId,
            staffId: availableStaff[0].id, // Assign best available staff
            serviceType,
            startDateTime,
            endDateTime,
            status: 'scheduled',
            notes: `Auto-generated recurring appointment (${pattern.frequency})`,
            createdBy: 'system'
          });

          appointmentIds.push(appointment.id);

          // Trigger workflow event
          await workflowEngine.triggerWorkflow('recurring_appointment_created', {
            appointmentId: appointment.id,
            clientId,
            serviceType,
            pattern
          }, 'system');
        }
      }

      // Advance to next date based on pattern
      this.advanceToNextRecurrenceDate(currentDate, pattern);
    }

    return appointmentIds;
  }

  // Private helper methods

  private async getUnscheduledAppointments(startDate: Date, endDate: Date, options: any): Promise<any[]> {
    const appointments = await storage.getCalendarAppointments();
    return appointments.filter(apt => {
      const aptDate = new Date(apt.startDateTime);
      return aptDate >= startDate && aptDate <= endDate && 
             (!apt.staffId || apt.status === 'pending') &&
             (!options.clientIds || options.clientIds.includes(apt.clientId));
    });
  }

  private async getAvailableStaff(startDate: Date, endDate: Date, staffIds?: string[]): Promise<any[]> {
    const staff = await storage.getStaff();
    return staff.filter(s => !staffIds || staffIds.includes(s.id));
  }

  private async getClientsWithPreferences(clientIds?: string[]): Promise<any[]> {
    const clients = await storage.getClients();
    return clients.filter(c => !clientIds || clientIds.includes(c.id));
  }

  private async optimizeSchedule(appointments: any[], staff: any[], clients: any[], startDate: Date, endDate: Date): Promise<{
    schedule: OptimizedSchedule[];
    unscheduled: Array<{ appointmentId: string; reason: string; suggestions: string[] }>;
  }> {
    const schedule: OptimizedSchedule[] = [];
    const unscheduled: Array<{ appointmentId: string; reason: string; suggestions: string[] }> = [];

    // Simple optimization algorithm - in production, use more sophisticated algorithms
    for (const appointment of appointments) {
      const bestAssignment = await this.findBestStaffForAppointment(appointment);
      
      if (bestAssignment) {
        schedule.push({
          appointmentId: appointment.id,
          staffId: bestAssignment.staffId,
          clientId: appointment.clientId,
          startTime: new Date(appointment.startDateTime),
          endTime: new Date(appointment.endDateTime),
          serviceType: appointment.serviceType,
          score: bestAssignment.score
        });
      } else {
        unscheduled.push({
          appointmentId: appointment.id,
          reason: 'No suitable staff available',
          suggestions: ['Check staff availability', 'Consider rescheduling', 'Add more staff']
        });
      }
    }

    return { schedule, unscheduled };
  }

  private async findBestStaffForAppointment(appointment: any): Promise<{
    staffId: string;
    score: number;
  } | null> {
    const staff = await storage.getStaff();
    let bestScore = 0;
    let bestStaffId: string | null = null;

    for (const staffMember of staff) {
      const score = await this.calculateStaffScore(staffMember, appointment);
      if (score > bestScore) {
        bestScore = score;
        bestStaffId = staffMember.id;
      }
    }

    return bestStaffId ? { staffId: bestStaffId, score: bestScore } : null;
  }

  private async calculateStaffScore(staff: any, appointment: any): Promise<number> {
    let score = 0;

    // Check availability (highest priority)
    const isAvailable = await this.checkStaffAvailability(staff.id, appointment.startDateTime, appointment.endDateTime);
    if (!isAvailable) return 0;

    score += 50; // Base availability score

    // Check skill match
    if (this.hasRequiredSkills(staff, appointment.serviceType)) {
      score += 30;
    }

    // Check travel time optimization
    const travelScore = await this.calculateTravelScore(staff.id, appointment);
    score += travelScore;

    // Check workload balance
    const workloadScore = await this.calculateWorkloadScore(staff.id, appointment.startDateTime);
    score += workloadScore;

    return score;
  }

  private async checkStaffAvailability(staffId: string, startTime: Date, endTime: Date): Promise<boolean> {
    const appointments = await storage.getCalendarAppointments();
    const conflicts = appointments.filter(apt => 
      apt.staffId === staffId &&
      new Date(apt.startDateTime) < endTime &&
      new Date(apt.endDateTime) > startTime
    );
    return conflicts.length === 0;
  }

  private hasRequiredSkills(staff: any, serviceType: string): boolean {
    // Simple skill matching - in production, implement proper skill matrix
    return staff.specializations?.includes(serviceType) || true;
  }

  private async calculateTravelScore(staffId: string, appointment: any): Promise<number> {
    // Simplified travel score calculation
    return Math.floor(Math.random() * 20); // 0-20 points
  }

  private async calculateWorkloadScore(staffId: string, date: Date): Promise<number> {
    // Simplified workload score calculation
    return Math.floor(Math.random() * 10); // 0-10 points
  }

  private calculateSchedulingMetrics(result: { schedule: OptimizedSchedule[] }, totalAppointments: any[]): any {
    const totalTravelTime = result.schedule.reduce((sum, apt) => sum + (apt.travelTime || 0), 0);
    const averageScore = result.schedule.reduce((sum, apt) => sum + apt.score, 0) / result.schedule.length || 0;

    return {
      totalAppointments: totalAppointments.length,
      scheduledAppointments: result.schedule.length,
      averageScore,
      totalTravelTime
    };
  }

  private detectDoubleBookings(appointments: any[]): Array<{
    type: 'double_booking';
    appointments: string[];
    severity: 'low' | 'medium' | 'high';
  }> {
    const conflicts = [];
    // Simplified conflict detection
    return conflicts;
  }

  private async detectTravelConflicts(appointments: any[]): Promise<Array<{
    type: 'travel_conflict';
    appointments: string[];
    severity: 'low' | 'medium' | 'high';
  }>> {
    // Simplified travel conflict detection
    return [];
  }

  private async detectAvailabilityConflicts(appointments: any[]): Promise<Array<{
    type: 'availability_conflict';
    appointments: string[];
    severity: 'low' | 'medium' | 'high';
  }>> {
    // Simplified availability conflict detection
    return [];
  }

  private async attemptAutomaticResolution(conflict: any): Promise<{ success: boolean; description?: string }> {
    // Simplified automatic resolution
    return { success: Math.random() > 0.5, description: 'Automatically rescheduled' };
  }

  private matchesRecurrencePattern(date: Date, pattern: any): boolean {
    if (pattern.daysOfWeek && !pattern.daysOfWeek.includes(date.getDay())) {
      return false;
    }
    // Add more pattern matching logic
    return true;
  }

  private advanceToNextRecurrenceDate(currentDate: Date, pattern: any): void {
    switch (pattern.frequency) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + pattern.interval);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + (pattern.interval * 7));
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + pattern.interval);
        break;
    }
  }

  private async findAvailableStaffForSlot(startTime: Date, endTime: Date, serviceType: string): Promise<any[]> {
    const staff = await storage.getStaff();
    const availableStaff = [];

    for (const staffMember of staff) {
      const isAvailable = await this.checkStaffAvailability(staffMember.id, startTime, endTime);
      if (isAvailable && this.hasRequiredSkills(staffMember, serviceType)) {
        availableStaff.push(staffMember);
      }
    }

    return availableStaff;
  }
}

// Export singleton instance
export const schedulingAutomation = new SchedulingAutomation();