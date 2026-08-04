"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MESES_ABREV } from "@/lib/constants";
import { useData } from "@/lib/store";
import type { Cliente, Mensualidad } from "@/lib/types";
import { estadoMensualidad, saldoPendiente, totalPagado, ESTADO_DOT_CLASSES, ESTADO_LABEL } from "@/lib/calc";
import { formatCurrency } from "@/lib/format";
import { MensualidadModal } from "./mensualidad-modal";

export function ControlAnualGrid({ anio, clientesFiltrados }: { anio: number; clientesFiltrados: Cliente[] }) {
  const { mensualidades, obtenerOCrearMensualidad } = useData();
  const [seleccion, setSeleccion] = React.useState<{ clienteId: string; mes: number } | null>(null);

  const mapaMensualidades = React.useMemo(() => {
    const mapa = new Map<string, Mensualidad>();
    mensualidades.forEach((m) => {
      if (m.anio === anio) mapa.set(`${m.clienteId}-${m.mes}`, m);
    });
    return mapa;
  }, [mensualidades, anio]);

  function obtenerCelda(clienteId: string, mes: number): Mensualidad | undefined {
    return mapaMensualidades.get(`${clienteId}-${mes}`);
  }

  function abrirCelda(clienteId: string, mes: number) {
    obtenerOCrearMensualidad(clienteId, anio, mes);
    setSeleccion({ clienteId, mes });
  }

  const mensualidadSeleccionada = seleccion
    ? mensualidades.find(
        (m) => m.clienteId === seleccion.clienteId && m.mes === seleccion.mes && m.anio === anio
      ) ?? obtenerOCrearMensualidad(seleccion.clienteId, anio, seleccion.mes)
    : null;

  const totalesPorMes = React.useMemo(() => {
    const totales = Array(12).fill(0);
    clientesFiltrados.forEach((c) => {
      for (let mes = 1; mes <= 12; mes++) {
        const m = obtenerCelda(c.id, mes);
        if (m) totales[mes - 1] += totalPagado(m);
      }
    });
    return totales;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientesFiltrados, mapaMensualidades]);

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-auto max-h-[70vh]">
          <table className="border-collapse text-sm w-full">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-30 bg-card border-b border-r border-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[200px]">
                  Cliente
                </th>
                {MESES_ABREV.map((m) => (
                  <th
                    key={m}
                    className="sticky top-0 z-20 bg-card border-b border-border px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[104px]"
                  >
                    {m}
                  </th>
                ))}
                <th className="sticky top-0 right-0 z-20 bg-card border-b border-l border-border px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[110px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-10 text-sm text-muted-foreground">
                    No se han encontrado clientes con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cliente) => {
                  let totalClientePagado = 0;
                  const celdas = Array.from({ length: 12 }, (_, i) => {
                    const mes = i + 1;
                    const m = obtenerCelda(cliente.id, mes);
                    if (m) totalClientePagado += totalPagado(m);
                    return { mes, mensualidad: m };
                  });
                  return (
                    <tr key={cliente.id} className="group">
                      <td className="sticky left-0 z-10 bg-card group-hover:bg-muted/50 border-r border-b border-border px-3 py-2 font-medium text-foreground">
                        <div className="truncate max-w-[220px]">{cliente.nombre}</div>
                        <div className="text-xs text-muted-foreground font-normal">
                          {formatCurrency(cliente.importeMensual)}/mes
                        </div>
                      </td>
                      {celdas.map(({ mes, mensualidad }) => (
                        <CeldaMes
                          key={mes}
                          mensualidad={mensualidad}
                          onClick={() => abrirCelda(cliente.id, mes)}
                        />
                      ))}
                      <td className="border-b border-l border-border px-3 py-2 text-right font-semibold">
                        {formatCurrency(totalClientePagado)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {clientesFiltrados.length > 0 && (
              <tfoot>
                <tr>
                  <td className="sticky left-0 bottom-0 z-10 bg-muted border-r border-t border-border px-3 py-2.5 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                    Total por mes
                  </td>
                  {totalesPorMes.map((t, i) => (
                    <td key={i} className="bg-muted border-t border-border px-2 py-2.5 text-center font-semibold text-xs">
                      {formatCurrency(t)}
                    </td>
                  ))}
                  <td className="bg-muted border-t border-l border-border px-3 py-2.5 text-right font-semibold text-xs">
                    {formatCurrency(totalesPorMes.reduce((a, b) => a + b, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <MensualidadModal
        mensualidad={mensualidadSeleccionada}
        open={!!seleccion}
        onOpenChange={(open) => !open && setSeleccion(null)}
      />
    </>
  );
}

function CeldaMes({ mensualidad, onClick }: { mensualidad: Mensualidad | undefined; onClick: () => void }) {
  if (!mensualidad) {
    return (
      <td
        onClick={onClick}
        className="border-b border-border px-2 py-2 text-center cursor-pointer hover:bg-muted/60 transition-colors"
      >
        <span className="text-xs text-muted-foreground">—</span>
      </td>
    );
  }
  const estado = estadoMensualidad(mensualidad);
  const pagado = totalPagado(mensualidad);
  const pendiente = saldoPendiente(mensualidad);

  return (
    <td
      onClick={onClick}
      title={ESTADO_LABEL[estado]}
      className="border-b border-border px-2 py-2 text-center cursor-pointer hover:brightness-95 dark:hover:brightness-110 transition-all"
    >
      {estado === "no_aplica" ? (
        <span className="text-xs text-muted-foreground">N/A</span>
      ) : (
        <div
          className={cn(
            "rounded-md px-1.5 py-1 mx-auto flex flex-col items-center gap-0.5",
            estado === "pagado" && "bg-success-bg",
            estado === "pendiente" && "bg-danger-bg",
            estado === "parcial" && "bg-warning-bg",
            estado === "vencido" && "bg-danger text-white"
          )}
        >
          <div className="flex items-center gap-1">
            <span className={cn("h-1.5 w-1.5 rounded-full", ESTADO_DOT_CLASSES[estado])} />
            <span
              className={cn(
                "text-xs font-semibold",
                estado === "pagado" && "text-success",
                estado === "pendiente" && "text-danger",
                estado === "parcial" && "text-warning",
                estado === "vencido" && "text-white"
              )}
            >
              {formatCurrency(pagado)}
            </span>
          </div>
          {pendiente > 0 && (
            <span className={cn("text-[10px]", estado === "vencido" ? "text-white/85" : "text-muted-foreground")}>
              Faltan {formatCurrency(pendiente)}
            </span>
          )}
        </div>
      )}
    </td>
  );
}
