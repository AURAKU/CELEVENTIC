/**
 * Template Creative Registry — single source of truth for each catalog SKU's
 * creative universe. Layout DNA remains the fallback; catalog SKU identity wins.
 *
 * Uniqueness rule: no two SKUs may share the same full identity fingerprint.
 */
import { CATALOG_TEMPLATES, type CatalogTemplate } from "@/lib/invitation-mvp/catalogue";
import {
  getTemplateExperienceDNA,
  type ExperienceCollectionId,
} from "@/lib/experience/experience-engine-v2";
import { getLayoutMusicProfile } from "@/lib/invitation/layout-music-identity";
import { getCatalogMusicProfile } from "@/lib/invitation/catalog-music-identity";
import type { InvitationLayoutSlug } from "@/types/invitation-design";
import { SKU_CREATIVE_OVERRIDES } from "@/lib/invitation/template-creative-sku-overrides";

export type ParallaxIntensity = "none" | "subtle" | "moderate" | "cinematic" | "interactive";
export type MotionLanguage =
  | "regal"
  | "romantic"
  | "editorial"
  | "playful"
  | "solemn"
  | "cinematic"
  | "minimal"
  | "futuristic"
  | "traditional"
  | "organic"
  | "energetic"
  | "corporate"
  | "dreamlike"
  | "luxurious";

export type CreativeUniverseId =
  | "royal-wax-seal"
  | "botanical-romance"
  | "editorial-love-story"
  | "passport-destination"
  | "theater-curtain"
  | "crystal-glass"
  | "heritage-textile"
  | "memorial-candle"
  | "corporate-prestige"
  | "neon-celebration"
  | "film-premiere"
  | "islamic-ornamental"
  | "paper-craft"
  | "celestial-night"
  | "museum-gallery"
  | "minimal-modern"
  | "luxury-black-tie"
  | "celebration-pop"
  | "architectural-romance"
  | "memory-album"
  | "gilded-classic"
  | "custom-media"
  | "lily-serenity"
  | "royal-mourning";

/** Canonical invitation section ids used by hub / sequence builders. */
export type CreativeSectionId =
  | "invitation"
  | "countdown"
  | "story"
  | "venue-map"
  | "gallery"
  | "rsvp"
  | "gifts"
  | "pass"
  | "menu"
  | "memory"
  | "timeline"
  | "livestream"
  | "outro";

export interface TemplateCreativeProfile {
  /** Alias of catalogSlug — Experience Engine brief field `id`. */
  id: string;
  /** Display name from catalogue. */
  name: string;
  catalogSlug: string;
  layoutSlug: string;
  creativeUniverse: CreativeUniverseId;
  creativeConcept: string;
  eventTypes: string[];
  emotionalTone: string;
  targetAudience: string;
  visualLanguage: string;
  openingSequence: string;
  revealMechanic: string;
  sceneArchitecture: string;
  motionProfile: MotionLanguage;
  parallaxProfile: ParallaxIntensity;
  typographySystem: string;
  buttonFamily: string;
  backgroundSystem: string;
  mediaPresentationStyle: string;
  /** Alias of defaultAudioTrack — brief field `audioProfile`. */
  audioProfile: string;
  defaultAudioTrack: string;
  compatibleAudioCategories: string[];
  prohibitedAudioCategories: string[];
  soundEffectProfile: string;
  outroType: string;
  /** Sections always available for this SKU's experience architecture. */
  supportedSections: CreativeSectionId[];
  /** Sections that may appear when package / content entitles them. */
  optionalSections: CreativeSectionId[];
  collectionId: ExperienceCollectionId;
  introVariant?: string;
  openingExperience?: string;
  sceneTransition?: string;
  outroExperience?: string;
  slideshowStyle?: string;
  countdownStyle?: string;
  packageAccess: "free" | "premium" | "luxury" | "all";
  reducedMotionFallback: string;
  /** Optional dock CTA order — Experience Engine primary actions (Phase 2+). */
  primaryActions?: string[];
  /** Optional sound-effect profile key consumed by SoundEffectController. */
  audioDirectorProfile?: string;
}

const DEFAULT_SUPPORTED_SECTIONS: CreativeSectionId[] = [
  "invitation",
  "countdown",
  "story",
  "venue-map",
  "gallery",
  "rsvp",
  "outro",
];

const DEFAULT_OPTIONAL_SECTIONS: CreativeSectionId[] = [
  "gifts",
  "pass",
  "menu",
  "memory",
  "timeline",
  "livestream",
];

function sectionsForCategory(category: string): {
  supported: CreativeSectionId[];
  optional: CreativeSectionId[];
} {
  if (category === "Funeral") {
    return {
      supported: ["invitation", "story", "venue-map", "gallery", "memory", "outro"],
      optional: ["countdown", "livestream", "timeline"],
    };
  }
  if (category === "Corporate" || category === "Conference") {
    return {
      supported: ["invitation", "countdown", "venue-map", "rsvp", "outro"],
      optional: ["story", "gallery", "menu", "pass", "timeline", "livestream"],
    };
  }
  if (category === "Concert") {
    return {
      supported: ["invitation", "countdown", "venue-map", "gallery", "pass", "outro"],
      optional: ["rsvp", "menu", "story", "livestream"],
    };
  }
  if (category === "Wedding" || category === "Engagement") {
    return {
      supported: [
        "invitation",
        "countdown",
        "story",
        "venue-map",
        "gallery",
        "rsvp",
        "gifts",
        "outro",
      ],
      optional: ["menu", "pass", "memory", "timeline", "livestream"],
    };
  }
  return {
    supported: DEFAULT_SUPPORTED_SECTIONS,
    optional: DEFAULT_OPTIONAL_SECTIONS,
  };
}

/** @deprecated Use SKU_CREATIVE_OVERRIDES — kept as alias for Phase 3 call sites. */
const PILOT_PROFILES: Record<string, Partial<TemplateCreativeProfile>> =
  SKU_CREATIVE_OVERRIDES as Record<string, Partial<TemplateCreativeProfile>>;

/** Publishing gate — internal only. Admin may allowlisted overrides below threshold. */
export const PUBLISHING_UNIQUENESS_THRESHOLD = 85;

/** Internal allowlist when a SKU must publish below threshold (admin override). Empty by default. */
export const ADMIN_UNIQUENESS_OVERRIDE_SLUGS: ReadonlySet<string> = new Set([
  // e.g. "legacy-special-sku",
]);

/** Layout → default creative universe when SKU has no pilot override */
const LAYOUT_UNIVERSE: Partial<Record<InvitationLayoutSlug, CreativeUniverseId>> = {
  "classic-gold": "gilded-classic",
  "arch-green": "architectural-romance",
  "rustic-lace": "paper-craft",
  "boho-hexagon": "celebration-pop",
  "luxury-rings": "luxury-black-tie",
  "custom-media": "custom-media",
  "passport-luxe": "passport-destination",
  "glass-acrylic": "crystal-glass",
  "floral-garden": "botanical-romance",
  "royal-emerald-wedding": "royal-wax-seal",
  "midnight-velvet-reception": "editorial-love-story",
  "kente-heritage-union": "heritage-textile",
  "traditional-marriage-ceremony": "heritage-textile",
  "floral-garden-romance": "botanical-romance",
  "passport-destination-wedding": "passport-destination",
  "crystal-acrylic-luxury": "crystal-glass",
  "golden-islamic-nikkah": "islamic-ornamental",
  "memorial-candle-tribute": "memorial-candle",
  "neon-celebration-party": "neon-celebration",
  "corporate-prestige-summit": "corporate-prestige",
};

const CATEGORY_EVENT_TYPES: Record<string, string[]> = {
  Wedding: ["WEDDING", "ENGAGEMENT"],
  Engagement: ["ENGAGEMENT", "WEDDING"],
  Birthday: ["BIRTHDAY", "PRIVATE_PARTY"],
  Funeral: ["FUNERAL"],
  Church: ["WEDDING", "CUSTOM"],
  Corporate: ["CORPORATE_EVENT", "CONFERENCE"],
  Conference: ["CONFERENCE", "CORPORATE_EVENT"],
  Concert: ["CONCERT", "FESTIVAL"],
  "Private Event": ["PRIVATE_PARTY", "CUSTOM"],
};

function motionFromCatalog(t: CatalogTemplate): MotionLanguage {
  if (t.motionProfileId === "solemn") return "solemn";
  if (t.motionProfileId === "layered-drift") return "cinematic";
  if (t.motionProfileId === "gentle-drift") return "romantic";
  if (t.category === "Funeral") return "solemn";
  if (t.category === "Corporate" || t.category === "Conference") return "corporate";
  if (t.style === "Luxury" || t.style === "Royal") return "luxurious";
  if (t.style === "Modern") return "energetic";
  return "cinematic";
}

function parallaxFromCatalog(t: CatalogTemplate): ParallaxIntensity {
  if (t.hasParallax && t.motionProfileId === "layered-drift") return "cinematic";
  if (t.hasParallax) return "moderate";
  if (t.category === "Funeral") return "none";
  return "subtle";
}

function buildFromCatalog(t: CatalogTemplate): TemplateCreativeProfile {
  const layout = t.layoutSlug as InvitationLayoutSlug;
  const dna = getTemplateExperienceDNA(layout);
  const music = getCatalogMusicProfile(t.slug) ?? getLayoutMusicProfile(layout);
  const pilot = (SKU_CREATIVE_OVERRIDES[t.slug] ?? PILOT_PROFILES[t.slug] ?? {}) as Partial<TemplateCreativeProfile>;
  const brief = t.creativeBrief;
  const overrides = t.experienceOverrides;
  const isWeddingCategory = t.category === "Wedding" || t.category === "Engagement";
  const defaultProhibited = isWeddingCategory ? ["funeral", "memorial"] : [];
  const sections = sectionsForCategory(t.category);
  const audioTrack = pilot.defaultAudioTrack ?? pilot.audioProfile ?? music.trackId;

  return {
    id: t.slug,
    name: t.name,
    catalogSlug: t.slug,
    layoutSlug: t.layoutSlug,
    creativeUniverse:
      pilot.creativeUniverse ??
      LAYOUT_UNIVERSE[layout] ??
      ("gilded-classic" as CreativeUniverseId),
    creativeConcept:
      pilot.creativeConcept ??
      brief?.creativeConcept ??
      `${t.name} — ${t.description}`,
    eventTypes: pilot.eventTypes ?? CATEGORY_EVENT_TYPES[t.category] ?? ["CUSTOM"],
    emotionalTone: pilot.emotionalTone ?? brief?.emotionalTone ?? t.mood ?? t.style,
    targetAudience: pilot.targetAudience ?? `${t.category} hosts`,
    visualLanguage: pilot.visualLanguage ?? brief?.visualLanguage ?? t.description,
    openingSequence:
      pilot.openingSequence ??
      `celeventic branded intro → ${overrides?.openingExperience ?? dna.openingExperience}`,
    revealMechanic:
      pilot.revealMechanic ?? brief?.revealMechanic ?? overrides?.openingExperience ?? dna.openingExperience,
    sceneArchitecture:
      pilot.sceneArchitecture ??
      (t.blueprintId ? "Paged blueprint scenes" : "Scroll hub with experience sections"),
    motionProfile: pilot.motionProfile ?? motionFromCatalog(t),
    parallaxProfile: pilot.parallaxProfile ?? parallaxFromCatalog(t),
    typographySystem:
      pilot.typographySystem ?? overrides?.typographyPackId ?? dna.typographyPackId ?? "modern-sans",
    buttonFamily: pilot.buttonFamily ?? t.buttonStyle ?? dna.buttonStyle,
    backgroundSystem: pilot.backgroundSystem ?? dna.backgroundPackId ?? "static",
    mediaPresentationStyle:
      pilot.mediaPresentationStyle ?? overrides?.slideshowStyle ?? dna.slideshowStyle,
    audioProfile: pilot.audioProfile ?? audioTrack,
    defaultAudioTrack: audioTrack,
    compatibleAudioCategories: pilot.compatibleAudioCategories ?? [music.category, dna.defaultAudioCategory],
    prohibitedAudioCategories: pilot.prohibitedAudioCategories ?? defaultProhibited,
    soundEffectProfile: pilot.soundEffectProfile ?? "subtle-ui",
    outroType: pilot.outroType ?? brief?.outroType ?? overrides?.outroExperience ?? dna.outroExperience,
    supportedSections: pilot.supportedSections ?? sections.supported,
    optionalSections: pilot.optionalSections ?? sections.optional,
    collectionId: dna.collectionId,
    introVariant: pilot.introVariant ?? overrides?.introVariant,
    openingExperience: pilot.openingExperience ?? overrides?.openingExperience ?? dna.openingExperience,
    sceneTransition: pilot.sceneTransition ?? overrides?.sceneTransition ?? dna.sceneTransition,
    outroExperience: pilot.outroExperience ?? overrides?.outroExperience ?? dna.outroExperience,
    slideshowStyle: pilot.slideshowStyle ?? overrides?.slideshowStyle ?? dna.slideshowStyle,
    countdownStyle: pilot.countdownStyle ?? overrides?.countdownStyle ?? dna.countdownStyle,
    packageAccess:
      pilot.packageAccess ??
      (t.tier === "luxury" ? "luxury" : t.tier === "premium" || t.isPremium ? "premium" : "free"),
    reducedMotionFallback:
      pilot.reducedMotionFallback ?? "Skip animation and open invitation content directly",
    primaryActions: pilot.primaryActions as string[] | undefined,
    audioDirectorProfile: pilot.audioDirectorProfile as string | undefined,
  };
}

let _registry: Map<string, TemplateCreativeProfile> | null = null;

function registryMap(): Map<string, TemplateCreativeProfile> {
  if (!_registry) {
    _registry = new Map(CATALOG_TEMPLATES.map((t) => [t.slug, buildFromCatalog(t)]));
  }
  return _registry;
}

export function getTemplateCreativeProfile(catalogSlug: string): TemplateCreativeProfile | null {
  return registryMap().get(catalogSlug) ?? null;
}

export function listTemplateCreativeProfiles(): TemplateCreativeProfile[] {
  return Array.from(registryMap().values());
}

/** Experience overrides derived from the registry for design enrichment. */
export function getCreativeExperienceOverrides(catalogSlug: string): CatalogTemplate["experienceOverrides"] {
  const p = getTemplateCreativeProfile(catalogSlug);
  if (!p) return undefined;
  return {
    introVariant: p.introVariant,
    openingExperience: p.openingExperience,
    sceneTransition: p.sceneTransition,
    outroExperience: p.outroExperience,
    typographyPackId: p.typographySystem.includes("-")
      ? p.typographySystem.split("-")[0]
      : p.typographySystem,
    slideshowStyle: p.mediaPresentationStyle,
    countdownStyle: p.countdownStyle,
  };
}

export function getCreativeButtonFamily(catalogSlug: string): string | undefined {
  return getTemplateCreativeProfile(catalogSlug)?.buttonFamily;
}

/** Internal uniqueness fingerprint — not for public display. */
export function creativeIdentityFingerprint(p: TemplateCreativeProfile): string {
  return [
    p.creativeUniverse,
    p.revealMechanic,
    p.openingExperience,
    p.introVariant,
    p.sceneTransition,
    p.outroExperience,
    p.typographySystem,
    p.buttonFamily,
    p.mediaPresentationStyle,
    p.motionProfile,
    p.parallaxProfile,
    p.defaultAudioTrack,
    p.outroType,
  ].join("|");
}

export interface UniquenessReport {
  score: number;
  overlapping: string[];
  suggestions: string[];
  fingerprint: string;
}

export function scoreTemplateUniqueness(catalogSlug: string): UniquenessReport {
  const target = getTemplateCreativeProfile(catalogSlug);
  if (!target) {
    return { score: 0, overlapping: ["unknown-slug"], suggestions: ["Register this SKU"], fingerprint: "" };
  }
  const fp = creativeIdentityFingerprint(target);
  const overlapping: string[] = [];
  /** Structural dims — name/color/image alone never count. */
  const dims = [
    "creativeUniverse",
    "revealMechanic",
    "openingExperience",
    "introVariant",
    "buttonFamily",
    "mediaPresentationStyle",
    "motionProfile",
    "typographySystem",
    "defaultAudioTrack",
    "outroType",
    "sceneArchitecture",
  ] as const;

  for (const other of listTemplateCreativeProfiles()) {
    if (other.catalogSlug === catalogSlug) continue;
    const shared = dims.filter((d) => target[d] && other[d] && target[d] === other[d]);
    // 4+ structural overlaps = too similar for publishing
    if (shared.length >= 4) {
      overlapping.push(`${other.catalogSlug} (${shared.join(", ")})`);
    }
  }

  const penalty = overlapping.length * 14;
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const suggestions: string[] = [];
  if (overlapping.length) {
    suggestions.push("Differentiate reveal, button family, media style, typography, or audio track");
    suggestions.push("Assign a unique creativeUniverse if two SKUs share emotional pacing");
  }
  if (score < PUBLISHING_UNIQUENESS_THRESHOLD) {
    suggestions.push(
      `Raise uniqueness above publishing threshold (${PUBLISHING_UNIQUENESS_THRESHOLD}) or add to ADMIN_UNIQUENESS_OVERRIDE_SLUGS`
    );
  }

  return { score, overlapping, suggestions, fingerprint: fp };
}

export function auditCreativeRegistryUniqueness(threshold = PUBLISHING_UNIQUENESS_THRESHOLD): {
  failures: { slug: string; report: UniquenessReport }[];
  collisions: { a: string; b: string; fingerprint: string }[];
} {
  const seen = new Map<string, string>();
  const collisions: { a: string; b: string; fingerprint: string }[] = [];
  const failures: { slug: string; report: UniquenessReport }[] = [];

  for (const p of listTemplateCreativeProfiles()) {
    const fp = creativeIdentityFingerprint(p);
    const prior = seen.get(fp);
    if (prior) collisions.push({ a: prior, b: p.catalogSlug, fingerprint: fp });
    else seen.set(fp, p.catalogSlug);

    const report = scoreTemplateUniqueness(p.catalogSlug);
    const overridden = ADMIN_UNIQUENESS_OVERRIDE_SLUGS.has(p.catalogSlug);
    if (!overridden && report.score < threshold && report.overlapping.length > 0) {
      failures.push({ slug: p.catalogSlug, report });
    }
  }

  return { failures, collisions };
}

/** True when a SKU may be published (score gate or admin override). Internal only. */
export function canPublishTemplateCreative(catalogSlug: string): {
  ok: boolean;
  score: number;
  overridden: boolean;
  reasons: string[];
} {
  const report = scoreTemplateUniqueness(catalogSlug);
  const overridden = ADMIN_UNIQUENESS_OVERRIDE_SLUGS.has(catalogSlug);
  const ok = overridden || report.score >= PUBLISHING_UNIQUENESS_THRESHOLD;
  const reasons: string[] = [];
  if (!ok) {
    reasons.push(`Uniqueness ${report.score} < ${PUBLISHING_UNIQUENESS_THRESHOLD}`);
    reasons.push(...report.overlapping);
  } else if (overridden) {
    reasons.push("Admin uniqueness override allowlisted");
  }
  return { ok, score: report.score, overridden, reasons };
}
