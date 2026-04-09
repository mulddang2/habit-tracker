"use client";

import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, CalendarCheck } from "lucide-react";
import type { Category } from "@/types/habit";

const CATEGORY_COLORS: Record<Category, string> = {
  건강: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  공부: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  운동: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  라이프:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

interface HabitStreakCardProps {
  title: string;
  category: Category;
  currentStreak: number;
  longestStreak: number;
  completedDays: number;
}

export function HabitStreakCard({
  title,
  category,
  currentStreak,
  longestStreak,
  completedDays,
}: HabitStreakCardProps) {
  return (
    <div
      className="flex items-center justify-between rounded-lg border p-3"
      role="listitem"
      aria-label={`${title}: 현재 ${currentStreak}일 연속, 최장 ${longestStreak}일, 이번 달 ${completedDays}회 완료`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{title}</span>
        <Badge className={CATEGORY_COLORS[category]} variant="secondary">
          {category}
        </Badge>
      </div>

      <div className="text-muted-foreground flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1" title="현재 스트릭">
          <Flame className="size-3.5 text-orange-500" />
          <span className="text-foreground font-semibold">{currentStreak}</span>
          일
        </div>
        <div className="flex items-center gap-1" title="최장 스트릭">
          <Trophy className="size-3.5 text-yellow-500" />
          <span className="text-foreground font-semibold">{longestStreak}</span>
          일
        </div>
        <div className="flex items-center gap-1" title="이번 달 완료 횟수">
          <CalendarCheck className="size-3.5 text-emerald-500" />
          <span className="text-foreground font-semibold">{completedDays}</span>
          회
        </div>
      </div>
    </div>
  );
}
