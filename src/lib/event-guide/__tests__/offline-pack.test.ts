// The pack signing key is normally taken from the deployment secret. Set it
// before the module is exercised so the suite is hermetic.
process.env.EVENT_GUIDE_PACK_SECRET ??= "test-event-guide-pack-secret";

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  OFFLINE_PACK_FORMAT,
  OFFLINE_SEATING_MODE_LABELS,
  OFFLINE_TOKEN_PREFIX,
  assertPackPayloadIsSafe,
  buildOfflineSeatingIndex,
  defaultPackExpiry,
  digestFile,
  findOfflineSeatingEntry,
  hashOfflinePackToken,
  isPackExpired,
  looksLikeOfflinePackToken,
  mintOfflinePackToken,
  seatingIndexKey,
  signManifest,
  verifyManifestSignature,
  verifyOfflinePackToken,
  type OfflinePackManifest,
  type OfflineSeatingSource,
} from "../offline-pack";

const SALT = "salt_for_this_pack";

const SOURCES: OfflineSeatingSource[] = [
  {
    partyName: "The Okafor Family",
    admissionCodes: ["1234 5678"],
    members: ["Chidi Okafor", "Ngozi Okafor"],
    plusOnes: 1,
    table: "12",
    seat: "4",
    zone: "Garden marquee",
    ceremonyRow: "Row C",
    ceremonySeat: "7",
  },
  {
    partyName: "Tunde Adeleke",
    admissionCodes: ["9999 0000"],
    members: ["Tunde Adeleke"],
    plusOnes: 0,
    table: "3",
    seat: "1",
    zone: null,
    ceremonyRow: null,
    ceremonySeat: null,
  },
];

describe("offline pack tokens", () => {
  it("mints an unguessable, self-verifying token", () => {
    const { token } = mintOfflinePackToken();
    assert.ok(token.startsWith(`${OFFLINE_TOKEN_PREFIX}.`));
    assert.equal(looksLikeOfflinePackToken(token), true);
    assert.equal(verifyOfflinePackToken(token), true);
  });

  it("never mints the same token twice", () => {
    const seen = new Set(Array.from({ length: 200 }, () => mintOfflinePackToken().token));
    assert.equal(seen.size, 200);
  });

  it("rejects a token whose signature was tampered with", () => {
    const { token } = mintOfflinePackToken();
    const [prefix, nonce, tag] = token.split(".");
    const forged = `${prefix}.${nonce}.${tag!.slice(0, -1)}${tag!.endsWith("A") ? "B" : "A"}`;
    assert.equal(verifyOfflinePackToken(forged), false);
  });

  it("rejects a token whose nonce was swapped for another pack's", () => {
    const a = mintOfflinePackToken().token.split(".");
    const b = mintOfflinePackToken().token.split(".");
    assert.equal(verifyOfflinePackToken(`${a[0]}.${a[1]}.${b[2]}`), false);
  });

  it("rejects malformed and empty tokens without throwing", () => {
    for (const value of ["", "   ", "egp1", "egp1.short.short", "not-a-token", "cvs1.aaaaaaaaaaaaaaaaaaaaaa.aaaaaaaaaaaaaaaaaaaaaa"]) {
      assert.equal(verifyOfflinePackToken(value), false, value);
    }
  });

  it("stores only a hash of the token, and the hash is stable", () => {
    const { token } = mintOfflinePackToken();
    const hash = hashOfflinePackToken(token);
    assert.equal(hash.length, 64);
    assert.equal(hashOfflinePackToken(` ${token} `), hash, "whitespace must not change the hash");
    assert.ok(!hash.includes(token));
  });
});

describe("seating index privacy", () => {
  it("ships nothing at all when offline seating is off", () => {
    assert.deepEqual(buildOfflineSeatingIndex(SOURCES, "DISABLED", SALT), []);
  });

  it("CODE_ONLY writes no guest names anywhere in the index", () => {
    const index = buildOfflineSeatingIndex(SOURCES, "CODE_ONLY", SALT);
    const json = JSON.stringify(index);
    assert.doesNotMatch(json, /Okafor|Chidi|Ngozi|Tunde|Adeleke/i);
    // Nor the raw admission codes themselves.
    assert.doesNotMatch(json, /12345678|1234 5678|99990000/);
    assert.ok(index.every((entry) => entry.n === undefined && entry.members === undefined));
  });

  it("HASHED_NAME writes no readable names either", () => {
    const index = buildOfflineSeatingIndex(SOURCES, "HASHED_NAME", SALT);
    const json = JSON.stringify(index);
    assert.doesNotMatch(json, /Okafor|Chidi|Ngozi|Tunde|Adeleke/i);
    assert.ok(index.every((entry) => entry.n === undefined && entry.members === undefined));
  });

  it("NAME_INDEX is the only mode that carries readable names", () => {
    const index = buildOfflineSeatingIndex(SOURCES, "NAME_INDEX", SALT);
    assert.match(JSON.stringify(index), /Okafor/);
    assert.ok(index.some((entry) => (entry.members ?? []).includes("Chidi Okafor")));
  });

  it("is honest in the admin about which mode leaks what", () => {
    assert.equal(OFFLINE_SEATING_MODE_LABELS.DISABLED.privacy, "highest");
    assert.equal(OFFLINE_SEATING_MODE_LABELS.CODE_ONLY.privacy, "highest");
    assert.equal(OFFLINE_SEATING_MODE_LABELS.HASHED_NAME.privacy, "high");
    assert.equal(OFFLINE_SEATING_MODE_LABELS.NAME_INDEX.privacy, "reduced");
    assert.match(OFFLINE_SEATING_MODE_LABELS.NAME_INDEX.detail, /guest list/i);
  });

  it("salts its keys so two packs never share a lookup table", () => {
    assert.notEqual(seatingIndexKey("salt_a", "code:12345678"), seatingIndexKey("salt_b", "code:12345678"));

    const a = buildOfflineSeatingIndex(SOURCES, "CODE_ONLY", "salt_a").map((e) => e.k);
    const b = buildOfflineSeatingIndex(SOURCES, "CODE_ONLY", "salt_b").map((e) => e.k);
    assert.deepEqual(
      a.filter((key) => b.includes(key)),
      []
    );
  });

  it("still carries the party size, which reveals nothing identifying", () => {
    const [okafor] = buildOfflineSeatingIndex(SOURCES, "CODE_ONLY", SALT);
    assert.equal(okafor!.size, 3, "two named members plus one unnamed plus-one");
    assert.equal(okafor!.plusOnes, 1);
    assert.equal(okafor!.table, "12");
  });
});

describe("offline seating lookup mirrors the online finder", () => {
  it("finds a party by admission code however the guest types it", () => {
    const index = buildOfflineSeatingIndex(SOURCES, "CODE_ONLY", SALT);
    for (const typed of ["12345678", "1234 5678", "1234-5678"]) {
      const result = findOfflineSeatingEntry(index, "CODE_ONLY", SALT, typed);
      assert.equal(result.status, "ok", typed);
      if (result.status === "ok") assert.equal(result.entry.table, "12");
    }
  });

  it("returns no_match for a wrong code rather than a nearest guess", () => {
    const index = buildOfflineSeatingIndex(SOURCES, "CODE_ONLY", SALT);
    assert.equal(findOfflineSeatingEntry(index, "CODE_ONLY", SALT, "0000 0001").status, "no_match");
    assert.equal(findOfflineSeatingEntry(index, "CODE_ONLY", SALT, "no digits").status, "no_match");
  });

  it("requires an exact name in HASHED_NAME mode", () => {
    const index = buildOfflineSeatingIndex(SOURCES, "HASHED_NAME", SALT);
    assert.equal(findOfflineSeatingEntry(index, "HASHED_NAME", SALT, "Chidi Okafor").status, "ok");
    // Normalisation still applies, so punctuation and case are forgiven.
    assert.equal(findOfflineSeatingEntry(index, "HASHED_NAME", SALT, "  chidi   okafor ").status, "ok");
    // A partial name cannot be matched against a hash — by design.
    assert.equal(findOfflineSeatingEntry(index, "HASHED_NAME", SALT, "Chidi").status, "no_match");
  });

  it("allows partial names only in NAME_INDEX mode", () => {
    const index = buildOfflineSeatingIndex(SOURCES, "NAME_INDEX", SALT);
    const result = findOfflineSeatingEntry(index, "NAME_INDEX", SALT, "Chidi");
    assert.equal(result.status, "ok");
    if (result.status === "ok") assert.equal(result.entry.table, "12");
  });

  it("reports a tie as a count, never as a list", () => {
    const twins: OfflineSeatingSource[] = [
      { ...SOURCES[0]!, partyName: "Emeka Nwosu", members: ["Emeka Nwosu"] },
      { ...SOURCES[1]!, partyName: "Emeka Nwosu", members: ["Emeka Nwosu"] },
    ];
    const index = buildOfflineSeatingIndex(twins, "NAME_INDEX", SALT);
    const result = findOfflineSeatingEntry(index, "NAME_INDEX", SALT, "Emeka Nwosu");
    assert.equal(result.status, "ambiguous");
    if (result.status === "ambiguous") assert.equal(result.matchCount, 2);
  });

  it("finds nobody when seating is disabled, whatever is typed", () => {
    const index = buildOfflineSeatingIndex(SOURCES, "NAME_INDEX", SALT);
    assert.equal(findOfflineSeatingEntry(index, "DISABLED", SALT, "Chidi Okafor").status, "no_match");
  });
});

describe("pack integrity", () => {
  function manifest(over: Partial<OfflinePackManifest> = {}): OfflinePackManifest {
    const base: Omit<OfflinePackManifest, "signature"> = {
      format: OFFLINE_PACK_FORMAT,
      packVersion: 1,
      guideVersion: 4,
      eventTitle: "Chidi & Ngozi",
      tokenPrefix: OFFLINE_TOKEN_PREFIX,
      offlineToken: mintOfflinePackToken().token,
      seatingMode: "CODE_ONLY",
      seatingSalt: SALT,
      issuedAt: "2026-08-01T00:00:00.000Z",
      expiresAt: "2026-08-09T00:00:00.000Z",
      venueWifiName: "Celebration Hall",
      venueLocalUrl: "http://eventguide.local",
      files: [digestFile("guide.json", '{"a":1}'), digestFile("runner.mjs", "console.log(1)")],
    };
    const body: Omit<OfflinePackManifest, "signature"> = { ...base, ...over };
    return { ...body, signature: signManifest(body) };
  }

  it("verifies a manifest it signed itself", () => {
    assert.equal(verifyManifestSignature(manifest()), true);
  });

  it("detects a swapped file inside the pack", () => {
    const tampered = manifest();
    tampered.files[0]!.sha256 = digestFile("guide.json", '{"a":2}').sha256;
    assert.equal(verifyManifestSignature(tampered), false);
  });

  it("detects an added file", () => {
    const tampered = manifest();
    tampered.files.push(digestFile("extra.mjs", "steal()"));
    assert.equal(verifyManifestSignature(tampered), false);
  });

  it("detects a stretched expiry", () => {
    const tampered = manifest();
    tampered.expiresAt = "2099-01-01T00:00:00.000Z";
    assert.equal(verifyManifestSignature(tampered), false);
  });

  it("detects a forged signature without throwing", () => {
    const tampered = manifest();
    tampered.signature = "not-hex";
    assert.equal(verifyManifestSignature(tampered), false);
    tampered.signature = "";
    assert.equal(verifyManifestSignature(tampered), false);
  });

  it("gives a different digest for different content", () => {
    assert.notEqual(digestFile("a.json", "{}").sha256, digestFile("a.json", "{ }").sha256);
    assert.equal(digestFile("a.json", "{}").bytes, 2);
  });
});

describe("pack expiry", () => {
  const now = new Date("2026-08-06T12:00:00Z");

  it("expires a pack once its window has passed", () => {
    assert.equal(isPackExpired({ expiresAt: "2026-08-06T11:59:59Z" }, now), true);
    assert.equal(isPackExpired({ expiresAt: "2026-08-06T12:00:01Z" }, now), false);
  });

  it("treats an unreadable expiry as expired rather than as forever", () => {
    assert.equal(isPackExpired({ expiresAt: "nonsense" }, now), true);
  });

  it("defaults to the event end plus a clean-up window", () => {
    const start = new Date("2026-08-06T12:00:00Z");
    const end = new Date("2026-08-06T23:00:00Z");
    assert.equal(defaultPackExpiry(end, start).toISOString(), "2026-08-08T23:00:00.000Z");
    assert.equal(defaultPackExpiry(null, start).toISOString(), "2026-08-08T12:00:00.000Z");
  });
});

describe("the last-resort payload scan", () => {
  it("accepts a clean guide payload", () => {
    assert.doesNotThrow(() =>
      assertPackPayloadIsSafe({
        header: { eventTitle: "Chidi & Ngozi", venue: "Celebration Hall" },
        programme: [{ id: "p1", time: "2:00 PM", title: "Ceremony" }],
      })
    );
  });

  it("refuses to build a pack containing an email address", () => {
    assert.throws(
      () => assertPackPayloadIsSafe({ header: { welcome: "Reply to hosts@example.com" } }),
      /email address/
    );
  });

  it("refuses to build a pack containing a phone number", () => {
    assert.throws(
      () => assertPackPayloadIsSafe({ header: { welcome: "Call +234 803 555 0199" } }),
      /phone number/
    );
  });

  it("refuses to build a pack containing an access token", () => {
    assert.throws(
      () => assertPackPayloadIsSafe({ note: `${mintOfflinePackToken().token}` }),
      /access token/
    );
  });

  it("refuses to build a pack containing database identifiers", () => {
    assert.throws(() => assertPackPayloadIsSafe({ eventId: "evt_123" }), /database identifier/);
    assert.throws(() => assertPackPayloadIsSafe({ items: [{ guestId: "g_1" }] }), /database identifier/);
  });

  it("names every problem it found, not just the first", () => {
    assert.throws(
      () => assertPackPayloadIsSafe({ eventId: "evt_1", contact: "hosts@example.com" }),
      /email address[\s\S]*database identifier/
    );
  });
});
