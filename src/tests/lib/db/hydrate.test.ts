import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db/local";
import { hydrateLocalDb, isLocalDbEmpty } from "@/lib/db/hydrate";

const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockOrder = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (table: string) => ({
      select: (query: string) => {
        mockSelect(table, query);
        if (table === "habits") {
          return {
            order: (col: string, opts: unknown) => {
              mockOrder(col, opts);
              return {
                data: [
                  {
                    id: "h1",
                    user_id: "user-1",
                    title: "운동",
                    category: "건강",
                    reminder_time: null,
                    order: 1,
                    created_at: "2026-04-01",
                    updated_at: "2026-04-01",
                  },
                ],
              };
            },
          };
        }
        // habit_logs
        return {
          data: [{ id: "l1", habit_id: "h1", completed_at: "2026-04-16" }],
        };
      },
    }),
  }),
}));

beforeEach(async () => {
  await db.habits.clear();
  await db.habit_logs.clear();
  await db.sync_queue.clear();
  vi.clearAllMocks();
});

describe("hydrateLocalDb", () => {
  it("인증된 사용자의 데이터를 서버에서 로컬 DB로 가져온다", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    await hydrateLocalDb();

    const habits = await db.habits.toArray();
    expect(habits).toHaveLength(1);
    expect(habits[0].title).toBe("운동");

    const logs = await db.habit_logs.toArray();
    expect(logs).toHaveLength(1);
    expect(logs[0].habit_id).toBe("h1");
  });

  it("미인증 상태에서는 데이터를 가져오지 않는다", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    });

    await hydrateLocalDb();

    const habits = await db.habits.toArray();
    expect(habits).toHaveLength(0);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("기존 로컬 데이터를 서버 데이터로 덮어쓴다 (bulkPut)", async () => {
    // 로컬에 오래된 데이터가 있는 상태
    await db.habits.add({
      id: "h1",
      user_id: "user-1",
      title: "오래된 제목",
      category: "건강",
      reminder_time: null,
      order: 1,
      created_at: "2026-04-01",
      updated_at: "2026-04-01",
    });

    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    await hydrateLocalDb();

    const habits = await db.habits.toArray();
    expect(habits).toHaveLength(1);
    expect(habits[0].title).toBe("운동"); // 서버 데이터로 갱신됨
  });
});

describe("isLocalDbEmpty", () => {
  it("습관이 없으면 true를 반환한다", async () => {
    const result = await isLocalDbEmpty();
    expect(result).toBe(true);
  });

  it("습관이 있으면 false를 반환한다", async () => {
    await db.habits.add({
      id: "h1",
      user_id: "user-1",
      title: "테스트",
      category: "건강",
      reminder_time: null,
      order: 1,
      created_at: "2026-04-01",
      updated_at: "2026-04-01",
    });

    const result = await isLocalDbEmpty();
    expect(result).toBe(false);
  });
});
