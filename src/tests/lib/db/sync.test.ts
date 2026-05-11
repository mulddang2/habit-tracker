import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db/local";
import {
  enqueue,
  flush,
  getPendingCount,
  MAX_SYNC_RETRIES,
} from "@/lib/db/sync";

// Supabase 클라이언트 모킹 — 기본은 성공. 실패 시나리오는 테스트별로 mockInsert.mockImplementation 사용.
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => ({
      insert: (payload: unknown) => mockInsert(table, payload),
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
        eq: (col: string, val: string) => mockDelete(table, col, val),
      }),
    }),
  }),
}));

// 기본 성공 응답
beforeEach(() => {
  mockInsert.mockReturnValue({ error: null });
  mockDelete.mockReturnValue({ error: null });
});

beforeEach(async () => {
  await db.sync_queue.clear();
  vi.clearAllMocks();
  // enqueue가 자동 flush를 트리거하지 않도록 오프라인 상태로 둠
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: false,
  });
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

    it("실패 항목의 retries를 증가시키고 뒤 항목 처리를 중단한다 (실제 PostgrestError 형태)", async () => {
      // 실제 Supabase는 PostgrestError(extends Error)를 반환. RLS 위반 시 PGRST301.
      const rlsError = Object.assign(
        new Error("new row violates row-level security policy"),
        { code: "PGRST301", details: "", hint: "", name: "PostgrestError" }
      );
      mockInsert.mockReturnValueOnce({ error: rlsError });

      await enqueue({
        table: "habits",
        operation: "INSERT",
        payload: { id: "fail" },
      });
      await enqueue({
        table: "habits",
        operation: "INSERT",
        payload: { id: "ok" },
      });

      await flush();

      const items = await db.sync_queue.orderBy("id").toArray();
      expect(items).toHaveLength(2);
      expect(items[0].retries).toBe(1);
      expect(items[0].last_error).toContain("row-level security");
      // 뒤 항목은 손대지 않음
      expect(items[1].retries).toBe(0);
    });

    it(`MAX_SYNC_RETRIES(${MAX_SYNC_RETRIES})회 도달 시 항목을 큐에서 제거하고 다음 항목 처리를 계속한다`, async () => {
      // 첫 항목은 영구 실패(PGRST301 RLS), 둘째 항목은 성공
      mockInsert.mockImplementation((table: string, payload: { id: string }) =>
        payload.id === "poison"
          ? {
              error: Object.assign(new Error("RLS denied"), {
                code: "PGRST301",
                details: "",
                hint: "",
                name: "PostgrestError",
              }),
            }
          : { error: null }
      );

      await db.sync_queue.add({
        table: "habits",
        operation: "INSERT",
        payload: { id: "poison" },
        created_at: Date.now(),
        retries: MAX_SYNC_RETRIES - 1, // 한 번 더 실패하면 한도 도달
      });
      await enqueue({
        table: "habits",
        operation: "INSERT",
        payload: { id: "ok" },
      });

      // 콘솔 에러 억제
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await flush();

      // poison-pill 제거됨, ok 항목도 처리되어 큐가 빔
      expect(await getPendingCount()).toBe(0);
      expect(mockInsert).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("retries가 한도 미만이면 그대로 큐에 남는다", async () => {
      const transientError = Object.assign(new Error("일시 실패"), {
        code: "503",
        details: "",
        hint: "",
        name: "PostgrestError",
      });
      mockInsert.mockReturnValue({ error: transientError });

      await enqueue({
        table: "habits",
        operation: "INSERT",
        payload: { id: "1" },
      });

      await flush();
      await flush();
      await flush();

      const items = await db.sync_queue.toArray();
      expect(items).toHaveLength(1);
      expect(items[0].retries).toBe(3);
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
