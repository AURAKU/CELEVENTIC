import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CELEVENTIC_INVITATION_INTRO_POSTER,
  CELEVENTIC_INVITATION_INTRO_VIDEO,
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
  playIntroWithMutedFallback,
  prepareIntroVideoElement,
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
  return {
    muted: false,
    defaultMuted: false,
    paused: true,
    ended: false,
    play: playImpl,
  };
}

describe("soft-intro media URLs", () => {
  it("uses brand paths with the current cache-bust query", () => {
    assert.equal(
      CELEVENTIC_INVITATION_INTRO_VIDEO,
      "/brand/celeventic-invitation-intro.mp4?v=20260802c"
    );
    assert.equal(
      CELEVENTIC_INVITATION_INTRO_POSTER,
      "/brand/celeventic-invitation-intro-poster.jpg?v=20260802c"
    );
    assert.equal(INTRO_VIDEO_SRC, CELEVENTIC_INVITATION_INTRO_VIDEO);
    assert.equal(INTRO_POSTER_SRC, CELEVENTIC_INVITATION_INTRO_POSTER);
    assert.equal(SOFT_INTRO_FALLBACK_MS, 14_000);
    assert.equal(INTRO_UNKNOWN_DURATION_FALLBACK_MS, 14_000);
  });
});

describe("muted autoplay success", () => {
  it("plays when muted autoplay is allowed", async () => {
    const video = mockVideo(async () => undefined);
    const result = await playIntroWithMutedFallback(video, false);
    assert.equal(result.playing, true);
    assert.equal(result.muted, true);
    assert.equal(result.needsGesture, false);
    assert.equal(video.muted, true);
  });
});

describe("unmuted autoplay rejection → muted fallback success", () => {
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

describe("unmuted autoplay rejection only", () => {
  it("classifies policy rejection without marking a media failure", async () => {
    const rejected = await attemptVideoPlay(mockVideo(async () => {
      throw Object.assign(new Error("play() failed because the user didn't interact"), {
        name: "NotAllowedError",
      });
    }), { muted: false });
    assert.equal(rejected.ok, false);
    assert.equal(isAutoplayPolicyRejection(rejected), true);
  });
});

describe("manual tap playback", () => {
  it("plays unmuted after an explicit gesture path", async () => {
    const video = mockVideo(async () => undefined);
    const result = await playIntroWithMutedFallback(video, true);
    assert.equal(result.playing, true);
    assert.equal(result.muted, false);
    assert.equal(video.muted, false);
  });
});

describe("real load failure", () => {
  it("reports error diagnostics without guest PII", () => {
    const video = {
      currentSrc: "/brand/celeventic-invitation-intro.mp4",
      src: "/brand/celeventic-invitation-intro.mp4",
      readyState: 0,
      networkState: 3,
      paused: true,
      ended: false,
      muted: true,
      autoplay: true,
      error: { code: 4 },
    } as unknown as HTMLVideoElement;

    const diagnostics = collectIntroVideoDiagnostics(video, "MEDIA_ERR_SRC_NOT_SUPPORTED");
    assert.equal(diagnostics.errorCode, 4);
    assert.equal(diagnostics.networkState, 3);
    assert.equal(diagnostics.readyState, 0);
    assert.equal(diagnostics.currentSrc, "/brand/celeventic-invitation-intro.mp4");
    assert.equal("token" in diagnostics, false);
    assert.equal("guestId" in diagnostics, false);
  });

  it("needs gesture when both unmuted and muted play are blocked by policy", async () => {
    const video = mockVideo(async () => {
      throw Object.assign(new Error("NotAllowedError"), { name: "NotAllowedError" });
    });
    const result = await playIntroWithMutedFallback(video, true);
    assert.equal(result.playing, false);
    assert.equal(result.needsGesture, true);
  });
});

describe("timeout completion", () => {
  it("caps at 14s and never finishes before the start grace window", () => {
    assert.equal(softIntroTimeoutMs(null), 14_000);
    assert.equal(softIntroTimeoutMs(undefined), 14_000);
    assert.equal(softIntroTimeoutMs(0), 14_000);
    assert.ok(softIntroTimeoutMs(0.1) >= INTRO_MIN_START_GRACE_MS);
    assert.ok(softIntroTimeoutMs(12.5) <= 14_000);
    assert.equal(softIntroTimeoutMs(12.5), 13_000);
    assert.equal(softIntroTimeoutMs(10), 10_500);
  });
});

describe("onEnded completion / no blank screen / no immediate completion", () => {
  it("keeps soft-intro as the initial live phase so the screen is never blank", () => {
    assert.equal(shouldShowSoftIntro({}), true);
    assert.equal(shouldShowSoftIntro({ skipSoftIntro: false, skipIntro: false }), true);
    assert.equal(resolveInitialInvitePhase({ needsTapGate: true, showReveal: true }), "soft-intro");
    assert.equal(
      resolveInitialInvitePhase({ skipSoftIntro: false, skipIntro: false, needsTapGate: true }),
      "soft-intro"
    );
  });

  it("does not treat a zero/unknown duration as an instant finish", () => {
    assert.ok(softIntroTimeoutMs(0) >= INTRO_MIN_START_GRACE_MS);
    assert.ok(softIntroTimeoutMs(null) >= INTRO_MIN_START_GRACE_MS);
    assert.equal(softIntroTimeoutMs(null), 14_000);
  });
});

describe("mobile Safari playsInline preparation", () => {
  it("forces muted + playsInline attributes required by iOS autoplay policy", () => {
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
    assert.equal(video.playsInline, true);
    assert.equal(video.preload, "auto");
    assert.equal(video.controls, false);
    assert.equal(attrs.get("playsinline"), "");
    assert.equal(attrs.get("webkit-playsinline"), "");
    assert.equal(attrs.get("muted"), "");
  });
});

describe("intro session storage scoped to invitation link", () => {
  it("scopes session memory per invitation — never a global introSeen key", () => {
    assert.match(softIntroSessionKey("invite-link-abc"), /^celeventic:soft-intro:session:v1:invite-link-abc$/);
    assert.notEqual(softIntroSessionKey("inv_a"), softIntroSessionKey("inv_b"));
    assert.ok(!softIntroSessionKey("inv_a").includes("hasSeenIntro"));
    assert.ok(!softIntroSessionKey("inv_a").includes("introSeen"));
  });

  it("remembers and forgets within sessionStorage only (does not imply auto-skip)", () => {
    withSessionStorage(() => {
      assert.equal(hasSeenSoftIntroThisSession("inv_1"), false);
      rememberSoftIntroThisSession("inv_1");
      assert.equal(hasSeenSoftIntroThisSession("inv_1"), true);
      assert.equal(hasSeenSoftIntroThisSession("inv_2"), false);
      forgetSoftIntroThisSession("inv_1");
      assert.equal(hasSeenSoftIntroThisSession("inv_1"), false);
    });
  });
});
