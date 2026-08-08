/**
 * The one way the import screens talk to the API.
 *
 * Written because the failure that actually strands an organiser is not a
 * clean 4xx — the API is careful about those — it is the response that never
 * parses: a proxy timeout, an upload rejected before the route runs, a dropped
 * connection mid-import. A bare `await res.json()` throws on all three, the
 * `setBusy(false)` after it never runs, and the button stays disabled with no
 * explanation until the page is reloaded.
 *
 * So every call resolves. Never rejects, always carries a sentence a
 * non-technical organiser can act on.
 */

export type RequestResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

const STATUS_FALLBACKS: Record<number, string> = {
  401: "Your session expired. Sign in again and retry.",
  403: "You do not have permission to manage this event's guest list.",
  404: "That import no longer exists. It may have been discarded.",
  413: "That file is too large to upload.",
  429: "Too many requests — wait a moment and try again.",
  502: "The server did not respond. Try again in a moment.",
  503: "The server is busy. Try again in a moment.",
  504: "That took too long to respond. Try again in a moment.",
};

/** Envelope used by every guest-import endpoint. */
interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
}

export async function requestJson<T>(
  input: string,
  init?: RequestInit
): Promise<RequestResult<T>> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    return {
      ok: false,
      status: 0,
      error: "Could not reach the server. Check your connection and try again.",
    };
  }

  // A body that is not JSON is normal for infrastructure errors; read it as
  // text first so a stray HTML error page cannot throw past the caller.
  const body = await response.text().catch(() => "");
  let payload: ApiEnvelope<T> | null = null;
  if (body) {
    try {
      payload = JSON.parse(body) as ApiEnvelope<T>;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error:
        payload?.error ??
        STATUS_FALLBACKS[response.status] ??
        `Something went wrong (${response.status}). Try again.`,
    };
  }

  return { ok: true, data: (payload?.data ?? payload) as T };
}
