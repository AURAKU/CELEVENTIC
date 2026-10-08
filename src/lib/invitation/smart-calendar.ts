import {
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  downloadIcsCalendar,
  downloadIcsFile,
  hasValidCalendarWindow,
  type CalendarEventInput,
} from "@/lib/invitation/calendar-utils";

export type SmartCalendarPlatform = "apple" | "google" | "outlook";

export interface SmartCalendarResult {
  platform: SmartCalendarPlatform;
  label: string;
  success: boolean;
  message: string;
}

export type CalendarPrimaryAction =
  | { kind: "web"; href: string; platform: "google" | "outlook" }
  | { kind: "ics"; platform: "apple" };

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

  // iPhone / iPad always hand .ics to Calendar — including Chrome/Firefox on iOS.
  if (isIOS || isIPadOS) return "apple";
  if (isMac && isAppleSafari()) return "apple";
  if (isAndroid) return "google";
  // Windows Calendar lives in Outlook, except Chrome, which keeps Google Calendar.
  if (isWindows && !/Chrome|CriOS/.test(ua)) return "outlook";

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

export function calendarFileName(title: string): string {
  return `${title.slice(0, 40).replace(/[^\w\s-]/g, "").replace(/\s+/g, "-") || "event"}.ics`;
}

/** User-gesture-safe open — a real <a> click, never window.open after await. */
export function openCalendarUrl(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function resolveCalendarPrimaryAction(
  event: CalendarEventInput
): CalendarPrimaryAction | null {
  if (!hasValidCalendarWindow(event)) return null;
  const platform = detectCalendarPlatform();

  if (platform === "apple") return { kind: "ics", platform: "apple" };

  if (platform === "outlook") {
    const href = buildOutlookCalendarUrl(event);
    return href ? { kind: "web", href, platform: "outlook" } : { kind: "ics", platform: "apple" };
  }

  const href = buildGoogleCalendarUrl(event);
  return href ? { kind: "web", href, platform: "google" } : { kind: "ics", platform: "apple" };
}

/**
 * One-tap reminder — Apple Calendar (.ics), Google Calendar, or Outlook.
 * Stays on the user-gesture stack so popup blockers and iOS Calendar handoff work.
 */
export async function setSmartCalendarReminder(
  event: CalendarEventInput
): Promise<SmartCalendarResult> {
  const platform = detectCalendarPlatform();
  const label = platformLabel(platform);
  const filename = calendarFileName(event.title);

  if (!hasValidCalendarWindow(event)) {
    return {
      platform,
      label,
      success: false,
      message: "Event dates are not ready yet.",
    };
  }

  try {
    const action = resolveCalendarPrimaryAction(event);
    if (!action) {
      return {
        platform,
        label,
        success: false,
        message: "Event dates are not ready yet.",
      };
    }

    if (action.kind === "web") {
      openCalendarUrl(action.href);
      return {
        platform,
        label,
        success: true,
        message: `Opening ${label} with the event date and time.`,
      };
    }

    downloadIcsFile(event, filename);
    return {
      platform,
      label,
      success: true,
      message: `Opening ${label} with the event date and time.`,
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

export function openCalendarUrls(urls: string[]) {
  for (const url of urls) openCalendarUrl(url);
}

/**
 * Apple receives one calendar file, because Calendar imports every event and its alarm.
 * Google and Outlook receive one compose link per celebration, because those pages hold a single event.
 */
export function calendarBundleForEvents(
  events: CalendarEventInput[],
  platform: SmartCalendarPlatform = detectCalendarPlatform()
): { urls: string[]; useFile: boolean } {
  const ready = events.filter(hasValidCalendarWindow);
  if (ready.length === 0 || platform === "apple") return { urls: [], useFile: true };
  const urls = ready
    .map((event) =>
      platform === "outlook" ? buildOutlookCalendarUrl(event) : buildGoogleCalendarUrl(event)
    )
    .filter(Boolean);
  if (urls.length !== ready.length) return { urls: [], useFile: true };
  return { urls, useFile: false };
}

/**
 * Adds every celebration on the device's calendar.
 * Apple gets one file with an alarm on each event.
 * Google and Outlook get one save page per celebration.
 */
export async function setSmartCalendarReminders(
  events: CalendarEventInput[]
): Promise<SmartCalendarResult> {
  const ready = events.filter(hasValidCalendarWindow);
  if (ready.length <= 1) {
    return setSmartCalendarReminder(ready[0] ?? events[0] ?? { title: "Celebration", startDateRaw: "" });
  }

  const platform = detectCalendarPlatform();
  const label = platformLabel(platform);
  const filename = calendarFileName(ready[0]?.title || "celebration");
  const bundle = calendarBundleForEvents(ready, platform);

  try {
    if (bundle.useFile) {
      downloadIcsCalendar(ready, filename);
      return {
        platform,
        label,
        success: true,
        message: `Opening ${label} with each celebration, the place, and a reminder.`,
      };
    }

    openCalendarUrls(bundle.urls);
    return {
      platform,
      label,
      success: true,
      message: `Opening ${label} with all ${ready.length} celebrations. Save each one to keep your reminder.`,
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
