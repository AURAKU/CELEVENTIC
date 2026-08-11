/**
 * §63 Zero-Experience Guest Mode
 */
import { guideStorageKey } from "./tour-storage";

export type GuestIntroStatus = "completed" | "skipped";
export interface GuestIntroRecord { status: GuestIntroStatus; at: number; }
export interface GuestHelpStep { title: string; body: string; }
export interface GuestContextualTopic {
  id: string; triggerLabel: string; title: string; what: string; doNext: string; why: string; after: string;
  steps: GuestHelpStep[]; guideSlug: string;
}
export interface GuestQuickAction {
  id: string; label: string; description: string; href: string; guideSlug?: string; sectionId?: string;
}

export function guestIntroStorageId(invitationId: string, guestId?: string | null): string {
  const safeInvite = (invitationId || "unknown").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "unknown";
  const safeGuest = (guestId || "anon").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "anon";
  return `${safeInvite}:${safeGuest}`;
}
export function guestIntroStorageKey(invitationId: string, guestId?: string | null): string {
  return guideStorageKey("guest-intro", guestIntroStorageId(invitationId, guestId));
}
function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const probe = "__celeventic_guide_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch { return null; }
}
export function loadGuestIntroRecord(invitationId: string, guestId?: string | null): GuestIntroRecord | null {
  const store = safeStorage();
  if (!store) return null;
  try {
    const raw = store.getItem(guestIntroStorageKey(invitationId, guestId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestIntroRecord;
    if (parsed?.status !== "completed" && parsed?.status !== "skipped") return null;
    return parsed;
  } catch { return null; }
}
export function hasFinishedGuestIntro(invitationId: string, guestId?: string | null): boolean {
  return loadGuestIntroRecord(invitationId, guestId) != null;
}
export function rememberGuestIntro(invitationId: string, status: GuestIntroStatus, guestId?: string | null): void {
  const store = safeStorage();
  if (!store) return;
  try { store.setItem(guestIntroStorageKey(invitationId, guestId), JSON.stringify({ status, at: Date.now() })); } catch { /* */ }
}
export function clearGuestIntro(invitationId: string, guestId?: string | null): void {
  const store = safeStorage();
  if (!store) return;
  try { store.removeItem(guestIntroStorageKey(invitationId, guestId)); } catch { /* */ }
}

export const GUEST_ZERO_INTRO_BEATS = [
  { id: "invitation", title: "Invitation", caption: "This is your invitation", narration: "Open the link. Read who invited you and when the event is.", what: "A digital invitation from your host.", doNext: "Look at the date, place, and message.", why: "So you know what you are invited to.", after: "Next, tell the host if you can come.", durationMs: 5200 },
  { id: "rsvp", title: "RSVP", caption: "Say if you are coming", narration: "RSVP means reply. Tap Accept, Decline, or Maybe.", what: "A short reply to the host.", doNext: "Choose Accept, Decline, or Maybe.", why: "The host needs a headcount.", after: "You can change your reply later from this same link.", durationMs: 5200 },
  { id: "qr", title: "QR pass", caption: "Your entry pass", narration: "Your QR code is your pass at the door. Keep this link on your phone.", what: "A personal code that proves you are invited.", doNext: "Find Your Pass on the invitation and save it.", why: "Staff scan it so entry is fast and safe.", after: "On event day, show the bright QR at the entrance.", durationMs: 5500 },
  { id: "event-guide", title: "Event Guide", caption: "Your day-of helper", narration: "Event Guide shows the plan for the day — programme, menu, and more.", what: "A simple helper for the celebration day.", doNext: "Open Event Guide when the host shares it.", why: "So you do not need to ask every detail.", after: "You can reopen it anytime during the event.", durationMs: 5200 },
  { id: "seating", title: "Seating", caption: "Find your table", narration: "Search your name to see your table and seat.", what: "Where you sit at the venue.", doNext: "Use Find my seat or Event Guide seating.", why: "So you know where to go when you arrive.", after: "Follow ushers if the room layout is new to you.", durationMs: 5000 },
  { id: "event-day", title: "Event Day", caption: "When you arrive", narration: "Show your QR, then use Event Guide for seating and the programme.", what: "What happens when you get to the venue.", doNext: "Arrive with your QR ready and brightness up.", why: "Entry and seating stay calm for everyone.", after: "After you enter, enjoy the day with the guide on your phone.", durationMs: 5200 },
  { id: "memory", title: "Memory Vault", caption: "Share photos later", narration: "After (or during) the day, share photos and videos in Memory Vault.", what: "A shared album for the celebration.", doNext: "Tap Share photos when you are ready.", why: "Everyone can relive the moments together.", after: "You can return to the same invitation link anytime.", durationMs: 5200 },
] as const;

export const GUEST_CONTEXTUAL_TOPICS: GuestContextualTopic[] = [
  { id: "rsvp", triggerLabel: "What does RSVP mean?", title: "What does RSVP mean?", what: "RSVP means “please reply.”", doNext: "Tap Accept if you will come, Decline if not, or Maybe if unsure.", why: "Your host needs to know how many people to plan for.", after: "Your reply is saved. You can open this link again to change it.", steps: [{ title: "Read the invitation", body: "Check the date and place first." }, { title: "Choose a reply", body: "Accept, Decline, or Maybe." }, { title: "Add party size if asked", body: "Only count people the host allowed." }, { title: "Save", body: "You are done — keep this link." }], guideSlug: "rsvp" },
  { id: "qr", triggerLabel: "How do I use this QR code?", title: "How do I use this QR code?", what: "This QR is your entry pass.", doNext: "On event day, open this page and show the code to staff.", why: "It proves you were invited and speeds up entry.", after: "After scanning, follow staff and open Event Guide if you need seating.", steps: [{ title: "Keep the link", body: "Do not delete the invitation message." }, { title: "Open Your Pass", body: "Scroll to the QR on this invitation." }, { title: "Brightness up", body: "Make the screen bright for scanning." }, { title: "Show at the door", body: "Hold still until staff confirm." }], guideSlug: "your-qr-admission-pass" },
  { id: "party", triggerLabel: "Who can come with me?", title: "Who can come with me?", what: "Your party size is how many people this invite covers.", doNext: "Only bring the number of seats the host gave you.", why: "Tables and food are planned from your reply.", after: "Each person may need their own QR if the host set that up.", steps: [{ title: "Check the number", body: "Look for party seats near RSVP." }, { title: "Count carefully", body: "Include yourself in the total." }, { title: "Do not add extras", body: "Ask the host before bringing more people." }], guideSlug: "choose-party-size" },
  { id: "seating", triggerLabel: "How do I find my table?", title: "How do I find my table?", what: "Seating shows your table and seat name.", doNext: "Tap Find my seat or open Event Guide seating.", why: "So you know where to sit without asking around.", after: "If your name is missing, contact the host — do not guess another seat.", steps: [{ title: "Open seating", body: "Use Find my seat on the invitation." }, { title: "Search your name", body: "Type a few letters of your name." }, { title: "Note the table", body: "Remember the table number." }, { title: "Ask an usher", body: "They can point you to the right area." }], guideSlug: "find-your-seat" },
  { id: "event-guide", triggerLabel: "What is Event Guide?", title: "What is Event Guide?", what: "Event Guide is your day-of helper on your phone.", doNext: "Open it for programme, menu, seating, and venue notes.", why: "You get answers without interrupting the hosts.", after: "Keep it bookmarked — reopen anytime during the event.", steps: [{ title: "Open the guide", body: "Use the Event Guide link or QR from your host." }, { title: "Pick a tab", body: "Programme, seating, menu, or location." }, { title: "Follow along", body: "Check back when the schedule moves on." }], guideSlug: "event-guide-guest" },
  { id: "memory", triggerLabel: "How do I share photos?", title: "How do I share photos?", what: "Memory Vault is the shared album for this event.", doNext: "Tap Share photos & videos, then upload from your phone.", why: "Everyone’s moments live in one place for the hosts.", after: "You can return later to view what others shared.", steps: [{ title: "Open Memory Vault", body: "Find Share photos on this invitation." }, { title: "Allow access", body: "Let your phone pick photos or videos." }, { title: "Upload", body: "Wait for the success message." }, { title: "View album", body: "Browse what others shared when ready." }], guideSlug: "memory-vault-guest" },
  { id: "event-day", triggerLabel: "What happens after I enter?", title: "What happens after I enter?", what: "After your QR is scanned, you are inside the celebration.", doNext: "Find your seat, follow the programme, and enjoy.", why: "Clear next steps keep the day calm for everyone.", after: "Later you can share photos and leave a wish from this same link.", steps: [{ title: "Follow staff", body: "They guide you past the entrance." }, { title: "Open Event Guide", body: "Check seating and the programme." }, { title: "Sit and celebrate", body: "Phones on silent during key moments." }, { title: "Share later", body: "Upload memories when it feels right." }], guideSlug: "event-day-access" },
];
export function getGuestContextualTopic(id: string): GuestContextualTopic | null {
  return GUEST_CONTEXTUAL_TOPICS.find((t) => t.id === id) ?? null;
}
export const GUEST_QUICK_ACTIONS: GuestQuickAction[] = [
  { id: "open-invitation", label: "Open My Invitation", description: "Go back to the top of your invite.", href: "/guide?role=GUEST&q=invitation", guideSlug: "open-your-invitation", sectionId: "welcome" },
  { id: "rsvp", label: "RSVP", description: "Say if you are coming.", href: "/guide?role=GUEST&q=rsvp", guideSlug: "rsvp", sectionId: "rsvp" },
  { id: "show-qr", label: "Show My QR", description: "Find your entry pass.", href: "/guide?role=GUEST&q=qr", guideSlug: "your-qr-admission-pass", sectionId: "pass" },
  { id: "find-seat", label: "Find My Seat", description: "See your table and seat.", href: "/guide?role=GUEST&q=seat", guideSlug: "find-your-seat", sectionId: "pass" },
  { id: "programme", label: "View Programme", description: "See the order of the day.", href: "/guide?role=GUEST&q=programme", guideSlug: "programme" },
  { id: "menu", label: "View Menu", description: "See what is being served.", href: "/guide?role=GUEST&q=menu", guideSlug: "menu" },
  { id: "location", label: "Event Location", description: "Find the venue and directions.", href: "/guide?role=GUEST&q=venue", guideSlug: "venue-and-directions", sectionId: "venue" },
  { id: "share-photos", label: "Share Photos & Videos", description: "Upload to the shared album.", href: "/guide?role=GUEST&q=memory", guideSlug: "upload-photos", sectionId: "memory" },
  { id: "leave-wish", label: "Leave a Wish", description: "Send a kind message to the hosts.", href: "/guide?role=GUEST&q=wish", guideSlug: "guest-wishes", sectionId: "wishes" },
  { id: "need-help", label: "Need Help", description: "Troubleshooting and contact tips.", href: "/guide?role=GUEST&q=help", guideSlug: "guest-troubleshooting" },
];
export const GUEST_VISUAL_GUIDE_SLUGS = ["welcome-to-celeventic","open-your-invitation","rsvp","accept-or-decline","choose-party-size","group-invitations-plus-guests","plus-guests","your-qr-admission-pass","present-qr-at-entrance","partial-group-admission","event-guide-guest","programme","find-your-seat","menu","venue-and-directions","event-day-access","return-to-invitation","memory-vault-guest","upload-photos","upload-videos","view-shared-memories","guest-wishes","thank-you-experience-guest","guest-troubleshooting"] as const;
export const GUEST_TROUBLESHOOTING_SLUGS = ["troubleshoot-invitation-wont-open","troubleshoot-cannot-hear-intro","troubleshoot-cannot-rsvp","troubleshoot-wrong-rsvp","troubleshoot-cannot-find-qr","troubleshoot-qr-not-scanning","troubleshoot-name-not-in-seating","troubleshoot-dont-know-table","troubleshoot-event-guide-wont-open","troubleshoot-weak-internet","troubleshoot-memory-wont-upload","troubleshoot-contact-organizer"] as const;
export const GUEST_SUCCESS_STEPS = ["Open invitation","Understand who invited them","RSVP","Understand permitted party size","Find admission QR","Understand how QR will be used","Open Event Guide","View programme","Find their table/seat","View menu","Find venue information","Understand Event Day access","Upload a memory","Leave a wish"] as const;
export const GUEST_ACCEPTANCE_QUESTIONS = ["Where is my invitation?","Am I attending?","Who can come with me?","What do I show at the entrance?","What time does the event start?","Where am I going?","Where am I sitting?","What is being served?","How do I share photos?","What happens after admission?","Where do I get help?"] as const;
export const VIDEO_PRODUCTION_REQUIRED_NOTE = "VIDEO PRODUCTION REQUIRED — ship motion/storyboard steps until a real MP4 exists. Do not claim video is available.";
export function mergeGuideCatalogs<T extends { slug: string; sortOrder: number }>(...lists: T[][]): T[] {
  const map = new Map<string, T>();
  for (const list of lists) for (const entry of list) map.set(entry.slug, entry);
  return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}
