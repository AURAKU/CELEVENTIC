/**
 * Per-layout media identity — every catalogue template gets its own hero,
 * background, gallery set, and optional motion clip. No layout shares assets.
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

/** Unique visual assets keyed by layoutSlug — authoritative for previews & demos */
export const LAYOUT_MEDIA_IDENTITY: Record<string, LayoutMediaPack> = {
  "classic-gold": {
    hero: u("1519225421980-715cb0215aed", 900),
    background: uBg("1519225421980-715cb0215aed"),
    gallery: [
      u("1519225421980-715cb0215aed"),
      u("1465496636074-5fa5b4d39ca0"),
      u("1519741497674-611481863552"),
      u("1522673607200-164d1b6ce486"),
      u("1464366400600-7168b8af9bc3"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-golden-bokeh-particles-4552-large.mp4",
  },
  "luxury-rings": {
    hero: u("1511285560929-80b456fea0bc", 900),
    background: uBg("1454165804606-c3d57bc86b40"),
    gallery: [
      u("1511285560929-80b456fea0bc"),
      u("1454165804606-c3d57bc86b40"),
      u("1507003211169-0a1dd7228f2d"),
      u("1515934751635-c81c6bc9a2d8"),
      u("1470225620780-dba8ba36b745"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-white-lights-turned-on-2328-large.mp4",
  },
  "arch-green": {
    hero: u("1519741497674-611481863552", 900),
    background: uBg("1465142134349-bc99b30851d7"),
    gallery: [
      u("1519741497674-611481863552"),
      u("1465142134349-bc99b30851d7"),
      u("1493246507139-91e8fad9978e"),
      u("1506905925346-21bda4d32df4"),
      u("1441974231531-c6227db76b6e"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-1173-large.mp4",
  },
  "rustic-lace": {
    hero: u("1464366400600-7168b8af9bc3", 900),
    background: uBg("1464366400600-7168b8af9bc3"),
    gallery: [
      u("1464366400600-7168b8af9bc3"),
      u("1519225421980-715cb0215aed"),
      u("1470225620780-dba8ba36b745"),
      u("1520854221256-17451cc791c8"),
      u("1467810563316-b5476525c0f9"),
    ],
  },
  "boho-hexagon": {
    hero: u("1522673607200-164d1b6ce486", 900),
    background: uBg("1500530858147-3ebd6706902a"),
    gallery: [
      u("1522673607200-164d1b6ce486"),
      u("1500530858147-3ebd6706902a"),
      u("1490753840271-33f5eda53cce"),
      u("1515934751635-c81c6bc9a2d8"),
      u("1520854221256-17451cc791c8"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-pink-and-white-petals-falling-1822-large.mp4",
  },
  "floral-garden": {
    hero: u("1490753840271-33f5eda53cce", 900),
    background: uBg("1490753840271-33f5eda53cce"),
    gallery: [
      u("1490753840271-33f5eda53cce"),
      u("1465142134349-bc99b30851d7"),
      u("1522673607200-164d1b6ce486"),
      u("1515934751635-c81c6bc9a2d8"),
      u("1465496636074-5fa5b4d39ca0"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-pink-roses-in-a-garden-4391-large.mp4",
  },
  "passport-luxe": {
    hero: u("1516483638261-f4dbaf036963", 900),
    background: uBg("1507525428034-b723cf961d3e"),
    gallery: [
      u("1516483638261-f4dbaf036963"),
      u("1507525428034-b723cf961d3e"),
      u("1476514525535-07fb3b4ae5f1"),
      u("1506905925346-21bda4d32df4"),
      u("1469470599675-3bb6f7135b58"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-aerial-panorama-of-a-beach-4249-large.mp4",
  },
  "glass-acrylic": {
    hero: u("1557683311-eac922347aa5", 900),
    background: uBg("1557683311-eac922347aa5"),
    gallery: [
      u("1557683311-eac922347aa5"),
      u("1618005182384-a83a8bd037ee"),
      u("1519681393784-d120dffb4f9d"),
      u("1506905925346-21bda4d32df4"),
      u("1493246507139-91e8fad9978e"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-ink-in-water-35-large.mp4",
  },
  "royal-emerald-wedding": {
    hero: u("1522673607200-164d1b6ce486", 900),
    background: uBg("1518176259837-2cce73d5c2b4"),
    gallery: [
      u("1518176259837-2cce73d5c2b4"),
      u("1519741497674-611481863552"),
      u("1465496636074-5fa5b4d39ca0"),
      u("1519225421980-715cb0215aed"),
      u("1470225620780-dba8ba36b745"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-golden-confetti-falling-on-green-background-4885-large.mp4",
  },
  "midnight-velvet-reception": {
    hero: u("1514525253161-7a46d19cd819", 900),
    background: uBg("1470229722913-7c0e2dbbafd3"),
    gallery: [
      u("1470229722913-7c0e2dbbafd3"),
      u("1514525253161-7a46d19cd819"),
      u("1459749411176-04bf1dffd275"),
      u("1506157786151-b8491531f063"),
      u("1454165804606-c3d57bc86b40"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-spotlights-on-a-dark-stage-4420-large.mp4",
  },
  "kente-heritage-union": {
    hero: u("1594736797933-d0cbc0b043bd", 900),
    background: uBg("1583391734527-9a47b0f01fb8"),
    gallery: [
      u("1594736797933-d0cbc0b043bd"),
      u("1583391734527-9a47b0f01fb8"),
      u("1519741497674-611481863552"),
      u("1465496636074-5fa5b4d39ca0"),
      u("1519225421980-715cb0215aed"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-african-pattern-fabric-texture-43844-large.mp4",
  },
  "floral-garden-romance": {
    hero: u("1465142134349-bc99b30851d7", 900),
    background: uBg("1522673607200-164d1b6ce486"),
    gallery: [
      u("1465142134349-bc99b30851d7"),
      u("1490753840271-33f5eda53cce"),
      u("1515934751635-c81c6bc9a2d8"),
      u("1520854221256-17451cc791c8"),
      u("1500530858147-3ebd6706902a"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-close-up-of-pink-rose-petals-4390-large.mp4",
  },
  "passport-destination-wedding": {
    hero: u("1507525428034-b723cf961d3e", 900),
    background: uBg("1476514525535-07fb3b4ae5f1"),
    gallery: [
      u("1507525428034-b723cf961d3e"),
      u("1476514525535-07fb3b4ae5f1"),
      u("1506905925346-21bda4d32df4"),
      u("1516483638261-f4dbaf036963"),
      u("1469470599675-3bb6f7135b58"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-the-sea-waves-hitting-the-shore-5012-large.mp4",
  },
  "crystal-acrylic-luxury": {
    hero: u("1618005182384-a83a8bd037ee", 900),
    background: uBg("1618005182384-a83a8bd037ee"),
    gallery: [
      u("1618005182384-a83a8bd037ee"),
      u("1557683311-eac922347aa5"),
      u("1519681393784-d120dffb4f9d"),
      u("1519225421980-715cb0215aed"),
      u("1470225620780-dba8ba36b745"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-shining-particles-in-the-dark-4371-large.mp4",
  },
  "golden-islamic-nikkah": {
    hero: u("1564769662533-4f00a747b575", 900),
    background: uBg("1591604126109-d63b8cfc0e78"),
    gallery: [
      u("1564769662533-4f00a747b575"),
      u("1591604126109-d63b8cfc0e78"),
      u("1519741497674-611481863552"),
      u("1518176259837-2cce73d5c2b4"),
      u("1465496636074-5fa5b4d39ca0"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-light-rays-through-a-stained-glass-window-4439-large.mp4",
  },
  "memorial-candle-tribute": {
    hero: u("1513836279014-a89f7a76ae86", 900),
    background: uBg("1513836279014-a89f7a76ae86"),
    gallery: [
      u("1513836279014-a89f7a76ae86"),
      u("1490753840271-33f5eda53cce"),
      u("1438230683412-84cbd1ebd3d6"),
      u("1504052434569-70ad58380627"),
      u("1518176259837-2cce73d5c2b4"),
    ],
  },
  "neon-celebration-party": {
    hero: u("1533174072545-7a4b6ad7a6c3", 900),
    background: uBg("1530103862676-67c8c5645227"),
    gallery: [
      u("1533174072545-7a4b6ad7a6c3"),
      u("1530103862676-67c8c5645227"),
      u("1558636508-e0db3814bd1d"),
      u("1492684223066-81342ee5ff30"),
      u("1514525253161-7a46d19cd819"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-neon-lights-in-a-nightclub-4437-large.mp4",
  },
  "corporate-prestige-summit": {
    hero: u("1486406146926-c627a92ad1ab", 900),
    background: uBg("1497366216548-37526070297c"),
    gallery: [
      u("1486406146926-c627a92ad1ab"),
      u("1497366216548-37526070297c"),
      u("1542744173-8e7e53415bb0"),
      u("1454165804606-c3d57bc86b40"),
      u("1504384308090-c894fdcc538d"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-building-from-above-43712-large.mp4",
  },
  "custom-media": {
    hero: u("1557683311-eac922347aa5", 900),
    background: uBg("1504384308090-c894fdcc538d"),
    gallery: [
      u("1557683311-eac922347aa5"),
      u("1504384308090-c894fdcc538d"),
      u("1492684223066-81342ee5ff30"),
      u("1516483638261-f4dbaf036963"),
      u("1470229722913-7c0e2dbbafd3"),
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-abstract-digital-animation-28108-large.mp4",
  },
};

export function getLayoutMediaPack(layout: string): LayoutMediaPack | undefined {
  return LAYOUT_MEDIA_IDENTITY[layout];
}
