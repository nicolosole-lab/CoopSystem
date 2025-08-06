import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { insertClientSchema } from "@shared/schema";
import type { Client, InsertClient } from "@shared/schema";
import { z } from "zod";
import { useTranslation } from "react-i18next";

interface ClientFormProps {
  client?: Client;
  onSuccess: () => void;
}

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  serviceType: z.string().min(1, "Service type is required"),
  status: z.string().min(1, "Status is required"),
  monthlyBudget: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type FormData = z.infer<typeof formSchema>;

export function ClientForm({ client, onSuccess }: ClientFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!client;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: client?.firstName || "",
      lastName: client?.lastName || "",
      email: client?.email || "",
      phone: client?.phone || "",
      address: client?.address || "",
      dateOfBirth: client?.dateOfBirth ? new Date(client.dateOfBirth).toISOString().split('T')[0] : "",
      serviceType: client?.serviceType || "",
      status: client?.status || "active",
      monthlyBudget: client?.monthlyBudget?.toString() || "",
      notes: client?.notes || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Clean up empty strings - only send fields that have values
      const payload: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        serviceType: data.serviceType,
        status: data.status,
      };
      
      // Only add optional fields if they have values
      if (data.email) payload.email = data.email;
      if (data.phone) payload.phone = data.phone;
      if (data.address) payload.address = data.address;
      if (data.dateOfBirth) payload.dateOfBirth = new Date(data.dateOfBirth);
      if (data.monthlyBudget) payload.monthlyBudget = data.monthlyBudget;
      if (data.notes) payload.notes = data.notes;

      if (isEditing) {
        return await apiRequest("PUT", `/api/clients/${client.id}`, payload);
      } else {
        return await apiRequest("POST", "/api/clients", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Success",
        description: `Client ${isEditing ? "updated" : "created"} successfully`,
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
        description: `Failed to ${isEditing ? "update" : "create"} client`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('clients.fields.firstName')}</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-first-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('clients.fields.lastName')}</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-last-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('clients.fields.email')}</FormLabel>
                <FormControl>
                  <Input type="email" {...field} data-testid="input-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('clients.fields.phone')}</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-phone" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('clients.fields.address')}</FormLabel>
              <FormControl>
                <Textarea {...field} data-testid="input-address" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('clients.fields.dateOfBirth')}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-date-of-birth" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="serviceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('clients.fields.serviceType')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-service-type">
                      <SelectValue placeholder={t('clients.placeholders.selectServiceType')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="personal-care">{t('clients.serviceTypes.personalCare')}</SelectItem>
                    <SelectItem value="home-support">{t('clients.serviceTypes.homeSupport')}</SelectItem>
                    <SelectItem value="medical-assistance">{t('clients.serviceTypes.medicalAssistance')}</SelectItem>
                    <SelectItem value="social-support">{t('clients.serviceTypes.socialSupport')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('clients.fields.status')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue placeholder={t('clients.placeholders.selectStatus')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">{t('clients.statusTypes.active')}</SelectItem>
                    <SelectItem value="inactive">{t('clients.statusTypes.inactive')}</SelectItem>
                    <SelectItem value="pending">{t('clients.statusTypes.pending')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="monthlyBudget"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('clients.fields.monthlyBudget')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...field}
                  data-testid="input-monthly-budget"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('clients.fields.notes')}</FormLabel>
              <FormControl>
                <RichTextEditor 
                  value={field.value} 
                  onChange={field.onChange}
                  placeholder={t('clients.placeholders.notes')}
                  className="min-h-[150px]"
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
            {t('common.cancel')}
          </Button>
          <Button 
            type="submit" 
            disabled={mutation.isPending}
            data-testid="button-submit"
          >
            {mutation.isPending ? t('common.saving') : isEditing ? t('clients.buttons.update') : t('clients.buttons.create')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
