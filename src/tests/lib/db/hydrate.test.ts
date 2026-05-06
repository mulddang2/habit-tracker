import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db/local";
import { hydrateLocalDb } from "@/lib/db/hydrate";
import type { Habit, HabitLog } from "@/types/habit";

const mockGetUser = vi.fn();

type SupabaseResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

let habitsResponse: SupabaseResult<Habit> = { data: [], error: null };
let logsResponse: SupabaseResult<HabitLog> = { data: [], error: null };

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (table: string) => ({
      select: () => {
        if (table === "habits") {
          return {
            order: () => habitsResponse,
          };
        }
        return logsResponse;
      },
    }),
  }),
}));

const sampleHabit = (overrides: Partial<Habit> = {}): Habit => ({
  id: "h1",
  user_id: "user-1",
  title: "운동",
  category: "건강",
  reminder_time: null,
  order: 1,
  created_at: "2026-04-01",
  updated_at: "2026-04-01",
  ...overrides,
});

const sampleLog = (overrides: Partial<HabitLog> = {}): HabitLog => ({
  id: "l1",
  habit_id: "h1",
  completed_at: "2026-04-16",
  ...overrides,
});

beforeEach(async () => {
  await db.habits.clear();
  await db.habit_logs.clear();
  await db.sync_queue.clear();
  vi.clearAllMocks();
  habitsResponse = { data: [], error: null };
  logsResponse = { data: [], error: null };
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

describe("hydrateLocalDb", () => {
  it("인증된 사용자의 데이터를 서버에서 로컬 DB로 가져온다", async () => {
    habitsResponse = { data: [sampleHabit()], error: null };
    logsResponse = { data: [sampleLog()], error: null };

    await hydrateLocalDb();

    const habits = await db.habits.toArray();
    expect(habits).toHaveLength(1);
    expect(habits[0].title).toBe("운동");

    const logs = await db.habit_logs.toArray();
    expect(logs).toHaveLength(1);
    expect(logs[0].habit_id).toBe("h1");
  });

  it("미인증 상태에서는 데이터를 가져오지 않는다", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    habitsResponse = { data: [sampleHabit()], error: null };

    await hydrateLocalDb();

    const habits = await db.habits.toArray();
    expect(habits).toHaveLength(0);
  });

  it("기존 로컬 데이터를 서버 데이터로 덮어쓴다", async () => {
    await db.habits.add(sampleHabit({ title: "오래된 제목" }));
    habitsResponse = { data: [sampleHabit({ title: "운동" })], error: null };

    await hydrateLocalDb();

    const habits = await db.habits.toArray();
    expect(habits).toHaveLength(1);
    expect(habits[0].title).toBe("운동");
  });

  it("서버에 없는 로컬 habit을 삭제한다 (mirror)", async () => {
    await db.habits.add(sampleHabit({ id: "h-deleted", title: "삭제됨" }));
    await db.habits.add(sampleHabit({ id: "h-keep", title: "유지" }));
    habitsResponse = {
      data: [sampleHabit({ id: "h-keep", title: "유지" })],
      error: null,
    };

    await hydrateLocalDb();

    const habits = await db.habits.toArray();
    expect(habits.map((h) => h.id)).toEqual(["h-keep"]);
  });

  it("서버에 없는 로컬 habit_log을 삭제한다 (mirror)", async () => {
    await db.habit_logs.add(sampleLog({ id: "l-gone" }));
    await db.habit_logs.add(sampleLog({ id: "l-keep" }));
    logsResponse = { data: [sampleLog({ id: "l-keep" })], error: null };

    await hydrateLocalDb();

    const logs = await db.habit_logs.toArray();
    expect(logs.map((l) => l.id)).toEqual(["l-keep"]);
  });

  it("서버 응답이 빈 배열이면 로컬을 비운다", async () => {
    await db.habits.add(sampleHabit({ id: "h1" }));
    await db.habits.add(sampleHabit({ id: "h2" }));
    habitsResponse = { data: [], error: null };

    await hydrateLocalDb();

    const habits = await db.habits.toArray();
    expect(habits).toHaveLength(0);
  });

  it("sync_queue에 미flush INSERT가 있는 habit은 삭제하지 않는다", async () => {
    // 오프라인에서 만든 신규 habit — 서버는 아직 모름
    await db.habits.add(
      sampleHabit({ id: "h-offline", title: "오프라인 신규" })
    );
    await db.sync_queue.add({
      table: "habits",
      operation: "INSERT",
      payload: { id: "h-offline", title: "오프라인 신규" },
      created_at: Date.now(),
      retries: 0,
    });
    habitsResponse = { data: [], error: null };

    await hydrateLocalDb();

    const habits = await db.habits.toArray();
    expect(habits.map((h) => h.id)).toEqual(["h-offline"]);
  });

  it("sync_queue에 미flush INSERT가 있는 habit_log은 삭제하지 않는다", async () => {
    await db.habit_logs.add(sampleLog({ id: "l-offline" }));
    await db.sync_queue.add({
      table: "habit_logs",
      operation: "INSERT",
      payload: { id: "l-offline" },
      created_at: Date.now(),
      retries: 0,
    });
    logsResponse = { data: [], error: null };

    await hydrateLocalDb();

    const logs = await db.habit_logs.toArray();
    expect(logs.map((l) => l.id)).toEqual(["l-offline"]);
  });

  it("서버 응답이 에러면 로컬을 건드리지 않는다", async () => {
    await db.habits.add(sampleHabit({ id: "h-local" }));
    habitsResponse = { data: null, error: { message: "network down" } };

    await hydrateLocalDb();

    const habits = await db.habits.toArray();
    expect(habits.map((h) => h.id)).toEqual(["h-local"]);
  });
});
