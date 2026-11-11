import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  NAMEDROP_APPLE_NOTICE,
  SAVE_CONTACT_IOS_HINT,
  contactSaveHint,
  namedropClaimsUrlTransfer,
  namedropGuidance,
  SETUP_NAMEDROP_CTA,
} from "@/lib/celeyou-share/namedrop";

describe("CeleYou NameDrop guidance", () => {
  it("explains Apple’s limit and never simulates a transfer", () => {
    assert.equal(namedropClaimsUrlTransfer(), false);
    assert.equal(namedropGuidance().notice, NAMEDROP_APPLE_NOTICE);
    assert.equal(namedropGuidance().title, SETUP_NAMEDROP_CTA);
    assert.equal(namedropGuidance().steps.length, 6);
    assert.equal(contactSaveHint("ios-safari"), SAVE_CONTACT_IOS_HINT);
    assert.match(contactSaveHint("android-chrome"), /Android/);
    assert.match(contactSaveHint("desktop"), /\.vcf/);
    const ui = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/celeyou-namedrop-setup.tsx"),
      "utf8"
    );
    assert.match(ui, /NAMEDROP_APPLE_NOTICE/);
    assert.doesNotMatch(ui, /NameDrop transferred|guarantees the website|undocumented/i);
    const desk = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-share-desk.tsx"),
      "utf8"
    );
    assert.match(desk, /CeleYouNameDropSetup/);
    assert.match(desk, /SHARE_CONTACT_FILE_CTA/);
    assert.doesNotMatch(desk, /force AirDrop|automatic NameDrop|pick a nearby/i);
  });
});
