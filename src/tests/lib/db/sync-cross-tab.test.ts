import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeGate } from "@/tests/helpers/gate";
import type { Habit } from "@/types/habit";

/**
 * 탭 두 개를 흉내내는 테스트.
 *
 * 브라우저에서 같은 앱을 두 탭에 열면:
 * - IndexedDB(습관·로그·sync_queue)는 **공유**된다
 * - 자바스크립트 모듈 변수는 탭마다 **따로** 생긴다 → syncLock의 `tail`도 따로
 *
 * 그래서 `vi.resetModules()`로 모듈을 두 번 읽어들이면 같은 조건이 만들어진다.
 * Dexie 인스턴스는 새로 생기지만 데이터베이스 이름이 같아 저장소는 공유되고,
 * 잠금 변수만 독립된다. 아래 첫 두 테스트가 이 전제를 직접 확인한다.
 *
 * 이 파일은 `@/lib/db/*`를 정적 import 하지 않는다. 정적으로 가져오면
 * resetModules 이후의 탭 인스턴스와 다른 객체를 붙잡게 되어 테스트가 거짓말을 한다.
 */

const mockGetUser = vi.fn();
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
      // 삭제는 이제 deleted_at을 채우는 UPDATE다 (tombstone.ts 참고)
      update: (data: Record<string, unknown>) => ({
        eq: (col: string, val: string) => mockUpdate(table, data, val),
      }),
      delete: () => ({ eq: () => ({ error: null }) }),
    }),
  }),
}));

/** 탭 하나 = 모듈 인스턴스 한 벌. */
async function openTab() {
  vi.resetModules();
  const { db } = await import("@/lib/db/local");
  const { pullFromServer } = await import("@/lib/db/pull");
  const { pushToServer, getPendingCount } = await import("@/lib/db/sync");
  const habitRepository = await import("@/lib/db/repositories/habitRepository");
  return { db, pullFromServer, pushToServer, getPendingCount, habitRepository };
}

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
async function isVisible(
  tab: Awaited<ReturnType<typeof openTab>>,
  id: string
): Promise<boolean> {
  const habits = await tab.habitRepository.fetchAll();
  return habits.some((h) => h.id === id);
}

beforeEach(async () => {
  const { db } = await openTab();
  await db.habits.clear();
  await db.habit_logs.clear();
  await db.sync_queue.clear();
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  mockUpdate.mockReturnValue({ error: null });
  habitsFetch = () => ({ data: [], error: null });
  // 큐 적재 시 자동 전송이 테스트를 방해하지 않도록 오프라인으로 고정.
  // pushToServer 자체는 onLine을 보지 않으므로 수동 호출은 그대로 동작한다.
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: false,
  });
});

describe("탭 흉내내기 전제 확인", () => {
  it("두 탭은 같은 IndexedDB를 공유한다", async () => {
    const tabA = await openTab();
    const tabB = await openTab();

    await tabA.db.habits.add(sampleHabit());

    expect(tabA.db).not.toBe(tabB.db); // Dexie 인스턴스는 별개인데
    expect(await tabB.db.habits.get("h1")).toBeDefined(); // 데이터는 보인다
  });

  it("두 탭은 서로 다른 모듈 인스턴스를 가진다", async () => {
    const tabA = await openTab();
    const tabB = await openTab();

    // 함수 객체가 다르다 = syncLock의 tail 변수도 각자 따로 있다는 뜻
    expect(tabA.pullFromServer).not.toBe(tabB.pullFromServer);
  });
});

describe("탭 간 pull/push 경합", () => {
  it("A탭의 삭제 전송이 B탭의 진행 중인 pull을 무방비로 만들지 않는다", async () => {
    const tabA = await openTab();
    const tabB = await openTab();

    await tabA.db.habits.add(sampleHabit());
    // A탭에서 사용자가 삭제 → 삭제 표시 + 큐 적재 (아직 전송 전)
    await tabA.habitRepository.remove("h1");
    expect(await tabA.getPendingCount()).toBe(1);

    // 서버가 아직 h1을 살아 있는 것으로 알던 시점의 응답을 들고 대기
    const gate = makeGate<Res<Habit>>({ data: [sampleHabit()], error: null });
    habitsFetch = gate.call;

    // B탭이 pull 시작 (탭 복귀·포커스 시 일어나는 일)
    const pulling = tabB.pullFromServer();
    await gate.arrival; // B탭이 서버 응답을 기다리는 중임을 확정

    // 그 사이 A탭이 전송을 끝낸다 → 공유 큐가 비워진다.
    // A탭의 잠금과 B탭의 잠금은 별개라 B탭을 기다려주지 않는다.
    // 예전에는 여기서 B탭의 보호 대상이 사라져 h1이 되살아났다.
    await tabA.pushToServer();
    expect(await tabA.getPendingCount()).toBe(0);

    // 이제 B탭에 낡은 응답이 도착한다. 큐는 이미 비었지만, 로컬 삭제 표시가
    // 응답보다 최신이라 덮어쓰이지 않는다.
    gate.open();
    await pulling;

    expect(await isVisible(tabB, "h1")).toBe(false);
  });

  it("서버가 삭제를 확인해준 뒤에도 삭제 상태로 남는다", async () => {
    const tabA = await openTab();
    const tabB = await openTab();

    await tabA.db.habits.add(sampleHabit());
    await tabA.habitRepository.remove("h1");
    await tabA.pushToServer();

    // 서버는 이제 삭제 표시가 붙은 행을 돌려준다. 서버 트리거가 updated_at을
    // 다시 매기므로 로컬보다 최신이고, 따라서 이 응답은 실제로 반영된다.
    habitsFetch = () => ({
      data: [
        sampleHabit({
          updated_at: "2027-01-01",
          deleted_at: "2027-01-01",
        }),
      ],
      error: null,
    });
    await tabB.pullFromServer();

    expect(await isVisible(tabB, "h1")).toBe(false);
    expect(await tabB.getPendingCount()).toBe(0);
  });
});
