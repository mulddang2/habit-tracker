"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HabitForm } from "@/components/habits/HabitForm";
import { useUpdateHabit } from "@/hooks/useHabits";
import type { Habit } from "@/types/habit";
import type { HabitFormData } from "@/lib/validations/habit";

interface EditHabitDialogProps {
  habit: Habit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditHabitDialog({
  habit,
  open,
  onOpenChange,
}: EditHabitDialogProps) {
  const updateHabit = useUpdateHabit();

  const handleSubmit = (data: HabitFormData) => {
    updateHabit.mutate(
      { id: habit.id, ...data },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>습관 수정</DialogTitle>
        </DialogHeader>
        <HabitForm
          defaultValues={{
            title: habit.title,
            category: habit.category,
            reminder_time: habit.reminder_time,
          }}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isPending={updateHabit.isPending}
          submitLabel="수정"
        />
      </DialogContent>
    </Dialog>
  );
}
