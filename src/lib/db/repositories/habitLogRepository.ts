import { db } from "../local";
import { enqueue } from "../sync";
import type { HabitLog } from "@/types/habit";

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
  if (isCompleted) {
    // 삭제
    const log = await db.habit_logs
      .where("[habit_id+completed_at]")
      .equals([habitId, dateStr])
      .first();
    if (log) {
      await db.habit_logs.delete(log.id);
      await enqueue({
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
    await enqueue({
      table: "habit_logs",
      operation: "INSERT",
      payload: { ...newLog },
    });
  }
}
