/** Stable idempotency key for one host card + one signed-in visitor. */
export function celeYouExchangePairKey(hostCardId: string, visitorUserId: string): string {
  return `ex:${hostCardId}:${visitorUserId}`;
}

export function celeYouDeliveryKey(kind: string, connectionId: string): string {
  return `del:${kind}:${connectionId}`;
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
