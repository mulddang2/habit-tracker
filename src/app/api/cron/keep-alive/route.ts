import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
// GET 핸들러가 빌드 시점에 정적 캐시되면 런타임에 DB 요청이 안 나가므로 강제 동적.
export const dynamic = "force-dynamic";

/** Vercel Cron이 매일 호출. Supabase 무료 티어의 7일 무활동 자동 정지를 DB 조회로 막는다. */
export async function GET(request: Request) {
  // Vercel은 CRON_SECRET 환경변수가 설정된 경우에만 Authorization 헤더를 붙여 호출한다.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { error } = await supabase.from("habits").select("id").limit(1);

  if (error) {
    console.error("[keep-alive]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
