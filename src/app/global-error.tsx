"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body className="flex min-h-screen items-center justify-center bg-white text-gray-900">
        <div className="flex flex-col items-center gap-4 px-4 text-center">
          <h1 className="text-4xl font-bold">오류가 발생했습니다</h1>
          <p className="text-gray-500">
            예상치 못한 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
          </p>
          <button
            onClick={reset}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
