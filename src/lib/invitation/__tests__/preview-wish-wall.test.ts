import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  addPreviewWish,
  listPreviewWishes,
  previewWishWallKey,
} from "@/lib/invitation/preview-wish-wall";

test("preview wish walls are keyed only by preview invitation ids", () => {
  assert.equal(previewWishWallKey("preview-femmora-flagship", null), "preview-femmora-flagship");
  assert.equal(previewWishWallKey(null, "preview-maison-vale"), "preview-maison-vale");
  assert.equal(previewWishWallKey("live-guest-link-abc", "clxyz123"), null);
});

test("preview notes are shared on the same wall and stripped of markup", () => {
  const key = `preview-wish-wall-${Date.now()}`;
  const first = addPreviewWish(key, {
    authorName: "Alex Mensah",
    message: "The house looks <b>beautiful</b>",
  });
  const second = addPreviewWish(key, {
    authorName: "Ama",
    message: "Cannot wait",
  });
  const listed = listPreviewWishes(key);
  assert.equal(listed[0]?.id, second.id);
  assert.equal(listed[1]?.id, first.id);
  assert.equal(listed[1]?.message, "The house looks beautiful");
  assert.equal(listed.length, 2);
});

test("wishes POST no longer requires a client eventId when the invite link is present", () => {
  const route = readFileSync("src/app/api/invite/wishes/route.ts", "utf8");
  assert.match(route, /eventId: z\.preprocess\(blankToUndefined, z\.string\(\)\.min\(1\)\.optional\(\)\)/);
  assert.match(route, /previewWishWallKey/);
  assert.match(route, /addPreviewWish/);
  assert.match(route, /Invitation link required/);
});
