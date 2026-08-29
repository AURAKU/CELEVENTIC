/**
 * Per-layout / per-SKU media identity for catalogue live previews.
 * Object & scenery only — no office stock, no random people portraits.
 * Every catalogue slug should resolve to décor that matches its creative concept.
 */

export interface LayoutMediaPack {
  hero: string;
  background: string;
  gallery: string[];
  /** Optional abstract loop (no people). Omitted for memorial layouts. */
  video?: string;
}

const u = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

const uBg = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1600&q=55&auto=format&fit=crop&blur=6`;

/**
 * Authoritative preview media keyed by layoutSlug and/or catalogue SKU.
 * Prefer catalogue SKU when present so shared-layout Wave-1 templates stay distinct.
 */
export const LAYOUT_MEDIA_IDENTITY: Record<string, LayoutMediaPack> = {
  // Ivory banquet table + soft florals — satin bow classic
  "classic-gold": {
    hero: u("1519225421980-715cb0215aed", 900),
    background: uBg("1519225421980-715cb0215aed"),
    gallery: [
      u("1519225421980-715cb0215aed"),
      u("1523438885200-e635ba2c371e"),
      u("1522413452208-996ff3f3e740"),
      u("1465495976277-4387d4b0b4c6"),
      u("1515934751635-c81c6bc9a2d8"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-golden-bokeh-particles-4552-large.mp4",
  },

  // Onyx stage + gold rings / ring-box — never office or desk stock
  "luxury-rings": {
    hero: u("1605100804763-247f67b3557e", 900),
    background: uBg("1605100804763-247f67b3557e"),
    gallery: [
      u("1605100804763-247f67b3557e"),
      u("1515934751635-c81c6bc9a2d8"),
      u("1523438885200-e635ba2c371e"),
      u("1550684848-fac1c5b4e853"),
      u("1470229722913-7c0e2dbbafd3"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-shining-particles-in-the-dark-4371-large.mp4",
  },

  // Forest canopy + outdoor greenery arch
  "arch-green": {
    hero: u("1441974231531-c6227db76b6e", 900),
    background: uBg("1441974231531-c6227db76b6e"),
    gallery: [
      u("1441974231531-c6227db76b6e"),
      u("1519741497674-611481863552"),
      u("1493246507139-91e8fad9978e"),
      u("1506905925346-21bda4d32df4"),
      u("1513836279014-a89f7a76ae86"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-1173-large.mp4",
  },

  // Timber, lace, outdoor reception décor
  "rustic-lace": {
    hero: u("1464366400600-7168b8af9bc3", 900),
    background: uBg("1464366400600-7168b8af9bc3"),
    gallery: [
      u("1464366400600-7168b8af9bc3"),
      u("1519225421980-715cb0215aed"),
      u("1523438885200-e635ba2c371e"),
      u("1519741497674-611481863552"),
      u("1465495976277-4387d4b0b4c6"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-white-flowers-in-the-wind-1191-large.mp4",
  },

  // Soft florals + dreamy garden geometry
  "boho-hexagon": {
    hero: u("1523438885200-e635ba2c371e", 900),
    background: uBg("1522413452208-996ff3f3e740"),
    gallery: [
      u("1523438885200-e635ba2c371e"),
      u("1522413452208-996ff3f3e740"),
      u("1515934751635-c81c6bc9a2d8"),
      u("1465495976277-4387d4b0b4c6"),
      u("1519225421980-715cb0215aed"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-pink-and-white-petals-falling-1822-large.mp4",
  },

  "floral-garden": {
    hero: u("1522413452208-996ff3f3e740", 900),
    background: uBg("1523438885200-e635ba2c371e"),
    gallery: [
      u("1522413452208-996ff3f3e740"),
      u("1523438885200-e635ba2c371e"),
      u("1515934751635-c81c6bc9a2d8"),
      u("1465495976277-4387d4b0b4c6"),
      u("1519225421980-715cb0215aed"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-pink-roses-in-a-garden-4391-large.mp4",
  },

  // Destination cliffs, sea, travel horizons
  "passport-luxe": {
    hero: u("1516483638261-f4dbaf036963", 900),
    background: uBg("1507525428034-b723cf961d3e"),
    gallery: [
      u("1516483638261-f4dbaf036963"),
      u("1507525428034-b723cf961d3e"),
      u("1476514525535-07fb3b4ae5f1"),
      u("1506905925346-21bda4d32df4"),
      u("1493246507139-91e8fad9978e"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-aerial-panorama-of-a-beach-4249-large.mp4",
  },

  "passport-destination-wedding": {
    hero: u("1507525428034-b723cf961d3e", 900),
    background: uBg("1476514525535-07fb3b4ae5f1"),
    gallery: [
      u("1507525428034-b723cf961d3e"),
      u("1476514525535-07fb3b4ae5f1"),
      u("1516483638261-f4dbaf036963"),
      u("1506905925346-21bda4d32df4"),
      u("1493246507139-91e8fad9978e"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-the-sea-waves-hitting-the-shore-5012-large.mp4",
  },

  // Frost / prism abstract light (acrylic premiere)
  "glass-acrylic": {
    hero: u("1579546929518-9e396f3cc809", 900),
    background: uBg("1550684848-fac1c5b4e853"),
    gallery: [
      u("1579546929518-9e396f3cc809"),
      u("1550684848-fac1c5b4e853"),
      u("1493246507139-91e8fad9978e"),
      u("1506905925346-21bda4d32df4"),
      u("1605100804763-247f67b3557e"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-ink-in-water-35-large.mp4",
  },

  "crystal-acrylic-luxury": {
    hero: u("1550684848-fac1c5b4e853", 900),
    background: uBg("1579546929518-9e396f3cc809"),
    gallery: [
      u("1550684848-fac1c5b4e853"),
      u("1579546929518-9e396f3cc809"),
      u("1605100804763-247f67b3557e"),
      u("1519225421980-715cb0215aed"),
      u("1523438885200-e635ba2c371e"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-shining-particles-in-the-dark-4371-large.mp4",
  },

  // Emerald palace / botanical green
  "royal-emerald-wedding": {
    hero: u("1519741497674-611481863552", 900),
    background: uBg("1441974231531-c6227db76b6e"),
    gallery: [
      u("1519741497674-611481863552"),
      u("1441974231531-c6227db76b6e"),
      u("1513836279014-a89f7a76ae86"),
      u("1523438885200-e635ba2c371e"),
      u("1519225421980-715cb0215aed"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-golden-confetti-falling-on-green-background-4885-large.mp4",
  },

  // Midnight stage lights + velvet soirée atmosphere (no office)
  "midnight-velvet-reception": {
    hero: u("1470229722913-7c0e2dbbafd3", 900),
    background: uBg("1514525253161-7a46d19cd819"),
    gallery: [
      u("1470229722913-7c0e2dbbafd3"),
      u("1514525253161-7a46d19cd819"),
      u("1492684223066-81342ee5ff30"),
      u("1506157786151-b8491531f063"),
      u("1550684848-fac1c5b4e853"),
      u("1470229722913-7c0e2dbbafd3"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-spotlights-on-a-dark-stage-4420-large.mp4",
  },

  // Heritage fabric / celebration colour fields
  "kente-heritage-union": {
    hero: u("1523438885200-e635ba2c371e", 900),
    background: uBg("1519741497674-611481863552"),
    gallery: [
      u("1523438885200-e635ba2c371e"),
      u("1519741497674-611481863552"),
      u("1465495976277-4387d4b0b4c6"),
      u("1519225421980-715cb0215aed"),
      u("1522413452208-996ff3f3e740"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-african-pattern-fabric-texture-43844-large.mp4",
  },

  "traditional-marriage-ceremony": {
    hero: "/templates/traditional-marriage-ceremony.png",
    background: "/templates/traditional-marriage-ceremony.png",
    gallery: [
      "/templates/traditional-marriage-ceremony.png",
      "/templates/traditional-marriage-envelope.png",
      u("1523438885200-e635ba2c371e"),
      u("1519741497674-611481863552"),
      u("1465495976277-4387d4b0b4c6"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-pink-flowers-blowing-in-the-wind-4494-large.mp4",
  },

  // Blush floral aurora / soft romantic wedding
  "forever-afaris-wedding": {
    hero: u("1522413452208-996ff3f3e740", 900),
    background: uBg("1523438885200-e635ba2c371e"),
    gallery: [
      u("1522413452208-996ff3f3e740"),
      u("1523438885200-e635ba2c371e"),
      u("1465495976277-4387d4b0b4c6"),
      u("1515934751635-c81c6bc9a2d8"),
      u("1519225421980-715cb0215aed"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-white-flowers-in-the-wind-1191-large.mp4",
  },

  "floral-garden-romance": {
    hero: u("1523438885200-e635ba2c371e", 900),
    background: uBg("1522413452208-996ff3f3e740"),
    gallery: [
      u("1523438885200-e635ba2c371e"),
      u("1522413452208-996ff3f3e740"),
      u("1515934751635-c81c6bc9a2d8"),
      u("1465495976277-4387d4b0b4c6"),
      u("1519225421980-715cb0215aed"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-close-up-of-pink-rose-petals-4390-large.mp4",
  },

  // Ornamental geometry / soft sacred light via abstract gold
  "golden-islamic-nikkah": {
    hero: u("1550684848-fac1c5b4e853", 900),
    background: uBg("1579546929518-9e396f3cc809"),
    gallery: [
      u("1550684848-fac1c5b4e853"),
      u("1579546929518-9e396f3cc809"),
      u("1605100804763-247f67b3557e"),
      u("1519225421980-715cb0215aed"),
      u("1523438885200-e635ba2c371e"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-light-rays-through-a-stained-glass-window-4439-large.mp4",
  },

  // Solemn forest canopy + quiet light (no party florals)
  "memorial-candle-tribute": {
    hero: u("1513836279014-a89f7a76ae86", 900),
    background: uBg("1513836279014-a89f7a76ae86"),
    gallery: [
      u("1513836279014-a89f7a76ae86"),
      u("1441974231531-c6227db76b6e"),
      u("1493246507139-91e8fad9978e"),
      u("1506905925346-21bda4d32df4"),
      u("1579546929518-9e396f3cc809"),
    ],
  },

  // Neon party energy
  "neon-celebration-party": {
    hero: u("1533174072545-7a4b6ad7a6c3", 900),
    background: uBg("1558636508-e0db3814bd1d"),
    gallery: [
      u("1533174072545-7a4b6ad7a6c3"),
      u("1558636508-e0db3814bd1d"),
      u("1492684223066-81342ee5ff30"),
      u("1514525253161-7a46d19cd819"),
      u("1470229722913-7c0e2dbbafd3"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-neon-lights-in-a-nightclub-4437-large.mp4",
  },

  // Architecture + empty modern venues only (no meeting people stock)
  "corporate-prestige-summit": {
    hero: u("1486406146926-c627a92ad1ab", 900),
    background: uBg("1497366754035-f200968a6e72"),
    gallery: [
      u("1486406146926-c627a92ad1ab"),
      u("1497366754035-f200968a6e72"),
      u("1497366216548-37526070297c"),
      u("1540575467063-178a50c2df87"),
      u("1550684848-fac1c5b4e853"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-building-from-above-43712-large.mp4",
  },
  "executive-boardroom-brief": {
    hero: u("1497366216548-37526070297c", 900),
    background: uBg("1497366811353-687074943afa"),
    gallery: [
      u("1497366216548-37526070297c"),
      u("1497366811353-687074943afa"),
      u("1486406146926-c627a92ad1ab"),
      u("1497366754035-f200968a6e72"),
      u("1540575467063-178a50c2df87"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-modern-office-building-with-glass-facade-4401-large.mp4",
  },
  "product-launch-pulse": {
    hero: u("1550684848-fac1c5b4e853", 900),
    background: uBg("1518770660439-4636190af475"),
    gallery: [
      u("1550684848-fac1c5b4e853"),
      u("1518770660439-4636190af475"),
      u("1540575467063-178a50c2df87"),
      u("1486406146926-c627a92ad1ab"),
      u("1497366754035-f200968a6e72"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-4352-large.mp4",
  },
  "investor-night-pass": {
    hero: u("1519167758481-83f550bb49b3", 900),
    background: uBg("1470229722913-7c0e2dbbafd3"),
    gallery: [
      u("1519167758481-83f550bb49b3"),
      u("1470229722913-7c0e2dbbafd3"),
      u("1486406146926-c627a92ad1ab"),
      u("1497366811353-687074943afa"),
      u("1579546929518-9e396f3cc809"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-shining-particles-in-the-dark-4371-large.mp4",
  },
  "keynote-agenda-flip": {
    hero: u("1540575467063-178a50c2df87", 900),
    background: uBg("1486406146926-c627a92ad1ab"),
    gallery: [
      u("1540575467063-178a50c2df87"),
      u("1486406146926-c627a92ad1ab"),
      u("1497366216548-37526070297c"),
      u("1497366754035-f200968a6e72"),
      u("1518770660439-4636190af475"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-building-from-above-43712-large.mp4",
  },

  // Abstract canvas / creative frame
  "custom-media": {
    hero: u("1579546929518-9e396f3cc809", 900),
    background: uBg("1550684848-fac1c5b4e853"),
    gallery: [
      u("1579546929518-9e396f3cc809"),
      u("1550684848-fac1c5b4e853"),
      u("1493246507139-91e8fad9978e"),
      u("1523438885200-e635ba2c371e"),
      u("1470229722913-7c0e2dbbafd3"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-abstract-digital-animation-28108-large.mp4",
  },

  // Wave-1 paged SKUs that share a layout but need their own gallery story
  "gilded-opulence-pages": {
    hero: u("1519225421980-715cb0215aed", 900),
    background: uBg("1550684848-fac1c5b4e853"),
    gallery: [
      u("1519225421980-715cb0215aed"),
      u("1605100804763-247f67b3557e"),
      u("1523438885200-e635ba2c371e"),
      u("1465495976277-4387d4b0b4c6"),
      u("1515934751635-c81c6bc9a2d8"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-golden-bokeh-particles-4552-large.mp4",
  },
  "emerald-cathedral": {
    hero: u("1519741497674-611481863552", 900),
    background: uBg("1441974231531-c6227db76b6e"),
    gallery: [
      u("1519741497674-611481863552"),
      u("1441974231531-c6227db76b6e"),
      u("1513836279014-a89f7a76ae86"),
      u("1523438885200-e635ba2c371e"),
      u("1493246507139-91e8fad9978e"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-golden-confetti-falling-on-green-background-4885-large.mp4",
  },
  "kente-royale-pages": {
    hero: u("1519741497674-611481863552", 900),
    background: uBg("1523438885200-e635ba2c371e"),
    gallery: [
      u("1519741497674-611481863552"),
      u("1523438885200-e635ba2c371e"),
      u("1465495976277-4387d4b0b4c6"),
      u("1519225421980-715cb0215aed"),
      u("1522413452208-996ff3f3e740"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-african-pattern-fabric-texture-43844-large.mp4",
  },

  // Ghanaian funeral browse SKUs — solemn scenery only
  "black-red-cloth-rite": {
    hero: u("1513836279014-a89f7a76ae86", 900),
    background: uBg("1470229722913-7c0e2dbbafd3"),
    gallery: [
      u("1513836279014-a89f7a76ae86"),
      u("1470229722913-7c0e2dbbafd3"),
      u("1441974231531-c6227db76b6e"),
      u("1493246507139-91e8fad9978e"),
      u("1579546929518-9e396f3cc809"),
    ],
  },
  "white-cloth-homegoing": {
    hero: u("1579546929518-9e396f3cc809", 900),
    background: uBg("1550684848-fac1c5b4e853"),
    gallery: [
      u("1579546929518-9e396f3cc809"),
      u("1550684848-fac1c5b4e853"),
      u("1513836279014-a89f7a76ae86"),
      u("1441974231531-c6227db76b6e"),
      u("1493246507139-91e8fad9978e"),
    ],
  },
  "kente-border-farewell": {
    hero: u("1523438885200-e635ba2c371e", 900),
    background: uBg("1519741497674-611481863552"),
    gallery: [
      u("1523438885200-e635ba2c371e"),
      u("1519741497674-611481863552"),
      u("1465495976277-4387d4b0b4c6"),
      u("1519225421980-715cb0215aed"),
      u("1513836279014-a89f7a76ae86"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-african-pattern-fabric-texture-43844-large.mp4",
  },
  "one-week-vigil-notice": {
    hero: u("1441974231531-c6227db76b6e", 900),
    background: uBg("1513836279014-a89f7a76ae86"),
    gallery: [
      u("1441974231531-c6227db76b6e"),
      u("1513836279014-a89f7a76ae86"),
      u("1493246507139-91e8fad9978e"),
      u("1506905925346-21bda4d32df4"),
      u("1579546929518-9e396f3cc809"),
    ],
  },

  // Birthday browse Wave — décor only, distinct concepts (no shared hero/video)
  "pastel-balloon-garden": {
    hero: u("1530103862676-5938cbbfbf6d", 900),
    background: uBg("1464349095431-e9a21285b5f3"),
    gallery: [
      u("1530103862676-5938cbbfbf6d"),
      u("1464349095431-e9a21285b5f3"),
      u("1465495976277-4387d4b0b4c6"),
      u("1519225421980-715cb0215aed"),
      u("1523438885200-e635ba2c371e"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-birthday-cake-with-candles-and-balloons-4613-large.mp4",
  },
  "gold-glam-milestone": {
    hero: u("1514525253161-7a46d19cd819", 900),
    background: uBg("1605100804763-247f67b3557e"),
    gallery: [
      u("1514525253161-7a46d19cd819"),
      u("1605100804763-247f67b3557e"),
      u("1523438885200-e635ba2c371e"),
      u("1515934751635-c81c6bc9a2d8"),
      u("1519225421980-715cb0215aed"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-golden-bokeh-particles-4552-large.mp4",
  },
  "concert-night-bash": {
    hero: u("1470229722913-7c0e2dbbafd3", 900),
    background: uBg("1492684223066-81342ee5ff30"),
    gallery: [
      u("1470229722913-7c0e2dbbafd3"),
      u("1492684223066-81342ee5ff30"),
      u("1514525253161-7a46d19cd819"),
      u("1579546929518-9e396f3cc809"),
      u("1550684848-fac1c5b4e853"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-concert-lights-on-a-dark-background-4438-large.mp4",
  },
  "surprise-gift-soiree": {
    hero: u("1513201807732-132d4cbd0f2d", 900),
    background: uBg("1493246507139-91e8fad9978e"),
    gallery: [
      u("1513201807732-132d4cbd0f2d"),
      u("1493246507139-91e8fad9978e"),
      u("1464349095431-e9a21285b5f3"),
      u("1519225421980-715cb0215aed"),
      u("1523438885200-e635ba2c371e"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-falling-stars-9455-large.mp4",
  },
  "luxury-fashion-flagship": {
    hero: u("1441986300917-64674bd600d8", 900),
    background: uBg("1441986300917-64674bd600d8"),
    gallery: [
      u("1441986300917-64674bd600d8"),
      u("1515562141207-7a88fb7ce338"),
      u("1558618666-fcd25c85cd64"),
      u("1579546929518-9e396f3cc809"),
      u("1483985988355-763728e1935b"),
    ],
  },
  "femmora-flagship-soft-opening": {
    hero: "/templates/femmora/look-01.jpg",
    background: "/templates/femmora/look-01.jpg",
    gallery: [
      "/templates/femmora/look-crystal-knit.jpg",
      "/templates/femmora/look-floral-mini.jpg",
      "/templates/femmora/look-pearl-gown.jpg",
    ],
  },
};

/** Prefer catalogue SKU pack, then layout pack. */
export function getLayoutMediaPack(
  layoutOrCatalogSlug: string,
  catalogSlug?: string | null
): LayoutMediaPack | undefined {
  if (catalogSlug && LAYOUT_MEDIA_IDENTITY[catalogSlug]) {
    return LAYOUT_MEDIA_IDENTITY[catalogSlug];
  }
  return LAYOUT_MEDIA_IDENTITY[layoutOrCatalogSlug];
}

/** Photo IDs that must never appear on wedding/luxury catalogue previews. */
export const FORBIDDEN_CATALOG_MEDIA_FRAGMENTS = [
  "1454165804606", // desk / laptops meeting
  "1542744173", // conference people
  "1507003211169", // portrait headshot
  "1504384308090", // office workers
  "1556761175-b413da4baf72", // collab people
  "1556761175-5973dc0f32e7", // collab people
  "1511285560929", // poolside balloon crowd (people-heavy, wrong for onyx rings)
] as const;
