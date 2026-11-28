# C Week 1 local integration tests

Run with local Supabase (127.0.0.1:54321) and a Next.js dev server on localhost:3000 configured for that **same local DB**. Never use a cloud environment. `.env.local` is required but not committed. Check that shell environment variables and `.env.development.local` do not override the local URL/keys. Run from the repo root in a second terminal:

```powershell
node --env-file=.env.local tests/integration/test-projects.mjs
node --env-file=.env.local tests/integration/test-invites.mjs
node --env-file=.env.local tests/integration/test-drafts.mjs
node --env-file=.env.local tests/integration/test-confirm-frequency.mjs
```

The suites use the existing SDK and create independent temporary accounts and projects. They clean up only their own fixtures by default; use `--keep` on an individual suite to inspect its data. A cleanup error gives a nonzero exit code. No Google OAuth, Claude API, or new dependency is needed. Do not commit local keys, temporary snippets, or generated local data. Vitest/`pnpm check` does not run these tests; invoke them explicitly. These tests cover HTTP, authentication, RLS, RPC permissions, transactions, concurrent joins and confirmations, and C-09 regressions. They do not cover client-side stale-screen edits/votes or D/E end-to-end extraction.
