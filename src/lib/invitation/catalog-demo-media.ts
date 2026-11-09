/**
 * Unique theme-fit demo stills for public catalogue live previews.
 * Local AI heroes live in /public/demo-media/{slug}/hero.jpg, never client portraits.
 */
import type { LayoutMediaPack } from "@/lib/invitation/layout-media-identity";

const u = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

function demoPack(
  slug: string,
  extras: string[],
  video?: string
): LayoutMediaPack {
  const hero = `/demo-media/${slug}/hero.jpg`;
  return {
    hero,
    background: hero,
    gallery: [hero, ...extras],
    ...(video ? { video } : {}),
  };
}

/** Browse SKUs with dedicated cinematic stills. Femmora keeps the house lookbook. */
export const CATALOG_DEMO_MEDIA: Record<string, LayoutMediaPack> = {
  "classic-gold": demoPack(
    "classic-gold",
    [u("1515934751635-c81c6bc9a2d8"), u("1465495976277-4387d4b0b4c6")],
    "https://assets.mixkit.co/videos/preview/mixkit-golden-bokeh-particles-4552-large.mp4"
  ),
  "luxury-rings": demoPack(
    "luxury-rings",
    [u("1605100804763-247f67b3557e"), u("1550684848-fac1c5b4e853")],
    "https://assets.mixkit.co/videos/preview/mixkit-shining-particles-in-the-dark-4371-large.mp4"
  ),
  "rustic-lace": demoPack(
    "rustic-lace",
    [u("1464366400600-7168b8af9bc3"), u("1519225421980-715cb0215aed")],
    "https://assets.mixkit.co/videos/preview/mixkit-white-flowers-in-the-wind-1191-large.mp4"
  ),
  "boho-hexagon": demoPack(
    "boho-hexagon",
    [u("1523438885200-e635ba2c371e"), u("1522413452208-996ff3f3e740")],
    "https://assets.mixkit.co/videos/preview/mixkit-pink-and-white-petals-falling-1822-large.mp4"
  ),
  "royal-emerald-wedding": demoPack(
    "royal-emerald-wedding",
    [u("1519741497674-611481863552"), u("1441974231531-c6227db76b6e")],
    "https://assets.mixkit.co/videos/preview/mixkit-golden-confetti-falling-on-green-background-4885-large.mp4"
  ),
  "midnight-velvet-reception": demoPack(
    "midnight-velvet-reception",
    [u("1514525253161-7a46d19cd819"), u("1506157786151-b8491531f063")],
    "https://assets.mixkit.co/videos/preview/mixkit-spotlights-on-a-dark-stage-4420-large.mp4"
  ),
  "traditional-marriage-ceremony": demoPack(
    "traditional-marriage-ceremony",
    [u("1465495976277-4387d4b0b4c6"), u("1519741497674-611481863552")],
    "https://assets.mixkit.co/videos/preview/mixkit-pink-flowers-blowing-in-the-wind-4494-large.mp4"
  ),
  "forever-afaris-wedding": demoPack(
    "forever-afaris-wedding",
    [u("1522413452208-996ff3f3e740"), u("1515934751635-c81c6bc9a2d8")],
    "https://assets.mixkit.co/videos/preview/mixkit-close-up-of-pink-rose-petals-4390-large.mp4"
  ),
  "aurelia-editorial-wedding": demoPack(
    "aurelia-editorial-wedding",
    [u("1519225421980-715cb0215aed"), u("1523438885200-e635ba2c371e")],
    "https://assets.mixkit.co/videos/preview/mixkit-pink-roses-in-a-garden-4391-large.mp4"
  ),
  "floral-garden-romance": demoPack(
    "floral-garden-romance",
    [u("1523438885200-e635ba2c371e"), u("1465495976277-4387d4b0b4c6")],
    "https://assets.mixkit.co/videos/preview/mixkit-pink-and-white-petals-falling-1822-large.mp4"
  ),
  "passport-destination-wedding": demoPack(
    "passport-destination-wedding",
    [u("1507525428034-b723cf961d3e"), u("1516483638261-f4dbaf036963")],
    "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-the-sea-waves-hitting-the-shore-5012-large.mp4"
  ),
  "crystal-acrylic-luxury": demoPack(
    "crystal-acrylic-luxury",
    [u("1579546929518-9e396f3cc809"), u("1550684848-fac1c5b4e853")],
    "https://assets.mixkit.co/videos/preview/mixkit-ink-in-water-35-large.mp4"
  ),
  "golden-islamic-nikkah": demoPack(
    "golden-islamic-nikkah",
    [u("1550684848-fac1c5b4e853"), u("1579546929518-9e396f3cc809")],
    "https://assets.mixkit.co/videos/preview/mixkit-light-rays-through-a-stained-glass-window-4439-large.mp4"
  ),
  "neon-celebration-party": demoPack(
    "neon-celebration-party",
    [u("1533174072545-7a4b6ad7a6c3"), u("1558636508-e0db3814bd1d")],
    "https://assets.mixkit.co/videos/preview/mixkit-neon-lights-in-a-nightclub-4437-large.mp4"
  ),
  "pastel-balloon-garden": demoPack(
    "pastel-balloon-garden",
    [u("1530103862676-5938cbbfbf6d"), u("1464349095431-e9a21285b5f3")],
    "https://assets.mixkit.co/videos/preview/mixkit-birthday-cake-with-candles-and-balloons-4613-large.mp4"
  ),
  "gold-glam-milestone": demoPack(
    "gold-glam-milestone",
    [u("1514525253161-7a46d19cd819"), u("1605100804763-247f67b3557e")],
    "https://assets.mixkit.co/videos/preview/mixkit-falling-stars-9455-large.mp4"
  ),
  "concert-night-bash": demoPack(
    "concert-night-bash",
    [u("1470229722913-7c0e2dbbafd3"), u("1492684223066-81342ee5ff30")],
    "https://assets.mixkit.co/videos/preview/mixkit-concert-lights-on-a-dark-background-4438-large.mp4"
  ),
  "surprise-gift-soiree": demoPack(
    "surprise-gift-soiree",
    [u("1513201807732-132d4cbd0f2d"), u("1493246507139-91e8fad9978e")],
    "https://assets.mixkit.co/videos/preview/mixkit-golden-bokeh-particles-4552-large.mp4"
  ),
  "corporate-prestige-summit": demoPack(
    "corporate-prestige-summit",
    [u("1486406146926-c627a92ad1ab"), u("1497366754035-f200968a6e72")],
    "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-building-from-above-43712-large.mp4"
  ),
  "executive-boardroom-brief": demoPack(
    "executive-boardroom-brief",
    [u("1497366216548-37526070297c"), u("1497366811353-687074943afa")],
    "https://assets.mixkit.co/videos/preview/mixkit-modern-office-building-with-glass-facade-4401-large.mp4"
  ),
  "product-launch-pulse": demoPack(
    "product-launch-pulse",
    [u("1518770660439-4636190af475"), u("1540575467063-178a50c2df87")],
    "https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-futuristic-devices-4352-large.mp4"
  ),
  "investor-night-pass": demoPack(
    "investor-night-pass",
    [u("1519167758481-83f550bb49b3"), u("1470229722913-7c0e2dbbafd3")],
    "https://assets.mixkit.co/videos/preview/mixkit-shining-particles-in-the-dark-4371-large.mp4"
  ),
  "keynote-agenda-flip": demoPack(
    "keynote-agenda-flip",
    [u("1540575467063-178a50c2df87"), u("1486406146926-c627a92ad1ab")],
    "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-building-from-above-43712-large.mp4"
  ),
  "custom-media": demoPack(
    "custom-media",
    [u("1579546929518-9e396f3cc809"), u("1493246507139-91e8fad9978e")],
    "https://assets.mixkit.co/videos/preview/mixkit-abstract-digital-animation-28108-large.mp4"
  ),
  "gilded-opulence-pages": demoPack(
    "gilded-opulence-pages",
    [u("1605100804763-247f67b3557e"), u("1550684848-fac1c5b4e853")],
    "https://assets.mixkit.co/videos/preview/mixkit-golden-confetti-falling-on-green-background-4885-large.mp4"
  ),
  "emerald-cathedral": demoPack(
    "emerald-cathedral",
    [u("1519741497674-611481863552"), u("1513836279014-a89f7a76ae86")],
    "https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-1173-large.mp4"
  ),
  "kente-royale-pages": demoPack(
    "kente-royale-pages",
    [u("1519741497674-611481863552"), u("1465495976277-4387d4b0b4c6")],
    "https://assets.mixkit.co/videos/preview/mixkit-african-pattern-fabric-texture-43844-large.mp4"
  ),
  "candlelight-elegy-pages": demoPack("candlelight-elegy-pages", [
    u("1513836279014-a89f7a76ae86"),
    u("1438032005730-c779502df39b"),
  ]),
  "black-red-cloth-rite": demoPack("black-red-cloth-rite", [
    u("1550684848-fac1c5b4e853"),
    u("1470229722913-7c0e2dbbafd3"),
  ]),
  "white-cloth-homegoing": demoPack("white-cloth-homegoing", [
    u("1507692049794-de58290a4334"),
    u("1438230683412-84cbd1ebd3d6"),
  ]),
  "kente-border-farewell": demoPack("kente-border-farewell", [
    u("1506905925346-21bda4d32df4"),
    u("1493246507139-91e8fad9978e"),
  ]),
  "one-week-vigil-notice": demoPack("one-week-vigil-notice", [
    u("1441974231531-c6227db76b6e"),
    u("1513836279014-a89f7a76ae86"),
  ]),
};

export function getCatalogDemoMediaPack(catalogSlug?: string | null): LayoutMediaPack | undefined {
  if (!catalogSlug) return undefined;
  return CATALOG_DEMO_MEDIA[catalogSlug];
}
