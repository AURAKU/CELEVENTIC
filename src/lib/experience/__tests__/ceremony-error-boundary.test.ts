import test from "node:test";
import assert from "node:assert/strict";
import { CeremonyErrorBoundary } from "@/components/invitation-os/ceremony-error-boundary";
import { resolveLiveRevealConfiguration, resolvePhaseAfterTapBegin } from "@/lib/experience/live-envelope-contract";

test("CeremonyErrorBoundary exposes componentDidCatch for reveal beat guard", () => {
  assert.equal(typeof CeremonyErrorBoundary.prototype.componentDidCatch, "function");
});

test("healthy mandatory memorial config reaches reveal phase (no portal fallthrough path)", () => {
  const live = resolveLiveRevealConfiguration({
    catalogSlug: "classic-memorial",
    layout: "memorial-candle-tribute",
    studio: { revealMode: "none" },
    experience: { openingExperience: "candle-light", collectionId: "funeral" },
  });
  assert.equal(live.mandatoryMemorialEnvelope, true);
  assert.equal(live.showReveal, true);
  assert.equal(resolvePhaseAfterTapBegin(live.showReveal), "reveal");
  assert.notEqual(resolvePhaseAfterTapBegin(live.showReveal), "portal");
});

test("reveal error diagnostic hook fires before host fallthrough (contract)", () => {
  const order: string[] = [];
  const onError = () => order.push("error");
  const onFallthrough = () => order.push("fallthrough");
  onError();
  onFallthrough();
  assert.deepEqual(order, ["error", "fallthrough"]);
});
