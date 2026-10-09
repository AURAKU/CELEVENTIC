import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EDWIN_EVENT_SONG_URL,
  edwinDesignIsCurrent,
  edwinMusicSelection,
} from "@/lib/invitation/edwin-published-design";
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

  it("plays the same Biblical track localhost uses", () => {
    assert.equal(EDWIN_EVENT_SONG_URL, "/music/edwin-lordina-biblical.mp3");
    const selection = edwinMusicSelection("edwin-lordina-biblical") as { url: string; title: string };
    assert.equal(selection.url, EDWIN_EVENT_SONG_URL);
    assert.equal(selection.title, "Biblical — Calum Scott");
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
