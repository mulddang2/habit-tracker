"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HabitForm } from "@/components/habits/HabitForm";
import { useCreateHabit } from "@/hooks/useHabits";
import { Plus } from "lucide-react";
import type { HabitFormData } from "@/lib/validations/habit";

export function AddHabitDialog() {
  const [open, setOpen] = useState(false);
  const createHabit = useCreateHabit();

  const handleSubmit = (data: HabitFormData) => {
    createHabit.mutate(data, {
      onSuccess: () => setOpen(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        습관 추가
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 습관 추가</DialogTitle>
        </DialogHeader>
        <HabitForm
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isPending={createHabit.isPending}
          submitLabel="추가"
        />
      </DialogContent>
    </Dialog>
  );
}
