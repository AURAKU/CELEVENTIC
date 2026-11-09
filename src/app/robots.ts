import type { MetadataRoute } from "next";
import { getAppUrlFromEnv } from "@/lib/app-url";

/** Private workspaces, APIs, and invitation tokens must not be indexed. */
export default function robots(): MetadataRoute.Robots {
  const base = getAppUrlFromEnv();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/admin",
          "/api/",
          "/auth/",
          "/invite/",
          "/e/",
          "/seat/",
          "/event-seat/",
          "/join/",
        ],
      },
    ],
    sitemap: `${base.replace(/\/$/, "")}/sitemap.xml`,
  };
}
