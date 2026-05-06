import { db } from "./local";
import { createClient } from "@/lib/supabase/client";

export async function hydrateLocalDb(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // 미flush INSERT 보호셋 — 서버에 아직 푸시되지 않은 로컬 신규는 mirror 삭제 대상에서 제외
  const pendingInserts = await db.sync_queue
    .filter((q) => q.operation === "INSERT")
    .toArray();
  const protectedHabitIds = new Set(
    pendingInserts
      .filter((q) => q.table === "habits")
      .map((q) => q.payload.id as string)
  );
  const protectedLogIds = new Set(
    pendingInserts
      .filter((q) => q.table === "habit_logs")
      .map((q) => q.payload.id as string)
  );

  // habits — 서버를 진실로 보고 mirror (단, 미flush INSERT는 보호)
  const { data: habits, error: habitsError } = await supabase
    .from("habits")
    .select("*")
    .order("order", { ascending: true });
  if (!habitsError && habits) {
    const serverIds = new Set(habits.map((h) => h.id));
    const localIds = (await db.habits.toCollection().primaryKeys()) as string[];
    const toDelete = localIds.filter(
      (id) => !serverIds.has(id) && !protectedHabitIds.has(id)
    );
    if (toDelete.length > 0) await db.habits.bulkDelete(toDelete);
    if (habits.length > 0) await db.habits.bulkPut(habits);
  }

  // habit_logs — 동일 패턴
  const { data: logs, error: logsError } = await supabase
    .from("habit_logs")
    .select("*");
  if (!logsError && logs) {
    const serverIds = new Set(logs.map((l) => l.id));
    const localIds = (await db.habit_logs
      .toCollection()
      .primaryKeys()) as string[];
    const toDelete = localIds.filter(
      (id) => !serverIds.has(id) && !protectedLogIds.has(id)
    );
    if (toDelete.length > 0) await db.habit_logs.bulkDelete(toDelete);
    if (logs.length > 0) await db.habit_logs.bulkPut(logs);
  }
}
