"use client";

import { Bot } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/card";
import { useCoachStats } from "@/hooks/useCoachStats";

const PIE_COLORS = ["#10b981", "#f59e0b", "#94a3b8"];

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

export function CoachEffectSection() {
  const { data: stats, isLoading } = useCoachStats();

  if (isLoading) {
    return (
      <Card className="p-4">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Bot className="size-4" />
          AI 코치 효과
        </h3>
        <p className="text-muted-foreground text-sm">불러오는 중...</p>
      </Card>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <Card className="p-4">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Bot className="size-4" />
          AI 코치 효과
        </h3>
        <p className="text-muted-foreground text-sm">
          아직 코치 제안 데이터가 없습니다. AI 코치의 제안을 받아보세요.
        </p>
      </Card>
    );
  }

  const pieData = [
    { name: "수락", value: stats.accepted },
    { name: "거부", value: stats.dismissed },
    { name: "무시", value: stats.ignored },
  ].filter((d) => d.value > 0);

  return (
    <Card className="p-4">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <Bot className="size-4" />
        AI 코치 효과
      </h3>

      <div className="flex flex-col gap-6">
        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-muted-foreground text-xs">총 제안</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-muted-foreground text-xs">수락률</p>
            <p className="text-2xl font-bold text-emerald-600">
              {stats.acceptRate}%
            </p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-muted-foreground text-xs">수락 / 거부</p>
            <p className="text-2xl font-bold">
              {stats.accepted} / {stats.dismissed}
            </p>
          </div>
        </div>

        {/* 수락/거부/무시 파이 차트 */}
        <div>
          <h4 className="mb-2 text-xs font-medium">제안 반응 분포</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {pieData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 프롬프트 버전별 수락률 */}
        {stats.byVersion.length > 1 && (
          <div>
            <h4 className="mb-2 text-xs font-medium">프롬프트 버전별 수락률</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={stats.byVersion}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="promptVersion"
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
                  dataKey="acceptRate"
                  fill="var(--color-chart-2, #3b82f6)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
