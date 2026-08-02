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
  INTRO_POSTER_SRC,
  INTRO_UNKNOWN_DURATION_FALLBACK_MS,
  INTRO_VIDEO_SRC,
  attemptVideoPlay,
  collectIntroVideoDiagnostics,
  forgetSoftIntroThisSession,
  hasSeenSoftIntroThisSession,
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

describe("soft-intro media URLs", () => {
  it("uses exact brand paths without cache-busting queries", () => {
    assert.equal(CELEVENTIC_INVITATION_INTRO_VIDEO, "/brand/celeventic-invitation-intro.mp4");
    assert.equal(CELEVENTIC_INVITATION_INTRO_POSTER, "/brand/celeventic-invitation-intro-poster.jpg");
    assert.equal(INTRO_VIDEO_SRC, CELEVENTIC_INVITATION_INTRO_VIDEO);
    assert.equal(INTRO_POSTER_SRC, CELEVENTIC_INVITATION_INTRO_POSTER);
    assert.equal(SOFT_INTRO_FALLBACK_MS, 14_000);
    assert.equal(INTRO_UNKNOWN_DURATION_FALLBACK_MS, 14_000);
  });
});

describe("softIntroTimeoutMs", () => {
  it("uses real video duration when available", () => {
    assert.equal(softIntroTimeoutMs(10), 10_750);
    assert.equal(softIntroTimeoutMs(12.5), 13_250);
  });

  it("falls back to 14 seconds when duration is unknown", () => {
    assert.equal(softIntroTimeoutMs(null), 14_000);
    assert.equal(softIntroTimeoutMs(undefined), 14_000);
    assert.equal(softIntroTimeoutMs(0), 14_000);
    assert.equal(softIntroTimeoutMs(NaN), 14_000);
  });
});

describe("attemptVideoPlay — muted autoplay", () => {
  it("resolves ok when play() succeeds (muted Safari-safe path)", async () => {
    const video = {
      muted: false,
      defaultMuted: false,
      paused: false,
      ended: false,
      play: async () => undefined,
    };
    const result = await attemptVideoPlay(video, { muted: true });
    assert.equal(result.ok, true);
    assert.equal(video.muted, true);
    assert.equal(video.defaultMuted, true);
  });

  it("catches play() rejection (autoplay blocked)", async () => {
    const video = {
      muted: true,
      defaultMuted: true,
      paused: true,
      ended: false,
      play: async () => {
        throw Object.assign(new Error("NotAllowedError"), { name: "NotAllowedError" });
      },
    };
    const result = await attemptVideoPlay(video, { muted: true });
    assert.equal(result.ok, false);
    assert.equal(result.name, "NotAllowedError");
    assert.match(result.reason ?? "", /NotAllowedError|play/i);
  });
});

describe("tap-to-open fallback contract", () => {
  it("treats a second play after rejection as the tap-to-open recovery path", async () => {
    let attempts = 0;
    const video = {
      muted: true,
      defaultMuted: true,
      paused: true,
      ended: false,
      play: async () => {
        attempts += 1;
        if (attempts === 1) {
          throw Object.assign(new Error("NotAllowedError"), { name: "NotAllowedError" });
        }
      },
    };
    const first = await attemptVideoPlay(video, { muted: true });
    assert.equal(first.ok, false);
    const second = await attemptVideoPlay(video, { muted: false });
    assert.equal(second.ok, true);
    assert.equal(video.muted, false);
    assert.equal(attempts, 2);
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
    } as unknown as HTMLVideoElement;

    prepareIntroVideoElement(video);
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

describe("video load failure diagnostics", () => {
  it("reports error codes without guest PII fields", () => {
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

    const diagnostics = collectIntroVideoDiagnostics(video, "NotAllowedError");
    assert.equal(diagnostics.currentSrc, "/brand/celeventic-invitation-intro.mp4");
    assert.equal(diagnostics.readyState, 0);
    assert.equal(diagnostics.networkState, 3);
    assert.equal(diagnostics.paused, true);
    assert.equal(diagnostics.ended, false);
    assert.equal(diagnostics.muted, true);
    assert.equal(diagnostics.autoplay, true);
    assert.equal(diagnostics.errorCode, 4);
    assert.equal(diagnostics.playRejection, "NotAllowedError");
    assert.equal("guestId" in diagnostics, false);
    assert.equal("token" in diagnostics, false);
  });
});

describe("onEnded / timeout fallback reveal", () => {
  it("timeout clears to invitation after duration or 14s — never infinite blank", () => {
    assert.ok(softIntroTimeoutMs(8) < softIntroTimeoutMs(null));
    assert.equal(softIntroTimeoutMs(null), 14_000);
    // Ended path is finish via beginExit; timeout must still be finite.
    assert.ok(Number.isFinite(softIntroTimeoutMs(undefined)));
  });

  it("keeps soft-intro as the initial live phase so the screen is never blank", () => {
    assert.equal(shouldShowSoftIntro({}), true);
    assert.equal(resolveInitialInvitePhase({ needsTapGate: true, showReveal: true }), "soft-intro");
  });
});

describe("intro shown once per invitation session", () => {
  it("scopes session memory per invitation — never a global introSeen key", () => {
    assert.match(softIntroSessionKey("inv_abc"), /^celeventic:soft-intro:session:v1:inv_abc$/);
    assert.notEqual(softIntroSessionKey("inv_a"), softIntroSessionKey("inv_b"));
    assert.ok(!softIntroSessionKey("inv_a").includes("hasSeenIntro"));
    assert.ok(!softIntroSessionKey("inv_a").includes("introSeen"));
  });

  it("remembers and forgets within sessionStorage only", () => {
    withSessionStorage(() => {
      assert.equal(hasSeenSoftIntroThisSession("inv_1"), false);
      rememberSoftIntroThisSession("inv_1");
      assert.equal(hasSeenSoftIntroThisSession("inv_1"), true);
      assert.equal(hasSeenSoftIntroThisSession("inv_2"), false);
      forgetSoftIntroThisSession("inv_1");
      assert.equal(hasSeenSoftIntroThisSession("inv_1"), false);
    });
  });

  it("treats unavailable sessionStorage as never seen (no blank trap)", () => {
    assert.equal(hasSeenSoftIntroThisSession("inv_missing"), false);
    assert.doesNotThrow(() => rememberSoftIntroThisSession("inv_missing"));
  });
});
