"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useData } from "@/lib/store";
import { METODOS_PAGO, FRECUENCIAS } from "@/lib/constants";
import type { PagoRecurrente } from "@/lib/types";
import { todayISO } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pago?: PagoRecurrente;
}

export function PagoRecurrenteFormDialog({ open, onOpenChange, pago }: Props) {
  const esEdicion = !!pago;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar pago recurrente" : "Nuevo pago recurrente"}</DialogTitle>
          <DialogDescription>
            El sistema generará automáticamente las próximas obligaciones, pero nunca las marcará
            como pagadas sin tu confirmación.
          </DialogDescription>
        </DialogHeader>
        {/* Se monta de nuevo cada vez que se abre, para partir siempre de datos frescos. */}
        {open && <PagoRecurrenteFormulario pago={pago} esEdicion={esEdicion} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  );
}

function PagoRecurrenteFormulario({
  pago,
  esEdicion,
  onOpenChange,
}: {
  pago?: PagoRecurrente;
  esEdicion: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { crearPagoRecurrente, actualizarPagoRecurrente, categoriasGasto } = useData();
  const categoriasActivas = categoriasGasto.filter((c) => !c.archivada);
  const [form, setForm] = React.useState(() => valoresIniciales(pago, categoriasActivas[0]?.id));

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    if (form.importe <= 0) {
      toast.error("El importe debe ser mayor que cero.");
      return;
    }
    if (!form.proximaFecha) {
      toast.error("Indica la próxima fecha de vencimiento.");
      return;
    }

    if (esEdicion && pago) {
      actualizarPagoRecurrente(pago.id, form);
      toast.success("Pago recurrente actualizado.");
    } else {
      crearPagoRecurrente(form);
      toast.success("Pago recurrente creado.");
    }
    onOpenChange(false);
  }

  return (
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 grid gap-1.5">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Categoría</Label>
              <Select value={form.categoriaId} onValueChange={(v) => set("categoriaId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categoriasActivas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="proveedor">Proveedor</Label>
              <Input
                id="proveedor"
                value={form.proveedor}
                onChange={(e) => set("proveedor", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="importe">Importe estimado o fijo (€) *</Label>
              <Input
                id="importe"
                type="number"
                min={0}
                step="0.01"
                value={form.importe}
                onChange={(e) => set("importe", Number(e.target.value))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Frecuencia</Label>
              <Select
                value={form.frecuencia}
                onValueChange={(v) => set("frecuencia", v as PagoRecurrente["frecuencia"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FRECUENCIAS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="proximaFecha">Próxima fecha de vencimiento *</Label>
              <Input
                id="proximaFecha"
                type="date"
                value={form.proximaFecha}
                onChange={(e) => set("proximaFecha", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inicio">Fecha de inicio</Label>
              <Input
                id="inicio"
                type="date"
                value={form.fechaInicio}
                onChange={(e) => set("fechaInicio", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fin">Fecha de finalización (opcional)</Label>
              <Input id="fin" type="date" value={form.fechaFin} onChange={(e) => set("fechaFin", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Método de pago</Label>
              <Select
                value={form.metodoPago}
                onValueChange={(v) => set("metodoPago", v as PagoRecurrente["metodoPago"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METODOS_PAGO.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => set("tipo", v as PagoRecurrente["tipo"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profesional">Profesional</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dias">Avisar con días de anticipación</Label>
              <Input
                id="dias"
                type="number"
                min={0}
                value={form.diasAviso}
                onChange={(e) => set("diasAviso", Number(e.target.value))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label htmlFor="autogenerar" className="cursor-pointer">
                Generar gasto automáticamente
              </Label>
              <Switch
                id="autogenerar"
                checked={form.generarGastoAutomatico}
                onCheckedChange={(v) => set("generarGastoAutomatico", v)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label htmlFor="activo" className="cursor-pointer">
                Activo
              </Label>
              <Switch id="activo" checked={form.activo} onCheckedChange={(v) => set("activo", v)} />
            </div>
            <div className="sm:col-span-2 grid gap-1.5">
              <Label htmlFor="notas">Notas</Label>
              <Textarea id="notas" value={form.notas} onChange={(e) => set("notas", e.target.value)} rows={3} />
            </div>
          </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="submit">{esEdicion ? "Guardar cambios" : "Crear pago recurrente"}</Button>
      </DialogFooter>
    </form>
  );
}

function valoresIniciales(pago?: PagoRecurrente, categoriaPorDefecto?: string) {
  return {
    nombre: pago?.nombre ?? "",
    categoriaId: pago?.categoriaId ?? categoriaPorDefecto ?? "",
    proveedor: pago?.proveedor ?? "",
    importe: pago?.importe ?? 0,
    frecuencia: pago?.frecuencia ?? ("mensual" as PagoRecurrente["frecuencia"]),
    proximaFecha: pago?.proximaFecha ?? todayISO(),
    fechaInicio: pago?.fechaInicio ?? todayISO(),
    fechaFin: pago?.fechaFin ?? "",
    metodoPago: pago?.metodoPago ?? ("debito_directo" as PagoRecurrente["metodoPago"]),
    tipo: pago?.tipo ?? ("profesional" as PagoRecurrente["tipo"]),
    generarGastoAutomatico: pago?.generarGastoAutomatico ?? false,
    diasAviso: pago?.diasAviso ?? 5,
    activo: pago?.activo ?? true,
    notas: pago?.notas ?? "",
  };
}
