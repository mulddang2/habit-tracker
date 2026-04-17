import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/local";
import * as habitLogRepository from "@/lib/db/repositories/habitLogRepository";

beforeEach(async () => {
  await db.habits.clear();
  await db.habit_logs.clear();
  await db.sync_queue.clear();
});

describe("habitLogRepository", () => {
  describe("fetchByDate", () => {
    it("특정 날짜의 로그를 반환한다", async () => {
      await db.habit_logs.bulkAdd([
        { id: "1", habit_id: "h1", completed_at: "2026-04-16" },
        { id: "2", habit_id: "h2", completed_at: "2026-04-16" },
        { id: "3", habit_id: "h1", completed_at: "2026-04-17" },
      ]);

      const result = await habitLogRepository.fetchByDate("2026-04-16");
      expect(result).toHaveLength(2);
    });
  });

  describe("fetchByMonth", () => {
    it("날짜 범위의 로그를 반환한다", async () => {
      await db.habit_logs.bulkAdd([
        { id: "1", habit_id: "h1", completed_at: "2026-03-31" },
        { id: "2", habit_id: "h1", completed_at: "2026-04-01" },
        { id: "3", habit_id: "h1", completed_at: "2026-04-15" },
        { id: "4", habit_id: "h1", completed_at: "2026-04-30" },
        { id: "5", habit_id: "h1", completed_at: "2026-05-01" },
      ]);

      const result = await habitLogRepository.fetchByMonth(
        "2026-04-01",
        "2026-04-30"
      );
      expect(result).toHaveLength(3);
    });
  });

  describe("fetchByRange", () => {
    it("범위 내 로그를 반환한다", async () => {
      await db.habit_logs.bulkAdd([
        { id: "1", habit_id: "h1", completed_at: "2026-04-10" },
        { id: "2", habit_id: "h1", completed_at: "2026-04-12" },
        { id: "3", habit_id: "h1", completed_at: "2026-04-14" },
        { id: "4", habit_id: "h1", completed_at: "2026-04-16" },
      ]);

      const result = await habitLogRepository.fetchByRange(
        "2026-04-11",
        "2026-04-15"
      );
      expect(result).toHaveLength(2);
    });
  });

  describe("toggle", () => {
    it("미완료 습관을 체크하면 로그를 추가하고 sync queue에 INSERT한다", async () => {
      await habitLogRepository.toggle("habit-1", "2026-04-16", false);

      const logs = await db.habit_logs.toArray();
      expect(logs).toHaveLength(1);
      expect(logs[0].habit_id).toBe("habit-1");
      expect(logs[0].completed_at).toBe("2026-04-16");

      const queue = await db.sync_queue.toArray();
      expect(queue).toHaveLength(1);
      expect(queue[0].operation).toBe("INSERT");
    });

    it("완료된 습관을 해제하면 로그를 삭제하고 sync queue에 DELETE한다", async () => {
      await db.habit_logs.add({
        id: "log-1",
        habit_id: "habit-1",
        completed_at: "2026-04-16",
      });

      await habitLogRepository.toggle("habit-1", "2026-04-16", true);

      const logs = await db.habit_logs.toArray();
      expect(logs).toHaveLength(0);

      const queue = await db.sync_queue.toArray();
      expect(queue).toHaveLength(1);
      expect(queue[0].operation).toBe("DELETE");
    });

    it("존재하지 않는 로그를 해제해도 에러가 발생하지 않는다", async () => {
      await expect(
        habitLogRepository.toggle("nonexistent", "2026-04-16", true)
      ).resolves.not.toThrow();

      const queue = await db.sync_queue.toArray();
      expect(queue).toHaveLength(0);
    });
  });
});
