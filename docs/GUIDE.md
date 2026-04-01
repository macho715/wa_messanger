# Developer and operator guide

Aligned with root [`README.md`](../README.md) and [`RUN-GUIDE.md`](../RUN-GUIDE.md) (release bundle). Commands below are verified from `package.json`.

## Prerequisites

- **Node.js** 20+ (RUN-GUIDE mentions 20+ for standalone)
- **pnpm** (lockfile present in repo)

## Quickstart (development tree)

```bash
pnpm install
cp .env.example .env.local   # fill Supabase + webhook secrets
pnpm dev
```

Open `http://127.0.0.1:3006` (port from `pnpm dev` script).

### Required env for Work Board UI

The board client calls `createBrowserSupabase()` which **requires**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

If either is missing, `WorkBoardTable` catches the error and surfaces it in the UI (`components/board/WorkBoardTable.tsx`); it does not silently use in-memory data.

Server-side webhook and admin writes additionally need `SUPABASE_SERVICE_ROLE_KEY` and webhook signing secret(s) as in `.env.example`.

### Database

Apply migrations under `supabase/migrations/` to your Supabase project in order (`0001` → `0004`). Without migrations, queries and Realtime will fail at runtime.

## Verification commands

```bash
pnpm typecheck
pnpm test
pnpm exec playwright install chromium   # first time only
pnpm test:e2e
pnpm build
```

Playwright tests stub `GET **/rest/v1/work_item**` so smoke can pass **without** a migrated DB; the client still needs `NEXT_PUBLIC_*` for the app to build valid Supabase URLs.

## Operational notes

- **Webhook URL (dev):** `POST http://<host>:3006/api/webhooks/waha` — see `app/api/webhooks/waha/route.ts` for signature and body handling.
- **Standalone zip:** After `pnpm build`, `pnpm package:standalone` produces a runnable bundle (see README Packaging).

## Debugging

| Symptom | Check |
|--------|--------|
| Board shows env error | `.env.local` has both `NEXT_PUBLIC_SUPABASE_*` |
| Empty board, no error | Table empty or RLS blocks anon read; confirm data and policies |
| Webhook 401/invalid signature | `WA_WEBHOOK_SECRET` / header name matches sender |
| E2E fails on Supabase | Run with stubs as designed; for full integration E2E you need a test project + migrations (optional) |

## FAQ

- **Where is implementation status (UI/QA)?** [`implementation/2026-04-01-work-board-ui-qa-status.md`](implementation/2026-04-01-work-board-ui-qa-status.md)
- **HTTP parity (fixture)?** [`wa-parity-report.md`](wa-parity-report.md)

## Related docs

- [`SYSTEM_ARCHITECTURE.md`](SYSTEM_ARCHITECTURE.md) — data flow
- [`LAYOUT.md`](LAYOUT.md) — directories
- [`CHANGELOG.md`](CHANGELOG.md) — documented current state
