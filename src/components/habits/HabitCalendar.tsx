"use client";

import { useState, useMemo } from "react";
import { format, addMonths, subMonths } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useHabitsQuery } from "@/hooks/useHabits";
import { useMonthLogs } from "@/hooks/useHabitLogs";
import { calculateMonthlyRates, calculateStreak } from "@/lib/utils/streak";
import { CalendarGrid } from "./CalendarGrid";
import { HabitStreakCard } from "./HabitStreakCard";

export function HabitCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: habits = [] } = useHabitsQuery();
  const { data: monthLogs = [], isLoading } = useMonthLogs(currentMonth);

  const dailyRates = useMemo(
    () => calculateMonthlyRates(monthLogs, habits.length),
    [monthLogs, habits.length]
  );

  const habitStreaks = useMemo(() => {
    return habits.map((habit) => {
      const habitDates = monthLogs
        .filter((log) => log.habit_id === habit.id)
        .map((log) => log.completed_at);

      return {
        habit,
        streak: calculateStreak(habitDates),
        completedDays: habitDates.length,
      };
    });
  }, [habits, monthLogs]);

  const goToPrevMonth = () => setCurrentMonth((m) => subMonths(m, 1));
  const goToNextMonth = () => setCurrentMonth((m) => addMonths(m, 1));
  const goToToday = () => setCurrentMonth(new Date());

  return (
    <div className="flex flex-col gap-6">
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {format(currentMonth, "yyyy년 M월", { locale: ko })}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={goToToday}>
            오늘
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={goToPrevMonth}
            aria-label="이전 달"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={goToNextMonth}
            aria-label="다음 달"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      {/* 달력 그리드 */}
      <Card className="p-4">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground text-sm">로딩 중...</p>
          </div>
        ) : (
          <CalendarGrid month={currentMonth} dailyRates={dailyRates} />
        )}
      </Card>

      {/* 달성률 범례 */}
      <div className="text-muted-foreground flex items-center justify-center gap-2 text-xs">
        <span>낮음</span>
        <div className="flex gap-0.5">
          <div className="size-3 rounded-sm bg-emerald-100" />
          <div className="size-3 rounded-sm bg-emerald-300" />
          <div className="size-3 rounded-sm bg-emerald-500" />
          <div className="size-3 rounded-sm bg-emerald-700" />
        </div>
        <span>높음</span>
      </div>

      {/* 스트릭 카드들 */}
      {habitStreaks.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <Flame className="size-4 text-orange-500" />
            연속 달성 스트릭
          </h3>
          <div className="grid gap-2">
            {habitStreaks.map(({ habit, streak, completedDays }) => (
              <HabitStreakCard
                key={habit.id}
                title={habit.title}
                category={habit.category}
                currentStreak={streak.currentStreak}
                longestStreak={streak.longestStreak}
                completedDays={completedDays}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
