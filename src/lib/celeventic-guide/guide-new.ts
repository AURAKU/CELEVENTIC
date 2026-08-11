/** Compute whether a guide should show the New badge. */
export function isGuideMarkedNew(input: {
  isNew?: boolean | null;
  newUntil?: Date | string | null;
  publishedAt?: Date | string | null;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();
  if (input.newUntil) {
    const until = input.newUntil instanceof Date ? input.newUntil : new Date(input.newUntil);
    if (!Number.isNaN(until.getTime()) && until.getTime() > now.getTime()) return true;
  }
  if (input.isNew) return true;
  if (input.publishedAt) {
    const pub = input.publishedAt instanceof Date ? input.publishedAt : new Date(input.publishedAt);
    if (!Number.isNaN(pub.getTime())) {
      const fourteenDays = 14 * 24 * 60 * 60 * 1000;
      if (now.getTime() - pub.getTime() < fourteenDays && now.getTime() >= pub.getTime()) {
        // Only auto-new when explicitly flagged or within window AND featured path — keep explicit.
      }
    }
  }
  return !!input.isNew;
}
