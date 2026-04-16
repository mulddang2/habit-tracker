import { create } from "zustand";
import { persist } from "zustand/middleware";

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

interface CoachState {
  lastShownAt: number | null;
  dismissedAt: number | null;
  markShown: () => void;
  markDismissed: () => void;
  reset: () => void;
  isOnCooldown: () => boolean;
}

export const useCoachStore = create<CoachState>()(
  persist(
    (set, get) => ({
      lastShownAt: null,
      dismissedAt: null,
      markShown: () => set({ lastShownAt: Date.now() }),
      markDismissed: () => set({ dismissedAt: Date.now() }),
      reset: () => set({ lastShownAt: null, dismissedAt: null }),
      isOnCooldown: () => {
        const { lastShownAt } = get();
        if (!lastShownAt) return false;
        return Date.now() - lastShownAt < COOLDOWN_MS;
      },
    }),
    { name: "coach-store" }
  )
);

export const COACH_COOLDOWN_MS = COOLDOWN_MS;
