import type { ContrastAssessment } from "@/lib/event-guide/theme";
import type { OfflineSeatingMode } from "@/lib/event-guide/offline-pack";
import type {
  EventGuidePayload,
  GuideAttachment,
  GuideMenu,
  GuideProgrammeItem,
} from "@/lib/event-guide/types";
import type { SignSize, SignTemplate } from "@/lib/event-guide/signage";

/** Shape returned by `GET /api/event-guide`. */
export interface GuideBuilderState {
  event: { id: string; title: string };
  guide: {
    id: string;
    enabled: boolean;
    status: "DRAFT" | "PUBLISHED";
    defaultTab: "PROGRAMME" | "SEATING" | "MENU";
    version: number;
    publishedVersion: number | null;
    publishedAt: string | null;
    showCelebrants: boolean;
    showDate: boolean;
    showVenue: boolean;
    showWelcome: boolean;
    celebrantsText: string | null;
    welcomeMessage: string | null;
    useInvitationTheme: boolean;
    themeOverrides: {
      colors?: Partial<EventGuidePayload["theme"]["colors"]>;
      fonts?: Partial<EventGuidePayload["theme"]["fonts"]>;
      backgroundImageUrl?: string | null;
    };
    seatingEnabled: boolean;
    seatingMode: "ADMISSION_CODE" | "GUEST_NAME";
    seatingMinQuery: number;
    seatingMaxMatch: number;
    seatingNote: string | null;
    offlineEnabled: boolean;
    venueOfflineEnabled: boolean;
    offlineSeatingMode: OfflineSeatingMode;
    venueLocalUrl: string | null;
    venueWifiName: string | null;
    snapshotStale: boolean;
  };
  content: {
    programme: GuideProgrammeItem[];
    /** The organizer's programme script; empty while inheriting. */
    programmeScript: string;
    programmeSource: "guide" | "invitation" | "empty";
    menu: GuideMenu;
    menuSource: "guide" | "invitation" | "empty";
    attachments: GuideAttachment[];
  };
  preview: EventGuidePayload;
  contrast: ContrastAssessment;
  links: {
    online: {
      publicToken: string;
      status: string;
      url: string;
      qrPreviewUrl: string | null;
    };
    venueOffline: {
      publicToken: string;
      status: string;
      url: string | null;
      qrPreviewUrl: string | null;
    } | null;
  };
  offline: {
    packs: Array<{
      id: string;
      packVersion: number;
      guideVersion: number;
      status: string;
      seatingMode: string;
      expiresAt: string;
      revokedAt: string | null;
      lastSyncedAt: string | null;
      syncedRecordCount: number;
      createdAt: string;
    }>;
    seatingModes: Array<{
      value: OfflineSeatingMode;
      label: string;
      detail: string;
      privacy: "highest" | "high" | "reduced";
    }>;
    coverage: { parties: number; assigned: number; unassigned: number };
  };
  signage: { sizes: SignSize[]; templates: SignTemplate[] };
  analytics: {
    rows: Array<{
      day: string;
      tab: string;
      channel: string;
      views: number;
      searches: number;
      matches: number;
    }>;
    totals: { views: number; searches: number; matches: number; offlineViews: number };
  };
  permissions: { canManage: boolean; canDownload: boolean };
}

export type BuilderTab =
  | "content"
  | "appearance"
  | "seating"
  | "signs"
  | "offline"
  | "publish";
