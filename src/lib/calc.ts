import type { Mensualidad, EstadoPagoMensual, FrecuenciaRecurrente } from "./types";

export function totalPagado(m: Mensualidad): number {
  return m.pagos.reduce((acc, p) => acc + p.importe, 0);
}

export function saldoPendiente(m: Mensualidad): number {
  return Math.max(0, Math.round((m.importeAcordado - totalPagado(m)) * 100) / 100);
}

export function estadoMensualidad(m: Mensualidad): EstadoPagoMensual {
  if (m.estadoManual === "no_aplica") return "no_aplica";
  const pagado = totalPagado(m);
  const pendiente = m.importeAcordado - pagado;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(m.fechaVencimiento + "T00:00:00");

  if (pendiente <= 0.005) return "pagado";
  if (pagado > 0) {
    return venc < hoy ? "vencido" : "parcial";
  }
  return venc < hoy ? "vencido" : "pendiente";
}

export const ESTADO_LABEL: Record<EstadoPagoMensual, string> = {
  pagado: "Pagado",
  pendiente: "Pendiente",
  parcial: "Pago parcial",
  no_aplica: "No aplica",
  vencido: "Vencido",
};

export const ESTADO_COLOR_CLASSES: Record<EstadoPagoMensual, string> = {
  pagado: "bg-success-bg text-success border-success/30",
  pendiente: "bg-danger-bg text-danger border-danger/30",
  parcial: "bg-warning-bg text-warning border-warning/30",
  no_aplica: "bg-neutral-bg text-muted-foreground border-transparent",
  vencido: "bg-danger/90 text-white border-danger",
};

export const ESTADO_DOT_CLASSES: Record<EstadoPagoMensual, string> = {
  pagado: "bg-success",
  pendiente: "bg-danger",
  parcial: "bg-warning",
  no_aplica: "bg-neutral",
  vencido: "bg-danger",
};

export function diasDeRetraso(fechaVencimiento: string): number {
  const venc = new Date(fechaVencimiento + "T00:00:00");
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.floor((hoy.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
}

export function resumenCliente(clienteId: string, mensualidades: Mensualidad[]) {
  const propias = mensualidades.filter((m) => m.clienteId === clienteId && m.estadoManual !== "no_aplica");
  const totalFacturado = propias.reduce((acc, m) => acc + m.importeAcordado, 0);
  const totalPagadoCliente = propias.reduce((acc, m) => acc + totalPagado(m), 0);
  const totalPendienteCliente = propias.reduce((acc, m) => acc + saldoPendiente(m), 0);
  return { totalFacturado, totalPagado: totalPagadoCliente, totalPendiente: totalPendienteCliente };
}

export function avanzarFecha(fechaISO: string, frecuencia: FrecuenciaRecurrente): string {
  const d = new Date(fechaISO + "T00:00:00");
  switch (frecuencia) {
    case "semanal":
      d.setDate(d.getDate() + 7);
      break;
    case "mensual":
      d.setMonth(d.getMonth() + 1);
      break;
    case "trimestral":
      d.setMonth(d.getMonth() + 3);
      break;
    case "semestral":
      d.setMonth(d.getMonth() + 6);
      break;
    case "anual":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().slice(0, 10);
}

export function diasHastaVencimiento(fechaISO: string): number {
  const venc = new Date(fechaISO + "T00:00:00");
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

export function bucketAntiguedad(dias: number): string {
  if (dias <= 0) return "No vencidas";
  if (dias <= 30) return "1-30 días";
  if (dias <= 60) return "31-60 días";
  if (dias <= 90) return "61-90 días";
  return "Más de 90 días";
}
