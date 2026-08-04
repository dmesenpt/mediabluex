"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient, supabaseConfigurado } from "@/lib/supabase/client";

export default function RecuperarPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [cargando, setCargando] = React.useState(false);
  const [enviado, setEnviado] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error("Introduce tu correo electrónico.");
      return;
    }
    setCargando(true);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.message("Supabase no está configurado todavía.");
      setEnviado(true);
      setCargando(false);
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/restablecer-password`,
    });
    setCargando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <Card>
        <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success">
            <MailCheck className="h-6 w-6" />
          </div>
          <p className="font-medium">Revisa tu correo</p>
          <p className="text-sm text-muted-foreground">
            Si existe una cuenta asociada a {email}, recibirás un enlace para restablecer tu contraseña.
          </p>
          <Button asChild variant="outline" className="mt-2 w-full">
            <Link href="/login">Volver al inicio de sesión</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar contraseña</CardTitle>
        <CardDescription>Te enviaremos un enlace para restablecerla.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-4">
          {!supabaseConfigurado && (
            <p className="text-xs rounded-lg bg-info-bg text-info px-3 py-2">
              Supabase aún no está conectado. Esta pantalla funcionará en cuanto se configure.
            </p>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={cargando}>
            {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar enlace de recuperación
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/login">
              <ArrowLeft className="h-4 w-4" /> Volver al inicio de sesión
            </Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
