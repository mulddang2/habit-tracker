"use client";

import { useMutation } from "@tanstack/react-query";
import type { CoachResponse } from "@/lib/ai/schema";
import { useCoachStore } from "@/stores/useCoachStore";

async function requestCoachSuggestion(): Promise<CoachResponse> {
  const res = await fetch("/api/coach", { method: "POST" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "코치 제안 요청에 실패했습니다.");
  }
  return (await res.json()) as CoachResponse;
}

export function useCoachSuggestion() {
  const markShown = useCoachStore((s) => s.markShown);

  return useMutation({
    mutationFn: requestCoachSuggestion,
    onSuccess: () => {
      markShown();
    },
  });
}
