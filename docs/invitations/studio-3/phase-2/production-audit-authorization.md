# Phase 2 — Production Usage Audit Authorization

**Status:** BLOCKED pending explicit authorization  
**Mode:** Read-only SQLite queries only  
**Script:** `docs/invitations/studio-3/phase-2/production-usage-audit.sql`

## Why authorization is required

Production databases contain guest invitation links, event records, and related operational data. Even aggregate queries must be run only by an authorized operator on an approved connection.

## What this audit needs

| Item | Requirement |
|---|---|
| Environment | Production (or production replica) Celeventic SQLite used by live invites |
| Access | SSH / ops access to Hostinger VPS path historically used (`/var/www/CELEVENTIC` or current deploy root) **or** a read-only DB copy |
| Privileges | File read + `sqlite3` CLI (or Prisma `$queryRaw` in a one-off **read-only** script) |
| Network | No requirement to open public DB ports |
| PII | Aggregates by `templateSlug` / `layout` / status only — no guest names, phones, emails, or unique links in exports |

## Explicitly forbidden

- `UPDATE` / `DELETE` / `INSERT` / `DROP` / `ALTER` / `VACUUM INTO` that rewrites live files carelessly  
- Changing event/invitation status  
- Exporting guest PII  
- Classifying ELIGIBLE from local `prisma/dev.db` alone  
- Bypassing credentials or using unauthorized tokens  

## Suggested authorized execution (operator runbook)

```bash
# On the production host, after approval:
cd /var/www/CELEVENTIC   # or current app root
# Prefer a filesystem snapshot / copy if available:
sqlite3 -readonly prisma/production.db < docs/invitations/studio-3/phase-2/production-usage-audit.sql \
  | tee /tmp/ix3-prod-usage-audit-$(date +%Y%m%d).txt
```

If the live file name differs, resolve the actual SQLite path from the running app’s `DATABASE_URL` **without modifying it**.

Confirm read-only:

```bash
sqlite3 -readonly "$DB_PATH" "PRAGMA query_only; SELECT 1;"
```

## Authorization checklist (must all be yes)

1. [ ] Product/engineering owner explicitly authorizes this read-only audit  
2. [ ] Operator identity recorded (who ran it, when, which host/path)  
3. [ ] Output limited to aggregate template/layout/status counts  
4. [ ] No writes performed (verified)  
5. [ ] Results attached to Phase 2 follow-up; ELIGIBLE reclassification only with full evidence set  

## Current session

- Local workspace: **no production `.env` / no authorized production session detected**  
- Therefore: **audit not executed in this Phase 2 pass**  
- Eligibility remains: catalogue **ELIGIBLE = 0**; UNKNOWN stays protected  
