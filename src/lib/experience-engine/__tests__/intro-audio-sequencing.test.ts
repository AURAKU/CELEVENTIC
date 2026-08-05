import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { introGestureAudioAction } from "../soft-intro";

/**
 * The brand film owns the audio stage for its entire runtime. A guest must
 * hear the intro clip's own soundtrack and nothing else between tapping
 * "Open Invitation" and the end of the film — no template track underneath,
 * no uploaded music bleeding in.
 *
 * The single rule these tests protect: the "Open Invitation" gesture may never
 * start the invitation's track. Whatever the pipeline shape, the action is
 * either a silent buffer ("prime") or a silent authorisation
 * ("arm-silently"), and the track itself begins on a later gesture.
 */
describe("Open Invitation gesture never starts template audio", () => {
  const shapes = [
    { needsTapGate: true, showReveal: false },
    { needsTapGate: false, showReveal: true },
    { needsTapGate: true, showReveal: true },
    { needsTapGate: false, showReveal: false },
  ];

  for (const shape of shapes) {
    for (const wantsAutoplay of [true, false]) {
      it(`stays silent for ${JSON.stringify({ ...shape, wantsAutoplay })}`, () => {
        const action = introGestureAudioAction({ ...shape, wantsAutoplay });
        assert.ok(
          action === "prime" || action === "arm-silently",
          `expected a silent action, got ${action}`
        );
      });
    }
  }
});

describe("post-film gesture owns the track start", () => {
  it("only primes when a Tap to Begin gate follows the film", () => {
    // The gate's own tap calls play(), so this gesture must not pre-empt it.
    assert.equal(
      introGestureAudioAction({ needsTapGate: true, wantsAutoplay: true }),
      "prime"
    );
  });

  it("only primes when an envelope/curtain reveal follows the film", () => {
    assert.equal(
      introGestureAudioAction({ showReveal: true, wantsAutoplay: true }),
      "prime"
    );
  });

  it("arms silently when the film hands straight to the portal", () => {
    // No later gesture exists, so this tap is spent on a muted play/pause —
    // otherwise iOS autoplay policy would block the programmatic play() that
    // follows and the invitation would land in silence.
    assert.equal(
      introGestureAudioAction({
        needsTapGate: false,
        showReveal: false,
        wantsAutoplay: true,
      }),
      "arm-silently"
    );
  });

  it("never spends a gesture when the invitation has no autostart track", () => {
    assert.equal(
      introGestureAudioAction({
        needsTapGate: false,
        showReveal: false,
        wantsAutoplay: false,
      }),
      "prime"
    );
  });
});
