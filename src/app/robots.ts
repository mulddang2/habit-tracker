import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * 색인 대상은 공개 랜딩(/) 하나뿐입니다.
 * 로그인 게이트 뒤의 앱 화면은 크롤러에게 로그인 리다이렉트만 보여주므로
 * 색인 가치가 없고, 크롤 예산만 소모하기 때문에 명시적으로 제외합니다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/habits",
          "/calendar",
          "/stats",
          "/login",
          "/api/",
          "/auth/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
