"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Pencil, Trash2 } from "lucide-react";
import type { Habit, Category } from "@/types/habit";

const CATEGORY_COLORS: Record<Category, string> = {
  건강: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  공부: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  운동: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  라이프:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

interface HabitCardProps {
  habit: Habit;
  isCompleted: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function HabitCard({
  habit,
  isCompleted,
  onToggle,
  onEdit,
  onDelete,
}: HabitCardProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 transition-opacity ${
        isCompleted ? "opacity-60" : ""
      }`}
    >
      <Checkbox
        checked={isCompleted}
        onCheckedChange={onToggle}
        aria-label={`${habit.title} ${isCompleted ? "완료 해제" : "완료 체크"}`}
      />

      <div className="flex flex-1 items-center gap-2">
        <span
          className={`text-sm font-medium ${isCompleted ? "line-through" : ""}`}
        >
          {habit.title}
        </span>
        <Badge className={CATEGORY_COLORS[habit.category]} variant="secondary">
          {habit.category}
        </Badge>
        {habit.reminder_time && (
          <span
            className="text-muted-foreground flex items-center gap-0.5 text-xs"
            title={`알림: ${habit.reminder_time}`}
          >
            <Bell className="size-3" />
            {habit.reminder_time}
          </span>
        )}
      </div>

      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onEdit}
          aria-label={`${habit.title} 수정`}
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onDelete}
          aria-label={`${habit.title} 삭제`}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}
