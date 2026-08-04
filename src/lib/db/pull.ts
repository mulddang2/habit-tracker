import { db } from "./local";
import { withSyncLock } from "./syncLock";
import { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;

// 탭 복귀 시 visibilitychange와 focus가 연달아 발화한다. 잠금만 걸면 두 번이
// 순서대로 돌면서 서버 왕복이 두 번 생기므로, 진행 중인 실행을 공유한다.
// 공유한 쪽은 요청 직전이 아니라 진행 중인 조회 시점의 데이터를 받지만,
// 미전송 변경은 어차피 잠금셋이 지키므로 신선도만 조금 손해 볼 뿐이다.
let running: Promise<void> | null = null;

export function pullFromServer(): Promise<void> {
  if (running) return running;

  const run = (async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // 서버 조회부터 미러 반영까지가 한 덩어리다. pushToServer와 겹치면 낡은
    // 스냅샷으로 되돌리게 되므로 조회를 잠금 밖으로 빼면 안 된다. (syncLock.ts 참고)
    await withSyncLock(() => applyServerSnapshot(supabase));
  })().finally(() => {
    running = null;
  });

  running = run;
  return run;
}

async function applyServerSnapshot(supabase: Supabase): Promise<void> {
  // 서버 조회는 Dexie 트랜잭션 밖에서 끝낸다. 트랜잭션 안에서 외부 Promise를
  // await 하면 트랜잭션이 조기 커밋된다.
  const { data: habits, error: habitsError } = await supabase
    .from("habits")
    .select("*")
    .order("order", { ascending: true });
  const { data: logs, error: logsError } = await supabase
    .from("habit_logs")
    .select("*");

  // 잠금셋 조회와 미러 반영은 반드시 한 트랜잭션 안에서 이뤄져야 한다.
  // 분리하면 그 사이에 커밋된 로컬 변경(특히 DELETE)이 잠금셋에 안 잡혀
  // 서버 스냅샷으로 되살아난다. 리포지토리 쪽도 "로컬 변경 + enqueue"를
  // 한 트랜잭션으로 커밋하므로, 여기서는 변경 전/후만 관측한다.
  await db.transaction(
    "rw",
    db.habits,
    db.habit_logs,
    db.sync_queue,
    async () => {
      // 아직 서버로 못 보낸 작업이 있는 row id는 어느 방향으로도 건드리지 않는다.
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
      if (!habitsError && habits) {
        const serverIds = new Set(habits.map((h) => h.id));
        const localIds = (await db.habits
          .toCollection()
          .primaryKeys()) as string[];
        const toDelete = localIds.filter(
          (id) => !serverIds.has(id) && !lockedHabitIds.has(id)
        );
        if (toDelete.length > 0) await db.habits.bulkDelete(toDelete);
        const toPut = habits.filter((h) => !lockedHabitIds.has(h.id));
        if (toPut.length > 0) await db.habits.bulkPut(toPut);
      }

      // habit_logs — 동일 패턴
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
  );
}
