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
import { METODOS_PAGO } from "@/lib/constants";
import type { Gasto } from "@/lib/types";
import { todayISO } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gasto?: Gasto;
}

export function GastoFormDialog({ open, onOpenChange, gasto }: Props) {
  const esEdicion = !!gasto;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar gasto" : "Registrar gasto"}</DialogTitle>
          <DialogDescription>Introduce los detalles del gasto.</DialogDescription>
        </DialogHeader>
        {/* Se monta de nuevo cada vez que se abre, para partir siempre de datos frescos. */}
        {open && <GastoFormulario gasto={gasto} esEdicion={esEdicion} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  );
}

function GastoFormulario({
  gasto,
  esEdicion,
  onOpenChange,
}: {
  gasto?: Gasto;
  esEdicion: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { crearGasto, actualizarGasto, categoriasGasto } = useData();
  const categoriasActivas = categoriasGasto.filter((c) => !c.archivada);

  const [form, setForm] = React.useState(() => valoresIniciales(gasto, categoriasActivas[0]?.id));

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.descripcion.trim()) {
      toast.error("La descripción es obligatoria.");
      return;
    }
    if (form.importe <= 0) {
      toast.error("El importe debe ser mayor que cero.");
      return;
    }
    if (!form.categoriaId) {
      toast.error("Selecciona una categoría.");
      return;
    }

    if (esEdicion && gasto) {
      actualizarGasto(gasto.id, form);
      toast.success("Gasto actualizado correctamente.");
    } else {
      crearGasto(form);
      toast.success("Gasto registrado correctamente.");
    }
    onOpenChange(false);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 grid gap-1.5">
          <Label htmlFor="descripcion">Descripción *</Label>
          <Input id="descripcion" value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label>Categoría *</Label>
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
          <Input id="proveedor" value={form.proveedor} onChange={(e) => set("proveedor", e.target.value)} />
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
          <Select value={form.estado} onValueChange={(v) => set("estado", v as Gasto["estado"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="pagado">Pagado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="vencimiento">Fecha de vencimiento</Label>
          <Input
            id="vencimiento"
            type="date"
            value={form.fechaVencimiento}
            onChange={(e) => set("fechaVencimiento", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Método de pago</Label>
          <Select value={form.metodoPago} onValueChange={(v) => set("metodoPago", v as Gasto["metodoPago"])}>
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
          <Select value={form.tipo} onValueChange={(v) => set("tipo", v as Gasto["tipo"])}>
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
          <Label>Deducible</Label>
          <Select value={form.deducible} onValueChange={(v) => set("deducible", v as Gasto["deducible"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="si">Sí</SelectItem>
              <SelectItem value="no">No</SelectItem>
              <SelectItem value="revisar">Por revisar</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="recurrente">¿Es recurrente?</Label>
          <Select value={form.recurrente ? "si" : "no"} onValueChange={(v) => set("recurrente", v === "si")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">Puntual</SelectItem>
              <SelectItem value="si">Recurrente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="nif">NIF del proveedor</Label>
          <Input id="nif" value={form.nifProveedor} onChange={(e) => set("nifProveedor", e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="factura">Número de factura o recibo</Label>
          <Input id="factura" value={form.numeroFactura} onChange={(e) => set("numeroFactura", e.target.value)} />
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
        <Button type="submit">{esEdicion ? "Guardar cambios" : "Registrar gasto"}</Button>
      </DialogFooter>
    </form>
  );
}

function valoresIniciales(gasto?: Gasto, categoriaPorDefecto?: string) {
  return {
    fecha: gasto?.fecha ?? todayISO(),
    descripcion: gasto?.descripcion ?? "",
    categoriaId: gasto?.categoriaId ?? categoriaPorDefecto ?? "",
    proveedor: gasto?.proveedor ?? "",
    importe: gasto?.importe ?? 0,
    estado: gasto?.estado ?? ("pendiente" as Gasto["estado"]),
    fechaVencimiento: gasto?.fechaVencimiento ?? "",
    metodoPago: gasto?.metodoPago ?? ("transferencia" as Gasto["metodoPago"]),
    tipo: gasto?.tipo ?? ("profesional" as Gasto["tipo"]),
    recurrente: gasto?.recurrente ?? false,
    pagoRecurrenteId: gasto?.pagoRecurrenteId,
    deducible: gasto?.deducible ?? ("revisar" as Gasto["deducible"]),
    nifProveedor: gasto?.nifProveedor ?? "",
    numeroFactura: gasto?.numeroFactura ?? "",
    notas: gasto?.notas ?? "",
  };
}
