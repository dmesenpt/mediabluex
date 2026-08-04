"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient, supabaseConfigurado } from "@/lib/supabase/client";

export default function RestablecerPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirmacion, setConfirmacion] = React.useState("");
  const [cargando, setCargando] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmacion) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    setCargando(true);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.message("Supabase no está configurado todavía.");
      setCargando(false);
      router.push("/login");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    setCargando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contraseña actualizada correctamente.");
    router.push("/login");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cambiar contraseña</CardTitle>
        <CardDescription>Elige una nueva contraseña para tu cuenta.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-4">
          {!supabaseConfigurado && (
            <p className="text-xs rounded-lg bg-info-bg text-info px-3 py-2">
              Supabase aún no está conectado. Esta pantalla funcionará en cuanto se configure.
            </p>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="password">Nueva contraseña</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="confirmacion">Confirmar contraseña</Label>
            <Input
              id="confirmacion"
              type="password"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={cargando}>
            {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
            Cambiar contraseña
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
