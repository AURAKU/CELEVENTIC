import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import {
  AURELIA_CATALOG_SLUG,
  AURELIA_INTRO_ID,
  AURELIA_LAYOUT_SLUG,
  AURELIA_OPENING_ID,
  AURELIA_TRADITIONAL_MAPS,
  AURELIA_WEDDING_DEFAULTS,
  AURELIA_WHITE_MAPS,
  SERAPHINE_CATALOG_SLUG,
  SERAPHINE_INTRO_ID,
  SERAPHINE_LAYOUT_SLUG,
  SERAPHINE_OPENING_ID,
  SERAPHINE_WEDDING_DEFAULTS,
  aureliaNavItems,
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
import { getCatalogMusicProfile } from "@/lib/invitation/catalog-music-identity";
import { getLayoutMusicProfile, musicProfileUrl } from "@/lib/invitation/layout-music-identity";
import {
  AURELIA_INVITE_MUSIC,
  AURELIA_INVITE_MUSIC_DURATION_SEC,
  AURELIA_INVITE_MUSIC_TITLE,
  AURELIA_TRADITIONAL_PALETTE,
} from "@/lib/experience/aurelia-editorial/preset";

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
  assert.equal(aureliaSectionVisible(mergeAureliaWedding(), "journey"), false);
  assert.equal(
    aureliaSectionVisible(
      mergeAureliaWedding({
        sections: { journey: { visible: true } },
        journey: [{ id: "x", title: "Growing together", imageUrl: "/templates/aurelia/journey-02.jpg" }],
      }),
      "journey"
    ),
    true
  );
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
  const heroStat = statSync("public/templates/aurelia/hero.jpg");
  const storyStat = statSync("public/templates/aurelia/story.jpg");
  assert.ok(heroStat.size > 250_000, "hero photograph must be HD");
  assert.ok(storyStat.size > 250_000, "story photograph must be HD");
  for (const name of ["journey-01.jpg", "journey-02.jpg", "journey-03.jpg", "journey-04.jpg"]) {
    assert.ok(statSync(`public/templates/aurelia/${name}`).size > 150_000);
  }
  assert.equal(AURELIA_WEDDING_DEFAULTS.journey.length, 0);
  assert.equal(AURELIA_WEDDING_DEFAULTS.sections?.journey?.visible, false);
});

test("Aurelia guest wishes use an editorial skin, not the shared rose card", () => {
  const wishesSrc = readFileSync("src/components/guest-portal/guest-wishes-card.tsx", "utf8");
  assert.match(wishesSrc, /isAureliaEditorialLayout/);
  assert.match(wishesSrc, /aurelia-guest-wishes/);
  assert.match(wishesSrc, /Share your blessing/);
  const css = readFileSync("src/components/guest-portal/aurelia-guest-wishes.module.css", "utf8");
  assert.match(css, /--font-cinzel/);
  assert.match(css, /--font-playfair/);
  assert.match(css, /--font-cormorant/);
});

test("Aurelia plays Ordinary as the invitation score", () => {
  const catalog = getCatalogMusicProfile(AURELIA_CATALOG_SLUG);
  const layout = getLayoutMusicProfile(AURELIA_LAYOUT_SLUG);
  assert.equal(catalog?.title, AURELIA_INVITE_MUSIC_TITLE);
  assert.equal(catalog?.url, AURELIA_INVITE_MUSIC);
  assert.equal(musicProfileUrl(catalog!), AURELIA_INVITE_MUSIC);
  assert.equal(catalog?.startSec, 0);
  assert.equal(catalog?.endSec, AURELIA_INVITE_MUSIC_DURATION_SEC);
  assert.equal(layout.title, AURELIA_INVITE_MUSIC_TITLE);
  assert.equal(musicProfileUrl(layout), AURELIA_INVITE_MUSIC);
  assert.equal(existsSync("public/templates/aurelia/ordinary.mp3"), true);
  assert.ok(statSync("public/templates/aurelia/ordinary.mp3").size > 1_000_000);
  assert.equal(readFileSync("public/templates/aurelia/ordinary.mp3").subarray(0, 3).toString("ascii"), "ID3");
  const runtimeSrc = readFileSync(
    "src/app/dev/aurelia-editorial-wedding/aurelia-editorial-runtime-client.tsx",
    "utf8"
  );
  assert.match(runtimeSrc, /musicAutoplay:\s*true/);
  assert.match(runtimeSrc, /musicAutoplay\n/);
  const wrapperSrc = readFileSync(
    "src/components/invitation-os/premium-invite-wrapper.tsx",
    "utf8"
  );
  assert.match(wrapperSrc, /if \(next === "portal"\) \{\s*void startAudio\(\);/s);
});

test("Aurelia traditional color option uses the approved brown palette", () => {
  const palette = AURELIA_WEDDING_DEFAULTS.dressCodes[0]?.palette ?? [];
  assert.deepEqual(
    palette.map((swatch) => [swatch.name, swatch.hex.toUpperCase()]),
    AURELIA_TRADITIONAL_PALETTE.map((swatch) => [swatch.name, swatch.hex.toUpperCase()])
  );
  assert.deepEqual(
    palette.map((swatch) => swatch.hex.toUpperCase()),
    ["#A7795E", "#6E3C19", "#34170D", "#230F08", "#110703"]
  );
});

test("Aurelia invitation hosts Memory Vault as The Album", () => {
  assert.equal(AURELIA_WEDDING_DEFAULTS.albumEyebrow, "From your lens");
  assert.equal(AURELIA_WEDDING_DEFAULTS.albumTitle, "The Album");
  assert.match(AURELIA_WEDDING_DEFAULTS.albumLede, /shared album/i);
  assert.equal(AURELIA_WEDDING_DEFAULTS.albumUploadCta, "Open the lens");
  assert.equal(AURELIA_WEDDING_DEFAULTS.albumViewCta, "View the album");
  assert.equal(aureliaSectionVisible(mergeAureliaWedding(), "album"), true);
  assert.equal(
    aureliaSectionVisible(mergeAureliaWedding({ sections: { album: { visible: false } } }), "album"),
    false
  );
  const nav = aureliaNavItems(mergeAureliaWedding());
  assert.deepEqual(
    nav.map((item) => item.id),
    ["home", "story", "celebrations", "dress", "album", "rsvp"]
  );
  const templateSrc = readFileSync(
    "src/components/invitation/templates/aurelia-editorial-wedding.tsx",
    "utf8"
  );
  assert.match(templateSrc, /AureliaMemoryAlbum/);
  assert.match(templateSrc, /memoryUploadUrl/);
  assert.match(templateSrc, /id="aurelia-album"/);
  const albumSrc = readFileSync(
    "src/components/invitation/templates/aurelia-memory-album.tsx",
    "utf8"
  );
  assert.doesNotMatch(albumSrc, /forever-afaris/);
  assert.match(albumSrc, /liveAlbumPaths/);
  assert.doesNotMatch(albumSrc, /Album QR activates when this invitation is published/);
  assert.doesNotMatch(
    readFileSync("src/components/guest-portal/guest-wishes-card.tsx", "utf8"),
    /#aurelia-album/
  );
});

test("Seraphine is an isolated Aurelia-family duplicate", () => {
  assert.equal(SERAPHINE_WEDDING_DEFAULTS.partnerOneName, "Efua");
  assert.equal(SERAPHINE_WEDDING_DEFAULTS.partnerTwoName, "Yaw");
  assert.equal(SERAPHINE_WEDDING_DEFAULTS.monogram, "E & Y");
  assert.equal(SERAPHINE_WEDDING_DEFAULTS.heroTagline, "The Promise");
  assert.equal(AURELIA_WEDDING_DEFAULTS.partnerOneName, "Elorm");
  assert.equal(AURELIA_WEDDING_DEFAULTS.monogram, "E & D");
  assert.notEqual(AURELIA_WEDDING_DEFAULTS.heroTagline, SERAPHINE_WEDDING_DEFAULTS.heroTagline);

  const catalog = getCatalogTemplate(SERAPHINE_CATALOG_SLUG);
  assert.ok(catalog);
  assert.equal(catalog?.layoutSlug, SERAPHINE_LAYOUT_SLUG);
  assert.equal(catalog?.name, "Seraphine Champagne Wedding");
  assert.equal(catalog?.listed, false);
  assert.notEqual(catalog?.layoutSlug, AURELIA_LAYOUT_SLUG);

  const seraphineDesign = getDefaultDesignConfig(SERAPHINE_CATALOG_SLUG);
  const aureliaDesign = getDefaultDesignConfig(AURELIA_CATALOG_SLUG);
  assert.equal(seraphineDesign.layout, SERAPHINE_LAYOUT_SLUG);
  assert.equal(aureliaDesign.layout, AURELIA_LAYOUT_SLUG);
  assert.equal(seraphineDesign.experience?.aureliaWedding?.partnerOneName, "Efua");
  assert.equal(aureliaDesign.experience?.aureliaWedding?.partnerOneName, "Elorm");
  assert.equal(seraphineDesign.experience?.introVariant, SERAPHINE_INTRO_ID);
  assert.equal(seraphineDesign.experience?.openingExperience, SERAPHINE_OPENING_ID);
  assert.equal(aureliaDesign.experience?.introVariant, AURELIA_INTRO_ID);
  assert.equal(aureliaDesign.experience?.openingExperience, AURELIA_OPENING_ID);

  const demo = CATALOG_DEMO_IDENTITIES[SERAPHINE_CATALOG_SLUG];
  assert.match(demo.hostName, /Efua Asante/);
  assert.match(demo.hostName, /Yaw Boateng/);
  assert.equal(FORBIDDEN.test(JSON.stringify(demo)), false);
  assert.equal(FORBIDDEN.test(JSON.stringify(SERAPHINE_WEDDING_DEFAULTS)), false);
});
