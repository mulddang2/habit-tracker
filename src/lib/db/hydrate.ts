import { db } from "./local";
import { createClient } from "@/lib/supabase/client";

export async function hydrateLocalDb(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // 잠금셋 — sync_queue에 미flush 작업이 있는 row id는 hydrate가 어느 방향으로도 건드리지 않음.
  // INSERT(서버에 아직 없음 → 삭제 금지), UPDATE(로컬이 더 최신 → 덮어쓰기 금지),
  // DELETE(서버는 아직 보유 → 부활 금지) 모두 보호.
  const pending = await db.sync_queue.toArray();
  const lockedHabitIds = new Set(
    pending
      .filter((q) => q.table === "habits")
      .map((q) => q.payload.id as string)
  );
  const lockedLogIds = new Set(
    pending
      .filter((q) => q.table === "habit_logs")
      .map((q) => q.payload.id as string)
  );

  // habits — 서버를 진실로 보고 mirror, 단 잠금 항목은 제외
  const { data: habits, error: habitsError } = await supabase
    .from("habits")
    .select("*")
    .order("order", { ascending: true });
  if (!habitsError && habits) {
    const serverIds = new Set(habits.map((h) => h.id));
    const localIds = (await db.habits.toCollection().primaryKeys()) as string[];
    const toDelete = localIds.filter(
      (id) => !serverIds.has(id) && !lockedHabitIds.has(id)
    );
    if (toDelete.length > 0) await db.habits.bulkDelete(toDelete);
    const toPut = habits.filter((h) => !lockedHabitIds.has(h.id));
    if (toPut.length > 0) await db.habits.bulkPut(toPut);
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
      (id) => !serverIds.has(id) && !lockedLogIds.has(id)
    );
    if (toDelete.length > 0) await db.habit_logs.bulkDelete(toDelete);
    const toPut = logs.filter((l) => !lockedLogIds.has(l.id));
    if (toPut.length > 0) await db.habit_logs.bulkPut(toPut);
  }
}
