import { createClient } from "@/lib/supabase/client";
import type { HabitLog } from "@/types/habit";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subWeeks,
} from "date-fns";

function getClient() {
  return createClient();
}

export async function fetchLogsByDate(date: Date): Promise<HabitLog[]> {
  const supabase = getClient();
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
  const supabase = getClient();
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

export async function fetchLogsByMonth(month: Date): Promise<HabitLog[]> {
  const supabase = getClient();
  const from = format(startOfMonth(month), "yyyy-MM-dd");
  const to = format(endOfMonth(month), "yyyy-MM-dd");

  const { data, error } = await supabase
    .from("habit_logs")
    .select("*")
    .gte("completed_at", from)
    .lte("completed_at", to);

  if (error) throw error;
  return data;
}

export async function fetchLogsByRange(
  from: Date,
  to: Date
): Promise<HabitLog[]> {
  const supabase = getClient();
  const fromStr = format(from, "yyyy-MM-dd");
  const toStr = format(to, "yyyy-MM-dd");

  const { data, error } = await supabase
    .from("habit_logs")
    .select("*")
    .gte("completed_at", fromStr)
    .lte("completed_at", toStr);

  if (error) throw error;
  return data;
}

export async function fetchWeeklyLogs(
  baseDate: Date,
  weeks: number = 4
): Promise<HabitLog[]> {
  const to = endOfWeek(baseDate, { weekStartsOn: 1 });
  const from = startOfWeek(subWeeks(baseDate, weeks - 1), { weekStartsOn: 1 });
  return fetchLogsByRange(from, to);
}
