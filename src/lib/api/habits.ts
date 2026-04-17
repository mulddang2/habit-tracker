import { createClient } from "@/lib/supabase/client";
import * as habitRepository from "@/lib/db/repositories/habitRepository";
import type { Habit } from "@/types/habit";

// --- Remote (Supabase 직접 호출 — sync queue에서 사용) ---

function getClient() {
  return createClient();
}

export async function remoteFetchHabits(): Promise<Habit[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .order("order", { ascending: true });

  if (error) throw error;
  return data;
}

// --- Public API (로컬 DB 우선) ---

export async function fetchHabits(): Promise<Habit[]> {
  return habitRepository.fetchAll();
}

export async function createHabit(
  habit: Pick<Habit, "title" | "category"> & { reminder_time?: string | null }
): Promise<Habit> {
  const supabase = getClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("인증되지 않은 사용자입니다.");

  const maxOrder = await habitRepository.getMaxOrder();

  const newHabit: Habit = {
    id: crypto.randomUUID(),
    user_id: user.id,
    title: habit.title,
    category: habit.category,
    reminder_time: habit.reminder_time ?? null,
    order: maxOrder + 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return habitRepository.create(newHabit);
}

export async function updateHabit(
  id: string,
  habit: Partial<Pick<Habit, "title" | "category" | "order" | "reminder_time">>
): Promise<Habit> {
  return habitRepository.update(id, habit);
}

export async function deleteHabit(id: string): Promise<void> {
  return habitRepository.remove(id);
}
