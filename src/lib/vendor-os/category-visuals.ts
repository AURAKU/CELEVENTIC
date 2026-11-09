import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CakeSlice,
  CalendarHeart,
  Camera,
  Car,
  ChefHat,
  Clapperboard,
  Compass,
  Flower2,
  Guitar,
  Heart,
  Hotel,
  Lightbulb,
  Mic2,
  Music,
  Palette,
  Plane,
  Printer,
  Scissors,
  Shield,
  Shirt,
  Sparkles,
  Star,
  Store,
  Users,
  UtensilsCrossed,
  Video,
  Volume2,
} from "lucide-react";
import { DEFAULT_VENDOR_CATEGORIES } from "@/lib/vendor-os/constants";

export interface CategoryVisual {
  icon: LucideIcon;
  ring: string;
  fill: string;
}

const BY_SLUG: Record<string, CategoryVisual> = {
  venues: { icon: Building2, ring: "from-brand-400 via-gold-400 to-brand-600", fill: "from-brand-700 to-slate-900" },
  photographers: { icon: Camera, ring: "from-gold-300 via-accent-400 to-brand-500", fill: "from-slate-800 to-brand-800" },
  videographers: { icon: Video, ring: "from-accent-400 via-brand-400 to-gold-400", fill: "from-slate-900 to-brand-700" },
  caterers: { icon: UtensilsCrossed, ring: "from-gold-400 via-brand-400 to-accent-500", fill: "from-brand-800 to-slate-900" },
  chefs: { icon: ChefHat, ring: "from-brand-300 via-gold-400 to-brand-600", fill: "from-slate-800 to-brand-900" },
  decorators: { icon: Sparkles, ring: "from-gold-300 via-brand-300 to-accent-400", fill: "from-brand-700 to-slate-900" },
  djs: { icon: Music, ring: "from-accent-500 via-brand-400 to-gold-400", fill: "from-slate-950 to-brand-700" },
  mcs: { icon: Mic2, ring: "from-brand-400 via-accent-400 to-gold-400", fill: "from-slate-900 to-brand-800" },
  security: { icon: Shield, ring: "from-slate-300 via-brand-400 to-slate-500", fill: "from-slate-800 to-slate-950" },
  "makeup-artists": { icon: Palette, ring: "from-accent-400 via-gold-300 to-brand-400", fill: "from-brand-800 to-slate-900" },
  "hair-stylists": { icon: Scissors, ring: "from-gold-400 via-accent-400 to-brand-500", fill: "from-slate-900 to-brand-800" },
  "fashion-designers": { icon: Shirt, ring: "from-brand-300 via-gold-400 to-accent-400", fill: "from-brand-900 to-slate-950" },
  florists: { icon: Flower2, ring: "from-brand-300 via-gold-300 to-accent-400", fill: "from-brand-800 to-slate-900" },
  "car-rentals": { icon: Car, ring: "from-slate-200 via-brand-400 to-gold-400", fill: "from-slate-900 to-brand-800" },
  "event-planners": { icon: CalendarHeart, ring: "from-brand-400 via-gold-400 to-brand-600", fill: "from-brand-800 to-slate-950" },
  "wedding-coordinators": { icon: Heart, ring: "from-accent-400 via-gold-300 to-brand-400", fill: "from-slate-900 to-brand-800" },
  "funeral-coordinators": { icon: Flower2, ring: "from-slate-300 via-gold-400 to-brand-500", fill: "from-slate-800 to-slate-950" },
  lighting: { icon: Lightbulb, ring: "from-gold-300 via-gold-500 to-brand-400", fill: "from-slate-900 to-gold-600" },
  "sound-engineers": { icon: Volume2, ring: "from-brand-300 via-accent-400 to-gold-400", fill: "from-slate-950 to-brand-800" },
  "live-bands": { icon: Guitar, ring: "from-accent-500 via-gold-400 to-brand-400", fill: "from-slate-900 to-brand-700" },
  "content-creators": { icon: Clapperboard, ring: "from-gold-400 via-accent-400 to-brand-500", fill: "from-slate-900 to-brand-800" },
  influencers: { icon: Star, ring: "from-gold-300 via-gold-500 to-accent-400", fill: "from-slate-900 to-gold-700" },
  "drone-operators": { icon: Plane, ring: "from-brand-300 via-slate-200 to-gold-400", fill: "from-slate-900 to-brand-800" },
  "printing-services": { icon: Printer, ring: "from-brand-400 via-slate-300 to-gold-400", fill: "from-slate-800 to-brand-900" },
  "cake-designers": { icon: CakeSlice, ring: "from-accent-400 via-gold-300 to-brand-400", fill: "from-brand-800 to-slate-900" },
  ushers: { icon: Users, ring: "from-brand-400 via-gold-400 to-brand-600", fill: "from-slate-900 to-brand-800" },
  hotels: { icon: Hotel, ring: "from-gold-300 via-brand-400 to-slate-300", fill: "from-slate-900 to-brand-800" },
  "travel-services": { icon: Plane, ring: "from-brand-300 via-gold-400 to-brand-600", fill: "from-slate-900 to-brand-700" },
};

const FALLBACK: CategoryVisual = {
  icon: Store,
  ring: "from-brand-400 via-gold-400 to-brand-600",
  fill: "from-brand-800 to-slate-950",
};

export const ALL_STORY_VISUAL: CategoryVisual = {
  icon: Compass,
  ring: "from-gold-300 via-brand-400 to-accent-400",
  fill: "from-brand-600 to-slate-950",
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const SHORT_LABELS: Record<string, string> = {
  photographers: "Photo",
  videographers: "Video",
  "makeup-artists": "Makeup",
  "hair-stylists": "Hair",
  "fashion-designers": "Fashion",
  "car-rentals": "Cars",
  "event-planners": "Planners",
  "wedding-coordinators": "Wedding",
  "funeral-coordinators": "Funeral",
  "sound-engineers": "Sound",
  "live-bands": "Bands",
  "content-creators": "Creators",
  "drone-operators": "Drone",
  "printing-services": "Print",
  "cake-designers": "Cakes",
  "travel-services": "Travel",
};

export function storyShortLabel(name: string) {
  const key = normalizeKey(name);
  return SHORT_LABELS[key] ?? name;
}

export function categoryVisual(slugOrName: string): CategoryVisual {
  const key = normalizeKey(slugOrName);
  if (BY_SLUG[key]) return BY_SLUG[key];
  const fromDefaults = DEFAULT_VENDOR_CATEGORIES.find(
    (c) => normalizeKey(c.slug) === key || normalizeKey(c.name) === key
  );
  if (fromDefaults && BY_SLUG[fromDefaults.slug]) return BY_SLUG[fromDefaults.slug];
  return FALLBACK;
}

export interface StoryCategory {
  slug: string;
  name: string;
}

/** Keep the rail full even when the API has not returned categories yet. */
export function mergeStoryCategories(apiCategories: StoryCategory[]): StoryCategory[] {
  const seen = new Set<string>();
  const stories: StoryCategory[] = [];

  const push = (item: StoryCategory) => {
    const key = normalizeKey(item.name) || normalizeKey(item.slug);
    if (!key || seen.has(key)) return;
    seen.add(key);
    stories.push({ slug: item.slug || key, name: item.name });
  };

  for (const item of apiCategories) push(item);
  for (const item of DEFAULT_VENDOR_CATEGORIES) push({ slug: item.slug, name: item.name });
  return stories;
}
