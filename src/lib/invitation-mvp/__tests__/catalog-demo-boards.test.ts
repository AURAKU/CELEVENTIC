import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildLivePreviewProps } from "../demo-preview-data";
import {
  buildCatalogDemoWeddingBoard,
  catalogDemoLeaksClientIdentity,
} from "../catalog-demo-boards";
import { mergeWeddingBoard } from "@/lib/invitation/wedding-board";
import { mergeVisionBoard } from "@/lib/invitation/vision-board";

describe("catalogue browse uses fictional sample identity", () => {
  it("Forever Afaris preview never leaks client couple or RSVP details", () => {
    const preview = buildLivePreviewProps("forever-afaris-wedding", "Wedding", {
      catalogSlug: "forever-afaris-wedding",
    });
    const board = mergeWeddingBoard(
      (preview.design.studio as { weddingBoard?: Parameters<typeof mergeWeddingBoard>[0] } | undefined)
        ?.weddingBoard
    );
    const blob = JSON.stringify({ board, event: preview.event, message: preview.message });

    assert.equal(catalogDemoLeaksClientIdentity(blob), false);
    assert.match(board.sealMonogram, /^[A-Z] \| [A-Z]$/);
    assert.notEqual(board.sealMonogram, "J | C");
    assert.equal(/jeffery|afari/i.test(board.coupleName1), false);
    assert.equal(/francisca|opoku/i.test(board.coupleName2), false);
    assert.ok(board.rsvpContacts.every((c) => !/yeboah|0242651828|242\s*651/i.test(`${c.name} ${c.phone}`)));
  });

  it("Traditional Marriage preview never leaks client ceremony copy", () => {
    const preview = buildLivePreviewProps("traditional-marriage-ceremony", "Wedding", {
      catalogSlug: "traditional-marriage-ceremony",
    });
    const board = mergeVisionBoard(
      (preview.design.studio as { visionBoard?: Parameters<typeof mergeVisionBoard>[0] } | undefined)
        ?.visionBoard
    );
    const blob = JSON.stringify(board);

    assert.equal(catalogDemoLeaksClientIdentity(blob), false);
    assert.notEqual(board.sealInitials, "C | J");
    assert.equal(/jeffery|afari/i.test(board.coupleName1), false);
    assert.equal(/forever\s*afaris/i.test(board.hashtag ?? ""), false);
  });

  it("demo wedding board monogram follows sample host names", () => {
    const board = buildCatalogDemoWeddingBoard(
      {
        title: "The Wedding of Amara & Kwame",
        hostName: "Amara Mensah & Kwame Osei",
        message: "Sample message",
        venueName: "Royal Palm Events Centre",
        landmark: "East Legon, Accra",
      },
      "2027-06-14T16:00:00.000Z"
    );

    assert.equal(board.sealMonogram, "A | K");
    assert.equal(board.coupleName1, "AMARA MENSAH");
    assert.equal(board.coupleName2, "KWAME OSEI");
    assert.equal(board.closingSignature, "Amara & Kwame");
  });

  it("funeral catalogue envelopes use unique wax seals + emblems, never wedding C | J", () => {
    const expectedEmblem: Record<string, string> = {
      "memorial-candle-tribute": "✝",
      "black-red-cloth-rite": "✦",
      "white-cloth-homegoing": "✧",
      "kente-border-farewell": "★",
      "one-week-vigil-notice": "☽",
    };
    const expectedDesign = new Set<string>();

    for (const [slug, emblem] of Object.entries(expectedEmblem)) {
      const preview = buildLivePreviewProps("memorial-candle-tribute", "Funeral", {
        catalogSlug: slug,
      });
      const board = mergeVisionBoard(
        (preview.design.studio as { visionBoard?: Parameters<typeof mergeVisionBoard>[0] } | undefined)
          ?.visionBoard
      );
      assert.equal(board.sealEmblem, emblem, `${slug} emblem`);
      assert.equal(board.sealInitials, "", `${slug} must not use couple initials`);
      assert.notEqual(board.sealDesign, "classic-peach-pearl");
      assert.ok(board.sealDesign, `${slug} seal design`);
      expectedDesign.add(String(board.sealDesign));
      assert.equal(catalogDemoLeaksClientIdentity(JSON.stringify(board)), false);
      assert.match(board.eyebrow ?? "", /MEMORY|RITES|HOMEGOING|NOTICE|MEMORIAM/i);
    }

    assert.equal(
      expectedDesign.size,
      Object.keys(expectedEmblem).length,
      "funeral wax seal designs must be unique per browse SKU"
    );
  });
});
