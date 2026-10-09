import type { WeddingSectionId } from "@/lib/invitation/wedding-board";

export type WeddingBookPlan = {
  id: string;
  title: string;
  sections: WeddingSectionId[];
};

/** Guest-facing pages for the Edwin & Lordina invitation. */
export const WEDDING_BOOK_PLAN: WeddingBookPlan[] = [
  { id: "welcome", title: "Welcome", sections: ["hero", "family", "greeting"] },
  { id: "day", title: "The Day", sections: ["details", "venue"] },
  { id: "promise", title: "The Promise", sections: ["countdown"] },
  { id: "order", title: "Order of the Day", sections: ["programme", "dressCode", "guestPolicy"] },
  { id: "story", title: "Our Story", sections: ["story"] },
  { id: "moments", title: "Moments", sections: ["gallery", "scratch"] },
  { id: "album", title: "The Album", sections: ["memory"] },
  { id: "respond", title: "Kindly Respond", sections: ["rsvp", "closing"] },
];

export type WeddingBookPage = {
  id: string;
  title: string;
  sections: WeddingSectionId[];
};

export function groupWeddingSectionPages(ids: WeddingSectionId[]): WeddingBookPage[] {
  const present = new Set(ids);
  const used = new Set<WeddingSectionId>();
  const pages: WeddingBookPage[] = [];

  for (const plan of WEDDING_BOOK_PLAN) {
    const sections = plan.sections.filter((id) => present.has(id) && !used.has(id));
    if (!sections.length) continue;
    sections.forEach((id) => used.add(id));
    pages.push({ id: plan.id, title: plan.title, sections });
  }

  const rest = ids.filter((id) => !used.has(id));
  if (rest.length) {
    pages.push({ id: "more", title: "More", sections: rest });
  }
  return pages;
}

export function isEdwinLordinaBook(name1: string, name2: string): boolean {
  const one = name1.trim().toLowerCase();
  const two = name2.trim().toLowerCase();
  return one.startsWith("edwin") && two.startsWith("lordina");
}
