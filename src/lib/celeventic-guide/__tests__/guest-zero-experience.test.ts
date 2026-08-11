import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { CELEVENTIC_GUIDE_CATALOG } from "../catalog";
import {
  GUEST_CONTEXTUAL_TOPICS,
  GUEST_QUICK_ACTIONS,
  GUEST_TROUBLESHOOTING_SLUGS,
  GUEST_VISUAL_GUIDE_SLUGS,
  GUEST_ZERO_INTRO_BEATS,
  clearGuestIntro,
  guestIntroStorageKey,
  hasFinishedGuestIntro,
  rememberGuestIntro,
} from "../guest-zero-experience";
import { getStoryboard } from "../storyboards";

function installMemoryLocalStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: storage },
    configurable: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
}

describe("§63 guest zero-experience", () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    clearGuestIntro("inv-test", "guest-1");
    clearGuestIntro("inv-test", null);
  });

  it("remembers show/skip and does not repeat", () => {
    assert.equal(hasFinishedGuestIntro("inv-test", "guest-1"), false);
    rememberGuestIntro("inv-test", "skipped", "guest-1");
    assert.equal(hasFinishedGuestIntro("inv-test", "guest-1"), true);
    assert.equal(hasFinishedGuestIntro("inv-test", "guest-2"), false);
    assert.ok(guestIntroStorageKey("inv-test", "guest-1").includes("guest-intro"));
  });

  it("maps contextual help topics for invite surfaces", () => {
    const ids = GUEST_CONTEXTUAL_TOPICS.map((t) => t.id);
    for (const id of ["rsvp", "qr", "party", "seating", "event-guide", "memory", "event-day"]) {
      assert.ok(ids.includes(id), id);
    }
    for (const topic of GUEST_CONTEXTUAL_TOPICS) {
      assert.ok(topic.steps.length >= 2 && topic.steps.length <= 4);
      assert.ok(topic.what && topic.doNext && topic.why && topic.after);
    }
  });

  it("ships guest quick actions with friendly labels", () => {
    const labels = GUEST_QUICK_ACTIONS.map((a) => a.label);
    for (const label of [
      "Open My Invitation",
      "RSVP",
      "Show My QR",
      "Find My Seat",
      "View Programme",
      "View Menu",
      "Event Location",
      "Share Photos & Videos",
      "Leave a Wish",
      "Need Help",
    ]) {
      assert.ok(labels.includes(label), label);
    }
  });

  it("covers the 24 visual guides and troubleshooting seeds", () => {
    const slugs = new Set(CELEVENTIC_GUIDE_CATALOG.map((g) => g.slug));
    for (const slug of GUEST_VISUAL_GUIDE_SLUGS) {
      assert.ok(slugs.has(slug), `missing visual guide ${slug}`);
    }
    for (const slug of GUEST_TROUBLESHOOTING_SLUGS) {
      assert.ok(slugs.has(slug), `missing troubleshooting ${slug}`);
    }
    for (const g of CELEVENTIC_GUIDE_CATALOG.filter((x) =>
      (GUEST_VISUAL_GUIDE_SLUGS as readonly string[]).includes(x.slug)
    )) {
      assert.equal(g.videoUrl ?? null, null);
      assert.ok(g.steps.length >= 1);
    }
  });

  it("ships Show Me Around storyboard without claiming video", () => {
    assert.ok(GUEST_ZERO_INTRO_BEATS.length >= 7);
    const total = GUEST_ZERO_INTRO_BEATS.reduce((s, b) => s + b.durationMs, 0);
    assert.ok(total >= 30000 && total <= 45000);
    const sb = getStoryboard("guest-zero-intro");
    assert.ok(sb);
    assert.equal(sb!.videoUrl, null);
  });
});
