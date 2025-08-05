import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { insertTimeLogSchema } from "@shared/schema";
import type { TimeLog, InsertTimeLog, Client, Staff } from "@shared/schema";
import { z } from "zod";

interface TimeLogFormProps {
  timeLog?: TimeLog;
  onSuccess: () => void;
}

const formSchema = insertTimeLogSchema.extend({
  serviceDate: z.string().min(1, "Service date is required"),
});

type FormData = z.infer<typeof formSchema>;

export function TimeLogForm({ timeLog, onSuccess }: TimeLogFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!timeLog;

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    retry: false,
  });

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
    retry: false,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: timeLog?.clientId || "",
      staffId: timeLog?.staffId || "",
      serviceDate: timeLog?.serviceDate ? new Date(timeLog.serviceDate).toISOString().split('T')[0] : "",
      hours: timeLog?.hours || "",
      serviceType: timeLog?.serviceType || "",
      notes: timeLog?.notes || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: InsertTimeLog = {
        ...data,
        serviceDate: new Date(data.serviceDate),
      };

      if (isEditing) {
        return await apiRequest("PUT", `/api/time-logs/${timeLog.id}`, payload);
      } else {
        return await apiRequest("POST", "/api/time-logs", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Success",
        description: `Time log ${isEditing ? "updated" : "created"} successfully`,
      });
      onSuccess();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} time log`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const activeClients = clients.filter(client => client.status === "active");
  const activeStaff = staff.filter(staffMember => staffMember.status === "active");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-client">
                      <SelectValue placeholder="Select client..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {activeClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.firstName} {client.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="staffId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Staff Member</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-staff">
                      <SelectValue placeholder="Select staff member..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {activeStaff.map((staffMember) => (
                      <SelectItem key={staffMember.id} value={staffMember.id}>
                        {staffMember.firstName} {staffMember.lastName} (€{parseFloat(staffMember.hourlyRate).toFixed(2)}/hr)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="serviceDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-service-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hours</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.25"
                    min="0"
                    max="24"
                    placeholder="8.0"
                    {...field}
                    data-testid="input-hours"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="serviceType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-service-type">
                    <SelectValue placeholder="Select service type..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="personal-care">Personal Care</SelectItem>
                  <SelectItem value="home-support">Home Support</SelectItem>
                  <SelectItem value="medical-assistance">Medical Assistance</SelectItem>
                  <SelectItem value="social-support">Social Support</SelectItem>
                  <SelectItem value="transportation">Transportation</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional details about the service..."
                  {...field}
                  data-testid="input-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onSuccess}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={mutation.isPending}
            data-testid="button-submit"
          >
            {mutation.isPending ? "Saving..." : isEditing ? "Update Time Log" : "Log Hours"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
