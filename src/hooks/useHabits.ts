"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
    onSuccess: () => {
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
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.list() });
    },
  });
}
