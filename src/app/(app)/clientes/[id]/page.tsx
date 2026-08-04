"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Building2,
  Pencil,
  Archive,
  Wallet,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ClienteFormDialog } from "@/components/forms/cliente-form-dialog";
import { RegistrarPagoClienteDialog } from "@/components/forms/registrar-pago-cliente-dialog";
import { useData } from "@/lib/store";
import { formatCurrency, formatDate, mesAnioLabel } from "@/lib/format";
import { estadoMensualidad, resumenCliente, totalPagado } from "@/lib/calc";
import { TIPOS_CLIENTE } from "@/lib/constants";
import { toast } from "sonner";

const ESTADO_VARIANT = { activo: "success", pausado: "warning", inactivo: "neutral" } as const;

export default function ClienteDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { clientes, mensualidades, ingresos, archivarCliente } = useData();
  const [editando, setEditando] = React.useState(false);
  const [registrandoPago, setRegistrandoPago] = React.useState(false);
  const [confirmArchivar, setConfirmArchivar] = React.useState(false);

  const cliente = clientes.find((c) => c.id === params.id);

  if (!cliente) {
    return (
      <EmptyState
        icon={FileText}
        title="Cliente no encontrado"
        description="Puede que haya sido archivado o que el enlace no sea válido."
        action={
          <Button asChild>
            <Link href="/clientes">Volver a clientes</Link>
          </Button>
        }
      />
    );
  }

  const resumen = resumenCliente(cliente.id, mensualidades);
  const mensualidadesCliente = mensualidades
    .filter((m) => m.clienteId === cliente.id)
    .sort((a, b) => b.anio - a.anio || b.mes - a.mes);
  const mensualidadesPendientes = mensualidadesCliente.filter((m) => {
    const e = estadoMensualidad(m);
    return e === "pendiente" || e === "parcial" || e === "vencido";
  });
  const otrosIngresos = ingresos.filter((i) => i.clienteId === cliente.id);

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => router.push("/clientes")}>
        <ArrowLeft className="h-4 w-4" /> Volver a clientes
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold tracking-tight">{cliente.nombre}</h2>
            <Badge variant={ESTADO_VARIANT[cliente.estado]}>{cliente.estado}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {TIPOS_CLIENTE.find((t) => t.value === cliente.tipo)?.label} ·{" "}
            {cliente.categoria === "fijo" ? "Cliente fijo" : "Cliente temporal"} · NIF {cliente.nif}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="success" onClick={() => setRegistrandoPago(true)}>
            <Wallet className="h-4 w-4" /> Registrar pago
          </Button>
          <Button variant="outline" onClick={() => setEditando(true)}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
          {cliente.estado !== "inactivo" && (
            <Button variant="outline" className="text-danger" onClick={() => setConfirmArchivar(true)}>
              <Archive className="h-4 w-4" /> Desactivar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Total facturado</p>
            <p className="text-2xl font-semibold mt-1">{formatCurrency(resumen.totalFacturado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Total pagado</p>
            <p className="text-2xl font-semibold mt-1 text-success">{formatCurrency(resumen.totalPagado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Total pendiente</p>
            <p className="text-2xl font-semibold mt-1 text-danger">{formatCurrency(resumen.totalPendiente)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos generales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              {cliente.personaContacto && (
                <p className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" /> {cliente.personaContacto}
                </p>
              )}
              {cliente.email && (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" /> {cliente.email}
                </p>
              )}
              {cliente.telefono && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" /> {cliente.telefono}
                </p>
              )}
              {cliente.direccion && (
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" /> {cliente.direccion}, {cliente.pais}
                </p>
              )}
              <Separator className="my-2" />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Servicio</p>
                  <p className="font-medium text-foreground">{cliente.servicioContratado || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Mensualidad</p>
                  <p className="font-medium text-foreground">{formatCurrency(cliente.importeMensual)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Día de vencimiento</p>
                  <p className="font-medium text-foreground">Día {cliente.diaVencimiento}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Inicio</p>
                  <p className="font-medium text-foreground">{formatDate(cliente.fechaInicio)}</p>
                </div>
                {cliente.fechaFin && (
                  <div>
                    <p className="text-muted-foreground">Finalización</p>
                    <p className="font-medium text-foreground">{formatDate(cliente.fechaFin)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notas y documentos</CardTitle>
            </CardHeader>
            <CardContent>
              {cliente.notas ? (
                <p className="text-sm text-muted-foreground">{cliente.notas}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Sin notas registradas.</p>
              )}
              <Separator className="my-3" />
              {cliente.documentos.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay documentos adjuntos.</p>
              ) : (
                <ul className="space-y-1.5">
                  {cliente.documentos.map((d) => (
                    <li key={d.id} className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" /> {d.nombre}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mensualidades pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              {mensualidadesPendientes.length === 0 ? (
                <EmptyState icon={Wallet} title="Sin pendientes" description="Este cliente está al día con sus pagos." />
              ) : (
                <ul className="divide-y divide-border">
                  {mensualidadesPendientes.map((m) => (
                    <li key={m.id} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <p className="font-medium">{mesAnioLabel(m.mes, m.anio)}</p>
                        <p className="text-xs text-muted-foreground">Vence {formatDate(m.fechaVencimiento)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{formatCurrency(m.importeAcordado - totalPagado(m))}</span>
                        <EstadoBadge estado={estadoMensualidad(m)} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historial de pagos</CardTitle>
            </CardHeader>
            <CardContent>
              {mensualidadesCliente.every((m) => m.pagos.length === 0) ? (
                <EmptyState icon={FileText} title="Sin pagos registrados" />
              ) : (
                <ul className="divide-y divide-border max-h-96 overflow-y-auto">
                  {mensualidadesCliente
                    .flatMap((m) => m.pagos.map((p) => ({ ...p, mes: m.mes, anio: m.anio })))
                    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                    .map((p) => (
                      <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                        <div>
                          <p className="font-medium">{mesAnioLabel(p.mes, p.anio)}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(p.fecha)} · {p.metodoPago}</p>
                        </div>
                        <span className="font-medium text-success">{formatCurrency(p.importe)}</span>
                      </li>
                    ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {otrosIngresos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Otros ingresos asociados</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {otrosIngresos.map((i) => (
                    <li key={i.id} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <p className="font-medium">{i.concepto}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(i.fecha)}</p>
                      </div>
                      <span className="font-medium text-success">{formatCurrency(i.importe)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ClienteFormDialog open={editando} onOpenChange={setEditando} cliente={cliente} />
      <RegistrarPagoClienteDialog open={registrandoPago} onOpenChange={setRegistrandoPago} clienteIdInicial={cliente.id} />
      <ConfirmDialog
        open={confirmArchivar}
        onOpenChange={setConfirmArchivar}
        title="¿Desactivar este cliente?"
        description="El cliente pasará a estado inactivo. Su historial de pagos y movimientos se conservará."
        confirmLabel="Desactivar"
        destructive
        onConfirm={() => {
          archivarCliente(cliente.id);
          toast.success("Cliente desactivado.");
          setConfirmArchivar(false);
        }}
      />
    </div>
  );
}
