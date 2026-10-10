import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ceremonyDesignSnapshot,
  pickPublishedCeremonyInvitation,
} from "@/services/invitations/personalised-invitation";

const edwinDesign = {
  layout: "forever-afaris-wedding",
  _revisions: [{ savedAt: "yesterday" }],
  studio: { weddingBoard: { coupleName1: "Edwin" } },
};

describe("published ceremony design", () => {
  it("uses the couple invitation and ignores personal guest invitations", () => {
    const picked = pickPublishedCeremonyInvitation("Edwin & Lordina", "Edwin & Lordina", [
      {
        name: "Ama Mensah",
        designConfig: { layout: "classic" },
        updatedAt: "2026-10-10T18:00:00.000Z",
      },
      {
        name: "Edwin & Lordina",
        designConfig: edwinDesign,
        updatedAt: "2026-10-01T00:00:00.000Z",
      },
    ]);
    assert.equal(picked?.name, "Edwin & Lordina");
  });

  it("drops studio revision history from the guest copy", () => {
    const snapshot = ceremonyDesignSnapshot(edwinDesign) as {
      layout: string;
      _revisions?: unknown;
    };
    assert.equal(snapshot.layout, "forever-afaris-wedding");
    assert.equal(snapshot._revisions, undefined);
  });
});
