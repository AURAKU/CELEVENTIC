import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CELEVENTIC_INVITATION_INTRO_POSTER,
  CELEVENTIC_INVITATION_INTRO_VIDEO,
  SOFT_INTRO_CTA,
  SOFT_INTRO_FALLBACK_MS,
  shouldShowSoftIntro,
  resolveInitialInvitePhase,
} from "../soft-intro";
import {
  INTRO_MIN_START_GRACE_MS,
  INTRO_POSTER_SRC,
  INTRO_UNKNOWN_DURATION_FALLBACK_MS,
  INTRO_VIDEO_SRC,
  attemptVideoPlay,
  collectIntroVideoDiagnostics,
  forgetSoftIntroThisSession,
  hasSeenSoftIntroThisSession,
  isAutoplayPolicyRejection,
  playIntroFromUserGesture,
  playIntroWithMutedFallback,
  prepareIntroVideoElement,
  prepareIntroVideoForGesturePlayback,
  rememberSoftIntroThisSession,
  softIntroSessionKey,
  softIntroTimeoutMs,
} from "../soft-intro-playback";

function withSessionStorage<T>(run: () => T): T {
  const store = new Map<string, string>();
  const globalRef = globalThis as { window?: unknown };
  const previous = globalRef.window;
  globalRef.window = {
    sessionStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  };
  try {
    return run();
  } finally {
    if (previous === undefined) delete globalRef.window;
    else globalRef.window = previous;
  }
}

function mockVideo(playImpl: () => Promise<void>) {
  const attrs = new Map<string, string>();
  return {
    muted: true,
    defaultMuted: true,
    volume: 0.5,
    paused: true,
    ended: false,
    currentTime: 3.5,
    playsInline: false,
    preload: "none",
    controls: true,
    disablePictureInPicture: false,
    playCalls: 0,
    pause() {
      this.paused = true;
    },
    setAttribute(name: string, value: string) {
      attrs.set(name, value);
    },
    removeAttribute(name: string) {
      attrs.delete(name);
    },
    getAttr: (name: string) => attrs.get(name),
    play: async function play(this: { playCalls: number; paused: boolean }) {
      this.playCalls += 1;
      await playImpl();
      this.paused = false;
    },
  };
}

describe("soft-intro media URLs", () => {
  it("uses brand paths with the current cache-bust query", () => {
    assert.equal(CELEVENTIC_INVITATION_INTRO_VIDEO, INTRO_VIDEO_SRC);
    assert.equal(CELEVENTIC_INVITATION_INTRO_POSTER, INTRO_POSTER_SRC);
    assert.match(INTRO_VIDEO_SRC, /celeventic-invitation-intro\.mp4\?v=/);
    assert.equal(SOFT_INTRO_FALLBACK_MS, 14_000);
    assert.equal(INTRO_UNKNOWN_DURATION_FALLBACK_MS, 14_000);
    assert.equal(SOFT_INTRO_CTA, "Open Invitation");
  });
});

describe("live Open Invitation gesture playback", () => {
  it("does not play before the gesture helper is invoked", async () => {
    const video = mockVideo(async () => undefined);
    assert.equal(video.playCalls, 0);
    assert.equal(video.paused, true);
  });

  it("prepares unmuted frame-zero state before play()", () => {
    const video = mockVideo(async () => undefined);
    const prepared = prepareIntroVideoForGesturePlayback(video as never);
    assert.equal(video.paused, true);
    assert.equal(video.currentTime, 0);
    assert.equal(prepared.muted, false);
    assert.equal(prepared.defaultMuted, false);
    assert.equal(prepared.volume, 1);
    assert.equal(video.muted, false);
    assert.equal(video.defaultMuted, false);
    assert.equal(video.volume, 1);
    assert.equal(video.playCalls, 0);
    assert.equal(video.getAttr("muted"), undefined);
  });

  it("issues exactly one unmuted play() from the gesture helper", async () => {
    const video = mockVideo(async () => undefined);
    const result = await playIntroFromUserGesture(video as never as HTMLVideoElement);
    assert.equal(result.playing, true);
    assert.equal(result.muted, false);
    assert.equal(result.volume, 1);
    assert.equal(video.currentTime, 0);
    assert.equal(video.muted, false);
    assert.equal(video.defaultMuted, false);
    assert.equal(video.playCalls, 1);
  });

  it("keeps the gate path available when play() is rejected — no muted fallback", async () => {
    const video = mockVideo(async () => {
      throw Object.assign(new Error("NotAllowedError"), { name: "NotAllowedError" });
    });
    const result = await playIntroFromUserGesture(video as never as HTMLVideoElement);
    assert.equal(result.playing, false);
    assert.equal(video.playCalls, 1);
    assert.equal(video.paused, true);
    // Must not silently continue muted.
    assert.equal(video.muted, false);
    assert.equal(video.defaultMuted, false);
  });

  it("replay prep always restarts at frame zero with sound intent", () => {
    const video = mockVideo(async () => undefined);
    video.currentTime = 8.2;
    video.muted = true;
    video.volume = 0.2;
    prepareIntroVideoForGesturePlayback(video as never);
    assert.equal(video.currentTime, 0);
    assert.equal(video.muted, false);
    assert.equal(video.volume, 1);
  });
});

describe("embedded muted autoplay remains available", () => {
  it("plays when muted autoplay is allowed (preview shells)", async () => {
    const video = mockVideo(async () => undefined);
    const result = await playIntroWithMutedFallback(video, false);
    assert.equal(result.playing, true);
    assert.equal(result.muted, true);
    assert.equal(result.needsGesture, false);
    assert.equal(video.muted, true);
  });
});

describe("unmuted autoplay rejection → muted fallback success (embedded only)", () => {
  it("does not treat NotAllowedError as load failure when muted fallback works", async () => {
    let attempts = 0;
    const video = mockVideo(async () => {
      attempts += 1;
      if (attempts === 1) {
        throw Object.assign(new Error("NotAllowedError"), { name: "NotAllowedError" });
      }
    });
    const result = await playIntroWithMutedFallback(video, true);
    assert.equal(result.playing, true);
    assert.equal(result.muted, true);
    assert.equal(result.needsGesture, false);
    assert.equal(isAutoplayPolicyRejection(result.unmutedRejected!), true);
    assert.equal(attempts, 2);
  });
});

describe("policy classification", () => {
  it("classifies policy rejection without marking a media failure", async () => {
    const rejected = await attemptVideoPlay(
      mockVideo(async () => {
        throw Object.assign(new Error("play() failed because the user didn't interact"), {
          name: "NotAllowedError",
        });
      }),
      { muted: false }
    );
    assert.equal(rejected.ok, false);
    assert.equal(isAutoplayPolicyRejection(rejected), true);
  });
});

describe("real load failure diagnostics", () => {
  it("reports error diagnostics without guest PII", () => {
    const video = {
      currentSrc: "/brand/celeventic-invitation-intro.mp4",
      src: "/brand/celeventic-invitation-intro.mp4",
      readyState: 0,
      networkState: 3,
      paused: true,
      ended: false,
      muted: true,
      autoplay: false,
      error: { code: 4 },
    } as unknown as HTMLVideoElement;

    const diagnostics = collectIntroVideoDiagnostics(video, "MEDIA_ERR_SRC_NOT_SUPPORTED");
    assert.equal(diagnostics.errorCode, 4);
    assert.equal(diagnostics.autoplay, false);
    assert.equal("token" in diagnostics, false);
    assert.equal("guestId" in diagnostics, false);
  });
});

describe("timeout completion", () => {
  it("caps at 14s and never finishes before the start grace window", () => {
    assert.equal(softIntroTimeoutMs(null), 14_000);
    assert.ok(softIntroTimeoutMs(0.1) >= INTRO_MIN_START_GRACE_MS);
    assert.equal(softIntroTimeoutMs(12.5), 13_000);
  });
});

describe("pipeline phase", () => {
  it("keeps soft-intro as the initial live phase so the screen is never blank", () => {
    assert.equal(shouldShowSoftIntro({}), true);
    assert.equal(resolveInitialInvitePhase({ needsTapGate: true, showReveal: true }), "soft-intro");
  });
});

describe("mobile Safari playsInline preparation", () => {
  it("forces muted + playsInline attributes for embedded muted path", () => {
    const attrs = new Map<string, string>();
    const video = {
      defaultMuted: false,
      muted: false,
      playsInline: false,
      preload: "none",
      controls: true,
      disablePictureInPicture: false,
      setAttribute(name: string, value: string) {
        attrs.set(name, value);
      },
      removeAttribute(name: string) {
        attrs.delete(name);
      },
    } as unknown as HTMLVideoElement;

    prepareIntroVideoElement(video, true);
    assert.equal(video.muted, true);
    assert.equal(video.defaultMuted, true);
    assert.equal(attrs.get("muted"), "");
  });
});

describe("intro session storage scoped to invitation link", () => {
  it("scopes session memory per invitation — never a global introSeen key", () => {
    assert.match(softIntroSessionKey("invite-link-abc"), /^celeventic:soft-intro:session:v1:invite-link-abc$/);
    assert.notEqual(softIntroSessionKey("inv_a"), softIntroSessionKey("inv_b"));
  });

  it("remembers and forgets within sessionStorage only (does not imply auto-skip)", () => {
    withSessionStorage(() => {
      assert.equal(hasSeenSoftIntroThisSession("inv_1"), false);
      rememberSoftIntroThisSession("inv_1");
      assert.equal(hasSeenSoftIntroThisSession("inv_1"), true);
      forgetSoftIntroThisSession("inv_1");
      assert.equal(hasSeenSoftIntroThisSession("inv_1"), false);
    });
  });
});
