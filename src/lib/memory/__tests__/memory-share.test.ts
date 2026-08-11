import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildMemoryShareUrl, buildWhatsAppShareHref } from "../memory-share";

describe("memory share urls", () => {
  it("builds a stable deep link with memory hash", () => {
    const url = buildMemoryShareUrl({
      origin: "https://celeventic.com",
      viewToken: "tok123",
      memoryId: "mem456",
    });
    assert.equal(url, "https://celeventic.com/memory/tok123#memory-mem456");
  });

  it("builds WhatsApp share href", () => {
    const href = buildWhatsAppShareHref("https://celeventic.com/memory/t#memory-1", "THE WEDDING");
    assert.match(href, /^https:\/\/wa\.me\/\?text=/);
    assert.match(decodeURIComponent(href), /THE WEDDING/);
  });
});
