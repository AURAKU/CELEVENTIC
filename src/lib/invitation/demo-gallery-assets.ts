/** Stable demo media for catalog + studio previews (royalty-free Picsum seeds). */
const HERO: Record<string, string> = {
  "classic-gold": "https://picsum.photos/seed/celeventic-classic-gold/900/1100",
  "arch-green": "https://picsum.photos/seed/celeventic-arch-green/900/1100",
  "rustic-lace": "https://picsum.photos/seed/celeventic-rustic-lace/900/1200",
  "boho-hexagon": "https://picsum.photos/seed/celeventic-boho/900/1100",
  "luxury-rings": "https://picsum.photos/seed/celeventic-luxury-rings/900/1100",
  "custom-media": "https://picsum.photos/seed/celeventic-custom-media/1200/800",
  "passport-luxe": "https://picsum.photos/seed/celeventic-passport/900/1100",
  "glass-acrylic": "https://picsum.photos/seed/celeventic-glass/900/1100",
  "floral-garden": "https://picsum.photos/seed/celeventic-floral/900/1100",
  "royal-emerald-wedding": "https://picsum.photos/seed/celeventic-emerald/900/1100",
  "midnight-velvet-reception": "https://picsum.photos/seed/celeventic-velvet/900/1100",
  "kente-heritage-union": "https://picsum.photos/seed/celeventic-kente/900/1100",
  "floral-garden-romance": "https://picsum.photos/seed/celeventic-garden-romance/900/1100",
  "passport-destination-wedding": "https://picsum.photos/seed/celeventic-destination/900/1100",
  "crystal-acrylic-luxury": "https://picsum.photos/seed/celeventic-crystal/900/1100",
  "golden-islamic-nikkah": "https://picsum.photos/seed/celeventic-nikkah/900/1100",
  "memorial-candle-tribute": "https://picsum.photos/seed/celeventic-memorial/900/1100",
  "neon-celebration-party": "https://picsum.photos/seed/celeventic-neon/900/1100",
  "corporate-prestige-summit": "https://picsum.photos/seed/celeventic-corporate/1200/800",
};

const GALLERY_POOL = [
  "https://picsum.photos/seed/celeventic-g1/800/1000",
  "https://picsum.photos/seed/celeventic-g2/800/1000",
  "https://picsum.photos/seed/celeventic-g3/800/1000",
  "https://picsum.photos/seed/celeventic-g4/800/1000",
  "https://picsum.photos/seed/celeventic-g5/800/1000",
  "https://picsum.photos/seed/celeventic-g6/800/1000",
];

export function getDemoHeroUrl(layout: string): string {
  return HERO[layout] ?? HERO["classic-gold"];
}

export function getDemoGalleryUrls(layout: string, count = 5): string[] {
  const hero = getDemoHeroUrl(layout);
  const offset = layout.length % 3;
  const picks = GALLERY_POOL.slice(offset, offset + count);
  return [hero, ...picks.filter((u) => u !== hero)].slice(0, count);
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}
