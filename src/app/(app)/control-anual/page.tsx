"use client";

import * as React from "react";
import { Search, Download, FileSpreadsheet, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { ControlAnualGrid } from "@/components/control-anual/control-anual-grid";
import { useData } from "@/lib/store";
import { estadoMensualidad, totalPagado } from "@/lib/calc";
import { MESES } from "@/lib/constants";
import { exportarCSV, exportarExcel, exportarPDF } from "@/lib/export-utils";
import { toast } from "sonner";

export default function ControlAnualPage() {
  const { clientes, mensualidades } = useData();
  const anioActual = new Date().getFullYear();
  const anios = Array.from({ length: 6 }, (_, i) => anioActual - 3 + i);

  const [anio, setAnio] = React.useState(anioActual);
  const [busqueda, setBusqueda] = React.useState("");
  const [tipoCliente, setTipoCliente] = React.useState<string>("todos");
  const [estadoPago, setEstadoPago] = React.useState<string>("todos");
  const [estadoActivo, setEstadoActivo] = React.useState<string>("todos");

  const clientesFiltrados = React.useMemo(() => {
    return clientes
      .filter((c) => c.nombre.toLowerCase().includes(busqueda.toLowerCase()))
      .filter((c) => tipoCliente === "todos" || c.categoria === tipoCliente)
      .filter((c) => estadoActivo === "todos" || c.estado === estadoActivo)
      .filter((c) => {
        if (estadoPago === "todos") return true;
        return mensualidades.some(
          (m) => m.clienteId === c.id && m.anio === anio && estadoMensualidad(m) === estadoPago
        );
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [clientes, busqueda, tipoCliente, estadoActivo, estadoPago, mensualidades, anio]);

  function datosExportacion() {
    return clientesFiltrados.map((c) => {
      const fila: Record<string, string | number> = { Cliente: c.nombre };
      let total = 0;
      MESES.forEach((mesLabel, i) => {
        const m = mensualidades.find((x) => x.clienteId === c.id && x.anio === anio && x.mes === i + 1);
        const pagado = m ? totalPagado(m) : 0;
        total += pagado;
        fila[mesLabel] = pagado.toFixed(2);
      });
      fila["Total"] = total.toFixed(2);
      return fila;
    });
  }

  function exportar(formato: "csv" | "excel" | "pdf") {
    const filas = datosExportacion();
    if (filas.length === 0) {
      toast.error("No hay datos para exportar con los filtros actuales.");
      return;
    }
    const nombre = `control-anual-${anio}`;
    if (formato === "csv") exportarCSV(nombre, filas);
    if (formato === "excel") exportarExcel(nombre, filas, `Control ${anio}`);
    if (formato === "pdf")
      exportarPDF(
        nombre,
        `Control anual de pagos ${anio}`,
        ["Cliente", ...MESES, "Total"],
        filas.map((f) => Object.values(f) as (string | number)[])
      );
    toast.success("Exportación generada.");
  }

  return (
    <div>
      <PageHeader
        title="Control anual de pagos"
        description="Vista general de las mensualidades de todos los clientes durante el año."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportar("excel")}>
                <FileSpreadsheet className="h-4 w-4" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportar("csv")}>
                <FileSpreadsheet className="h-4 w-4" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportar("pdf")}>
                <FileText className="h-4 w-4" /> PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))}>
          <SelectTrigger className="w-full sm:w-[110px]">
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
        <Select value={tipoCliente} onValueChange={setTipoCliente}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Tipo de cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="fijo">Fijo</SelectItem>
            <SelectItem value="temporal">Temporal</SelectItem>
          </SelectContent>
        </Select>
        <Select value={estadoPago} onValueChange={setEstadoPago}>
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="Estado del pago" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Cualquier estado</SelectItem>
            <SelectItem value="pagado">Pagado</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="parcial">Pago parcial</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>
        <Select value={estadoActivo} onValueChange={setEstadoActivo}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Activo/Inactivo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="pausado">Pausados</SelectItem>
            <SelectItem value="inactivo">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-3 mb-3 text-xs text-muted-foreground">
        <Legend color="bg-success" label="Pagado" />
        <Legend color="bg-danger" label="Pendiente" />
        <Legend color="bg-warning" label="Pago parcial" />
        <Legend color="bg-danger" label="Vencido" dark />
        <Legend color="bg-neutral" label="No aplica" />
      </div>

      <ControlAnualGrid anio={anio} clientesFiltrados={clientesFiltrados} />
    </div>
  );
}

function Legend({ color, label, dark }: { color: string; label: string; dark?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color} ${dark ? "ring-2 ring-danger/40" : ""}`} />
      {label}
    </span>
  );
}
