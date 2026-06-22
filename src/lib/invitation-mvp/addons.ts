export interface InvitationAddonDef {
  slug: string;
  name: string;
  description: string;
  priceGhs: number;
}

export const INVITATION_ADDONS: InvitationAddonDef[] = [
  { slug: "extra-revision", name: "Extra Revision Round", description: "One additional design revision cycle", priceGhs: 79 },
  { slug: "rush-delivery", name: "Rush Delivery (24h)", description: "Priority production within 24 hours", priceGhs: 149 },
  { slug: "sms-pack", name: "SMS Guest Pack (500)", description: "Send invitation links via SMS to guests", priceGhs: 99 },
  { slug: "whatsapp-blast", name: "WhatsApp Share Pack", description: "Bulk WhatsApp invitation distribution", priceGhs: 129 },
  { slug: "video-intro", name: "Video Intro Section", description: "Add a hosted video welcome section", priceGhs: 199 },
  { slug: "qr-print", name: "QR Print Cards", description: "Print-ready QR admission cards for guests", priceGhs: 89 },
  { slug: "memory-vault", name: "Memory Vault Starter", description: "Lifetime photo archive for your event", priceGhs: 249 },
  { slug: "designer-call", name: "Designer Consultation", description: "30-minute call with a Celeventic designer", priceGhs: 179 },
];

export function getInvitationAddon(slug: string) {
  return INVITATION_ADDONS.find((a) => a.slug === slug);
}
