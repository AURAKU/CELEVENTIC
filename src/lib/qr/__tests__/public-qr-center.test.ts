import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseQrLogoSizeQuery,
  toSafePublicQrCenterPath,
  withPublicQrCenter,
} from "../qr-constants";

describe("public QR center allowlist", () => {
  it("accepts template, brand, and upload image paths", () => {
    assert.equal(toSafePublicQrCenterPath("/templates/aurelia/hero.jpg"), "/templates/aurelia/hero.jpg");
    assert.equal(toSafePublicQrCenterPath("/brand/logo-full.png"), "/brand/logo-full.png");
    assert.equal(toSafePublicQrCenterPath("/uploads/event/hero.webp"), "/uploads/event/hero.webp");
    assert.equal(
      toSafePublicQrCenterPath("/api/uploads/event/hero.jpeg"),
      "/api/uploads/event/hero.jpeg"
    );
  });

  it("strips same-origin absolute URLs down to the pathname", () => {
    assert.equal(
      toSafePublicQrCenterPath("https://www.celeventic.com/templates/aurelia/hero.jpg"),
      "/templates/aurelia/hero.jpg"
    );
  });

  it("rejects remote-only paths, traversal, and query injection", () => {
    assert.equal(toSafePublicQrCenterPath("https://evil.example/secret.png"), null);
    assert.equal(toSafePublicQrCenterPath("/templates/../secret.jpg"), null);
    assert.equal(toSafePublicQrCenterPath("/templates/aurelia/hero.jpg?x=1"), null);
    assert.equal(toSafePublicQrCenterPath("//evil.example/logo.png"), null);
    assert.equal(toSafePublicQrCenterPath("/etc/passwd"), null);
    assert.equal(
      toSafePublicQrCenterPath("https://evil.example/templates/aurelia/hero.jpg"),
      "/templates/aurelia/hero.jpg"
    );
  });

  it("pins center and logo size onto an existing QR image URL", () => {
    const next = withPublicQrCenter(
      "/api/qr/image?data=https%3A%2F%2Fexample.com%2Fmemory-upload&eventId=evt_1&size=512",
      "/templates/aurelia/hero.jpg",
      "bold"
    );
    const parsed = new URL(next, "https://www.celeventic.com");
    assert.equal(parsed.pathname, "/api/qr/image");
    assert.equal(parsed.searchParams.get("center"), "/templates/aurelia/hero.jpg");
    assert.equal(parsed.searchParams.get("logoSize"), "bold");
    assert.equal(parsed.searchParams.get("eventId"), "evt_1");
    assert.equal(parsed.searchParams.get("size"), "512");
  });

  it("leaves the original URL unchanged when the center path is unsafe", () => {
    const original = "/api/qr/image?data=https%3A%2F%2Fexample.com%2Fx&eventId=evt_1";
    assert.equal(withPublicQrCenter(original, "https://evil.example/x.png"), original);
  });

  it("parses logoSize query without inventing a default", () => {
    assert.equal(parseQrLogoSizeQuery("bold"), "bold");
    assert.equal(parseQrLogoSizeQuery("balanced"), "balanced");
    assert.equal(parseQrLogoSizeQuery("subtle"), "subtle");
    assert.equal(parseQrLogoSizeQuery("huge"), null);
    assert.equal(parseQrLogoSizeQuery(null), null);
  });
});
