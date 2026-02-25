"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, UserPlus } from "lucide-react";
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

const formSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const { push } = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", password: "" }
  });
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  useEffect(() => {
    checkAuth().then((ok) => {
      if (ok) push("/panel");
    });
  }, [push]);

  const handleSubmit = async () => {
    const { username, password } = form.getValues();
    if (!username || !password) return;

    setLoading(true);
    try {
      if (isRegister) {
        await register(username, password);
        toast.success("Account created");
      } else {
        await login(username, password);
      }
      push("/panel");
    } catch (e: any) {
      setLoading(false);
      const message = e.response?.data?.error || e.message;
      form.setError("password", { message });
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
              ? "Create a new administrator account."
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
                  </FormItem>
                )}/>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            className="w-full cursor-pointer"
            disabled={loading}
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
