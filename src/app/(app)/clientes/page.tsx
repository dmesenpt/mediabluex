"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Plus, Mail, Phone, Users as UsersIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClienteFormDialog } from "@/components/forms/cliente-form-dialog";
import { useData } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { resumenCliente } from "@/lib/calc";
import { TIPOS_CLIENTE } from "@/lib/constants";

const ESTADO_VARIANT = { activo: "success", pausado: "warning", inactivo: "neutral" } as const;

export default function ClientesPage() {
  const { clientes, mensualidades } = useData();
  const [busqueda, setBusqueda] = React.useState("");
  const [tipo, setTipo] = React.useState("todos");
  const [categoria, setCategoria] = React.useState("todos");
  const [estado, setEstado] = React.useState("activo_pausado");
  const [dialogoAbierto, setDialogoAbierto] = React.useState(false);

  const filtrados = clientes
    .filter((c) => c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || c.nif.includes(busqueda))
    .filter((c) => tipo === "todos" || c.tipo === tipo)
    .filter((c) => categoria === "todos" || c.categoria === categoria)
    .filter((c) => {
      if (estado === "todos") return true;
      if (estado === "activo_pausado") return c.estado !== "inactivo";
      return c.estado === estado;
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Gestiona tus clientes fijos y temporales."
        actions={
          <Button onClick={() => setDialogoAbierto(true)}>
            <Plus className="h-4 w-4" /> Nuevo cliente
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o NIF…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            {TIPOS_CLIENTE.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Fijo/Temporal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Fijos y temporales</SelectItem>
            <SelectItem value="fijo">Fijo</SelectItem>
            <SelectItem value="temporal">Temporal</SelectItem>
          </SelectContent>
        </Select>
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activo_pausado">Activos y pausados</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="pausado">Pausados</SelectItem>
            <SelectItem value="inactivo">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No se han encontrado clientes"
          description="Prueba a cambiar los filtros o crea tu primer cliente."
          action={
            <Button onClick={() => setDialogoAbierto(true)}>
              <Plus className="h-4 w-4" /> Nuevo cliente
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map((c) => {
            const resumen = resumenCliente(c.id, mensualidades);
            return (
              <Link key={c.id} href={`/clientes/${c.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{c.nombre}</p>
                        <p className="text-xs text-muted-foreground">{c.servicioContratado || "Sin servicio definido"}</p>
                      </div>
                      <Badge variant={ESTADO_VARIANT[c.estado]}>{c.estado}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <Badge variant="outline">{TIPOS_CLIENTE.find((t) => t.value === c.tipo)?.label}</Badge>
                      <Badge variant="outline">{c.categoria === "fijo" ? "Fijo" : "Temporal"}</Badge>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      {c.email && (
                        <p className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3.5 w-3.5 shrink-0" /> {c.email}
                        </p>
                      )}
                      {c.telefono && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 shrink-0" /> {c.telefono}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Mensualidad</p>
                        <p className="font-semibold">{formatCurrency(c.importeMensual)}</p>
                      </div>
                      {resumen.totalPendiente > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Pendiente</p>
                          <p className="font-semibold text-danger">{formatCurrency(resumen.totalPendiente)}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <ClienteFormDialog open={dialogoAbierto} onOpenChange={setDialogoAbierto} />
    </div>
  );
}
