"use client";

import * as React from "react";
import { Plus, Repeat, Pencil, Trash2, CheckCircle2, PauseCircle, PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PagoRecurrenteFormDialog } from "@/components/forms/pago-recurrente-form-dialog";
import { useData } from "@/lib/store";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import { avanzarFecha, diasHastaVencimiento } from "@/lib/calc";
import { FRECUENCIAS } from "@/lib/constants";
import type { PagoRecurrente } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PagosRecurrentesPage() {
  const { pagosRecurrentes, categoriasGasto, actualizarPagoRecurrente, eliminarPagoRecurrente, crearGasto } = useData();
  const [dialogo, setDialogo] = React.useState<{ abierto: boolean; pago?: PagoRecurrente }>({ abierto: false });
  const [aEliminar, setAEliminar] = React.useState<PagoRecurrente | null>(null);
  const [aConfirmar, setAConfirmar] = React.useState<PagoRecurrente | null>(null);

  const ordenados = [...pagosRecurrentes].sort(
    (a, b) => new Date(a.proximaFecha).getTime() - new Date(b.proximaFecha).getTime()
  );

  function confirmarPago(p: PagoRecurrente) {
    if (p.generarGastoAutomatico) {
      crearGasto({
        fecha: todayISO(),
        descripcion: p.nombre,
        categoriaId: p.categoriaId,
        proveedor: p.proveedor,
        importe: p.importe,
        estado: "pagado",
        metodoPago: p.metodoPago,
        tipo: p.tipo,
        recurrente: true,
        pagoRecurrenteId: p.id,
        deducible: "revisar",
        notas: `Generado automáticamente desde pago recurrente "${p.nombre}"`,
      });
    }
    actualizarPagoRecurrente(p.id, { proximaFecha: avanzarFecha(p.proximaFecha, p.frecuencia) });
    toast.success(`Pago de "${p.nombre}" confirmado. Próximo vencimiento actualizado.`);
    setAConfirmar(null);
  }

  return (
    <div>
      <PageHeader
        title="Pagos recurrentes"
        description="Obligaciones periódicas: alquiler, software, seguros, impuestos y más."
        actions={
          <Button onClick={() => setDialogo({ abierto: true })}>
            <Plus className="h-4 w-4" /> Nuevo pago recurrente
          </Button>
        }
      />

      {ordenados.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="Sin pagos recurrentes"
          description="Registra tus obligaciones periódicas para recibir avisos y llevar el control."
          action={
            <Button onClick={() => setDialogo({ abierto: true })}>
              <Plus className="h-4 w-4" /> Nuevo pago recurrente
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {ordenados.map((p) => {
            const dias = diasHastaVencimiento(p.proximaFecha);
            const proximo = dias <= p.diasAviso;
            return (
              <Card key={p.id} className={cn(!p.activo && "opacity-60")}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{p.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {categoriasGasto.find((c) => c.id === p.categoriaId)?.nombre} · {p.proveedor || "Sin proveedor"}
                      </p>
                    </div>
                    <Badge variant={p.activo ? "success" : "neutral"}>{p.activo ? "Activo" : "Pausado"}</Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-2xl font-semibold">{formatCurrency(p.importe)}</span>
                    <Badge variant="outline">{FRECUENCIAS.find((f) => f.value === p.frecuencia)?.label}</Badge>
                  </div>

                  <div
                    className={cn(
                      "mt-3 rounded-lg px-3 py-2 text-sm flex items-center justify-between",
                      proximo && p.activo ? "bg-warning-bg text-warning" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <span>Próximo vencimiento</span>
                    <span className="font-medium">{formatDate(p.proximaFecha)}</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="success" onClick={() => setAConfirmar(p)} disabled={!p.activo}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar pago
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDialogo({ abierto: true, pago: p })}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => actualizarPagoRecurrente(p.id, { activo: !p.activo })}
                    >
                      {p.activo ? <PauseCircle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="sm" variant="outline" className="text-danger" onClick={() => setAEliminar(p)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PagoRecurrenteFormDialog open={dialogo.abierto} onOpenChange={(abierto) => setDialogo((s) => ({ ...s, abierto }))} pago={dialogo.pago} />

      <ConfirmDialog
        open={!!aConfirmar}
        onOpenChange={(o) => !o && setAConfirmar(null)}
        title="¿Confirmar este pago?"
        description={
          aConfirmar?.generarGastoAutomatico
            ? "Se generará un gasto pagado y se calculará automáticamente la próxima fecha de vencimiento."
            : "Se calculará automáticamente la próxima fecha de vencimiento. No se generará ningún gasto."
        }
        confirmLabel="Confirmar pago"
        onConfirm={() => aConfirmar && confirmarPago(aConfirmar)}
      />

      <ConfirmDialog
        open={!!aEliminar}
        onOpenChange={(o) => !o && setAEliminar(null)}
        title="¿Eliminar este pago recurrente?"
        description="Esta acción no se puede deshacer. Los gastos ya generados no se verán afectados."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          if (aEliminar) {
            eliminarPagoRecurrente(aEliminar.id);
            toast.success("Pago recurrente eliminado.");
          }
          setAEliminar(null);
        }}
      />
    </div>
  );
}
