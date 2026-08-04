import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/local";
import * as habitLogRepository from "@/lib/db/repositories/habitLogRepository";

beforeEach(async () => {
  await db.habits.clear();
  await db.habit_logs.clear();
  await db.sync_queue.clear();
  // enqueue가 자동 전송을 트리거하지 않도록 오프라인 상태로 둠
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: false,
  });
});

describe("habitLogRepository", () => {
  describe("fetchByDate", () => {
    it("특정 날짜의 로그를 반환한다", async () => {
      await db.habit_logs.bulkAdd([
        {
          id: "1",
          habit_id: "h1",
          completed_at: "2026-04-16",
          updated_at: "2026-04-01T00:00:00.000Z",
          deleted_at: null,
        },
        {
          id: "2",
          habit_id: "h2",
          completed_at: "2026-04-16",
          updated_at: "2026-04-01T00:00:00.000Z",
          deleted_at: null,
        },
        {
          id: "3",
          habit_id: "h1",
          completed_at: "2026-04-17",
          updated_at: "2026-04-01T00:00:00.000Z",
          deleted_at: null,
        },
      ]);

      const result = await habitLogRepository.fetchByDate("2026-04-16");
      expect(result).toHaveLength(2);
    });
  });

  describe("fetchByMonth", () => {
    it("날짜 범위의 로그를 반환한다", async () => {
      await db.habit_logs.bulkAdd([
        {
          id: "1",
          habit_id: "h1",
          completed_at: "2026-03-31",
          updated_at: "2026-04-01T00:00:00.000Z",
          deleted_at: null,
        },
        {
          id: "2",
          habit_id: "h1",
          completed_at: "2026-04-01",
          updated_at: "2026-04-01T00:00:00.000Z",
          deleted_at: null,
        },
        {
          id: "3",
          habit_id: "h1",
          completed_at: "2026-04-15",
          updated_at: "2026-04-01T00:00:00.000Z",
          deleted_at: null,
        },
        {
          id: "4",
          habit_id: "h1",
          completed_at: "2026-04-30",
          updated_at: "2026-04-01T00:00:00.000Z",
          deleted_at: null,
        },
        {
          id: "5",
          habit_id: "h1",
          completed_at: "2026-05-01",
          updated_at: "2026-04-01T00:00:00.000Z",
          deleted_at: null,
        },
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
        {
          id: "1",
          habit_id: "h1",
          completed_at: "2026-04-10",
          updated_at: "2026-04-01T00:00:00.000Z",
          deleted_at: null,
        },
        {
          id: "2",
          habit_id: "h1",
          completed_at: "2026-04-12",
          updated_at: "2026-04-01T00:00:00.000Z",
          deleted_at: null,
        },
        {
          id: "3",
          habit_id: "h1",
          completed_at: "2026-04-14",
          updated_at: "2026-04-01T00:00:00.000Z",
          deleted_at: null,
        },
        {
          id: "4",
          habit_id: "h1",
          completed_at: "2026-04-16",
          updated_at: "2026-04-01T00:00:00.000Z",
          deleted_at: null,
        },
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

    it("완료된 습관을 해제하면 삭제 표시를 남기고 sync queue에 UPDATE한다", async () => {
      await db.habit_logs.add({
        id: "log-1",
        habit_id: "habit-1",
        completed_at: "2026-04-16",
        updated_at: "2026-04-01T00:00:00.000Z",
        deleted_at: null,
      });

      await habitLogRepository.toggle("habit-1", "2026-04-16", true);

      expect(await habitLogRepository.fetchByDate("2026-04-16")).toHaveLength(
        0
      );
      expect((await db.habit_logs.get("log-1"))?.deleted_at).toEqual(
        expect.any(String)
      );

      const queue = await db.sync_queue.toArray();
      expect(queue).toHaveLength(1);
      expect(queue[0].operation).toBe("UPDATE");
    });

    it("해제한 날짜를 다시 체크하면 같은 행을 되살린다", async () => {
      await habitLogRepository.toggle("habit-1", "2026-04-16", false);
      const created = await db.habit_logs.toArray();
      expect(created).toHaveLength(1);

      await habitLogRepository.toggle("habit-1", "2026-04-16", true);
      await habitLogRepository.toggle("habit-1", "2026-04-16", false);

      // 행이 둘로 늘지 않아야 한다 — 같은 날짜에 로그가 둘이면
      // 이후 조회가 어느 쪽을 집을지 모호해진다
      expect(await db.habit_logs.toArray()).toHaveLength(1);
      expect(await habitLogRepository.fetchByDate("2026-04-16")).toHaveLength(
        1
      );
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
