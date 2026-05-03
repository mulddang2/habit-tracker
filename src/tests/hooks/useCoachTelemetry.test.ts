import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { db } from "@/lib/db/local";
import { useCoachTelemetry } from "@/hooks/useCoachTelemetry";
import type { CoachSuggestion } from "@/lib/ai/schema";

const mockGetUser = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (table: string) => ({
      insert: (payload: unknown) => {
        mockInsert(table, payload);
        return { error: null };
      },
    }),
  }),
}));

const suggestion: CoachSuggestion = {
  targetHabitId: "habit-1",
  action: "encourage",
  suggestion: "테스트",
  reason: "근거",
};

beforeEach(async () => {
  await db.sync_queue.clear();
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: true,
  });
});

describe("useCoachTelemetry", () => {
  it("이벤트를 sync_queue에 enqueue한다", async () => {
    // 적재 검증을 위해 오프라인으로 둔다 (온라인이면 flush가 큐를 비움)
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });
    const { result } = renderHook(() => useCoachTelemetry());

    await act(async () => {
      await result.current.track({
        promptVersion: "v1",
        suggestion,
        action: "accepted",
      });
    });

    const items = await db.sync_queue.toArray();
    expect(items).toHaveLength(1);
    expect(items[0].table).toBe("coach_events");
    expect(items[0].operation).toBe("INSERT");
    expect(items[0].payload).toMatchObject({
      user_id: "user-1",
      prompt_version: "v1",
      action: "accepted",
      suggestion,
    });
  });

  it("미인증 사용자면 enqueue하지 않는다", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { result } = renderHook(() => useCoachTelemetry());

    await act(async () => {
      await result.current.track({
        promptVersion: "v1",
        suggestion,
        action: "ignored",
      });
    });

    expect(await db.sync_queue.count()).toBe(0);
  });

  it("온라인이면 즉시 flush를 시도한다", async () => {
    const { result } = renderHook(() => useCoachTelemetry());

    await act(async () => {
      await result.current.track({
        promptVersion: "v1",
        suggestion,
        action: "dismissed",
      });
    });

    // 비동기 flush는 fire-and-forget — 마이크로태스크 한 바퀴 돌려서 처리 보장
    await new Promise((r) => setTimeout(r, 0));

    expect(mockInsert).toHaveBeenCalledWith(
      "coach_events",
      expect.objectContaining({ action: "dismissed" })
    );
    expect(await db.sync_queue.count()).toBe(0);
  });

  it("오프라인이면 큐에 남겨둔다", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });
    const { result } = renderHook(() => useCoachTelemetry());

    await act(async () => {
      await result.current.track({
        promptVersion: "v1",
        suggestion,
        action: "ignored",
      });
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockInsert).not.toHaveBeenCalled();
    expect(await db.sync_queue.count()).toBe(1);
  });
});
