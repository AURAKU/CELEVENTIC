import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSocialInviteDescription,
  buildSocialInviteShareTitle,
  formatSocialDateCardLabel,
  formatSocialDescriptionDate,
  isInternalTemplateTitle,
  resolveCeremonyWeekdayForDate,
  resolveSocialEventTitle,
  sanitizeGuestFacingTitle,
  truncateSocialTitle,
} from "../social-event-title";

describe("isInternalTemplateTitle", () => {
  it("rejects Aurelia product names and slugs", () => {
    assert.equal(isInternalTemplateTitle("Aurelia"), true);
    assert.equal(isInternalTemplateTitle("AURELIA"), true);
    assert.equal(isInternalTemplateTitle("Aurelia Editorial Wedding"), true);
    assert.equal(isInternalTemplateTitle("aurelia-editorial-wedding"), true);
    assert.equal(isInternalTemplateTitle("Aurelia Editorial Wedding Invitation"), true);
  });

  it("rejects Seraphine product names and slugs", () => {
    assert.equal(isInternalTemplateTitle("Seraphine"), true);
    assert.equal(isInternalTemplateTitle("Seraphine Champagne"), true);
    assert.equal(isInternalTemplateTitle("seraphine-champagne-wedding"), true);
  });

  it("keeps genuine event titles", () => {
    assert.equal(isInternalTemplateTitle("Enock & Ruth"), false);
    assert.equal(isInternalTemplateTitle("Kojo & Fafa"), false);
    assert.equal(isInternalTemplateTitle("Kwame & Ama's Wedding Celebration"), false);
  });
});

describe("resolveSocialEventTitle", () => {
  it("uses the real Event Title when it is guest-facing", () => {
    const resolved = resolveSocialEventTitle({
      eventTitle: "Enock & Ruth",
      hostName: "AURELIA",
    });
    assert.equal(resolved.title, "Enock & Ruth");
    assert.equal(resolved.source, "event");
  });

  it("does not leak Aurelia when Event Title is the template name", () => {
    const resolved = resolveSocialEventTitle({
      eventTitle: "AURELIA",
      hostName: "Enock & Ruth",
    });
    assert.equal(resolved.title, "Enock & Ruth");
    assert.doesNotMatch(resolved.title, /aurelia/i);
    assert.equal(resolved.source, "host");
  });

  it("does not leak Seraphine Champagne or catalogue slugs", () => {
    const resolved = resolveSocialEventTitle({
      eventTitle: "Seraphine Champagne",
      invitationName: "seraphine-champagne-wedding",
      hostName: "Kojo & Fafa",
    });
    assert.equal(resolved.title, "Kojo & Fafa");
    assert.doesNotMatch(resolved.title, /seraphine/i);
    assert.doesNotMatch(resolved.title, /champagne/i);
  });

  it("strips a trailing template token from an otherwise guest-facing name", () => {
    assert.equal(sanitizeGuestFacingTitle("Kojo & Fafa Seraphine"), "Kojo & Fafa");
  });

  it("falls back to couple names when title and host are internal", () => {
    const resolved = resolveSocialEventTitle({
      eventTitle: "aurelia-editorial-wedding",
      hostName: "Aurelia Editorial Wedding",
      invitationName: "Aurelia",
      partnerOneName: "Enock",
      partnerTwoName: "Ruth",
    });
    assert.equal(resolved.title, "Enock & Ruth");
    assert.equal(resolved.source, "couple");
  });

  it("uses a neutral wedding fallback when nothing guest-facing exists", () => {
    const resolved = resolveSocialEventTitle({
      eventTitle: "Aurelia",
      hostName: "Seraphine",
    });
    assert.equal(resolved.title, "Wedding Celebration");
    assert.equal(resolved.source, "fallback");
  });

  it("truncates long Event Titles on a word boundary", () => {
    const title = truncateSocialTitle(
      "The Grand Celebration of Kwame Mensah and Ama Boateng With All Their Families",
      40
    );
    assert.ok(title.length <= 40);
    assert.ok(title.endsWith("…"));
    assert.doesNotMatch(title, /aurelia|seraphine/i);
  });
});

describe("social invite copy", () => {
  it("builds Enock & Ruth metadata without the template name", () => {
    const title = resolveSocialEventTitle({
      eventTitle: "AURELIA",
      hostName: "Enock & Ruth",
    }).title;
    assert.equal(buildSocialInviteShareTitle(title), "Enock & Ruth · You're invited");
    const description = buildSocialInviteDescription({
      title,
      hostName: "Enock & Ruth",
    });
    assert.match(description, /Enock & Ruth invite you to celebrate with them/);
    assert.doesNotMatch(description, /AURELIA|Aurelia|Celeventic —/i);
  });

  it("builds a dated Seraphine description from the real couple names", () => {
    const title = resolveSocialEventTitle({
      eventTitle: "Seraphine Champagne",
      hostName: "Kojo & Fafa",
    }).title;
    const descriptionDate = formatSocialDescriptionDate({
      dateLabel: "14 November 2026",
      weekday: "Saturday",
    });
    assert.equal(
      buildSocialInviteDescription({ title, descriptionDate }),
      "You're invited to celebrate Kojo & Fafa on Saturday, 14 November 2026."
    );
  });

  it("does not invent a calendar date from a month-only label", () => {
    assert.equal(formatSocialDescriptionDate({ dateLabel: "October 2026" }), null);
    assert.equal(formatSocialDateCardLabel("14 November 2026"), "14 NOVEMBER 2026");
  });

  it("resolves the matching ceremony weekday", () => {
    const weekday = resolveCeremonyWeekdayForDate({
      dateDisplay: "14 November 2026",
      ceremonies: [
        { weekday: "Friday", dateLabel: "13 November 2026" },
        { weekday: "Saturday", dateLabel: "14 November 2026" },
      ],
    });
    assert.equal(weekday, "Saturday");
  });
});
