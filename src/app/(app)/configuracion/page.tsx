"use client";

import * as React from "react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { Download, Upload, RotateCcw, Tags, Image as ImageIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CategoriasGastoSheet } from "@/components/gastos/categorias-gasto-sheet";
import { useData } from "@/lib/store";
import { crearConfiguracionInicial } from "@/lib/mock-data";
import { MONEDAS, ZONAS_HORARIAS, METODOS_PAGO, MESES, CATEGORIAS_INGRESO_INICIALES } from "@/lib/constants";
import type { MetodoPago } from "@/lib/types";

export default function ConfiguracionPage() {
  const { hydrated } = useData();

  if (!hydrated) {
    return <div className="text-sm text-muted-foreground">Cargando…</div>;
  }

  return <ConfiguracionFormulario />;
}

function ConfiguracionFormulario() {
  const { configuracion, actualizarConfiguracion, exportarDatos, importarDatos, reiniciarDatos } = useData();
  const { theme, setTheme } = useTheme();
  // Se monta una sola vez, después de la hidratación de los datos guardados,
  // por lo que el valor inicial de configuracion ya es el definitivo.
  const [form, setForm] = React.useState(() => configuracion);
  const [categoriasAbierto, setCategoriasAbierto] = React.useState(false);
  const [confirmReiniciar, setConfirmReiniciar] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function guardar() {
    actualizarConfiguracion(form);
    toast.success("Configuración guardada correctamente.");
  }

  function toggleMetodo(metodo: MetodoPago) {
    const activos = form.metodosPagoActivos.includes(metodo)
      ? form.metodosPagoActivos.filter((m) => m !== metodo)
      : [...form.metodosPagoActivos, metodo];
    set("metodosPagoActivos", activos);
  }

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("logoUrl", reader.result as string);
    reader.readAsDataURL(file);
  }

  function descargarCopia() {
    const json = exportarDatos();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacontrol-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Copia de seguridad descargada.");
  }

  function handleImportar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importarDatos(reader.result as string);
      if (ok) toast.success("Datos importados correctamente.");
      else toast.error("El archivo no tiene un formato válido.");
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div>
      <PageHeader title="Configuración" description="Personaliza ContaControl según tus necesidades." />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos del negocio</CardTitle>
            <CardDescription>Esta información aparecerá en tus informes y documentos.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={form.logoUrl} alt="Logotipo" />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {(form.nombreNegocio || form.nombreApp).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                  <ImageIcon className="h-3.5 w-3.5" /> Cambiar logotipo
                </Button>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="nombreApp">Nombre de la aplicación</Label>
              <Input id="nombreApp" value={form.nombreApp} onChange={(e) => set("nombreApp", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="nombreNegocio">Nombre del profesional o negocio</Label>
              <Input id="nombreNegocio" value={form.nombreNegocio} onChange={(e) => set("nombreNegocio", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="nif">NIF</Label>
                <Input id="nif" value={form.nif} onChange={(e) => set("nif", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" value={form.telefono} onChange={(e) => set("telefono", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="direccion">Dirección</Label>
              <Input id="direccion" value={form.direccion} onChange={(e) => set("direccion", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Localización</CardTitle>
            <CardDescription>Moneda, idioma, zona horaria y año fiscal.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Moneda</Label>
                <Select value={form.moneda} onValueChange={(v) => set("moneda", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONEDAS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Idioma</Label>
                <Select value={form.idioma} onValueChange={(v) => set("idioma", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Zona horaria</Label>
              <Select value={form.zonaHoraria} onValueChange={(v) => set("zonaHoraria", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ZONAS_HORARIAS.map((z) => (
                    <SelectItem key={z} value={z}>
                      {z}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Día de inicio del año fiscal</Label>
              <Select value={String(form.inicioAnioFiscal)} onValueChange={(v) => set("inicioAnioFiscal", Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>
                      1 de {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Apariencia</Label>
              <Select value={theme ?? "system"} onValueChange={setTheme}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Modo claro</SelectItem>
                  <SelectItem value="dark">Modo oscuro</SelectItem>
                  <SelectItem value="system">Igual que el sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Métodos de pago</CardTitle>
            <CardDescription>Selecciona los métodos que aparecerán al registrar movimientos.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {METODOS_PAGO.map((m) => (
              <label key={m.value} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={form.metodosPagoActivos.includes(m.value)} onCheckedChange={() => toggleMetodo(m.value)} />
                {m.label}
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Categorías</CardTitle>
            <CardDescription>Gestiona las categorías de ingresos y gastos.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Categorías de gastos</p>
                <p className="text-xs text-muted-foreground">Crea, edita y archiva categorías personalizadas.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCategoriasAbierto(true)}>
                <Tags className="h-3.5 w-3.5" /> Gestionar
              </Button>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium mb-2">Categorías de ingresos</p>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIAS_INGRESO_INICIALES.map((c) => (
                  <span key={c} className="text-xs rounded-full bg-muted px-2.5 py-1">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notificaciones</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Activar notificaciones</p>
                <p className="text-xs text-muted-foreground">Avisos de vencimientos y pagos recurrentes.</p>
              </div>
              <Switch checked={form.notificacionesActivas} onCheckedChange={(v) => set("notificacionesActivas", v)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dias">Días de anticipación para recordatorios</Label>
              <Input
                id="dias"
                type="number"
                min={0}
                value={form.diasAnticipacionRecordatorio}
                onChange={(e) => set("diasAnticipacionRecordatorio", Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Copias de seguridad y datos</CardTitle>
            <CardDescription>Exporta o restaura toda la información de la aplicación.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Copia de seguridad automática</p>
                <p className="text-xs text-muted-foreground">Guarda tus datos localmente en cada cambio.</p>
              </div>
              <Switch
                checked={form.copiaSeguridadAutomatica}
                onCheckedChange={(v) => set("copiaSeguridadAutomatica", v)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={descargarCopia}>
                <Download className="h-4 w-4" /> Exportar datos (.json)
              </Button>
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> Importar datos
              </Button>
              <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportar} />
              <Button type="button" variant="outline" className="text-danger" onClick={() => setConfirmReiniciar(true)}>
                <RotateCcw className="h-4 w-4" /> Restaurar datos de ejemplo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-20 lg:bottom-4 mt-6 flex justify-end">
        <Button size="lg" onClick={guardar} className="shadow-lg">
          Guardar cambios
        </Button>
      </div>

      <CategoriasGastoSheet open={categoriasAbierto} onOpenChange={setCategoriasAbierto} />
      <ConfirmDialog
        open={confirmReiniciar}
        onOpenChange={setConfirmReiniciar}
        title="¿Restaurar los datos de ejemplo?"
        description="Se perderán todos los cambios realizados y se restaurarán los datos de demostración iniciales."
        confirmLabel="Restaurar"
        destructive
        onConfirm={() => {
          reiniciarDatos();
          setForm(crearConfiguracionInicial());
          toast.success("Datos restaurados.");
          setConfirmReiniciar(false);
        }}
      />
    </div>
  );
}
