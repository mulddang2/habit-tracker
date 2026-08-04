import { db } from "../local";
import { enqueueWithin, triggerPush } from "../sync";
import type { Habit } from "@/types/habit";

// 로컬 변경과 큐 삽입을 한 트랜잭션으로 커밋한다. pullFromServer가 둘 사이의
// 중간 상태를 관측하면 미전송 변경이 서버 스냅샷에 덮여 되살아난다.
function writeAtomically(fn: () => Promise<void>): Promise<void> {
  return db.transaction("rw", db.habits, db.habit_logs, db.sync_queue, fn);
}

export async function fetchAll(): Promise<Habit[]> {
  return db.habits.orderBy("order").toArray();
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

export async function remove(id: string): Promise<void> {
  await writeAtomically(async () => {
    await db.habits.delete(id);
    // 관련 로그도 로컬에서 삭제 (서버는 FK cascade가 처리)
    await db.habit_logs.where("habit_id").equals(id).delete();
    await enqueueWithin({
      table: "habits",
      operation: "DELETE",
      payload: { id },
    });
  });
  triggerPush();
}

export async function getMaxOrder(): Promise<number> {
  const last = await db.habits.orderBy("order").last();
  return last?.order ?? 0;
}
