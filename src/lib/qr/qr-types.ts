/** Celeventic QR intent types — routing handled by qr-routing.service */

export const QR_TYPES = {
  PUBLIC_EVENT: "public_event",
  GUEST_INVITE: "guest_invite",
  GUEST_ADMISSION: "guest_admission",
  TICKET: "ticket",
  VIP: "vip",
  HOUSEHOLD: "household",
} as const;

export type QrIntentType = (typeof QR_TYPES)[keyof typeof QR_TYPES];

/** QR types that open the invitation portal (not admission verify) */
export const INVITE_QR_TYPES: QrIntentType[] = [
  QR_TYPES.PUBLIC_EVENT,
  QR_TYPES.GUEST_INVITE,
  QR_TYPES.VIP,
  QR_TYPES.HOUSEHOLD,
];

/** QR types that show admission / ticket status */
export const ADMISSION_QR_TYPES: QrIntentType[] = [
  QR_TYPES.GUEST_ADMISSION,
  QR_TYPES.TICKET,
];
