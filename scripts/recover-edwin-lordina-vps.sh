#!/usr/bin/env bash
# Surgical Edwin & Lordina recovery on the Hostinger VPS.
# Run ON the VPS inside /var/www/CELEVENTIC.
#
#   bash scripts/recover-edwin-lordina-vps.sh
#   bash scripts/recover-edwin-lordina-vps.sh --apply
#
# Never restores the whole database. Never prisma db push / migrate reset.
# Never pm2 restart. Never deletes backups. Never touches Spark & Drive.

set -euo pipefail

APP_DIR="${CELEVENTIC_APP_DIR:-/var/www/CELEVENTIC}"
DB_PATH="${DB_PATH:-prisma/production.db}"
BACKUP_ROOT="${BACKUP_ROOT:-/root/celeventic-deploy-backups}"
EVENT_ID="cmuvhuhud00rzlav5d5oymjb6"
INVITE_TOKEN="ihJPaMQxfFCRK21YPJwgGvhxFzqqP7oK"
INVITE_PATH="edwin-and-lordina"
APPLY=0
for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=1 ;;
  esac
done

log() { printf '[edwin-recover] %s\n' "$*"; }
die() { printf '[edwin-recover] ERROR: %s\n' "$*" >&2; exit 1; }

cd "$APP_DIR"
[[ -f package.json ]] || die "package.json not found in ${APP_DIR}"
[[ -f "$DB_PATH" ]] || die "production database not found: ${DB_PATH}"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
export DATABASE_URL="${DATABASE_URL:-file:./prisma/production.db}"

inspect_db() {
  local db="$1"
  sqlite3 "$db" "PRAGMA query_only=ON;
    SELECT 'events=' || COUNT(*) FROM events WHERE id='${EVENT_ID}' OR slug='${INVITE_PATH}' OR title='Edwin & Lordina';
    SELECT 'invites=' || COUNT(*) FROM invitations WHERE uniqueLink IN ('${INVITE_PATH}','${INVITE_TOKEN}') OR id='cmuvhvi4m00t2lav5i3ba7373' OR name LIKE '%Edwin%Lordina%';
    SELECT 'guests=' || COUNT(*) FROM guests WHERE eventId='${EVENT_ID}';
    SELECT 'orders=' || COUNT(*) FROM invitation_orders WHERE coupleName1 LIKE '%Edwin%' OR coupleName2 LIKE '%Lordina%' OR eventTitle LIKE '%Edwin%' OR eventId='${EVENT_ID}';
  "
}

log "Inspecting live database (read-only)"
inspect_db "$DB_PATH"

NEWEST_BACKUP=""
if [[ -d "$BACKUP_ROOT" ]]; then
  log "Scanning ${BACKUP_ROOT} newest first"
  while IFS= read -r candidate; do
    [[ -f "$candidate" ]] || continue
    hits="$(sqlite3 "$candidate" "SELECT COUNT(*) FROM events WHERE id='${EVENT_ID}' OR slug='${INVITE_PATH}' OR title='Edwin & Lordina';" 2>/dev/null || echo 0)"
    log "backup $(basename "$(dirname "$candidate")") events=${hits}"
    if [[ "$hits" != "0" && -z "$NEWEST_BACKUP" ]]; then
      NEWEST_BACKUP="$candidate"
    fi
  done < <(find "$BACKUP_ROOT" -name production.db -type f -print0 | xargs -0 ls -1t 2>/dev/null || true)
else
  log "No backup root at ${BACKUP_ROOT}"
fi

if [[ -n "$NEWEST_BACKUP" ]]; then
  log "Newest backup containing Edwin: ${NEWEST_BACKUP}"
else
  log "No backup contained the Edwin event. Fixture reconstruction will restore the invitation URLs and design, not production RSVP/QR/gift rows."
fi

if [[ "$APPLY" -ne 1 ]]; then
  log "Dry run only. Re-run with --apply to write."
  exit 0
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
SAFETY="${BACKUP_ROOT}/pre-edwin-restore-${STAMP}"
mkdir -p "$SAFETY"
sqlite3 "$DB_PATH" ".backup '${SAFETY}/production.db'"
log "Safety copy written to ${SAFETY}/production.db"

if [[ -n "$NEWEST_BACKUP" ]]; then
  python3 - "$NEWEST_BACKUP" "$DB_PATH" "$EVENT_ID" "$INVITE_PATH" <<'PY'
import sqlite3, sys
backup, live, event_id, slug = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
src = sqlite3.connect(f"file:{backup}?mode=ro", uri=True)
src.row_factory = sqlite3.Row
dst = sqlite3.connect(live)
dst.execute("PRAGMA foreign_keys=ON")
dst.execute("PRAGMA busy_timeout=15000")
event_ids = [row["id"] for row in src.execute(
    "SELECT id FROM events WHERE id=? OR slug=? OR title='Edwin & Lordina'",
    (event_id, slug),
)]
if not event_ids:
    raise SystemExit("backup no longer contains the event")
placeholders = ",".join("?" * len(event_ids))
invite_ids = [row["id"] for row in src.execute(
    f"SELECT id FROM invitations WHERE eventId IN ({placeholders})", event_ids
)]
guest_ids = [row["id"] for row in src.execute(
    f"SELECT id FROM guests WHERE eventId IN ({placeholders})", event_ids
)] if src.execute("SELECT name FROM sqlite_master WHERE name='guests'").fetchone() else []

def copy(table, where, params):
    exists = src.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone()
    if not exists:
        return 0
    cols = [row[1] for row in src.execute(f"PRAGMA table_info({table})")]
    col_sql = ",".join(f'"{c}"' for c in cols)
    rows = src.execute(f"SELECT {col_sql} FROM {table} WHERE {where}", params).fetchall()
    if not rows:
        return 0
    q = ",".join("?" * len(cols))
    cur = dst.executemany(f'INSERT OR IGNORE INTO {table} ({col_sql}) VALUES ({q})', [tuple(r) for r in rows])
    return cur.rowcount if cur.rowcount and cur.rowcount > 0 else 0

copied = {}
copied["events"] = copy("events", f"id IN ({placeholders})", event_ids)
tables = [row[0] for row in src.execute("SELECT name FROM sqlite_master WHERE type='table'")]
for table in tables:
    if table in {"events", "sqlite_sequence"}:
        continue
    cols = [row[1] for row in src.execute(f"PRAGMA table_info({table})")]
    if "eventId" in cols:
        copied[table] = copy(table, f"eventId IN ({placeholders})", event_ids)
    elif invite_ids and "invitationId" in cols:
        marks = ",".join("?" * len(invite_ids))
        copied[table] = copy(table, f"invitationId IN ({marks})", invite_ids)
    elif guest_ids and "guestId" in cols:
        marks = ",".join("?" * len(guest_ids))
        copied[table] = copy(table, f"guestId IN ({marks})", guest_ids)
dst.commit()
print("copied", {k: v for k, v in copied.items() if v})
src.close()
dst.close()
PY
  log "Backup rows merged with INSERT OR IGNORE"
fi

if [[ -f src/lib/invitation/recover-edwin-lordina.ts && -f scripts/recover-edwin-lordina-event.ts ]]; then
  npx tsx scripts/recover-edwin-lordina-event.ts --apply
else
  log "Recover module not on this checkout. Using live seed + published-design fallback."
  cat > /tmp/recover-edwin-inline.ts <<'TS'
import { readFileSync } from "node:fs";
import { prisma } from "./src/lib/prisma";
import { applyEdwinPublishedDesign } from "./src/lib/invitation/edwin-published-design";
import {
  EDWIN_PUBLIC_INVITE_PATH,
  EDWIN_PUBLISHED_INVITE_LINK,
} from "./src/lib/invitation/public-invite-alias";

const EVENT_ID = "cmuvhuhud00rzlav5d5oymjb6";
const INVITE_ID = "cmuvhvi4m00t2lav5i3ba7373";
const ORGANIZER_ID = "cmrhu1d9g0000lan2wpp6n6cp";
const TITLE = "Edwin & Lordina";
const HERO = "/templates/edwin-lordina/hero-navy.jpg";
const DESCRIPTION =
  "Together with their families, Edwin and Lordina invite you to celebrate a love written by God. Traditional 24 December, white wedding and reception 26 December 2026.";

async function main() {
  const organizer =
    (await prisma.user.findUnique({ where: { id: ORGANIZER_ID } })) ??
    (await prisma.user.findFirst({ where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } } }));
  if (!organizer) throw new Error("No organizer exists to own the recovered event.");

  const design = JSON.parse(
    readFileSync("scripts/fixtures/edwin-lordina-design.json", "utf8")
  ) as Record<string, unknown>;

  let event =
    (await prisma.event.findUnique({ where: { id: EVENT_ID } })) ??
    (await prisma.event.findUnique({ where: { slug: EDWIN_PUBLIC_INVITE_PATH } }));

  const eventData = {
    slug: EDWIN_PUBLIC_INVITE_PATH,
    title: TITLE,
    eventType: "WEDDING" as const,
    hostName: TITLE,
    description: DESCRIPTION,
    startDate: new Date("2026-12-24T09:00:00.000Z"),
    endDate: new Date("2026-12-26T16:00:00.000Z"),
    venueName: "Assemblies of God Tema Community 12 TCC",
    landmark: "Tema Community 12",
    mapsLink:
      "https://www.google.com/maps/place/Assemblies+of+God+Ghana+Tema+Christian+Centre/@5.670683,-0.03132,17z",
    contactPhone: "+233243942142",
    dressCode: "Ivory, champagne gold, and navy blue",
    coverImageUrl: HERO,
    qrCenterImageUrl: HERO,
    qrLogoSize: "bold",
    city: "Tema",
    region: "Greater Accra",
    country: "GH",
    isPublic: true,
    status: "PUBLISHED" as const,
    organizerId: organizer.id,
    pricingType: "FREE" as const,
  };

  event = event
    ? await prisma.event.update({ where: { id: event.id }, data: eventData })
    : await prisma.event.create({
        data: {
          id: EVENT_ID,
          ...eventData,
          createdAt: new Date("2026-10-05T16:58:27.938Z"),
        },
      });

  let invitation =
    (await prisma.invitation.findUnique({ where: { id: INVITE_ID } })) ??
    (await prisma.invitation.findUnique({ where: { uniqueLink: EDWIN_PUBLISHED_INVITE_LINK } })) ??
    (await prisma.invitation.findUnique({ where: { uniqueLink: EDWIN_PUBLIC_INVITE_PATH } })) ??
    (await prisma.invitation.findFirst({ where: { eventId: event.id }, orderBy: { createdAt: "asc" } }));

  const invitationData = {
    eventId: event.id,
    name: TITLE,
    slug: EDWIN_PUBLIC_INVITE_PATH,
    message: DESCRIPTION,
    designConfig: design,
    uniqueLink: EDWIN_PUBLISHED_INVITE_LINK,
    status: "ACTIVE" as const,
    postAdmissionEnabled: true,
    archivedAt: null,
  };

  invitation = invitation
    ? await prisma.invitation.update({ where: { id: invitation.id }, data: invitationData })
    : await prisma.invitation.create({
        data: {
          id: INVITE_ID,
          ...invitationData,
          createdAt: new Date("2026-10-05T16:58:27.938Z"),
        },
      });

  const designResult = await applyEdwinPublishedDesign(EDWIN_PUBLISHED_INVITE_LINK, prisma);
  console.log(
    JSON.stringify(
      {
        restored: true,
        eventId: event.id,
        invitationId: invitation.id,
        uniqueLink: invitation.uniqueLink,
        designChanged: designResult.changed,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
TS
  cp /tmp/recover-edwin-inline.ts "$APP_DIR/recover-edwin-inline.ts"
  npx tsx recover-edwin-inline.ts
  rm -f "$APP_DIR/recover-edwin-inline.ts"
fi

log "Live inspect after restore"
inspect_db "$DB_PATH"
log "Done. Verify https://www.celeventic.com/invite/edwin-and-lordina"
log "Rollback copy: ${SAFETY}/production.db"
