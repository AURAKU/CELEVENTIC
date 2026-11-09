import type { MetadataRoute } from "next";
import { getAppUrlFromEnv } from "@/lib/app-url";

/** Static public URLs only. Event and invitation tokens are never listed. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getAppUrlFromEnv().replace(/\/$/, "");
  const paths = [
    "/",
    "/discover",
    "/marketplace",
    "/templates",
    "/legal/privacy",
    "/legal/terms",
    "/legal/cookie",
    "/legal/refund",
    "/auth/login",
    "/auth/register",
  ];
  return paths.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "/" || path === "/discover" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
