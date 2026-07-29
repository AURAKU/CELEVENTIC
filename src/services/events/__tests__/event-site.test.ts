import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choosePrimaryInvitation } from "../event-site.service";

describe("public event primary invitation", () => {
  it("prefers the invitation owned by the published Studio order", () => {
    const canonical = {
      id: "canonical",
      uniqueLink: "studio-link",
      name: "Studio invitation",
    };
    const newerGuestInvite = {
      id: "guest-invite",
      uniqueLink: "newest-guest-link",
      name: "Quick invite",
    };

    assert.equal(
      choosePrimaryInvitation(canonical, newerGuestInvite)?.id,
      "canonical"
    );
  });

  it("falls back to the newest active invite when no production order exists", () => {
    const fallback = {
      id: "legacy",
      uniqueLink: "legacy-link",
      name: "Legacy invitation",
    };

    assert.equal(choosePrimaryInvitation(null, fallback)?.id, "legacy");
  });
});
