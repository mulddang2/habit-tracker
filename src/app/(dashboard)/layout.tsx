import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { OfflineBanner } from "@/components/OfflineBanner";

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
