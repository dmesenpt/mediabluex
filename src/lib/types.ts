// Tipos de dominio de ContaControl

export type TipoCliente = "particular" | "autonomo" | "empresa";
export type CategoriaCliente = "fijo" | "temporal";
export type EstadoCliente = "activo" | "pausado" | "inactivo";

export type MetodoPago =
  | "transferencia"
  | "efectivo"
  | "mbway"
  | "tarjeta"
  | "debito_directo"
  | "paypal"
  | "otro";

export type EstadoPagoMensual =
  | "pagado"
  | "pendiente"
  | "parcial"
  | "no_aplica"
  | "vencido";

export type EstadoIngreso = "pendiente" | "parcial" | "cobrado";
export type EstadoGasto = "pendiente" | "pagado";
export type TipoGasto = "personal" | "profesional";
export type Deducible = "si" | "no" | "revisar";
export type FrecuenciaRecurrente =
  | "semanal"
  | "mensual"
  | "trimestral"
  | "semestral"
  | "anual";

export interface Adjunto {
  id: string;
  nombre: string;
  url: string;
  tipo: string;
  tamano?: number;
  creadoEn: string;
}

export interface Cliente {
  id: string;
  userId?: string;
  nombre: string;
  tipo: TipoCliente;
  categoria: CategoriaCliente;
  nif: string;
  personaContacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  pais: string;
  servicioContratado: string;
  importeMensual: number;
  diaVencimiento: number; // 1-31
  fechaInicio: string;
  fechaFin?: string;
  estado: EstadoCliente;
  notas?: string;
  documentos: Adjunto[];
  creadoEn: string;
  actualizadoEn: string;
}

export interface PagoMensualidad {
  id: string;
  fecha: string;
  importe: number;
  metodoPago: MetodoPago;
  notas?: string;
}

export interface Mensualidad {
  id: string;
  clienteId: string;
  anio: number;
  mes: number; // 1-12
  importeAcordado: number;
  fechaVencimiento: string;
  estadoManual?: "no_aplica"; // marcado manualmente por el usuario
  numeroFactura?: string;
  notas?: string;
  adjuntos: Adjunto[];
  pagos: PagoMensualidad[];
  historial: HistorialEvento[];
  creadoEn: string;
  actualizadoEn: string;
}

export interface HistorialEvento {
  id: string;
  fecha: string;
  descripcion: string;
}

export type TipoIngreso = "pago_cliente" | "otro";

export interface Ingreso {
  id: string;
  userId?: string;
  tipo: TipoIngreso;
  clienteId?: string;
  mensualidadId?: string;
  fecha: string;
  concepto: string;
  categoria: string;
  mesCorrespondiente: string; // YYYY-MM
  importe: number;
  metodoPago: MetodoPago;
  estado: EstadoIngreso;
  numeroFactura?: string;
  notas?: string;
  adjuntos: Adjunto[];
  creadoEn: string;
  actualizadoEn: string;
}

export interface CategoriaGasto {
  id: string;
  nombre: string;
  archivada: boolean;
  predeterminada: boolean;
}

export interface Gasto {
  id: string;
  userId?: string;
  fecha: string;
  descripcion: string;
  categoriaId: string;
  proveedor?: string;
  importe: number;
  estado: EstadoGasto;
  fechaVencimiento?: string;
  metodoPago: MetodoPago;
  tipo: TipoGasto;
  recurrente: boolean;
  pagoRecurrenteId?: string;
  deducible: Deducible;
  nifProveedor?: string;
  numeroFactura?: string;
  notas?: string;
  adjuntos: Adjunto[];
  creadoEn: string;
  actualizadoEn: string;
}

export interface PagoRecurrente {
  id: string;
  userId?: string;
  nombre: string;
  categoriaId: string;
  proveedor?: string;
  importe: number;
  frecuencia: FrecuenciaRecurrente;
  proximaFecha: string;
  fechaInicio: string;
  fechaFin?: string;
  metodoPago: MetodoPago;
  tipo: TipoGasto;
  generarGastoAutomatico: boolean;
  diasAviso: number;
  activo: boolean;
  notas?: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface SeguimientoCobro {
  id: string;
  fecha: string;
  nota: string;
}

export interface Configuracion {
  nombreApp: string;
  nombreNegocio: string;
  nif: string;
  direccion: string;
  telefono: string;
  email: string;
  logoUrl?: string;
  moneda: string;
  idioma: string;
  zonaHoraria: string;
  inicioAnioFiscal: number; // mes 1-12
  metodosPagoActivos: MetodoPago[];
  copiaSeguridadAutomatica: boolean;
  notificacionesActivas: boolean;
  diasAnticipacionRecordatorio: number;
  tema: "claro" | "oscuro" | "sistema";
}
