import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { insertStaffSchema } from "@shared/schema";
import type { StaffWithRates, InsertStaff } from "@shared/schema";
import { z } from "zod";
import { useState } from "react";

interface StaffFormProps {
  staff?: StaffWithRates;
  onSuccess: () => void;
}

const formSchema = insertStaffSchema.extend({
  hireDate: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function StaffForm({ staff, onSuccess }: StaffFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!staff;
  const [specializationInput, setSpecializationInput] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: staff?.firstName || "",
      lastName: staff?.lastName || "",
      email: staff?.email || "",
      phone: staff?.phone || "",
      weekdayRate: staff?.weekdayRate || "15.00",
      holidayRate: staff?.holidayRate || "20.00",
      mileageRate: staff?.mileageRate || "0.50",
      specializations: staff?.specializations || [],
      status: staff?.status || "active",
      hireDate: staff?.hireDate ? new Date(staff.hireDate).toISOString().split('T')[0] : "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: InsertStaff = {
        ...data,
        hireDate: data.hireDate ? new Date(data.hireDate) : null,
      };

      if (isEditing) {
        return await apiRequest("PUT", `/api/staff/${staff.id}`, payload);
      } else {
        return await apiRequest("POST", "/api/staff", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Success",
        description: `Staff member ${isEditing ? "updated" : "created"} successfully`,
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
        description: `Failed to ${isEditing ? "update" : "create"} staff member`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const addSpecialization = () => {
    if (specializationInput.trim()) {
      const currentSpecs = form.getValues("specializations") || [];
      if (!currentSpecs.includes(specializationInput.trim())) {
        form.setValue("specializations", [...currentSpecs, specializationInput.trim()]);
      }
      setSpecializationInput("");
    }
  };

  const removeSpecialization = (specToRemove: string) => {
    const currentSpecs = form.getValues("specializations") || [];
    form.setValue("specializations", currentSpecs.filter(spec => spec !== specToRemove));
  };

  const handleSpecializationKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSpecialization();
    }
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
                <FormLabel>First Name</FormLabel>
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
                <FormLabel>Last Name</FormLabel>
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
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} value={field.value || ""} data-testid="input-email" />
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
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} data-testid="input-phone" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="weekdayRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weekday Rate (€/hour)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...field}
                    data-testid="input-weekday-rate"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="holidayRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Holiday Rate (€/hour)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...field}
                    data-testid="input-holiday-rate"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mileageRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mileage Rate (€/km)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...field}
                    data-testid="input-mileage-rate"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hireDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hire Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-hire-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="specializations"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Specializations</FormLabel>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={specializationInput}
                    onChange={(e) => setSpecializationInput(e.target.value)}
                    onKeyPress={handleSpecializationKeyPress}
                    placeholder="Add specialization..."
                    data-testid="input-specialization"
                  />
                  <Button
                    type="button"
                    onClick={addSpecialization}
                    variant="outline"
                    data-testid="button-add-specialization"
                  >
                    Add
                  </Button>
                </div>
                
                {field.value && field.value.length > 0 && (
                  <div className="flex flex-wrap gap-2" data-testid="specializations-list">
                    {field.value.map((spec, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {spec}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 hover:bg-transparent"
                          onClick={() => removeSpecialization(spec)}
                          data-testid={`button-remove-specialization-${index}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
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
            {mutation.isPending ? "Saving..." : isEditing ? "Update Staff Member" : "Create Staff Member"}
          </Button>
        </div>
      </form>
    </Form>
  );
}