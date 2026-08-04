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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useData } from "@/lib/store";
import { METODOS_PAGO, CATEGORIAS_INGRESO_INICIALES } from "@/lib/constants";
import type { Ingreso } from "@/lib/types";
import { todayISO } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingreso?: Ingreso;
}

export function IngresoOtroFormDialog({ open, onOpenChange, ingreso }: Props) {
  const esEdicion = !!ingreso;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar ingreso" : "Registrar otro ingreso"}</DialogTitle>
          <DialogDescription>Ingresos que no corresponden a mensualidades de clientes.</DialogDescription>
        </DialogHeader>
        {/* Se monta de nuevo cada vez que se abre, para partir siempre de datos frescos. */}
        {open && <IngresoOtroFormulario ingreso={ingreso} esEdicion={esEdicion} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  );
}

function IngresoOtroFormulario({
  ingreso,
  esEdicion,
  onOpenChange,
}: {
  ingreso?: Ingreso;
  esEdicion: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { crearIngreso, actualizarIngreso } = useData();
  const [form, setForm] = React.useState(() => valoresIniciales(ingreso));

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.concepto.trim()) {
      toast.error("El concepto es obligatorio.");
      return;
    }
    if (form.importe <= 0) {
      toast.error("El importe debe ser mayor que cero.");
      return;
    }

    if (esEdicion && ingreso) {
      actualizarIngreso(ingreso.id, form);
      toast.success("Ingreso actualizado correctamente.");
    } else {
      crearIngreso({ ...form, tipo: "otro" });
      toast.success("Ingreso registrado correctamente.");
    }
    onOpenChange(false);
  }

  return (
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 grid gap-1.5">
              <Label htmlFor="concepto">Concepto *</Label>
              <Input id="concepto" value={form.concepto} onChange={(e) => set("concepto", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Categoría</Label>
              <Select value={form.categoria} onValueChange={(v) => set("categoria", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_INGRESO_INICIALES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="importe">Importe (€) *</Label>
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
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => set("estado", v as Ingreso["estado"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                  <SelectItem value="cobrado">Cobrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Método de pago</Label>
              <Select value={form.metodoPago} onValueChange={(v) => set("metodoPago", v as Ingreso["metodoPago"])}>
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
              <Label htmlFor="factura">Número de factura o recibo</Label>
              <Input
                id="factura"
                value={form.numeroFactura}
                onChange={(e) => set("numeroFactura", e.target.value)}
              />
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
        <Button type="submit">{esEdicion ? "Guardar cambios" : "Registrar ingreso"}</Button>
      </DialogFooter>
    </form>
  );
}

function valoresIniciales(ingreso?: Ingreso) {
  const hoy = todayISO();
  return {
    fecha: ingreso?.fecha ?? hoy,
    concepto: ingreso?.concepto ?? "",
    categoria: ingreso?.categoria ?? CATEGORIAS_INGRESO_INICIALES[CATEGORIAS_INGRESO_INICIALES.length - 1],
    mesCorrespondiente: ingreso?.mesCorrespondiente ?? hoy.slice(0, 7),
    importe: ingreso?.importe ?? 0,
    metodoPago: ingreso?.metodoPago ?? ("transferencia" as Ingreso["metodoPago"]),
    estado: ingreso?.estado ?? ("cobrado" as Ingreso["estado"]),
    numeroFactura: ingreso?.numeroFactura ?? "",
    notas: ingreso?.notas ?? "",
  };
}
