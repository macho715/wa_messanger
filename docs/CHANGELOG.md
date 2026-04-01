# Changelog

This workspace has **no git history** in the checked-out copy; entries below are a **Documented Current State** from repository files, not a release train.

## Documented current state — 2026-04-01

**Evidence:** `package.json` (`name`: `wa-message-ops-spike`, `version`: `0.1.0`), `docs/implementation/2026-04-01-work-board-ui-qa-status.md`, migration files `0001`–`0004`, source tree under `app/`, `lib/`, `components/board/`, `e2e/`.

### Added (verified in tree)

- Next.js **16** App Router spike with ops route group and shared shell (`app/(ops)/`, `PageShell`, `OpsNav`).
- **WAHA webhook** route `app/api/webhooks/waha/route.ts` with raw audit, normalize, classify, conservative shipment handling, `work_item` upsert path (`lib/waha/*`, `lib/db/*`).
- Supabase migrations: ops_private + public core, RLS + Realtime, mm raw audit + shipment, work_item shipment FK.
- **Work Board** UI: TanStack Table + virtualization, optional detail panel (`NEXT_PUBLIC_DETAIL_PANEL`), Realtime row refresh / flash behavior.
- **Vitest** unit tests for parser/DB helpers; **Playwright** smoke with PostgREST route stub.
- Packaging static/standalone scripts under `scripts/`.
- Project documentation set: `docs/LAYOUT.md`, `docs/SYSTEM_ARCHITECTURE.md`, `docs/GUIDE.md`, this file; existing plan/upgrade/parity/implementation notes retained.

### Known gaps (from implementation status doc)

- PR8-style **shadcn + Tailwind** not applied.
- Deeper **source_message_id / evidence API** wiring called out as follow-up in implementation status.

### Unverified

- Exact date of authorship of individual files without `git log`.
- Production deployment topology (spike is local/standalone-oriented).
