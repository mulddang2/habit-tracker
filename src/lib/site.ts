/**
 * 사이트 전역 메타데이터 상수.
 * metadata / robots / sitemap이 같은 값을 바라보도록 한 곳에 모아둡니다.
 */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://habit-tracker-ashy-seven.vercel.app";

export const siteName = "습관 트래커";

export const siteTagline = "오프라인에서도 끊기지 않는 습관 기록";

export const siteDescription =
  "매일 습관을 기록하고 달성률을 시각화하는 개인 생산성 앱. 오프라인에서도 작동하고, 모바일과 PC에서 같은 상태를 유지합니다.";

/** OG/트위터 카드 공용 이미지 (public/screenshots/desktop.png 실제 크기). */
export const siteOgImage = {
  url: "/screenshots/desktop.png",
  width: 2880,
  height: 1680,
  alt: "습관 트래커 대시보드 — 오늘의 습관 목록과 AI 코치 카드",
} as const;
