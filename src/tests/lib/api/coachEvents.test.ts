import { describe, it, expect } from "vitest";
import { computeCoachStats, computeAcceptImpact } from "@/lib/api/coachEvents";
import type { CoachEvent } from "@/types/coach";
import type { HabitLog } from "@/types/habit";

const makeSuggestion = (targetHabitId = "habit-1") => ({
  targetHabitId,
  action: "encourage",
  suggestion: "테스트 제안",
  reason: "테스트 근거",
});

const makeEvent = (
  action: CoachEvent["action"],
  version = "v1",
  createdAt = new Date().toISOString(),
  targetHabitId = "habit-1"
): CoachEvent => ({
  id: crypto.randomUUID(),
  user_id: "user-1",
  prompt_version: version,
  suggestion: makeSuggestion(targetHabitId),
  action,
  created_at: createdAt,
});

describe("computeCoachStats", () => {
  it("이벤트가 없으면 모두 0", () => {
    const stats = computeCoachStats([]);
    expect(stats.total).toBe(0);
    expect(stats.acceptRate).toBe(0);
    expect(stats.byVersion).toHaveLength(0);
  });

  it("수락/거부/무시 카운트가 정확함", () => {
    const events = [
      makeEvent("accepted"),
      makeEvent("accepted"),
      makeEvent("dismissed"),
      makeEvent("ignored"),
    ];
    const stats = computeCoachStats(events);
    expect(stats.total).toBe(4);
    expect(stats.accepted).toBe(2);
    expect(stats.dismissed).toBe(1);
    expect(stats.ignored).toBe(1);
    expect(stats.acceptRate).toBe(50);
  });

  it("프롬프트 버전별 통계가 정확함", () => {
    const events = [
      makeEvent("accepted", "v1"),
      makeEvent("dismissed", "v1"),
      makeEvent("accepted", "v2"),
      makeEvent("accepted", "v2"),
      makeEvent("dismissed", "v2"),
    ];
    const stats = computeCoachStats(events);
    expect(stats.byVersion).toHaveLength(2);

    const v1 = stats.byVersion.find((v) => v.promptVersion === "v1")!;
    expect(v1.total).toBe(2);
    expect(v1.accepted).toBe(1);
    expect(v1.acceptRate).toBe(50);

    const v2 = stats.byVersion.find((v) => v.promptVersion === "v2")!;
    expect(v2.total).toBe(3);
    expect(v2.accepted).toBe(2);
    expect(v2.acceptRate).toBe(67);
  });
});

describe("computeAcceptImpact", () => {
  const NOW = new Date("2026-05-04T12:00:00Z");
  const DAY = 24 * 60 * 60 * 1000;

  const dayBeforeNow = (n: number) =>
    new Date(NOW.getTime() - n * DAY).toISOString().slice(0, 10);

  const log = (habitId: string, isoDate: string): HabitLog => ({
    id: crypto.randomUUID(),
    habit_id: habitId,
    completed_at: isoDate,
  });

  it("수락 이벤트가 없으면 null", () => {
    const events = [makeEvent("dismissed"), makeEvent("ignored")];
    expect(computeAcceptImpact(events, [], NOW)).toBeNull();
  });

  it("7일 미만 경과한 수락 이벤트는 표본에서 제외", () => {
    const events = [
      makeEvent("accepted", "v1", dayBeforeNow(3) + "T12:00:00Z", "habit-1"),
    ];
    expect(computeAcceptImpact(events, [], NOW)).toBeNull();
  });

  it("수락 후 완료율이 오르면 양의 delta", () => {
    // t = NOW - 10일. before window = NOW-17 ~ NOW-11, after window = NOW-10 ~ NOW-4.
    const t = new Date(NOW.getTime() - 10 * DAY);
    const events = [makeEvent("accepted", "v1", t.toISOString(), "habit-1")];

    const tDate = t.toISOString().slice(0, 10);
    const tDay = (offset: number) =>
      new Date(t.getTime() + offset * DAY).toISOString().slice(0, 10);

    // before: 7일 중 1일 완료 (≈14%)
    // after:  7일 중 5일 완료 (≈71%)
    const logs: HabitLog[] = [
      log("habit-1", tDay(-3)), // before
      log("habit-1", tDate), // after day 0
      log("habit-1", tDay(1)),
      log("habit-1", tDay(2)),
      log("habit-1", tDay(4)),
      log("habit-1", tDay(6)),
    ];

    const impact = computeAcceptImpact(events, logs, NOW);
    expect(impact).not.toBeNull();
    expect(impact!.sampleSize).toBe(1);
    expect(impact!.beforeRate).toBe(14);
    expect(impact!.afterRate).toBe(71);
    expect(impact!.delta).toBe(57);
  });

  it("targetHabitId가 없는 suggestion은 무시", () => {
    const broken: CoachEvent = {
      ...makeEvent(
        "accepted",
        "v1",
        new Date(NOW.getTime() - 10 * DAY).toISOString()
      ),
      suggestion: { ...makeSuggestion(), targetHabitId: "" },
    };
    expect(computeAcceptImpact([broken], [], NOW)).toBeNull();
  });

  it("여러 이벤트는 평균을 낸다", () => {
    const t1 = new Date(NOW.getTime() - 10 * DAY);
    const t2 = new Date(NOW.getTime() - 12 * DAY);
    const events = [
      makeEvent("accepted", "v1", t1.toISOString(), "habit-1"),
      makeEvent("accepted", "v1", t2.toISOString(), "habit-2"),
    ];

    const dayOf = (base: Date, offset: number) =>
      new Date(base.getTime() + offset * DAY).toISOString().slice(0, 10);

    // habit-1: before 0/7 (0%), after 7/7 (100%) → delta +100
    // habit-2: before 7/7 (100%), after 0/7 (0%) → delta -100
    // 평균: before 50, after 50, delta 0
    const logs: HabitLog[] = [
      // habit-1 after window
      log("habit-1", dayOf(t1, 0)),
      log("habit-1", dayOf(t1, 1)),
      log("habit-1", dayOf(t1, 2)),
      log("habit-1", dayOf(t1, 3)),
      log("habit-1", dayOf(t1, 4)),
      log("habit-1", dayOf(t1, 5)),
      log("habit-1", dayOf(t1, 6)),
      // habit-2 before window
      log("habit-2", dayOf(t2, -1)),
      log("habit-2", dayOf(t2, -2)),
      log("habit-2", dayOf(t2, -3)),
      log("habit-2", dayOf(t2, -4)),
      log("habit-2", dayOf(t2, -5)),
      log("habit-2", dayOf(t2, -6)),
      log("habit-2", dayOf(t2, -7)),
    ];

    const impact = computeAcceptImpact(events, logs, NOW);
    expect(impact!.sampleSize).toBe(2);
    expect(impact!.beforeRate).toBe(50);
    expect(impact!.afterRate).toBe(50);
    expect(impact!.delta).toBe(0);
  });
});
