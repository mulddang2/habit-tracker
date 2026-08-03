import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { OfflineBanner } from "@/components/OfflineBanner";

// 로그인 게이트 뒤의 화면 — 크롤러에게는 로그인 리다이렉트만 노출되므로 색인하지 않습니다.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <OfflineBanner />
      <DashboardHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-20 sm:pb-6">
        {children}
      </main>
      <MobileNav />
    </>
  );
}
