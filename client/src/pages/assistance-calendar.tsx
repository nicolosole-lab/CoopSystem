import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Users, MapPin, Phone, Edit, Trash2, Plus, Filter, Search, RefreshCw, AlertCircle, CheckCircle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from '@/hooks/usePermissions';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, addHours, startOfDay, endOfDay } from "date-fns";
import { it } from "date-fns/locale";
import { formatDisplayName } from '@/lib/utils';
import type { Client, Staff, TimeLog } from "@shared/schema";

// Extended appointment interface
interface CalendarAppointment {
  id: string;
  title: string;
  start: string;
  end: string;
  clientId: string;
  staffId: string;
  serviceType: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  client?: Client;
  staff?: Staff;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

// Form validation schemas
const appointmentSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  staffId: z.string().min(1, "Staff member is required"),
  serviceType: z.string().min(1, "Service type is required"),
  startDateTime: z.string().min(1, "Start date/time is required"),
  endDateTime: z.string().min(1, "End date/time is required"),
  notes: z.string().optional()
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

export default function AssistanceCalendar() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const calendarRef = useRef<FullCalendar>(null);
  
  // State management
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterStaff, setFilterStaff] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [currentView, setCurrentView] = useState<string>("timeGridWeek");

  // Form management
  const createForm = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      clientId: "",
      staffId: "",
      serviceType: "",
      startDateTime: "",
      endDateTime: "",
      notes: ""
    }
  });

  const editForm = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema)
  });

  // Fetch data
  const { data: appointments = [], isLoading: appointmentsLoading, refetch: refetchAppointments } = useQuery<CalendarAppointment[]>({
    queryKey: ["/api/calendar/appointments"],
    retry: false,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    retry: false,
  });

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
    retry: false,
  });

  // Service types
  const serviceTypes = [
    "Assistenza alla persona",
    "Home Care", 
    "Assistenza sanitaria",
    "Supporto domestico",
    "Accompagnamento",
    "Assistenza educativa",
    "Supporto psicologico",
    "Fisioterapia"
  ];

  // Status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return { bg: '#3b82f6', border: '#1d4ed8', text: '#ffffff' };
      case 'in_progress':
        return { bg: '#f59e0b', border: '#d97706', text: '#ffffff' };
      case 'completed':
        return { bg: '#10b981', border: '#059669', text: '#ffffff' };
      case 'cancelled':
        return { bg: '#ef4444', border: '#dc2626', text: '#ffffff' };
      default:
        return { bg: '#6b7280', border: '#4b5563', text: '#ffffff' };
    }
  };

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter(appointment => {
      if (filterClient !== "all" && appointment.clientId !== filterClient) return false;
      if (filterStaff !== "all" && appointment.staffId !== filterStaff) return false;
      if (filterStatus !== "all" && appointment.status !== filterStatus) return false;
      return true;
    });
  }, [appointments, filterClient, filterStaff, filterStatus]);

  // Format appointments for FullCalendar
  const calendarEvents = useMemo(() => {
    return filteredAppointments.map(appointment => {
      const colors = getStatusColor(appointment.status);
      const clientName = appointment.client ? formatDisplayName(appointment.client.firstName, appointment.client.lastName) : 'Unknown Client';
      const staffName = appointment.staff ? formatDisplayName(appointment.staff.firstName, appointment.staff.lastName) : 'Unknown Staff';
      
      return {
        id: appointment.id,
        title: `${clientName} - ${appointment.serviceType}`,
        start: appointment.start,
        end: appointment.end,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        textColor: colors.text,
        extendedProps: {
          ...appointment,
          clientName,
          staffName
        }
      };
    });
  }, [filteredAppointments]);

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      return await apiRequest('POST', '/api/calendar/appointments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/appointments"] });
      setShowCreateDialog(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "Appointment created successfully"
      });
    },
    onError: (error: any) => {
      if (!isUnauthorizedError(error)) {
        toast({
          title: "Error",
          description: error.message || "Failed to create appointment",
          variant: "destructive"
        });
      }
    }
  });

  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AppointmentFormData> }) => {
      return await apiRequest('PUT', `/api/calendar/appointments/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/appointments"] });
      setShowEditDialog(false);
      setSelectedAppointment(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Appointment updated successfully"
      });
    },
    onError: (error: any) => {
      if (!isUnauthorizedError(error)) {
        toast({
          title: "Error",
          description: error.message || "Failed to update appointment",
          variant: "destructive"
        });
      }
    }
  });

  // Delete appointment mutation
  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/calendar/appointments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/appointments"] });
      setShowDetailsDialog(false);
      setSelectedAppointment(null);
      toast({
        title: "Success",
        description: "Appointment deleted successfully"
      });
    },
    onError: (error: any) => {
      if (!isUnauthorizedError(error)) {
        toast({
          title: "Error",
          description: error.message || "Failed to delete appointment",
          variant: "destructive"
        });
      }
    }
  });

  // Calendar event handlers
  const handleDateSelect = (selectInfo: any) => {
    if (!canCreate()) return;
    
    const start = format(selectInfo.start, "yyyy-MM-dd'T'HH:mm");
    const end = format(selectInfo.end, "yyyy-MM-dd'T'HH:mm");
    
    createForm.setValue("startDateTime", start);
    createForm.setValue("endDateTime", end);
    setSelectedDate(format(selectInfo.start, "yyyy-MM-dd"));
    setShowCreateDialog(true);
  };

  const handleEventClick = (clickInfo: any) => {
    const appointment = appointments.find(app => app.id === clickInfo.event.id);
    if (appointment) {
      setSelectedAppointment(appointment);
      setShowDetailsDialog(true);
    }
  };

  const handleEventDrop = async (dropInfo: any) => {
    if (!canUpdate()) {
      dropInfo.revert();
      return;
    }

    const appointment = appointments.find(app => app.id === dropInfo.event.id);
    if (!appointment) {
      dropInfo.revert();
      return;
    }

    const newStart = format(dropInfo.event.start, "yyyy-MM-dd'T'HH:mm:ss");
    const newEnd = format(dropInfo.event.end, "yyyy-MM-dd'T'HH:mm:ss");

    try {
      await updateAppointmentMutation.mutateAsync({
        id: appointment.id,
        data: {
          ...appointment,
          startDateTime: newStart,
          endDateTime: newEnd
        }
      });
    } catch (error) {
      dropInfo.revert();
    }
  };

  const handleEventResize = async (resizeInfo: any) => {
    if (!canUpdate()) {
      resizeInfo.revert();
      return;
    }

    const appointment = appointments.find(app => app.id === resizeInfo.event.id);
    if (!appointment) {
      resizeInfo.revert();
      return;
    }

    const newStart = format(resizeInfo.event.start, "yyyy-MM-dd'T'HH:mm:ss");
    const newEnd = format(resizeInfo.event.end, "yyyy-MM-dd'T'HH:mm:ss");

    try {
      await updateAppointmentMutation.mutateAsync({
        id: appointment.id,
        data: {
          ...appointment,
          startDateTime: newStart,
          endDateTime: newEnd
        }
      });
    } catch (error) {
      resizeInfo.revert();
    }
  };

  // Form handlers
  const handleCreateSubmit = (data: AppointmentFormData) => {
    createAppointmentMutation.mutate(data);
  };

  const handleEditSubmit = (data: AppointmentFormData) => {
    if (!selectedAppointment) return;
    updateAppointmentMutation.mutate({
      id: selectedAppointment.id,
      data
    });
  };

  const handleEdit = () => {
    if (!selectedAppointment || !canUpdate()) return;
    
    editForm.reset({
      clientId: selectedAppointment.clientId,
      staffId: selectedAppointment.staffId,
      serviceType: selectedAppointment.serviceType,
      startDateTime: format(parseISO(selectedAppointment.start), "yyyy-MM-dd'T'HH:mm"),
      endDateTime: format(parseISO(selectedAppointment.end), "yyyy-MM-dd'T'HH:mm"),
      notes: selectedAppointment.notes || ""
    });
    
    setShowDetailsDialog(false);
    setShowEditDialog(true);
  };

  const handleDelete = () => {
    if (!selectedAppointment || !canDelete()) return;
    deleteAppointmentMutation.mutate(selectedAppointment.id);
  };

  // Calendar configuration
  const calendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    initialView: currentView,
    locale: 'it',
    height: 'auto',
    selectable: canCreate(),
    selectMirror: true,
    editable: canUpdate(),
    eventResizableFromStart: canUpdate(),
    eventDurationEditable: canUpdate(),
    dayMaxEvents: true,
    weekends: true,
    businessHours: {
      daysOfWeek: [1, 2, 3, 4, 5, 6], // Monday - Saturday
      startTime: '07:00',
      endTime: '20:00'
    },
    slotMinTime: '06:00:00',
    slotMaxTime: '22:00:00',
    allDaySlot: false,
    events: calendarEvents,
    select: handleDateSelect,
    eventClick: handleEventClick,
    eventDrop: handleEventDrop,
    eventResize: handleEventResize,
    eventDidMount: (info: any) => {
      // Add tooltip with appointment details
      info.el.title = `${info.event.extendedProps.clientName} - ${info.event.extendedProps.staffName}\n${info.event.extendedProps.serviceType}\nStatus: ${info.event.extendedProps.status}`;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Care Calendar</h1>
          <p className="text-gray-600 mt-1">Manage and schedule care appointments</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => refetchAppointments()}
            variant="outline"
            size="sm"
            data-testid="button-refresh-calendar"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {canCreate() && (
            <Button
              onClick={() => setShowCreateDialog(true)}
              size="sm"
              data-testid="button-create-appointment"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Appointment
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="filter-client">Client</Label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger data-testid="select-filter-client">
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All clients</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {formatDisplayName(client.firstName, client.lastName)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-staff">Staff Member</Label>
              <Select value={filterStaff} onValueChange={setFilterStaff}>
                <SelectTrigger data-testid="select-filter-staff">
                  <SelectValue placeholder="All staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All staff</SelectItem>
                  {staff.map(staffMember => (
                    <SelectItem key={staffMember.id} value={staffMember.id}>
                      {formatDisplayName(staffMember.firstName, staffMember.lastName)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-status">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger data-testid="select-filter-status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="calendar-view">View</Label>
              <Select value={currentView} onValueChange={setCurrentView}>
                <SelectTrigger data-testid="select-calendar-view">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dayGridMonth">Month</SelectItem>
                  <SelectItem value="timeGridWeek">Week</SelectItem>
                  <SelectItem value="timeGridDay">Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardContent className="p-6">
          {appointmentsLoading ? (
            <div className="flex justify-center items-center h-96">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <FullCalendar
              ref={calendarRef}
              {...calendarOptions}
            />
          )}
        </CardContent>
      </Card>

      {/* Create Appointment Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Appointment</DialogTitle>
            <DialogDescription>
              Schedule a new care appointment
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger data-testid="select-create-client">
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map(client => (
                            <SelectItem key={client.id} value={client.id}>
                              {formatDisplayName(client.firstName, client.lastName)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="staffId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff Member</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger data-testid="select-create-staff">
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                        <SelectContent>
                          {staff.map(staffMember => (
                            <SelectItem key={staffMember.id} value={staffMember.id}>
                              {formatDisplayName(staffMember.firstName, staffMember.lastName)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger data-testid="select-create-service">
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceTypes.map(service => (
                            <SelectItem key={service} value={service}>
                              {service}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="startDateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          data-testid="input-create-start"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="endDateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          data-testid="input-create-end"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={createForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional notes..."
                        {...field}
                        data-testid="textarea-create-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createAppointmentMutation.isPending}
                  data-testid="button-submit-create"
                >
                  {createAppointmentMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
            <DialogDescription>
              Update appointment details
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger data-testid="select-edit-client">
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map(client => (
                            <SelectItem key={client.id} value={client.id}>
                              {formatDisplayName(client.firstName, client.lastName)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="staffId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff Member</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger data-testid="select-edit-staff">
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                        <SelectContent>
                          {staff.map(staffMember => (
                            <SelectItem key={staffMember.id} value={staffMember.id}>
                              {formatDisplayName(staffMember.firstName, staffMember.lastName)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger data-testid="select-edit-service">
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceTypes.map(service => (
                            <SelectItem key={service} value={service}>
                              {service}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="startDateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          data-testid="input-edit-start"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="endDateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          data-testid="input-edit-end"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional notes..."
                        {...field}
                        data-testid="textarea-edit-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateAppointmentMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateAppointmentMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Appointment Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-gray-600">Client</Label>
                  <p className="font-medium">
                    {selectedAppointment.client ? formatDisplayName(selectedAppointment.client.firstName, selectedAppointment.client.lastName) : 'Unknown Client'}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">Staff Member</Label>
                  <p className="font-medium">
                    {selectedAppointment.staff ? formatDisplayName(selectedAppointment.staff.firstName, selectedAppointment.staff.lastName) : 'Unknown Staff'}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">Service Type</Label>
                  <p className="font-medium">{selectedAppointment.serviceType}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Status</Label>
                  <Badge variant={
                    selectedAppointment.status === 'completed' ? 'default' :
                    selectedAppointment.status === 'in_progress' ? 'secondary' :
                    selectedAppointment.status === 'scheduled' ? 'outline' : 'destructive'
                  }>
                    {selectedAppointment.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-gray-600">Start</Label>
                  <p className="font-medium">
                    {format(parseISO(selectedAppointment.start), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">End</Label>
                  <p className="font-medium">
                    {format(parseISO(selectedAppointment.end), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
              </div>
              {selectedAppointment.notes && (
                <div>
                  <Label className="text-gray-600">Notes</Label>
                  <p className="text-sm bg-gray-50 p-3 rounded-md">{selectedAppointment.notes}</p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                {canUpdate() && (
                  <Button
                    variant="outline"
                    onClick={handleEdit}
                    data-testid="button-edit-appointment"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
                {canDelete() && (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteAppointmentMutation.isPending}
                    data-testid="button-delete-appointment"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deleteAppointmentMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}