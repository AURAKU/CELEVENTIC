/**
 * Curated theme media — object/scenery only (no people / AI portraits).
 * Funeral assets are solemn; wedding allows florals & décor; each category stays distinct.
 */

import { getCatalogTemplate } from "@/lib/invitation-mvp/catalogue";
import { getLayoutMediaPack } from "@/lib/invitation/layout-media-identity";

export type EventThemeCategory =
  | "Wedding"
  | "Engagement"
  | "Funeral"
  | "Birthday"
  | "Corporate"
  | "Lunch"
  | "Conference"
  | "Concert"
  | "Church"
  | "Private Event";

const LAYOUT_THEME: Record<string, EventThemeCategory> = {
  "memorial-candle-tribute": "Funeral",
  "neon-celebration-party": "Birthday",
  "corporate-prestige-summit": "Corporate",
  "luxury-fashion-flagship": "Lunch",
  "floral-garden-romance": "Wedding",
};

/** Solemn — candles, lilies, stone, stained glass. No wedding or party imagery. */
const FUNERAL_HERO =
  "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=900&q=80&auto=format&fit=crop";
const FUNERAL_GALLERY = [
  "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80&auto=format&fit=crop",
];
const FUNERAL_BG =
  "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=1600&q=60&auto=format&fit=crop&blur=8";

/** Romantic florals, rings, arches — décor only */
const WEDDING_HERO =
  "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=900&q=80&auto=format&fit=crop";
const WEDDING_GALLERY = [
  "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1522413452208-996ff3f3e740?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80&auto=format&fit=crop",
];
const WEDDING_BG =
  "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1600&q=60&auto=format&fit=crop&blur=6";

const ENGAGEMENT_GALLERY = [
  "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1522413452208-996ff3f3e740?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80&auto=format&fit=crop",
];

const BIRTHDAY_GALLERY = [
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80&auto=format&fit=crop",
];
const BIRTHDAY_BG =
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1600&q=60&auto=format&fit=crop&blur=6";

const CORPORATE_GALLERY = [
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80&auto=format&fit=crop",
];
const CORPORATE_BG =
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=60&auto=format&fit=crop&blur=8";

const CONCERT_GALLERY = [
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1459749411176-04bf1dffd275?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80&auto=format&fit=crop",
];

const CHURCH_GALLERY = [
  "https://images.unsplash.com/photo-1438230683412-84cbd1ebd3d6?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1507692049794-de58290a4334?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1438032005730-c779502df39b?w=800&q=80&auto=format&fit=crop",
];
const CHURCH_BG =
  "https://images.unsplash.com/photo-1507692049794-de58290a4334?w=1600&q=60&auto=format&fit=crop&blur=8";

const CONCERT_BG =
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&q=60&auto=format&fit=crop&blur=8";

/** Abstract motion clips — no people. Omitted for Funeral (sensitive). */
const THEME_DEMO_VIDEOS: Partial<Record<EventThemeCategory, string[]>> = {
  Wedding: [
    "https://assets.mixkit.co/videos/preview/mixkit-golden-bokeh-particles-4552-large.mp4",
  ],
  Engagement: [
    "https://assets.mixkit.co/videos/preview/mixkit-golden-bokeh-particles-4552-large.mp4",
  ],
  Birthday: [
    "https://assets.mixkit.co/videos/preview/mixkit-falling-stars-9455-large.mp4",
  ],
  Corporate: [
    "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-building-from-above-43712-large.mp4",
  ],
  Conference: [
    "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-building-from-above-43712-large.mp4",
  ],
  Concert: [
    "https://assets.mixkit.co/videos/preview/mixkit-concert-lights-on-a-dark-background-4438-large.mp4",
  ],
  Church: [
    "https://assets.mixkit.co/videos/preview/mixkit-light-rays-through-a-stained-glass-window-4439-large.mp4",
  ],
  "Private Event": [
    "https://assets.mixkit.co/videos/preview/mixkit-golden-bokeh-particles-4552-large.mp4",
  ],
};

const LAYOUT_GALLERY_OVERRIDES: Record<string, string[]> = {
  "kente-heritage-union": [
    "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80&auto=format&fit=crop",
  ],
  "golden-islamic-nikkah": [
    "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80&auto=format&fit=crop",
  ],
  "passport-luxe": [
    "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80&auto=format&fit=crop",
  ],
  "passport-destination-wedding": [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop",
  ],
  "rustic-lace": [
    "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=800&q=80&auto=format&fit=crop",
  ],
  "arch-green": [
    "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80&auto=format&fit=crop",
  ],
};

const THEME_PACKS: Record<
  EventThemeCategory,
  { hero: string; gallery: string[]; background: string }
> = {
  Wedding: { hero: WEDDING_HERO, gallery: WEDDING_GALLERY, background: WEDDING_BG },
  Engagement: { hero: ENGAGEMENT_GALLERY[0], gallery: ENGAGEMENT_GALLERY, background: WEDDING_BG },
  Funeral: { hero: FUNERAL_HERO, gallery: FUNERAL_GALLERY, background: FUNERAL_BG },
  Birthday: { hero: BIRTHDAY_GALLERY[0], gallery: BIRTHDAY_GALLERY, background: BIRTHDAY_BG },
  Corporate: { hero: CORPORATE_GALLERY[0], gallery: CORPORATE_GALLERY, background: CORPORATE_BG },
  Lunch: {
    hero: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=900&q=80&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80&auto=format&fit=crop",
    ],
    background:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=60&auto=format&fit=crop&blur=8",
  },
  Conference: { hero: CORPORATE_GALLERY[0], gallery: CORPORATE_GALLERY, background: CORPORATE_BG },
  Concert: { hero: CONCERT_GALLERY[0], gallery: CONCERT_GALLERY, background: CONCERT_BG },
  Church: { hero: CHURCH_GALLERY[0], gallery: CHURCH_GALLERY, background: CHURCH_BG },
  "Private Event": { hero: WEDDING_HERO, gallery: WEDDING_GALLERY, background: WEDDING_BG },
};

export function resolveEventTheme(layout: string, category?: string): EventThemeCategory {
  if (LAYOUT_THEME[layout]) return LAYOUT_THEME[layout];
  if (category && category in THEME_PACKS) return category as EventThemeCategory;
  const catalog = getCatalogTemplate(layout);
  if (catalog?.category && catalog.category in THEME_PACKS) {
    return catalog.category as EventThemeCategory;
  }
  const slug = layout.toLowerCase();
  if (slug.includes("memorial") || slug.includes("funeral") || slug.includes("janazah")) {
    return "Funeral";
  }
  if (slug.includes("fashion") || slug.includes("flagship") || slug.includes("lunch")) {
    return "Lunch";
  }
  if (slug.includes("corporate") || slug.includes("summit") || slug.includes("conference")) {
    return slug.includes("conference") ? "Conference" : "Corporate";
  }
  if (slug.includes("birthday") || slug.includes("party") || slug.includes("neon")) return "Birthday";
  if (slug.includes("concert") || slug.includes("festival")) return "Concert";
  if (slug.includes("church") || slug.includes("worship")) return "Church";
  if (slug.includes("engagement")) return "Engagement";
  return "Wedding";
}

export function getThemeHeroUrl(layout: string, category?: string, catalogSlug?: string | null): string {
  const pack = getLayoutMediaPack(layout, catalogSlug);
  if (pack) return pack.hero;
  const theme = resolveEventTheme(layout, category);
  return LAYOUT_GALLERY_OVERRIDES[layout]?.[0] ?? THEME_PACKS[theme].hero;
}

export function getThemeGalleryUrls(
  layout: string,
  category?: string,
  count = 6,
  catalogSlug?: string | null
): string[] {
  const pack = getLayoutMediaPack(layout, catalogSlug);
  if (pack) {
    if (pack.video) {
      const slots = Math.max(1, count - 1);
      return [...pack.gallery.slice(0, slots), pack.video].slice(0, count);
    }
    return pack.gallery.slice(0, count);
  }

  const theme = resolveEventTheme(layout, category);
  const override = LAYOUT_GALLERY_OVERRIDES[layout];
  const images = override?.length ? override : THEME_PACKS[theme].gallery;

  if (theme === "Funeral") return images.slice(0, count);

  const videos = THEME_DEMO_VIDEOS[theme] ?? [];
  if (!videos.length) return images.slice(0, count);

  const imageSlots = Math.max(1, count - videos.length);
  return [...images.slice(0, imageSlots), ...videos].slice(0, count);
}

export function getThemeBackgroundUrl(
  layout: string,
  category?: string,
  catalogSlug?: string | null
): string {
  const pack = getLayoutMediaPack(layout, catalogSlug);
  if (pack) return pack.background;
  const theme = resolveEventTheme(layout, category);
  return THEME_PACKS[theme].background;
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}
