import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  OFFLINE_QR_LABEL,
  ONLINE_QR_LABEL,
  SIGN_SIZES,
  SIGN_TEMPLATES,
  computeSignLayout,
  offlineQrWarning,
  resolveSignCopy,
  type SignContent,
  type SignSizeKey,
  type SignTemplateKey,
} from "../signage";

const ALL_SIZES = Object.keys(SIGN_SIZES) as SignSizeKey[];
const ALL_TEMPLATES = Object.keys(SIGN_TEMPLATES) as SignTemplateKey[];

function content(over: Partial<SignContent> = {}): SignContent {
  return {
    eventTitle: "Chidi & Ngozi",
    celebrants: "Chidi & Ngozi",
    dateLabel: "Thursday 6 August 2026",
    venue: "Celebration Hall, Lagos",
    template: "wedding",
    layout: "single",
    wifiName: null,
    ...over,
  };
}

describe("sign geometry", () => {
  it("keeps every element inside the page on every size", () => {
    for (const size of ALL_SIZES) {
      for (const layout of ["single", "dual"] as const) {
        const l = computeSignLayout(size, layout);
        const page = SIGN_SIZES[size];

        assert.ok(l.qr.x >= 0, `${size}/${layout} qr x`);
        assert.ok(l.qr.y >= 0, `${size}/${layout} qr y`);
        assert.ok(l.qr.x + l.qr.size <= page.width, `${size}/${layout} qr right edge`);
        assert.ok(l.qr.y + l.qr.size <= page.height, `${size}/${layout} qr top edge`);
        assert.ok(l.instructionY > 0, `${size}/${layout} instruction on page`);
        assert.ok(l.footerY > 0 && l.footerY < l.instructionY, `${size}/${layout} footer`);
        assert.ok(l.eyebrowY < page.height, `${size}/${layout} eyebrow`);
      }
    }
  });

  it("prints a quiet zone around every QR so it scans off matte card", () => {
    for (const size of ALL_SIZES) {
      const l = computeSignLayout(size);
      assert.ok(l.quietZone >= 10, `${size} quiet zone must survive the smallest page`);
      assert.ok(l.qr.x >= 0 && l.qr.x + l.qr.size + l.quietZone <= SIGN_SIZES[size].width + 0.001);
    }
  });

  it("scales the QR with the page rather than fixing it", () => {
    const a4 = computeSignLayout("a4").qr.size;
    const a3 = computeSignLayout("a3").qr.size;
    const card = computeSignLayout("tabletop").qr.size;
    assert.ok(a3 > a4, "A3 board must carry a bigger code than A4");
    assert.ok(a4 > card, "a tabletop card must carry a smaller code than A4");
  });

  it("lays two codes side by side without overlapping", () => {
    for (const size of ALL_SIZES) {
      const l = computeSignLayout(size, "dual");
      assert.ok(l.secondaryQr, `${size} must have a second code`);
      const gap = l.secondaryQr!.x - (l.qr.x + l.qr.size);
      assert.ok(gap > 0, `${size} codes overlap`);
      assert.ok(gap >= l.quietZone, `${size} codes are too close to scan reliably`);
      assert.ok(l.secondaryQr!.x + l.secondaryQr!.size <= SIGN_SIZES[size].width);
      assert.equal(l.secondaryQr!.y, l.qr.y, `${size} codes must sit on one baseline`);
      assert.equal(l.secondaryQr!.size, l.qr.size, `${size} codes must be the same size`);
    }
  });

  it("has no second code in single layout", () => {
    assert.equal(computeSignLayout("a4", "single").secondaryQr, null);
  });

  it("orders the text blocks down the page", () => {
    const l = computeSignLayout("a4");
    assert.ok(l.eyebrowY > l.titleY);
    assert.ok(l.titleY > l.celebrantsY);
    assert.ok(l.celebrantsY > l.detailY);
    assert.ok(l.detailY > l.qr.y);
  });
});

describe("QR labelling", () => {
  it("labels nothing on a single-code sign — there is nothing to confuse", () => {
    const copy = resolveSignCopy(content({ layout: "single" }));
    assert.equal(copy.primaryLabel, null);
    assert.equal(copy.secondaryLabel, null);
    assert.equal(copy.footer, null);
  });

  it("labels the two codes distinctly on a dual sign", () => {
    const copy = resolveSignCopy(content({ layout: "dual" }));
    assert.equal(copy.primaryLabel, ONLINE_QR_LABEL);
    assert.equal(copy.secondaryLabel, OFFLINE_QR_LABEL);
    assert.notEqual(copy.primaryLabel, copy.secondaryLabel);
  });

  it("warns that the backup code only works on the venue Wi-Fi", () => {
    const copy = resolveSignCopy(content({ layout: "dual" }));
    assert.ok(copy.footer);
    assert.match(copy.footer, /only/i);
    assert.match(copy.footer, /wi-?fi/i);
    assert.match(copy.footer, /venue/i);
  });

  it("names the network on the warning when the organizer gave one", () => {
    assert.match(offlineQrWarning("Celebration Hall"), /Celebration Hall/);
    assert.match(offlineQrWarning("  "), /event Wi-Fi/);
    assert.match(offlineQrWarning(null), /event Wi-Fi/);
    assert.match(offlineQrWarning(undefined), /event Wi-Fi/);
  });

  it("never implies the backup code works away from the venue", () => {
    const footer = offlineQrWarning("Celebration Hall");
    assert.doesNotMatch(footer, /anywhere|always|internet/i);
  });
});

describe("sign copy", () => {
  it("gives every template a scan instruction and an eyebrow", () => {
    for (const template of ALL_TEMPLATES) {
      const copy = resolveSignCopy(content({ template }));
      assert.ok(copy.eyebrow.length > 0, template);
      assert.ok(copy.instruction.length > 0, template);
      assert.ok(copy.supporting.length > 0, template);
      // A guest reads this from two metres away — no jargon, no URLs.
      assert.doesNotMatch(copy.instruction, /https?:|qr code|token|app store/i, template);
    }
  });

  it("uppercases the title only for the template that asks for it", () => {
    assert.equal(resolveSignCopy(content({ template: "corporate" })).title, "CHIDI & NGOZI");
    assert.equal(resolveSignCopy(content({ template: "wedding" })).title, "Chidi & Ngozi");
  });

  it("joins the date and venue into one detail line", () => {
    assert.equal(
      resolveSignCopy(content()).detail,
      "Thursday 6 August 2026  ·  Celebration Hall, Lagos"
    );
  });

  it("omits the detail line entirely when there is neither date nor venue", () => {
    assert.equal(resolveSignCopy(content({ dateLabel: null, venue: null })).detail, null);
  });

  it("shows whichever of date or venue exists, without a stray separator", () => {
    assert.equal(resolveSignCopy(content({ venue: null })).detail, "Thursday 6 August 2026");
    assert.equal(resolveSignCopy(content({ dateLabel: null })).detail, "Celebration Hall, Lagos");
  });

  it("drops a blank celebrants line rather than printing whitespace", () => {
    assert.equal(resolveSignCopy(content({ celebrants: "   " })).celebrants, null);
    assert.equal(resolveSignCopy(content({ celebrants: null })).celebrants, null);
  });

  it("uses the memorial template's respectful wording", () => {
    const copy = resolveSignCopy(content({ template: "memorial" }));
    assert.match(copy.eyebrow, /In Loving Memory/i);
    assert.doesNotMatch(copy.instruction, /menu|party|celebration/i);
  });
});
