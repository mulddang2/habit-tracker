import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/local";
import { clearLocalUserData } from "@/lib/db/clearLocalData";
import { useCoachStore } from "@/stores/useCoachStore";

beforeEach(async () => {
  await db.habits.clear();
  await db.habit_logs.clear();
  await db.sync_queue.clear();
  useCoachStore.getState().reset();
});

describe("clearLocalUserData", () => {
  it("habits, habit_logs, sync_queue 모든 테이블을 비운다", async () => {
    await db.habits.add({
      id: "h1",
      user_id: "user-A",
      title: "운동",
      category: "운동",
      reminder_time: null,
      order: 1,
      created_at: "2026-05-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
    });
    await db.habit_logs.add({
      id: "l1",
      habit_id: "h1",
      completed_at: "2026-05-01",
    });
    await db.sync_queue.add({
      table: "habits",
      operation: "INSERT",
      payload: { id: "h1" },
      created_at: Date.now(),
      retries: 0,
    });

    await clearLocalUserData();

    expect(await db.habits.count()).toBe(0);
    expect(await db.habit_logs.count()).toBe(0);
    expect(await db.sync_queue.count()).toBe(0);
  });

  it("coach-store 쿨다운 상태를 초기화한다 — 다음 사용자가 인계받지 않도록", async () => {
    useCoachStore.getState().markShown();
    expect(useCoachStore.getState().isOnCooldown()).toBe(true);

    await clearLocalUserData();

    expect(useCoachStore.getState().isOnCooldown()).toBe(false);
    expect(useCoachStore.getState().lastShownAt).toBeNull();
    expect(useCoachStore.getState().dismissedAt).toBeNull();
  });

  it("이미 비어 있어도 안전하게 동작한다", async () => {
    await expect(clearLocalUserData()).resolves.toBeUndefined();
  });
});
