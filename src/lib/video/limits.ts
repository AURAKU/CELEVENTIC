import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { VideoCategory } from "@/lib/video/constants";

export interface VideoCategoryLimits {
  maxSizeMb: number;
  /** Optional hard duration cap in seconds (e.g. loop-optimized invitation backgrounds). */
  maxDurationSeconds: number | null;
}

/** Hardcoded fallbacks per the product spec — never a single platform-wide max. */
const HARD_DEFAULTS: Record<VideoCategory, number> = {
  EVENT_SHORT: 250,
  INVITATION_BACKGROUND: 150,
  VENDOR_PORTFOLIO: 500,
  GUESTBOOK: 300,
  PREMIUM: 2048,
  ADMIN: 5120,
};

const DURATION_DEFAULTS: Record<VideoCategory, number | null> = {
  EVENT_SHORT: 15 * 60,
  INVITATION_BACKGROUND: 90,
  VENDOR_PORTFOLIO: 20 * 60,
  GUESTBOOK: 10 * 60,
  PREMIUM: 45 * 60,
  ADMIN: null,
};

const ENV_KEY_BY_CATEGORY: Record<VideoCategory, string> = {
  EVENT_SHORT: "VIDEO_EVENT_SHORT_MAX_SIZE_MB",
  INVITATION_BACKGROUND: "VIDEO_INVITATION_BG_MAX_SIZE_MB",
  VENDOR_PORTFOLIO: "VIDEO_VENDOR_PORTFOLIO_MAX_SIZE_MB",
  GUESTBOOK: "VIDEO_GUESTBOOK_MAX_SIZE_MB",
  PREMIUM: "VIDEO_PREMIUM_MAX_SIZE_MB",
  ADMIN: "VIDEO_ADMIN_MAX_SIZE_MB",
};

function envNumber(key: string): number | null {
  const raw = process.env[key];
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Global fallback used only if a category-specific env var is not set. */
function globalDefaultMb(): number | null {
  return envNumber("VIDEO_MAX_SIZE_MB");
}

function envDefaultsForCategory(category: VideoCategory): number {
  return (
    envNumber(ENV_KEY_BY_CATEGORY[category]) ??
    globalDefaultMb() ??
    HARD_DEFAULTS[category]
  );
}

const SETTINGS_KEY = "video.category.limits";

interface StoredLimits {
  [category: string]: Partial<VideoCategoryLimits>;
}

async function loadStoredLimits(): Promise<StoredLimits> {
  const row = await prisma.adminSetting.findUnique({ where: { key: SETTINGS_KEY } });
  if (!row?.value || typeof row.value !== "object") return {};
  return row.value as StoredLimits;
}

/** Cached admin-overridable limits, merged over env defaults, merged over hard defaults. */
export const getAllVideoCategoryLimits = unstable_cache(
  async (): Promise<Record<VideoCategory, VideoCategoryLimits>> => {
    const stored = await loadStoredLimits();
    const categories = Object.keys(HARD_DEFAULTS) as VideoCategory[];
    const result = {} as Record<VideoCategory, VideoCategoryLimits>;
    for (const category of categories) {
      const envMax = envDefaultsForCategory(category);
      const override = stored[category];
      result[category] = {
        maxSizeMb: override?.maxSizeMb && override.maxSizeMb > 0 ? override.maxSizeMb : envMax,
        maxDurationSeconds:
          override?.maxDurationSeconds !== undefined
            ? override.maxDurationSeconds
            : DURATION_DEFAULTS[category],
      };
    }
    return result;
  },
  ["video-category-limits"],
  { revalidate: 60, tags: ["video-category-limits"] }
);

export async function getVideoCategoryLimits(category: VideoCategory): Promise<VideoCategoryLimits> {
  const all = await getAllVideoCategoryLimits();
  return all[category];
}

export async function saveVideoCategoryLimits(
  category: VideoCategory,
  limits: Partial<VideoCategoryLimits>
): Promise<void> {
  const stored = await loadStoredLimits();
  stored[category] = { ...stored[category], ...limits };
  await prisma.adminSetting.upsert({
    where: { key: SETTINGS_KEY },
    update: { value: stored, category: "video" },
    create: { key: SETTINGS_KEY, value: stored, category: "video" },
  });
}

export function categoryMaxBytes(limits: VideoCategoryLimits): number {
  return Math.round(limits.maxSizeMb * 1024 * 1024);
}
