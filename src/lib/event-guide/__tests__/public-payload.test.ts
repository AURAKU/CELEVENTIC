import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatGuideDate,
  menuHasContent,
  normalizeAttachments,
  normalizeMenu,
  normalizeProgrammeItems,
  resolveGuideContent,
  safePublicUrl,
} from "../content";
import { EVENT_GUIDE_TABS, isEventGuideTab, resolveTabFromQuery } from "../types";

describe("safePublicUrl", () => {
  it("allows same-origin paths and absolute http(s) urls", () => {
    assert.equal(safePublicUrl("/uploads/menu.pdf"), "/uploads/menu.pdf");
    assert.equal(safePublicUrl("https://cdn.example.com/menu.pdf"), "https://cdn.example.com/menu.pdf");
    assert.equal(safePublicUrl("http://cdn.example.com/menu.pdf"), "http://cdn.example.com/menu.pdf");
  });

  it("rejects scheme-relative urls that would leave the origin silently", () => {
    assert.equal(safePublicUrl("//evil.example.com/menu.pdf"), null);
  });

  it("rejects script and data urls", () => {
    assert.equal(safePublicUrl("javascript:alert(1)"), null);
    assert.equal(safePublicUrl("data:text/html;base64,PHNjcmlwdD4="), null);
    assert.equal(safePublicUrl("file:///etc/passwd"), null);
  });

  it("rejects empty and non-string input", () => {
    assert.equal(safePublicUrl(""), null);
    assert.equal(safePublicUrl("   "), null);
    assert.equal(safePublicUrl(null), null);
    assert.equal(safePublicUrl(42), null);
    assert.equal(safePublicUrl({ url: "/x" }), null);
  });
});

describe("programme normalisation", () => {
  it("keeps time, title and description and mints a stable id", () => {
    const items = normalizeProgrammeItems([
      { time: "2:00 PM", title: "Ceremony", description: "Exchange of vows" },
    ]);
    assert.equal(items.length, 1);
    assert.equal(items[0]!.time, "2:00 PM");
    assert.equal(items[0]!.title, "Ceremony");
    assert.equal(items[0]!.description, "Exchange of vows");
    assert.ok(items[0]!.id.length > 0);
  });

  it("accepts `detail` as an alias for `description`", () => {
    const items = normalizeProgrammeItems([{ title: "Toasts", detail: "Best man" }]);
    assert.equal(items[0]!.description, "Best man");
  });

  it("omits the description key entirely when there is none", () => {
    const items = normalizeProgrammeItems([{ title: "Dancing" }]);
    assert.ok(!("description" in items[0]!));
  });

  it("drops entries with no title and survives junk input", () => {
    assert.deepEqual(normalizeProgrammeItems([{ time: "2pm" }, null, "nope", 7, { title: "  " }]), []);
    assert.deepEqual(normalizeProgrammeItems("not an array"), []);
    assert.deepEqual(normalizeProgrammeItems(null), []);
  });

  it("caps the list and the length of each field", () => {
    const many = Array.from({ length: 200 }, (_, i) => ({ title: `Item ${i}` }));
    assert.equal(normalizeProgrammeItems(many).length, 60);

    const long = normalizeProgrammeItems([{ title: "T".repeat(500), description: "D".repeat(2000) }]);
    assert.equal(long[0]!.title.length, 160);
    assert.equal(long[0]!.description!.length, 400);
  });

  it("gives every item a distinct id when the organizer supplies none", () => {
    const items = normalizeProgrammeItems([{ title: "Toast" }, { title: "Toast" }]);
    assert.notEqual(items[0]!.id, items[1]!.id);
  });
});

describe("menu normalisation", () => {
  it("reads both the guide's and the companion's field names", () => {
    assert.equal(normalizeMenu({ body: "Jollof" }).body, "Jollof");
    assert.equal(normalizeMenu({ menuBody: "Jollof" }).body, "Jollof");
    assert.equal(normalizeMenu({ menuUrl: "/menu.pdf" }).url, "/menu.pdf");
  });

  it("keeps structured sections and drops empty ones", () => {
    const menu = normalizeMenu({
      sections: [
        { heading: "Starters", items: ["Soup", "", "  "] },
        { heading: "", items: [] },
        null,
      ],
    });
    assert.equal(menu.sections.length, 1);
    assert.equal(menu.sections[0]!.heading, "Starters");
    assert.deepEqual(menu.sections[0]!.items, ["Soup"]);
  });

  it("refuses an unsafe menu url", () => {
    assert.equal(normalizeMenu({ url: "javascript:alert(1)" }).url, null);
  });

  it("knows when a menu is genuinely empty", () => {
    assert.equal(menuHasContent(normalizeMenu({})), false);
    assert.equal(menuHasContent(normalizeMenu({ body: "  " })), false);
    assert.equal(menuHasContent(normalizeMenu({ body: "Jollof" })), true);
    assert.equal(menuHasContent(normalizeMenu({ url: "/menu.pdf" })), true);
    assert.equal(menuHasContent(normalizeMenu({ sections: [{ heading: "Mains", items: [] }] })), true);
  });
});

describe("attachment normalisation", () => {
  it("drops attachments whose url is unsafe", () => {
    const out = normalizeAttachments([
      { label: "Order of service", url: "/uploads/oos.pdf" },
      { label: "Evil", url: "javascript:alert(1)" },
      { label: "No url" },
    ]);
    assert.equal(out.length, 1);
    assert.equal(out[0]!.url, "/uploads/oos.pdf");
  });

  it("defaults an unknown kind to pdf and labels the unlabelled", () => {
    const out = normalizeAttachments([{ url: "/x.pdf", kind: "executable" }]);
    assert.equal(out[0]!.kind, "pdf");
    assert.equal(out[0]!.label, "Attachment");
  });

  it("caps how many attachments a guide may carry", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ url: `/f${i}.pdf` }));
    assert.equal(normalizeAttachments(many).length, 6);
  });
});

describe("composition precedence", () => {
  const invitationProgramme = [{ id: "a", time: "2:00 PM", title: "Ceremony" }];
  const invitationFeatureConfig = { menuBody: "Invitation menu" };

  it("inherits from the invitation when the guide has no edits", () => {
    const composed = resolveGuideContent({
      programmeDraft: null,
      menuDraft: null,
      attachments: null,
      invitationProgrammeItems: invitationProgramme,
      invitationFeatureConfig,
    });
    assert.equal(composed.programmeSource, "invitation");
    assert.equal(composed.programme[0]!.title, "Ceremony");
  });

  it("prefers the guide's own edits once they exist", () => {
    const composed = resolveGuideContent({
      programmeDraft: [{ title: "Guide-only item" }],
      menuDraft: null,
      attachments: null,
      invitationProgrammeItems: invitationProgramme,
      invitationFeatureConfig,
    });
    assert.equal(composed.programmeSource, "guide");
    assert.equal(composed.programme.length, 1);
    assert.equal(composed.programme[0]!.title, "Guide-only item");
  });

  it("resolves the programme and the menu independently", () => {
    const composed = resolveGuideContent({
      programmeDraft: [{ title: "Guide-only item" }],
      menuDraft: null,
      attachments: null,
      invitationProgrammeItems: invitationProgramme,
      invitationFeatureConfig,
    });
    assert.equal(composed.programmeSource, "guide");
    assert.equal(composed.menuSource, "invitation");
    assert.equal(composed.menu.body, "Invitation menu");
  });

  it("reports empty when neither the guide nor the invitation has content", () => {
    const composed = resolveGuideContent({
      programmeDraft: null,
      menuDraft: null,
      attachments: null,
      invitationProgrammeItems: [],
      invitationFeatureConfig: null,
    });
    assert.equal(composed.programmeSource, "empty");
    assert.equal(composed.menuSource, "empty");
    assert.deepEqual(composed.programme, []);
  });
});

describe("date formatting", () => {
  it("writes a long human date", () => {
    assert.equal(formatGuideDate("2026-08-06T15:00:00Z"), "Thursday, 6 August 2026");
  });

  it("collapses a same-day range to one date", () => {
    assert.equal(
      formatGuideDate("2026-08-06T15:00:00Z", "2026-08-06T23:00:00Z"),
      "Thursday, 6 August 2026"
    );
  });

  it("shows both ends of a multi-day event", () => {
    const label = formatGuideDate("2026-08-06T15:00:00Z", "2026-08-08T15:00:00Z");
    assert.match(label!, /Thursday, 6 August 2026 – Saturday, 8 August 2026/);
  });

  it("returns null rather than 'Invalid Date' for junk", () => {
    assert.equal(formatGuideDate(null), null);
    assert.equal(formatGuideDate("not a date"), null);
  });
});

describe("tab resolution", () => {
  it("knows the three tabs", () => {
    assert.deepEqual([...EVENT_GUIDE_TABS], ["programme", "seating", "menu"]);
    assert.equal(isEventGuideTab("menu"), true);
    assert.equal(isEventGuideTab("admin"), false);
  });

  it("falls back to the organizer's default for an unknown ?tab=", () => {
    assert.equal(resolveTabFromQuery("menu"), "menu");
    assert.equal(resolveTabFromQuery("nonsense", "seating"), "seating");
    assert.equal(resolveTabFromQuery(undefined), "programme");
    assert.equal(resolveTabFromQuery(["menu", "programme"]), "menu");
  });
});
