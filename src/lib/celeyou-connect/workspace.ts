/**
 * Owner connection workspace helpers. Internal fingerprint tags stay off the desk.
 * Export includes only contacts the visitor chose to share.
 */

export const CELEYOU_CONNECTION_LABEL_PATTERN = /^[a-z0-9][a-z0-9._-]{1,23}$/;
export const CELEYOU_CONNECTION_LABEL_PREFIX = "label:";
export const CELEYOU_CONNECTION_SOURCES = [
  "connect_back",
  "exchange",
  "meeting",
  "tap_mode_qr",
  "nfc",
  "courtesy_reconnect",
  "public_profile",
] as const;

export type CeleYouConnectionSource = (typeof CELEYOU_CONNECTION_SOURCES)[number];

const INTERNAL_TAG = /^(email:|phone:|anon:|fp:)/i;

export function isInternalConnectionTag(value: unknown): boolean {
  return typeof value === "string" && INTERNAL_TAG.test(value.trim());
}

export function normalizeConnectionLabel(raw: string): string | null {
  const value = raw.trim().toLowerCase().replace(/\s+/g, "_").replace(/^@/, "");
  if (!CELEYOU_CONNECTION_LABEL_PATTERN.test(value)) return null;
  if (INTERNAL_TAG.test(value)) return null;
  return value;
}

export function ownerLabelsFromTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of tags) {
    if (typeof item !== "string") continue;
    const raw = item.trim();
    const value = raw.startsWith(CELEYOU_CONNECTION_LABEL_PREFIX)
      ? raw.slice(CELEYOU_CONNECTION_LABEL_PREFIX.length)
      : isInternalConnectionTag(raw)
        ? ""
        : raw;
    const label = normalizeConnectionLabel(value);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out.slice(0, 8);
}

export function mergeConnectionTags(existing: unknown, labels: string[]): string[] {
  const kept = Array.isArray(existing)
    ? existing.filter((item): item is string => typeof item === "string" && isInternalConnectionTag(item))
    : [];
  const next = ownerLabelsFromTags(labels.map((item) => `${CELEYOU_CONNECTION_LABEL_PREFIX}${item}`));
  return [...kept, ...next.map((item) => `${CELEYOU_CONNECTION_LABEL_PREFIX}${item}`)].slice(0, 16);
}

export function connectionHasExportableConsent(input: {
  consentAt?: Date | string | null;
  followupConsentAt?: Date | string | null;
  visitorEmail?: string | null;
  visitorPhone?: string | null;
}): boolean {
  const hasReach = Boolean(input.visitorEmail?.trim() || input.visitorPhone?.trim());
  if (!hasReach) return false;
  const consent = input.consentAt ? new Date(input.consentAt).getTime() : 0;
  const follow = input.followupConsentAt ? new Date(input.followupConsentAt).getTime() : 0;
  if (consent <= 0 && follow <= 0) return false;
  return true;
}

export function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export type CeleYouConnectionExportRow = {
  visitorName: string;
  visitorEmail: string | null;
  visitorPhone: string | null;
  visitorCompany: string | null;
  visitorTitle: string | null;
  source: string;
  status: string;
  labels: string[];
  createdAt: string;
};

export function connectionsToCsv(rows: CeleYouConnectionExportRow[]): string {
  const header = [
    "name",
    "email",
    "phone",
    "company",
    "title",
    "source",
    "status",
    "labels",
    "received_at",
  ];
  const lines = rows.map((row) =>
    [
      row.visitorName,
      row.visitorEmail || "",
      row.visitorPhone || "",
      row.visitorCompany || "",
      row.visitorTitle || "",
      row.source,
      row.status,
      row.labels.join(" "),
      row.createdAt,
    ]
      .map((item) => csvEscape(String(item)))
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function reminderHorizonHours(hours: number): Date {
  const safe = [1, 24, 72, 168].includes(hours) ? hours : 24;
  return new Date(Date.now() + safe * 60 * 60 * 1000);
}

export function parseConnectionSource(raw: string | null | undefined): string | null {
  const value = (raw || "").trim();
  if (!value || value === "all") return null;
  return CELEYOU_CONNECTION_SOURCES.includes(value as CeleYouConnectionSource) ? value : null;
}
