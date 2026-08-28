import test from "node:test";
import assert from "node:assert/strict";
import {
  followAriaLabel,
  resolveInvitationSocialLinks,
  safeSocialHttpUrl,
  socialLinkHasDestination,
} from "@/lib/invitation/social-links";

test("enabled Instagram links resolve a safe HTTPS destination", () => {
  const [link] = resolveInvitationSocialLinks([
    {
      platform: "instagram",
      handle: "@femmora_gh",
      url: "https://www.instagram.com/femmora_gh/",
      enabled: true,
    },
  ]);
  assert.equal(link?.displayHandle, "@femmora_gh");
  assert.equal(link?.url, "https://www.instagram.com/femmora_gh/");
  assert.equal(socialLinkHasDestination(link!), true);
  assert.equal(followAriaLabel("FEMMORA", "instagram"), "Follow FEMMORA on Instagram");
});

test("disabled and empty social links do not render", () => {
  assert.equal(
    resolveInvitationSocialLinks([
      { platform: "instagram", handle: "@hidden", url: "https://www.instagram.com/hidden/", enabled: false },
    ]).length,
    0
  );
  assert.equal(resolveInvitationSocialLinks([]).length, 0);
});

test("missing URL keeps the handle and does not invent a Follow destination", () => {
  const [link] = resolveInvitationSocialLinks([
    { platform: "instagram", handle: "@atelier_x", enabled: true },
  ]);
  assert.equal(link?.displayHandle, "@atelier_x");
  assert.equal(link?.url, null);
  assert.equal(socialLinkHasDestination(link!), false);
});

test("javascript URLs are rejected", () => {
  assert.equal(safeSocialHttpUrl("javascript:alert(1)", "instagram"), null);
  const [link] = resolveInvitationSocialLinks([
    { platform: "instagram", handle: "@safe", url: "javascript:alert(1)", enabled: true },
  ]);
  assert.equal(link?.url, null);
  assert.equal(link?.displayHandle, "@safe");
});

test("later platforms can be added without showing empty ones", () => {
  const links = resolveInvitationSocialLinks([
    { platform: "instagram", handle: "@atelier", url: "https://www.instagram.com/atelier/", enabled: true },
    { platform: "tiktok", url: "https://www.tiktok.com/@atelier", enabled: true },
    { platform: "youtube", enabled: false, url: "https://www.youtube.com/@atelier" },
  ]);
  assert.equal(links.map((item) => item.platform).join(","), "instagram,tiktok");
});
