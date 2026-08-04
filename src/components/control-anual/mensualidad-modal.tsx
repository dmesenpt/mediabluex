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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useData } from "@/lib/store";
import { METODOS_PAGO } from "@/lib/constants";
import type { Mensualidad, MetodoPago } from "@/lib/types";
import { estadoMensualidad, saldoPendiente, totalPagado } from "@/lib/calc";
import { formatCurrency, formatDateTime, mesAnioLabel } from "@/lib/format";

interface Props {
  mensualidad: Mensualidad | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MensualidadModal({ mensualidad, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {/* Se monta de nuevo cada vez que se abre, para partir siempre de datos frescos. */}
        {open && mensualidad && <MensualidadDetalle mensualidad={mensualidad} />}
      </DialogContent>
    </Dialog>
  );
}

function MensualidadDetalle({ mensualidad }: { mensualidad: Mensualidad }) {
  const { clientes, registrarPago, actualizarMensualidad, marcarNoAplica } = useData();
  const [modoEdicion, setModoEdicion] = React.useState(false);
  const [confirmNoAplica, setConfirmNoAplica] = React.useState(false);

  const [pagoImporte, setPagoImporte] = React.useState(() => saldoPendiente(mensualidad) || mensualidad.importeAcordado);
  const [pagoFecha, setPagoFecha] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [pagoMetodo, setPagoMetodo] = React.useState<MetodoPago>("transferencia");
  const [pagoNotas, setPagoNotas] = React.useState("");

  const [edicion, setEdicion] = React.useState(() => ({
    importeAcordado: mensualidad.importeAcordado,
    fechaVencimiento: mensualidad.fechaVencimiento,
    numeroFactura: mensualidad.numeroFactura ?? "",
    notas: mensualidad.notas ?? "",
  }));

  const cliente = clientes.find((c) => c.id === mensualidad.clienteId);
  const estado = estadoMensualidad(mensualidad);

  function handleRegistrarPago(e: React.FormEvent) {
    e.preventDefault();
    if (pagoImporte <= 0) {
      toast.error("El importe debe ser mayor que cero.");
      return;
    }
    registrarPago(mensualidad.id, { fecha: pagoFecha, importe: pagoImporte, metodoPago: pagoMetodo, notas: pagoNotas });
    toast.success("Pago registrado correctamente.");
    setPagoImporte(0);
    setPagoNotas("");
  }

  function handleGuardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (edicion.importeAcordado < 0) {
      toast.error("El importe no puede ser negativo.");
      return;
    }
    actualizarMensualidad(mensualidad.id, edicion);
    toast.success("Mensualidad actualizada.");
    setModoEdicion(false);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {cliente?.nombre} · {mesAnioLabel(mensualidad.mes, mensualidad.anio)}
        </DialogTitle>
        <DialogDescription className="flex items-center gap-2 pt-1">
          <EstadoBadge estado={estado} />
          {mensualidad.numeroFactura && <span className="text-xs">Factura {mensualidad.numeroFactura}</span>}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted p-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Importe acordado</p>
          <p className="font-semibold">{formatCurrency(mensualidad.importeAcordado)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Total pagado</p>
          <p className="font-semibold text-success">{formatCurrency(totalPagado(mensualidad))}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Pendiente</p>
          <p className="font-semibold text-danger">{formatCurrency(saldoPendiente(mensualidad))}</p>
        </div>
      </div>

      {!modoEdicion ? (
        <>
          {estado !== "no_aplica" && estado !== "pagado" && (
            <form onSubmit={handleRegistrarPago} className="grid gap-3 border border-border rounded-lg p-3">
              <p className="text-sm font-medium">Registrar pago</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="importe">Importe (€)</Label>
                  <Input
                    id="importe"
                    type="number"
                    min={0}
                    step="0.01"
                    value={pagoImporte}
                    onChange={(e) => setPagoImporte(Number(e.target.value))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="fecha">Fecha</Label>
                  <Input id="fecha" type="date" value={pagoFecha} onChange={(e) => setPagoFecha(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Método de pago</Label>
                <Select value={pagoMetodo} onValueChange={(v) => setPagoMetodo(v as MetodoPago)}>
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
                <Label htmlFor="notasPago">Notas del pago</Label>
                <Textarea id="notasPago" rows={2} value={pagoNotas} onChange={(e) => setPagoNotas(e.target.value)} />
              </div>
              <Button type="submit" variant="success" className="w-full">
                Registrar pago
              </Button>
            </form>
          )}

          <div>
            <p className="text-sm font-medium mb-2">Fechas y pagos registrados</p>
            {mensualidad.pagos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay pagos registrados.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {mensualidad.pagos.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">{formatCurrency(p.importe)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(p.fecha)} · {METODOS_PAGO.find((m) => m.value === p.metodoPago)?.label}
                      </p>
                    </div>
                    {p.notas && <p className="text-xs text-muted-foreground max-w-[50%] text-right">{p.notas}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {mensualidad.notas && (
            <div>
              <p className="text-sm font-medium mb-1">Notas</p>
              <p className="text-sm text-muted-foreground">{mensualidad.notas}</p>
            </div>
          )}

          <Separator />

          <div>
            <p className="text-sm font-medium mb-2">Historial de cambios</p>
            <ul className="space-y-1.5 max-h-32 overflow-y-auto text-xs text-muted-foreground">
              {[...mensualidad.historial].reverse().map((h) => (
                <li key={h.id} className="flex gap-2">
                  <span className="shrink-0">{formatDateTime(h.fecha)}</span>
                  <span>—</span>
                  <span>{h.descripcion}</span>
                </li>
              ))}
            </ul>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmNoAplica(true)}
              className="text-muted-foreground"
            >
              {estado === "no_aplica" ? "Quitar no aplicable" : "Marcar como no aplicable"}
            </Button>
            <Button type="button" onClick={() => setModoEdicion(true)}>
              Editar
            </Button>
          </DialogFooter>
        </>
      ) : (
        <form onSubmit={handleGuardarEdicion} className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="importeAcordado">Importe acordado (€)</Label>
              <Input
                id="importeAcordado"
                type="number"
                min={0}
                step="0.01"
                value={edicion.importeAcordado}
                onChange={(e) => setEdicion((f) => ({ ...f, importeAcordado: Number(e.target.value) }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="vencimiento">Fecha de vencimiento</Label>
              <Input
                id="vencimiento"
                type="date"
                value={edicion.fechaVencimiento}
                onChange={(e) => setEdicion((f) => ({ ...f, fechaVencimiento: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="factura">Número de factura o recibo</Label>
            <Input
              id="factura"
              value={edicion.numeroFactura}
              onChange={(e) => setEdicion((f) => ({ ...f, numeroFactura: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              rows={3}
              value={edicion.notas}
              onChange={(e) => setEdicion((f) => ({ ...f, notas: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModoEdicion(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar cambios</Button>
          </DialogFooter>
        </form>
      )}

      <ConfirmDialog
        open={confirmNoAplica}
        onOpenChange={setConfirmNoAplica}
        title={estado === "no_aplica" ? "¿Quitar la marca de no aplicable?" : "¿Marcar como no aplicable?"}
        description={
          estado === "no_aplica"
            ? "La mensualidad volverá a contabilizarse normalmente."
            : "Este mes no se contabilizará como pendiente ni se incluirá en los totales del cliente."
        }
        confirmLabel="Confirmar"
        onConfirm={() => {
          marcarNoAplica(mensualidad.id, estado !== "no_aplica");
          setConfirmNoAplica(false);
        }}
      />
    </>
  );
}
