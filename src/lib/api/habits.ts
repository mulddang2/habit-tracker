import { createClient } from "@/lib/supabase/client";
import type { Habit } from "@/types/habit";

function getClient() {
  return createClient();
}

export async function fetchHabits(): Promise<Habit[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .order("order", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createHabit(
  habit: Pick<Habit, "title" | "category">
): Promise<Habit> {
  const supabase = getClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("인증되지 않은 사용자입니다.");

  const { data: maxOrderData } = await supabase
    .from("habits")
    .select("order")
    .order("order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrderData?.order ?? 0) + 1;

  const { data, error } = await supabase
    .from("habits")
    .insert({ ...habit, user_id: user.id, order: nextOrder })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHabit(
  id: string,
  habit: Partial<Pick<Habit, "title" | "category" | "order">>
): Promise<Habit> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("habits")
    .update(habit)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHabit(id: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase.from("habits").delete().eq("id", id);

  if (error) throw error;
}
