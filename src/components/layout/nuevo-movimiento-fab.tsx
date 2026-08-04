"use client";

import * as React from "react";
import { Plus, Wallet, TrendingUp, TrendingDown, UserPlus, Repeat } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { RegistrarPagoClienteDialog } from "@/components/forms/registrar-pago-cliente-dialog";
import { IngresoOtroFormDialog } from "@/components/forms/ingreso-otro-form-dialog";
import { GastoFormDialog } from "@/components/forms/gasto-form-dialog";
import { ClienteFormDialog } from "@/components/forms/cliente-form-dialog";
import { PagoRecurrenteFormDialog } from "@/components/forms/pago-recurrente-form-dialog";

type DialogoActivo = null | "pago-cliente" | "otro-ingreso" | "gasto" | "cliente" | "pago-recurrente";

export function NuevoMovimientoFab() {
  const [dialogo, setDialogo] = React.useState<DialogoActivo>(null);

  return (
    <>
      <div className="fixed z-30 right-5 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity cursor-pointer"
              aria-label="Nuevo movimiento"
            >
              <Plus className="h-6 w-6" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 mb-2">
            <DropdownMenuLabel>Nuevo movimiento</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDialogo("pago-cliente")}>
              <Wallet className="h-4 w-4 text-success" />
              Registrar pago de cliente
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDialogo("otro-ingreso")}>
              <TrendingUp className="h-4 w-4 text-info" />
              Registrar otro ingreso
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDialogo("gasto")}>
              <TrendingDown className="h-4 w-4 text-danger" />
              Registrar gasto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDialogo("cliente")}>
              <UserPlus className="h-4 w-4 text-primary" />
              Crear cliente
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDialogo("pago-recurrente")}>
              <Repeat className="h-4 w-4 text-warning" />
              Crear pago recurrente
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <RegistrarPagoClienteDialog open={dialogo === "pago-cliente"} onOpenChange={(o) => setDialogo(o ? "pago-cliente" : null)} />
      <IngresoOtroFormDialog open={dialogo === "otro-ingreso"} onOpenChange={(o) => setDialogo(o ? "otro-ingreso" : null)} />
      <GastoFormDialog open={dialogo === "gasto"} onOpenChange={(o) => setDialogo(o ? "gasto" : null)} />
      <ClienteFormDialog open={dialogo === "cliente"} onOpenChange={(o) => setDialogo(o ? "cliente" : null)} />
      <PagoRecurrenteFormDialog open={dialogo === "pago-recurrente"} onOpenChange={(o) => setDialogo(o ? "pago-recurrente" : null)} />
    </>
  );
}
