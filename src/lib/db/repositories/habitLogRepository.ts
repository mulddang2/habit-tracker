import { db } from "../local";
import { enqueueWithin, triggerPush } from "../sync";
import type { HabitLog } from "@/types/habit";

// habitRepository와 동일 — 로컬 변경과 큐 삽입을 한 트랜잭션으로 커밋한다.
function writeAtomically(fn: () => Promise<void>): Promise<void> {
  return db.transaction("rw", db.habit_logs, db.sync_queue, fn);
}

export async function fetchByDate(dateStr: string): Promise<HabitLog[]> {
  return db.habit_logs.where("completed_at").equals(dateStr).toArray();
}

export async function fetchByMonth(
  from: string,
  to: string
): Promise<HabitLog[]> {
  return db.habit_logs
    .where("completed_at")
    .between(from, to, true, true)
    .toArray();
}

export async function fetchByRange(
  from: string,
  to: string
): Promise<HabitLog[]> {
  return db.habit_logs
    .where("completed_at")
    .between(from, to, true, true)
    .toArray();
}

export async function toggle(
  habitId: string,
  dateStr: string,
  isCompleted: boolean
): Promise<void> {
  await writeAtomically(async () => {
    if (isCompleted) {
      // 삭제
      const log = await db.habit_logs
        .where("[habit_id+completed_at]")
        .equals([habitId, dateStr])
        .first();
      if (log) {
        await db.habit_logs.delete(log.id);
        await enqueueWithin({
          table: "habit_logs",
          operation: "DELETE",
          payload: { id: log.id },
        });
      }
    } else {
      // 추가
      const id = crypto.randomUUID();
      const newLog: HabitLog = {
        id,
        habit_id: habitId,
        completed_at: dateStr,
      };
      await db.habit_logs.add(newLog);
      await enqueueWithin({
        table: "habit_logs",
        operation: "INSERT",
        payload: { ...newLog },
      });
    }
  });
  triggerPush();
}
