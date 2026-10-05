import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  SERAPHINE_COUPLE_GALLERY,
  SERAPHINE_JOURNEY_CHAPTERS,
  SERAPHINE_LOOKBOOK_GALLERY,
  isSeraphineJourneyMedia,
  resolveAureliaJourneyMoments,
  seraphineLookbookGallery,
} from "@/lib/experience/aurelia-editorial";

test("Seraphine journey slideshow uses different photographs than the lookbook", () => {
  const lookbook = seraphineLookbookGallery();
  const journeyUrls = SERAPHINE_JOURNEY_CHAPTERS.map((item) => item.imageUrl);
  assert.equal(SERAPHINE_JOURNEY_CHAPTERS[0]?.title, "Where it began");
  assert.equal(SERAPHINE_JOURNEY_CHAPTERS.length, 6);
  assert.equal(
    SERAPHINE_JOURNEY_CHAPTERS.at(-1)?.imageUrl,
    "/templates/seraphine/couple/06-journey.mp4"
  );
  assert.deepEqual(lookbook, [...SERAPHINE_LOOKBOOK_GALLERY]);
  assert.equal(lookbook.includes("/templates/seraphine/couple/11-studio-black.jpg"), true);
  assert.equal(lookbook.includes("/templates/seraphine/couple/06-journey.mp4"), false);
  assert.equal(lookbook.some((url) => journeyUrls.includes(url)), false);
  for (const item of SERAPHINE_JOURNEY_CHAPTERS) {
    assert.ok(item.imageUrl);
    assert.equal(existsSync(`public${item.imageUrl}`), true, item.imageUrl);
    assert.equal(lookbook.includes(item.imageUrl), false);
  }
});

test("uploaded journey photos beat catalogue chapters", () => {
  const items = resolveAureliaJourneyMoments({
    journey: [
      {
        id: "custom",
        title: "Where it began",
        imageUrl: "/uploads/events/kojo-fafa/01-chambers.jpg",
      },
    ],
    galleryUrls: [...SERAPHINE_COUPLE_GALLERY],
    catalogFallback: SERAPHINE_JOURNEY_CHAPTERS,
  });
  assert.deepEqual(
    items.map((item) => item.imageUrl),
    ["/uploads/events/kojo-fafa/01-chambers.jpg"]
  );
  assert.equal(items[0]?.title, "Where it began");
});

test("organiser uploads beat catalogue chapters; template gallery does not", () => {
  const uploaded = resolveAureliaJourneyMoments({
    galleryUrls: ["/uploads/events/kojo-fafa/01-chambers.jpg"],
    catalogFallback: SERAPHINE_JOURNEY_CHAPTERS,
    reservedUrls: seraphineLookbookGallery(),
  });
  assert.deepEqual(
    uploaded.map((item) => item.imageUrl),
    ["/uploads/events/kojo-fafa/01-chambers.jpg"]
  );

  const catalog = resolveAureliaJourneyMoments({
    galleryUrls: [...SERAPHINE_COUPLE_GALLERY.slice(0, 4)],
    catalogFallback: SERAPHINE_JOURNEY_CHAPTERS,
    reservedUrls: seraphineLookbookGallery(),
  });
  assert.equal(catalog.length, SERAPHINE_JOURNEY_CHAPTERS.length);
  assert.equal(catalog[0]?.title, "Where it began");
  assert.equal(isSeraphineJourneyMedia("/templates/seraphine/hero.jpg"), false);
  assert.equal(isSeraphineJourneyMedia("/uploads/events/kojo-fafa/01-chambers.jpg"), true);
});
