"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { PieChart as PieIcon } from "lucide-react";

const COLORES = [
  "#163a5f",
  "#2f80ed",
  "#1f9d55",
  "#ea8a1f",
  "#d93025",
  "#7c5cbf",
  "#0f9ba7",
  "#c2410c",
  "#9aa3af",
];

export function ChartGastosCategoria({ data }: { data: { categoria: string; total: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribución de gastos por categoría</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState icon={PieIcon} title="Sin gastos este mes" description="Registra un gasto para ver la distribución." />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="total" nameKey="categoria" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORES[i % COLORES.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
