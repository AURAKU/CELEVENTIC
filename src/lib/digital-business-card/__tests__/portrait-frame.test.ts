import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import {
  celecardPortraitCropAspect,
  celecardPortraitFrame,
  celecardPortraitFrameClass,
  celecardPortraitFrameRadius,
  resolveCeleCardPortraitFrame,
} from "@/lib/digital-business-card/portrait-frame";

describe("CeleYou portrait frames", () => {
  it("gives Gold Folio a square plate and pulse templates a circle", () => {
    assert.equal(celecardPortraitFrame(resolveDigitalCardTheme("gold-folio")), "square");
    assert.equal(celecardPortraitFrame(resolveDigitalCardTheme("elegant-frost")), "square");
    assert.equal(celecardPortraitFrame(resolveDigitalCardTheme("creator-pulse")), "circle");
    assert.equal(celecardPortraitFrame(resolveDigitalCardTheme("velvet-credits")), "square");
    assert.equal(celecardPortraitFrame(resolveDigitalCardTheme("desert-reel")), "rounded");
  });

  it("lets a saved override beat the theme default", () => {
    const gold = resolveDigitalCardTheme("gold-folio");
    assert.equal(resolveCeleCardPortraitFrame(gold, "circle"), "circle");
    assert.equal(resolveCeleCardPortraitFrame(gold, "rounded"), "rounded");
    assert.equal(resolveCeleCardPortraitFrame(gold, "nope"), "square");
  });

  it("keeps square CSS off the circle class and maps crop frames", () => {
    assert.equal(celecardPortraitFrameClass("circle").includes("rounded-full"), true);
    assert.equal(celecardPortraitFrameClass("square").includes("rounded-full"), false);
    assert.equal(celecardPortraitFrameClass("arch").includes("rounded-t-[50%]"), true);
    assert.equal(celecardPortraitCropAspect("square"), "1:1");
    assert.equal(celecardPortraitCropAspect("rounded"), "rounded-square");
    assert.equal(celecardPortraitCropAspect("arch"), "rounded-square");
    assert.equal(celecardPortraitFrameRadius("circle", 168), 84);
    assert.ok(celecardPortraitFrameRadius("square", 168) < 20);
    assert.equal(resolveCeleCardPortraitFrame(resolveDigitalCardTheme("gold-folio"), "arch"), "arch");
  });
});
