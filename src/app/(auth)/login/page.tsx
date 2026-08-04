"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient, supabaseConfigurado } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [cargando, setCargando] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Introduce tu correo y contraseña.");
      return;
    }
    setCargando(true);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.message("Supabase no está configurado todavía.", {
        description: "Accediendo en modo de demostración con datos locales.",
      });
      router.push("/");
      setCargando(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setCargando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.push("/");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Accede a tu panel de ContaControl.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-4">
          {!supabaseConfigurado && (
            <p className="text-xs rounded-lg bg-info-bg text-info px-3 py-2">
              Supabase aún no está conectado. Puedes explorar la aplicación en modo de demostración.
            </p>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Contraseña</Label>
              <Link href="/recuperar-password" className="text-xs text-primary hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={cargando}>
            {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
            Iniciar sesión
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
