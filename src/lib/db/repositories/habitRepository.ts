import { db } from "../local";
import { enqueue } from "../sync";
import type { Habit } from "@/types/habit";

export async function fetchAll(): Promise<Habit[]> {
  return db.habits.orderBy("order").toArray();
}

export async function create(habit: Habit): Promise<Habit> {
  await db.habits.add(habit);
  await enqueue({
    table: "habits",
    operation: "INSERT",
    payload: { ...habit },
  });
  return habit;
}

export async function update(
  id: string,
  data: Partial<Pick<Habit, "title" | "category" | "order" | "reminder_time">>
): Promise<Habit> {
  await db.habits.update(id, {
    ...data,
    updated_at: new Date().toISOString(),
  });
  await enqueue({
    table: "habits",
    operation: "UPDATE",
    payload: { id, ...data, updated_at: new Date().toISOString() },
  });
  const updated = await db.habits.get(id);
  return updated!;
}

export async function remove(id: string): Promise<void> {
  await db.habits.delete(id);
  // 관련 로그도 로컬에서 삭제
  await db.habit_logs.where("habit_id").equals(id).delete();
  await enqueue({
    table: "habits",
    operation: "DELETE",
    payload: { id },
  });
}

export async function getMaxOrder(): Promise<number> {
  const last = await db.habits.orderBy("order").last();
  return last?.order ?? 0;
}
