import { Badge } from "@/components/ui/badge";
import { ESTADO_LABEL } from "@/lib/calc";
import type { EstadoPagoMensual } from "@/lib/types";

const VARIANTE: Record<EstadoPagoMensual, "success" | "danger" | "warning" | "neutral"> = {
  pagado: "success",
  pendiente: "danger",
  parcial: "warning",
  vencido: "danger",
  no_aplica: "neutral",
};

export function EstadoBadge({ estado }: { estado: EstadoPagoMensual }) {
  return <Badge variant={VARIANTE[estado]}>{ESTADO_LABEL[estado]}</Badge>;
}
