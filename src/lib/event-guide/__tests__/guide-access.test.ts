import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateGuideAvailability,
  shouldPurgeOfflineCache,
  unavailableHttpStatus,
  type GuideLinkState,
  type GuideRecordState,
} from "../access";
import { GUIDE_UNAVAILABLE_COPY, type GuideUnavailableReason } from "../types";

const EVENT = "evt_alpha";

function link(over: Partial<GuideLinkState> = {}): GuideLinkState {
  return { type: "EVENT_GUIDE", status: "ACTIVE", eventId: EVENT, expiresAt: null, ...over };
}

function guide(over: Partial<GuideRecordState> = {}): GuideRecordState {
  return { eventId: EVENT, enabled: true, status: "PUBLISHED", publishedVersion: 3, ...over };
}

function reasonOf(result: ReturnType<typeof evaluateGuideAvailability>): GuideUnavailableReason {
  assert.equal(result.available, false, "expected the guide to be unavailable");
  return (result as { available: false; reason: GuideUnavailableReason }).reason;
}

describe("evaluateGuideAvailability — the happy path", () => {
  it("opens a published, enabled guide on an active online link", () => {
    const result = evaluateGuideAvailability({
      link: link(),
      guide: guide(),
      eventStatus: "PUBLISHED",
    });
    assert.equal(result.available, true);
  });
});

describe("token isolation", () => {
  it("refuses a token that belongs to another event's guide", () => {
    const result = evaluateGuideAvailability({
      link: link({ eventId: "evt_alpha" }),
      guide: guide({ eventId: "evt_beta" }),
      eventStatus: "PUBLISHED",
    });
    // Deliberately NOT_FOUND rather than a distinct reason: a mismatched pair
    // must be indistinguishable from a guessed token.
    assert.equal(reasonOf(result), "NOT_FOUND");
  });

  it("refuses an unknown token", () => {
    const result = evaluateGuideAvailability({ link: null, guide: guide(), eventStatus: "PUBLISHED" });
    assert.equal(reasonOf(result), "NOT_FOUND");
  });

  it("refuses a menu/programme/seating token on the guide route", () => {
    for (const type of ["MENU", "PROGRAMME", "SEATING_LOOKUP", "VENUE", "HELP", "CUSTOM"]) {
      const result = evaluateGuideAvailability({
        link: link({ type }),
        guide: guide(),
        eventStatus: "PUBLISHED",
      });
      assert.equal(reasonOf(result), "WRONG_TYPE", `${type} must not open the guide`);
    }
  });

  it("never resolves a venue-offline token on the public domain", () => {
    const result = evaluateGuideAvailability({
      link: link({ type: "EVENT_GUIDE_OFFLINE" }),
      guide: guide(),
      eventStatus: "PUBLISHED",
    });
    // NOT_FOUND, not WRONG_TYPE — the public internet should not learn that a
    // venue pack token even exists.
    assert.equal(reasonOf(result), "NOT_FOUND");
  });
});

describe("a draft is never public", () => {
  it("refuses a DRAFT guide even when the link is active and the guide is enabled", () => {
    const result = evaluateGuideAvailability({
      link: link(),
      guide: guide({ status: "DRAFT", publishedVersion: null }),
      eventStatus: "PUBLISHED",
    });
    assert.equal(reasonOf(result), "NOT_PUBLISHED");
  });

  it("refuses a guide marked PUBLISHED that has no published version", () => {
    const result = evaluateGuideAvailability({
      link: link(),
      guide: guide({ publishedVersion: null }),
      eventStatus: "PUBLISHED",
    });
    assert.equal(reasonOf(result), "NOT_PUBLISHED");
  });

  it("refuses a guide that was unpublished back to draft after being live", () => {
    const result = evaluateGuideAvailability({
      link: link(),
      guide: guide({ status: "DRAFT", publishedVersion: 7 }),
      eventStatus: "PUBLISHED",
    });
    assert.equal(reasonOf(result), "NOT_PUBLISHED");
  });

  it("refuses a guide the organizer has not enabled", () => {
    const result = evaluateGuideAvailability({
      link: link(),
      guide: guide({ enabled: false }),
      eventStatus: "PUBLISHED",
    });
    assert.equal(reasonOf(result), "NOT_ENABLED");
  });

  it("refuses when no guide record exists at all", () => {
    const result = evaluateGuideAvailability({ link: link(), guide: null, eventStatus: "PUBLISHED" });
    assert.equal(reasonOf(result), "NOT_ENABLED");
  });
});

describe("link lifecycle", () => {
  it("maps each retired link status to its own reason", () => {
    const cases: Array<[string, GuideUnavailableReason]> = [
      ["REVOKED", "REVOKED"],
      ["DISABLED", "DISABLED"],
      ["EXPIRED", "EXPIRED"],
    ];
    for (const [status, reason] of cases) {
      const result = evaluateGuideAvailability({
        link: link({ status }),
        guide: guide(),
        eventStatus: "PUBLISHED",
      });
      assert.equal(reasonOf(result), reason);
    }
  });

  it("treats an unrecognised link status as disabled rather than open", () => {
    const result = evaluateGuideAvailability({
      link: link({ status: "SOMETHING_NEW" }),
      guide: guide(),
      eventStatus: "PUBLISHED",
    });
    assert.equal(reasonOf(result), "DISABLED");
  });

  it("closes the guide once the link's expiry has passed", () => {
    const now = new Date("2026-08-06T12:00:00Z");
    const past = evaluateGuideAvailability({
      link: link({ expiresAt: "2026-08-06T11:59:59Z" }),
      guide: guide(),
      eventStatus: "PUBLISHED",
      now,
    });
    assert.equal(reasonOf(past), "EXPIRED");

    const future = evaluateGuideAvailability({
      link: link({ expiresAt: "2026-08-06T12:00:01Z" }),
      guide: guide(),
      eventStatus: "PUBLISHED",
      now,
    });
    assert.equal(future.available, true);
  });

  it("ignores an unparseable expiry instead of locking guests out", () => {
    const result = evaluateGuideAvailability({
      link: link({ expiresAt: "not-a-date" }),
      guide: guide(),
      eventStatus: "PUBLISHED",
    });
    assert.equal(result.available, true);
  });

  it("closes the guide for a cancelled event", () => {
    const result = evaluateGuideAvailability({
      link: link(),
      guide: guide(),
      eventStatus: "CANCELLED",
    });
    assert.equal(reasonOf(result), "EVENT_CANCELLED");
  });
});

describe("offline cache purge signalling", () => {
  it("purges caches for tokens that were genuinely retired", () => {
    for (const reason of [
      "REVOKED",
      "EXPIRED",
      "DISABLED",
      "NOT_ENABLED",
      "NOT_PUBLISHED",
      "EVENT_CANCELLED",
    ] as GuideUnavailableReason[]) {
      assert.equal(shouldPurgeOfflineCache(reason), true, reason);
      assert.equal(unavailableHttpStatus(reason), 410, reason);
    }
  });

  it("does not purge on a guessed or mistyped token", () => {
    for (const reason of ["NOT_FOUND", "WRONG_TYPE"] as GuideUnavailableReason[]) {
      assert.equal(shouldPurgeOfflineCache(reason), false, reason);
      assert.equal(unavailableHttpStatus(reason), 404, reason);
    }
  });
});

describe("guest-facing copy", () => {
  it("has calm, non-technical copy for every reason", () => {
    const reasons: GuideUnavailableReason[] = [
      "NOT_FOUND",
      "WRONG_TYPE",
      "REVOKED",
      "DISABLED",
      "EXPIRED",
      "NOT_ENABLED",
      "NOT_PUBLISHED",
      "EVENT_CANCELLED",
    ];
    for (const reason of reasons) {
      const copy = GUIDE_UNAVAILABLE_COPY[reason];
      assert.ok(copy, `missing copy for ${reason}`);
      assert.ok(copy.heading.length > 0 && copy.body.length > 0, reason);
      assert.doesNotMatch(copy.heading + copy.body, /404|500|error|token|null/i, reason);
    }
  });
});
