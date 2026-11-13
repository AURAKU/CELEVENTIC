/** Typed 6-character codes stay short. QR pairing uses a longer URL token. */

export function isTapPairingToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{20,128}$/.test(value.trim());
}

export function normalizeJoinCode(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
}

export function normalizeTapSecret(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  const pairing = decoded.replace(/[^A-Za-z0-9_-]/g, "");
  if (isTapPairingToken(pairing)) return pairing;
  return normalizeJoinCode(pairing);
}

export function parseTapJoinScan(text: string): string | null {
  const raw = text.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "tap" && parts[1]) {
      const secret = normalizeTapSecret(parts[1]);
      return secret.length >= 6 ? secret : null;
    }
    const fromQuery = url.searchParams.get("code") || url.searchParams.get("t");
    if (fromQuery) {
      const secret = normalizeTapSecret(fromQuery);
      return secret.length >= 6 ? secret : null;
    }
  } catch {
    /* not a URL */
  }
  const compact = normalizeTapSecret(raw);
  if (compact.length >= 6) return compact;
  return null;
}
