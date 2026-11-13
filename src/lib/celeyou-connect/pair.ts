/** Stable idempotency key for one host card + one signed-in visitor. */
export function celeYouExchangePairKey(hostCardId: string, visitorUserId: string): string {
  return `ex:${hostCardId}:${visitorUserId}`;
}

export function celeYouDeliveryKey(kind: string, connectionId: string): string {
  return `del:${kind}:${connectionId}`;
}

export function celeYouConnectionSourceLabel(source?: string | null): string {
  switch ((source || "").trim()) {
    case "tap_mode_qr":
      return "QR Connection";
    case "nfc":
    case "nfc_card":
    case "physical_nfc":
      return "Physical NFC";
    case "exchange":
      return "CeleYou Exchange";
    case "courtesy_reconnect":
      return "Courtesy reconnect";
    case "meeting":
      return "Meeting request";
    case "public_profile":
      return "Public Profile";
    default:
      return "Connect Back";
  }
}

export function tapGuestFirstName(name: string) {
  return name.trim().split(/\s+/)[0]?.slice(0, 40) || "Guest";
}

export function normalizeGuestPhone(value?: string | null): string | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  const kept = raw.replace(/[^\d+]/g, "").slice(0, 40);
  return kept.length >= 6 ? kept : raw.slice(0, 40);
}

export function celeYouConnectSearchText(input: {
  visitorName?: string | null;
  visitorEmail?: string | null;
  visitorPhone?: string | null;
  visitorCompany?: string | null;
  visitorTitle?: string | null;
  note?: string | null;
}): string {
  return [
    input.visitorName,
    input.visitorEmail,
    input.visitorPhone,
    input.visitorCompany,
    input.visitorTitle,
    input.note,
  ]
    .map((value) => (value || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}
