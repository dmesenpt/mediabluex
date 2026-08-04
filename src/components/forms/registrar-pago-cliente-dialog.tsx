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
import { METODOS_PAGO, MESES } from "@/lib/constants";
import type { MetodoPago } from "@/lib/types";
import { todayISO } from "@/lib/format";
import { saldoPendiente, totalPagado } from "@/lib/calc";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteIdInicial?: string;
  anioInicial?: number;
  mesInicial?: number;
}

export function RegistrarPagoClienteDialog({ open, onOpenChange, clienteIdInicial, anioInicial, mesInicial }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar pago de cliente</DialogTitle>
          <DialogDescription>Registra un cobro total o parcial de una mensualidad.</DialogDescription>
        </DialogHeader>
        {/* Se monta de nuevo cada vez que se abre, para partir siempre de datos frescos. */}
        {open && (
          <RegistrarPagoClienteFormulario
            onOpenChange={onOpenChange}
            clienteIdInicial={clienteIdInicial}
            anioInicial={anioInicial}
            mesInicial={mesInicial}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RegistrarPagoClienteFormulario({
  onOpenChange,
  clienteIdInicial,
  anioInicial,
  mesInicial,
}: Omit<Props, "open">) {
  const { clientes, mensualidades, obtenerOCrearMensualidad, registrarPago } = useData();
  const clientesActivos = clientes.filter((c) => c.estado !== "inactivo");
  const anioActual = new Date().getFullYear();
  const mesActual = new Date().getMonth() + 1;

  function sugerirImporte(idCliente: string, anioSel: number, mesSel: number) {
    const existente = mensualidades.find(
      (m) => m.clienteId === idCliente && m.anio === anioSel && m.mes === mesSel
    );
    if (existente) return saldoPendiente(existente) || existente.importeAcordado;
    return clientes.find((c) => c.id === idCliente)?.importeMensual ?? 0;
  }

  const [clienteId, setClienteId] = React.useState(() => clienteIdInicial ?? clientesActivos[0]?.id ?? "");
  const [anio, setAnio] = React.useState(() => anioInicial ?? anioActual);
  const [mes, setMes] = React.useState(() => mesInicial ?? mesActual);
  const [importe, setImporte] = React.useState(() => sugerirImporte(clienteId, anio, mes));
  const [fecha, setFecha] = React.useState(() => todayISO());
  const [metodoPago, setMetodoPago] = React.useState<MetodoPago>("transferencia");
  const [notas, setNotas] = React.useState("");

  function cambiarCliente(idCliente: string) {
    setClienteId(idCliente);
    setImporte(sugerirImporte(idCliente, anio, mes));
  }

  function cambiarMes(mesSel: number) {
    setMes(mesSel);
    setImporte(sugerirImporte(clienteId, anio, mesSel));
  }

  function cambiarAnio(anioSel: number) {
    setAnio(anioSel);
    setImporte(sugerirImporte(clienteId, anioSel, mes));
  }

  const mensualidadExistente = mensualidades.find(
    (m) => m.clienteId === clienteId && m.anio === anio && m.mes === mes
  );
  const cliente = clientes.find((c) => c.id === clienteId);
  const importeAcordado = mensualidadExistente?.importeAcordado ?? cliente?.importeMensual ?? 0;
  const yaPagado = mensualidadExistente ? totalPagado(mensualidadExistente) : 0;
  const saldoActual = mensualidadExistente ? saldoPendiente(mensualidadExistente) : importeAcordado;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteId) {
      toast.error("Selecciona un cliente.");
      return;
    }
    if (importe <= 0) {
      toast.error("El importe debe ser mayor que cero.");
      return;
    }
    const m = obtenerOCrearMensualidad(clienteId, anio, mes);
    registrarPago(m.id, { fecha, importe, metodoPago, notas });
    toast.success(`Pago registrado para ${cliente?.nombre}.`);
    onOpenChange(false);
  }

  return (
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Cliente</Label>
            <Select value={clienteId} onValueChange={cambiarCliente}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientesActivos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Mes</Label>
              <Select value={String(mes)} onValueChange={(v) => cambiarMes(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="anio">Año</Label>
              <Input id="anio" type="number" value={anio} onChange={(e) => cambiarAnio(Number(e.target.value))} />
            </div>
          </div>

          {clienteId && (
            <div className="rounded-lg bg-muted p-3 text-sm grid grid-cols-2 gap-2">
              <div>
                <p className="text-muted-foreground text-xs">Importe acordado</p>
                <p className="font-medium">{importeAcordado.toFixed(2)} €</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Ya pagado</p>
                <p className="font-medium">{yaPagado.toFixed(2)} €</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Saldo pendiente</p>
                <p className="font-semibold text-danger">{saldoActual.toFixed(2)} €</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="importe">Importe a registrar (€)</Label>
              <Input
                id="importe"
                type="number"
                min={0}
                step="0.01"
                value={importe}
                onChange={(e) => setImporte(Number(e.target.value))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fecha">Fecha del pago</Label>
              <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Método de pago</Label>
            <Select value={metodoPago} onValueChange={(v) => setMetodoPago(v as MetodoPago)}>
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
            <Label htmlFor="notas">Notas</Label>
            <Textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
          </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="submit" variant="success">
          Registrar pago
        </Button>
      </DialogFooter>
    </form>
  );
}
