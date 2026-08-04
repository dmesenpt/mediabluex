"use client";

import * as React from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/lib/store";

export function CategoriasGastoSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { categoriasGasto, crearCategoriaGasto, actualizarCategoriaGasto } = useData();
  const [nueva, setNueva] = React.useState("");

  function agregar() {
    if (!nueva.trim()) return;
    if (categoriasGasto.some((c) => c.nombre.toLowerCase() === nueva.trim().toLowerCase())) {
      toast.error("Ya existe una categoría con ese nombre.");
      return;
    }
    crearCategoriaGasto(nueva.trim());
    setNueva("");
    toast.success("Categoría creada.");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Categorías de gastos</SheetTitle>
          <SheetDescription>Crea, edita o archiva categorías personalizadas.</SheetDescription>
        </SheetHeader>
        <div className="flex gap-2 mt-4">
          <Input
            placeholder="Nueva categoría…"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && agregar()}
          />
          <Button onClick={agregar}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ul className="mt-4 space-y-1.5 overflow-y-auto max-h-[70vh]">
          {categoriasGasto.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span className={c.archivada ? "text-muted-foreground line-through" : ""}>{c.nombre}</span>
              <div className="flex items-center gap-2">
                {c.predeterminada && <Badge variant="outline">predeterminada</Badge>}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => actualizarCategoriaGasto(c.id, { archivada: !c.archivada })}
                  aria-label={c.archivada ? "Restaurar categoría" : "Archivar categoría"}
                >
                  {c.archivada ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
