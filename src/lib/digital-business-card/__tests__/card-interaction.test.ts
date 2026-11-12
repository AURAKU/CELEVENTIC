import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  celeYouCardOpenHref,
  celeYouHrefIsCurrentProfile,
  celeYouProfileAliases,
} from "@/lib/digital-business-card/card-interaction";

describe("CeleYou interactive plate", () => {
  it("treats /u and /card as the same public identity", () => {
    assert.deepEqual(celeYouProfileAliases("/u/kojo-mensah"), ["/u/kojo-mensah", "/card/kojo-mensah"]);
    assert.equal(celeYouHrefIsCurrentProfile("/card/kojo-mensah", "/u/kojo-mensah"), true);
    assert.equal(celeYouHrefIsCurrentProfile("https://www.celeventic.com/u/kojo-mensah", "/card/kojo-mensah"), true);
    assert.equal(celeYouHrefIsCurrentProfile("/u/kojo-mensah", "/dashboard/business-card"), false);
    assert.equal(celeYouCardOpenHref("/u/kojo-mensah", "/u/kojo-mensah"), null);
    assert.equal(celeYouCardOpenHref("/u/kojo-mensah", "/dashboard/business-card"), "/u/kojo-mensah");
  });

  it("makes preview plates open the profile without nesting a second QR link", () => {
    const face = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-face.tsx"),
      "utf8"
    );
    const view = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-public-view.tsx"),
      "utf8"
    );
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    assert.match(face, /celeYouCardOpenHref/);
    assert.match(face, /celecard-interactive/);
    assert.match(face, /Tap to Connect/);
    assert.match(face, /markCeleYouTapHintSeen/);
    assert.match(face, /qrHref=\{qrBadgeHref \?\? null\}/);
    assert.doesNotMatch(view, /qrHref=\{hold \? undefined : digitalCardPublicUrl/);
    assert.match(css, /\.celecard-interactive \{/);
    assert.match(css, /\.celecard-tap-hint \{/);
    assert.match(css, /prefers-reduced-motion[\s\S]*celecard-interactive/);
    assert.match(css, /celecard-plate-flip-in/);
  });
});
