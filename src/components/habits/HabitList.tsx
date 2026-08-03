"use client";

import { useState } from "react";
import {
  useHabitsQuery,
  useDeleteHabit,
  useReorderHabit,
} from "@/hooks/useHabits";
import { useTodayLogs, useToggleHabitLog } from "@/hooks/useHabitLogs";
import { useHabitReminders } from "@/hooks/useReminder";
import { useAppStore } from "@/stores/useAppStore";
import { HabitCard } from "@/components/habits/HabitCard";
import { HabitCardSkeleton } from "@/components/habits/HabitCardSkeleton";
import { EditHabitDialog } from "@/components/habits/EditHabitDialog";
import {
  CategoryFilter,
  type CategoryFilterValue,
} from "@/components/habits/CategoryFilter";
import { Button } from "@/components/ui/button";
import type { Habit } from "@/types/habit";

export function HabitList() {
  const selectedDate = useAppStore((s) => s.selectedDate);
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilterValue>("전체");
  const { data: habits, isLoading, error, refetch } = useHabitsQuery();
  const { data: logs } = useTodayLogs(selectedDate);
  const toggleLog = useToggleHabitLog(selectedDate);
  const deleteHabit = useDeleteHabit();
  const reorderHabit = useReorderHabit();

  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  useHabitReminders(habits ?? []);

  const completedIds = new Set(logs?.map((log) => log.habit_id) ?? []);

  const filteredHabits =
    categoryFilter === "전체"
      ? habits
      : habits?.filter((h) => h.category === categoryFilter);

  const canReorder = categoryFilter === "전체";

  const moveHabit = (habitId: string, direction: "up" | "down") => {
    if (!habits) return;
    const index = habits.findIndex((h) => h.id === habitId);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || targetIndex < 0 || targetIndex >= habits.length) return;

    const current = habits[index];
    const target = habits[targetIndex];
    reorderHabit.mutate([
      { id: current.id, order: target.order },
      { id: target.id, order: current.order },
    ]);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <HabitCardSkeleton key={i} />
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
      <CategoryFilter selected={categoryFilter} onSelect={setCategoryFilter} />

      {filteredHabits && filteredHabits.length > 0 ? (
        <div className="flex flex-col gap-2" role="list" aria-label="습관 목록">
          {filteredHabits.map((habit) => {
            const index = habits?.findIndex((h) => h.id === habit.id) ?? -1;
            return (
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
                onMoveUp={() => moveHabit(habit.id, "up")}
                onMoveDown={() => moveHabit(habit.id, "down")}
                canMoveUp={canReorder && index > 0}
                canMoveDown={
                  canReorder &&
                  index !== -1 &&
                  index < (habits?.length ?? 0) - 1
                }
                canReorder={canReorder}
              />
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground py-8 text-center text-sm">
          아직 등록된 습관이 없어요.
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
