/**
 * Purge the Next.js caches that sit in front of a published invitation so an
 * edit made in Studio is visible on the guest URL on the very next request.
 *
 * `revalidatePath` only works inside a request / server-action scope, so the
 * import is deferred and every failure is swallowed: background workers, CLI
 * scripts and seed jobs legitimately call the sync path with no request
 * context, and the guest routes render dynamically there anyway.
 */
export async function revalidateLiveInvite(input: {
  uniqueLink?: string | null;
  eventSlug?: string | null;
}): Promise<void> {
  const paths: string[] = [];
  if (input.uniqueLink) paths.push(`/invite/${input.uniqueLink}`);
  if (input.eventSlug) {
    paths.push(`/e/${input.eventSlug}`, `/events/${input.eventSlug}`);
  }
  if (paths.length === 0) return;

  try {
    const { revalidatePath } = await import("next/cache");
    for (const path of paths) revalidatePath(path);
  } catch {
    // No request scope — nothing is cached to purge.
  }
}
