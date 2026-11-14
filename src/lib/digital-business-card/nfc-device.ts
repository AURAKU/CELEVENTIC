export const NFC_STUDIO_PATH = "/dashboard/business-card/nfc";

export type NfcDeviceStatus = "ACTIVE" | "DISABLED" | "LOST" | "REPLACED";
export type NfcTapOutcome = "open" | "profile" | "paused" | "lost" | "replaced" | "unknown";
export type NfcDeviceAction = "pause" | "resume" | "lost" | "replace";
export type NfcAdminDeviceAction = NfcDeviceAction | "register" | "revoke";

/** Hardware UID is inventory only. Taps authenticate with the NDEF URL token, never a tag serial. */
export const NFC_HARDWARE_UID_IS_NOT_AUTH = true;

export const NFC_TAP_COPY: Record<Exclude<NfcTapOutcome, "open" | "profile">, { heading: string; body: string }> = {
  paused: {
    heading: "This NFC card is paused",
    body: "The owner has turned off taps on this card. Ask them for a QR or link instead.",
  },
  lost: {
    heading: "This NFC card was reported lost",
    body: "It no longer opens a profile. If you found it, you can ignore the tap.",
  },
  replaced: {
    heading: "This NFC card was replaced",
    body: "A newer card now opens this identity. Ask the owner for the current card, QR, or link.",
  },
  unknown: {
    heading: "This NFC card is not recognized",
    body: "The tag is not linked to a live CeleYou. Ask the owner for a QR or link instead.",
  },
};

export function nfcStudioPath(cardId?: string): string {
  if (!cardId) return NFC_STUDIO_PATH;
  return `${NFC_STUDIO_PATH}?card=${encodeURIComponent(cardId)}`;
}

export function normalizeNfcDeviceStatus(value?: string | null): NfcDeviceStatus | null {
  const status = (value ?? "").toUpperCase();
  if (status === "ACTIVE" || status === "DISABLED" || status === "LOST" || status === "REPLACED") {
    return status;
  }
  return null;
}

export function nfcTapOutcome(input: {
  deviceStatus?: string | null;
  nfcEnabled: boolean;
  guestShareable: boolean;
}): NfcTapOutcome {
  const status = normalizeNfcDeviceStatus(input.deviceStatus);
  if (!status) return "unknown";
  if (status === "LOST") return "lost";
  if (status === "REPLACED") return "replaced";
  if (status === "DISABLED" || !input.nfcEnabled) return "paused";
  if (!input.guestShareable) return "profile";
  return "open";
}

export function nfcDeviceIsCurrent(status: NfcDeviceStatus): boolean {
  return status === "ACTIVE" || status === "DISABLED" || status === "LOST";
}

export function pickCurrentNfcDevice<T extends { status: string }>(devices: T[]): T | null {
  const ranked = devices
    .map((device) => ({ device, status: normalizeNfcDeviceStatus(device.status) }))
    .filter((row): row is { device: T; status: NfcDeviceStatus } => row.status !== null && nfcDeviceIsCurrent(row.status));
  return (
    ranked.find((row) => row.status === "ACTIVE")?.device ??
    ranked.find((row) => row.status === "DISABLED")?.device ??
    ranked.find((row) => row.status === "LOST")?.device ??
    null
  );
}

export function nfcDeviceMayResume(status: NfcDeviceStatus): boolean {
  return status === "DISABLED";
}

export function nfcDeviceMayPause(status: NfcDeviceStatus): boolean {
  return status === "ACTIVE";
}

export function nfcDeviceMayReportLost(status: NfcDeviceStatus): boolean {
  return status === "ACTIVE" || status === "DISABLED";
}

export function nfcDeviceMayReplace(status: NfcDeviceStatus): boolean {
  return status === "ACTIVE" || status === "DISABLED" || status === "LOST";
}

export function nfcDeviceMayRevoke(status: NfcDeviceStatus): boolean {
  return status === "ACTIVE" || status === "DISABLED";
}

export function nfcActionFromAdminAction(action: string): NfcAdminDeviceAction | null {
  if (action === "nfc_register") return "register";
  if (action === "nfc_pause") return "pause";
  if (action === "nfc_resume") return "resume";
  if (action === "nfc_lost") return "lost";
  if (action === "nfc_replace") return "replace";
  if (action === "nfc_revoke") return "revoke";
  return null;
}
