import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** 랜딩 카피/구성을 바꿀 때 함께 갱신합니다. */
const LANDING_LAST_MODIFIED = new Date("2026-08-03");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: LANDING_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
