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
import { PAISES, TIPOS_CLIENTE, ESTADOS_CLIENTE } from "@/lib/constants";
import type { Cliente } from "@/lib/types";
import { todayISO } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente?: Cliente;
  onCreated?: (cliente: Cliente) => void;
}

export function ClienteFormDialog({ open, onOpenChange, cliente, onCreated }: Props) {
  const esEdicion = !!cliente;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>
            Completa los datos del cliente. Los campos marcados con * son obligatorios.
          </DialogDescription>
        </DialogHeader>
        {/* Se monta de nuevo cada vez que se abre, para partir siempre de datos frescos. */}
        {open && (
          <ClienteFormulario
            cliente={cliente}
            esEdicion={esEdicion}
            onOpenChange={onOpenChange}
            onCreated={onCreated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ClienteFormulario({
  cliente,
  esEdicion,
  onOpenChange,
  onCreated,
}: {
  cliente?: Cliente;
  esEdicion: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (cliente: Cliente) => void;
}) {
  const { crearCliente, actualizarCliente } = useData();
  const [form, setForm] = React.useState(() => valoresIniciales(cliente));

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      toast.error("El nombre o razón social es obligatorio.");
      return;
    }
    if (!form.nif.trim()) {
      toast.error("El NIF es obligatorio.");
      return;
    }
    if (form.importeMensual < 0) {
      toast.error("El importe mensual no puede ser negativo.");
      return;
    }
    if (form.diaVencimiento < 1 || form.diaVencimiento > 31) {
      toast.error("El día de vencimiento debe estar entre 1 y 31.");
      return;
    }

    if (esEdicion && cliente) {
      actualizarCliente(cliente.id, form);
      toast.success("Cliente actualizado correctamente.");
    } else {
      const nuevo = crearCliente(form);
      toast.success("Cliente creado correctamente.");
      onCreated?.(nuevo);
    }
    onOpenChange(false);
  }

  return (
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 grid gap-1.5">
              <Label htmlFor="nombre">Nombre o razón social *</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                placeholder="Ej. Padaria Bom Sabor, Lda."
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Tipo de cliente</Label>
              <Select value={form.tipo} onValueChange={(v) => set("tipo", v as Cliente["tipo"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_CLIENTE.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Cliente fijo o temporal</Label>
              <Select
                value={form.categoria}
                onValueChange={(v) => set("categoria", v as Cliente["categoria"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fijo">Fijo</SelectItem>
                  <SelectItem value="temporal">Temporal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="nif">NIF / identificación fiscal *</Label>
              <Input id="nif" value={form.nif} onChange={(e) => set("nif", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => set("estado", v as Cliente["estado"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_CLIENTE.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="contacto">Persona de contacto</Label>
              <Input
                id="contacto"
                value={form.personaContacto}
                onChange={(e) => set("personaContacto", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" value={form.telefono} onChange={(e) => set("telefono", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>País</Label>
              <Select value={form.pais} onValueChange={(v) => set("pais", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAISES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 grid gap-1.5">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={form.direccion}
                onChange={(e) => set("direccion", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 grid gap-1.5">
              <Label htmlFor="servicio">Servicio contratado</Label>
              <Input
                id="servicio"
                value={form.servicioContratado}
                onChange={(e) => set("servicioContratado", e.target.value)}
                placeholder="Ej. Contabilidad mensual + IVA"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="importe">Importe mensual acordado (€)</Label>
              <Input
                id="importe"
                type="number"
                min={0}
                step="0.01"
                value={form.importeMensual}
                onChange={(e) => set("importeMensual", Number(e.target.value))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dia">Día habitual de vencimiento</Label>
              <Input
                id="dia"
                type="number"
                min={1}
                max={31}
                value={form.diaVencimiento}
                onChange={(e) => set("diaVencimiento", Number(e.target.value))}
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
              <Label htmlFor="fin">Fecha de finalización</Label>
              <Input
                id="fin"
                type="date"
                value={form.fechaFin}
                onChange={(e) => set("fechaFin", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 grid gap-1.5">
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                value={form.notas}
                onChange={(e) => set("notas", e.target.value)}
                rows={3}
              />
            </div>
          </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="submit">{esEdicion ? "Guardar cambios" : "Crear cliente"}</Button>
      </DialogFooter>
    </form>
  );
}

function valoresIniciales(cliente?: Cliente) {
  return {
    nombre: cliente?.nombre ?? "",
    tipo: cliente?.tipo ?? ("particular" as Cliente["tipo"]),
    categoria: cliente?.categoria ?? ("fijo" as Cliente["categoria"]),
    nif: cliente?.nif ?? "",
    personaContacto: cliente?.personaContacto ?? "",
    telefono: cliente?.telefono ?? "",
    email: cliente?.email ?? "",
    direccion: cliente?.direccion ?? "",
    pais: cliente?.pais ?? "Portugal",
    servicioContratado: cliente?.servicioContratado ?? "",
    importeMensual: cliente?.importeMensual ?? 0,
    diaVencimiento: cliente?.diaVencimiento ?? 10,
    fechaInicio: cliente?.fechaInicio ?? todayISO(),
    fechaFin: cliente?.fechaFin ?? "",
    estado: cliente?.estado ?? ("activo" as Cliente["estado"]),
    notas: cliente?.notas ?? "",
  };
}
