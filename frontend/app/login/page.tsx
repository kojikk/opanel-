"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, UserPlus, Check, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { login, register, checkAuth } from "@/lib/api-client";
import { Brand } from "@/components/logo";
import { PasswordInput } from "@/components/password-input";
import { Spinner } from "@/components/ui/spinner";
import { copyrightInfo } from "@/lib/global";
import { useKeydown } from "@/hooks/use-keydown";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  confirmPassword: z.string().min(1, "Confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "Lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { label: "Uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "Number", test: (pw) => /[0-9]/.test(pw) },
  { label: "Special character", test: (pw) => /[^a-zA-Z0-9]/.test(pw) },
];

function PasswordStrength({ password }: { password: string }) {
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const total = PASSWORD_RULES.length;

  if (!password) return null;

  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < passed
                ? passed <= 2 ? "bg-red-500" : passed <= 3 ? "bg-yellow-500" : "bg-green-500"
                : "bg-muted"
            }`}
          />
        ))}
      </div>
      <ul className="text-xs space-y-0.5">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li key={rule.label} className={`flex items-center gap-1 ${ok ? "text-green-500" : "text-muted-foreground"}`}>
              {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Login() {
  const { push } = useRouter();
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(isRegister ? registerSchema : loginSchema),
    defaultValues: { username: "", password: "", confirmPassword: "" },
  });

  const password = form.watch("password");

  const allRulesPassed = useMemo(
    () => PASSWORD_RULES.every((r) => r.test(password || "")),
    [password],
  );

  useEffect(() => {
    checkAuth().then((user) => {
      if (user) push("/panel");
    });
  }, [push]);

  // Clear confirmPassword when switching modes
  useEffect(() => {
    form.setValue("confirmPassword", "");
    form.clearErrors();
  }, [isRegister, form]);

  const handleSubmit = async () => {
    const valid = await form.trigger();
    if (!valid) return;

    const { username, password, confirmPassword } = form.getValues();
    if (!username || !password) return;

    setLoading(true);
    try {
      if (isRegister) {
        await register(username, password, confirmPassword);
        toast.success("Account created");
      } else {
        await login(username, password);
      }
      push("/panel");
    } catch (e: any) {
      setLoading(false);
      const message = e.response?.data?.error || e.message;
      // Show remaining attempts if provided
      const remaining = e.response?.data?.remainingAttempts;
      const fullMessage = remaining !== undefined
        ? `${message} (${remaining} attempts remaining)`
        : message;
      form.setError("password", { message: fullMessage });
    }
  };

  useKeydown("Enter", {}, () => handleSubmit());

  return (
    <div className="flex flex-col">
      <div className="flex flex-col items-center gap-8 mb-8">
        <Brand className="[&_svg]:w-72"/>
        <p className="text-lg text-muted-foreground">
          {isRegister ? "Create your account" : "Sign in to your panel"}
        </p>
      </div>
      <Card className="w-96">
        <CardHeader>
          <CardTitle className="flex gap-2 items-center mb-1">
            {isRegister ? <UserPlus /> : <KeyRound />}
            <span>{isRegister ? "Register" : "Login"}</span>
          </CardTitle>
          <CardDescription>
            {isRegister
              ? "Create a new account. The first account becomes the owner."
              : "Enter your credentials to access the panel."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <input
                      type="text"
                      placeholder="admin"
                      autoFocus
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      {...field}
                    />
                    <FormMessage />
                  </FormItem>
                )}/>
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <PasswordInput placeholder="Password" {...field}/>
                    <FormMessage />
                    {isRegister && <PasswordStrength password={field.value} />}
                  </FormItem>
                )}/>
              {isRegister && (
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <PasswordInput placeholder="Confirm password" {...field}/>
                      <FormMessage />
                    </FormItem>
                  )}/>
              )}
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            className="w-full cursor-pointer"
            disabled={loading || (isRegister && !allRulesPassed)}
            onClick={() => handleSubmit()}>
            {loading && <Spinner />}
            {isRegister ? "Create Account" : "Sign In"}
          </Button>
          <Button
            variant="link"
            className="text-sm"
            onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? "Already have an account? Sign in" : "Need an account? Register"}
          </Button>
        </CardFooter>
      </Card>
      <div className="flex justify-between items-center mt-2 px-2 text-sm">
        <span className="text-muted-foreground">{copyrightInfo}</span>
        <Button variant="link" size="sm" asChild>
          <Link href="/about">About</Link>
        </Button>
      </div>
    </div>
  );
}
