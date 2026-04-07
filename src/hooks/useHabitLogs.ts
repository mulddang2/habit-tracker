"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchLogsByDate,
  fetchLogsByMonth,
  toggleHabitLog,
} from "@/lib/api/habitLogs";
import type { HabitLog } from "@/types/habit";
import { format } from "date-fns";

export const habitLogKeys = {
  all: ["habitLogs"] as const,
  byDate: (date: string) => [...habitLogKeys.all, "date", date] as const,
  byMonth: (month: string) => [...habitLogKeys.all, "month", month] as const,
};

export function useTodayLogs(date: Date) {
  const dateStr = format(date, "yyyy-MM-dd");

  return useQuery({
    queryKey: habitLogKeys.byDate(dateStr),
    queryFn: () => fetchLogsByDate(date),
  });
}

export function useToggleHabitLog(date: Date) {
  const queryClient = useQueryClient();
  const dateStr = format(date, "yyyy-MM-dd");

  return useMutation({
    mutationFn: ({
      habitId,
      isCompleted,
    }: {
      habitId: string;
      isCompleted: boolean;
    }) => toggleHabitLog(habitId, date, isCompleted),
    onMutate: async ({ habitId, isCompleted }) => {
      const queryKey = habitLogKeys.byDate(dateStr);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<HabitLog[]>(queryKey);

      queryClient.setQueryData<HabitLog[]>(queryKey, (old) => {
        if (isCompleted) {
          return old?.filter((log) => log.habit_id !== habitId) ?? [];
        }
        return [
          ...(old ?? []),
          {
            id: `temp-${habitId}`,
            habit_id: habitId,
            completed_at: dateStr,
          },
        ];
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          habitLogKeys.byDate(dateStr),
          context.previous
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: habitLogKeys.byDate(dateStr),
      });
      queryClient.invalidateQueries({
        queryKey: habitLogKeys.byMonth(format(date, "yyyy-MM")),
      });
    },
  });
}

export function useMonthLogs(month: Date) {
  const monthStr = format(month, "yyyy-MM");

  return useQuery({
    queryKey: habitLogKeys.byMonth(monthStr),
    queryFn: () => fetchLogsByMonth(month),
  });
}
