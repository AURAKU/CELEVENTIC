import test from "node:test";
import assert from "node:assert/strict";
import { createCeremonyGestureBoundary } from "@/lib/experience/ceremony-gesture-boundary";
import {
  forceUnlockInvitationViewport,
  getInvitationScrollLockCountForTests,
  lockRevealScroll,
} from "@/lib/experience-engine/invitation-scroll-lock";
import { CeremonyErrorBoundary } from "@/components/invitation-os/ceremony-error-boundary";
import {
  resolveLiveRevealConfiguration,
  resolvePhaseAfterTapBegin,
} from "@/lib/experience/live-envelope-contract";

test("gesture boundary: disarmed mount rejects seal click until armed", () => {
  const boundary = createCeremonyGestureBoundary();
  assert.equal(boundary.getState(), "disarmed");
  assert.equal(boundary.noteSealPointerDown(), null);
  assert.equal(boundary.mayOpenFromSealClick(1), false);

  boundary.forceArmForTests();
  assert.equal(boundary.getState(), "armed");
  const token = boundary.noteSealPointerDown();
  assert.ok(token != null);
  assert.equal(boundary.mayOpenFromSealClick(token), true);
  assert.equal(boundary.mayOpenFromSealClick(token), false);
});

test("gesture boundary: keyboard open only when armed", () => {
  const boundary = createCeremonyGestureBoundary();
  assert.equal(boundary.mayOpenFromKeyboard(), false);
  boundary.forceArmForTests();
  assert.equal(boundary.mayOpenFromKeyboard(), true);
});

test("scroll lock: forceUnlock clears nested locks and body touch-action", () => {
  const doc = {
    body: {
      style: {
        overflow: "",
        touchAction: "",
        pointerEvents: "",
        position: "",
      } as Record<string, string>,
    },
    documentElement: {
      style: {
        overflow: "",
        touchAction: "",
        pointerEvents: "",
      } as Record<string, string>,
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
    querySelector() {
      return null;
    },
  };

  (globalThis as { document?: typeof doc }).document = doc;

  lockRevealScroll();
  lockRevealScroll();
  assert.equal(doc.body.style.touchAction, "none");
  assert.ok(getInvitationScrollLockCountForTests() >= 1);

  forceUnlockInvitationViewport("test");
  assert.equal(getInvitationScrollLockCountForTests(), 0);
  assert.equal(doc.body.style.touchAction, "");
  assert.equal(doc.body.style.overflow, "");
  assert.equal(doc.documentElement.classList.contains("reveal-scroll-locked"), false);

  forceUnlockInvitationViewport("cleanup");
  delete (globalThis as { document?: typeof doc }).document;
});

test("Tap to Begin with showReveal → reveal phase (not portal)", () => {
  assert.equal(resolvePhaseAfterTapBegin(true), "reveal");
  assert.equal(resolvePhaseAfterTapBegin(false), "portal");
});

test("production memorial config resolves showReveal + wax-seal-black", () => {
  const live = resolveLiveRevealConfiguration({
    catalogSlug: "one-week-vigil-notice",
    layout: "memorial-candle-tribute",
    studio: { revealMode: "curtain" },
    experience: {
      collectionId: "funeral",
      openingExperience: "envelope-classic",
    },
  });
  assert.equal(live.showReveal, true);
  assert.equal(live.mandatoryMemorialEnvelope, true);
  assert.equal(live.resolvedRevealMode, "envelope");
  assert.equal(live.resolvedOpeningExperience, "wax-seal-black");
  assert.equal(live.curtainOwnsTap, false);
});

test("CeremonyErrorBoundary hold policy does not call onFallthrough", () => {
  let fell = false;
  const boundary = new CeremonyErrorBoundary({
    beat: "reveal",
    fallthroughPolicy: "hold",
    onFallthrough: () => {
      fell = true;
    },
    children: null,
  });
  boundary.componentDidCatch(new Error("boom"));
  assert.equal(fell, false);
});

test("CeremonyErrorBoundary advance policy calls onFallthrough", () => {
  let fell = false;
  const boundary = new CeremonyErrorBoundary({
    beat: "reveal",
    fallthroughPolicy: "advance",
    onFallthrough: () => {
      fell = true;
    },
    children: null,
  });
  boundary.componentDidCatch(new Error("boom"));
  assert.equal(fell, true);
});
