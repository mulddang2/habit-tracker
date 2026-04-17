import { createClient } from "@/lib/supabase/client";
import * as habitLogRepository from "@/lib/db/repositories/habitLogRepository";
import type { HabitLog } from "@/types/habit";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subWeeks,
} from "date-fns";

// --- Remote (Supabase 직접 호출 — sync/hydrate에서 사용) ---

function getClient() {
  return createClient();
}

export async function remoteFetchAllLogs(): Promise<HabitLog[]> {
  const supabase = getClient();
  const { data, error } = await supabase.from("habit_logs").select("*");
  if (error) throw error;
  return data;
}

// --- Public API (로컬 DB 우선) ---

export async function fetchLogsByDate(date: Date): Promise<HabitLog[]> {
  const dateStr = format(date, "yyyy-MM-dd");
  return habitLogRepository.fetchByDate(dateStr);
}

export async function toggleHabitLog(
  habitId: string,
  date: Date,
  isCompleted: boolean
): Promise<void> {
  const dateStr = format(date, "yyyy-MM-dd");
  return habitLogRepository.toggle(habitId, dateStr, isCompleted);
}

export async function fetchLogsByMonth(month: Date): Promise<HabitLog[]> {
  const from = format(startOfMonth(month), "yyyy-MM-dd");
  const to = format(endOfMonth(month), "yyyy-MM-dd");
  return habitLogRepository.fetchByMonth(from, to);
}

export async function fetchLogsByRange(
  from: Date,
  to: Date
): Promise<HabitLog[]> {
  const fromStr = format(from, "yyyy-MM-dd");
  const toStr = format(to, "yyyy-MM-dd");
  return habitLogRepository.fetchByRange(fromStr, toStr);
}

export async function fetchWeeklyLogs(
  baseDate: Date,
  weeks: number = 4
): Promise<HabitLog[]> {
  const to = endOfWeek(baseDate, { weekStartsOn: 1 });
  const from = startOfWeek(subWeeks(baseDate, weeks - 1), { weekStartsOn: 1 });
  return fetchLogsByRange(from, to);
}
