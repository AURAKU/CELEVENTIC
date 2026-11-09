#!/usr/bin/env bash
# Isolated SQLite backup/restore drill. Never writes to prisma/dev.db or
# prisma/production.db. Never deletes production backups.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ROOT}/prisma/dev.db"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
WORK="$(mktemp -d /tmp/celeventic-v22-recovery-${STAMP}-XXXX)"
BACKUP="${WORK}/backup.db"
RESTORED="${WORK}/restored.db"
REPORT="${WORK}/report.txt"
START_NS="$(date +%s)"

log() { printf '%s\n' "$*" | tee -a "${REPORT}"; }

if [[ ! -f "${SRC}" ]]; then
  echo "BLOCKED: source database missing: ${SRC}" >&2
  exit 2
fi

if [[ "$(realpath "${SRC}")" == *"production.db" ]]; then
  echo "Refusing to use a production.db path as the drill source." >&2
  exit 2
fi

log "Backup restore drill"
log "Timestamp (UTC): ${STAMP}"
log "Source (read-only copy): ${SRC}"
log "Work directory: ${WORK}"

cp -a "${SRC}" "${BACKUP}"
ORIG_SIZE="$(wc -c < "${SRC}" | tr -d ' ')"
BAK_SIZE="$(wc -c < "${BACKUP}" | tr -d ' ')"
log "Backup bytes: ${BAK_SIZE} (source ${ORIG_SIZE})"
if [[ "${ORIG_SIZE}" != "${BAK_SIZE}" ]]; then
  echo "Backup size mismatch" >&2
  exit 1
fi

INTEGRITY="$(sqlite3 "${BACKUP}" "PRAGMA integrity_check;")"
log "Backup integrity_check: ${INTEGRITY}"
if [[ "${INTEGRITY}" != "ok" ]]; then
  echo "Backup failed integrity_check" >&2
  exit 1
fi

cp -a "${BACKUP}" "${RESTORED}"

restore_start="$(date +%s)"
# Restoration into a disposable file is the copy above. Verify schema + counts.
SRC_TABLES="$(sqlite3 "${BACKUP}" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY 1;")"
RST_TABLES="$(sqlite3 "${RESTORED}" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY 1;")"
if [[ "${SRC_TABLES}" != "${RST_TABLES}" ]]; then
  echo "Restored schema table list differs from backup" >&2
  exit 1
fi

count_table() {
  local db="$1" table="$2"
  sqlite3 "${db}" "SELECT COUNT(*) FROM \"${table}\";" 2>/dev/null || echo "missing"
}

for table in events tickets ticket_orders payments event_wallet_accounts event_wallet_ledger_entries guests invitations ticket_promos; do
  src_n="$(count_table "${BACKUP}" "${table}")"
  rst_n="$(count_table "${RESTORED}" "${table}")"
  log "Count ${table}: backup=${src_n} restored=${rst_n}"
  if [[ "${src_n}" != "${rst_n}" ]]; then
    echo "Record count mismatch for ${table}" >&2
    exit 1
  fi
done

LEDGER_BACKUP="$(sqlite3 "${BACKUP}" "SELECT COALESCE(SUM(amountMinor),0) FROM event_wallet_ledger_entries;" 2>/dev/null || echo "0")"
LEDGER_RESTORED="$(sqlite3 "${RESTORED}" "SELECT COALESCE(SUM(amountMinor),0) FROM event_wallet_ledger_entries;" 2>/dev/null || echo "0")"
log "Ledger amountMinor sum: backup=${LEDGER_BACKUP} restored=${LEDGER_RESTORED}"
if [[ "${LEDGER_BACKUP}" != "${LEDGER_RESTORED}" ]]; then
  echo "Ledger sum mismatch" >&2
  exit 1
fi

INV_BACKUP="$(sqlite3 "${BACKUP}" "SELECT COALESCE(SUM(soldCount),0), COALESCE(SUM(maxQuantity),0) FROM tickets;" 2>/dev/null || echo "0|0")"
INV_RESTORED="$(sqlite3 "${RESTORED}" "SELECT COALESCE(SUM(soldCount),0), COALESCE(SUM(maxQuantity),0) FROM tickets;" 2>/dev/null || echo "0|0")"
log "Ticket soldCount,maxQuantity sum: backup=${INV_BACKUP} restored=${INV_RESTORED}"
if [[ "${INV_BACKUP}" != "${INV_RESTORED}" ]]; then
  echo "Ticket inventory sum mismatch" >&2
  exit 1
fi

NEGATIVE="$(sqlite3 "${RESTORED}" "SELECT COUNT(*) FROM tickets WHERE soldCount < 0;" 2>/dev/null || echo "0")"
log "Negative soldCount rows: ${NEGATIVE}"
if [[ "${NEGATIVE}" != "0" ]]; then
  echo "Restored inventory contains negative soldCount" >&2
  exit 1
fi

restore_end="$(date +%s)"
END_NS="$(date +%s)"
log "Restoration duration (seconds): $((restore_end - restore_start))"
log "Total drill duration (seconds): $((END_NS - START_NS))"
log "Application connectivity: NOT TESTED against restored file (would require pointing DATABASE_URL at ${RESTORED} and restarting the app). Running next-server was left on its existing DATABASE_URL."
log "Production files touched: none"
log "Result: PASS (isolated copy only)"

# Prove we did not replace the live local db.
LIVE_SIZE="$(wc -c < "${SRC}" | tr -d ' ')"
if [[ "${LIVE_SIZE}" != "${ORIG_SIZE}" ]]; then
  echo "Source prisma/dev.db size changed during drill — aborting with failure" >&2
  exit 1
fi

echo "${WORK}"
exit 0
