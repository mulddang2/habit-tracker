"use client";

import { useState } from "react";
import { useAtomValue } from "jotai";
import { categoryFilterAtom } from "@/atoms/habitAtoms";
import { useHabitsQuery, useDeleteHabit } from "@/hooks/useHabits";
import { useTodayLogs, useToggleHabitLog } from "@/hooks/useHabitLogs";
import { useAppStore } from "@/stores/useAppStore";
import { HabitCard } from "@/components/habits/HabitCard";
import { EditHabitDialog } from "@/components/habits/EditHabitDialog";
import { CategoryFilter } from "@/components/habits/CategoryFilter";
import { Button } from "@/components/ui/button";
import type { Habit } from "@/types/habit";

export function HabitList() {
  const selectedDate = useAppStore((s) => s.selectedDate);
  const categoryFilter = useAtomValue(categoryFilterAtom);
  const { data: habits, isLoading, error, refetch } = useHabitsQuery();
  const { data: logs } = useTodayLogs(selectedDate);
  const toggleLog = useToggleHabitLog(selectedDate);
  const deleteHabit = useDeleteHabit();

  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const completedIds = new Set(logs?.map((log) => log.habit_id) ?? []);

  const filteredHabits =
    categoryFilter === "전체"
      ? habits
      : habits?.filter((h) => h.category === categoryFilter);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-muted h-14 animate-pulse rounded-lg border"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <p className="text-destructive text-sm">
          습관 목록을 불러오지 못했습니다.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <CategoryFilter />

      {filteredHabits && filteredHabits.length > 0 ? (
        <div className="flex flex-col gap-2">
          {filteredHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              isCompleted={completedIds.has(habit.id)}
              onToggle={() =>
                toggleLog.mutate({
                  habitId: habit.id,
                  isCompleted: completedIds.has(habit.id),
                })
              }
              onEdit={() => setEditingHabit(habit)}
              onDelete={() => deleteHabit.mutate(habit.id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground py-8 text-center text-sm">
          등록된 습관이 없습니다.
        </p>
      )}

      {editingHabit && (
        <EditHabitDialog
          habit={editingHabit}
          open={!!editingHabit}
          onOpenChange={(open) => !open && setEditingHabit(null)}
        />
      )}
    </div>
  );
}
