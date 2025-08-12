import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, User, MapPin, Phone, Plus, Filter } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, addWeeks, subWeeks } from 'date-fns';
import { it } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import type { CalendarAppointment, Client, Staff } from '@shared/schema';

interface MobileCalendarProps {
  appointments: CalendarAppointment[];
  clients: Client[];
  staff: Staff[];
  onCreateAppointment: () => void;
  onEditAppointment: (appointment: CalendarAppointment) => void;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
}

export function MobileCalendarOptimization({
  appointments,
  clients,
  staff,
  onCreateAppointment,
  onEditAppointment,
  selectedDate = new Date(),
  onDateSelect
}: MobileCalendarProps) {
  const { t } = useTranslation();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'list'>('day');
  const [filterStaff, setFilterStaff] = useState<string>('');

  // Check if we're on a mobile device
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get week days for week view
  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentWeek, { weekStartsOn: 1 }), // Monday start
    end: endOfWeek(currentWeek, { weekStartsOn: 1 })
  });

  // Filter appointments by date and staff
  const getFilteredAppointments = (date?: Date) => {
    let filtered = appointments;
    
    if (date) {
      filtered = filtered.filter(apt => 
        isSameDay(new Date(apt.startDateTime), date)
      );
    }
    
    if (filterStaff) {
      filtered = filtered.filter(apt => apt.staffId === filterStaff);
    }
    
    return filtered.sort((a, b) => 
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
    );
  };

  // Get appointments for a specific day
  const getDayAppointments = (date: Date) => getFilteredAppointments(date);

  // Get client and staff names
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.lastName}, ${client.firstName}` : 'Unknown Client';
  };

  const getStaffName = (staffId: string) => {
    const staff_member = staff.find(s => s.id === staffId);
    return staff_member ? `${staff_member.lastName}, ${staff_member.firstName}` : 'Unknown Staff';
  };

  // Navigation functions
  const goToPreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToToday = () => setCurrentWeek(new Date());

  // Appointment card component
  const AppointmentCard = ({ appointment }: { appointment: CalendarAppointment }) => {
    const startTime = new Date(appointment.startDateTime);
    const endTime = new Date(appointment.endDateTime);
    
    return (
      <Card 
        className="mb-2 border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onEditAppointment(appointment)}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h4 className="font-semibold text-sm leading-tight">
                {getClientName(appointment.clientId)}
              </h4>
              <p className="text-xs text-muted-foreground">
                {getStaffName(appointment.staffId)}
              </p>
            </div>
            <Badge 
              variant={appointment.status === 'scheduled' ? 'default' : 
                      appointment.status === 'completed' ? 'secondary' : 'destructive'}
              className="text-xs"
            >
              {appointment.status}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>
                {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{appointment.serviceType}</span>
            </div>
          </div>
          
          {appointment.notes && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {appointment.notes}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  // Day view component
  const DayView = () => {
    const dayAppointments = getDayAppointments(selectedDate);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: it })}
          </h3>
          <Button
            onClick={onCreateAppointment}
            size="sm"
            className="flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            {t('common.add')}
          </Button>
        </div>
        
        <ScrollArea className="h-[60vh]">
          {dayAppointments.length > 0 ? (
            dayAppointments.map(appointment => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  {t('calendar.noAppointments')}
                </p>
                <Button 
                  onClick={onCreateAppointment}
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                >
                  {t('calendar.createFirst')}
                </Button>
              </CardContent>
            </Card>
          )}
        </ScrollArea>
      </div>
    );
  };

  // Week view component
  const WeekView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={goToPreviousWeek} variant="outline" size="sm">
            ←
          </Button>
          <h3 className="text-lg font-semibold">
            {format(weekDays[0], 'd MMM', { locale: it })} - {format(weekDays[6], 'd MMM', { locale: it })}
          </h3>
          <Button onClick={goToNextWeek} variant="outline" size="sm">
            →
          </Button>
        </div>
        <Button onClick={goToToday} variant="outline" size="sm">
          {t('calendar.today')}
        </Button>
      </div>
      
      <ScrollArea className="h-[60vh]">
        <div className="space-y-4">
          {weekDays.map(day => {
            const dayAppointments = getDayAppointments(day);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div key={day.toISOString()} className={`p-3 rounded-lg border ${isToday ? 'bg-blue-50 border-blue-200' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`font-medium ${isToday ? 'text-blue-700' : ''}`}>
                    {format(day, 'EEEE d', { locale: it })}
                  </h4>
                  <Badge variant={isToday ? 'default' : 'secondary'} className="text-xs">
                    {dayAppointments.length}
                  </Badge>
                </div>
                
                {dayAppointments.slice(0, 2).map(appointment => (
                  <div 
                    key={appointment.id}
                    className="text-sm p-2 bg-white rounded border mb-1 cursor-pointer hover:bg-gray-50"
                    onClick={() => onEditAppointment(appointment)}
                  >
                    <div className="font-medium truncate">
                      {getClientName(appointment.clientId)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(appointment.startDateTime), 'HH:mm')} - {appointment.serviceType}
                    </div>
                  </div>
                ))}
                
                {dayAppointments.length > 2 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{dayAppointments.length - 2} {t('calendar.more')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

  // List view component
  const ListView = () => {
    const allAppointments = getFilteredAppointments();
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t('calendar.allAppointments')}</h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-1" />
                {t('common.filter')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('calendar.filterAppointments')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{t('staff.title')}</label>
                  <select 
                    value={filterStaff} 
                    onChange={(e) => setFilterStaff(e.target.value)}
                    className="w-full mt-1 p-2 border rounded"
                  >
                    <option value="">{t('common.all')}</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.lastName}, {s.firstName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <ScrollArea className="h-[60vh]">
          {allAppointments.length > 0 ? (
            allAppointments.map(appointment => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">{t('calendar.noAppointments')}</p>
              </CardContent>
            </Card>
          )}
        </ScrollArea>
      </div>
    );
  };

  // Only render mobile optimization on small screens
  if (!isMobile) {
    return null;
  }

  return (
    <div className="p-4 max-w-sm mx-auto">
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="day" className="text-xs">{t('calendar.day')}</TabsTrigger>
          <TabsTrigger value="week" className="text-xs">{t('calendar.week')}</TabsTrigger>
          <TabsTrigger value="list" className="text-xs">{t('calendar.list')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="day" className="mt-0">
          <DayView />
        </TabsContent>
        
        <TabsContent value="week" className="mt-0">
          <WeekView />
        </TabsContent>
        
        <TabsContent value="list" className="mt-0">
          <ListView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MobileCalendarOptimization;