"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      const result = await authClient.signIn.email({ email, password });

      if (result.error) {
        setError("No pudimos iniciar sesión. Revisá el email y la contraseña.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor. Intentá de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="tu@email.com"
          autoComplete="email"
          required
          className="h-11 bg-white px-3"
          aria-invalid={Boolean(error)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
        <Input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          required
          className="h-11 bg-white pr-12 pl-3"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "login-error" : undefined}
        />
        <button type="button" aria-label={showPassword ? "Ocultar clave" : "Mostrar clave"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute top-0 right-0 flex size-11 items-center justify-center rounded-r-lg text-muted-foreground hover:text-primary">{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button>
        </div>
      </div>
      {error && (
        <p id="login-error" role="alert" className="rounded-lg bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? <><LoaderCircle className="animate-spin" aria-hidden="true" />Ingresando…</> : <>Ingresar<ArrowRight aria-hidden="true" /></>}
      </Button>
    </form>
  );
}
