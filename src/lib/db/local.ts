import Dexie, { type EntityTable } from "dexie";
import type { Habit, HabitLog } from "@/types/habit";

export interface SyncQueueItem {
  id?: number;
  table: "habits" | "habit_logs" | "coach_events";
  operation: "INSERT" | "UPDATE" | "DELETE";
  payload: Record<string, unknown>;
  created_at: number;
  retries: number;
  last_error?: string;
}

const db = new Dexie("habit-tracker-local") as Dexie & {
  habits: EntityTable<Habit, "id">;
  habit_logs: EntityTable<HabitLog, "id">;
  sync_queue: EntityTable<SyncQueueItem, "id">;
};

db.version(1).stores({
  habits: "id, user_id, order, category",
  habit_logs: "id, habit_id, completed_at, [habit_id+completed_at]",
  sync_queue: "++id, table, created_at",
});

export { db };
