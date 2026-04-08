"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import type { WeeklyRate } from "@/hooks/useStats";

interface WeeklyChartProps {
  data: WeeklyRate[];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-background rounded-md border px-3 py-2 shadow-sm">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm font-semibold">{payload[0].value}%</p>
    </div>
  );
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  return (
    <Card className="p-4">
      <h3 className="mb-4 text-sm font-semibold">주간 달성률</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={data}
          margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="rate"
            fill="var(--color-chart-1, #10b981)"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
