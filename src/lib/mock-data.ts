import { v4 as uuid } from "uuid";
import type {
  Cliente,
  Mensualidad,
  Gasto,
  Ingreso,
  PagoRecurrente,
  CategoriaGasto,
  Configuracion,
} from "./types";
import { CATEGORIAS_GASTO_INICIALES } from "./constants";

const ANIO_ACTUAL = new Date().getFullYear();

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function crearCategoriasGasto(): CategoriaGasto[] {
  return CATEGORIAS_GASTO_INICIALES.map((nombre) => ({
    id: uuid(),
    nombre,
    archivada: false,
    predeterminada: true,
  }));
}

export function crearClientesSemilla(): Cliente[] {
  const base: Array<Partial<Cliente> & { nombre: string }> = [
    {
      nombre: "Padaria Bom Sabor, Lda.",
      tipo: "empresa",
      categoria: "fijo",
      nif: "509123456",
      personaContacto: "Miguel Santos",
      telefono: "+351 912 345 678",
      email: "miguel@bomsabor.pt",
      pais: "Portugal",
      servicioContratado: "Contabilidad mensual + IVA",
      importeMensual: 180,
      diaVencimiento: 8,
    },
    {
      nombre: "Ana Ferreira - Cabeleireira",
      tipo: "autonomo",
      categoria: "fijo",
      nif: "231456789",
      personaContacto: "Ana Ferreira",
      telefono: "+351 913 222 111",
      email: "ana.ferreira@email.pt",
      pais: "Portugal",
      servicioContratado: "Contabilidad + Segurança Social",
      importeMensual: 90,
      diaVencimiento: 5,
    },
    {
      nombre: "TechNova Soluções Digitais",
      tipo: "empresa",
      categoria: "fijo",
      nif: "512987654",
      personaContacto: "Rui Costa",
      telefono: "+351 917 555 222",
      email: "rui@technova.pt",
      pais: "Portugal",
      servicioContratado: "Contabilidad + Facturación",
      importeMensual: 320,
      diaVencimiento: 10,
    },
    {
      nombre: "João Pereira - Eletricista",
      tipo: "autonomo",
      categoria: "fijo",
      nif: "198765432",
      personaContacto: "João Pereira",
      telefono: "+351 918 111 333",
      email: "joao.pereira@email.pt",
      pais: "Portugal",
      servicioContratado: "IVA trimestral + IRS",
      importeMensual: 60,
      diaVencimiento: 15,
    },
    {
      nombre: "Café Central Lisboa",
      tipo: "empresa",
      categoria: "fijo",
      nif: "505333222",
      personaContacto: "Sofia Almeida",
      telefono: "+351 919 444 555",
      email: "sofia@cafecentral.pt",
      pais: "Portugal",
      servicioContratado: "Contabilidad mensual",
      importeMensual: 150,
      diaVencimiento: 12,
    },
    {
      nombre: "Marta Lopes - Consultoria",
      tipo: "particular",
      categoria: "temporal",
      nif: "245778899",
      personaContacto: "Marta Lopes",
      telefono: "+351 920 666 777",
      email: "marta.lopes@email.pt",
      pais: "Portugal",
      servicioContratado: "Declaración IRS anual",
      importeMensual: 75,
      diaVencimiento: 20,
      estado: "activo" as const,
    },
    {
      nombre: "Green Garden Jardinagem",
      tipo: "empresa",
      categoria: "fijo",
      nif: "507111222",
      personaContacto: "Carlos Nunes",
      telefono: "+351 921 888 999",
      email: "carlos@greengarden.pt",
      pais: "Portugal",
      servicioContratado: "Contabilidad + Recursos Humanos",
      importeMensual: 210,
      diaVencimiento: 6,
    },
    {
      nombre: "Pedro Silva - Fotógrafo",
      tipo: "autonomo",
      categoria: "temporal",
      nif: "233444555",
      personaContacto: "Pedro Silva",
      telefono: "+351 922 123 456",
      email: "pedro.silva@email.pt",
      pais: "Portugal",
      servicioContratado: "Apertura de actividad + IVA",
      importeMensual: 55,
      diaVencimiento: 18,
      estado: "pausado" as const,
    },
  ];

  return base.map((c, i) => {
    const creadoEn = iso(ANIO_ACTUAL - 1, ((i % 6) + 1), 1);
    return {
      id: uuid(),
      nombre: c.nombre,
      tipo: c.tipo!,
      categoria: c.categoria!,
      nif: c.nif!,
      personaContacto: c.personaContacto,
      telefono: c.telefono,
      email: c.email,
      direccion: "Lisboa, Portugal",
      pais: c.pais!,
      servicioContratado: c.servicioContratado!,
      importeMensual: c.importeMensual!,
      diaVencimiento: c.diaVencimiento!,
      fechaInicio: creadoEn,
      estado: c.estado ?? "activo",
      notas: "",
      documentos: [],
      creadoEn: `${creadoEn}T09:00:00.000Z`,
      actualizadoEn: `${creadoEn}T09:00:00.000Z`,
    } satisfies Cliente;
  });
}

/** Genera mensualidades Ene-Dic del año actual para cada cliente, con pagos realistas. */
export function crearMensualidadesSemilla(clientes: Cliente[]): Mensualidad[] {
  const mensualidades: Mensualidad[] = [];
  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;

  clientes.forEach((cliente, idx) => {
    for (let mes = 1; mes <= 12; mes++) {
      const fechaVenc = iso(ANIO_ACTUAL, mes, Math.min(cliente.diaVencimiento, 28));
      const esFuturo = mes > mesActual;
      const esClientePausado = cliente.estado === "pausado" && mes > 6;

      const id = uuid();
      const pagos: Mensualidad["pagos"] = [];
      const historial: Mensualidad["historial"] = [
        {
          id: uuid(),
          fecha: `${iso(ANIO_ACTUAL, mes, 1)}T08:00:00.000Z`,
          descripcion: "Mensualidad generada automáticamente",
        },
      ];

      if (esClientePausado) {
        mensualidades.push({
          id,
          clienteId: cliente.id,
          anio: ANIO_ACTUAL,
          mes,
          importeAcordado: cliente.importeMensual,
          fechaVencimiento: fechaVenc,
          estadoManual: "no_aplica",
          adjuntos: [],
          pagos,
          historial,
          creadoEn: historial[0].fecha,
          actualizadoEn: historial[0].fecha,
        });
        continue;
      }

      if (!esFuturo) {
        // Distribuir estados: la mayoría pagados, algunos parciales, algunos pendientes/vencidos
        const patron = (idx + mes) % 5;
        if (patron <= 2) {
          // pagado completo
          pagos.push({
            id: uuid(),
            fecha: `${iso(ANIO_ACTUAL, mes, Math.max(1, cliente.diaVencimiento - 2))}T10:00:00.000Z`,
            importe: cliente.importeMensual,
            metodoPago: idx % 2 === 0 ? "transferencia" : "mbway",
            notas: "",
          });
          historial.push({
            id: uuid(),
            fecha: pagos[0].fecha,
            descripcion: `Pago registrado: ${cliente.importeMensual.toFixed(2)} €`,
          });
        } else if (patron === 3) {
          // parcial
          const parcial = Math.round(cliente.importeMensual * 0.5 * 100) / 100;
          pagos.push({
            id: uuid(),
            fecha: `${iso(ANIO_ACTUAL, mes, cliente.diaVencimiento)}T10:00:00.000Z`,
            importe: parcial,
            metodoPago: "efectivo",
            notas: "Pago parcial, resta pendiente",
          });
          historial.push({
            id: uuid(),
            fecha: pagos[0].fecha,
            descripcion: `Pago parcial registrado: ${parcial.toFixed(2)} €`,
          });
        }
        // patron === 4: sin pagos (pendiente o vencido según fecha)
      }

      mensualidades.push({
        id,
        clienteId: cliente.id,
        anio: ANIO_ACTUAL,
        mes,
        importeAcordado: cliente.importeMensual,
        fechaVencimiento: fechaVenc,
        numeroFactura: !esFuturo ? `FT ${ANIO_ACTUAL}/${String(mes).padStart(2, "0")}-${idx + 1}` : undefined,
        adjuntos: [],
        pagos,
        historial,
        creadoEn: historial[0].fecha,
        actualizadoEn: historial[historial.length - 1].fecha,
      });
    }
  });

  return mensualidades;
}

export function crearGastosSemilla(categorias: CategoriaGasto[]): Gasto[] {
  const cat = (nombre: string) => categorias.find((c) => c.nombre === nombre)?.id ?? categorias[0].id;
  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;

  const plantillas: Array<Omit<Gasto, "id" | "creadoEn" | "actualizadoEn" | "adjuntos" | "categoriaId"> & { categoriaNombre: string }> = [
    {
      fecha: iso(ANIO_ACTUAL, mesActual, 3),
      descripcion: "Renda do escritório",
      categoriaNombre: "Alquiler",
      proveedor: "Imobiliária Lisboa Centro",
      importe: 450,
      estado: "pagado",
      metodoPago: "transferencia",
      tipo: "profesional",
      recurrente: true,
      deducible: "si",
      nifProveedor: "500222333",
      numeroFactura: "REC-2026-08",
    },
    {
      fecha: iso(ANIO_ACTUAL, mesActual, 5),
      descripcion: "Eletricidade escritório",
      categoriaNombre: "Electricidad",
      proveedor: "EDP",
      importe: 62.4,
      estado: "pagado",
      metodoPago: "debito_directo",
      tipo: "profesional",
      recurrente: true,
      deducible: "si",
    },
    {
      fecha: iso(ANIO_ACTUAL, mesActual, 7),
      descripcion: "Internet + telefone",
      categoriaNombre: "Internet",
      proveedor: "MEO",
      importe: 39.9,
      estado: "pagado",
      metodoPago: "debito_directo",
      tipo: "profesional",
      recurrente: true,
      deducible: "si",
    },
    {
      fecha: iso(ANIO_ACTUAL, mesActual, 10),
      descripcion: "Software de contabilidad (subscrição)",
      categoriaNombre: "Software y suscripciones",
      proveedor: "Sage Portugal",
      importe: 45,
      estado: "pagado",
      metodoPago: "tarjeta",
      tipo: "profesional",
      recurrente: true,
      deducible: "si",
    },
    {
      fecha: iso(ANIO_ACTUAL, mesActual, 12),
      descripcion: "Seguro de responsabilidade civil",
      categoriaNombre: "Seguros",
      proveedor: "Fidelidade",
      importe: 28.5,
      estado: "pendiente",
      fechaVencimiento: iso(ANIO_ACTUAL, mesActual, 25),
      metodoPago: "debito_directo",
      tipo: "profesional",
      recurrente: true,
      deducible: "si",
    },
    {
      fecha: iso(ANIO_ACTUAL, mesActual, 1),
      descripcion: "Segurança Social - trabalhador independente",
      categoriaNombre: "Seguridad Social",
      proveedor: "Segurança Social",
      importe: 220,
      estado: "pagado",
      metodoPago: "debito_directo",
      tipo: "profesional",
      recurrente: true,
      deducible: "si",
    },
    {
      fecha: iso(ANIO_ACTUAL, mesActual, 15),
      descripcion: "Combustível deslocações a clientes",
      categoriaNombre: "Combustible",
      proveedor: "Galp",
      importe: 58.2,
      estado: "pagado",
      metodoPago: "tarjeta",
      tipo: "profesional",
      recurrente: false,
      deducible: "revisar",
    },
    {
      fecha: iso(ANIO_ACTUAL, mesActual, 18),
      descripcion: "Material de escritório",
      categoriaNombre: "Material de oficina",
      proveedor: "Staples",
      importe: 34.7,
      estado: "pagado",
      metodoPago: "efectivo",
      tipo: "profesional",
      recurrente: false,
      deducible: "si",
    },
    {
      fecha: iso(ANIO_ACTUAL, mesActual, 20),
      descripcion: "Comissões bancárias mensais",
      categoriaNombre: "Comisiones bancarias",
      proveedor: "Banco CTT",
      importe: 8.9,
      estado: "pagado",
      metodoPago: "debito_directo",
      tipo: "profesional",
      recurrente: true,
      deducible: "si",
    },
    {
      fecha: iso(ANIO_ACTUAL, mesActual, 22),
      descripcion: "Supermercado",
      categoriaNombre: "Mercado y alimentación",
      proveedor: "Continente",
      importe: 96.15,
      estado: "pagado",
      metodoPago: "tarjeta",
      tipo: "personal",
      recurrente: false,
      deducible: "no",
    },
    {
      fecha: iso(ANIO_ACTUAL, mesActual - 1 < 1 ? 12 : mesActual - 1, 28),
      descripcion: "Publicidade em redes sociais",
      categoriaNombre: "Marketing y publicidad",
      proveedor: "Meta Ads",
      importe: 40,
      estado: "pagado",
      metodoPago: "tarjeta",
      tipo: "profesional",
      recurrente: false,
      deducible: "si",
    },
  ];

  return plantillas.map((p) => ({
    ...p,
    id: uuid(),
    categoriaId: cat(p.categoriaNombre),
    adjuntos: [],
    creadoEn: `${p.fecha}T09:00:00.000Z`,
    actualizadoEn: `${p.fecha}T09:00:00.000Z`,
  }));
}

export function crearIngresosOtrosSemilla(): Ingreso[] {
  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;
  const mesLabel = `${ANIO_ACTUAL}-${String(mesActual).padStart(2, "0")}`;

  return [
    {
      id: uuid(),
      tipo: "otro",
      fecha: iso(ANIO_ACTUAL, mesActual, 4),
      concepto: "Consultoria pontual - abertura de empresa",
      categoria: "Consultoría",
      mesCorrespondiente: mesLabel,
      importe: 250,
      metodoPago: "transferencia",
      estado: "cobrado",
      numeroFactura: "FT 2026/OT-01",
      adjuntos: [],
      creadoEn: `${iso(ANIO_ACTUAL, mesActual, 4)}T09:00:00.000Z`,
      actualizadoEn: `${iso(ANIO_ACTUAL, mesActual, 4)}T09:00:00.000Z`,
    },
    {
      id: uuid(),
      tipo: "otro",
      fecha: iso(ANIO_ACTUAL, mesActual, 16),
      concepto: "Formação em faturação eletrónica",
      categoria: "Otros ingresos",
      mesCorrespondiente: mesLabel,
      importe: 120,
      metodoPago: "mbway",
      estado: "cobrado",
      adjuntos: [],
      creadoEn: `${iso(ANIO_ACTUAL, mesActual, 16)}T09:00:00.000Z`,
      actualizadoEn: `${iso(ANIO_ACTUAL, mesActual, 16)}T09:00:00.000Z`,
    },
  ];
}

export function crearPagosRecurrentesSemilla(categorias: CategoriaGasto[]): PagoRecurrente[] {
  const cat = (nombre: string) => categorias.find((c) => c.nombre === nombre)?.id ?? categorias[0].id;
  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;

  return [
    {
      id: uuid(),
      nombre: "Renda do escritório",
      categoriaId: cat("Alquiler"),
      proveedor: "Imobiliária Lisboa Centro",
      importe: 450,
      frecuencia: "mensual",
      proximaFecha: iso(ANIO_ACTUAL, mesActual + 1 > 12 ? 1 : mesActual + 1, 3),
      fechaInicio: iso(ANIO_ACTUAL - 1, 1, 3),
      metodoPago: "transferencia",
      tipo: "profesional",
      generarGastoAutomatico: true,
      diasAviso: 5,
      activo: true,
      creadoEn: `${iso(ANIO_ACTUAL - 1, 1, 3)}T09:00:00.000Z`,
      actualizadoEn: `${iso(ANIO_ACTUAL - 1, 1, 3)}T09:00:00.000Z`,
    },
    {
      id: uuid(),
      nombre: "Software de contabilidad",
      categoriaId: cat("Software y suscripciones"),
      proveedor: "Sage Portugal",
      importe: 45,
      frecuencia: "mensual",
      proximaFecha: iso(ANIO_ACTUAL, mesActual + 1 > 12 ? 1 : mesActual + 1, 10),
      fechaInicio: iso(ANIO_ACTUAL - 1, 3, 10),
      metodoPago: "tarjeta",
      tipo: "profesional",
      generarGastoAutomatico: true,
      diasAviso: 3,
      activo: true,
      creadoEn: `${iso(ANIO_ACTUAL - 1, 3, 10)}T09:00:00.000Z`,
      actualizadoEn: `${iso(ANIO_ACTUAL - 1, 3, 10)}T09:00:00.000Z`,
    },
    {
      id: uuid(),
      nombre: "Seguro de responsabilidad civil",
      categoriaId: cat("Seguros"),
      proveedor: "Fidelidade",
      importe: 28.5,
      frecuencia: "mensual",
      proximaFecha: iso(ANIO_ACTUAL, mesActual, 25),
      fechaInicio: iso(ANIO_ACTUAL - 1, 1, 25),
      metodoPago: "debito_directo",
      tipo: "profesional",
      generarGastoAutomatico: false,
      diasAviso: 7,
      activo: true,
      creadoEn: `${iso(ANIO_ACTUAL - 1, 1, 25)}T09:00:00.000Z`,
      actualizadoEn: `${iso(ANIO_ACTUAL - 1, 1, 25)}T09:00:00.000Z`,
    },
    {
      id: uuid(),
      nombre: "Seguro do carro",
      categoriaId: cat("Seguros"),
      proveedor: "Ageas",
      importe: 310,
      frecuencia: "anual",
      proximaFecha: iso(ANIO_ACTUAL + 1, 2, 1),
      fechaInicio: iso(ANIO_ACTUAL - 1, 2, 1),
      metodoPago: "debito_directo",
      tipo: "personal",
      generarGastoAutomatico: false,
      diasAviso: 15,
      activo: true,
      creadoEn: `${iso(ANIO_ACTUAL - 1, 2, 1)}T09:00:00.000Z`,
      actualizadoEn: `${iso(ANIO_ACTUAL - 1, 2, 1)}T09:00:00.000Z`,
    },
  ];
}

export function crearConfiguracionInicial(): Configuracion {
  return {
    nombreApp: "ContaControl",
    nombreNegocio: "",
    nif: "",
    direccion: "",
    telefono: "",
    email: "",
    moneda: "EUR",
    idioma: "es",
    zonaHoraria: "Europe/Lisbon",
    inicioAnioFiscal: 1,
    metodosPagoActivos: [
      "transferencia",
      "efectivo",
      "mbway",
      "tarjeta",
      "debito_directo",
      "paypal",
      "otro",
    ],
    copiaSeguridadAutomatica: false,
    notificacionesActivas: true,
    diasAnticipacionRecordatorio: 5,
    tema: "sistema",
  };
}
