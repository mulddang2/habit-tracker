import { TodayHeader } from "@/components/habits/TodayHeader";
import { HabitList } from "@/components/habits/HabitList";
import { AddHabitDialog } from "@/components/habits/AddHabitDialog";

export default function HabitsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <TodayHeader />
        <AddHabitDialog />
      </div>
      <HabitList />
    </div>
  );
}
