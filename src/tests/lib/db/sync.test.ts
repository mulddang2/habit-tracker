import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db/local";
import { enqueue, flush, getPendingCount } from "@/lib/db/sync";

// Supabase 클라이언트 모킹
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => ({
      insert: (payload: unknown) => {
        mockInsert(table, payload);
        return { error: null };
      },
      update: (data: unknown) => {
        mockUpdate(table, data);
        return {
          eq: (col: string, val: string) => {
            mockEq(col, val);
            return { error: null };
          },
        };
      },
      delete: () => ({
        eq: (col: string, val: string) => {
          mockDelete(table, col, val);
          return { error: null };
        },
      }),
    }),
  }),
}));

beforeEach(async () => {
  await db.sync_queue.clear();
  vi.clearAllMocks();
});

describe("sync module", () => {
  describe("enqueue", () => {
    it("sync queue에 항목을 추가한다", async () => {
      await enqueue({
        table: "habits",
        operation: "INSERT",
        payload: { id: "1", title: "테스트" },
      });

      const items = await db.sync_queue.toArray();
      expect(items).toHaveLength(1);
      expect(items[0].retries).toBe(0);
      expect(items[0].created_at).toBeGreaterThan(0);
    });
  });

  describe("flush", () => {
    it("INSERT 항목을 처리하고 큐에서 제거한다", async () => {
      await enqueue({
        table: "habits",
        operation: "INSERT",
        payload: { id: "1", title: "테스트" },
      });

      await flush();

      expect(mockInsert).toHaveBeenCalledWith("habits", {
        id: "1",
        title: "테스트",
      });
      expect(await getPendingCount()).toBe(0);
    });

    it("UPDATE 항목을 처리한다", async () => {
      await enqueue({
        table: "habits",
        operation: "UPDATE",
        payload: { id: "1", title: "수정됨" },
      });

      await flush();

      expect(mockUpdate).toHaveBeenCalledWith("habits", { title: "수정됨" });
      expect(mockEq).toHaveBeenCalledWith("id", "1");
    });

    it("DELETE 항목을 처리한다", async () => {
      await enqueue({
        table: "habits",
        operation: "DELETE",
        payload: { id: "1" },
      });

      await flush();

      expect(mockDelete).toHaveBeenCalledWith("habits", "id", "1");
    });

    it("큐가 비어있으면 아무 작업도 하지 않는다", async () => {
      await flush();

      expect(mockInsert).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it("여러 항목을 순서대로 처리한다", async () => {
      await enqueue({
        table: "habits",
        operation: "INSERT",
        payload: { id: "1" },
      });
      await enqueue({
        table: "habits",
        operation: "UPDATE",
        payload: { id: "1", title: "수정" },
      });
      await enqueue({
        table: "habits",
        operation: "DELETE",
        payload: { id: "1" },
      });

      await flush();

      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockDelete).toHaveBeenCalledTimes(1);
      expect(await getPendingCount()).toBe(0);
    });
  });

  describe("getPendingCount", () => {
    it("대기 중인 항목 수를 반환한다", async () => {
      expect(await getPendingCount()).toBe(0);

      await enqueue({
        table: "habits",
        operation: "INSERT",
        payload: { id: "1" },
      });
      await enqueue({
        table: "habits",
        operation: "INSERT",
        payload: { id: "2" },
      });

      expect(await getPendingCount()).toBe(2);
    });
  });
});
