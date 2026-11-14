const DRAFT_PREFIX = "celeyou-studio-draft:";
const DRAFT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export type CeleYouStudioDraftEnvelope<T> = {
  savedAt: number;
  cardId: string;
  published: boolean;
  value: T;
};

function keyFor(cardId: string) {
  return `${DRAFT_PREFIX}${cardId.trim()}`;
}

export function writeCeleYouStudioDraft<T>(cardId: string, value: T, published: boolean) {
  if (typeof window === "undefined") return;
  const id = cardId.trim();
  if (!id) return;
  const envelope: CeleYouStudioDraftEnvelope<T> = {
    savedAt: Date.now(),
    cardId: id,
    published,
    value,
  };
  try {
    window.localStorage.setItem(keyFor(id), JSON.stringify(envelope));
  } catch {
    /* quota */
  }
}

export function readCeleYouStudioDraft<T>(cardId: string): CeleYouStudioDraftEnvelope<T> | null {
  if (typeof window === "undefined") return null;
  const id = cardId.trim();
  if (!id) return null;
  try {
    const raw = window.localStorage.getItem(keyFor(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CeleYouStudioDraftEnvelope<T>;
    if (!parsed || parsed.cardId !== id || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS) {
      window.localStorage.removeItem(keyFor(id));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearCeleYouStudioDraft(cardId: string) {
  if (typeof window === "undefined") return;
  const id = cardId.trim();
  if (!id) return;
  window.localStorage.removeItem(keyFor(id));
}

/** Published cards stay live until explicit Save. Local drafts never write isPublished. */
export function studioDraftMayServerAutosave(published: boolean) {
  return published !== true;
}
