"use client";

import { useState } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWeeklyStats, useMonthlyHabitStats } from "@/hooks/useStats";
import { WeeklyChart } from "@/components/stats/WeeklyChart";
import { DailyTrendChart } from "@/components/stats/DailyTrendChart";
import { MonthlyHabitChart } from "@/components/stats/MonthlyHabitChart";
import { CoachEffectSection } from "@/components/stats/CoachEffectSection";

export default function StatsPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const {
    dailyRates,
    weeklyRates,
    isLoading: weeklyLoading,
  } = useWeeklyStats(currentMonth);
  const {
    habitRates,
    overallRate,
    isLoading: monthlyLoading,
  } = useMonthlyHabitStats(currentMonth);

  const isLoading = weeklyLoading || monthlyLoading;
  const monthLabel = format(currentMonth, "yyyy년 M월", { locale: ko });

  return (
    <div className="flex flex-col gap-6">
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <TrendingUp className="size-5" />
          통계
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            이번 달
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            aria-label="이전 달"
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-[100px] text-center text-sm font-medium">
            {monthLabel}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            aria-label="다음 달"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground text-sm">통계를 불러오는 중...</p>
        </div>
      ) : (
        <>
          {/* 전체 달성률 요약 */}
          <div className="rounded-lg border bg-gradient-to-r from-emerald-50 to-emerald-100 p-4 dark:from-emerald-950 dark:to-emerald-900">
            <p className="text-muted-foreground text-sm">
              {monthLabel} 전체 달성률
            </p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {overallRate}%
            </p>
          </div>

          {/* 주간 달성률 바 차트 */}
          <WeeklyChart data={weeklyRates} />

          {/* 일별 달성률 트렌드 */}
          <DailyTrendChart data={dailyRates} />

          {/* 월간 습관별 달성률 */}
          <MonthlyHabitChart data={habitRates} month={monthLabel} />

          {/* AI 코치 효과 */}
          <CoachEffectSection />
        </>
      )}
    </div>
  );
}
