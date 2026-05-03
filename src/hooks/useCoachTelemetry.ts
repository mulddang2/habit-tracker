"use client";

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { enqueue, flush } from "@/lib/db/sync";
import type { CoachAction } from "@/types/coach";
import type { CoachSuggestion } from "@/lib/ai/schema";

export interface CoachTrackParams {
  promptVersion: string;
  suggestion: CoachSuggestion;
  action: CoachAction;
}

export function useCoachTelemetry() {
  const track = useCallback(async (params: CoachTrackParams) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await enqueue({
      table: "coach_events",
      operation: "INSERT",
      payload: {
        user_id: user.id,
        prompt_version: params.promptVersion,
        suggestion: params.suggestion,
        action: params.action,
      },
    });

    if (typeof navigator !== "undefined" && navigator.onLine) {
      flush().catch(() => {});
    }
  }, []);

  return { track };
}
