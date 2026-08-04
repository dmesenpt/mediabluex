"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useData } from "@/lib/store";
import { Calculator } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { configuracion } = useData();

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-40 bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-5 h-16 shrink-0 border-b border-white/10">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-active text-white shrink-0">
          <Calculator className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold tracking-tight truncate">
          {configuracion.nombreApp}
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-active text-white shadow-sm"
                  : "text-sidebar-muted hover:bg-sidebar-accent hover:text-white"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 text-xs text-sidebar-muted border-t border-white/10">
        © {new Date().getFullYear()} {configuracion.nombreNegocio || configuracion.nombreApp}
      </div>
    </aside>
  );
}
