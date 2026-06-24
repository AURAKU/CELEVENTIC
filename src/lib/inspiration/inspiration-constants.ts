import type { InspirationOutputType, InspirationPlatform } from "@prisma/client";

export const INSPIRATION_PROGRESS_STEPS = [
  "ANALYZING",
  "EXTRACTING_COLORS",
  "STUDYING_FLOW",
  "GENERATING_CONCEPT",
  "READY",
] as const;

export type InspirationProgressStep = (typeof INSPIRATION_PROGRESS_STEPS)[number];

export const OUTPUT_TYPE_OPTIONS: { value: InspirationOutputType; label: string }[] = [
  { value: "INVITATION", label: "Invitation" },
  { value: "WEDDING", label: "Wedding Invite" },
  { value: "BIRTHDAY", label: "Birthday Invite" },
  { value: "FUNERAL_MEMORIAL", label: "Funeral Memorial" },
  { value: "CORPORATE", label: "Corporate Event" },
  { value: "CONCERT", label: "Concert" },
  { value: "TICKET", label: "Ticket" },
  { value: "FLYER", label: "Flyer" },
  { value: "THANK_YOU", label: "Thank You Flyer" },
];

export const DEFAULT_BANNED_DOMAINS = [
  "shutterstock.com",
  "gettyimages.com",
  "istockphoto.com",
  "adobe.com",
  "envato.com",
  "canva.com",
  "creativemarket.com",
  "etsy.com",
  "gumroad.com",
];

export const PLATFORM_LABELS: Record<InspirationPlatform, string> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  PINTEREST: "Pinterest",
  WEBSITE: "Website",
  IMAGE_LINK: "Image Link",
  VIDEO_LINK: "Video Link",
  UPLOAD: "Your Upload",
  UNKNOWN: "Web",
};

export const DAILY_ANALYSIS_LIMIT = 30;
