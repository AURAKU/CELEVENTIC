import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  constrainDigitalCardSlugInput,
  digitalCardSlugCandidates,
  isProtectedDigitalCardSlug,
  pickAvailableDigitalCardSlug,
  slugifyDigitalCardBase,
} from "@/lib/digital-business-card/slug";

describe("celecard public slug", () => {
  it("turns a shared name into a clean stem", () => {
    assert.equal(slugifyDigitalCardBase("Kojo Mensah"), "kojo-mensah");
    assert.equal(slugifyDigitalCardBase("  Ama  Serwaa  "), "ama-serwaa");
    assert.equal(constrainDigitalCardSlugInput("Kojo Mensah!"), "kojo-mensah");
    assert.equal(isProtectedDigitalCardSlug("ama-serwaa"), true);
    assert.equal(isProtectedDigitalCardSlug("claim"), true);
    assert.equal(isProtectedDigitalCardSlug("kojo-mensah"), false);
  });

  it("keeps two people with the same name on distinct links", () => {
    const seed = {
      preferred: "kojo-mensah",
      displayName: "Kojo Mensah",
      company: "Northline",
      title: "Managing Partner",
    };
    const candidates = digitalCardSlugCandidates(seed);
    assert.deepEqual(candidates, ["kojo-mensah", "kojo-mensah-northline", "kojo-mensah-managing"]);
    const first = pickAvailableDigitalCardSlug(candidates, () => false);
    assert.equal(first, "kojo-mensah");
    const taken = new Set(["kojo-mensah"]);
    const second = pickAvailableDigitalCardSlug(candidates, (slug) => taken.has(slug));
    assert.equal(second, "kojo-mensah-northline");
    taken.add("kojo-mensah-northline");
    taken.add("kojo-mensah-managing");
    const third = pickAvailableDigitalCardSlug(candidates, (slug) => taken.has(slug));
    assert.equal(third, "kojo-mensah-2");
  });

  it("never hands out the dummy or claim routes", () => {
    const candidates = digitalCardSlugCandidates({ preferred: "claim", displayName: "Claim" });
    assert.equal(candidates.includes("claim"), false);
    const slug = pickAvailableDigitalCardSlug(["ama-serwaa", "card"], (value) => value === "card");
    assert.equal(slug.startsWith("ama-serwaa"), false);
    assert.match(slug, /^card-\d+$/);
  });
});
