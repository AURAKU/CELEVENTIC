import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  QR_COMPOSITE_CACHE_VERSION,
  QR_GUIDE_DISPLAY_MIN_PX,
  QR_GUIDE_PREVIEW_SIZE,
  parseQrDisplayMode,
} from "../qr-constants";
import { eventQrLinkService } from "@/services/qr-hub/event-qr-link.service";
import { sanitizePublicUrl } from "@/lib/app-url";

describe("Event Guide QR scanability", () => {
  it("recognises guide display mode for phone-camera exports", () => {
    assert.equal(parseQrDisplayMode("guide"), "guide");
    assert.equal(parseQrDisplayMode("pass"), "pass");
    assert.equal(parseQrDisplayMode("brand"), "brand");
    assert.equal(parseQrDisplayMode("unknown"), "brand");
    assert.equal(parseQrDisplayMode(null), "brand");
  });

  it("bumps composite cache so guide-mode PNGs are not served from branded cache", () => {
    assert.match(QR_COMPOSITE_CACHE_VERSION, /guide/i);
  });

  it("uses a high-resolution preview and a phone-readable on-screen minimum", () => {
    assert.equal(QR_GUIDE_PREVIEW_SIZE, 1024);
    assert.ok(QR_GUIDE_DISPLAY_MIN_PX >= 240);
  });

  it("builds guide preview URLs with mode=guide and encoded live payload", () => {
    const live = "https://www.celeventic.com/event-guide/tok_abc";
    const preview = eventQrLinkService.qrPreview(live, "evt_1", QR_GUIDE_PREVIEW_SIZE, "guide");
    const parsed = new URL(preview, "https://www.celeventic.com");
    assert.equal(parsed.pathname, "/api/qr/image");
    assert.equal(parsed.searchParams.get("mode"), "guide");
    assert.equal(parsed.searchParams.get("size"), "1024");
    assert.equal(parsed.searchParams.get("data"), live);
    assert.equal(parsed.searchParams.get("eventId"), "evt_1");
  });

  it("does not attach mode= for default brand previews (backward compatible)", () => {
    const preview = eventQrLinkService.qrPreview("https://www.celeventic.com/x", "evt_1", 512);
    assert.doesNotMatch(preview, /mode=/);
  });

  it("rewrites localhost guide URLs to the public app base before encoding", () => {
    const fixed = sanitizePublicUrl(
      "http://localhost:3000/event-guide/tok_abc",
      "https://www.celeventic.com"
    );
    assert.equal(fixed, "https://www.celeventic.com/event-guide/tok_abc");
    assert.doesNotMatch(fixed, /localhost/);
  });
});
