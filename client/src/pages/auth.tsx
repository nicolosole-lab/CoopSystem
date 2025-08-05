import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "../../../shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";
import { z } from "zod";
import { useTranslation } from 'react-i18next';

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = insertUserSchema.extend({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LocalLoginData = z.infer<typeof loginSchema>;
type LocalRegisterData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { t } = useTranslation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "staff",
    },
  });

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const onLogin = (data: LocalLoginData) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: LocalRegisterData) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{activeTab === 'login' ? t('auth.login.title') : t('auth.register.title')}</CardTitle>
            <CardDescription>
              {activeTab === 'login' ? t('auth.login.subtitle') : t('auth.register.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{t('auth.login.title')}</TabsTrigger>
                <TabsTrigger value="register">{t('auth.register.title')}</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('auth.login.emailLabel')}</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder={t('auth.login.emailPlaceholder')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('auth.login.passwordLabel')}</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder={t('auth.login.passwordPlaceholder')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('auth.login.signingIn')}
                        </>
                      ) : (
                        t('auth.login.submit')
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('auth.register.firstNameLabel')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('auth.register.firstNamePlaceholder')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('auth.register.lastNameLabel')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('auth.register.lastNamePlaceholder')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('auth.register.emailLabel')}</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder={t('auth.register.emailPlaceholder')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('auth.register.passwordLabel')}</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder={t('auth.register.passwordPlaceholder')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('auth.register.creatingAccount')}
                        </>
                      ) : (
                        t('auth.register.submit')
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Right side - Hero section */}
      <div className="hidden lg:flex flex-1 bg-primary/10 items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <h2 className="text-3xl font-bold mb-4">{t('auth.hero.title')}</h2>
          <p className="text-lg text-muted-foreground mb-6">
            {t('auth.hero.subtitle')}
          </p>
          <div className="space-y-4 text-left">
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
              <div>
                <h3 className="font-semibold">{t('auth.hero.features.clientManagement.title')}</h3>
                <p className="text-sm text-muted-foreground">{t('auth.hero.features.clientManagement.description')}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
              <div>
                <h3 className="font-semibold">{t('auth.hero.features.staffManagement.title')}</h3>
                <p className="text-sm text-muted-foreground">{t('auth.hero.features.staffManagement.description')}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
              <div>
                <h3 className="font-semibold">{t('auth.hero.features.timeTracking.title')}</h3>
                <p className="text-sm text-muted-foreground">{t('auth.hero.features.timeTracking.description')}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
              <div>
                <h3 className="font-semibold">{t('auth.hero.features.budgetManagement.title')}</h3>
                <p className="text-sm text-muted-foreground">{t('auth.hero.features.budgetManagement.description')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}