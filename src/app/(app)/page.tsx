"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  Wallet,
  Clock,
  Receipt,
  TrendingUp,
  Repeat,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SelectorMesAnio } from "@/components/shared/selector-mes-anio";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartIngresosGastos } from "@/components/dashboard/chart-ingresos-gastos";
import { ChartGastosCategoria } from "@/components/dashboard/chart-gastos-categoria";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/format";
import { estadoMensualidad } from "@/lib/calc";
import {
  calcularResumenMes,
  serieIngresosGastos12Meses,
  distribucionGastosPorCategoria,
  clientesPendientesDePago,
  pagosVencidos,
  proximosPagosRecurrentes,
  proximosGastosPendientes,
} from "@/lib/dashboard";
import { mesAnioLabel } from "@/lib/format";

export default function InicioPage() {
  const { clientes, mensualidades, ingresos, gastos, categoriasGasto, pagosRecurrentes, hydrated } = useData();
  const hoy = new Date();
  const [anio, setAnio] = React.useState(hoy.getFullYear());
  const [mes, setMes] = React.useState(hoy.getMonth() + 1);

  const resumen = calcularResumenMes(anio, mes, mensualidades, ingresos, gastos);
  const serie = serieIngresosGastos12Meses(anio, mes, mensualidades, ingresos, gastos);
  const distribucion = distribucionGastosPorCategoria(anio, mes, gastos, categoriasGasto);
  const pendientes = clientesPendientesDePago(anio, mes, clientes, mensualidades).slice(0, 6);
  const vencidos = pagosVencidos(clientes, mensualidades).slice(0, 6);
  const recurrentes = proximosPagosRecurrentes(pagosRecurrentes, 5);
  const gastosProximos = proximosGastosPendientes(gastos, 5);

  const ultimosMovimientos = React.useMemo(() => {
    const movs: { fecha: string; descripcion: string; importe: number; tipo: "ingreso" | "gasto" }[] = [];
    mensualidades.forEach((m) => {
      const cliente = clientes.find((c) => c.id === m.clienteId);
      m.pagos.forEach((p) =>
        movs.push({
          fecha: p.fecha,
          descripcion: `Pago de ${cliente?.nombre ?? "cliente"}`,
          importe: p.importe,
          tipo: "ingreso",
        })
      );
    });
    ingresos.forEach((i) => movs.push({ fecha: i.fecha, descripcion: i.concepto, importe: i.importe, tipo: "ingreso" }));
    gastos.forEach((g) => movs.push({ fecha: g.fecha, descripcion: g.descripcion, importe: g.importe, tipo: "gasto" }));
    return movs.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 8);
  }, [mensualidades, ingresos, gastos, clientes]);

  if (!hydrated) {
    return <div className="text-sm text-muted-foreground">Cargando…</div>;
  }

  return (
    <div>
      <PageHeader
        title="Inicio"
        description={`Resumen de ${mesAnioLabel(mes, anio)}`}
        actions={<SelectorMesAnio anio={anio} mes={mes} onChange={(a, m) => { setAnio(a); setMes(m); }} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard label="Total facturado del mes" value={formatCurrency(resumen.totalFacturado)} icon={FileText} tono="primary" />
        <StatCard label="Total cobrado" value={formatCurrency(resumen.totalCobrado)} icon={Wallet} tono="success" />
        <StatCard label="Total pendiente de cobro" value={formatCurrency(resumen.totalPendiente)} icon={Clock} tono="warning" />
        <StatCard label="Total de gastos" value={formatCurrency(resumen.totalGastos)} icon={Receipt} tono="danger" />
        <StatCard
          label="Beneficio neto"
          value={formatCurrency(resumen.beneficioNeto)}
          icon={TrendingUp}
          tono={resumen.beneficioNeto >= 0 ? "success" : "danger"}
          hint="Cobrado − gastos pagados"
        />
        <StatCard label="Próximos pagos recurrentes" value={String(recurrentes.length)} icon={Repeat} tono="info" hint="Activos y programados" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 mt-4">
        <div className="xl:col-span-3">
          <ChartIngresosGastos data={serie} />
        </div>
        <div className="xl:col-span-2">
          <ChartGastosCategoria data={distribucion} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Clientes pendientes de pago</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/control-anual">
                Ver todo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {pendientes.length === 0 ? (
              <EmptyState icon={Wallet} title="Sin pendientes" description="Todos los clientes de este mes están al día." />
            ) : (
              <ul className="divide-y divide-border">
                {pendientes.map(({ mensualidad, cliente }) => (
                  <li key={mensualidad.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{cliente?.nombre}</p>
                      <p className="text-xs text-muted-foreground">Vence {formatDate(mensualidad.fechaVencimiento)}</p>
                    </div>
                    <EstadoBadge estado={estadoMensualidad(mensualidad)} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-danger" /> Pagos vencidos
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/cuentas-por-cobrar">
                Ver todo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {vencidos.length === 0 ? (
              <EmptyState icon={AlertTriangle} title="Sin pagos vencidos" description="No hay mensualidades vencidas actualmente." />
            ) : (
              <ul className="divide-y divide-border">
                {vencidos.map(({ mensualidad, cliente }) => (
                  <li key={mensualidad.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{cliente?.nombre}</p>
                      <p className="text-xs text-muted-foreground">Venció {formatDate(mensualidad.fechaVencimiento)}</p>
                    </div>
                    <span className="font-medium text-danger">{formatCurrency(mensualidad.importeAcordado)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Próximos gastos y servicios por pagar</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/gastos">
                Ver todo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {gastosProximos.length === 0 ? (
              <EmptyState icon={Receipt} title="Sin gastos pendientes" />
            ) : (
              <ul className="divide-y divide-border">
                {gastosProximos.map((g) => (
                  <li key={g.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{g.descripcion}</p>
                      <p className="text-xs text-muted-foreground">
                        {g.fechaVencimiento ? `Vence ${formatDate(g.fechaVencimiento)}` : formatDate(g.fecha)}
                      </p>
                    </div>
                    <span className="font-medium">{formatCurrency(g.importe)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Últimos movimientos registrados</CardTitle>
          </CardHeader>
          <CardContent>
            {ultimosMovimientos.length === 0 ? (
              <EmptyState icon={FileText} title="Sin movimientos" description="Los movimientos que registres aparecerán aquí." />
            ) : (
              <ul className="divide-y divide-border">
                {ultimosMovimientos.map((m, i) => (
                  <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{m.descripcion}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(m.fecha)}</p>
                    </div>
                    <span className={`font-medium ${m.tipo === "ingreso" ? "text-success" : "text-danger"}`}>
                      {m.tipo === "ingreso" ? "+" : "−"}
                      {formatCurrency(m.importe)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
