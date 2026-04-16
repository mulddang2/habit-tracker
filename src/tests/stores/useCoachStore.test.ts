import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useCoachStore, COACH_COOLDOWN_MS } from "@/stores/useCoachStore";

describe("useCoachStore", () => {
  beforeEach(() => {
    useCoachStore.getState().reset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with no cooldown", () => {
    expect(useCoachStore.getState().isOnCooldown()).toBe(false);
  });

  it("enters cooldown after markShown", () => {
    useCoachStore.getState().markShown();
    expect(useCoachStore.getState().isOnCooldown()).toBe(true);
  });

  it("exits cooldown after 7 days", () => {
    useCoachStore.getState().markShown();
    vi.advanceTimersByTime(COACH_COOLDOWN_MS + 1);
    expect(useCoachStore.getState().isOnCooldown()).toBe(false);
  });

  it("reset clears state", () => {
    useCoachStore.getState().markShown();
    useCoachStore.getState().reset();
    expect(useCoachStore.getState().isOnCooldown()).toBe(false);
    expect(useCoachStore.getState().lastShownAt).toBeNull();
  });
});
