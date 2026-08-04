"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MESES } from "@/lib/constants";

export function SelectorMesAnio({
  anio,
  mes,
  onChange,
}: {
  anio: number;
  mes: number;
  onChange: (anio: number, mes: number) => void;
}) {
  function mover(delta: number) {
    let m = mes + delta;
    let a = anio;
    if (m > 12) {
      m = 1;
      a += 1;
    } else if (m < 1) {
      m = 12;
      a -= 1;
    }
    onChange(a, m);
  }

  const anioActual = new Date().getFullYear();
  const anios = Array.from({ length: 6 }, (_, i) => anioActual - 3 + i);

  return (
    <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg p-1">
      <Button variant="ghost" size="icon-sm" onClick={() => mover(-1)} aria-label="Mes anterior">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Select value={String(mes)} onValueChange={(v) => onChange(anio, Number(v))}>
        <SelectTrigger className="h-8 w-[120px] border-0 shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MESES.map((m, i) => (
            <SelectItem key={m} value={String(i + 1)}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(anio)} onValueChange={(v) => onChange(Number(v), mes)}>
        <SelectTrigger className="h-8 w-[90px] border-0 shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {anios.map((a) => (
            <SelectItem key={a} value={String(a)}>
              {a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="ghost" size="icon-sm" onClick={() => mover(1)} aria-label="Mes siguiente">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
