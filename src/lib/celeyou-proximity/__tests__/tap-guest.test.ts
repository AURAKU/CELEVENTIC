import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { TAP_MODE_HEADING, TAP_MODE_SUPPORT, TAP_SESSION_TTL_MS, tapJoinPath } from "@/lib/celeyou-proximity/product";
import {
  celeYouConnectionSourceLabel,
  normalizeGuestPhone,
  tapGuestFirstName,
} from "@/lib/celeyou-connect/pair";
import { parseTapJoinScan } from "@/lib/celeyou-proximity/join-code";

function source(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("CeleYou Tap Mode guest exchange", () => {
  it("keeps session QR short lived and account free", () => {
    assert.equal(TAP_SESSION_TTL_MS, 5 * 60 * 1000);
    assert.equal(TAP_MODE_HEADING, "Connect Beyond the Tap.");
    assert.equal(TAP_MODE_SUPPORT, "Scan. Connect. Exchange. Instantly.");
    assert.equal(tapJoinPath("k2m9pq"), "/tap/K2M9PQ");
    assert.equal(parseTapJoinScan("https://www.celeventic.com/tap/K2M9PQ"), "K2M9PQ");
    const page = source("src/app/tap/[code]/page.tsx");
    assert.doesNotMatch(page, /auth\/login\?callbackUrl/);
    assert.match(page, /CeleYouTapGuestView/);
    assert.match(page, /getTapGuestLanding/);
  });

  it("opens a guest connection page without requiring an account", () => {
    const view = source("src/components/digital-business-card/celeyou-tap-guest-view.tsx");
    assert.match(view, /celeyou\.save_contact/);
    assert.match(view, /celeyou\.save_lead/);
    assert.match(view, /celeyou\.connect_phone_placeholder/);
    assert.match(view, /celeyou\.exchange_contact/);
    assert.match(view, /celeyou\.view_full_card/);
    assert.match(view, /celeyou\.send_my_contact/);
    assert.match(view, /celeyou\.create_free/);
    assert.match(view, /@\{host\.slug\}/);
    assert.match(view, /tapJoinCode: joinCode/);
    assert.match(view, /onExchanged/);
    assert.match(view, /\/legal\/privacy/);
    assert.doesNotMatch(view, /redirect\(\s*`\/auth\/login/);
    assert.doesNotMatch(view, /NFC emulation|phone-to-phone NFC works/i);
  });

  it("reuses Connect Back with a Tap Mode source and privacy-safe host receipts", () => {
    const route = source("src/app/api/digital-business-cards/connect/route.ts");
    const service = source("src/services/digital-business-card/proximity.service.ts");
    const host = source("src/components/digital-business-card/celeyou-tap-connect.tsx");
    assert.match(route, /tapJoinCode/);
    assert.match(route, /tap_mode_qr/);
    assert.match(route, /recordTapGuestReceipt/);
    assert.match(service, /guestMayUsePublicAction/);
    assert.match(service, /buildGuestReach/);
    assert.match(service, /guestReceipts/);
    assert.match(service, /tapGuestFirstName/);
    assert.match(host, /guestReceipt/);
    assert.match(host, /Connection Received/);
    assert.match(host, /Initializing/);
    assert.match(host, /Offline/);
    assert.match(host, /Session Expired/);
    assert.doesNotMatch(host, /guestReceipt\.email/);
    assert.doesNotMatch(host, /visitorPhone/);
    assert.equal(tapGuestFirstName("Ama Serwaa"), "Ama");
    assert.equal(normalizeGuestPhone("+233 24 123 4567"), "+233241234567");
    assert.equal(normalizeGuestPhone("foliohouse"), "foliohouse");
    assert.equal(normalizeGuestPhone("wxid_ama_house"), "wxid_ama_house");
  });

  it("labels inbox sources honestly and never invents NFC from a public visit", () => {
    assert.equal(celeYouConnectionSourceLabel("tap_mode_qr"), "QR Connection");
    assert.equal(celeYouConnectionSourceLabel("physical_nfc"), "Physical NFC");
    assert.equal(celeYouConnectionSourceLabel("exchange"), "CeleYou Exchange");
    assert.equal(celeYouConnectionSourceLabel("connect_back"), "Connect Back");
    assert.equal(celeYouConnectionSourceLabel("public_profile"), "Public Profile");
    const inbox = source("src/components/digital-business-card/digital-card-connection-inbox.tsx");
    assert.match(inbox, /celeYouConnectionSourceLabel/);
    assert.match(inbox, /looksLikeGuestPhone/);
    assert.match(inbox, /Open WeChat/);
    assert.doesNotMatch(inbox, /Physical NFC.*connect_back/);
  });

  it("keeps two-way exchange on the guest page and rejects expired sessions", () => {
    const guestApi = source("src/app/api/digital-business-cards/proximity/guest/route.ts");
    const exchange = source("src/app/api/digital-business-cards/connect/exchange/route.ts");
    const connect = source("src/services/celeyou-connect/connect.service.ts");
    const admin = source("src/app/api/admin/celecard/tap/route.ts");
    const service = source("src/services/digital-business-card/proximity.service.ts");
    assert.match(guestApi, /getTapGuestLanding/);
    assert.match(guestApi, /rateLimit\(`celecard-tap-guest/);
    assert.match(exchange, /tapJoinCode/);
    assert.match(connect, /isCeleCardPubliclyReachable/);
    assert.match(connect, /cards: eligible/);
    assert.match(admin, /tap_session_ttl_seconds/);
    assert.doesNotMatch(admin, /visitorEmail/);
    assert.match(service, /That connection QR has expired/);
    assert.match(service, /status: 410/);
    assert.match(service, /tap_mode_enabled/);
    assert.match(service, /newProximityPairingToken/);
    assert.match(service, /pairingTokenHash/);
    const connectRoute = source("src/app/api/digital-business-cards/connect/route.ts");
    assert.match(connectRoute, /tapJoinCode: z\.string\(\)\.max\(128\)/);
    const host = source("src/components/digital-business-card/celeyou-tap-connect.tsx");
    assert.match(host, /pairingToken/);
    assert.match(host, /tapSessionSecretFromView/);
  });
});
