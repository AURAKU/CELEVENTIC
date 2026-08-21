import { CELEVENTIC_GUIDE_CATALOG } from "@/lib/celeventic-guide/catalog";
import { START_HERE_JOURNEYS } from "@/lib/celeventic-guide/journeys";
import {
  GUEST_JOURNEY_STAGES,
  PLATFORM_CAPABILITIES,
  PLATFORM_LANES,
} from "@/lib/celeventic-guide/platform-journey";
import { GUIDE_SUPPORT_CONTACT } from "@/lib/celeventic-guide/support-contact";

/** Compact, retrieval-friendly knowledge pack for Guide AI. */
export function buildGuideAssistantKnowledge(): string {
  const journey = GUEST_JOURNEY_STAGES.map(
    (s) => `${s.label}: ${s.summary} Details: ${s.details.join(" ")} Guide: ${s.guideHref}`
  ).join("\n");

  const lanes = PLATFORM_LANES.map(
    (l) =>
      `${l.label} — ${l.title}: ${l.summary}\n` +
      l.steps.map((st) => `  • ${st.title}: ${st.body}`).join("\n") +
      `\n  Guide: ${l.guideHref}`
  ).join("\n\n");

  const caps = PLATFORM_CAPABILITIES.map(
    (c) => `- ${c.label}: ${c.body} (${c.guideHref})`
  ).join("\n");

  const journeys = START_HERE_JOURNEYS.map(
    (j) => `- ${j.title} (${j.role}): ${j.summary} → /guide/${j.slugs[0]}`
  ).join("\n");

  const guides = CELEVENTIC_GUIDE_CATALOG.filter(
    (g) => (g.status ?? "PUBLISHED") === "PUBLISHED" && !g.adminOnly
  )
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((g) => {
      const syn = g.synonyms?.length ? ` | also: ${g.synonyms.join(", ")}` : "";
      const body = g.body ? ` ${g.body}` : "";
      return `• /guide/${g.slug} — ${g.title}: ${g.summary}${body}${syn}`;
    })
    .join("\n");

  const nav = `
Key URLs:
- /guide and /legal/faq — Help & Guides hub (this assistant lives here)
- /guide/how-celeventic-works — full platform walkthrough
- /dashboard — organizer home after login
- /dashboard/events — list/create events
- /dashboard/events/create — create an event
- /dashboard/invitations — Invitation Studio
- /dashboard/design-studio — Design Studio
- Guests, RSVP, seating, QR Admission — under dashboard Guests & Access
- /dashboard/qr-admission — scan guest QR passes
- /dashboard/memory — Memory Vault
- /dashboard/wallet — Event Wallet / billing money flows
- /dashboard/settings — account, branding, billing
- /marketplace — vendor marketplace
- /auth/login and /auth/register — sign in / create account
- /vendor/onboarding — vendor signup flow
`.trim();

  return `
PRODUCT
Celeventic is the Intelligent Event Operating System for celebrations (weddings, funerals, birthdays, corporate, church, private). Guests never need an app — everything runs from secure web links. Hosts run invitations, guests, seating, QR admission, Event Guide, gifts, tickets, marketplace vendors, communications, and Memory Vault from one dashboard.

GUEST JOURNEY (Invite → Remember)
${journey}

OPERATING LANES
${lanes}

CAPABILITIES
${caps}

START HERE PATHS
${journeys}

NAVIGATION
${nav}

PUBLISHED GUIDE TOPICS (prefer linking these)
${guides}

SUPPORT
- Phone / WhatsApp: ${GUIDE_SUPPORT_CONTACT.displayPhone} (Ghana)
- Email: ${GUIDE_SUPPORT_CONTACT.email}
- When stuck, billing disputes, account lockouts, payment failures, bugs you cannot resolve from guides, or the user asks for a human — direct them to WhatsApp or call ${GUIDE_SUPPORT_CONTACT.displayPhone} to speak with ${GUIDE_SUPPORT_CONTACT.label}.
`.trim();
}

const OFF_TOPIC_PATTERNS =
  /\b(weather|homework|recipe|crypto|bitcoin|stock|dating|politics|election|joke|poem|code this|write (me )?a (python|javascript|essay)|medical advice|diagnose|lottery)\b/i;

const PLATFORM_HINT =
  /\b(celeventic|invite|invitation|rsvp|guest|qr|scan|admission|event|organizer|vendor|seating|memory|vault|gift|ticket|marketplace|dashboard|guide|whatsapp|pass|check[- ]?in|template|design studio|onboarding|billing|wallet|host|door staff)\b/i;

export function looksOffTopic(message: string): boolean {
  const q = message.trim();
  if (!q) return true;
  if (OFF_TOPIC_PATTERNS.test(q) && !PLATFORM_HINT.test(q)) return true;
  if (/^(hi|hello|hey|good (morning|afternoon|evening)|thanks|thank you)[\s!.?]*$/i.test(q)) {
    return false;
  }
  return false;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

export type RetrievalHit = {
  slug: string;
  title: string;
  summary: string;
  score: number;
};

/** Lightweight local retrieval over the guide catalog (no LLM). */
export function retrieveGuideTopics(message: string, limit = 4): RetrievalHit[] {
  const tokens = tokenize(message);
  if (tokens.length === 0) return [];

  const scored = CELEVENTIC_GUIDE_CATALOG.filter(
    (g) => (g.status ?? "PUBLISHED") === "PUBLISHED" && !g.adminOnly
  ).map((g) => {
    const hay = [
      g.title,
      g.summary,
      g.body ?? "",
      ...(g.synonyms ?? []),
      ...(g.steps?.map((s) => `${s.title} ${s.body}`) ?? []),
    ]
      .join(" ")
      .toLowerCase();
    let score = 0;
    const titleLower = g.title.toLowerCase();
    const slugLower = g.slug.toLowerCase();
    for (const t of tokens) {
      if (hay.includes(t)) score += 2;
      if (slugLower.includes(t)) score += 4;
      if (titleLower.includes(t)) score += 5;
      if (g.synonyms?.some((s) => s.toLowerCase().includes(t))) score += 4;
    }
    // Prefer direct topic matches (e.g. “rsvp” → RSVP guide)
    if (tokens.some((t) => slugLower === t || slugLower.startsWith(`${t}-`))) score += 8;
    return {
      slug: g.slug,
      title: g.title,
      summary: g.summary,
      score,
    };
  });

  return scored
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function formatSupportHandoff(reason?: string): string {
  const phone = GUIDE_SUPPORT_CONTACT.displayPhone;
  const lead = reason?.trim()
    ? `${reason.trim()} `
    : "For further help with your account or a live agent, ";
  return (
    `${lead}please WhatsApp or call Celeventic Customer Care on ${phone}. ` +
    `You can also email ${GUIDE_SUPPORT_CONTACT.email}.`
  );
}

export const GUIDE_ASSISTANT_SYSTEM_PROMPT = `You are Celeventic Guide AI — a professional, concise customer assistant for the Celeventic event platform only.

HARD RULES
1. Answer ONLY questions about Celeventic: how it works, navigation, invitations, RSVP, QR admission, Event Guide, gifts, vendors, Memory Vault, dashboard features, packages/billing concepts, guest vs host vs scanner vs vendor roles, and troubleshooting those flows.
2. If the user asks about anything unrelated (general knowledge, other products, coding homework, politics, medical/legal advice, etc.), politely refuse in 1–2 sentences and invite a Celeventic question. Do not answer the off-topic request.
3. Never invent features, prices, or policies not supported by the knowledge below. If unsure, say so and escalate to human support.
4. Prefer short, clear steps. Point users to /guide/<slug> topics when helpful.
5. When the issue needs a human (payments stuck, account access, bugs, disputes, angry/frustrated users, or they ask for an agent), end with escalation to WhatsApp or call ${GUIDE_SUPPORT_CONTACT.displayPhone} (Customer Care). Mention email ${GUIDE_SUPPORT_CONTACT.email} when useful.
6. Tone: warm, professional, calm — like a skilled support agent. No slang, no emoji overload (at most one if natural).
7. Do not claim you can change account settings, refund, or access private data. You only guide.
8. Guests do not need an app install. Music/video never autoplay unmuted.

Use the knowledge pack as your source of truth.`;
