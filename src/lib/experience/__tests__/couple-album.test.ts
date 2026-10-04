import test from "node:test";
import assert from "node:assert/strict";
import { orderCoupleAlbumForPlayback, resolveAureliaCoupleAlbum } from "@/lib/experience/aurelia-editorial";

test("couple album keeps organizer uploads and drops template stock", () => {
  const items = resolveAureliaCoupleAlbum({
    galleryUrls: [
      "/uploads/kojo-fafa/portrait.jpg",
      "/templates/seraphine/hero.jpg",
      "https://images.unsplash.com/photo-demo",
    ],
    media: [
      { url: "/uploads/kojo-fafa/film.mp4", type: "video", role: "reference", name: "Film" },
      { url: "/uploads/kojo-fafa/hero.jpg", type: "image", role: "hero" },
    ],
    journey: [{ id: "j1", title: "Stock", imageUrl: "/templates/aurelia/journey-01.jpg" }],
    reservedUrls: ["/uploads/kojo-fafa/hero.jpg"],
  });

  assert.deepEqual(
    items.map((item) => item.url),
    ["/uploads/kojo-fafa/portrait.jpg", "/uploads/kojo-fafa/film.mp4"]
  );
  assert.equal(items[1]?.type, "video");
});

test("couple album keeps Seraphine couple portraits and still drops hero stock", () => {
  const items = resolveAureliaCoupleAlbum({
    galleryUrls: [
      "/templates/seraphine/hero.jpg",
      "/templates/seraphine/couple/01-chambers.jpg",
      "/templates/seraphine/couple/02-beach.jpg",
      "/templates/seraphine/couple/06-journey.mp4",
      "/templates/seraphine/monogram-lockup.jpg",
    ],
  });
  assert.deepEqual(
    items.map((item) => item.url),
    [
      "/templates/seraphine/couple/01-chambers.jpg",
      "/templates/seraphine/couple/02-beach.jpg",
      "/templates/seraphine/couple/06-journey.mp4",
    ]
  );
  assert.equal(items[2]?.type, "video");
  assert.equal(items[2]?.posterUrl, "/templates/seraphine/couple/01-chambers.jpg");
});

test("couple album keeps Aurelia couple portraits for Our Beginning", () => {
  const items = resolveAureliaCoupleAlbum({
    galleryUrls: [
      "/templates/aurelia/hero.jpg",
      "/templates/aurelia/story.jpg",
      "/templates/aurelia/couple/01-standing.jpg",
      "/templates/aurelia/couple/05-gold-gaze.jpg",
    ],
  });
  assert.deepEqual(
    items.map((item) => item.url),
    [
      "/templates/aurelia/story.jpg",
      "/templates/aurelia/couple/01-standing.jpg",
      "/templates/aurelia/couple/05-gold-gaze.jpg",
    ]
  );
});

test("couple album playback puts photographs first and films after the last picture", () => {
  const items = resolveAureliaCoupleAlbum({
    galleryUrls: ["/uploads/a.mp4", "/uploads/one.jpg", "/uploads/two.jpg"],
  });
  const ordered = orderCoupleAlbumForPlayback(items);
  assert.deepEqual(
    ordered.map((item) => item.type),
    ["image", "image", "video"]
  );
});
