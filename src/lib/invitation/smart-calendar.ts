import {
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  downloadIcsFile,
  type CalendarEventInput,
} from "@/lib/invitation/calendar-utils";

export type SmartCalendarPlatform = "apple" | "google" | "outlook";

export interface SmartCalendarResult {
  platform: SmartCalendarPlatform;
  label: string;
  success: boolean;
  message: string;
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

  if (isIOS || isIPadOS || isMac) return "apple";
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

/**
 * One-tap reminder — picks Apple (.ics), Google, or Outlook automatically.
 */
export async function setSmartCalendarReminder(event: CalendarEventInput): Promise<SmartCalendarResult> {
  const platform = detectCalendarPlatform();
  const label = platformLabel(platform);

  try {
    if (platform === "apple") {
      downloadIcsFile(event, safeFilename(event.title));
      return {
        platform,
        label,
        success: true,
        message: "Reminder saved — check Apple Calendar or your downloads.",
      };
    }

    if (platform === "google") {
      const url = buildGoogleCalendarUrl(event);
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) {
        window.location.href = url;
      }
      return {
        platform,
        label,
        success: true,
        message: "Opening Google Calendar with your event details…",
      };
    }

    const url = buildOutlookCalendarUrl(event);
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      window.location.href = url;
    }
    return {
      platform,
      label,
      success: true,
      message: "Opening Outlook Calendar with your event details…",
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
