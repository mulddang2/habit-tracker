"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchWeeklyLogs, fetchLogsByMonth } from "@/lib/api/habitLogs";
import { fetchHabits } from "@/lib/api/habits";
import { habitLogKeys } from "@/hooks/useHabitLogs";
import { habitKeys } from "@/hooks/useHabits";
import type { Habit, HabitLog } from "@/types/habit";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachWeekOfInterval,
  subWeeks,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { ko } from "date-fns/locale";
import { useMemo } from "react";

export interface DailyRate {
  date: string;
  label: string;
  rate: number;
  completed: number;
  total: number;
}

export interface WeeklyRate {
  week: string;
  label: string;
  rate: number;
}

export interface HabitMonthlyRate {
  habitId: string;
  title: string;
  category: string;
  rate: number;
  completed: number;
  total: number;
}

const WEEKS_COUNT = 4;

export function useWeeklyStats(baseDate: Date) {
  const habitsQuery = useQuery({
    queryKey: habitKeys.list(),
    queryFn: fetchHabits,
    staleTime: 5 * 60 * 1000,
  });

  const logsQuery = useQuery({
    queryKey: [...habitLogKeys.all, "weekly", format(baseDate, "yyyy-MM-dd")],
    queryFn: () => fetchWeeklyLogs(baseDate, WEEKS_COUNT),
    staleTime: 2 * 60 * 1000,
  });

  const dailyRates = useMemo((): DailyRate[] => {
    const habits = habitsQuery.data ?? [];
    const logs = logsQuery.data ?? [];
    if (habits.length === 0) return [];

    const from = startOfWeek(subWeeks(baseDate, WEEKS_COUNT - 1), {
      weekStartsOn: 1,
    });
    const to = endOfWeek(baseDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: from, end: to });

    return days.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayLogs = logs.filter((l) => l.completed_at === dateStr);
      const uniqueHabits = new Set(dayLogs.map((l) => l.habit_id));
      const completed = uniqueHabits.size;

      return {
        date: dateStr,
        label: format(day, "M/d"),
        rate: Math.round((completed / habits.length) * 100),
        completed,
        total: habits.length,
      };
    });
  }, [habitsQuery.data, logsQuery.data, baseDate]);

  const weeklyRates = useMemo((): WeeklyRate[] => {
    const habits = habitsQuery.data ?? [];
    const logs = logsQuery.data ?? [];
    if (habits.length === 0) return [];

    const from = startOfWeek(subWeeks(baseDate, WEEKS_COUNT - 1), {
      weekStartsOn: 1,
    });
    const to = endOfWeek(baseDate, { weekStartsOn: 1 });
    const weeks = eachWeekOfInterval(
      { start: from, end: to },
      { weekStartsOn: 1 }
    );

    return weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
      const totalSlots = days.length * habits.length;

      let completed = 0;
      for (const day of days) {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayLogs = logs.filter((l) => l.completed_at === dateStr);
        completed += new Set(dayLogs.map((l) => l.habit_id)).size;
      }

      return {
        week: format(weekStart, "yyyy-MM-dd"),
        label: `${format(weekStart, "M/d", { locale: ko })}~${format(weekEnd, "M/d", { locale: ko })}`,
        rate: totalSlots > 0 ? Math.round((completed / totalSlots) * 100) : 0,
      };
    });
  }, [habitsQuery.data, logsQuery.data, baseDate]);

  return {
    dailyRates,
    weeklyRates,
    isLoading: habitsQuery.isLoading || logsQuery.isLoading,
  };
}

export function useMonthlyHabitStats(month: Date) {
  const habitsQuery = useQuery({
    queryKey: habitKeys.list(),
    queryFn: fetchHabits,
    staleTime: 5 * 60 * 1000,
  });

  const logsQuery = useQuery({
    queryKey: habitLogKeys.byMonth(format(month, "yyyy-MM")),
    queryFn: () => fetchLogsByMonth(month),
    staleTime: 2 * 60 * 1000,
  });

  const habitRates = useMemo((): HabitMonthlyRate[] => {
    const habits = habitsQuery.data ?? [];
    const logs = logsQuery.data ?? [];

    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const today = new Date();
    const effectiveEnd = monthEnd > today ? today : monthEnd;
    const daysInRange = eachDayOfInterval({
      start: monthStart,
      end: effectiveEnd,
    }).length;

    return habits.map((habit) => {
      const habitLogs = logs.filter((l) => l.habit_id === habit.id);
      const uniqueDays = new Set(habitLogs.map((l) => l.completed_at));
      const completed = uniqueDays.size;

      return {
        habitId: habit.id,
        title: habit.title,
        category: habit.category,
        rate: daysInRange > 0 ? Math.round((completed / daysInRange) * 100) : 0,
        completed,
        total: daysInRange,
      };
    });
  }, [habitsQuery.data, logsQuery.data, month]);

  const overallRate = useMemo(() => {
    if (habitRates.length === 0) return 0;
    return Math.round(
      habitRates.reduce((sum, h) => sum + h.rate, 0) / habitRates.length
    );
  }, [habitRates]);

  return {
    habitRates,
    overallRate,
    isLoading: habitsQuery.isLoading || logsQuery.isLoading,
  };
}
