"use client";

import * as React from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableFooter,
} from "@/components/ui/table";
import { ChartIngresosGastos } from "@/components/dashboard/chart-ingresos-gastos";
import { useData } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { estadoMensualidad, saldoPendiente, totalPagado, diasDeRetraso } from "@/lib/calc";
import { calcularResumenMes, serieIngresosGastos12Meses } from "@/lib/dashboard";
import { MESES, METODOS_PAGO } from "@/lib/constants";
import { exportarCSV, exportarExcel, exportarPDF } from "@/lib/export-utils";
import { toast } from "sonner";

export default function InformesPage() {
  const { clientes, mensualidades, ingresos, gastos, categoriasGasto } = useData();
  const anioActual = new Date().getFullYear();
  const anios = Array.from({ length: 6 }, (_, i) => anioActual - 3 + i);
  const [anio, setAnio] = React.useState(anioActual);

  const filasMensuales = MESES.map((label, i) => {
    const mes = i + 1;
    const r = calcularResumenMes(anio, mes, mensualidades, ingresos, gastos);
    return { mes: label, ...r };
  });
  const totalesAnio = filasMensuales.reduce(
    (acc, f) => ({
      totalCobrado: acc.totalCobrado + f.totalCobrado,
      totalGastos: acc.totalGastos + f.totalGastos,
      gastosPagados: acc.gastosPagados + f.gastosPagados,
      beneficioNeto: acc.beneficioNeto + f.beneficioNeto,
      totalFacturado: acc.totalFacturado + f.totalFacturado,
    }),
    { totalCobrado: 0, totalGastos: 0, gastosPagados: 0, beneficioNeto: 0, totalFacturado: 0 }
  );
  const resumenAnioAnterior = MESES.reduce((acc, _, i) => {
    const r = calcularResumenMes(anio - 1, i + 1, mensualidades, ingresos, gastos);
    return acc + r.beneficioNeto;
  }, 0);

  const serie12m = serieIngresosGastos12Meses(anioActual, new Date().getMonth() + 1, mensualidades, ingresos, gastos);

  const ingresosPorCliente = clientes
    .map((c) => {
      const propias = mensualidades.filter((m) => m.clienteId === c.id && m.anio === anio);
      const facturado = propias.reduce((acc, m) => acc + m.importeAcordado, 0);
      const pagado = propias.reduce((acc, m) => acc + totalPagado(m), 0);
      return { cliente: c.nombre, facturado, pagado, pendiente: facturado - pagado };
    })
    .filter((f) => f.facturado > 0)
    .sort((a, b) => b.pagado - a.pagado);

  const gastosPorCategoria = categoriasGasto
    .map((cat) => ({
      categoria: cat.nombre,
      total: gastos.filter((g) => g.categoriaId === cat.id && new Date(g.fecha).getFullYear() === anio).reduce((acc, g) => acc + g.importe, 0),
    }))
    .filter((f) => f.total > 0)
    .sort((a, b) => b.total - a.total);

  const gastosPersonalVsProfesional = ["profesional", "personal"].map((tipo) => ({
    tipo: tipo === "profesional" ? "Profesional" : "Personal",
    total: gastos
      .filter((g) => g.tipo === tipo && new Date(g.fecha).getFullYear() === anio)
      .reduce((acc, g) => acc + g.importe, 0),
  }));

  const pendientesYVencidos = mensualidades
    .filter((m) => m.anio === anio)
    .map((m) => ({ mensualidad: m, cliente: clientes.find((c) => c.id === m.clienteId) }))
    .filter(({ cliente, mensualidad }) => {
      const e = estadoMensualidad(mensualidad);
      return cliente && (e === "pendiente" || e === "parcial" || e === "vencido");
    });

  const cobrosPorMetodo = METODOS_PAGO.map((m) => {
    const total = mensualidades
      .filter((men) => men.anio === anio)
      .flatMap((men) => men.pagos)
      .filter((p) => p.metodoPago === m.value)
      .reduce((acc, p) => acc + p.importe, 0);
    return { metodo: m.label, total };
  }).filter((f) => f.total > 0);

  function exportarTabla(nombre: string, filas: Record<string, unknown>[], titulo: string) {
    if (filas.length === 0) {
      toast.error("No hay datos para exportar.");
      return null;
    }
    return {
      csv: () => exportarCSV(nombre, filas),
      excel: () => exportarExcel(nombre, filas),
      pdf: () =>
        exportarPDF(nombre, titulo, Object.keys(filas[0]), filas.map((f) => Object.values(f) as (string | number)[])),
    };
  }

  return (
    <div>
      <PageHeader
        title="Informes"
        description="Analiza tu actividad financiera con filtros por fecha, cliente y categoría."
        actions={
          <Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))}>
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anios.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <Tabs defaultValue="resumen">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="resumen">Resumen anual</TabsTrigger>
          <TabsTrigger value="clientes">Por cliente</TabsTrigger>
          <TabsTrigger value="gastos">Gastos</TabsTrigger>
          <TabsTrigger value="cobros">Cobros</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <ResumenTarjeta label="Total facturado" valor={totalesAnio.totalFacturado} />
            <ResumenTarjeta label="Total cobrado" valor={totalesAnio.totalCobrado} tono="success" />
            <ResumenTarjeta label="Total gastos pagados" valor={totalesAnio.gastosPagados} tono="danger" />
            <ResumenTarjeta label="Beneficio neto" valor={totalesAnio.beneficioNeto} tono={totalesAnio.beneficioNeto >= 0 ? "success" : "danger"} />
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Comparación entre años</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Beneficio neto {anio}: <span className="font-semibold text-foreground">{formatCurrency(totalesAnio.beneficioNeto)}</span>
                {" · "}
                Beneficio neto {anio - 1}: <span className="font-semibold text-foreground">{formatCurrency(resumenAnioAnterior)}</span>
                {" · "}
                Variación:{" "}
                <span className={`font-semibold ${totalesAnio.beneficioNeto - resumenAnioAnterior >= 0 ? "text-success" : "text-danger"}`}>
                  {formatCurrency(totalesAnio.beneficioNeto - resumenAnioAnterior)}
                </span>
              </p>
            </CardContent>
          </Card>

          <ChartIngresosGastos data={serie12m} />

          <TablaConExportar
            titulo="Ingresos y gastos mensuales"
            nombreArchivo={`informe-mensual-${anio}`}
            columnas={["Mes", "Facturado", "Cobrado", "Gastos", "Beneficio neto"]}
            filas={filasMensuales.map((f) => [
              f.mes,
              formatCurrency(f.totalFacturado),
              formatCurrency(f.totalCobrado),
              formatCurrency(f.gastosPagados),
              formatCurrency(f.beneficioNeto),
            ])}
            exportar={exportarTabla(
              `informe-mensual-${anio}`,
              filasMensuales.map((f) => ({
                Mes: f.mes,
                Facturado: f.totalFacturado.toFixed(2),
                Cobrado: f.totalCobrado.toFixed(2),
                Gastos: f.gastosPagados.toFixed(2),
                "Beneficio neto": f.beneficioNeto.toFixed(2),
              })),
              `Informe mensual ${anio}`
            )}
          />
        </TabsContent>

        <TabsContent value="clientes" className="space-y-4">
          <TablaConExportar
            titulo="Ingresos y rentabilidad por cliente"
            nombreArchivo={`ingresos-por-cliente-${anio}`}
            columnas={["Cliente", "Facturado", "Pagado", "Pendiente"]}
            filas={ingresosPorCliente.map((f) => [
              f.cliente,
              formatCurrency(f.facturado),
              formatCurrency(f.pagado),
              formatCurrency(f.pendiente),
            ])}
            exportar={exportarTabla(
              `ingresos-por-cliente-${anio}`,
              ingresosPorCliente.map((f) => ({
                Cliente: f.cliente,
                Facturado: f.facturado.toFixed(2),
                Pagado: f.pagado.toFixed(2),
                Pendiente: f.pendiente.toFixed(2),
              })),
              `Ingresos por cliente ${anio}`
            )}
          />
        </TabsContent>

        <TabsContent value="gastos" className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {gastosPersonalVsProfesional.map((g) => (
              <ResumenTarjeta key={g.tipo} label={`Gastos ${g.tipo.toLowerCase()}`} valor={g.total} tono="danger" />
            ))}
          </div>
          <TablaConExportar
            titulo="Gastos por categoría"
            nombreArchivo={`gastos-por-categoria-${anio}`}
            columnas={["Categoría", "Total"]}
            filas={gastosPorCategoria.map((f) => [f.categoria, formatCurrency(f.total)])}
            exportar={exportarTabla(
              `gastos-por-categoria-${anio}`,
              gastosPorCategoria.map((f) => ({ Categoría: f.categoria, Total: f.total.toFixed(2) })),
              `Gastos por categoría ${anio}`
            )}
          />
        </TabsContent>

        <TabsContent value="cobros" className="space-y-4">
          <TablaConExportar
            titulo="Pagos pendientes y vencidos"
            nombreArchivo={`pagos-pendientes-${anio}`}
            columnas={["Cliente", "Mes", "Importe pendiente", "Días de retraso", "Estado"]}
            filas={pendientesYVencidos.map(({ mensualidad, cliente }) => [
              cliente!.nombre,
              `${String(mensualidad.mes).padStart(2, "0")}/${mensualidad.anio}`,
              formatCurrency(saldoPendiente(mensualidad)),
              String(Math.max(0, diasDeRetraso(mensualidad.fechaVencimiento))),
              estadoMensualidad(mensualidad),
            ])}
            exportar={exportarTabla(
              `pagos-pendientes-${anio}`,
              pendientesYVencidos.map(({ mensualidad, cliente }) => ({
                Cliente: cliente!.nombre,
                Mes: `${String(mensualidad.mes).padStart(2, "0")}/${mensualidad.anio}`,
                "Importe pendiente": saldoPendiente(mensualidad).toFixed(2),
                "Días de retraso": Math.max(0, diasDeRetraso(mensualidad.fechaVencimiento)),
                Estado: estadoMensualidad(mensualidad),
              })),
              `Pagos pendientes ${anio}`
            )}
          />

          <TablaConExportar
            titulo="Pagos recibidos por método de pago"
            nombreArchivo={`pagos-por-metodo-${anio}`}
            columnas={["Método de pago", "Total cobrado"]}
            filas={cobrosPorMetodo.map((f) => [f.metodo, formatCurrency(f.total)])}
            exportar={exportarTabla(
              `pagos-por-metodo-${anio}`,
              cobrosPorMetodo.map((f) => ({ "Método de pago": f.metodo, "Total cobrado": f.total.toFixed(2) })),
              `Pagos por método de pago ${anio}`
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ResumenTarjeta({
  label,
  valor,
  tono = "primary",
}: {
  label: string;
  valor: number;
  tono?: "primary" | "success" | "danger";
}) {
  const color = tono === "success" ? "text-success" : tono === "danger" ? "text-danger" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-semibold mt-1 ${color}`}>{formatCurrency(valor)}</p>
      </CardContent>
    </Card>
  );
}

function TablaConExportar({
  titulo,
  columnas,
  filas,
  exportar,
}: {
  titulo: string;
  nombreArchivo: string;
  columnas: string[];
  filas: (string | number)[][];
  exportar: { csv: () => void; excel: () => void; pdf: () => void } | null;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">{titulo}</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-3.5 w-3.5" /> Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportar?.excel()}>
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportar?.csv()}>
              <FileSpreadsheet className="h-4 w-4" /> CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportar?.pdf()}>
              <FileText className="h-4 w-4" /> PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="p-0">
        {filas.length === 0 ? (
          <p className="text-sm text-muted-foreground px-5 pb-5">No hay datos disponibles para este periodo.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columnas.map((c) => (
                    <TableHead key={c}>{c}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((fila, i) => (
                  <TableRow key={i}>
                    {fila.map((valor, j) => (
                      <TableCell key={j} className={j > 0 ? "text-right" : "font-medium"}>
                        {valor}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
              {filas.length > 1 && <TableFooter />}
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
