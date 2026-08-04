"use client";

import * as React from "react";
import { v4 as uuid } from "uuid";
import type {
  Cliente,
  Mensualidad,
  PagoMensualidad,
  Ingreso,
  Gasto,
  CategoriaGasto,
  PagoRecurrente,
  Configuracion,
  HistorialEvento,
} from "./types";
import {
  crearClientesSemilla,
  crearMensualidadesSemilla,
  crearGastosSemilla,
  crearIngresosOtrosSemilla,
  crearPagosRecurrentesSemilla,
  crearCategoriasGasto,
  crearConfiguracionInicial,
} from "./mock-data";
import { nowISO } from "./format";

const STORAGE_KEY = "contacontrol:data:v1";

interface DataState {
  clientes: Cliente[];
  mensualidades: Mensualidad[];
  ingresos: Ingreso[];
  gastos: Gasto[];
  categoriasGasto: CategoriaGasto[];
  pagosRecurrentes: PagoRecurrente[];
  configuracion: Configuracion;
}

function seed(): DataState {
  const clientes = crearClientesSemilla();
  const categoriasGasto = crearCategoriasGasto();
  return {
    clientes,
    mensualidades: crearMensualidadesSemilla(clientes),
    ingresos: crearIngresosOtrosSemilla(),
    gastos: crearGastosSemilla(categoriasGasto),
    categoriasGasto,
    pagosRecurrentes: crearPagosRecurrentesSemilla(categoriasGasto),
    configuracion: crearConfiguracionInicial(),
  };
}

interface DataContextValue extends DataState {
  hydrated: boolean;
  // Clientes
  crearCliente: (c: Omit<Cliente, "id" | "creadoEn" | "actualizadoEn" | "documentos">) => Cliente;
  actualizarCliente: (id: string, cambios: Partial<Cliente>) => void;
  archivarCliente: (id: string) => void;
  // Mensualidades
  obtenerOCrearMensualidad: (clienteId: string, anio: number, mes: number) => Mensualidad;
  registrarPago: (mensualidadId: string, pago: Omit<PagoMensualidad, "id">) => void;
  actualizarMensualidad: (id: string, cambios: Partial<Mensualidad>) => void;
  marcarNoAplica: (id: string, noAplica: boolean) => void;
  registrarSeguimiento: (mensualidadId: string, nota: string) => void;
  // Ingresos
  crearIngreso: (i: Omit<Ingreso, "id" | "creadoEn" | "actualizadoEn" | "adjuntos">) => Ingreso;
  actualizarIngreso: (id: string, cambios: Partial<Ingreso>) => void;
  eliminarIngreso: (id: string) => void;
  // Gastos
  crearGasto: (g: Omit<Gasto, "id" | "creadoEn" | "actualizadoEn" | "adjuntos">) => Gasto;
  actualizarGasto: (id: string, cambios: Partial<Gasto>) => void;
  eliminarGasto: (id: string) => void;
  // Categorías de gasto
  crearCategoriaGasto: (nombre: string) => CategoriaGasto;
  actualizarCategoriaGasto: (id: string, cambios: Partial<CategoriaGasto>) => void;
  archivarCategoriaGasto: (id: string) => void;
  // Pagos recurrentes
  crearPagoRecurrente: (p: Omit<PagoRecurrente, "id" | "creadoEn" | "actualizadoEn">) => PagoRecurrente;
  actualizarPagoRecurrente: (id: string, cambios: Partial<PagoRecurrente>) => void;
  eliminarPagoRecurrente: (id: string) => void;
  // Configuración
  actualizarConfiguracion: (cambios: Partial<Configuracion>) => void;
  // Utilidades
  reiniciarDatos: () => void;
  exportarDatos: () => string;
  importarDatos: (json: string) => boolean;
}

const DataContext = React.createContext<DataContextValue | null>(null);

function addHistorial(m: Mensualidad, descripcion: string): HistorialEvento[] {
  return [...m.historial, { id: uuid(), fecha: nowISO(), descripcion }];
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<DataState>(() => seed());
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    // localStorage no existe durante el renderizado en el servidor, por lo que
    // el estado inicial siempre parte de los datos de semilla (para que el HTML
    // del servidor y el primer render del cliente coincidan) y solo se sustituye
    // por los datos guardados una vez montado en el navegador.
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DataState;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(parsed);
      }
    } catch {
      // ignorar datos corruptos, se mantiene la semilla
    } finally {
      setHydrated(true);
    }
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // almacenamiento lleno o no disponible
    }
  }, [state, hydrated]);

  const crearCliente: DataContextValue["crearCliente"] = (c) => {
    const nuevo: Cliente = {
      ...c,
      id: uuid(),
      documentos: [],
      creadoEn: nowISO(),
      actualizadoEn: nowISO(),
    };
    setState((s) => ({ ...s, clientes: [...s.clientes, nuevo] }));
    return nuevo;
  };

  const actualizarCliente: DataContextValue["actualizarCliente"] = (id, cambios) => {
    setState((s) => ({
      ...s,
      clientes: s.clientes.map((c) =>
        c.id === id ? { ...c, ...cambios, actualizadoEn: nowISO() } : c
      ),
    }));
  };

  const archivarCliente: DataContextValue["archivarCliente"] = (id) => {
    actualizarCliente(id, { estado: "inactivo" });
  };

  const obtenerOCrearMensualidad: DataContextValue["obtenerOCrearMensualidad"] = (
    clienteId,
    anio,
    mes
  ) => {
    const existente = state.mensualidades.find(
      (m) => m.clienteId === clienteId && m.anio === anio && m.mes === mes
    );
    if (existente) return existente;
    const cliente = state.clientes.find((c) => c.id === clienteId);
    const fechaVencimiento = `${anio}-${String(mes).padStart(2, "0")}-${String(
      cliente?.diaVencimiento ?? 1
    ).padStart(2, "0")}`;
    const nueva: Mensualidad = {
      id: uuid(),
      clienteId,
      anio,
      mes,
      importeAcordado: cliente?.importeMensual ?? 0,
      fechaVencimiento,
      adjuntos: [],
      pagos: [],
      historial: [{ id: uuid(), fecha: nowISO(), descripcion: "Mensualidad creada" }],
      creadoEn: nowISO(),
      actualizadoEn: nowISO(),
    };
    setState((s) => ({ ...s, mensualidades: [...s.mensualidades, nueva] }));
    return nueva;
  };

  const registrarPago: DataContextValue["registrarPago"] = (mensualidadId, pago) => {
    setState((s) => ({
      ...s,
      mensualidades: s.mensualidades.map((m) => {
        if (m.id !== mensualidadId) return m;
        const nuevoPago: PagoMensualidad = { ...pago, id: uuid() };
        return {
          ...m,
          pagos: [...m.pagos, nuevoPago],
          historial: addHistorial(
            m,
            `Pago registrado: ${nuevoPago.importe.toFixed(2)} € (${pago.metodoPago})`
          ),
          actualizadoEn: nowISO(),
        };
      }),
    }));
  };

  const actualizarMensualidad: DataContextValue["actualizarMensualidad"] = (id, cambios) => {
    setState((s) => ({
      ...s,
      mensualidades: s.mensualidades.map((m) =>
        m.id === id
          ? {
              ...m,
              ...cambios,
              historial: addHistorial(m, "Datos de la mensualidad actualizados"),
              actualizadoEn: nowISO(),
            }
          : m
      ),
    }));
  };

  const marcarNoAplica: DataContextValue["marcarNoAplica"] = (id, noAplica) => {
    setState((s) => ({
      ...s,
      mensualidades: s.mensualidades.map((m) =>
        m.id === id
          ? {
              ...m,
              estadoManual: noAplica ? "no_aplica" : undefined,
              historial: addHistorial(
                m,
                noAplica ? "Marcada como no aplicable" : "Marca de no aplicable eliminada"
              ),
              actualizadoEn: nowISO(),
            }
          : m
      ),
    }));
  };

  const registrarSeguimiento: DataContextValue["registrarSeguimiento"] = (mensualidadId, nota) => {
    setState((s) => ({
      ...s,
      mensualidades: s.mensualidades.map((m) =>
        m.id === mensualidadId
          ? {
              ...m,
              historial: addHistorial(m, `Seguimiento de cobro: ${nota}`),
              actualizadoEn: nowISO(),
            }
          : m
      ),
    }));
  };

  const crearIngreso: DataContextValue["crearIngreso"] = (i) => {
    const nuevo: Ingreso = { ...i, id: uuid(), adjuntos: [], creadoEn: nowISO(), actualizadoEn: nowISO() };
    setState((s) => ({ ...s, ingresos: [...s.ingresos, nuevo] }));
    return nuevo;
  };

  const actualizarIngreso: DataContextValue["actualizarIngreso"] = (id, cambios) => {
    setState((s) => ({
      ...s,
      ingresos: s.ingresos.map((i) =>
        i.id === id ? { ...i, ...cambios, actualizadoEn: nowISO() } : i
      ),
    }));
  };

  const eliminarIngreso: DataContextValue["eliminarIngreso"] = (id) => {
    setState((s) => ({ ...s, ingresos: s.ingresos.filter((i) => i.id !== id) }));
  };

  const crearGasto: DataContextValue["crearGasto"] = (g) => {
    const nuevo: Gasto = { ...g, id: uuid(), adjuntos: [], creadoEn: nowISO(), actualizadoEn: nowISO() };
    setState((s) => ({ ...s, gastos: [...s.gastos, nuevo] }));
    return nuevo;
  };

  const actualizarGasto: DataContextValue["actualizarGasto"] = (id, cambios) => {
    setState((s) => ({
      ...s,
      gastos: s.gastos.map((g) => (g.id === id ? { ...g, ...cambios, actualizadoEn: nowISO() } : g)),
    }));
  };

  const eliminarGasto: DataContextValue["eliminarGasto"] = (id) => {
    setState((s) => ({ ...s, gastos: s.gastos.filter((g) => g.id !== id) }));
  };

  const crearCategoriaGasto: DataContextValue["crearCategoriaGasto"] = (nombre) => {
    const nueva: CategoriaGasto = { id: uuid(), nombre, archivada: false, predeterminada: false };
    setState((s) => ({ ...s, categoriasGasto: [...s.categoriasGasto, nueva] }));
    return nueva;
  };

  const actualizarCategoriaGasto: DataContextValue["actualizarCategoriaGasto"] = (id, cambios) => {
    setState((s) => ({
      ...s,
      categoriasGasto: s.categoriasGasto.map((c) => (c.id === id ? { ...c, ...cambios } : c)),
    }));
  };

  const archivarCategoriaGasto: DataContextValue["archivarCategoriaGasto"] = (id) => {
    actualizarCategoriaGasto(id, { archivada: true });
  };

  const crearPagoRecurrente: DataContextValue["crearPagoRecurrente"] = (p) => {
    const nuevo: PagoRecurrente = { ...p, id: uuid(), creadoEn: nowISO(), actualizadoEn: nowISO() };
    setState((s) => ({ ...s, pagosRecurrentes: [...s.pagosRecurrentes, nuevo] }));
    return nuevo;
  };

  const actualizarPagoRecurrente: DataContextValue["actualizarPagoRecurrente"] = (id, cambios) => {
    setState((s) => ({
      ...s,
      pagosRecurrentes: s.pagosRecurrentes.map((p) =>
        p.id === id ? { ...p, ...cambios, actualizadoEn: nowISO() } : p
      ),
    }));
  };

  const eliminarPagoRecurrente: DataContextValue["eliminarPagoRecurrente"] = (id) => {
    setState((s) => ({ ...s, pagosRecurrentes: s.pagosRecurrentes.filter((p) => p.id !== id) }));
  };

  const actualizarConfiguracion: DataContextValue["actualizarConfiguracion"] = (cambios) => {
    setState((s) => ({ ...s, configuracion: { ...s.configuracion, ...cambios } }));
  };

  const reiniciarDatos: DataContextValue["reiniciarDatos"] = () => {
    setState(seed());
  };

  const exportarDatos: DataContextValue["exportarDatos"] = () => JSON.stringify(state, null, 2);

  const importarDatos: DataContextValue["importarDatos"] = (json) => {
    try {
      const parsed = JSON.parse(json) as DataState;
      if (!parsed.clientes || !parsed.configuracion) return false;
      setState(parsed);
      return true;
    } catch {
      return false;
    }
  };

  const value: DataContextValue = {
    ...state,
    hydrated,
    crearCliente,
    actualizarCliente,
    archivarCliente,
    obtenerOCrearMensualidad,
    registrarPago,
    actualizarMensualidad,
    marcarNoAplica,
    registrarSeguimiento,
    crearIngreso,
    actualizarIngreso,
    eliminarIngreso,
    crearGasto,
    actualizarGasto,
    eliminarGasto,
    crearCategoriaGasto,
    actualizarCategoriaGasto,
    archivarCategoriaGasto,
    crearPagoRecurrente,
    actualizarPagoRecurrente,
    eliminarPagoRecurrente,
    actualizarConfiguracion,
    reiniciarDatos,
    exportarDatos,
    importarDatos,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = React.useContext(DataContext);
  if (!ctx) throw new Error("useData debe usarse dentro de <DataProvider>");
  return ctx;
}
