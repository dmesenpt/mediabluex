import type { MetodoPago } from "./types";

export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export const MESES_ABREV = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;

export const METODOS_PAGO: { value: MetodoPago; label: string }[] = [
  { value: "transferencia", label: "Transferencia bancaria" },
  { value: "efectivo", label: "Efectivo" },
  { value: "mbway", label: "MB WAY" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "debito_directo", label: "Débito directo" },
  { value: "paypal", label: "PayPal" },
  { value: "otro", label: "Otro" },
];

export const CATEGORIAS_GASTO_INICIALES = [
  "Agua",
  "Electricidad",
  "Gas",
  "Internet",
  "Teléfono",
  "Mercado y alimentación",
  "Alquiler",
  "Seguros",
  "Transporte",
  "Combustible",
  "Software y suscripciones",
  "Material de oficina",
  "Marketing y publicidad",
  "Impuestos",
  "Seguridad Social",
  "Servicios profesionales",
  "Salud",
  "Mantenimiento",
  "Comisiones bancarias",
  "Otros",
];

export const CATEGORIAS_INGRESO_INICIALES = [
  "Mensualidad de cliente",
  "Servicio puntual",
  "Consultoría",
  "Reembolso",
  "Intereses",
  "Otros ingresos",
];

export const TIPOS_CLIENTE = [
  { value: "particular", label: "Particular" },
  { value: "autonomo", label: "Autónomo" },
  { value: "empresa", label: "Empresa" },
] as const;

export const ESTADOS_CLIENTE = [
  { value: "activo", label: "Activo" },
  { value: "pausado", label: "Pausado" },
  { value: "inactivo", label: "Inactivo" },
] as const;

export const FRECUENCIAS = [
  { value: "semanal", label: "Semanal" },
  { value: "mensual", label: "Mensual" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
] as const;

export const PAISES = [
  "Portugal",
  "España",
  "Brasil",
  "Francia",
  "Reino Unido",
  "Alemania",
  "Otro",
];

export const MONEDAS = [
  { value: "EUR", label: "Euro (€)" },
  { value: "USD", label: "Dólar estadounidense ($)" },
  { value: "GBP", label: "Libra esterlina (£)" },
  { value: "BRL", label: "Real brasileño (R$)" },
];

export const IDIOMAS = [{ value: "es", label: "Español" }];

export const ZONAS_HORARIAS = [
  "Europe/Lisbon",
  "Europe/Madrid",
  "Atlantic/Azores",
  "America/Sao_Paulo",
];
