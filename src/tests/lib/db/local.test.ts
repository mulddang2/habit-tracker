import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/local";
import type { Habit, HabitLog } from "@/types/habit";

const makeHabit = (overrides: Partial<Habit> = {}): Habit => ({
  id: crypto.randomUUID(),
  user_id: "user-1",
  title: "테스트 습관",
  category: "건강",
  reminder_time: null,
  order: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const makeLog = (overrides: Partial<HabitLog> = {}): HabitLog => ({
  id: crypto.randomUUID(),
  habit_id: "habit-1",
  completed_at: "2026-04-16",
  ...overrides,
});

beforeEach(async () => {
  await db.habits.clear();
  await db.habit_logs.clear();
  await db.sync_queue.clear();
});

describe("Dexie local DB", () => {
  describe("habits", () => {
    it("습관을 추가하고 조회할 수 있다", async () => {
      const habit = makeHabit();
      await db.habits.add(habit);

      const result = await db.habits.get(habit.id);
      expect(result).toEqual(habit);
    });

    it("order 기준으로 정렬 조회할 수 있다", async () => {
      await db.habits.bulkAdd([
        makeHabit({ order: 3, title: "세번째" }),
        makeHabit({ order: 1, title: "첫번째" }),
        makeHabit({ order: 2, title: "두번째" }),
      ]);

      const result = await db.habits.orderBy("order").toArray();
      expect(result.map((h) => h.title)).toEqual([
        "첫번째",
        "두번째",
        "세번째",
      ]);
    });

    it("습관을 수정할 수 있다", async () => {
      const habit = makeHabit();
      await db.habits.add(habit);
      await db.habits.update(habit.id, { title: "수정된 습관" });

      const result = await db.habits.get(habit.id);
      expect(result?.title).toBe("수정된 습관");
    });

    it("습관을 삭제할 수 있다", async () => {
      const habit = makeHabit();
      await db.habits.add(habit);
      await db.habits.delete(habit.id);

      const result = await db.habits.get(habit.id);
      expect(result).toBeUndefined();
    });
  });

  describe("habit_logs", () => {
    it("날짜로 로그를 조회할 수 있다", async () => {
      await db.habit_logs.bulkAdd([
        makeLog({ completed_at: "2026-04-16" }),
        makeLog({ completed_at: "2026-04-17" }),
        makeLog({ completed_at: "2026-04-16" }),
      ]);

      const result = await db.habit_logs
        .where("completed_at")
        .equals("2026-04-16")
        .toArray();
      expect(result).toHaveLength(2);
    });

    it("날짜 범위로 로그를 조회할 수 있다", async () => {
      await db.habit_logs.bulkAdd([
        makeLog({ completed_at: "2026-04-14" }),
        makeLog({ completed_at: "2026-04-15" }),
        makeLog({ completed_at: "2026-04-16" }),
        makeLog({ completed_at: "2026-04-17" }),
      ]);

      const result = await db.habit_logs
        .where("completed_at")
        .between("2026-04-15", "2026-04-16", true, true)
        .toArray();
      expect(result).toHaveLength(2);
    });

    it("복합 인덱스로 특정 습관의 특정 날짜 로그를 찾을 수 있다", async () => {
      const habitId = "habit-test";
      await db.habit_logs.bulkAdd([
        makeLog({ habit_id: habitId, completed_at: "2026-04-16" }),
        makeLog({ habit_id: "other", completed_at: "2026-04-16" }),
      ]);

      const result = await db.habit_logs
        .where("[habit_id+completed_at]")
        .equals([habitId, "2026-04-16"])
        .first();
      expect(result?.habit_id).toBe(habitId);
    });
  });

  describe("sync_queue", () => {
    it("동기화 항목을 추가하고 FIFO로 조회할 수 있다", async () => {
      await db.sync_queue.add({
        table: "habits",
        operation: "INSERT",
        payload: { id: "1" },
        created_at: 100,
        retries: 0,
      });
      await db.sync_queue.add({
        table: "habits",
        operation: "UPDATE",
        payload: { id: "2" },
        created_at: 200,
        retries: 0,
      });

      const items = await db.sync_queue.orderBy("id").toArray();
      expect(items).toHaveLength(2);
      expect(items[0].operation).toBe("INSERT");
      expect(items[1].operation).toBe("UPDATE");
    });
  });
});
