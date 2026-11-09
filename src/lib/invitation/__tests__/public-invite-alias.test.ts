import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  EDWIN_EVENT_SONG_URL,
  edwinDesignIsCurrent,
  edwinMusicSelection,
  edwinPublishedContentIsCurrent,
  loadEdwinPublishedDesign,
} from "@/lib/invitation/edwin-published-design";
import {
  EDWIN_PUBLIC_INVITE_PATH,
  EDWIN_PUBLISHED_INVITE_LINK,
  guestFacingInviteLink,
  inviteLinkIdentityKeys,
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

  it("resolves pretty path and published token as the same invitation", () => {
    assert.deepEqual(inviteLinkIdentityKeys(EDWIN_PUBLIC_INVITE_PATH).sort(), [
      EDWIN_PUBLIC_INVITE_PATH,
      EDWIN_PUBLISHED_INVITE_LINK,
    ].sort());
    assert.deepEqual(inviteLinkIdentityKeys(EDWIN_PUBLISHED_INVITE_LINK).sort(), [
      EDWIN_PUBLIC_INVITE_PATH,
      EDWIN_PUBLISHED_INVITE_LINK,
    ].sort());
    assert.equal(guestFacingInviteLink(EDWIN_PUBLISHED_INVITE_LINK), EDWIN_PUBLIC_INVITE_PATH);
    assert.equal(guestFacingInviteLink(EDWIN_PUBLIC_INVITE_PATH), EDWIN_PUBLIC_INVITE_PATH);
    assert.equal(guestFacingInviteLink("abc"), "abc");
  });

  it("keeps Event Companion on the pretty live path", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/invite/[link]/event-day/page.tsx"),
      "utf8"
    );
    assert.match(source, /getInvitationByLink/);
    assert.match(source, /guestFacingInviteLink/);
    assert.match(source, /applyEdwinPublishedDesign/);
  });

  it("plays the same Biblical track localhost uses", () => {
    assert.equal(EDWIN_EVENT_SONG_URL, "/music/edwin-lordina-biblical.mp3");
    const selection = edwinMusicSelection("edwin-lordina-biblical") as { url: string; title: string };
    assert.equal(selection.url, EDWIN_EVENT_SONG_URL);
    assert.equal(selection.title, "Biblical. Calum Scott");
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

  it("replaces an older Edwin board that is missing the published maps and guest note", () => {
    assert.equal(
      edwinPublishedContentIsCurrent({
        gateWord: "##EdWinsDina26",
        media: [{ url: "/templates/edwin-lordina/hero-navy.jpg" }],
      }),
      false
    );
    assert.equal(edwinPublishedContentIsCurrent(loadEdwinPublishedDesign()), true);
  });
});
