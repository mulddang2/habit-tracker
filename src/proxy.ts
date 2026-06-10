import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // api/cron은 Vercel Cron이 인증 쿠키 없이 호출하므로 로그인 리다이렉트에서 제외.
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|)$).*)",
  ],
};
