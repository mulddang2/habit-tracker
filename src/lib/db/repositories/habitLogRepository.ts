import { db } from "../local";
import { enqueueWithin, triggerPush } from "../sync";
import { isAlive } from "../tombstone";
import type { HabitLog } from "@/types/habit";

// habitRepository와 동일 — 로컬 변경과 큐 삽입을 한 트랜잭션으로 커밋한다.
function writeAtomically(fn: () => Promise<void>): Promise<void> {
  return db.transaction("rw", db.habit_logs, db.sync_queue, fn);
}

export async function fetchByDate(dateStr: string): Promise<HabitLog[]> {
  return db.habit_logs
    .where("completed_at")
    .equals(dateStr)
    .filter(isAlive)
    .toArray();
}

export async function fetchByMonth(
  from: string,
  to: string
): Promise<HabitLog[]> {
  return db.habit_logs
    .where("completed_at")
    .between(from, to, true, true)
    .filter(isAlive)
    .toArray();
}

export async function fetchByRange(
  from: string,
  to: string
): Promise<HabitLog[]> {
  return db.habit_logs
    .where("completed_at")
    .between(from, to, true, true)
    .filter(isAlive)
    .toArray();
}

export async function toggle(
  habitId: string,
  dateStr: string,
  isCompleted: boolean
): Promise<void> {
  const now = new Date().toISOString();

  await writeAtomically(async () => {
    // 삭제 표시된 행도 함께 찾는다. 아래에서 그 행을 되살려 쓰기 때문에
    // (habit, 날짜) 한 쌍에 대한 행은 언제나 최대 하나다.
    const existing = await db.habit_logs
      .where("[habit_id+completed_at]")
      .equals([habitId, dateStr])
      .first();

    if (isCompleted) {
      // 체크 해제 — 지우지 않고 표시만 남긴다
      if (!existing || !isAlive(existing)) return;
      const payload = { id: existing.id, deleted_at: now, updated_at: now };
      await db.habit_logs.update(existing.id, {
        deleted_at: now,
        updated_at: now,
      });
      await enqueueWithin({
        table: "habit_logs",
        operation: "UPDATE",
        payload,
      });
      return;
    }

    // 체크 — 전에 해제한 적이 있으면 그 행을 되살린다.
    // 새 행을 만들면 같은 날짜에 행이 둘 생겨, 다음 조회가 어느 쪽을
    // 집을지 모호해진다.
    if (existing) {
      const payload = { id: existing.id, deleted_at: null, updated_at: now };
      await db.habit_logs.update(existing.id, {
        deleted_at: null,
        updated_at: now,
      });
      await enqueueWithin({
        table: "habit_logs",
        operation: "UPDATE",
        payload,
      });
      return;
    }

    const newLog: HabitLog = {
      id: crypto.randomUUID(),
      habit_id: habitId,
      completed_at: dateStr,
      updated_at: now,
      deleted_at: null,
    };
    await db.habit_logs.add(newLog);
    await enqueueWithin({
      table: "habit_logs",
      operation: "INSERT",
      payload: { ...newLog },
    });
  });

  triggerPush();
}
