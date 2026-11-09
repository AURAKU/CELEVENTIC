# Celeventic git workflow

Date: 7 Nov 2026  
Status: local repository prepared. No remote. No force-push. No credentials committed.

## Why this tree needed its own git

`CELEVENTIC-main` sits under `/Users/auratheking/Documents/Aura Group Innovative/`, which is gitignored by the parent Documents repository. Commits made from Documents never captured this product. The apparent git root was therefore not Celeventic.

## What is safe

1. A nested git repository inside `CELEVENTIC-main` is the correct isolation. The parent ignore rule keeps Documents from tracking it.
2. Keep the existing working tree. Do not `git reset --hard`. Do not force-push. Do not publish `.env`, `.env.local`, or `prisma/*.db`.
3. Do not create a GitHub/Origin remote until Aura explicitly authorizes one.

## Recommended commands (after authorization)

```bash
cd "/Users/auratheking/Documents/Aura Group Innovative/Celeventic/CELEVENTIC-main"
git status
# Review, then commit only source. Never add secrets or databases.
# git remote add origin <authorized-url>
# git push -u origin main
```

CI in `.github/workflows/ci.yml` will not run on GitHub until that remote exists.

## Ignore rules that must stay

- `.env`, `.env*.local`
- `prisma/*.db`, `prisma/*.db-journal`, `prisma/*.db-wal`, `prisma/*.db-shm`
- `.next/`, `node_modules/`, `public/uploads/**` (except `.gitkeep`)
- `.backups/` (contains live invitation tokens)

## Initial commit plan (not executed)

The nested repository has **no commits** and **no remote**. After authorization, the first commit should add source only:

- Include: `src/`, `prisma/` (schema + migrations, not `*.db`), `scripts/`, `docs/`, `.github/`, `package.json`, lockfile, Next/TS/ESLint config, `.env.example`, `.gitignore`
- Exclude: `.env`, `.env.local`, `prisma/*.db`, `.next/`, `.next-verify/`, `node_modules/`, `public/uploads/**`, credentials

Do not `git add -A` without reviewing. Do not push.

## Current authorization

Creating a public or private remote, pushing, or connecting GitHub Actions is **not authorized** in this phase.
