import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildVCard,
  celeYouContactProfileUrl,
  sanitizeCeleYouVcardUrl,
  vcardFileName,
} from "@/lib/digital-business-card/vcard";
import { toGuestPublicPayload } from "@/lib/digital-business-card/access";
import { namedropClaimsUrlTransfer, NAMEDROP_APPLE_NOTICE } from "@/lib/celeyou-share/namedrop";
import { canShareVCardFile } from "@/lib/digital-business-card/save-contact";
import { shareDeskActionOrder } from "@/lib/celeyou-share/engine";
import type { DigitalCardPublicPayload } from "@/lib/digital-business-card/types";

function publicCard(overrides: Partial<DigitalCardPublicPayload> = {}): DigitalCardPublicPayload {
  return {
    id: "card_1",
    slug: "owuraku-afari",
    publicToken: "tok_secret",
    displayName: "Owuraku Afari",
    title: "Founder",
    company: "Example Company",
    bio: "Hello",
    email: "public@example.com",
    phone: "+233241234567",
    website: "https://example.com",
    socials: {},
    themeId: "elegant-frost",
    avatarUrl: null,
    pronouns: null,
    nfcEnabled: true,
    connectBackEnabled: true,
    defaultMode: "professional",
    isLive: true,
    ...overrides,
  };
}

describe("CeleYou vCard sharing", () => {
  it("always writes a stable HTTPS /card/{slug} website field", () => {
    const vcf = buildVCard(publicCard());
    assert.match(vcf, /^BEGIN:VCARD\r\n/);
    assert.match(vcf, /\r\nEND:VCARD\r\n$/);
    assert.match(vcf, /VERSION:3.0/);
    assert.match(vcf, /FN:Owuraku Afari/);
    assert.match(vcf, /N:Afari;Owuraku;;;/);
    assert.match(vcf, /ORG:Example Company/);
    assert.match(vcf, /TITLE:Founder/);
    assert.match(vcf, /TEL;TYPE=CELL,VOICE:\+233241234567/);
    assert.match(vcf, /EMAIL;TYPE=INTERNET:public@example.com/);
    assert.match(vcf, /URL;TYPE=PREF:https:\/\/www\.celeventic\.com\/card\/owuraku-afari/);
    assert.match(vcf, /X-ABLabel:CeleYou/);
    assert.equal(vcf.includes("tok_secret"), false);
    assert.equal(vcf.includes("localhost"), false);
    assert.equal(vcf.includes("http://"), false);
  });

  it("rewrites localhost, identity paths, and query tokens onto the public card URL", () => {
    assert.equal(
      sanitizeCeleYouVcardUrl("http://localhost:3000/u/owuraku-afari?grant=abc", "owuraku-afari"),
      "https://www.celeventic.com/card/owuraku-afari"
    );
    assert.equal(
      sanitizeCeleYouVcardUrl("https://www.celeventic.com/u/owuraku-afari", "owuraku-afari"),
      "https://www.celeventic.com/card/owuraku-afari"
    );
    assert.equal(
      sanitizeCeleYouVcardUrl("https://evil.example/card/owuraku-afari", "owuraku-afari"),
      "https://www.celeventic.com/card/owuraku-afari"
    );
    assert.equal(
      sanitizeCeleYouVcardUrl("https://www.celeventic.com/dashboard/business-card", "owuraku-afari"),
      "https://www.celeventic.com/card/owuraku-afari"
    );
    assert.equal(
      celeYouContactProfileUrl("owuraku-afari", "http://127.0.0.1:3000"),
      "https://www.celeventic.com/card/owuraku-afari"
    );
  });

  it("escapes special characters, keeps unicode names, and folds long lines", () => {
    const vcf = buildVCard(
      publicCard({
        displayName: "Nana Yaa Mensah-Osei",
        company: "Foil, Form & Co;",
        bio: "Line one\nLine two",
      })
    );
    assert.match(vcf, /FN:Nana Yaa Mensah-Osei/);
    assert.match(vcf, /N:Mensah-Osei;Nana Yaa;;;/);
    assert.match(vcf, /ORG:Foil\\, Form & Co\\;/);
    assert.match(vcf, /NOTE:Line one\\nLine two/);
    const longNote = "A".repeat(120);
    const folded = buildVCard(publicCard({ bio: longNote }));
    assert.match(folded, /\r\n /);
    assert.equal(
      folded
        .split("\r\n")
        .filter((line) => line.startsWith("NOTE:") || line.startsWith(" "))
        .every((line) => new TextEncoder().encode(line).length <= 75),
      true
    );
  });

  it("sanitizes filenames and skips oversized photos", () => {
    assert.equal(vcardFileName({ slug: "Ama Serwaa!" }), "Ama-Serwaa.vcf");
    assert.equal(vcardFileName({ displayName: "名前" }), "名前.vcf");
    const vcf = buildVCard(publicCard({ avatarUrl: "/digital-cards/demo/ama-serwaa.jpg" }), {
      photo: { type: "JPEG", base64: "A".repeat(60_001) },
    });
    assert.equal(vcf.includes("PHOTO;"), false);
  });

  it("keeps protected fields out of guest vCards", () => {
    const future = new Date(Date.now() + 86_400_000);
    const payload = toGuestPublicPayload({
      id: "card_owner_1",
      slug: "ama-serwaa",
      publicToken: "tok_secret_qr",
      displayName: "Ama Serwaa",
      title: "Creative Director",
      company: "Folio Maison",
      bio: "Studio bio",
      email: "ama@secret.test",
      phone: "+233240000000",
      website: "https://folio.secret",
      socials: {
        emails: ["ama@secret.test"],
        phones: ["+233240000000"],
        momo: "0240000000",
        reachVisibility: { "phone-0": "CODE_PROTECTED", "momo-0": "REQUEST_ACCESS" },
      },
      themeId: "gold-folio",
      avatarUrl: null,
      nfcEnabled: true,
      connectBackEnabled: true,
      defaultMode: "professional",
      isPublished: true,
      subscriptionStatus: "ACTIVE",
      subscriptionExpiresAt: future,
    });
    const vcf = buildVCard(payload);
    assert.equal(vcf.includes("+233240000000"), false);
    assert.equal(vcf.includes("0240000000"), false);
    assert.match(vcf, /URL;TYPE=PREF:https:\/\/www\.celeventic\.com\/card\/ama-serwaa/);
  });

  it("does not claim NameDrop URL transfer or silent Contacts writes", () => {
    assert.equal(namedropClaimsUrlTransfer(), false);
    assert.match(NAMEDROP_APPLE_NOTICE, /Apple determines which details are transferred/);
    assert.equal(canShareVCardFile(undefined, null), false);
    const iosOrder = shareDeskActionOrder("ios-safari");
    assert.equal(iosOrder.includes("namedrop"), true);
    assert.equal(iosOrder.includes("save-contact"), true);
    assert.equal(shareDeskActionOrder("desktop").includes("namedrop"), true);
    const route = readFileSync(join(process.cwd(), "src/app/card/[slug]/contact.vcf/route.ts"), "utf8");
    assert.match(route, /celeYouContactProfileUrl/);
    assert.match(route, /Cache-Control": "private, no-store"/);
    assert.match(route, /vcard_denied/);
    const desk = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-share-desk.tsx"),
      "utf8"
    );
    assert.match(desk, /shareDeskActionOrder/);
    assert.match(desk, /contactSaveHint/);
    const save = readFileSync(join(process.cwd(), "src/lib/digital-business-card/save-contact.ts"), "utf8");
    assert.match(save, /shareDigitalCardContactFile/);
    assert.doesNotMatch(save, /NameDrop/);
  });
});
