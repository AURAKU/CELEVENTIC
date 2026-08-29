import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  detectCalendarPlatform,
  resolveCalendarPrimaryAction,
} from "@/lib/invitation/smart-calendar";

const FEMMORA_EVENT = {
  title: "FEMMORA Soft Opening",
  startDateRaw: "2026-08-29T09:00:00+03:00",
  endDateRaw: "2026-08-30T20:00:00+03:00",
  venue: "FEMMORA GH, Westlands",
  timeZone: "Africa/Nairobi",
};

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");

function withNavigator(
  nav: { userAgent: string; platform?: string; maxTouchPoints?: number },
  fn: () => void
) {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      userAgent: nav.userAgent,
      platform: nav.platform ?? "Win32",
      maxTouchPoints: nav.maxTouchPoints ?? 0,
    },
  });
  try {
    fn();
  } finally {
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    } else {
      delete (globalThis as { navigator?: unknown }).navigator;
    }
  }
}

afterEach(() => {
  if (originalNavigator) {
    Object.defineProperty(globalThis, "navigator", originalNavigator);
  }
});

describe("smart calendar platform", () => {
  it("sends every iPhone to Apple Calendar, including Chrome on iOS", () => {
    withNavigator(
      {
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1",
        platform: "iPhone",
      },
      () => {
        assert.equal(detectCalendarPlatform(), "apple");
        assert.equal(resolveCalendarPrimaryAction(FEMMORA_EVENT)?.kind, "ics");
      }
    );
  });

  it("opens Google Calendar on Android and desktop Chrome", () => {
    withNavigator(
      {
        userAgent:
          "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        platform: "Linux armv8l",
      },
      () => {
        assert.equal(detectCalendarPlatform(), "google");
        const action = resolveCalendarPrimaryAction(FEMMORA_EVENT);
        assert.equal(action?.kind, "web");
        if (action?.kind === "web") {
          assert.match(action.href, /calendar\.google\.com/);
          assert.match(action.href, /20260829T060000Z/);
          assert.match(action.href, /20260830T170000Z/);
        }
      }
    );
  });

  it("opens Outlook on Windows Edge", () => {
    withNavigator(
      {
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
        platform: "Win32",
      },
      () => {
        assert.equal(detectCalendarPlatform(), "outlook");
        const action = resolveCalendarPrimaryAction(FEMMORA_EVENT);
        assert.equal(action?.kind, "web");
        if (action?.kind === "web") {
          assert.match(action.href, /outlook\.live\.com/);
        }
      }
    );
  });

  it("returns null when dates cannot be parsed", () => {
    withNavigator(
      {
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        platform: "MacIntel",
      },
      () => {
        assert.equal(
          resolveCalendarPrimaryAction({ title: "x", startDateRaw: "soon" }),
          null
        );
      }
    );
  });
});
