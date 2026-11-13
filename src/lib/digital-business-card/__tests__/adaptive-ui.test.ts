import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function source(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("CeleYou Adaptive UI System", () => {
  it("keeps fluid type, safe areas, and landscape tap without hiding actions", () => {
    const css = source("src/app/celeyou-adaptive.css");
    assert.match(css, /clamp\(1\.35rem/);
    assert.match(css, /env\(safe-area-inset-bottom/);
    assert.match(css, /orientation: landscape/);
    assert.match(css, /celecard-tap-actions/);
    assert.match(css, /celecard-tap-shell \.celecard-hold-frame/);
    assert.match(css, /has\(\.celecard-tap-shell\)/);
    assert.match(css, /never hidden/i);
    assert.doesNotMatch(css, /display:\s*none\s*!important/);
  });

  it("wires Tap Mode, guest exchange, inbox, wallet, and admin to the adaptive layer", () => {
    const host = source("src/components/digital-business-card/celeyou-tap-connect.tsx");
    const guest = source("src/components/digital-business-card/celeyou-tap-guest-view.tsx");
    const inbox = source("src/components/digital-business-card/digital-card-connection-inbox.tsx");
    const wallet = source("src/components/digital-business-card/digital-card-wallet-view.tsx");
    const layout = source("src/app/layout.tsx");
    assert.match(layout, /celeyou-adaptive\.css/);
    assert.match(host, /celecard-tap-heading/);
    assert.match(host, /celecard-tap-body/);
    assert.match(host, /celecard-tap-qr/);
    assert.match(host, /celecard-universal-actions/);
    assert.match(guest, /celecard-tap-actions/);
    assert.match(guest, /celecard-tap-form/);
    assert.match(guest, /celecard-identity-copy/);
    assert.match(inbox, /celeyou-adaptive/);
    assert.match(wallet, /celecard-wallet-shell/);
  });
});
