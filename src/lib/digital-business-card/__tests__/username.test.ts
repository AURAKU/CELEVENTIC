import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  CELEYOU_RESERVED_USERNAMES,
  constrainCeleYouUsernameInput,
  isReservedCeleYouUsername,
  normalizeCeleYouUsername,
  parseCeleYouUsername,
  suggestCeleYouUsernames,
  usernameAvailabilityMessage,
} from "@/lib/digital-business-card/username";

function source(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("CeleYou unique usernames", () => {
  it("lets two people keep the same display name", () => {
    assert.equal(normalizeCeleYouUsername("Owuraku Afari"), "owuraku afari");
    const a = parseCeleYouUsername("auratheking");
    const b = parseCeleYouUsername("owuraku.afari");
    const c = parseCeleYouUsername("owuraku_agi");
    assert.equal(a.ok && a.username, "auratheking");
    assert.equal(b.ok && b.username, "owuraku.afari");
    assert.equal(c.ok && c.username, "owuraku_agi");
    assert.notEqual(a.ok && a.username, b.ok && b.username);
  });

  it("accepts the published format and rejects invalid handles", () => {
    assert.equal(parseCeleYouUsername("@Spark_Drive").ok, true);
    assert.equal(parseCeleYouUsername("agi2026").ok, true);
    assert.equal(parseCeleYouUsername("owuraku afari").ok, false);
    assert.equal(parseCeleYouUsername(".owuraku").ok, false);
    assert.equal(parseCeleYouUsername("owuraku..afari").ok, false);
    assert.equal(parseCeleYouUsername("owuraku!").ok, false);
    assert.equal(constrainCeleYouUsernameInput("Owuraku.Afari!").includes("!"), false);
  });

  it("protects reserved and brand-impersonating handles", () => {
    for (const name of ["admin", "support", "celeyou", "celeventic", "official"]) {
      assert.equal(isReservedCeleYouUsername(name), true, name);
    }
    assert.equal(isReservedCeleYouUsername("celeyou.official"), true);
    assert.equal(isReservedCeleYouUsername("owuraku.afari"), false);
    assert.ok(CELEYOU_RESERVED_USERNAMES.includes("billing"));
  });

  it("suggests memorable alternatives without sequential number suffixes", () => {
    const taken = new Set(["owuraku"]);
    const suggestions = suggestCeleYouUsernames(
      { displayName: "Owuraku Afari", company: "Aura Group Innovative", keywords: ["agi"] },
      (value) => taken.has(value),
      5
    );
    assert.ok(suggestions.includes("owuraku.afari"));
    assert.equal(suggestions.some((item) => /-\d+$/.test(item)), false);
    assert.equal(suggestions.includes("owuraku"), false);
  });

  it("keeps QR and NFC on tokens and does not rewrite existing slugs as usernames", () => {
    const share = source("src/lib/digital-business-card/share-identity.ts");
    const service = source("src/services/digital-business-card/username.service.ts");
    const page = source("src/app/u/[username]/page.tsx");
    const config = source("next.config.ts");
    assert.match(share, /input\.username/);
    assert.match(share, /celeYouCameraScanUrl\(input\.publicToken/);
    assert.match(share, /celeYouNfcScanUrl\(input\.nfcToken/);
    assert.match(service, /kind: "HOLD"/);
    assert.match(service, /kind: "SLUG"/);
    assert.match(service, /\$transaction/);
    assert.match(page, /resolveCeleYouPublicHandle/);
    assert.match(page, /permanentRedirect/);
    assert.match(config, /\/api\/v1\/celeyou\/usernames\/availability/);
    assert.doesNotMatch(config, /source: "\/u\/:slug"/);
    const availability = source("src/app/api/digital-business-cards/usernames/availability/route.ts");
    assert.match(availability, /rateLimit/);
    assert.doesNotMatch(availability, /email|phone/);
    assert.equal(usernameAvailabilityMessage("TAKEN").includes("@"), false);
  });

  it("confirms username changes and keeps admin reservation audited", () => {
    const owner = source("src/app/api/digital-business-cards/username/route.ts");
    const admin = source("src/app/api/admin/celecard/usernames/route.ts");
    const settings = source("src/components/digital-business-card/celeyou-username-settings.tsx");
    const studio = source("src/components/digital-business-card/digital-card-studio-client.tsx");
    assert.match(owner, /needsConfirm/);
    assert.match(owner, /getServerSession/);
    assert.match(admin, /adminReserveUsername/);
    assert.match(admin, /listAdminUsernames/);
    assert.match(settings, /QR and NFC/);
    assert.match(studio, /needsConfirm/);
    assert.match(studio, /Confirm new username/);
    const create = source("src/services/digital-business-card/digital-business-card.service.ts");
    assert.match(create, /bridgeCardSlug\(\{ id: created\.id/);
    assert.match(create, /ensureDefaultNfcDevice\(created\)/);
  });
});
