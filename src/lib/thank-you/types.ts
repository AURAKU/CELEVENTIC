/**
 * Thank You Page — design / section / guestbook config types.
 * Stored as additive JSON on ThankYouPage; all fields optional for legacy rows.
 */

import type { FontId } from "@/lib/invitation-theme/theme-types";

export type ThankYouThemeSource = "INVITATION" | "PRESET" | "CUSTOM";

export type ThankYouSectionId =
  | "hero"
  | "gratitudeLetter"
  | "flyer"
  | "hostMedia"
  | "highlightedMemories"
  | "guestMessages"
  | "memoryVault"
  | "closingSignature"
  | "shareQr";

export type ThankYouCardStyle = "soft" | "editorial" | "glass" | "flat";
export type ThankYouCornerStyle = "rounded" | "soft" | "sharp";
export type ThankYouMotionStyle = "gentle" | "none" | "cinematic";
export type ThankYouContentWidth = "narrow" | "comfortable" | "wide";
export type ThankYouGuestWallStyle =
  | "editorial_cards"
  | "floating_notes"
  | "portrait_wall"
  | "timeline";

export interface ThankYouDesignConfig {
  themeSource?: ThankYouThemeSource;
  templateId?: string;
  fontPairingId?: string;
  displayFont?: FontId | string;
  bodyFont?: FontId | string;
  scriptFont?: FontId | string;
  eyebrowFont?: FontId | string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  mutedTextColor?: string;
  accentColor?: string;
  secondaryAccentColor?: string;
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  overlayOpacity?: number;
  cardStyle?: ThankYouCardStyle;
  cornerStyle?: ThankYouCornerStyle;
  motionStyle?: ThankYouMotionStyle;
  contentWidth?: ThankYouContentWidth;
  decorativeMotif?: string | null;
}

export interface ThankYouSectionConfigItem {
  id: ThankYouSectionId;
  enabled: boolean;
  order: number;
  layout?: string;
  heading?: string;
  description?: string;
}

export interface ThankYouSectionConfig {
  sections: ThankYouSectionConfigItem[];
}

export interface ThankYouGuestbookConfig {
  enabled?: boolean;
  requireApproval?: boolean;
  allowAnonymous?: boolean;
  allowAvatar?: boolean;
  allowTitle?: boolean;
  maxMessageLength?: number;
  initialPageSize?: number;
  wallStyle?: ThankYouGuestWallStyle;
  closedAt?: string | null;
  closedMessage?: string | null;
  successTitle?: string | null;
  successMessage?: string | null;
  pendingSuccessMessage?: string | null;
  prompts?: string[];
}

export interface ThankYouSharingConfig {
  allowNativeShare?: boolean;
  allowCopyLink?: boolean;
  allowQrDownload?: boolean;
  allowFlyerDownload?: boolean;
  showUploadQr?: boolean;
  showMemoryCta?: boolean;
  showUploadCta?: boolean;
}

export interface ThankYouSeoConfig {
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImageUrl?: string | null;
}

export interface ResolvedThankYouDesign {
  themeSource: ThankYouThemeSource;
  templateId: string;
  fontPairingId: string;
  displayFontStack: string;
  bodyFontStack: string;
  scriptFontStack: string;
  eyebrowFontStack: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  accentColor: string;
  secondaryAccentColor: string;
  backgroundImageUrl: string | null;
  backgroundVideoUrl: string | null;
  overlayOpacity: number;
  cardStyle: ThankYouCardStyle;
  cornerStyle: ThankYouCornerStyle;
  motionStyle: ThankYouMotionStyle;
  contentWidth: ThankYouContentWidth;
  isLight: boolean;
  /** Legacy gradient fallback for intro chrome */
  background: string;
  name: string;
  description: string;
}

export type GuestWishStatus =
  | "PENDING"
  | "APPROVED"
  | "HIDDEN"
  | "REJECTED"
  | "REMOVED";

export type GuestWishSource =
  | "INVITATION"
  | "EVENT_COMPANION"
  | "THANK_YOU_PAGE"
  | "ADMIN_IMPORT";

export const DEFAULT_SECTION_CONFIG: ThankYouSectionConfig = {
  sections: [
    { id: "hero", enabled: true, order: 1, layout: "editorial" },
    { id: "gratitudeLetter", enabled: true, order: 2 },
    { id: "flyer", enabled: true, order: 3 },
    { id: "hostMedia", enabled: true, order: 4 },
    { id: "highlightedMemories", enabled: true, order: 5 },
    { id: "guestMessages", enabled: true, order: 6 },
    { id: "memoryVault", enabled: true, order: 7 },
    { id: "closingSignature", enabled: true, order: 8 },
    { id: "shareQr", enabled: true, order: 9 },
  ],
};

export const DEFAULT_GUESTBOOK_CONFIG: Required<
  Omit<ThankYouGuestbookConfig, "closedAt" | "closedMessage" | "successTitle" | "successMessage" | "pendingSuccessMessage" | "prompts">
> &
  Pick<
    ThankYouGuestbookConfig,
    "closedAt" | "closedMessage" | "successTitle" | "successMessage" | "pendingSuccessMessage" | "prompts"
  > = {
  enabled: true,
  requireApproval: false,
  allowAnonymous: false,
  allowAvatar: true,
  allowTitle: true,
  maxMessageLength: 800,
  initialPageSize: 12,
  wallStyle: "editorial_cards",
  closedAt: null,
  closedMessage: null,
  successTitle: null,
  successMessage: null,
  pendingSuccessMessage: null,
  prompts: [
    "Share a favourite moment from the celebration",
    "Leave a blessing for the hosts",
    "Write a note for their next chapter",
    "Share something that made the day special",
    "Leave a message they can revisit later",
  ],
};

export const DEFAULT_SHARING_CONFIG: Required<ThankYouSharingConfig> = {
  allowNativeShare: true,
  allowCopyLink: true,
  allowQrDownload: true,
  allowFlyerDownload: true,
  showUploadQr: true,
  showMemoryCta: true,
  showUploadCta: true,
};

export const GUEST_MESSAGE_STORAGE_KEY = "celeventic.thankYou.authorTokens";
