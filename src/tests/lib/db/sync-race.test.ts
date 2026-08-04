import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db/local";
import { pullFromServer } from "@/lib/db/pull";
import { pushToServer, getPendingCount, MAX_SYNC_RETRIES } from "@/lib/db/sync";
import * as habitRepository from "@/lib/db/repositories/habitRepository";
import { makeGate } from "@/tests/helpers/gate";
import type { Habit } from "@/types/habit";

const mockGetUser = vi.fn();
// 삭제는 이제 deleted_at을 채우는 UPDATE다 (tombstone.ts 참고).
const mockUpdate = vi.fn();

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
      update: (data: Record<string, unknown>) => ({
        eq: (col: string, val: string) => mockUpdate(table, data, val),
      }),
      delete: () => ({ eq: () => ({ error: null }) }),
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
  deleted_at: null,
  ...overrides,
});

/**
 * 화면에 보이는지로 확인한다.
 * 삭제해도 행 자체는 삭제 표시를 달고 남으므로 `db.habits.get`으로는 판단할 수 없다.
 */
async function isVisible(id: string): Promise<boolean> {
  const habits = await habitRepository.fetchAll();
  return habits.some((h) => h.id === id);
}

beforeEach(async () => {
  await db.habits.clear();
  await db.habit_logs.clear();
  await db.sync_queue.clear();
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  mockUpdate.mockReturnValue({ error: null });
  habitsFetch = () => ({ data: [], error: null });
  // 큐 적재 시 자동 전송이 테스트를 방해하지 않도록 오프라인으로 고정
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: false,
  });
});

describe("pull/push 경합", () => {
  it("서버 응답을 기다리는 동안 들어온 삭제를 부활시키지 않는다", async () => {
    await db.habits.add(sampleHabit());

    // 서버는 아직 h1이 살아 있던 시점의 응답을 들고 대기한다
    const gate = makeGate<Res<Habit>>({ data: [sampleHabit()], error: null });
    habitsFetch = gate.call;

    // pull 시작 → 보호 대상 판별은 이 시점의 큐(비어 있음)로 이뤄진다
    const hydrating = pullFromServer();
    await gate.arrival; // 서버 조회에 진입한 것을 확정 — 타이밍 추측 없음

    // 응답 대기 중에 사용자가 삭제
    await habitRepository.remove("h1");
    expect(await isVisible("h1")).toBe(false);

    gate.open();
    await hydrating;

    expect(await isVisible("h1")).toBe(false);
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
    expect(await isVisible("h1")).toBe(false);
  });

  // 시나리오 기록용 — 회귀 방지는 아래 "push가 진행 중이면..." 테스트가 담당한다.
  // 이 방향(조회 중 push 시작)을 확실히 재현하려면 조회 응답을 열기 전에 push를
  // 끝까지 기다려야 하는데, 순서를 세워둔 지금은 그 조합이 구조적으로 불가능하다
  // (= 잠금이 작동한다는 뜻). 그래서 결과만 확인한다.
  it("서버 조회 중에 push가 시작돼도 삭제가 살아 돌아오지 않는다", async () => {
    await db.habits.add(sampleHabit());
    await habitRepository.remove("h1");
    expect(await getPendingCount()).toBe(1);

    // 서버가 아직 h1을 살아 있는 것으로 알던 시점의 응답을 들고 대기
    const gate = makeGate<Res<Habit>>({ data: [sampleHabit()], error: null });
    habitsFetch = gate.call;

    const hydrating = pullFromServer();
    await gate.arrival;

    const pushing = pushToServer();

    gate.open();
    await Promise.all([hydrating, pushing]);

    expect(await isVisible("h1")).toBe(false);
    expect(await getPendingCount()).toBe(0);
    expect(mockUpdate).toHaveBeenCalledWith(
      "habits",
      expect.objectContaining({ deleted_at: expect.any(String) }),
      "h1"
    );
  });

  // 회귀 방지 본체 — 순서를 세우지 않으면 이 테스트가 깨진다.
  it("push가 진행 중이면 pull은 전송이 끝난 뒤에 서버를 조회한다", async () => {
    await db.habits.add(sampleHabit());
    await habitRepository.remove("h1");

    const serverWrite = makeGate({ error: null });
    mockUpdate.mockImplementation(() => serverWrite.call());

    // 조회 시점에 큐가 비어 있어야 한다 = 전송이 이미 끝났다는 뜻
    let pendingAtFetch = -1;
    habitsFetch = async () => {
      pendingAtFetch = await getPendingCount();
      return { data: [], error: null };
    };

    const pushing = pushToServer();
    await serverWrite.arrival;

    const hydrating = pullFromServer();
    serverWrite.open();
    await Promise.all([pushing, hydrating]);

    expect(pendingAtFetch).toBe(0);
    expect(await isVisible("h1")).toBe(false);
  });
});

describe("sync_queue 재시도 소진", () => {
  // 현재 설계의 트레이드오프를 명시적으로 고정한다.
  // 재시도 한도는 큐 맨 앞이 막혀 뒤가 못 나가는 상태를 푸는 대신, 전송이 끝내
  // 실패한 변경을 조용히 버린다. 사용자에게 알리는 방법은 미결 — 현재는
  // console.error 뿐이다.
  it("영구 실패한 삭제는 큐에서 폐기된다", async () => {
    await db.habits.add(sampleHabit());
    // RLS 위반처럼 계속 실패하는 전송
    mockUpdate.mockReturnValue({
      error: { message: "RLS 위반", code: "42501" },
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await habitRepository.remove("h1");
    for (let i = 0; i < MAX_SYNC_RETRIES; i++) await pushToServer();

    // 한도 도달 → 큐에서 폐기됨 (뒤에 밀린 항목이 다시 나갈 수 있게 됨)
    expect(await getPendingCount()).toBe(0);
    expect(console.error).toHaveBeenCalled();
  });

  // 삭제 표시 도입으로 달라진 부분. 예전에는 폐기된 삭제를 서버 스냅샷이
  // 되돌려놓았다(= 사용자의 삭제가 조용히 취소됨). 이제는 로컬 삭제 표시가
  // 서버 행보다 최신이라 되살아나지 않는다 — 대신 전송이 끝내 실패한 삭제는
  // 이 기기에만 반영된 채 서버·다른 기기와 어긋난 상태로 남는다.
  it("폐기된 삭제를 서버 스냅샷이 되돌리지 않는다", async () => {
    await db.habits.add(sampleHabit());
    mockUpdate.mockReturnValue({
      error: { message: "RLS 위반", code: "42501" },
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await habitRepository.remove("h1");
    for (let i = 0; i < MAX_SYNC_RETRIES; i++) await pushToServer();

    // 서버는 여전히 h1을 살아 있는 것으로 알고 있다
    habitsFetch = () => ({ data: [sampleHabit()], error: null });
    await pullFromServer();

    expect(await isVisible("h1")).toBe(false);
  });

  it("동시에 부른 push가 같은 큐 항목을 두 번 전송하지 않는다", async () => {
    await habitRepository.remove("h1");

    const gate = makeGate({ error: null });
    mockUpdate.mockImplementation(() => gate.call());

    const a = pushToServer();
    const b = pushToServer();
    await gate.arrival;
    gate.open();
    await Promise.all([a, b]);

    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});
