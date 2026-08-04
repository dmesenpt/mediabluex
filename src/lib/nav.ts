import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CalendarRange,
  Users,
  TrendingUp,
  TrendingDown,
  Repeat,
  Wallet,
  FileBarChart,
  Settings,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/control-anual", label: "Control anual", icon: CalendarRange },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/ingresos", label: "Ingresos", icon: TrendingUp },
  { href: "/gastos", label: "Gastos", icon: TrendingDown },
  { href: "/pagos-recurrentes", label: "Pagos recurrentes", icon: Repeat },
  { href: "/cuentas-por-cobrar", label: "Cuentas por cobrar", icon: Wallet },
  { href: "/informes", label: "Informes", icon: FileBarChart },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export const NAV_ITEMS_MOBILE_PRINCIPALES: NavItem[] = [
  NAV_ITEMS[0],
  NAV_ITEMS[1],
  NAV_ITEMS[2],
];

export const NAV_ITEMS_MOBILE_MAS: NavItem[] = [
  NAV_ITEMS[3],
  NAV_ITEMS[4],
  NAV_ITEMS[5],
  NAV_ITEMS[6],
  NAV_ITEMS[7],
  NAV_ITEMS[8],
];
