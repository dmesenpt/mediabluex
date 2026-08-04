"use client";

import * as React from "react";
import { Plus, Search, Pencil, Trash2, Receipt, Tags } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { GastoFormDialog } from "@/components/forms/gasto-form-dialog";
import { CategoriasGastoSheet } from "@/components/gastos/categorias-gasto-sheet";
import { useData } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Gasto } from "@/lib/types";
import { toast } from "sonner";

export default function GastosPage() {
  const { gastos, categoriasGasto, eliminarGasto } = useData();
  const [busqueda, setBusqueda] = React.useState("");
  const [categoriaId, setCategoriaId] = React.useState("todas");
  const [tipo, setTipo] = React.useState("todos");
  const [estado, setEstado] = React.useState("todos");
  const [dialogo, setDialogo] = React.useState<{ abierto: boolean; gasto?: Gasto }>({ abierto: false });
  const [categoriasAbierto, setCategoriasAbierto] = React.useState(false);
  const [aEliminar, setAEliminar] = React.useState<Gasto | null>(null);

  const filtrados = gastos
    .filter((g) => g.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
    .filter((g) => categoriaId === "todas" || g.categoriaId === categoriaId)
    .filter((g) => tipo === "todos" || g.tipo === tipo)
    .filter((g) => estado === "todos" || g.estado === estado)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const totalFiltrado = filtrados.reduce((acc, g) => acc + g.importe, 0);

  return (
    <div>
      <PageHeader
        title="Gastos"
        description="Registra y organiza tus gastos personales y profesionales."
        actions={
          <>
            <Button variant="outline" onClick={() => setCategoriasAbierto(true)}>
              <Tags className="h-4 w-4" /> Categorías
            </Button>
            <Button onClick={() => setDialogo({ abierto: true })}>
              <Plus className="h-4 w-4" /> Registrar gasto
            </Button>
          </>
        }
      />

      <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar gasto…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoriaId} onValueChange={setCategoriaId}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {categoriasGasto.filter((c) => !c.archivada).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Personal y profesional</SelectItem>
            <SelectItem value="profesional">Profesional</SelectItem>
            <SelectItem value="personal">Personal</SelectItem>
          </SelectContent>
        </Select>
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="pagado">Pagado</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No hay gastos registrados"
          description="Prueba a cambiar los filtros o registra un nuevo gasto."
          action={
            <Button onClick={() => setDialogo({ abierto: true })}>
              <Plus className="h-4 w-4" /> Registrar gasto
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>{formatDate(g.fecha)}</TableCell>
                  <TableCell className="font-medium">{g.descripcion}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {categoriasGasto.find((c) => c.id === g.categoriaId)?.nombre ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{g.proveedor ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{g.tipo}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={g.estado === "pagado" ? "success" : "danger"}>{g.estado}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(g.importe)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => setDialogo({ abierto: true, gasto: g })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="text-danger" onClick={() => setAEliminar(g)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end px-4 py-3 border-t border-border text-sm">
            <span className="text-muted-foreground mr-2">Total filtrado:</span>
            <span className="font-semibold">{formatCurrency(totalFiltrado)}</span>
          </div>
        </div>
      )}

      <GastoFormDialog open={dialogo.abierto} onOpenChange={(abierto) => setDialogo((s) => ({ ...s, abierto }))} gasto={dialogo.gasto} />
      <CategoriasGastoSheet open={categoriasAbierto} onOpenChange={setCategoriasAbierto} />
      <ConfirmDialog
        open={!!aEliminar}
        onOpenChange={(o) => !o && setAEliminar(null)}
        title="¿Eliminar este gasto?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          if (aEliminar) {
            eliminarGasto(aEliminar.id);
            toast.success("Gasto eliminado.");
          }
          setAEliminar(null);
        }}
      />
    </div>
  );
}
