import { db } from "../local";
import { enqueueWithin, triggerPush } from "../sync";
import { isAlive } from "../tombstone";
import type { Habit } from "@/types/habit";

// 로컬 변경과 큐 삽입을 한 트랜잭션으로 커밋한다. pullFromServer가 둘 사이의
// 중간 상태를 관측하면 미전송 변경이 서버 스냅샷에 덮여 되살아난다.
function writeAtomically(fn: () => Promise<void>): Promise<void> {
  return db.transaction("rw", db.habits, db.habit_logs, db.sync_queue, fn);
}

export async function fetchAll(): Promise<Habit[]> {
  return db.habits.orderBy("order").filter(isAlive).toArray();
}

export async function create(habit: Habit): Promise<Habit> {
  await writeAtomically(async () => {
    await db.habits.add(habit);
    await enqueueWithin({
      table: "habits",
      operation: "INSERT",
      payload: { ...habit },
    });
  });
  triggerPush();
  return habit;
}

export async function update(
  id: string,
  data: Partial<Pick<Habit, "title" | "category" | "order" | "reminder_time">>
): Promise<Habit> {
  const updated_at = new Date().toISOString();
  await writeAtomically(async () => {
    await db.habits.update(id, { ...data, updated_at });
    await enqueueWithin({
      table: "habits",
      operation: "UPDATE",
      payload: { id, ...data, updated_at },
    });
  });
  triggerPush();
  const updated = await db.habits.get(id);
  return updated!;
}

/**
 * 삭제 표시만 남긴다. 행을 지우지 않는 이유는 tombstone.ts 참고 —
 * 지워버리면 낡은 서버 응답과 최신 여부를 비교할 대상이 없어진다.
 */
export async function remove(id: string): Promise<void> {
  const deleted_at = new Date().toISOString();
  await writeAtomically(async () => {
    await db.habits.update(id, { deleted_at, updated_at: deleted_at });
    // 자식 로그도 로컬에서 즉시 표시해 화면이 바로 반응하게 한다.
    // 서버 쪽은 habits_cascade_soft_delete 트리거가 같은 일을 하므로
    // 로그 하나하나에 대해 요청을 보내지 않는다.
    await db.habit_logs
      .where("habit_id")
      .equals(id)
      .modify({ deleted_at, updated_at: deleted_at });
    await enqueueWithin({
      table: "habits",
      operation: "UPDATE",
      payload: { id, deleted_at, updated_at: deleted_at },
    });
  });
  triggerPush();
}

export async function getMaxOrder(): Promise<number> {
  const last = await db.habits.orderBy("order").filter(isAlive).last();
  return last?.order ?? 0;
}
