# Celeventic private GitHub setup

Date: 7 Nov 2026  
Status: local nested git exists at `CELEVENTIC-main/.git`. No remote. Push is not authorized.

## Current facts

- Parent Documents repository ignores `Aura Group Innovative/`.
- `CELEVENTIC-main` now has its own `.git` directory on branch `main` with no commits until you explicitly ask for one.
- `.gitignore` excludes env files, Prisma databases, keys, logs, uploads, and build output.

## Recommended private remote (after written approval)

1. Create a **private** GitHub repository. Do not make it public.
2. Do not force-push. Do not rewrite unrelated history.
3. First commit only after a human reviews `git status` and confirms no secrets.
4. Add the remote: `git remote add origin git@github.com:<org>/celeventic.git`
5. Push: `git push -u origin main`
6. GitHub Actions will then run `.github/workflows/ci.yml` (Prisma validate, typecheck, gift tests, integrity, admission, lint).

## CI notes

Set repository secrets only if a job needs them. The current workflow uses a dummy `DATABASE_URL=file:./prisma/ci.db` and must not receive production keys.
