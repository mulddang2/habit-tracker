"use client";

import { useMutation } from "@tanstack/react-query";
import type { CoachResponse } from "@/lib/ai/schema";
import { useCoachStore } from "@/stores/useCoachStore";

async function requestCoachSuggestion(): Promise<CoachResponse> {
  const res = await fetch("/api/coach", { method: "POST" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.status === 429) {
      throw new Error("요청이 너무 많습니다. 1~2분 후 다시 시도해주세요.");
    }
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
