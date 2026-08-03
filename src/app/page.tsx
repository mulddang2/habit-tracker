import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BarChart3, CloudOff, Sparkles } from "lucide-react";
import { siteDescription, siteName, siteTagline } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const FEATURES = [
  {
    icon: CloudOff,
    title: "오프라인에서도 그대로",
    body: "지하철에서 체크한 기록도 사라지지 않습니다. 로컬 DB에 먼저 쓰고, 연결이 돌아오면 백그라운드에서 서버로 올립니다.",
  },
  {
    icon: Sparkles,
    title: "AI 코치의 다음 한 걸음",
    body: "최근 2주 기록을 읽고, 지금 손보면 효과가 가장 클 습관 하나를 골라 구체적인 조정을 제안합니다.",
  },
  {
    icon: BarChart3,
    title: "달성률을 한눈에",
    body: "연속 달성 일수와 주간 달성률을 달력·차트로 확인하며 흐름이 끊긴 지점을 바로 찾을 수 있습니다.",
  },
] as const;

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:py-24">
        <section className="flex flex-col items-center text-center">
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            {siteTagline}
          </h1>
          <p className="text-muted-foreground mt-5 max-w-xl text-base text-pretty sm:text-lg">
            {siteDescription}
          </p>
          <Link
            href="/login"
            className="bg-primary text-primary-foreground hover:bg-primary/80 focus-visible:ring-ring/50 focus-visible:border-ring mt-8 inline-flex h-11 items-center justify-center rounded-lg border border-transparent px-6 text-sm font-medium transition-all outline-none focus-visible:ring-3"
          >
            시작하기
          </Link>
          <p className="text-muted-foreground mt-3 text-xs">
            로그인 화면에서 14일치 샘플 데이터가 담긴 데모 계정을 바로 둘러볼 수
            있어요
          </p>
        </section>

        <figure className="mt-14 sm:mt-20">
          <Image
            src="/screenshots/screens-overview.png"
            alt={`${siteName}의 로그인, 습관 목록, 달력, 통계 화면을 한눈에 보여주는 스크린샷`}
            width={1254}
            height={1254}
            sizes="(min-width: 768px) 720px, 100vw"
            priority
            className="border-border mx-auto rounded-xl border"
          />
          <figcaption className="text-muted-foreground mt-3 text-center text-xs">
            습관 체크부터 통계 확인까지 이어지는 실제 화면
          </figcaption>
        </figure>

        <section className="mt-20" aria-labelledby="features-heading">
          <h2
            id="features-heading"
            className="text-center text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            매일 쓰기 위해 만든 기능
          </h2>
          <ul className="mt-10 grid gap-6 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="border-border bg-card rounded-xl border p-5"
              >
                <Icon className="text-muted-foreground size-5" />
                <h3 className="mt-3 text-base font-semibold">{title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-20 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            오늘 하나부터 시작해 보세요
          </h2>
          <p className="text-muted-foreground mt-3 text-sm">
            Google 계정으로 로그인하면 바로 첫 습관을 만들 수 있습니다.
          </p>
          <Link
            href="/login"
            className="border-border bg-background hover:bg-muted focus-visible:ring-ring/50 focus-visible:border-ring mt-6 inline-flex h-11 items-center justify-center rounded-lg border px-6 text-sm font-medium transition-all outline-none focus-visible:ring-3"
          >
            로그인하고 시작하기
          </Link>
        </section>
      </main>

      <footer className="text-muted-foreground border-border border-t px-4 py-6 text-center text-xs">
        {siteName}
      </footer>
    </div>
  );
}
