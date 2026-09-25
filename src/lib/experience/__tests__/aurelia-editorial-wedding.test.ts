import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import {
  AURELIA_CATALOG_SLUG,
  AURELIA_INTRO_ID,
  AURELIA_LAYOUT_SLUG,
  AURELIA_OPENING_ID,
  AURELIA_TRADITIONAL_ISO,
  AURELIA_TRADITIONAL_MAPS,
  AURELIA_WEDDING_DEFAULTS,
  AURELIA_WHITE_ISO,
  AURELIA_WHITE_MAPS,
  SERAPHINE_CATALOG_SLUG,
  SERAPHINE_INTRO_ID,
  SERAPHINE_LAYOUT_SLUG,
  SERAPHINE_OPENING_ID,
  SERAPHINE_WEDDING_DEFAULTS,
  aureliaGuestPhoneLinks,
  aureliaNavItems,
  aureliaSectionVisible,
  mergeAureliaWedding,
  resolveAureliaHeroImage,
  withAureliaAlbumQrCenter,
  withoutInvitationPauseDashes,
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

const FORBIDDEN = /kofi|kamilia|\bk\s*&\s*k\b|anagkazo|bride'?s home|lovable\.app/i;

test("Aurelia couple, dates and venues stay original", () => {
  assert.equal(AURELIA_WEDDING_DEFAULTS.partnerOneName, "Enock");
  assert.equal(AURELIA_WEDDING_DEFAULTS.partnerTwoName, "Ruth");
  assert.equal(AURELIA_WEDDING_DEFAULTS.monogram, "E & R");
  assert.equal(AURELIA_WEDDING_DEFAULTS.heroTagline, "");
  assert.equal(AURELIA_WEDDING_DEFAULTS.storyEyebrow, "Our Beginning");
  assert.equal(AURELIA_WEDDING_DEFAULTS.storyTitle, "Our Story");
  assert.match(AURELIA_WEDDING_DEFAULTS.storyParagraphs[0] ?? "", /unexpected ways/);
  assert.equal(AURELIA_WEDDING_DEFAULTS.storySignature, "Enock & Ruth");
  assert.equal(AURELIA_WEDDING_DEFAULTS.dateDisplay, "October 2026");
  assert.equal(AURELIA_WEDDING_DEFAULTS.rsvpByLabel, "");
  assert.deepEqual(
    (AURELIA_WEDDING_DEFAULTS.rsvpContacts ?? []).map((item) => [item.name, item.phone]),
    [
      ["Ohene", "0246502998"],
      ["Prince", "0242547213"],
    ]
  );
  assert.equal(AURELIA_WEDDING_DEFAULTS.ceremonies[0]?.weekday, "Thursday");
  assert.equal(AURELIA_WEDDING_DEFAULTS.ceremonies[0]?.dateLabel, "22 October 2026");
  assert.equal(AURELIA_WEDDING_DEFAULTS.ceremonies[0]?.timeLabel, "11:00 AM");
  assert.equal(AURELIA_WEDDING_DEFAULTS.ceremonies[0]?.venueName, "TLPCI, Solution Centre");
  assert.equal(AURELIA_WEDDING_DEFAULTS.ceremonies[0]?.startAtIso, "2026-10-22T11:00:00+00:00");
  assert.equal(AURELIA_WEDDING_DEFAULTS.ceremonies[1]?.weekday, "Saturday");
  assert.equal(AURELIA_WEDDING_DEFAULTS.ceremonies[1]?.dateLabel, "24 October 2026");
  assert.equal(AURELIA_WEDDING_DEFAULTS.ceremonies[1]?.timeLabel, "1:00 PM");
  assert.equal(AURELIA_WEDDING_DEFAULTS.ceremonies[1]?.venueName, "Ultimate Christian Ministry Tse-Addo");
  assert.equal(AURELIA_WEDDING_DEFAULTS.ceremonies[1]?.startAtIso, "2026-10-24T13:00:00+00:00");
  assert.equal(AURELIA_WEDDING_DEFAULTS.venues[1]?.venueName, "Ultimate Christian Ministry Tse-Addo");
  assert.equal(AURELIA_WEDDING_DEFAULTS.dressCodes[0]?.dateLabel, "Thursday, 22 October");
  assert.equal(AURELIA_WEDDING_DEFAULTS.dressCodes[1]?.dateLabel, "Saturday, 24 October");
  assert.match(AURELIA_TRADITIONAL_MAPS, /^https:\/\/maps\.app\.goo\.gl\//);
  assert.match(AURELIA_WHITE_MAPS, /^https:\/\/maps\.app\.goo\.gl\//);
  assert.ok(buildDirectionsUrl({ mapsLink: AURELIA_TRADITIONAL_MAPS }));
  assert.match(
    toMapsEmbedUrl(AURELIA_TRADITIONAL_MAPS, "TLPCI, Solution Centre") ?? "",
    /output=embed/
  );
  assert.equal(FORBIDDEN.test(JSON.stringify(AURELIA_WEDDING_DEFAULTS)), false);
});

test("Aurelia keeps October 2026 ceremony details even if stored copy says 2027", () => {
  const merged = mergeAureliaWedding({
    dateDisplay: "APRIL 2027",
    heroTagline: "The Covenant",
    partnerOneName: "Elorm",
    partnerTwoName: "Dansowaa",
    monogram: "E & D",
    storySignature: "Elorm & Dansowaa",
    ceremonies: [
      {
        id: "traditional",
        kicker: "Ceremony one",
        title: "The Traditional Ceremony",
        weekday: "Wednesday",
        dateLabel: "10 March 2027",
        timeLabel: "9:00 AM",
        venueName: "Placeholder Hall",
        address: "",
        mapsUrl: "https://maps.google.com",
        startAtIso: "2027-03-10T09:00:00.000Z",
      },
      {
        id: "white",
        kicker: "Ceremony two",
        title: "The White Wedding",
        weekday: "Friday",
        dateLabel: "12 March 2027",
        timeLabel: "4:00 PM",
        venueName: "Placeholder Chapel",
        address: "",
        mapsUrl: "https://maps.google.com",
        startAtIso: "2027-03-12T16:00:00.000Z",
      },
    ],
    venues: [
      {
        id: "white",
        eventLabel: "White Wedding",
        venueName: "Placeholder Chapel",
        mapsUrl: "https://maps.google.com",
      },
    ],
    dressCodes: [
      {
        id: "traditional",
        eventLabel: "Traditional Wedding",
        dateLabel: "Wednesday, 10 March",
        title: "Traditional Wedding",
        palette: [
          { name: "Champagne", hex: "#D8C09C" },
          { name: "Blush", hex: "#DDA8A0" },
          { name: "Terracotta", hex: "#B65A37" },
        ],
      },
    ],
  });
  assert.equal(merged.dateDisplay, "October 2026");
  assert.equal(merged.ceremonies[0]?.dateLabel, "22 October 2026");
  assert.equal(merged.ceremonies[0]?.timeLabel, "11:00 AM");
  assert.equal(merged.ceremonies[0]?.venueName, "TLPCI, Solution Centre");
  assert.equal(merged.ceremonies[0]?.startAtIso, AURELIA_TRADITIONAL_ISO);
  assert.match(merged.ceremonies[0]?.mapsUrl ?? "", /yMfDDtTU6BgxPrUaA/);
  assert.equal(merged.ceremonies[1]?.dateLabel, "24 October 2026");
  assert.equal(merged.ceremonies[1]?.timeLabel, "1:00 PM");
  assert.equal(merged.ceremonies[1]?.venueName, "Ultimate Christian Ministry Tse-Addo");
  assert.equal(merged.ceremonies[1]?.startAtIso, AURELIA_WHITE_ISO);
  assert.match(merged.ceremonies[1]?.mapsUrl ?? "", /F7wWqsUF7aH2efU96/);
  assert.equal(merged.venues[0]?.venueName, "Ultimate Christian Ministry Tse-Addo");
  assert.equal(merged.dressCodes[0]?.dateLabel, "Thursday, 22 October");
  assert.deepEqual(
    (merged.dressCodes[0]?.palette ?? []).map((swatch) => swatch.name),
    ["Chamoisee", "Kobicha", "Black Bean", "Licorice", "Smoky Black"]
  );
  assert.equal(
    (merged.dressCodes[0]?.palette ?? []).some((swatch) => /champagne|blush|terracotta/i.test(swatch.name)),
    false
  );
  assert.doesNotMatch(JSON.stringify(merged.ceremonies), /2027/);
  assert.doesNotMatch(merged.dateDisplay, /2027/);
  assert.equal(merged.heroTagline, "");
  assert.equal(merged.partnerOneName, "Enock");
  assert.equal(merged.partnerTwoName, "Ruth");
  assert.equal(merged.monogram, "E & R");
  assert.equal(merged.storySignature, "Enock & Ruth");
  const inviteSrc = readFileSync(
    "src/components/invitation/templates/aurelia-editorial-wedding.tsx",
    "utf8"
  );
  assert.doesNotMatch(inviteSrc, /heroTagline/);
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
  assert.equal(merged.partnerOneName, "Enock");
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
  assert.equal(design.experience?.aureliaWedding?.partnerOneName, "Enock");
  assert.equal(design.experience?.introVariant, AURELIA_INTRO_ID);
  assert.equal(design.experience?.openingExperience, AURELIA_OPENING_ID);
  const demo = CATALOG_DEMO_IDENTITIES[AURELIA_CATALOG_SLUG];
  assert.match(demo.hostName, /Enock/);
  assert.match(demo.hostName, /Ruth/);
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

test("Aurelia guest invitations omit the shared place card", () => {
  const src = readFileSync("src/components/invitation/invitation-renderer.tsx", "utf8");
  assert.match(src, /isAureliaEditorialLayout/);
  assert.match(src, /templateOmitsSharedPlaceCard/);
  assert.match(src, /!templateOmitsSharedPlaceCard/);
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
  assert.equal(heroStat.size, 112938, "hero photograph must stay the original unprocessed file");
  assert.equal(storyStat.size, 139599, "story photograph must stay the original unprocessed file");
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
  const mergedPalette = mergeAureliaWedding({
    dressCodes: [
      {
        id: "traditional",
        eventLabel: "Traditional Wedding",
        dateLabel: "Friday, 9 April",
        title: "Traditional Wedding",
        palette: [
          { name: "Champagne", hex: "#D8C09C" },
          { name: "Blush", hex: "#DDA8A0" },
          { name: "Terracotta", hex: "#B65A37" },
        ],
      },
    ],
  }).dressCodes[0]?.palette ?? [];
  assert.deepEqual(
    mergedPalette.map((swatch) => swatch.name),
    ["Chamoisee", "Kobicha", "Black Bean", "Licorice", "Smoky Black"]
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
  assert.match(albumSrc, /templates\/aurelia\/hero\.jpg/);
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
  assert.equal(SERAPHINE_WEDDING_DEFAULTS.heroTagline, "");
  assert.equal(AURELIA_WEDDING_DEFAULTS.partnerOneName, "Enock");
  assert.equal(AURELIA_WEDDING_DEFAULTS.monogram, "E & R");
  assert.notEqual(AURELIA_WEDDING_DEFAULTS.storyEyebrow, SERAPHINE_WEDDING_DEFAULTS.storyEyebrow);

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
  assert.equal(aureliaDesign.experience?.aureliaWedding?.partnerOneName, "Enock");
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

test("Aurelia guest copy has no pause dashes between clauses", () => {
  const merged = mergeAureliaWedding();
  assert.equal(
    merged.dressLede,
    "Come dressed to be photographed. We would love the day to look as beautiful as it feels."
  );
  assert.equal(
    merged.journeyLede,
    "From our earliest memories to the promise of forever. Every chapter led us here."
  );
  assert.match(merged.albumLede, /video\. Then find them together/i);
  assert.equal(
    merged.faqs.find((item) => item.id === "dress")?.answer,
    "Yes. Please see Dress to Celebrate for each ceremony, including palette guidance."
  );
  assert.match(
    merged.faqs.find((item) => item.id === "album")?.answer ?? "",
    /video\. Everyone can enjoy them/i
  );
  assert.equal(merged.ceremonies[1]?.venueName, "Ultimate Christian Ministry Tse-Addo");
  assert.match(merged.venuesLede, /turn-by-turn/);
  assert.match(merged.faqs.find((item) => item.id === "park")?.answer ?? "", /On-site/);
  assert.equal(merged.dressLede.includes("—"), false);
  assert.equal(merged.dressLede.includes(" – "), false);
  assert.equal(
    mergeAureliaWedding({
      dressLede: "Come dressed to be photographed — we would love the day to look as beautiful as it feels.",
    }).dressLede,
    "Come dressed to be photographed. We would love the day to look as beautiful as it feels."
  );
  assert.equal(
    withoutInvitationPauseDashes("Yes - please see Dress to Celebrate."),
    "Yes. Please see Dress to Celebrate."
  );
});

test("Aurelia album QR pins the hero photograph as the center mark", () => {
  const url = withAureliaAlbumQrCenter(
    "/api/qr/image?data=https%3A%2F%2Fexample.com%2Fmemory-upload%2Ftok&eventId=evt_1&size=512"
  );
  assert.ok(url);
  const parsed = new URL(url!, "https://www.celeventic.com");
  assert.equal(parsed.searchParams.get("center"), "/templates/aurelia/hero.jpg");
  assert.equal(parsed.searchParams.get("logoSize"), "bold");
  assert.equal(parsed.searchParams.get("eventId"), "evt_1");
  const inviteSrc = readFileSync("src/app/invite/[link]/page.tsx", "utf8");
  assert.match(inviteSrc, /withAureliaAlbumQrCenter/);
  const routeSrc = readFileSync("src/app/api/qr/image/route.ts", "utf8");
  assert.match(routeSrc, /toSafePublicQrCenterPath/);
  assert.match(routeSrc, /requestedCenter/);
});

test("Aurelia RSVP drops the deadline line and lists Call or WhatsApp contacts", () => {
  const merged = mergeAureliaWedding({
    rsvpByLabel: "Kindly respond by 10 March 2027",
  });
  assert.equal(merged.rsvpByLabel, "");
  assert.equal(merged.rsvpContactsEyebrow, "Call or WhatsApp");
  assert.equal(merged.rsvpContacts?.[0]?.name, "Ohene");
  assert.equal(merged.rsvpContacts?.[0]?.phone, "0246502998");
  assert.equal(merged.rsvpContacts?.[1]?.name, "Prince");
  assert.equal(merged.rsvpContacts?.[1]?.phone, "0242547213");
  const ohene = aureliaGuestPhoneLinks("0246502998", "Hello Ohene");
  const prince = aureliaGuestPhoneLinks("0242547213");
  assert.equal(ohene?.telHref, "tel:+233246502998");
  assert.equal(ohene?.whatsAppHref, "https://wa.me/233246502998?text=Hello%20Ohene");
  assert.equal(prince?.telHref, "tel:+233242547213");
  assert.equal(prince?.whatsAppHref, "https://wa.me/233242547213");
  const src = readFileSync("src/components/invitation/templates/aurelia-editorial-wedding.tsx", "utf8");
  assert.doesNotMatch(src, /config\.rsvpByLabel/);
  assert.match(src, /rsvpContacts/);
  assert.match(src, /aureliaGuestPhoneLinks/);
  assert.doesNotMatch(src, /links\.display/);
  assert.doesNotMatch(src, /rsvpContactPhone/);
  assert.match(src, /aria-label=\{`Call \$\{contact\.name\}`\}/);
  assert.match(merged.faqs.find((item) => item.id === "contact")?.answer ?? "", /Ohene/);
  assert.match(merged.faqs.find((item) => item.id === "contact")?.answer ?? "", /Prince/);
  assert.doesNotMatch(merged.faqs.find((item) => item.id === "contact")?.answer ?? "", /\d{7,}/);
  assert.equal(
    mergeAureliaWedding({
      faqs: [
        {
          id: "contact",
          question: "Who can I contact for assistance?",
          answer: "Call or WhatsApp Ohene on 0246502998 or Prince on 0242547213.",
        },
      ],
    }).faqs.find((item) => item.id === "contact")?.answer,
    "Call or WhatsApp Ohene or Prince."
  );
});
