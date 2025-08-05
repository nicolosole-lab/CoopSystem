import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, User as UserIcon, Shield } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Profile form schema
const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

// Password change schema
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function Profile() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Fetch user profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/user/profile"],
    enabled: !!user,
  });

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      address: "",
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const res = await apiRequest("PUT", "/api/user/profile", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: t("profile.updateSuccess"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      setIsEditingProfile(false);
    },
    onError: () => {
      toast({
        title: t("profile.updateFailed"),
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      const res = await apiRequest("PUT", "/api/user/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: t("profile.passwordChanged"),
      });
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: t("profile.passwordChangeFailed"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set form values when profile data is loaded
  if (profile && !profileForm.formState.isDirty) {
    profileForm.reset({
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      phone: profile.phone || "",
      address: profile.address || "",
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-border" data-testid="loader-profile" />
      </div>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "manager":
        return "default";
      default:
        return "secondary";
    }
  };

  const getInitials = () => {
    if (profile?.firstName && profile?.lastName) {
      return `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();
    }
    return "U";
  };

  return (
    <div className="h-full w-full p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-profile-title">
            {t("profile.title")}
          </h1>
          <p className="text-muted-foreground mt-2" data-testid="text-profile-description">
            {t("profile.description")}
          </p>
        </div>

        {/* Profile Header */}
        <Card data-testid="card-profile-header">
          <CardContent className="flex items-center gap-6 p-6">
            <Avatar className="h-24 w-24" data-testid="avatar-user">
              <AvatarImage src={profile?.profilePicture} />
              <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold" data-testid="text-user-name">
                {profile?.firstName} {profile?.lastName}
              </h2>
              <p className="text-muted-foreground" data-testid="text-user-email">{profile?.email}</p>
              <div className="mt-2 flex items-center gap-4">
                <Badge variant={getRoleBadgeColor(profile?.role || "")} data-testid="badge-user-role">
                  {t(`profile.roles.${profile?.role || "staff"}`)}
                </Badge>
                <span className="text-sm text-muted-foreground" data-testid="text-member-since">
                  {t("profile.memberSince")} {profile?.createdAt && new Date(profile.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="w-full" data-testid="tabs-profile">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2" data-testid="tab-profile">
              <UserIcon className="h-4 w-4" />
              {t("profile.tabs.profile")}
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2" data-testid="tab-security">
              <Shield className="h-4 w-4" />
              {t("profile.tabs.security")}
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card data-testid="card-personal-info">
              <CardHeader>
                <CardTitle>{t("profile.personalInfo")}</CardTitle>
                <CardDescription>{t("profile.personalInfoDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {isEditingProfile ? (
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("profile.firstName")}</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-first-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("profile.lastName")}</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-last-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={profileForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("profile.phone")}</FormLabel>
                            <FormControl>
                              <Input {...field} type="tel" data-testid="input-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("profile.address")}</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-address" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          disabled={updateProfileMutation.isPending}
                          data-testid="button-save-profile"
                        >
                          {updateProfileMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {t("profile.saveChanges")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsEditingProfile(false);
                            profileForm.reset();
                          }}
                          data-testid="button-cancel-profile"
                        >
                          {t("profile.cancel")}
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">{t("profile.firstName")}</Label>
                        <p className="mt-1 font-medium" data-testid="text-first-name">{profile?.firstName || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{t("profile.lastName")}</Label>
                        <p className="mt-1 font-medium" data-testid="text-last-name">{profile?.lastName || "-"}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t("profile.email")}</Label>
                      <p className="mt-1 font-medium" data-testid="text-email">{profile?.email}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t("profile.phone")}</Label>
                      <p className="mt-1 font-medium" data-testid="text-phone">{profile?.phone || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t("profile.address")}</Label>
                      <p className="mt-1 font-medium" data-testid="text-address">{profile?.address || "-"}</p>
                    </div>
                    <Button onClick={() => setIsEditingProfile(true)} data-testid="button-edit-profile">
                      {t("profile.editProfile")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <Card data-testid="card-change-password">
              <CardHeader>
                <CardTitle>{t("profile.changePassword")}</CardTitle>
                <CardDescription>{t("profile.changePasswordDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit((data) => changePasswordMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("profile.currentPassword")}</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" data-testid="input-current-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("profile.newPassword")}</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" data-testid="input-new-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("profile.confirmPassword")}</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" data-testid="input-confirm-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      data-testid="button-update-password"
                    >
                      {changePasswordMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {t("profile.updatePassword")}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}