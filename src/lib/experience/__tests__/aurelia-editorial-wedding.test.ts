import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AURELIA_CATALOG_SLUG,
  AURELIA_INTRO_ID,
  AURELIA_LAYOUT_SLUG,
  AURELIA_OPENING_ID,
  AURELIA_TRADITIONAL_MAPS,
  AURELIA_WEDDING_DEFAULTS,
  AURELIA_WHITE_MAPS,
  aureliaSectionVisible,
  mergeAureliaWedding,
  resolveAureliaHeroImage,
} from "@/lib/experience/aurelia-editorial";
import { getCatalogTemplate } from "@/lib/invitation-mvp/catalogue";
import { getDefaultDesignConfig } from "@/lib/invitation-templates";
import { getTemplateExperienceDNA } from "@/lib/experience/experience-engine-v2";
import { CATALOG_DEMO_IDENTITIES } from "@/lib/invitation-mvp/catalog-public-copy";
import { buildDirectionsUrl } from "@/lib/invitation/maps-utils";
import { toMapsEmbedUrl } from "@/lib/invitation/calendar-utils";

const FORBIDDEN = /kofi|kamilia|\bk\s*&\s*k\b|october\s*2026|anagkazo|bride'?s home|lovable\.app/i;

test("Aurelia couple, dates and venues stay original", () => {
  assert.equal(AURELIA_WEDDING_DEFAULTS.partnerOneName, "Elorm");
  assert.equal(AURELIA_WEDDING_DEFAULTS.partnerTwoName, "Dansowaa");
  assert.equal(AURELIA_WEDDING_DEFAULTS.monogram, "E & D");
  assert.equal(AURELIA_WEDDING_DEFAULTS.heroTagline, "The Covenant");
  assert.equal(AURELIA_WEDDING_DEFAULTS.storyEyebrow, "Our Beginning");
  assert.equal(AURELIA_WEDDING_DEFAULTS.storyTitle, "Our Story");
  assert.match(AURELIA_WEDDING_DEFAULTS.storyParagraphs[0] ?? "", /unexpected ways/);
  assert.equal(AURELIA_WEDDING_DEFAULTS.storySignature, "Elorm & Dansowaa");
  assert.match(AURELIA_WEDDING_DEFAULTS.dateDisplay, /April 2027/);
  assert.equal(AURELIA_WEDDING_DEFAULTS.ceremonies[0]?.venueName, "TLPCI, Solution Centre");
  assert.equal(AURELIA_WEDDING_DEFAULTS.ceremonies[1]?.venueName, "Ultimate Christian Ministry");
  assert.match(AURELIA_TRADITIONAL_MAPS, /^https:\/\/maps\.app\.goo\.gl\//);
  assert.match(AURELIA_WHITE_MAPS, /^https:\/\/maps\.app\.goo\.gl\//);
  assert.ok(buildDirectionsUrl({ mapsLink: AURELIA_TRADITIONAL_MAPS }));
  assert.match(
    toMapsEmbedUrl(AURELIA_TRADITIONAL_MAPS, "TLPCI, Solution Centre") ?? "",
    /output=embed/
  );
  assert.equal(FORBIDDEN.test(JSON.stringify(AURELIA_WEDDING_DEFAULTS)), false);
});

test("Aurelia resolver hides empty sections and keeps defaults", () => {
  const hidden = mergeAureliaWedding({
    storyParagraphs: [],
    ceremonies: [],
    venues: [],
    dressCodes: [],
    journey: [],
    faqs: [],
    giftsTitle: "",
    giftsLede: "",
    giftsDetails: "",
    sections: { story: { visible: false } },
  });
  assert.equal(aureliaSectionVisible(hidden, "story"), false);
  assert.equal(aureliaSectionVisible(hidden, "celebrations"), false);
  assert.equal(aureliaSectionVisible(hidden, "gifts"), false);
  const merged = mergeAureliaWedding({ partnerOneName: "  " });
  assert.equal(merged.partnerOneName, "Elorm");
  assert.equal(merged.ceremonies.length, 2);
  assert.equal(aureliaSectionVisible(mergeAureliaWedding(), "venues"), false);
  assert.equal(
    aureliaSectionVisible(
      mergeAureliaWedding({
        venues: [
          {
            id: "hotel",
            eventLabel: "Guest stay",
            venueName: "The Oak Hotel",
            address: "Airport City, Accra",
          },
        ],
      }),
      "venues"
    ),
    true
  );
});

test("Aurelia catalog DNA is unique and wired into default design", () => {
  const catalog = getCatalogTemplate(AURELIA_CATALOG_SLUG);
  assert.ok(catalog);
  assert.equal(catalog?.layoutSlug, AURELIA_LAYOUT_SLUG);
  assert.equal(catalog?.experienceOverrides?.introVariant, AURELIA_INTRO_ID);
  assert.equal(catalog?.experienceOverrides?.openingExperience, AURELIA_OPENING_ID);
  const dna = getTemplateExperienceDNA(AURELIA_LAYOUT_SLUG);
  assert.equal(dna.openingExperience, AURELIA_OPENING_ID);
  const design = getDefaultDesignConfig(AURELIA_CATALOG_SLUG);
  assert.equal(design.layout, AURELIA_LAYOUT_SLUG);
  assert.equal(design.experience?.aureliaWedding?.partnerOneName, "Elorm");
  assert.equal(design.experience?.introVariant, AURELIA_INTRO_ID);
  assert.equal(design.experience?.openingExperience, AURELIA_OPENING_ID);
  const demo = CATALOG_DEMO_IDENTITIES[AURELIA_CATALOG_SLUG];
  assert.match(demo.hostName, /Elorm/);
  assert.match(demo.hostName, /Dansowaa/);
  assert.equal(FORBIDDEN.test(JSON.stringify(demo)), false);
});

test("Aurelia files never import Forever Afaris or screenshot assets", () => {
  const files = [
    "src/components/invitation/templates/aurelia-editorial-wedding.tsx",
    "src/components/experience/aurelia-editorial/aurelia-editorial-opening.tsx",
    "src/lib/experience/aurelia-editorial/preset.ts",
  ];
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    assert.doesNotMatch(src, /forever-afaris/);
    assert.doesNotMatch(src, /lovable\.app/);
    assert.doesNotMatch(src, /kofi|kamilia/i);
  }
});

test("Aurelia hero prefers host photo and falls back to dummy photograph", () => {
  assert.match(AURELIA_WEDDING_DEFAULTS.heroImageUrl ?? "", /\/templates\/aurelia\/hero\.jpg$/);
  assert.equal(
    resolveAureliaHeroImage({
      heroImageUrl: AURELIA_WEDDING_DEFAULTS.heroImageUrl,
      coverImageUrl: "https://cdn.example.com/ethan-amara-cover.jpg",
    }),
    "https://cdn.example.com/ethan-amara-cover.jpg"
  );
  assert.equal(
    resolveAureliaHeroImage({
      heroImageUrl: AURELIA_WEDDING_DEFAULTS.heroImageUrl,
      mediaHeroUrl: "https://cdn.example.com/studio-hero.jpg",
      coverImageUrl: "https://cdn.example.com/cover.jpg",
    }),
    "https://cdn.example.com/studio-hero.jpg"
  );
  assert.equal(
    resolveAureliaHeroImage({
      heroImageUrl: "/templates/aurelia/hero.svg",
    }),
    "/templates/aurelia/hero.jpg"
  );
});

test("Aurelia guest wishes use an editorial skin, not the shared rose card", () => {
  const wishesSrc = readFileSync("src/components/guest-portal/guest-wishes-card.tsx", "utf8");
  assert.match(wishesSrc, /AURELIA_LAYOUT_SLUG/);
  assert.match(wishesSrc, /aurelia-guest-wishes/);
  assert.match(wishesSrc, /Share your blessing/);
  const css = readFileSync("src/components/guest-portal/aurelia-guest-wishes.module.css", "utf8");
  assert.match(css, /--font-cinzel/);
  assert.match(css, /--font-playfair/);
  assert.match(css, /--font-cormorant/);
});
