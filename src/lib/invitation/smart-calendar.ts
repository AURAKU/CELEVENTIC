import {
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  shareOrDownloadIcs,
  type CalendarEventInput,
} from "@/lib/invitation/calendar-utils";

export type SmartCalendarPlatform = "apple" | "google" | "outlook";

export interface SmartCalendarResult {
  platform: SmartCalendarPlatform;
  label: string;
  success: boolean;
  message: string;
}

function isAppleSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // Chrome / Edge / Firefox on iOS or Mac all include "Safari" — exclude them.
  return /Safari/i.test(ua) && !/Chrome|CriOS|Chromium|Edg|FxiOS|OPR|Opera/i.test(ua);
}

/** Detect the best native calendar for this device/browser. */
export function detectCalendarPlatform(): SmartCalendarPlatform {
  if (typeof navigator === "undefined") return "google";

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const isMac = /Macintosh|Mac OS X/.test(ua) && !isIPadOS;
  const isAndroid = /Android/.test(ua);
  const isWindows = /Windows/.test(ua);

  // Apple Calendar only when the browser will hand .ics to Calendar cleanly.
  if ((isIOS || isIPadOS || isMac) && isAppleSafari()) return "apple";
  if (isAndroid) return "google";
  if (isWindows && /Edg\//.test(ua)) return "outlook";

  return "google";
}

function platformLabel(platform: SmartCalendarPlatform): string {
  switch (platform) {
    case "apple":
      return "Apple Calendar";
    case "google":
      return "Google Calendar";
    case "outlook":
      return "Outlook Calendar";
  }
}

function safeFilename(title: string): string {
  return `${title.slice(0, 40).replace(/[^\w\s-]/g, "").replace(/\s+/g, "-") || "event"}.ics`;
}

function openExternal(url: string) {
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    window.location.assign(url);
  }
}

/**
 * One-tap reminder — picks Apple (.ics), Google, or Outlook automatically,
 * and always attaches calendar alarms so guests are reminded before the event.
 */
export async function setSmartCalendarReminder(
  event: CalendarEventInput
): Promise<SmartCalendarResult> {
  const platform = detectCalendarPlatform();
  const label = platformLabel(platform);
  const filename = safeFilename(event.title);

  try {
    // Mobile share sheet → any installed calendar (best cross-app UX).
    const isMobile =
      typeof navigator !== "undefined" &&
      (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

    if (isMobile) {
      try {
        const mode = await shareOrDownloadIcs(event, filename);
        return {
          platform,
          label,
          success: true,
          message:
            mode === "shared"
              ? "Choose your calendar app to save the date — reminders are included."
              : `Calendar file ready for ${label}. Open it to save reminders before the service.`,
        };
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return {
            platform,
            label,
            success: false,
            message: "Calendar save cancelled.",
          };
        }
      }
    }

    if (platform === "apple") {
      const mode = await shareOrDownloadIcs(event, filename);
      return {
        platform,
        label,
        success: true,
        message:
          mode === "shared"
            ? "Added via share — reminders will fire before the service."
            : "Opening Apple Calendar with reminders before the service…",
      };
    }

    if (platform === "google") {
      openExternal(buildGoogleCalendarUrl(event));
      // Also drop an .ics with VALARM so Google / other apps can import true reminders.
      window.setTimeout(() => {
        void shareOrDownloadIcs(event, filename).catch(() => undefined);
      }, 450);
      return {
        platform,
        label,
        success: true,
        message:
          "Opening Google Calendar — also saving a reminder file you can import on any device.",
      };
    }

    openExternal(buildOutlookCalendarUrl(event));
    window.setTimeout(() => {
      void shareOrDownloadIcs(event, filename).catch(() => undefined);
    }, 450);
    return {
      platform,
      label,
      success: true,
      message:
        "Opening Outlook — also saving a reminder file you can import on any device.",
    };
  } catch {
    return {
      platform,
      label,
      success: false,
      message: "Could not set reminder. Please try again.",
    };
  }
}
