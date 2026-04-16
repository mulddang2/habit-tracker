"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCoachStats } from "@/lib/api/coachEvents";

export const coachStatsKeys = {
  all: ["coachStats"] as const,
};

export function useCoachStats() {
  return useQuery({
    queryKey: coachStatsKeys.all,
    queryFn: fetchCoachStats,
    staleTime: 5 * 60 * 1000,
  });
}
