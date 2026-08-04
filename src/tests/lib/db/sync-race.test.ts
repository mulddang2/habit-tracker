import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db/local";
import { pullFromServer } from "@/lib/db/pull";
import { pushToServer, getPendingCount, MAX_SYNC_RETRIES } from "@/lib/db/sync";
import * as habitRepository from "@/lib/db/repositories/habitRepository";
import type { Habit } from "@/types/habit";

/**
 * 경합(race) 테스트용 게이트.
 *
 * 타이밍이나 마이크로태스크 개수에 기대지 않는다.
 * - `arrival` : 코드가 이 비동기 지점에 *도달*하면 resolve → 응답 대기 중임을 확신하고 개입한다.
 * - `open()`  : 테스트가 원하는 시점에 응답을 흘려보낸다.
 */
function makeGate<T>(value: T) {
  let open!: () => void;
  let arrive!: () => void;
  const opened = new Promise<void>((r) => (open = r));
  const arrival = new Promise<void>((r) => (arrive = r));
  return {
    arrival,
    open,
    call: () => {
      arrive();
      return opened.then(() => value);
    },
  };
}

const mockGetUser = vi.fn();
const mockDelete = vi.fn();

type Res<T> = { data: T[] | null; error: null };
let habitsFetch: () => Res<Habit> | Promise<Res<Habit>>;

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: () => mockGetUser() },
    from: (table: string) => ({
      select: () => {
        if (table === "habits") return { order: () => habitsFetch() };
        return { data: [], error: null };
      },
      insert: () => ({ error: null }),
      update: () => ({ eq: () => ({ error: null }) }),
      delete: () => ({
        eq: (col: string, val: string) => mockDelete(table, col, val),
      }),
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

beforeEach(async () => {
  await db.habits.clear();
  await db.habit_logs.clear();
  await db.sync_queue.clear();
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  mockDelete.mockReturnValue({ error: null });
  habitsFetch = () => ({ data: [], error: null });
  // 큐 적재 시 자동 전송이 테스트를 방해하지 않도록 오프라인으로 고정
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: false,
  });
});

describe("pull/push 경합", () => {
  it("서버 응답을 기다리는 동안 들어온 DELETE를 부활시키지 않는다", async () => {
    await db.habits.add(sampleHabit());

    // 서버는 아직 h1을 보유한 상태의 응답을 들고 대기한다
    const gate = makeGate<Res<Habit>>({ data: [sampleHabit()], error: null });
    habitsFetch = gate.call;

    // pull 시작 → 보호 대상 판별은 이 시점의 큐(비어 있음)로 이뤄진다
    const hydrating = pullFromServer();
    await gate.arrival; // 서버 조회에 진입한 것을 확정 — 타이밍 추측 없음

    // 응답 대기 중에 사용자가 삭제 (로컬 삭제 + DELETE 적재)
    await habitRepository.remove("h1");
    expect(await db.habits.get("h1")).toBeUndefined();

    gate.open();
    await hydrating;

    expect(await db.habits.get("h1")).toBeUndefined();
  });

  it("연달아 호출된 pull은 한 번만 조회하고, 그 사이 삭제를 되살리지 않는다", async () => {
    await db.habits.add(sampleHabit());

    const gate = makeGate<Res<Habit>>({ data: [sampleHabit()], error: null });
    let fetchCount = 0;
    habitsFetch = () => {
      fetchCount++;
      return gate.call();
    };

    // 탭 복귀 시 visibilitychange와 focus가 둘 다 발화하는 상황
    const a = pullFromServer();
    const b = pullFromServer();
    await gate.arrival;

    await habitRepository.remove("h1");

    gate.open();
    await Promise.all([a, b]);

    expect(fetchCount).toBe(1); // 두 호출이 하나로 합쳐졌다
    expect(await db.habits.get("h1")).toBeUndefined();
  });

  // 시나리오 기록용 — 회귀 방지는 아래 "push가 진행 중이면..." 테스트가 담당한다.
  // 이 방향(조회 중 push 시작)을 확실히 재현하려면 조회 응답을 열기 전에 push를
  // 끝까지 기다려야 하는데, 순서를 세워둔 지금은 그 조합이 구조적으로 불가능하다
  // (= 잠금이 작동한다는 뜻). 그래서 결과만 확인한다.
  it("서버 조회 중에 push가 시작돼도 삭제가 살아 돌아오지 않는다", async () => {
    await db.habits.add(sampleHabit());
    await habitRepository.remove("h1"); // 로컬 삭제 + DELETE 적재
    expect(await getPendingCount()).toBe(1);

    // 서버가 아직 h1을 가지고 있던 시점의 응답을 들고 대기
    const gate = makeGate<Res<Habit>>({ data: [sampleHabit()], error: null });
    habitsFetch = gate.call;

    const hydrating = pullFromServer();
    await gate.arrival;

    const pushing = pushToServer();

    gate.open();
    await Promise.all([hydrating, pushing]);

    expect(await db.habits.get("h1")).toBeUndefined();
    expect(await getPendingCount()).toBe(0);
    expect(mockDelete).toHaveBeenCalledWith("habits", "id", "h1");
  });

  // 회귀 방지 본체 — 순서를 세우지 않으면 이 테스트가 깨진다.
  it("push가 진행 중이면 pull은 전송이 끝난 뒤에 서버를 조회한다", async () => {
    await db.habits.add(sampleHabit());
    await habitRepository.remove("h1");

    const serverDelete = makeGate({ error: null });
    mockDelete.mockImplementation(() => serverDelete.call());

    // 조회 시점에 큐가 비어 있어야 한다 = 전송이 이미 끝났다는 뜻
    let pendingAtFetch = -1;
    habitsFetch = async () => {
      pendingAtFetch = await getPendingCount();
      return { data: [], error: null };
    };

    const pushing = pushToServer();
    await serverDelete.arrival;

    const hydrating = pullFromServer();
    serverDelete.open();
    await Promise.all([pushing, hydrating]);

    expect(pendingAtFetch).toBe(0);
    expect(await db.habits.get("h1")).toBeUndefined();
  });
});

describe("sync_queue 재시도 소진", () => {
  // 현재 설계의 트레이드오프를 명시적으로 고정한다.
  // 재시도 한도는 큐 맨 앞이 막혀 뒤가 못 나가는 상태를 푸는 대신, 서버 삭제가 끝내 실패한
  // 경우 로컬을 서버 진실로 되돌린다(= 사용자의 삭제가 조용히 취소됨).
  // 사용자에게 알리는 방법은 미결 — 현재는 console.error 뿐이다.
  it("영구 실패한 DELETE는 폐기 후 로컬이 서버 진실로 수렴한다", async () => {
    await db.habits.add(sampleHabit());
    // RLS 위반처럼 계속 실패하는 DELETE
    mockDelete.mockReturnValue({
      error: { message: "RLS 위반", code: "42501" },
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await habitRepository.remove("h1");
    for (let i = 0; i < MAX_SYNC_RETRIES; i++) await pushToServer();

    // 한도 도달 → 큐에서 폐기됨 (뒤에 밀린 항목이 다시 나갈 수 있게 됨)
    expect(await getPendingCount()).toBe(0);
    expect(console.error).toHaveBeenCalled();

    // 서버는 여전히 h1을 보유 중 → 미러가 되살린다
    habitsFetch = () => ({ data: [sampleHabit()], error: null });
    await pullFromServer();

    expect(await db.habits.get("h1")).toBeDefined();
  });

  it("동시에 부른 push가 같은 큐 항목을 두 번 전송하지 않는다", async () => {
    await habitRepository.remove("h1");

    const gate = makeGate({ error: null });
    mockDelete.mockImplementation(() => gate.call());

    const a = pushToServer();
    const b = pushToServer();
    await gate.arrival;
    gate.open();
    await Promise.all([a, b]);

    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});
