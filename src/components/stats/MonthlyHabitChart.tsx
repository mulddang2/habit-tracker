"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/card";
import type { HabitMonthlyRate } from "@/hooks/useStats";
import type { Category } from "@/types/habit";

interface MonthlyHabitChartProps {
  data: HabitMonthlyRate[];
  month: string;
}

const CATEGORY_CHART_COLORS: Record<Category, string> = {
  건강: "#22c55e",
  공부: "#3b82f6",
  운동: "#f97316",
  라이프: "#a855f7",
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: HabitMonthlyRate }>;
}) {
  if (!active || !payload?.length) return null;

  const item = payload[0].payload as HabitMonthlyRate;

  return (
    <div className="bg-background rounded-md border px-3 py-2 shadow-sm">
      <p className="text-xs font-medium">{item.title}</p>
      <p className="text-sm font-semibold">{item.rate}%</p>
      <p className="text-muted-foreground text-xs">
        {item.completed}/{item.total}일 완료
      </p>
    </div>
  );
}

export function MonthlyHabitChart({ data, month }: MonthlyHabitChartProps) {
  return (
    <Card className="p-4">
      <h3 className="mb-4 text-sm font-semibold">{month} 습관별 달성률</h3>
      {data.length === 0 ? (
        <p className="text-muted-foreground flex h-[200px] items-center justify-center text-sm">
          등록된 습관이 없습니다.
        </p>
      ) : (
        <ResponsiveContainer
          width="100%"
          height={Math.max(200, data.length * 44)}
        >
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="title"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={28}>
              {data.map((entry) => (
                <Cell
                  key={entry.habitId}
                  fill={
                    CATEGORY_CHART_COLORS[entry.category as Category] ??
                    "#6b7280"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
