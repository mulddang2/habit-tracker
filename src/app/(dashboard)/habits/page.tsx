import type { Metadata } from "next";
import { TodayHeader } from "@/components/habits/TodayHeader";
import { HabitList } from "@/components/habits/HabitList";
import { AddHabitDialog } from "@/components/habits/AddHabitDialog";
import { AiCoachCard } from "@/components/habits/AiCoachCard";

export const metadata: Metadata = { title: "오늘의 습관" };

export default function HabitsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <TodayHeader />
        <AddHabitDialog />
      </div>
      <AiCoachCard />
      <HabitList />
    </div>
  );
}
