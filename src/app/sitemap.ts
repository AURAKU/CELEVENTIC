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
    "/pricing",
    "/experience",
    "/guide",
    "/guide/how-celeventic-works",
    "/invitations",
    "/invitations/catalogue",
    "/invitations/create/start",
    "/digital-cards",
    "/legal",
    "/legal/about",
    "/legal/contact",
    "/legal/faq",
    "/legal/privacy",
    "/legal/terms",
    "/legal/cookie",
    "/legal/refund",
    "/legal/revision-policy",
    "/legal/intellectual-property",
    "/legal/data-rights",
    "/auth/login",
    "/auth/register",
    "/vendor/onboarding",
  ];
  return paths.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "/" || path === "/discover" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
