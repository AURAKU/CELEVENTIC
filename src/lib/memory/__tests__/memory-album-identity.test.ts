import test from "node:test";
import assert from "node:assert/strict";
import { AURELIA_LAYOUT_SLUG, SERAPHINE_LAYOUT_SLUG } from "@/lib/experience/aurelia-editorial";
import { resolveMemoryAlbumIdentity } from "../memory-album-identity";
import { resolveMemoryTheme } from "../memory-theme";

test("Aurelia album chrome uses invitation couple names and date, not the event title", () => {
  const identity = resolveMemoryAlbumIdentity({
    eventTitle: "AURELIA",
    hostName: "Celeventic",
    templateSlug: AURELIA_LAYOUT_SLUG,
    design: {
      layout: AURELIA_LAYOUT_SLUG,
      experience: {
        aureliaWedding: {
          partnerOneName: "Elorm",
          partnerTwoName: "Dansowaa",
        },
      },
    } as never,
  });

  assert.equal(identity.title, "Enock & Ruth");
  assert.equal(identity.eyebrow, "From your lens");
  assert.equal(identity.subtitle, "October 2026");
  assert.doesNotMatch(identity.subtitle ?? "", /hosted by/i);
});

test("Seraphine album chrome stays on its own couple names", () => {
  const identity = resolveMemoryAlbumIdentity({
    eventTitle: "Seraphine",
    hostName: "Host",
    templateSlug: SERAPHINE_LAYOUT_SLUG,
    design: { layout: SERAPHINE_LAYOUT_SLUG },
  });

  assert.equal(identity.title, "Kojo & Fafa");
  assert.equal(identity.eyebrow, "From your lens");
  assert.equal(identity.logoUrl, "/templates/seraphine/monogram-lockup.jpg");
  assert.match(identity.lede ?? "", /shared album/i);
  assert.equal(identity.monogram, "K & F");
});

test("non-invitation albums keep the event title and hosted-by line", () => {
  const identity = resolveMemoryAlbumIdentity({
    eventTitle: "Ama's Birthday",
    hostName: "Ama",
    templateSlug: "classic-gold",
  });

  assert.equal(identity.title, "Ama's Birthday");
  assert.equal(identity.eyebrow, "Event memories");
  assert.equal(identity.subtitle, "Hosted by Ama");
});

test("Aurelia memory theme keeps editorial ivory terracotta and Cinzel", () => {
  const theme = resolveMemoryTheme({
    templateSlug: AURELIA_LAYOUT_SLUG,
    design: {
      layout: AURELIA_LAYOUT_SLUG,
      colors: {
        primary: "#111111",
        secondary: "#222222",
        accent: "#00ff00",
        background: "#ffffff",
        text: "#000000",
      },
    },
  });

  assert.equal(theme.id, AURELIA_LAYOUT_SLUG);
  assert.equal(theme.colors.surface, "#F8F4EA");
  assert.equal(theme.colors.accent, "#B65A37");
  assert.equal(theme.colors.ink, "#3B2A25");
  assert.match(theme.fonts.display, /cinzel/i);
  assert.match(theme.fonts.body, /cormorant/i);
});

test("Seraphine memory theme uses sage ivory and moss, not Aurelia terracotta", () => {
  const theme = resolveMemoryTheme({
    templateSlug: SERAPHINE_LAYOUT_SLUG,
    design: { layout: SERAPHINE_LAYOUT_SLUG },
  });

  assert.equal(theme.id, SERAPHINE_LAYOUT_SLUG);
  assert.equal(theme.colors.surface, "#FAFAF5");
  assert.equal(theme.colors.accent, "#5F7A58");
  assert.equal(theme.colors.surfaceAlt, "#F5F0E4");
});
