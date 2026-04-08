"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import type { DailyRate } from "@/hooks/useStats";

interface DailyTrendChartProps {
  data: DailyRate[];
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DailyRate }>;
}) {
  if (!active || !payload?.length) return null;

  const item = payload[0].payload as DailyRate;

  return (
    <div className="bg-background rounded-md border px-3 py-2 shadow-sm">
      <p className="text-muted-foreground text-xs">{item.date}</p>
      <p className="text-sm font-semibold">{item.rate}%</p>
      <p className="text-muted-foreground text-xs">
        {item.completed}/{item.total}개 완료
      </p>
    </div>
  );
}

export function DailyTrendChart({ data }: DailyTrendChartProps) {
  return (
    <Card className="p-4">
      <h3 className="mb-4 text-sm font-semibold">일별 달성률 추이 (4주)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart
          data={data}
          margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="rate"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#rateGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
