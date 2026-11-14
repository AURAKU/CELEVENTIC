import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { celecardContrastRatio, celecardCtaOnPaper } from "@/lib/digital-business-card/type-voice";
import {
  celeCardWalletShareText,
  formatWalletPaymentBundle,
  isPublicCeleYouSurfacePath,
  isVerifiedPayAppHref,
  walletLockedGuidance,
} from "@/lib/digital-business-card/wallet-quality";
import { serializeBankAccount, type DigitalCardPayFamilyGroup } from "@/lib/digital-business-card/socials";

function source(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("CeleYou wallet quality", () => {
  it("keeps share CTAs at WCAG AA contrast on cream, teal, white, and dark paper", () => {
    const papers = ["#fffef8", "#0B8A83", "#ffffff", "#041c1a"];
    for (const paper of papers) {
      const cta = celecardCtaOnPaper("#0B8A83", paper);
      assert.ok(celecardContrastRatio(cta.color, cta.background) >= 4.5, paper);
    }
    const tealOnTeal = celecardCtaOnPaper("#0B8A83", "#0B8A83");
    assert.equal(tealOnTeal.background, "#fffef8");
  });

  it("never treats a telephone link as a MoMo app action", () => {
    assert.equal(isVerifiedPayAppHref("tel:0244123456"), false);
    assert.equal(isVerifiedPayAppHref("sms:+233244123456"), false);
    assert.equal(isVerifiedPayAppHref("mailto:pay@example.com"), false);
    assert.equal(isVerifiedPayAppHref("https://paystack.com/pay/folio"), true);
    assert.equal(isVerifiedPayAppHref("mtnmomo://pay"), false);
    const wallet = source("src/components/digital-business-card/digital-card-wallet-view.tsx");
    assert.match(wallet, /isVerifiedPayAppHref/);
    assert.match(wallet, /celeyou\.copy_number/);
    assert.match(wallet, /celeyou\.call_recipient/);
    assert.doesNotMatch(wallet, /Open MTN MoMo/);
    const reach = source("src/components/digital-business-card/digital-card-reach-grid.tsx");
    assert.match(reach, /isVerifiedPayAppHref\(item\.href\)/);
    assert.match(reach, /isPayNetwork\(item\.brand\) \|\| \(item\.qrUrl && isQrShareNetwork/);
    assert.doesNotMatch(reach, /Open wallet/);
  });

  it("explains locked wallets without revealing the access code", () => {
    const copy = walletLockedGuidance("Alipay");
    assert.match(copy, /Alipay stays locked/);
    assert.match(copy, /access code/);
    assert.equal(/4826|NOVA|secret/i.test(copy), false);
    const wallet = source("src/components/digital-business-card/digital-card-wallet-view.tsx");
    assert.match(wallet, /celeyou\.empty_code/);
    assert.match(wallet, /role="alert"/);
    assert.doesNotMatch(wallet, /if \(code\.trim\(\)\) void unlock/);
  });

  it("validates empty access codes before they consume a server attempt", () => {
    const unlock = source("src/app/api/digital-business-cards/public/[slug]/unlock/route.ts");
    const parseAt = unlock.indexOf("bodySchema.safeParse");
    const rateAt = unlock.indexOf("rateLimit(`celecard-unlock:");
    assert.ok(parseAt > 0 && rateAt > parseAt);
    const wallet = source("src/components/digital-business-card/digital-card-wallet-view.tsx");
    assert.match(wallet, /inputRef\.current\?\.focus/);
    assert.match(wallet, /min-h-11/);
  });

  it("formats Copy All from published fields only and preserves account names", () => {
    const families: DigitalCardPayFamilyGroup[] = [
      {
        id: "mobile-money",
        label: "Mobile money",
        items: [
          {
            id: "momo-0",
            brand: "momo",
            title: "MTN MoMo",
            subtitle: "Ama Serwaa",
            href: "tel:0244123456",
            copyValue: "0244123456",
            surface: "dock",
          },
        ],
      },
      {
        id: "bank",
        label: "Bank",
        items: [
          {
            id: "bank-0",
            brand: "bank",
            title: "gcb bank",
            subtitle: "AMA SERWAA",
            href: "",
            copyValue: serializeBankAccount({
              bankName: "gcb bank",
              accountName: "AMA SERWAA",
              accountNumber: "1234567890",
              accountType: "current",
              notes: "",
            }),
            surface: "dock",
          },
        ],
      },
    ];
    const text = formatWalletPaymentBundle(families);
    assert.match(text, /^Payment details/);
    assert.match(text, /MTN MoMo/);
    assert.match(text, /Account name: Ama Serwaa/);
    assert.match(text, /Mobile money number: 0244123456/);
    assert.match(text, /Bank transfer/);
    assert.match(text, /Account name: AMA SERWAA/);
    assert.equal(text.includes("Mrs"), false);
  });

  it("uses a payment-focused share caption and keeps the URL in one field", () => {
    assert.equal(
      celeCardWalletShareText("Ama Serwaa"),
      "Pay Ama Serwaa using the available payment methods."
    );
    const wallet = source("src/components/digital-business-card/digital-card-wallet-view.tsx");
    assert.match(wallet, /includeUrlInText: false/);
    assert.match(wallet, /celeyou\.share_pay_text/);
    const engine = source("src/lib/celeyou-share/engine.ts");
    assert.match(engine, /includeUrlInText/);
  });

  it("skips currency polling on public CeleYou surfaces", () => {
    assert.equal(isPublicCeleYouSurfacePath("/card/ama-serwaa/wallet"), true);
    assert.equal(isPublicCeleYouSurfacePath("/u/ama-serwaa"), true);
    assert.equal(isPublicCeleYouSurfacePath("/dashboard/business-card"), false);
    const provider = source("src/components/commerce/currency-provider.tsx");
    assert.match(provider, /isPublicCeleYouSurfacePath/);
  });

  it("renders public profiles immediately and aligns contact cards evenly", () => {
    const view = source("src/components/digital-business-card/digital-card-public-view.tsx");
    assert.match(view, /data-celecard-hold=\{hold \? "true" : "false"\}/);
    assert.doesNotMatch(view, /celecard-guest-about-mark/);
    assert.match(view, /<blockquote/);
    const css = source("src/app/globals.css");
    assert.match(css, /opacity: 1;/);
    assert.match(css, /padding: var\(--reach-pad-y\) var\(--reach-pad-x\) var\(--reach-pad-y\) calc\(var\(--reach-pad-x\) \+ 0\.12rem\)/);
    assert.doesNotMatch(css, /calc\(var\(--reach-pad-x\) \+ 0\.18rem\)/);
  });

  it("keeps CeleYou brand copy and does not invent financial names", () => {
    const wallet = source("src/components/digital-business-card/digital-card-wallet-view.tsx");
    assert.match(wallet, /SMARTCARD_BRAND_TAGLINE/);
    assert.match(wallet, /SMARTCARD_PRODUCT_SHORT_NAME/);
    assert.doesNotMatch(wallet, /toLowerCase\(\)\.replace/);
    const adaptive = source("src/app/celeyou-adaptive.css");
    assert.match(adaptive, /--celeyou-touch: 2\.75rem/);
    assert.match(adaptive, /\.celeyou-btn-primary/);
    const clipboard = source("src/lib/clipboard.ts");
    assert.match(clipboard, /clipboard-timeout/);
    const qr = source("src/components/digital-business-card/celecard-qr-badge.tsx");
    assert.match(qr, /scan QR/);
    const face = source("src/components/digital-business-card/digital-card-face.tsx");
    assert.match(face, /portrait/);
  });
});
