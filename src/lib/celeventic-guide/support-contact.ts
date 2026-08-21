import { buildWhatsAppUrl } from "@/lib/invitation/guest-portal-actions";

/**
 * Celeventic customer care for Guide Assistant escalation.
 * WhatsApp / voice — Ghana mobile (local display + E.164 for wa.me).
 */
export const GUIDE_SUPPORT_CONTACT = {
  displayPhone: "0595968686",
  /** E.164 without + for wa.me */
  whatsAppE164: "233595968686",
  telHref: "tel:+233595968686",
  email: "support@celeventic.com",
  label: "Celeventic Customer Care",
} as const;

export function guideSupportWhatsAppUrl(
  message = "Hello Celeventic support — I need help with the platform."
): string {
  return buildWhatsAppUrl(GUIDE_SUPPORT_CONTACT.whatsAppE164, message);
}

export function guideSupportCallHref(): string {
  return GUIDE_SUPPORT_CONTACT.telHref;
}
