"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white"
    >
      <WifiOff className="h-4 w-4" aria-hidden />
      오프라인 상태입니다. 변경사항은 연결 복구 시 자동으로 동기화됩니다.
    </div>
  );
}
