import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EDWIN_PUBLISHED_INVITE_LINK } from "@/lib/invitation/public-invite-alias";
import {
  canonicalGuestInviteHref,
  canonicalGuestInvitePath,
} from "@/lib/invitation/canonical-guest-invite";

describe("canonicalGuestInvitePath", () => {
  it("opens the pretty Edwin board, not a later guest token", () => {
    const path = canonicalGuestInvitePath("edwin-and-lordina", [
      {
        slug: "edwin-and-lordina",
        uniqueLink: EDWIN_PUBLISHED_INVITE_LINK,
        isGeneralPass: false,
        templateId: "tpl",
      },
      {
        slug: "guest-pass",
        uniqueLink: "D3uUCgb9EhAUAXXRojAV08-ejM5d-w09",
        isGeneralPass: true,
      },
    ]);
    assert.equal(path, "edwin-and-lordina");
    assert.equal(
      canonicalGuestInviteHref("edwin-and-lordina", [
        { slug: "edwin-and-lordina", uniqueLink: EDWIN_PUBLISHED_INVITE_LINK },
      ]),
      "/invite/edwin-and-lordina"
    );
  });

  it("matches the event slug when that invitation is the published board", () => {
    const path = canonicalGuestInvitePath("kojo-and-fafa", [
      { slug: "kojo-and-fafa", uniqueLink: "opaque-token-abc", isGeneralPass: false },
      { slug: "plus-one", uniqueLink: "later-token", isGeneralPass: false },
    ]);
    assert.equal(path, "kojo-and-fafa");
  });

  it("ignores general passes when a designed invitation exists", () => {
    const path = canonicalGuestInvitePath("celebration", [
      { slug: "celebration-night", uniqueLink: "main-board", isGeneralPass: false, templateId: "tpl" },
      { slug: "door-pass", uniqueLink: "door-token", isGeneralPass: true },
    ]);
    assert.equal(path, "celebration-night");
  });

  it("falls back to the opaque unique link when there is no pretty slug", () => {
    const path = canonicalGuestInvitePath("x", [
      { slug: "x", uniqueLink: "OpaqueTokenOnly123", isGeneralPass: false },
    ]);
    assert.equal(path, "OpaqueTokenOnly123");
  });
});
