"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchHabits,
  createHabit,
  updateHabit,
  deleteHabit,
} from "@/lib/api/habits";
import type { Habit } from "@/types/habit";

export const habitKeys = {
  all: ["habits"] as const,
  list: () => [...habitKeys.all, "list"] as const,
};

export function useHabitsQuery() {
  return useQuery({
    queryKey: habitKeys.list(),
    queryFn: fetchHabits,
  });
}

export function useCreateHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createHabit,
    onMutate: async (newHabit) => {
      await queryClient.cancelQueries({ queryKey: habitKeys.list() });
      const previous = queryClient.getQueryData<Habit[]>(habitKeys.list());

      const optimistic: Habit = {
        id: `temp-${Date.now()}`,
        user_id: "",
        title: newHabit.title,
        category: newHabit.category,
        order: (previous?.length ?? 0) + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Habit[]>(habitKeys.list(), (old) => [
        ...(old ?? []),
        optimistic,
      ]);

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(habitKeys.list(), context.previous);
      }
      toast.error("습관 추가에 실패했습니다. 다시 시도해주세요.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.list() });
    },
  });
}

export function useUpdateHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Partial<Pick<Habit, "title" | "category">>) =>
      updateHabit(id, data),
    onMutate: async ({ id, ...data }) => {
      await queryClient.cancelQueries({ queryKey: habitKeys.list() });
      const previous = queryClient.getQueryData<Habit[]>(habitKeys.list());

      queryClient.setQueryData<Habit[]>(habitKeys.list(), (old) =>
        old?.map((h) => (h.id === id ? { ...h, ...data } : h))
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(habitKeys.list(), context.previous);
      }
      toast.error("습관 수정에 실패했습니다. 다시 시도해주세요.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.list() });
    },
  });
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteHabit,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: habitKeys.list() });
      const previous = queryClient.getQueryData<Habit[]>(habitKeys.list());

      queryClient.setQueryData<Habit[]>(habitKeys.list(), (old) =>
        old?.filter((h) => h.id !== id)
      );

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(habitKeys.list(), context.previous);
      }
      toast.error("습관 삭제에 실패했습니다. 다시 시도해주세요.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.list() });
    },
  });
}
