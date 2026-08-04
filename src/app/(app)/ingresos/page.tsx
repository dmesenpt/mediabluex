"use client";

import * as React from "react";
import { Plus, Search, Pencil, Trash2, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { IngresoOtroFormDialog } from "@/components/forms/ingreso-otro-form-dialog";
import { RegistrarPagoClienteDialog } from "@/components/forms/registrar-pago-cliente-dialog";
import { useData } from "@/lib/store";
import { formatCurrency, formatDate, mesAnioLabel } from "@/lib/format";
import { METODOS_PAGO } from "@/lib/constants";
import type { Ingreso } from "@/lib/types";
import { toast } from "sonner";

const ESTADO_INGRESO_VARIANT = { cobrado: "success", parcial: "warning", pendiente: "danger" } as const;

export default function IngresosPage() {
  const { clientes, mensualidades, ingresos, eliminarIngreso } = useData();
  const [busqueda, setBusqueda] = React.useState("");
  const [dialogoPagoCliente, setDialogoPagoCliente] = React.useState(false);
  const [dialogoOtro, setDialogoOtro] = React.useState<{ abierto: boolean; ingreso?: Ingreso }>({ abierto: false });
  const [aEliminar, setAEliminar] = React.useState<Ingreso | null>(null);

  const pagosClientes = React.useMemo(() => {
    return mensualidades
      .flatMap((m) => {
        const cliente = clientes.find((c) => c.id === m.clienteId);
        return m.pagos.map((p) => ({ pago: p, mensualidad: m, cliente }));
      })
      .filter(({ cliente }) => cliente?.nombre.toLowerCase().includes(busqueda.toLowerCase()) || busqueda === "")
      .sort((a, b) => new Date(b.pago.fecha).getTime() - new Date(a.pago.fecha).getTime());
  }, [mensualidades, clientes, busqueda]);

  const otrosIngresos = React.useMemo(() => {
    return ingresos
      .filter((i) => i.concepto.toLowerCase().includes(busqueda.toLowerCase()))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [ingresos, busqueda]);

  return (
    <div>
      <PageHeader
        title="Ingresos"
        description="Pagos de clientes y otros ingresos registrados."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDialogoPagoCliente(true)}>
              <Plus className="h-4 w-4" /> Pago de cliente
            </Button>
            <Button onClick={() => setDialogoOtro({ abierto: true })}>
              <Plus className="h-4 w-4" /> Otro ingreso
            </Button>
          </div>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="pl-9" />
      </div>

      <Tabs defaultValue="clientes">
        <TabsList>
          <TabsTrigger value="clientes">Pagos de clientes</TabsTrigger>
          <TabsTrigger value="otros">Otros ingresos</TabsTrigger>
        </TabsList>

        <TabsContent value="clientes">
          {pagosClientes.length === 0 ? (
            <EmptyState icon={TrendingUp} title="Sin pagos registrados" description="Los pagos de clientes aparecerán aquí." />
          ) : (
            <div className="rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Mes correspondiente</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Factura</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagosClientes.map(({ pago, mensualidad, cliente }) => (
                    <TableRow key={pago.id}>
                      <TableCell>{formatDate(pago.fecha)}</TableCell>
                      <TableCell className="font-medium">{cliente?.nombre}</TableCell>
                      <TableCell>{mesAnioLabel(mensualidad.mes, mensualidad.anio)}</TableCell>
                      <TableCell>{METODOS_PAGO.find((m) => m.value === pago.metodoPago)?.label}</TableCell>
                      <TableCell className="text-muted-foreground">{mensualidad.numeroFactura ?? "—"}</TableCell>
                      <TableCell className="text-right font-semibold text-success">
                        {formatCurrency(pago.importe)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="otros">
          {otrosIngresos.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Sin otros ingresos"
              description="Registra ingresos que no correspondan a mensualidades de clientes."
              action={
                <Button onClick={() => setDialogoOtro({ abierto: true })}>
                  <Plus className="h-4 w-4" /> Registrar ingreso
                </Button>
              }
            />
          ) : (
            <div className="rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otrosIngresos.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{formatDate(i.fecha)}</TableCell>
                      <TableCell className="font-medium">{i.concepto}</TableCell>
                      <TableCell className="text-muted-foreground">{i.categoria}</TableCell>
                      <TableCell>{METODOS_PAGO.find((m) => m.value === i.metodoPago)?.label}</TableCell>
                      <TableCell>
                        <Badge variant={ESTADO_INGRESO_VARIANT[i.estado]}>{i.estado}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(i.importe)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => setDialogoOtro({ abierto: true, ingreso: i })}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="text-danger" onClick={() => setAEliminar(i)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <RegistrarPagoClienteDialog open={dialogoPagoCliente} onOpenChange={setDialogoPagoCliente} />
      <IngresoOtroFormDialog
        open={dialogoOtro.abierto}
        onOpenChange={(abierto) => setDialogoOtro((s) => ({ ...s, abierto }))}
        ingreso={dialogoOtro.ingreso}
      />
      <ConfirmDialog
        open={!!aEliminar}
        onOpenChange={(o) => !o && setAEliminar(null)}
        title="¿Eliminar este ingreso?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          if (aEliminar) {
            eliminarIngreso(aEliminar.id);
            toast.success("Ingreso eliminado.");
          }
          setAEliminar(null);
        }}
      />
    </div>
  );
}
