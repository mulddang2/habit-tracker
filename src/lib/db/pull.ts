import type { Table } from "dexie";
import { db } from "./local";
import { withSyncLock } from "./syncLock";
import { serverWins, type Versioned } from "./tombstone";
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

  // 잠금셋 조회와 미러 반영은 한 트랜잭션 안에서 이뤄진다. 리포지토리 쪽도
  // "로컬 변경 + enqueue"를 한 트랜잭션으로 커밋하므로 변경 전/후만 관측한다.
  await db.transaction(
    "rw",
    db.habits,
    db.habit_logs,
    db.sync_queue,
    async () => {
      // 아직 서버로 못 보낸 작업이 있는 row id는 어느 방향으로도 건드리지 않는다.
      // 시각 비교가 대부분을 막아주지만, 기기 시계가 어긋난 경우까지 대비해
      // 미전송 항목은 아예 손대지 않는 쪽이 안전하다.
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

      if (!habitsError && habits)
        await mirror(db.habits, habits, lockedHabitIds);
      if (!logsError && logs) await mirror(db.habit_logs, logs, lockedLogIds);
    }
  );
}

/**
 * 서버 목록을 로컬에 반영한다. 반드시 트랜잭션 안에서 호출한다.
 *
 * 서버 행을 무조건 덮어쓰지 않고 updated_at을 비교해 **더 최신일 때만** 쓴다.
 * 이게 낡은 응답으로부터 로컬을 지키는 핵심이다 — 방금 한 삭제(= deleted_at이
 * 채워진 더 최신 행)를, 그 삭제를 아직 모르는 응답이 되돌리지 못한다.
 */
async function mirror<T extends Versioned & { id: string }>(
  table: Table<T, string>,
  serverRows: T[],
  lockedIds: Set<string>
): Promise<void> {
  // 서버가 아예 모르는 로컬 행은 아직 못 보낸 생성뿐이다. 삭제는 이제
  // 목록에서 사라지는 대신 표시된 행으로 오므로 여기 걸리지 않는다.
  const serverIds = new Set(serverRows.map((r) => r.id));
  const localIds = (await table.toCollection().primaryKeys()) as string[];
  const toDelete = localIds.filter(
    (id) => !serverIds.has(id) && !lockedIds.has(id)
  );
  if (toDelete.length > 0) await table.bulkDelete(toDelete);

  const candidates = serverRows.filter((r) => !lockedIds.has(r.id));
  const local = await table.bulkGet(candidates.map((r) => r.id));
  const toPut = candidates.filter((r, i) => serverWins(r, local[i]));
  if (toPut.length > 0) await table.bulkPut(toPut);
}
