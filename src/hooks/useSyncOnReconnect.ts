"use client";

import { hydrateLocalDb } from "@/lib/db/hydrate";
import { flush } from "@/lib/db/sync";
import { useEffect } from "react";

export function useSyncOnReconnect() {
  useEffect(() => {
    // 최초 로드 시 서버에서 최신 데이터로 동기화
    async function initialHydrate() {
      try {
        await hydrateLocalDb();
      } catch {
        // 오프라인이거나 미인증 상태 — 무시
      }
    }
    initialHydrate();

    // 온라인 복귀 시 sync queue flush + 서버 데이터 동기화
    async function handleOnline() {
      try {
        await flush();
        await hydrateLocalDb();
      } catch {
        // 동기화 실패 — 다음 온라인 이벤트에서 재시도
      }
    }

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);
}
