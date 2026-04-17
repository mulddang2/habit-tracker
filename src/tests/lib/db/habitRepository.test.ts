import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/local";
import * as habitRepository from "@/lib/db/repositories/habitRepository";
import type { Habit } from "@/types/habit";

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

beforeEach(async () => {
  await db.habits.clear();
  await db.habit_logs.clear();
  await db.sync_queue.clear();
});

describe("habitRepository", () => {
  describe("fetchAll", () => {
    it("order 기준 정렬된 습관 목록을 반환한다", async () => {
      await db.habits.bulkAdd([
        makeHabit({ order: 3, title: "C" }),
        makeHabit({ order: 1, title: "A" }),
        makeHabit({ order: 2, title: "B" }),
      ]);

      const result = await habitRepository.fetchAll();
      expect(result.map((h) => h.title)).toEqual(["A", "B", "C"]);
    });

    it("습관이 없으면 빈 배열을 반환한다", async () => {
      const result = await habitRepository.fetchAll();
      expect(result).toEqual([]);
    });
  });

  describe("create", () => {
    it("습관을 IndexedDB에 저장하고 sync queue에 INSERT를 추가한다", async () => {
      const habit = makeHabit();
      const result = await habitRepository.create(habit);

      expect(result).toEqual(habit);

      const stored = await db.habits.get(habit.id);
      expect(stored).toEqual(habit);

      const queue = await db.sync_queue.toArray();
      expect(queue).toHaveLength(1);
      expect(queue[0].table).toBe("habits");
      expect(queue[0].operation).toBe("INSERT");
    });
  });

  describe("update", () => {
    it("습관을 수정하고 sync queue에 UPDATE를 추가한다", async () => {
      const habit = makeHabit({
        title: "원래 제목",
        updated_at: "2026-01-01T00:00:00.000Z",
      });
      await db.habits.add(habit);

      const result = await habitRepository.update(habit.id, {
        title: "수정된 제목",
      });

      expect(result.title).toBe("수정된 제목");
      expect(result.updated_at).not.toBe("2026-01-01T00:00:00.000Z");

      const queue = await db.sync_queue.toArray();
      expect(queue).toHaveLength(1);
      expect(queue[0].operation).toBe("UPDATE");
    });
  });

  describe("remove", () => {
    it("습관과 관련 로그를 삭제하고 sync queue에 DELETE를 추가한다", async () => {
      const habit = makeHabit();
      await db.habits.add(habit);
      await db.habit_logs.bulkAdd([
        { id: "log-1", habit_id: habit.id, completed_at: "2026-04-16" },
        { id: "log-2", habit_id: habit.id, completed_at: "2026-04-17" },
        { id: "log-3", habit_id: "other-habit", completed_at: "2026-04-16" },
      ]);

      await habitRepository.remove(habit.id);

      const habits = await db.habits.toArray();
      expect(habits).toHaveLength(0);

      const logs = await db.habit_logs.toArray();
      expect(logs).toHaveLength(1);
      expect(logs[0].habit_id).toBe("other-habit");

      const queue = await db.sync_queue.toArray();
      expect(queue).toHaveLength(1);
      expect(queue[0].operation).toBe("DELETE");
    });
  });

  describe("getMaxOrder", () => {
    it("가장 큰 order 값을 반환한다", async () => {
      await db.habits.bulkAdd([
        makeHabit({ order: 3 }),
        makeHabit({ order: 7 }),
        makeHabit({ order: 2 }),
      ]);

      const result = await habitRepository.getMaxOrder();
      expect(result).toBe(7);
    });

    it("습관이 없으면 0을 반환한다", async () => {
      const result = await habitRepository.getMaxOrder();
      expect(result).toBe(0);
    });
  });
});
