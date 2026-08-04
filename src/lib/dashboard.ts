import type { Cliente, Gasto, Ingreso, Mensualidad, PagoRecurrente } from "./types";
import { estadoMensualidad, saldoPendiente, totalPagado } from "./calc";
import { MESES_ABREV } from "./constants";

function enMes(fecha: string, anio: number, mes: number) {
  const d = new Date(fecha + (fecha.length === 10 ? "T00:00:00" : ""));
  return d.getFullYear() === anio && d.getMonth() + 1 === mes;
}

export interface ResumenMes {
  totalFacturado: number;
  totalCobrado: number;
  totalPendiente: number;
  totalGastos: number;
  gastosPagados: number;
  beneficioNeto: number;
}

export function calcularResumenMes(
  anio: number,
  mes: number,
  mensualidades: Mensualidad[],
  ingresos: Ingreso[],
  gastos: Gasto[]
): ResumenMes {
  const mensualidadesMes = mensualidades.filter(
    (m) => m.anio === anio && m.mes === mes && m.estadoManual !== "no_aplica"
  );
  const otrosIngresosMes = ingresos.filter((i) => i.mesCorrespondiente === `${anio}-${String(mes).padStart(2, "0")}`);

  const facturadoMensualidades = mensualidadesMes.reduce((acc, m) => acc + m.importeAcordado, 0);
  const facturadoOtros = otrosIngresosMes.reduce((acc, i) => acc + i.importe, 0);

  const cobradoMensualidades = mensualidadesMes.reduce((acc, m) => acc + totalPagado(m), 0);
  const cobradoOtros = otrosIngresosMes
    .filter((i) => i.estado === "cobrado")
    .reduce((acc, i) => acc + i.importe, 0);
  const cobradoOtrosParcial = otrosIngresosMes
    .filter((i) => i.estado === "parcial")
    .reduce((acc, i) => acc + i.importe, 0);

  const pendienteMensualidades = mensualidadesMes.reduce((acc, m) => acc + saldoPendiente(m), 0);
  const pendienteOtros = otrosIngresosMes
    .filter((i) => i.estado !== "cobrado")
    .reduce((acc, i) => acc + i.importe, 0);

  const gastosMes = gastos.filter((g) => enMes(g.fecha, anio, mes));
  const totalGastos = gastosMes.reduce((acc, g) => acc + g.importe, 0);
  const gastosPagados = gastosMes.filter((g) => g.estado === "pagado").reduce((acc, g) => acc + g.importe, 0);

  const totalCobrado = cobradoMensualidades + cobradoOtros + cobradoOtrosParcial;

  return {
    totalFacturado: facturadoMensualidades + facturadoOtros,
    totalCobrado,
    totalPendiente: pendienteMensualidades + pendienteOtros,
    totalGastos,
    gastosPagados,
    beneficioNeto: totalCobrado - gastosPagados,
  };
}

export function serieIngresosGastos12Meses(
  anio: number,
  mes: number,
  mensualidades: Mensualidad[],
  ingresos: Ingreso[],
  gastos: Gasto[]
) {
  const puntos: { mes: string; ingresos: number; gastos: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    let m = mes - i;
    let a = anio;
    while (m <= 0) {
      m += 12;
      a -= 1;
    }
    const resumen = calcularResumenMes(a, m, mensualidades, ingresos, gastos);
    puntos.push({
      mes: `${MESES_ABREV[m - 1]} ${String(a).slice(2)}`,
      ingresos: Math.round(resumen.totalCobrado * 100) / 100,
      gastos: Math.round(resumen.gastosPagados * 100) / 100,
    });
  }
  return puntos;
}

export function distribucionGastosPorCategoria(
  anio: number,
  mes: number,
  gastos: Gasto[],
  categorias: { id: string; nombre: string }[]
) {
  const gastosMes = gastos.filter((g) => enMes(g.fecha, anio, mes));
  const porCategoria = new Map<string, number>();
  for (const g of gastosMes) {
    porCategoria.set(g.categoriaId, (porCategoria.get(g.categoriaId) ?? 0) + g.importe);
  }
  return Array.from(porCategoria.entries())
    .map(([categoriaId, total]) => ({
      categoria: categorias.find((c) => c.id === categoriaId)?.nombre ?? "Otros",
      total: Math.round(total * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total);
}

export function clientesPendientesDePago(
  anio: number,
  mes: number,
  clientes: Cliente[],
  mensualidades: Mensualidad[]
) {
  return mensualidades
    .filter((m) => m.anio === anio && m.mes === mes)
    .map((m) => ({ mensualidad: m, cliente: clientes.find((c) => c.id === m.clienteId) }))
    .filter(({ cliente, mensualidad }) => {
      if (!cliente) return false;
      const estado = estadoMensualidad(mensualidad);
      return estado === "pendiente" || estado === "parcial" || estado === "vencido";
    })
    .sort((a, b) => new Date(a.mensualidad.fechaVencimiento).getTime() - new Date(b.mensualidad.fechaVencimiento).getTime());
}

export function pagosVencidos(clientes: Cliente[], mensualidades: Mensualidad[]) {
  return mensualidades
    .map((m) => ({ mensualidad: m, cliente: clientes.find((c) => c.id === m.clienteId) }))
    .filter(({ cliente, mensualidad }) => cliente && estadoMensualidad(mensualidad) === "vencido")
    .sort((a, b) => new Date(a.mensualidad.fechaVencimiento).getTime() - new Date(b.mensualidad.fechaVencimiento).getTime());
}

export function proximosPagosRecurrentes(pagos: PagoRecurrente[], limite = 6) {
  return pagos
    .filter((p) => p.activo)
    .sort((a, b) => new Date(a.proximaFecha).getTime() - new Date(b.proximaFecha).getTime())
    .slice(0, limite);
}

export function proximosGastosPendientes(gastos: Gasto[], limite = 6) {
  return gastos
    .filter((g) => g.estado === "pendiente")
    .sort((a, b) => {
      const fa = a.fechaVencimiento ?? a.fecha;
      const fb = b.fechaVencimiento ?? b.fecha;
      return new Date(fa).getTime() - new Date(fb).getTime();
    })
    .slice(0, limite);
}
