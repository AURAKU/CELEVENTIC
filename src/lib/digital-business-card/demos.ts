import type { DigitalCardThemeId } from "./themes";

export type SmartCardDemoPersona = {
  displayName: string;
  title: string;
  company: string;
};

/** Unique dummy identities for public theme previews, never reuse one name across the gallery. */
export const SMARTCARD_THEME_DEMOS: Record<DigitalCardThemeId, SmartCardDemoPersona> = {
  "elegant-frost": { displayName: "Nhyira Addo", title: "Principal", company: "Frost & Co" },
  "midnight-executive": { displayName: "Kwesi Boateng", title: "Managing Partner", company: "Northline" },
  "gold-folio": { displayName: "Ama Serwaa", title: "Creative Director", company: "Folio Maison" },
  "teal-pulse": { displayName: "Yaw Mensah", title: "Growth Lead", company: "Pulse Labs" },
  "charcoal-minimal": { displayName: "Sena Quaye", title: "Design Consultant", company: "Quiet Studio" },
  "savannah-warm": { displayName: "Efua Darko", title: "Hospitality Host", company: "Savannah Table" },
  "glass-noir": { displayName: "Kojo Asante", title: "Studio Founder", company: "Noir Glass" },
  "coral-studio": { displayName: "Akosua Biney", title: "Brand Maker", company: "Coral Room" },
  "executive-noir": { displayName: "Nana Owusu", title: "Chief Executive", company: "Graphite" },
  "titanium-glass": { displayName: "Adjoa Kumi", title: "CTO", company: "Lumen Tech" },
  "ivory-signature": { displayName: "Elikem Sarpong", title: "Private Banker", company: "Ivory Desk" },
  editorial: { displayName: "Abena Osei", title: "Editor-at-Large", company: "Chapter Press" },
  "creator-pulse": { displayName: "Fiifi Lamptey", title: "Content Director", company: "Pulse Atelier" },
  "celebrity-spotlight": { displayName: "Lila Marlowe", title: "Talent", company: "Spotlight" },
  "heritage-luxe": { displayName: "Kofi Amankwah", title: "Atelier Head", company: "Heritage House" },
  "future-gradient": { displayName: "Mawuli Tetteh", title: "Product Lead", company: "Gradient" },
  "corporate-grid": { displayName: "Akua Frimpong", title: "Head of Client", company: "Grid & Partners" },
  "artist-canvas": { displayName: "Nii Armah", title: "Visual Artist", company: "Canvas Room" },
  founder: { displayName: "Selene Addae", title: "Founder", company: "Orbit" },
  aurora: { displayName: "Yaa Boateng", title: "Wellness Host", company: "Aurora Circle" },
  "signature-type": { displayName: "Raphael Quaye", title: "Writer", company: "Signature" },
  "pop-art-burst": { displayName: "Kofi Burst", title: "Creative Director", company: "Studio 21" },
  "comic-halftone": { displayName: "Nia Ink", title: "Illustrator", company: "Panel House" },
  "deco-gilded": { displayName: "Selene Gold", title: "Atelier Director", company: "Maison Or" },
  "ukiyo-wave": { displayName: "Abena Wave", title: "Cultural Curator", company: "Indigo House" },
  "cyber-neon": { displayName: "Elikem Volt", title: "Product Lead", company: "Nightgrid" },
  "afro-future": { displayName: "Kojo Star", title: "Architect", company: "Orbit Atelier" },
  "anime-cel": { displayName: "Yaa Cel", title: "Motion Artist", company: "Frame Nine" },
  "street-king": { displayName: "Malik King", title: "Brand Founder", company: "Block & Crown" },
  "renaissance-foil": { displayName: "Raphael Quill", title: "Gallery Director", company: "Foil & Form" },
  "hollywood-marquee": { displayName: "Lila Marquee", title: "Talent Manager", company: "Goldlight" },
  "velvet-credits": { displayName: "Imani Reel", title: "Producer", company: "Velvet Hour" },
  "desert-reel": { displayName: "Omar Dusk", title: "Director", company: "Amber Road" },
  "rain-city": { displayName: "Mei Lantern", title: "Cinematographer", company: "Night Glass" },
  "silent-silver": { displayName: "Clara Grain", title: "Editor", company: "Silver Frame" },
  "accra-horizon": { displayName: "Kojo Horizon", title: "Civic Architect", company: "Atlantic Studio" },
  "sahara-dune": { displayName: "Zahra Sand", title: "Travel Host", company: "Dune House" },
  "mist-peak": { displayName: "Hana Peak", title: "Landscape Curator", company: "Ink Mountain" },
  "white-cliff": { displayName: "Elena Cliff", title: "Hospitality Lead", company: "Caldera" },
  "nile-gold": { displayName: "Amir River", title: "Cultural Director", company: "Lotus Evening" },
  "table-cape": { displayName: "Thabo Cape", title: "Summit Host", company: "Cloud Table" },
  "canal-light": { displayName: "Lucia Water", title: "Gallery Owner", company: "Lane Atelier" },
  "night-skyline": { displayName: "Jordan Tower", title: "City Planner", company: "Grid Night" },
  "dawn-peak": { displayName: "Asha Summit", title: "Guide", company: "First Light" },
  "lantern-walk": { displayName: "Camille Lamp", title: "Salon Director", company: "Promenade" },
  "glass-spire": { displayName: "Farid Spire", title: "Tower Architect", company: "Air Line" },
  "canopy-green": { displayName: "Iara Leaf", title: "Field Director", company: "Canopy Lab" },
  "saddle-atelier": { displayName: "Henri Saddle", title: "Craft Lead", company: "Tan House" },
  "porcelain-house": { displayName: "Celine Porcelain", title: "Creative Director", company: "Bone Atelier" },
  "ink-salon": { displayName: "Noor Ink", title: "Editor in Chief", company: "Black Page" },
  "chrome-hardware": { displayName: "Lars Chrome", title: "Industrial Designer", company: "Radius" },
  "garden-maison": { displayName: "Ivy Maison", title: "Garden Host", company: "Leaf Court" },
  "ballroom-gold": { displayName: "Sofia Waltz", title: "Ballroom Host", company: "Gilded Hour" },
  "mesa-dusk": { displayName: "Wade Canyon", title: "Scout", company: "Mesa Light" },
  "star-opera": { displayName: "Nova Kite", title: "Composer", company: "Orbit Choir" },
  "spy-night": { displayName: "Vera Glass", title: "Operator", company: "Night Brief" },
  "fog-span": { displayName: "Rowan Mist", title: "Bridge Curator", company: "Span House" },
  "harbor-beacon": { displayName: "Isla Beam", title: "Harbor Host", company: "Beacon Dock" },
  "granite-bay": { displayName: "Rico Peak", title: "Coastal Guide", company: "Bay Cone" },
  "blossom-court": { displayName: "Ren Blossom", title: "Court Host", company: "Night Petal" },
  "dome-dusk": { displayName: "Marco Vault", title: "Monument Lead", company: "Copper Dome" },
  "herringbone-cut": { displayName: "Jules Twill", title: "Cutter", company: "Wool Room" },
  "lacquer-case": { displayName: "Min Case", title: "Lacquer Lead", company: "Gold Inlay" },
  "linen-loom": { displayName: "Freya Weave", title: "Cloth Director", company: "Sun Loom" },
};

export function demoForTheme(id: DigitalCardThemeId | string): SmartCardDemoPersona {
  return SMARTCARD_THEME_DEMOS[id as DigitalCardThemeId] ?? SMARTCARD_THEME_DEMOS["elegant-frost"];
}

export const SMARTCARD_HERO_FAN: DigitalCardThemeId[] = ["velvet-credits", "accra-horizon", "saddle-atelier"];
