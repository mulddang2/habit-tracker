import type { Metadata } from "next";

// 통계 화면은 클라이언트 컴포넌트라 page.tsx에서 metadata를 export할 수 없어
// 라우트 레이아웃에서 제목만 지정합니다.
export const metadata: Metadata = { title: "통계" };

export default function StatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
