import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isSatoriSafeImageSrc,
  localCeleCardPhotoDataUrl,
  safeCeleCardPhotoSrc,
} from "@/lib/digital-business-card/og-assets";

describe("CeleYou OG assets", () => {
  it("embeds local marks as data URLs and never returns a remote URL", async () => {
    const mark = await localCeleCardPhotoDataUrl("/digital-cards/brands/celeyou-mark.png");
    assert.equal(isSatoriSafeImageSrc(mark), true);
    assert.match(String(mark), /^data:image\/png;base64,/);
    assert.equal(await safeCeleCardPhotoSrc("house:pulse"), null);
    assert.equal(await safeCeleCardPhotoSrc("https://evil.example/logo.png"), null);
    assert.equal(await safeCeleCardPhotoSrc("http://www.celeventic.com/uploads/x.png"), null);
    const data = await safeCeleCardPhotoSrc("/digital-cards/brands/celeyou-mark.png");
    assert.equal(isSatoriSafeImageSrc(data), true);
  });
});
