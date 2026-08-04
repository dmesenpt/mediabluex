import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Topbar } from "@/components/layout/topbar";
import { NuevoMovimientoFab } from "@/components/layout/nuevo-movimiento-fab";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 px-4 py-5 lg:px-8 lg:py-6 pb-24 lg:pb-8">{children}</main>
      </div>
      <BottomNav />
      <NuevoMovimientoFab />
    </div>
  );
}
