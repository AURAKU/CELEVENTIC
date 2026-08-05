#!/usr/bin/env tsx
/**
 * Audit `Invitation.uniqueLink` values for transport damage.
 *
 * The parity incident left rows whose stored token carries characters a guest's
 * link will never contain — a trailing space from a spreadsheet import, a
 * zero-width character from a rich-text paste, a whole `https://…/invite/…` URL
 * pasted into the field. Those invitations can *never* be opened: the guest
 * sends the clean token, the row holds a dirty one, and no amount of lookup
 * normalisation on the request side can fix a broken row.
 *
 * This script finds them. By default it changes nothing.
 *
 *   npm run audit:invitation-links                 # read-only report
 *   npm run audit:invitation-links -- --json       # machine-readable
 *   npm run audit:invitation-links -- --repair     # fix whitespace only
 *
 * Safety rules, all enforced below rather than documented and hoped for:
 *
 *   1. Dry-run is the default. `--repair` is required to write anything.
 *   2. Full tokens are never printed. A token is a bearer credential; an audit
 *      log is not a place to store one.
 *   3. Repair only ever touches *unambiguous whitespace* damage — leading or
 *      trailing whitespace, and invisible characters. Anything else (a pasted
 *      URL, a case collision, a token that would collide with an existing row)
 *      is reported for a human and left alone.
 *   4. Every repair run writes a JSON backup + manifest before touching the
 *      database, and runs inside a single transaction that rolls back whole.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { normalizeInviteLink } from "../src/lib/invitation/invite-link";

const prisma = new PrismaClient();

const argv = process.argv.slice(2);
const REPAIR = argv.includes("--repair");
const AS_JSON = argv.includes("--json");
const BACKUP_DIR = join(process.cwd(), ".backups", "invitation-links");

/* ---------------------------------------------------------------- redaction */

/**
 * Enough to find the row again via the id, never enough to open the invitation.
 * Whitespace is rendered as visible escapes because that is the entire finding.
 */
function redact(token: string): string {
  if (!token) return "(empty)";
  const visible = token
    .replace(/ /g, "␠")
    .replace(/\t/g, "⇥")
    .replace(/\n/g, "⏎")
    .replace(/\r/g, "␍")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "␀")
    .replace(/[\u00A0\u2007\u202F]/g, "␣");
  const head = visible.slice(0, 4);
  const tail = visible.length > 8 ? visible.slice(-2) : "";
  return `${head}…${tail} (${token.length}ch)`;
}

/** Which characters make this token non-canonical, described without leaking it. */
function describeDamage(raw: string): string[] {
  const notes: string[] = [];
  if (/^\s|\s$/.test(raw)) notes.push("surrounding whitespace");
  if (/[\u200B-\u200D\u2060\uFEFF]/.test(raw)) notes.push("zero-width characters");
  if (/[\u00A0\u2007\u202F]/.test(raw)) notes.push("non-breaking space");
  if (/\s/.test(raw.trim())) notes.push("internal whitespace");
  if (raw.includes("/")) notes.push("contains a path or URL");
  if (raw.includes("%")) notes.push("percent-encoded");
  if (/^[<("'«“]|[>)"'»”]$/.test(raw)) notes.push("wrapped in brackets or quotes");
  if (/[.,;:!?]$/.test(raw)) notes.push("trailing sentence punctuation");
  return notes;
}

/**
 * Whitespace-only damage is the single class we are willing to repair without a
 * human: removing it is information-preserving and the result is provably the
 * token the guest already has. Everything else changes what the token *means*.
 */
function isWhitespaceOnlyDamage(raw: string, canonical: string): boolean {
  if (!canonical) return false;
  const stripped = raw
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/[\u00A0\u2007\u202F]/g, " ")
    .replace(/\s+/g, "");
  return stripped === canonical;
}

/* ------------------------------------------------------------------- finding */

type Severity = "repairable" | "needs-review";

interface Finding {
  id: string;
  eventId: string | null;
  status: string;
  redactedStored: string;
  redactedCanonical: string;
  damage: string[];
  severity: Severity;
  blockedBy?: string;
}

async function main() {
  const rows = await prisma.invitation.findMany({
    select: { id: true, uniqueLink: true, eventId: true, status: true },
  });

  // Case-insensitive collisions matter on Postgres (citext / lowered indexes)
  // and matter for any future case-tolerant lookup. Detect, never auto-fix.
  const byLower = new Map<string, string[]>();
  for (const row of rows) {
    const key = row.uniqueLink.trim().toLowerCase();
    byLower.set(key, [...(byLower.get(key) ?? []), row.id]);
  }
  const collisions = [...byLower.entries()].filter(([, ids]) => ids.length > 1);

  const exact = new Set(rows.map((r) => r.uniqueLink));
  const findings: Finding[] = [];

  for (const row of rows) {
    const stored = row.uniqueLink;
    const canonical = normalizeInviteLink(stored);
    if (stored === canonical) continue;

    let severity: Severity = "needs-review";
    let blockedBy: string | undefined;

    if (!canonical) {
      blockedBy = "normalises to an empty token";
    } else if (!isWhitespaceOnlyDamage(stored, canonical)) {
      blockedBy = "damage is not whitespace-only";
    } else if (exact.has(canonical)) {
      // Repairing would create a duplicate `uniqueLink`.
      blockedBy = "canonical form already belongs to another invitation";
    } else {
      severity = "repairable";
    }

    findings.push({
      id: row.id,
      eventId: row.eventId,
      status: row.status,
      redactedStored: redact(stored),
      redactedCanonical: redact(canonical),
      damage: describeDamage(stored),
      severity,
      blockedBy,
    });
  }

  const repairable = findings.filter((f) => f.severity === "repairable");
  const review = findings.filter((f) => f.severity === "needs-review");

  if (AS_JSON) {
    console.log(
      JSON.stringify(
        {
          scanned: rows.length,
          repairable: repairable.length,
          needsReview: review.length,
          caseInsensitiveCollisions: collisions.length,
          mode: REPAIR ? "repair" : "dry-run",
          findings,
        },
        null,
        2
      )
    );
  } else {
    console.log(`\nInvitation link audit — ${REPAIR ? "REPAIR" : "DRY RUN (no writes)"}`);
    console.log(`scanned ${rows.length} invitations\n`);

    if (findings.length === 0) {
      console.log("Every stored uniqueLink is already canonical.");
    } else {
      console.log(`repairable (whitespace only): ${repairable.length}`);
      for (const f of repairable) {
        console.log(`  ${f.id}  ${f.redactedStored} → ${f.redactedCanonical}`);
        console.log(`      ${f.damage.join(", ")}`);
      }
      console.log(`\nneeds human review: ${review.length}`);
      for (const f of review) {
        console.log(`  ${f.id}  ${f.redactedStored}  [${f.status}]`);
        console.log(`      ${f.damage.join(", ")} — ${f.blockedBy}`);
      }
    }

    if (collisions.length > 0) {
      console.log(`\ncase-insensitive collisions: ${collisions.length}`);
      console.log("  These tokens differ only by case. A case-tolerant lookup");
      console.log("  must refuse to guess between them (the resolver does).");
      for (const [, ids] of collisions.slice(0, 20)) {
        console.log(`  ${ids.join(" ↔ ")}`);
      }
    }
  }

  if (!REPAIR) {
    if (!AS_JSON && repairable.length > 0) {
      console.log("\nRe-run with --repair to fix the whitespace-only rows above.");
      console.log("A JSON backup and manifest are written before any write.");
    }
    return;
  }

  if (repairable.length === 0) {
    if (!AS_JSON) console.log("\nNothing to repair.");
    return;
  }

  /* ------------------------------------------------------------ backup first */

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  mkdirSync(BACKUP_DIR, { recursive: true });
  const backupPath = join(BACKUP_DIR, `${stamp}-backup.json`);
  const manifestPath = join(BACKUP_DIR, `${stamp}-manifest.json`);

  // The backup is the only way to undo this, so it holds the real values and
  // therefore never goes near stdout. `.backups/` must stay out of git.
  const backup = await prisma.invitation.findMany({
    where: { id: { in: repairable.map((f) => f.id) } },
    select: { id: true, uniqueLink: true, eventId: true },
  });
  const plan = backup.map((row) => ({
    id: row.id,
    from: row.uniqueLink,
    to: normalizeInviteLink(row.uniqueLink),
  }));
  writeFileSync(backupPath, JSON.stringify({ takenAt: stamp, rows: backup, plan }, null, 2));

  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        takenAt: stamp,
        mode: "repair",
        scanned: rows.length,
        repairing: repairable.length,
        skipped: review.length,
        backup: backupPath,
        // Redacted mirror of the plan, safe to attach to a ticket.
        changes: repairable.map((f) => ({
          id: f.id,
          from: f.redactedStored,
          to: f.redactedCanonical,
          damage: f.damage,
        })),
      },
      null,
      2
    )
  );

  console.log(`\nbackup:   ${backupPath}`);
  console.log(`manifest: ${manifestPath}`);

  /* --------------------------------------------------- one atomic transaction */

  try {
    await prisma.$transaction(async (tx) => {
      for (const change of plan) {
        // Re-check inside the transaction: another writer may have taken the
        // canonical token since the scan.
        const taken = await tx.invitation.findUnique({
          where: { uniqueLink: change.to },
          select: { id: true },
        });
        if (taken && taken.id !== change.id) {
          throw new Error(
            `aborting: canonical token for ${change.id} is already held by ${taken.id}`
          );
        }
        await tx.invitation.update({
          where: { id: change.id },
          data: { uniqueLink: change.to },
        });
      }
    });
    console.log(`\nrepaired ${plan.length} invitation link(s).`);
    console.log(`skipped ${review.length} row(s) needing human review.`);
  } catch (err) {
    console.error(`\nrepair rolled back — no rows were changed.`);
    console.error(String(err instanceof Error ? err.message : err));
    console.error(`restore reference: ${backupPath}`);
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(String(err instanceof Error ? err.stack : err));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
