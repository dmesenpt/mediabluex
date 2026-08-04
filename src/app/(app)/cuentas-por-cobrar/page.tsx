"use client";

import * as React from "react";
import { Wallet, MessageSquare, Mail, Phone } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { RegistrarPagoClienteDialog } from "@/components/forms/registrar-pago-cliente-dialog";
import { SeguimientoDialog } from "@/components/cuentas-por-cobrar/seguimiento-dialog";
import { useData } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/format";
import { estadoMensualidad, saldoPendiente, diasDeRetraso, bucketAntiguedad, totalPagado } from "@/lib/calc";
import type { Mensualidad } from "@/lib/types";

const BUCKETS = ["No vencidas", "1-30 días", "31-60 días", "61-90 días", "Más de 90 días"];

export default function CuentasPorCobrarPage() {
  const { clientes, mensualidades } = useData();
  const [bucket, setBucket] = React.useState("todos");
  const [pagoDialog, setPagoDialog] = React.useState<{ clienteId: string; anio: number; mes: number } | null>(null);
  const [seguimiento, setSeguimiento] = React.useState<Mensualidad | null>(null);

  const cuentas = React.useMemo(() => {
    return mensualidades
      .map((m) => ({ mensualidad: m, cliente: clientes.find((c) => c.id === m.clienteId) }))
      .filter(({ cliente, mensualidad }) => {
        if (!cliente) return false;
        const estado = estadoMensualidad(mensualidad);
        return (estado === "pendiente" || estado === "parcial" || estado === "vencido") && saldoPendiente(mensualidad) > 0;
      })
      .map(({ mensualidad, cliente }) => {
        const dias = diasDeRetraso(mensualidad.fechaVencimiento);
        return { mensualidad, cliente: cliente!, dias, bucket: bucketAntiguedad(dias) };
      })
      .sort((a, b) => b.dias - a.dias);
  }, [mensualidades, clientes]);

  const filtradas = bucket === "todos" ? cuentas : cuentas.filter((c) => c.bucket === bucket);

  const totalesPorBucket = BUCKETS.map((b) => ({
    bucket: b,
    total: cuentas.filter((c) => c.bucket === b).reduce((acc, c) => acc + saldoPendiente(c.mensualidad), 0),
    cantidad: cuentas.filter((c) => c.bucket === b).length,
  }));

  return (
    <div>
      <PageHeader title="Cuentas por cobrar" description="Mensualidades pendientes de cobro, clasificadas por antigüedad." />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {totalesPorBucket.map((b) => (
          <Card
            key={b.bucket}
            className={`cursor-pointer transition-colors ${bucket === b.bucket ? "border-primary ring-1 ring-primary" : ""}`}
            onClick={() => setBucket(bucket === b.bucket ? "todos" : b.bucket)}
          >
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{b.bucket}</p>
              <p className="text-lg font-semibold mt-1">{formatCurrency(b.total)}</p>
              <p className="text-xs text-muted-foreground">{b.cantidad} cuenta(s)</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-4 max-w-[200px]">
        <Select value={bucket} onValueChange={setBucket}>
          <SelectTrigger>
            <SelectValue placeholder="Antigüedad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las antigüedades</SelectItem>
            {BUCKETS.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtradas.length === 0 ? (
        <EmptyState icon={Wallet} title="Sin cuentas por cobrar" description="No hay saldos pendientes en esta categoría." />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead className="text-right">Importe original</TableHead>
                <TableHead className="text-right">Pagado</TableHead>
                <TableHead className="text-right">Saldo pendiente</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Retraso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map(({ mensualidad, cliente, dias }) => (
                <TableRow key={mensualidad.id}>
                  <TableCell className="font-medium whitespace-nowrap">{cliente.nombre}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    Mensualidad {String(mensualidad.mes).padStart(2, "0")}/{mensualidad.anio}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(mensualidad.importeAcordado)}</TableCell>
                  <TableCell className="text-right text-success">{formatCurrency(totalPagado(mensualidad))}</TableCell>
                  <TableCell className="text-right font-semibold text-danger">
                    {formatCurrency(saldoPendiente(mensualidad))}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(mensualidad.fechaVencimiento)}</TableCell>
                  <TableCell className="whitespace-nowrap">{dias > 0 ? `${dias} días` : "—"}</TableCell>
                  <TableCell>
                    <EstadoBadge estado={estadoMensualidad(mensualidad)} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {cliente.telefono && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {cliente.telefono}
                      </span>
                    )}
                    {cliente.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {cliente.email}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() =>
                          setPagoDialog({ clienteId: cliente.id, anio: mensualidad.anio, mes: mensualidad.mes })
                        }
                      >
                        Registrar pago
                      </Button>
                      <Button size="icon-sm" variant="outline" onClick={() => setSeguimiento(mensualidad)}>
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <RegistrarPagoClienteDialog
        open={!!pagoDialog}
        onOpenChange={(o) => !o && setPagoDialog(null)}
        clienteIdInicial={pagoDialog?.clienteId}
        anioInicial={pagoDialog?.anio}
        mesInicial={pagoDialog?.mes}
      />
      <SeguimientoDialog mensualidad={seguimiento} open={!!seguimiento} onOpenChange={(o) => !o && setSeguimiento(null)} />
    </div>
  );
}
