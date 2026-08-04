"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { NAV_ITEMS_MOBILE_PRINCIPALES, NAV_ITEMS_MOBILE_MAS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function BottomNav() {
  const pathname = usePathname();
  const [masAbierto, setMasAbierto] = React.useState(false);

  const masActivo = NAV_ITEMS_MOBILE_MAS.some((item) => pathname.startsWith(item.href));

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4 h-16">
          {NAV_ITEMS_MOBILE_PRINCIPALES.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate max-w-[64px]">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMasAbierto(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-[11px] font-medium cursor-pointer",
              masActivo ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Menu className="h-5 w-5" />
            <span>Más</span>
          </button>
        </div>
      </nav>

      <Sheet open={masAbierto} onOpenChange={setMasAbierto}>
        <SheetContent side="bottom" className="pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <SheetHeader>
            <SheetTitle>Más secciones</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 pt-2">
            {NAV_ITEMS_MOBILE_MAS.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMasAbierto(false)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-lg border p-4 text-center text-xs font-medium",
                    active
                      ? "border-primary bg-accent text-primary"
                      : "border-border text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
