import { Calculator } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-10">
      <div className="flex items-center gap-2 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Calculator className="h-5 w-5" />
        </div>
        <span className="text-xl font-semibold tracking-tight">ContaControl</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
