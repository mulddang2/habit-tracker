"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const demoEnabled = Boolean(
  process.env.NEXT_PUBLIC_DEMO_EMAIL && process.env.NEXT_PUBLIC_DEMO_PASSWORD
);

type LoadingState = "google" | "demo" | null;

export function LoginForm() {
  const { signInWithGoogle, signInWithDemo } = useAuth();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<LoadingState>(null);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "auth" ? "로그인에 실패했습니다." : null
  );

  const handleGoogleLogin = async () => {
    try {
      setLoading("google");
      setError(null);
      await signInWithGoogle();
    } catch {
      setError("Google 로그인 중 오류가 발생했습니다.");
      setLoading(null);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setLoading("demo");
      setError(null);
      await signInWithDemo();
      // router.push 대신 풀 리로드 — 새 세션 데이터가 첫 화면부터 보이게.
      window.location.href = "/habits";
    } catch {
      setError("데모 로그인 중 오류가 발생했습니다.");
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-3" role="form" aria-label="로그인">
      {error && (
        <p className="text-destructive text-center text-sm" role="alert">
          {error}
        </p>
      )}
      <Button
        variant="outline"
        size="lg"
        onClick={handleGoogleLogin}
        disabled={loading !== null}
        className="w-full gap-2"
      >
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        {loading === "google" ? "로그인 중..." : "Google 계정으로 로그인"}
      </Button>

      {demoEnabled && (
        <>
          <div
            className="text-muted-foreground relative my-1 text-center text-xs"
            aria-hidden="true"
          >
            <span className="bg-card relative z-10 px-2">또는</span>
            <span className="bg-border absolute top-1/2 left-0 z-0 h-px w-full" />
          </div>
          <Button
            variant="secondary"
            size="lg"
            onClick={handleDemoLogin}
            disabled={loading !== null}
            className="w-full gap-2"
          >
            {loading === "demo" ? "로그인 중..." : "🎭 데모 계정으로 둘러보기"}
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            14일치 샘플 데이터로 미리 체험할 수 있어요
          </p>
        </>
      )}
    </div>
  );
}
