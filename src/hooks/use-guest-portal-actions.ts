"use client";

import { useCallback, useMemo, useState } from "react";
import type { HubTabId } from "@/lib/experience/experience-types";
import type { CalendarEventInput } from "@/lib/invitation/calendar-utils";
import { setSmartCalendarReminder } from "@/lib/invitation/smart-calendar";
import {
  isPreviewInvitationId,
  type GuestPortalActionHandlers,
  type InvitationActionKey,
  type ResolvedGuestAction,
} from "@/lib/invitation/guest-portal-actions";
import {
  pickActionsFromStudioMapping,
  resolveExperienceActions,
} from "@/lib/experience-engine/action-registry";
import type { StudioButtonActions } from "@/lib/experience/experience-types";

export interface UseGuestPortalActionsInput {
  invitationId: string;
  isEmbedded?: boolean;
  showRsvp?: boolean;
  mapsLink?: string | null;
  venueName?: string | null;
  landmark?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  seatLookupUrl?: string | null;
  seatingEnabled?: boolean;
  qrPassUrl?: string | null;
  hasQrPass?: boolean;
  galleryCount?: number;
  memoryVaultEnabled?: boolean;
  memoryUploadUrl?: string | null;
  memoryAlbumUrl?: string | null;
  menuUrl?: string | null;
  menuBody?: string | null;
  registryUrl?: string | null;
  eventId?: string;
  calendarEvent: CalendarEventInput;
  shareTitle: string;
  shareUrl?: string;
  hubTabs?: HubTabId[];
  hasCalendarDate?: boolean;
  audioAvailable?: boolean;
  audioMuted?: boolean;
  onToggleAudio?: () => void;
  onReplay?: () => void;
  /** Phase 5 — Studio Action Registry mapping for dock buttons */
  buttonActions?: StudioButtonActions | null;
}

export function useGuestPortalActions(input: UseGuestPortalActionsInput) {
  const [shareState, setShareState] = useState<"idle" | "loading" | "copied" | "error">("idle");
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<InvitationActionKey | null>(null);

  const shareUrl =
    input.shareUrl ?? (typeof window !== "undefined" ? window.location.href : "");

  const isPreview = isPreviewInvitationId(input.invitationId);

  const scrollTo = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setActionError(null);
    } else {
      setActionError("This section is not available on this invitation yet.");
    }
  }, []);

  const share = useCallback(async () => {
    setShareState("loading");
    setLoadingKey("SHARE");
    try {
      if (navigator.share) {
        await navigator.share({ title: input.shareTitle, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareState("copied");
        setTimeout(() => setShareState("idle"), 2000);
        setLoadingKey(null);
        return;
      }
      setShareState("idle");
    } catch {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareState("copied");
        setTimeout(() => setShareState("idle"), 2000);
      } catch {
        setShareState("error");
        setActionError("Could not share or copy the link.");
      }
    }
    setLoadingKey(null);
  }, [input.shareTitle, shareUrl]);

  const copyLink = useCallback(async () => {
    setLoadingKey("COPY_LINK");
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2000);
    } catch {
      setShareState("error");
      setActionError("Could not copy link.");
    }
    setLoadingKey(null);
  }, [shareUrl]);

  const setReminder = useCallback(async () => {
    setLoadingKey("SAVE_DATE");
    const result = await setSmartCalendarReminder(input.calendarEvent);
    if (!result.success) setActionError(result.message);
    else setActionError(null);
    setLoadingKey(null);
  }, [input.calendarEvent]);

  const handlers: GuestPortalActionHandlers = useMemo(
    () => ({
      scrollTo,
      share,
      copyLink,
      setReminder,
      replay: input.onReplay,
      toggleAudio: input.onToggleAudio,
    }),
    [scrollTo, share, copyLink, setReminder, input.onReplay, input.onToggleAudio]
  );

  const context = useMemo(
    () => ({
      isPreview,
      isEmbedded: input.isEmbedded ?? false,
      showRsvp: input.showRsvp !== false,
      mapsLink: input.mapsLink,
      venueName: input.venueName,
      landmark: input.landmark,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      seatLookupUrl: input.seatLookupUrl,
      seatingEnabled: input.seatingEnabled ?? Boolean(input.seatLookupUrl),
      hasQrPass: input.hasQrPass ?? false,
      qrPassUrl: input.qrPassUrl,
      galleryCount: input.galleryCount ?? 0,
      memoryVaultEnabled: input.memoryVaultEnabled ?? false,
      memoryUploadUrl: input.memoryUploadUrl,
      memoryAlbumUrl: input.memoryAlbumUrl,
      menuUrl: input.menuUrl,
      menuBody: input.menuBody,
      registryUrl: input.registryUrl,
      eventId: input.eventId,
      calendarEvent: input.calendarEvent,
      shareTitle: input.shareTitle,
      shareUrl,
      hubTabs: input.hubTabs ?? [],
      hasCalendarDate: input.hasCalendarDate ?? Boolean(input.calendarEvent.startDateRaw),
      audioAvailable: input.audioAvailable ?? false,
      audioMuted: input.audioMuted,
    }),
    [input, isPreview, shareUrl]
  );

  const allActions = useMemo(
    () =>
      resolveExperienceActions(context, handlers, {
        invitationId: input.invitationId,
        eventId: input.eventId,
        isPreview,
        entitlements: {
          seating: input.seatingEnabled ?? Boolean(input.seatLookupUrl),
          qrPass: input.hasQrPass ?? false,
          memoryVault: input.memoryVaultEnabled || Boolean(input.memoryUploadUrl),
          menu: Boolean(input.menuUrl || input.menuBody),
          gallery: (input.galleryCount ?? 0) > 0,
        },
      }),
    [context, handlers, input, isPreview]
  );

  const primaryActions = useMemo(
    () => pickActionsFromStudioMapping(allActions, input.buttonActions),
    [allActions, input.buttonActions]
  );

  const runAction = useCallback(
    async (action: ResolvedGuestAction) => {
      if (action.disabled) {
        setActionError(action.disabledReason ?? "This action is not available.");
        return;
      }
      setActionError(null);
      if (action.kind === "handler" && action.onClick) {
        setLoadingKey(action.key);
        await action.onClick();
        setLoadingKey(null);
      } else if (action.kind === "scroll" && action.onClick) {
        await action.onClick();
      } else if (action.kind === "menu" && action.onClick) {
        await action.onClick();
      }
    },
    []
  );

  return {
    allActions,
    primaryActions,
    shareState,
    actionError,
    loadingKey,
    runAction,
    scrollTo,
    share,
    copyLink,
    isPreview,
    clearError: () => setActionError(null),
  };
}
