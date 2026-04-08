"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
    staleTime: 0, // 체크/해제가 빈번하므로 항상 최신 유지
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
      toast.error("습관 체크 변경에 실패했습니다. 다시 시도해주세요.");
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
    staleTime: 10 * 60 * 1000, // 월별 데이터는 느리게 변함
    gcTime: 30 * 60 * 1000,
  });
}
