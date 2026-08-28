import { Facebook, Instagram, MessageCircle, Music2, Youtube, type LucideIcon } from "lucide-react";
import type { InvitationSocialPlatformId } from "@/lib/invitation/social-links";

const ICONS: Partial<Record<InvitationSocialPlatformId, LucideIcon>> = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  whatsapp: MessageCircle,
  tiktok: Music2,
};

/** Official Lucide platform marks, tinted by currentColor for the host visual system. */
export function InvitationSocialPlatformIcon({
  platform,
  size = 28,
  strokeWidth = 1.4,
}: {
  platform: InvitationSocialPlatformId;
  size?: number;
  strokeWidth?: number;
}) {
  const Icon = ICONS[platform];
  if (!Icon) {
    return (
      <span aria-hidden className="text-[0.65rem] tracking-[0.18em] uppercase">
        {platform}
      </span>
    );
  }
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden />;
}
