"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/lib/store";
import { formatDateTime } from "@/lib/format";
import type { Mensualidad } from "@/lib/types";

export function SeguimientoDialog({
  mensualidad,
  open,
  onOpenChange,
}: {
  mensualidad: Mensualidad | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notas de seguimiento</DialogTitle>
          <DialogDescription>Registra los contactos realizados para gestionar este cobro.</DialogDescription>
        </DialogHeader>
        {/* Se monta de nuevo cada vez que se abre, para partir siempre de una nota vacía. */}
        {open && mensualidad && <SeguimientoFormulario mensualidad={mensualidad} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  );
}

function SeguimientoFormulario({
  mensualidad,
  onOpenChange,
}: {
  mensualidad: Mensualidad;
  onOpenChange: (o: boolean) => void;
}) {
  const { registrarSeguimiento } = useData();
  const [nota, setNota] = React.useState("");

  const eventos = mensualidad.historial.filter((h) => h.descripcion.startsWith("Seguimiento"));

  function guardar() {
    const texto = nota.trim() || "Cliente contactado";
    registrarSeguimiento(mensualidad.id, texto);
    toast.success("Seguimiento registrado.");
    onOpenChange(false);
  }

  return (
    <>
      <div className="grid gap-3">
        <Textarea
          placeholder="Ej. Se contactó por teléfono, promete pagar la próxima semana…"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={3}
        />
        {eventos.length > 0 && (
          <ul className="space-y-1.5 max-h-48 overflow-y-auto text-xs text-muted-foreground border-t border-border pt-2">
            {[...eventos].reverse().map((e) => (
              <li key={e.id}>
                <span className="font-medium text-foreground">{formatDateTime(e.fecha)}</span> — {e.descripcion}
              </li>
            ))}
          </ul>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cerrar
        </Button>
        <Button onClick={guardar}>Marcar como contactado</Button>
      </DialogFooter>
    </>
  );
}
