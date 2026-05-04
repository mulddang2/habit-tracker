import { db } from "./local";
import { createClient } from "@/lib/supabase/client";

export async function hydrateLocalDb(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // habits
  const { data: habits } = await supabase
    .from("habits")
    .select("*")
    .order("order", { ascending: true });
  if (habits && habits.length > 0) {
    await db.habits.bulkPut(habits);
  }

  // habit_logs
  const { data: logs } = await supabase.from("habit_logs").select("*");
  if (logs && logs.length > 0) {
    await db.habit_logs.bulkPut(logs);
  }
}
