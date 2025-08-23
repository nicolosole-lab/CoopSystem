import { storage } from "./storage";
import type { CalendarAppointment, Client, Staff, User } from "@shared/schema";

export interface NotificationConfig {
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  reminderTimes: number[]; // Hours before appointment
}

export interface NotificationTemplate {
  subject: string;
  body: string;
  type: 'appointment_reminder' | 'appointment_created' | 'appointment_updated' | 'appointment_cancelled';
}

export class NotificationService {
  private config: NotificationConfig;

  constructor() {
    this.config = {
      emailEnabled: process.env.EMAIL_ENABLED === 'true',
      smsEnabled: process.env.SMS_ENABLED === 'true',
      inAppEnabled: true,
      reminderTimes: [24, 2, 0.5] // 24 hours, 2 hours, 30 minutes before
    };
  }

  // Get notification templates in Italian and English
  private getTemplate(type: NotificationTemplate['type'], language: 'it' | 'en' = 'it'): NotificationTemplate {
    const templates = {
      it: {
        appointment_reminder: {
          subject: 'Promemoria Appuntamento - Servizio di Assistenza',
          body: `Gentile {clientName},

Ti ricordiamo che hai un appuntamento programmato:

📅 Data: {date}
🕐 Orario: {startTime} - {endTime}
👤 Operatore: {staffName}
🏥 Servizio: {serviceType}

{notes}

Per modifiche o cancellazioni, contatta il nostro ufficio.

Cordiali saluti,
Sistema di Gestione Servizi Sanitari`,
          type: 'appointment_reminder' as const
        },
        appointment_created: {
          subject: 'Nuovo Appuntamento Programmato',
          body: `Gentile {clientName},

È stato programmato un nuovo appuntamento:

📅 Data: {date}
🕐 Orario: {startTime} - {endTime}
👤 Operatore: {staffName}
🏥 Servizio: {serviceType}

{notes}

Cordiali saluti,
Sistema di Gestione Servizi Sanitari`,
          type: 'appointment_created' as const
        },
        appointment_updated: {
          subject: 'Appuntamento Modificato',
          body: `Gentile {clientName},

Il tuo appuntamento è stato modificato:

📅 Nuova Data: {date}
🕐 Nuovo Orario: {startTime} - {endTime}
👤 Operatore: {staffName}
🏥 Servizio: {serviceType}

{notes}

Cordiali saluti,
Sistema di Gestione Servizi Sanitari`,
          type: 'appointment_updated' as const
        },
        appointment_cancelled: {
          subject: 'Appuntamento Cancellato',
          body: `Gentile {clientName},

Il tuo appuntamento del {date} alle {startTime} è stato cancellato.

Per riprogrammare, contatta il nostro ufficio.

Cordiali saluti,
Sistema di Gestione Servizi Sanitari`,
          type: 'appointment_cancelled' as const
        }
      },
      en: {
        appointment_reminder: {
          subject: 'Appointment Reminder - Healthcare Service',
          body: `Dear {clientName},

This is a reminder of your scheduled appointment:

📅 Date: {date}
🕐 Time: {startTime} - {endTime}
👤 Staff: {staffName}
🏥 Service: {serviceType}

{notes}

For changes or cancellations, please contact our office.

Best regards,
Healthcare Service Management System`,
          type: 'appointment_reminder' as const
        },
        appointment_created: {
          subject: 'New Appointment Scheduled',
          body: `Dear {clientName},

A new appointment has been scheduled:

📅 Date: {date}
🕐 Time: {startTime} - {endTime}
👤 Staff: {staffName}
🏥 Service: {serviceType}

{notes}

Best regards,
Healthcare Service Management System`,
          type: 'appointment_created' as const
        },
        appointment_updated: {
          subject: 'Appointment Updated',
          body: `Dear {clientName},

Your appointment has been updated:

📅 New Date: {date}
🕐 New Time: {startTime} - {endTime}
👤 Staff: {staffName}
🏥 Service: {serviceType}

{notes}

Best regards,
Healthcare Service Management System`,
          type: 'appointment_updated' as const
        },
        appointment_cancelled: {
          subject: 'Appointment Cancelled',
          body: `Dear {clientName},

Your appointment on {date} at {startTime} has been cancelled.

To reschedule, please contact our office.

Best regards,
Healthcare Service Management System`,
          type: 'appointment_cancelled' as const
        }
      }
    };

    return templates[language][type];
  }

  // Replace template variables with actual data
  private fillTemplate(template: NotificationTemplate, data: {
    clientName: string;
    staffName: string;
    date: string;
    startTime: string;
    endTime: string;
    serviceType: string;
    notes?: string;
  }): NotificationTemplate {
    let subject = template.subject;
    let body = template.body;

    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), value || '');
      body = body.replace(new RegExp(placeholder, 'g'), value || '');
    });

    return { ...template, subject, body };
  }

  // Send appointment notification
  async sendAppointmentNotification(
    appointment: CalendarAppointment & { client?: Client; staff?: Staff },
    type: NotificationTemplate['type'],
    language: 'it' | 'en' = 'it'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!appointment.client || !appointment.staff) {
        // Fetch related data if not provided
        const [client, staffMember] = await Promise.all([
          storage.getClient(appointment.clientId),
          storage.getStaffMember(appointment.staffId)
        ]);

        if (!client || !staffMember) {
          return { success: false, error: 'Client or staff not found' };
        }

        appointment.client = client;
        appointment.staff = staffMember;
      }

      const template = this.getTemplate(type, language);
      const appointmentDate = new Date(appointment.startDateTime);
      const endDate = new Date(appointment.endDateTime);

      const client = appointment.client!;
      const staff = appointment.staff!;
      
      const notificationData = this.fillTemplate(template, {
        clientName: `${client.firstName} ${client.lastName}`,
        staffName: `${staff.firstName} ${staff.lastName}`,
        date: appointmentDate.toLocaleDateString('it-IT', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        startTime: appointmentDate.toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        endTime: endDate.toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        serviceType: appointment.serviceType,
        notes: appointment.notes || ''
      });

      // Store in-app notification
      if (this.config.inAppEnabled) {
        await this.createInAppNotification({
          userId: client.id, // Assuming client ID can be used as user ID
          title: notificationData.subject,
          message: notificationData.body,
          type: type,
          appointmentId: appointment.id
        });
      }

      console.log(`Notification sent for appointment ${appointment.id}: ${type}`);
      return { success: true };

    } catch (error) {
      console.error('Error sending notification:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Create in-app notification (stored in database)
  private async createInAppNotification(notification: {
    userId: string;
    title: string;
    message: string;
    type: string;
    appointmentId?: string;
  }): Promise<void> {
    // This would typically store in a notifications table
    // For now, we'll use console logging to demonstrate the functionality
    console.log('In-app notification created:', {
      ...notification,
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  // Schedule appointment reminders
  async scheduleAppointmentReminders(appointment: CalendarAppointment): Promise<void> {
    const appointmentTime = new Date(appointment.startDateTime);
    const now = new Date();

    for (const hoursBeforeStr of this.config.reminderTimes) {
      const hoursBeforeNum = Number(hoursBeforeStr);
      const reminderTime = new Date(appointmentTime.getTime() - (hoursBeforeNum * 60 * 60 * 1000));

      // Only schedule future reminders
      if (reminderTime > now) {
        setTimeout(async () => {
          await this.sendAppointmentNotification(appointment, 'appointment_reminder');
        }, reminderTime.getTime() - now.getTime());
      }
    }
  }

  // Check for upcoming appointments and send reminders
  async checkUpcomingAppointments(): Promise<void> {
    try {
      const appointments = await storage.getCalendarAppointments();
      const now = new Date();
      const next24Hours = new Date(now.getTime() + (24 * 60 * 60 * 1000));

      const upcomingAppointments = appointments.filter(apt => {
        const aptTime = new Date(apt.startDateTime);
        return aptTime > now && aptTime <= next24Hours && apt.status === 'scheduled';
      });

      for (const appointment of upcomingAppointments) {
        const appointmentTime = new Date(appointment.startDateTime);
        const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Check if any reminder time matches
        for (const reminderHours of this.config.reminderTimes) {
          const reminderHoursNum = Number(reminderHours);
          if (Math.abs(hoursUntilAppointment - reminderHoursNum) < 0.1) { // Within 6 minutes
            await this.sendAppointmentNotification(appointment, 'appointment_reminder');
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error checking upcoming appointments:', error);
    }
  }

  // Start the notification scheduler (runs every 15 minutes)
  startScheduler(): void {
    // Check immediately
    this.checkUpcomingAppointments();

    // Then check every 15 minutes
    setInterval(() => {
      this.checkUpcomingAppointments();
    }, 15 * 60 * 1000); // 15 minutes
  }
}

// Export singleton instance
export const notificationService = new NotificationService();