import { createClient } from "@/lib/supabase/client";
import type { HabitLog } from "@/types/habit";
import { format } from "date-fns";

const supabase = createClient();

export async function fetchLogsByDate(date: Date): Promise<HabitLog[]> {
  const dateStr = format(date, "yyyy-MM-dd");

  const { data, error } = await supabase
    .from("habit_logs")
    .select("*")
    .eq("completed_at", dateStr);

  if (error) throw error;
  return data;
}

export async function toggleHabitLog(
  habitId: string,
  date: Date,
  isCompleted: boolean
): Promise<void> {
  const dateStr = format(date, "yyyy-MM-dd");

  if (isCompleted) {
    const { error } = await supabase
      .from("habit_logs")
      .delete()
      .eq("habit_id", habitId)
      .eq("completed_at", dateStr);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("habit_logs")
      .insert({ habit_id: habitId, completed_at: dateStr });

    if (error) throw error;
  }
}
