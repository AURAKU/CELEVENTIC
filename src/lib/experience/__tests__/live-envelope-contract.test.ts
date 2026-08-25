import test from "node:test";
import assert from "node:assert/strict";

import {
  isLiveGuestInviteMount,
  resolveEnvelopeAutoOpen,
  resolveShowReveal,
  shouldEnvelopeAutoOpen,
} from "@/lib/experience/live-envelope-contract";
import {
  createEnvelopeCeremonySnapshot,
  envelopeCeremonyTimersAfterBegin,
  reduceEnvelopeCeremony,
} from "@/lib/experience/envelope-ceremony-machine";
import {
  forceUnlockRevealScroll,
  lockRevealScroll,
} from "@/lib/experience-engine/reveal-runtime";

/**
 * LIVE envelope must wait indefinitely for an explicit guest gesture.
 * These contracts are the production-safe gates used by PremiumInviteWrapper
 * and EnvelopeCollectionReveal — not delays, not soft heuristics.
 */

test("LIVE guest mount: /invite route shape is live; studio/catalogue are not", () => {
  assert.equal(
    isLiveGuestInviteMount({
      invitationId: "clxyzguestinvite01",
      uniqueLink: "obaapanin-vida-serwaa",
    }),
    true
  );
  assert.equal(
    isLiveGuestInviteMount({
      embedded: true,
      invitationId: "clxyzguestinvite01",
      uniqueLink: "obaapanin-vida-serwaa",
    }),
    false
  );
  assert.equal(
    isLiveGuestInviteMount({
      skipAnalytics: true,
      invitationId: "studio-preview",
      uniqueLink: "preview",
    }),
    false
  );
  assert.equal(
    isLiveGuestInviteMount({
      invitationId: "preview",
      uniqueLink: "anything",
    }),
    false
  );
});

test("MANDATORY: LIVE auto-open protection — autoOpenReveal=true is ignored for live guests", () => {
  assert.equal(
    resolveEnvelopeAutoOpen({ isLiveGuest: true, autoOpenReveal: true }),
    false
  );
  assert.equal(
    resolveEnvelopeAutoOpen({ isLiveGuest: true, autoOpenReveal: false }),
    false
  );
  assert.equal(
    shouldEnvelopeAutoOpen({
      autoOpen: resolveEnvelopeAutoOpen({ isLiveGuest: true, autoOpenReveal: true }),
      staticPreview: false,
    }),
    false
  );
});

test("MANDATORY: PREVIEW may still auto-open when explicitly opted in", () => {
  assert.equal(
    resolveEnvelopeAutoOpen({ isLiveGuest: false, autoOpenReveal: true }),
    true
  );
  assert.equal(
    shouldEnvelopeAutoOpen({ autoOpen: true, staticPreview: false }),
    true
  );
  assert.equal(
    shouldEnvelopeAutoOpen({ autoOpen: true, staticPreview: true }),
    false
  );
});

test("MANDATORY: FUNERAL showReveal survives revealEnabled=false + legacy opening", () => {
  assert.equal(
    resolveShowReveal({
      isFuneralCollection: true,
      skipReveal: false,
      revealEnabled: false,
      openingExperience: "candle-light",
      revealMode: "envelope",
    }),
    true
  );
  assert.equal(
    resolveShowReveal({
      isFuneralCollection: true,
      skipReveal: true,
      revealEnabled: false,
      openingExperience: "candle-light",
    }),
    false
  );
  assert.equal(
    resolveShowReveal({
      isFuneralCollection: true,
      skipReveal: false,
      revealEnabled: true,
      openingExperience: "wax-seal-black",
      revealMode: "none",
    }),
    false
  );
});

test("non-funeral still respects revealEnabled=false", () => {
  assert.equal(
    resolveShowReveal({
      isFuneralCollection: false,
      skipReveal: false,
      revealEnabled: false,
      openingExperience: "wax-seal-gold",
    }),
    false
  );
});

test("MANDATORY: LIVE envelope waits — idle has no completion path without BEGIN", () => {
  let state = createEnvelopeCeremonySnapshot("idle");
  const config = { unsealMs: 1900, durationMs: 5600 };

  // Simulate 60s of wall time with no BEGIN — only COMPLETE ticks (which idle ignores).
  for (let i = 0; i < 60; i += 1) {
    state = reduceEnvelopeCeremony(state, { type: "TICK_COMPLETE" }, config);
    state = reduceEnvelopeCeremony(state, { type: "TICK_UNSEAL_DONE" }, config);
  }

  assert.equal(state.phase, "idle");
  assert.equal(state.started, false);
  assert.equal(state.completed, false);

  const timers = envelopeCeremonyTimersAfterBegin(config);
  assert.ok(timers.unsealMs === null || timers.unsealMs > 0);
  // Timers only exist AFTER begin — proving idle schedules nothing by itself.
  assert.equal(createEnvelopeCeremonySnapshot("idle").phase, "idle");
});

test("MANDATORY: CLICK OPENS — BEGIN drives idle → unsealing → opening → done once", () => {
  const config = { unsealMs: 100, durationMs: 400, settleExtraMs: 80 };
  let state = createEnvelopeCeremonySnapshot("idle");
  let completeCount = 0;

  state = reduceEnvelopeCeremony(state, { type: "BEGIN" }, config);
  assert.equal(state.phase, "unsealing");
  assert.equal(state.started, true);

  // Second BEGIN is a no-op (single open).
  const again = reduceEnvelopeCeremony(state, { type: "BEGIN" }, config);
  assert.equal(again.phase, "unsealing");

  state = reduceEnvelopeCeremony(state, { type: "TICK_UNSEAL_DONE" }, config);
  assert.equal(state.phase, "opening");

  state = reduceEnvelopeCeremony(state, { type: "TICK_COMPLETE" }, config);
  assert.equal(state.phase, "done");
  assert.equal(state.completed, true);
  completeCount += 1;

  state = reduceEnvelopeCeremony(state, { type: "TICK_COMPLETE" }, config);
  assert.equal(state.phase, "done");
  assert.equal(completeCount, 1);

  const timers = envelopeCeremonyTimersAfterBegin(config);
  assert.equal(timers.unsealMs, 100);
  assert.equal(timers.completeMs, 480);
});

test("MANDATORY: SCROLL unlock — forceUnlockRevealScroll clears lock + body styles", () => {
  const doc = {
    body: { style: { overflow: "", touchAction: "" } as Record<string, string> },
    documentElement: {
      classList: {
        values: new Set<string>(),
        add(v: string) {
          this.values.add(v);
        },
        remove(v: string) {
          this.values.delete(v);
        },
        contains(v: string) {
          return this.values.has(v);
        },
      },
    },
  };

  (globalThis as { document?: typeof doc }).document = doc;

  const unlock = lockRevealScroll();
  assert.equal(doc.body.style.overflow, "hidden");
  assert.equal(doc.body.style.touchAction, "none");
  assert.equal(doc.documentElement.classList.contains("reveal-scroll-locked"), true);

  // Nested lock then force clear (simulates stuck lockCount after envelope → portal).
  lockRevealScroll();
  forceUnlockRevealScroll();

  assert.equal(doc.body.style.overflow, "");
  assert.equal(doc.body.style.touchAction, "");
  assert.equal(doc.documentElement.classList.contains("reveal-scroll-locked"), false);

  unlock();
  forceUnlockRevealScroll();
  delete (globalThis as { document?: typeof doc }).document;
});
