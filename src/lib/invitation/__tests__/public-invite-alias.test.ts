import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { edwinDesignIsCurrent } from "@/lib/invitation/edwin-published-design";
import {
  EDWIN_PUBLISHED_INVITE_LINK,
  isPublicInviteAlias,
  publicInviteAliasTarget,
} from "@/lib/invitation/public-invite-alias";

describe("public invite alias", () => {
  it("opens /invite/edwin-and-lordina as the published guest link", () => {
    assert.equal(publicInviteAliasTarget("edwin-and-lordina"), EDWIN_PUBLISHED_INVITE_LINK);
    assert.equal(publicInviteAliasTarget("EDWIN-AND-LORDINA"), EDWIN_PUBLISHED_INVITE_LINK);
    assert.equal(isPublicInviteAlias("edwin-and-lordina", EDWIN_PUBLISHED_INVITE_LINK), true);
    assert.equal(isPublicInviteAlias("edwin-and-lordina", "someone-else"), false);
  });

  it("does not alias other invitations", () => {
    assert.equal(publicInviteAliasTarget("kojo-and-fafa"), null);
  });

  it("treats the current portrait and gate word as the live design", () => {
    assert.equal(
      edwinDesignIsCurrent({
        gateWord: "##EdWinsDina26",
        media: [{ url: "/templates/edwin-lordina/hero-navy.jpg" }],
      }),
      true
    );
    assert.equal(edwinDesignIsCurrent({ gateWord: "#EDWINANDLORDINA" }), false);
  });
});
