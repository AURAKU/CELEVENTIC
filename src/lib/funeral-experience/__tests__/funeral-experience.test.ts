import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FUNERAL_EXPERIENCE_THEMES,
  resolveFuneralTheme,
  funeralThemeCssVars,
} from "@/lib/funeral-experience/themes";
import {
  mapRevealStyleToIntro,
  resolveIntroForTheme,
  suggestThemeFromSku,
  resolveMotionLevel,
} from "@/lib/funeral-experience/experience-resolver";
import {
  computeAgeYears,
  formatLifeDates,
  ADINKRA_SYMBOLS,
  CULTURAL_RELIGIOUS_PRESETS,
} from "@/lib/funeral-experience/terminology";
import {
  mapLegacyThemeToExperience,
  parseFamilyContactsBlob,
  resolveMemorialExperience,
  serializeFamilyContactsBlob,
} from "@/lib/funeral-experience/experience-config";
import {
  buildIcsCalendar,
  combineEventDateAndTime,
  googleCalendarUrl,
} from "@/lib/funeral-experience/calendar";
import {
  detectLowBandwidth,
  HASH_TO_TAB,
  inferProgrammeDayLabel,
} from "@/lib/funeral-experience/programme-utils";
import { getInviteBlueprint, categoryForBlueprint } from "@/lib/invite-blueprints/blueprint-registry";

describe("funeral experience themes", () => {
  it("ships at least 12 flagship themes", () => {
    assert.ok(FUNERAL_EXPERIENCE_THEMES.length >= 12);
    assert.equal(resolveFuneralTheme("eternal-rose").id, "eternal-rose");
    assert.equal(resolveFuneralTheme("missing").id, "eternal-rose");
    const vars = funeralThemeCssVars(resolveFuneralTheme("ghana-heritage"));
    assert.equal(vars["--funeral-gold"], "#D4AF37");
  });
});

describe("funeral intro resolver", () => {
  it("maps reveal styles to intros", () => {
    assert.equal(mapRevealStyleToIntro("CANDLELIGHT"), "candle-remembrance");
    assert.equal(mapRevealStyleToIntro("DOVE_RELEASE"), "heavenly-reveal");
    assert.equal(mapRevealStyleToIntro("FLORAL"), "floral-reveal");
    assert.equal(resolveIntroForTheme("heavenly-peace"), "heavenly-reveal");
  });

  it("respects reduced motion and low bandwidth", () => {
    assert.equal(resolveMotionLevel("cinematic", true, false), "none");
    assert.equal(resolveMotionLevel("cinematic", false, true), "minimal");
  });

  it("suggests themes from catalogue SKUs", () => {
    assert.equal(suggestThemeFromSku("kente-border-farewell"), "ghana-heritage");
    assert.equal(suggestThemeFromSku("white-lily-rest"), "heavenly-peace");
  });
});

describe("funeral terminology helpers", () => {
  it("formats sunrise/sunset and age", () => {
    const label = formatLifeDates({
      dateOfBirth: "1952-01-15",
      dateOfPassing: "2026-02-09",
      format: "sunrise-sunset",
    });
    assert.match(label, /Sunrise 1952/);
    assert.match(label, /Sunset 2026/);
    assert.equal(computeAgeYears("1952-01-15", "2026-02-09"), 74);
  });

  it("exposes Adinkra with meanings and cultural presets", () => {
    assert.ok(ADINKRA_SYMBOLS.every((s) => s.meaning && s.usage));
    assert.ok(CULTURAL_RELIGIOUS_PRESETS.some((p) => p.id === "muslim" && p.allowCrescent));
    assert.ok(!CULTURAL_RELIGIOUS_PRESETS.find((p) => p.id === "muslim")?.allowCross);
  });
});

describe("ghanaian funeral blueprints", () => {
  it("registers catalogue blueprint ids", () => {
    for (const id of [
      "funeral-akan-cloth-v1",
      "funeral-homegoing-v1",
      "funeral-kente-banner-v1",
      "funeral-vigil-notice-v1",
    ]) {
      assert.equal(categoryForBlueprint(id), "funeral");
      assert.equal(getInviteBlueprint(id).category, "funeral");
    }
  });
});

describe("experience config blob", () => {
  it("maps legacy themes and preserves contacts", () => {
    assert.equal(mapLegacyThemeToExperience("midnight-ivory"), "golden-legacy");
    const parsed = parseFamilyContactsBlob([
      { name: "Kwame", role: "Family Representative", phone: "0240000000" },
    ]);
    assert.equal(parsed.contacts[0]?.name, "Kwame");
    const round = serializeFamilyContactsBlob(parsed.contacts, {
      ...parsed.experience,
      aka: "Uncle K",
      honorificTitle: "Nana",
    });
    assert.equal(round.experience.aka, "Uncle K");
    assert.equal(round.contacts.length, 1);
  });

  it("resolves memorial experience from profile fields", () => {
    const resolved = resolveMemorialExperience({
      theme: "ghana-heritage",
      templateSlug: "kente-border-farewell",
      revealStyle: "MEMORIAL_BOOK",
      familyContacts: {
        contacts: [],
        experience: { v: 1, aka: "Auntie", introPolicy: "once" },
      },
    });
    assert.equal(resolved.themeId, "ghana-heritage");
    assert.equal(resolved.introId, "ghanaian-regal");
    assert.equal(resolved.experience.aka, "Auntie");
  });
});

describe("calendar + programme utils", () => {
  it("builds ICS and Google Calendar links", () => {
    const start = combineEventDateAndTime("2026-03-14T00:00:00.000Z", "9:00 AM");
    assert.equal(start.getHours(), 9);
    const ics = buildIcsCalendar([
      { title: "Burial Service", start, location: "Accra", description: "Family gathering" },
    ]);
    assert.match(ics, /BEGIN:VCALENDAR/);
    assert.match(ics, /Burial Service/);
    assert.match(googleCalendarUrl({ title: "Wake", start }), /calendar\.google\.com/);
  });

  it("infers day labels and hash tabs", () => {
    assert.equal(inferProgrammeDayLabel("Saturday Interment", null, 0), "Saturday");
    assert.equal(HASH_TO_TAB.memories, "gallery");
    assert.equal(HASH_TO_TAB.contributions, "contribute");
    assert.equal(typeof detectLowBandwidth(), "boolean");
  });
});
