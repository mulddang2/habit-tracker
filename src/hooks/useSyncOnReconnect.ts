"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { hydrateLocalDb } from "@/lib/db/hydrate";
import { flush } from "@/lib/db/sync";
import { habitKeys } from "@/hooks/useHabits";
import { habitLogKeys } from "@/hooks/useHabitLogs";

export function useSyncOnReconnect() {
  const queryClient = useQueryClient();

  useEffect(() => {
    async function refreshFromServer() {
      await hydrateLocalDb();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: habitKeys.all }),
        queryClient.invalidateQueries({ queryKey: habitLogKeys.all }),
      ]);
    }

    // 최초 로드 시 서버에서 최신 데이터로 동기화
    refreshFromServer().catch(() => {
      // 오프라인이거나 미인증 상태 — 무시
    });

    // 온라인 복귀 시 sync queue flush + 서버 데이터 동기화
    async function handleOnline() {
      try {
        await flush();
        await refreshFromServer();
      } catch {
        // 동기화 실패 — 다음 온라인 이벤트에서 재시도
      }
    }

    // 탭이 다시 활성화되거나 창이 포커스되면 서버 상태를 재동기화한다.
    // 다른 기기에서 발생한 변경(체크·삭제 등)을 따라잡기 위함.
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshFromServer().catch(() => {});
      }
    }

    function handleFocus() {
      refreshFromServer().catch(() => {});
    }

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [queryClient]);
}
