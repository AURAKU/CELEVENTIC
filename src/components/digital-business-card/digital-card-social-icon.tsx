import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AtSign,
  Camera,
  ExternalLink,
  Facebook,
  Gamepad2,
  Github,
  Globe,
  Hash,
  Headphones,
  Instagram,
  Linkedin,
  MessageCircle,
  MessagesSquare,
  Music,
  Phone,
  Play,
  Send,
  Tv,
  Twitter,
  Video,
  Youtube,
} from "lucide-react";
import type { DigitalCardSocialIconId } from "@/lib/digital-business-card/socials";

const ICONS: Record<DigitalCardSocialIconId, LucideIcon> = {
  linkedin: Linkedin,
  instagram: Instagram,
  github: Github,
  globe: Globe,
  phone: Phone,
  facebook: Facebook,
  youtube: Youtube,
  twitter: Twitter,
  send: Send,
  message: MessageCircle,
  messages: MessagesSquare,
  music: Music,
  video: Video,
  at: AtSign,
  camera: Camera,
  play: Play,
  tv: Tv,
  gamepad: Gamepad2,
  headphones: Headphones,
  hash: Hash,
};

export function DigitalCardSocialIcon({
  id,
  className,
  style,
}: {
  id: DigitalCardSocialIconId;
  className?: string;
  style?: CSSProperties;
}) {
  const Icon = ICONS[id] ?? ExternalLink;
  return <Icon className={className} style={style} aria-hidden />;
}
