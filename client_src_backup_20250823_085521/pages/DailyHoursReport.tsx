import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Clock, Users, MapPin, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function DailyHoursReport() {
  const [selectedDate, setSelectedDate] = useState<string>(
    "2025-01-01" // Default to date with actual data
  );

  const { data: dailyReport, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/time-logs/daily-report', selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/time-logs/daily-report/${selectedDate}`);
      if (!response.ok) {
        throw new Error('Failed to fetch daily report');
      }
      return response.json();
    },
    enabled: !!selectedDate
  });

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Report Ore Giornaliere</h1>
          <p className="text-muted-foreground">
            Analisi dettagliata delle ore di lavoro per un singolo giorno
          </p>
        </div>
      </div>

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Seleziona Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                data-testid="input-date-selection"
              />
            </div>
            <Button 
              onClick={() => refetch()} 
              className="mt-8"
              data-testid="button-refresh-report"
            >
              Aggiorna Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="text-lg">Caricamento report...</div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            Errore nel caricamento del report: {error.message}
          </AlertDescription>
        </Alert>
      )}

      {dailyReport && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Data</p>
                    <p className="text-lg font-bold" data-testid="text-report-date">
                      {formatDate(selectedDate)}
                    </p>
                    <Badge 
                      variant={dailyReport.isHoliday ? "destructive" : "secondary"}
                      className="mt-1"
                    >
                      {dailyReport.dayType}
                    </Badge>
                  </div>
                  <CalendarDays className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ore Totali</p>
                    <p className="text-2xl font-bold" data-testid="text-total-hours">
                      {dailyReport.totalHours}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Collaboratori</p>
                    <p className="text-2xl font-bold" data-testid="text-staff-count">
                      {dailyReport.staffCount}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Km Totali</p>
                    <p className="text-2xl font-bold" data-testid="text-total-mileage">
                      {dailyReport.totalMileage}
                    </p>
                  </div>
                  <MapPin className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Staff Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Dettaglio per Collaboratore
              </CardTitle>
              <CardDescription>
                Ore di lavoro e servizi svolti da ogni collaboratore
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dailyReport.staffDetails && dailyReport.staffDetails.length > 0 ? (
                <div className="space-y-4">
                  {dailyReport.staffDetails.map((staff: any, index: number) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-lg" data-testid={`text-staff-name-${index}`}>
                            {staff.staffName}
                          </h3>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {staff.hours.toFixed(2)} ore
                            </span>
                            {staff.mileage > 0 && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {staff.mileage.toFixed(2)} km
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {staff.services && staff.services.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                              <Briefcase className="h-4 w-4" />
                              Servizi ({staff.services.length})
                            </h4>
                            <div className="grid gap-2">
                              {staff.services.map((service: any, serviceIndex: number) => (
                                <div 
                                  key={serviceIndex}
                                  className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
                                  data-testid={`service-${index}-${serviceIndex}`}
                                >
                                  <div>
                                    <span className="font-medium">{service.clientName}</span>
                                  </div>
                                  <div className="flex gap-4 text-muted-foreground">
                                    <span>
                                      {formatTime(service.startTime)} - {formatTime(service.endTime)}
                                    </span>
                                    <span>{service.hours.toFixed(2)}h</span>
                                    {service.mileage > 0 && (
                                      <span>{service.mileage}km</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  Nessun servizio trovato per questa data
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}