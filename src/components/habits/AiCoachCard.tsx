"use client";

import { useState } from "react";
import { Sparkles, X, Info, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCoachSuggestion } from "@/hooks/useCoach";
import { useCoachStore } from "@/stores/useCoachStore";
import { useHabitsQuery } from "@/hooks/useHabits";
import { insertCoachEvent } from "@/lib/api/coachEvents";
import { toast } from "sonner";
import type { CoachResponse } from "@/lib/ai/schema";

const ACTION_LABEL: Record<CoachResponse["suggestion"]["action"], string> = {
  reschedule: "시간 조정",
  simplify: "난이도 조정",
  skip: "잠시 쉬기",
  encourage: "격려",
};

export function AiCoachCard() {
  const { data: habits, isLoading: habitsLoading } = useHabitsQuery();
  const isOnCooldown = useCoachStore((s) => s.isOnCooldown());
  const markDismissed = useCoachStore((s) => s.markDismissed);
  const reset = useCoachStore((s) => s.reset);

  const coach = useCoachSuggestion();
  const [showReason, setShowReason] = useState(false);

  if (habitsLoading) {
    return (
      <div className="rounded-md border border-yellow-400 bg-yellow-50 p-3 text-xs text-yellow-900">
        [debug] AiCoachCard: habits 로딩 중
      </div>
    );
  }
  if (habits && habits.length === 0) {
    return (
      <div className="rounded-md border border-yellow-400 bg-yellow-50 p-3 text-xs text-yellow-900">
        [debug] AiCoachCard: habits 비어있음
      </div>
    );
  }

  const response = coach.data;
  const targetHabit =
    response && habits?.find((h) => h.id === response.suggestion.targetHabitId);

  const handleRequest = () => {
    setShowReason(false);
    coach.mutate();
  };

  const handleAccept = () => {
    if (!response) return;
    insertCoachEvent({
      promptVersion: response.promptVersion,
      suggestion: response.suggestion,
      action: "accepted",
    }).catch(() => {});
    markDismissed();
    coach.reset();
    toast.success("제안을 수락했습니다.");
  };

  const handleDismiss = () => {
    if (response) {
      insertCoachEvent({
        promptVersion: response.promptVersion,
        suggestion: response.suggestion,
        action: "dismissed",
      }).catch(() => {});
    }
    markDismissed();
    coach.reset();
    toast.info("제안을 닫았습니다.");
  };

  if (coach.isError) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="flex items-center justify-between gap-3 py-4">
          <p className="text-destructive text-sm">
            코치 제안을 불러오지 못했습니다. 다시 시도해주세요.
          </p>
          <Button size="sm" variant="outline" onClick={handleRequest}>
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!response) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary h-4 w-4" aria-hidden />
            <p className="text-sm">
              {isOnCooldown
                ? "오늘은 충분히 제안을 받았어요. 새로운 제안이 필요하면 버튼을 눌러주세요."
                : "AI 코치가 당신의 14일 패턴을 분석해 맞춤 제안을 드립니다."}
            </p>
          </div>
          <div className="flex gap-2">
            {isOnCooldown && (
              <Button size="sm" variant="ghost" onClick={reset}>
                쿨다운 해제
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleRequest}
              disabled={coach.isPending}
            >
              {coach.isPending ? "분석 중..." : "제안 받기"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Sparkles
              className="text-primary mt-0.5 h-4 w-4 shrink-0"
              aria-hidden
            />
            <div className="flex flex-col gap-1">
              <p className="text-muted-foreground text-xs">
                {targetHabit ? `「${targetHabit.title}」` : "제안"} ·{" "}
                {ACTION_LABEL[response.suggestion.action]} ·{" "}
                {response.promptVersion}
              </p>
              <p className="text-sm font-medium">
                {response.suggestion.suggestion}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            aria-label="제안 닫기"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleAccept}>
            <Check className="mr-1 h-3 w-3" aria-hidden />
            수락
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowReason((v) => !v)}
          >
            <Info className="mr-1 h-3 w-3" aria-hidden />
            {showReason ? "근거 숨기기" : "근거 보기"}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleRequest}>
            다른 제안
          </Button>
        </div>

        {showReason && (
          <p className="text-muted-foreground bg-background/60 rounded-md border px-3 py-2 text-xs">
            {response.suggestion.reason}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
