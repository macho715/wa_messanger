# WA Message Ops Spike

Standalone Next.js App Router spike for WA operator behavior parity.

## App surface (2026-04)

- **Routes:** `/` (home), `/work-board`, `/hold`, `/owner-board` under shared `app/(ops)/` shell (`PageShell`, `OpsNav`).
- **Board:** Supabase `work_item` + Realtime; **TanStack Table** + **virtualized** rows; optional **master–detail** panel (disable with `NEXT_PUBLIC_DETAIL_PANEL=0`).
- **E2E:** Playwright (`pnpm test:e2e`); tests stub `GET **/rest/v1/work_item**` so smoke runs without a migrated DB (still need `NEXT_PUBLIC_*` for the client).
- **Implementation log:** [`docs/implementation/2026-04-01-work-board-ui-qa-status.md`](docs/implementation/2026-04-01-work-board-ui-qa-status.md)

Domain / ontology rules: root [`AGENTS.md`](AGENTS.md).

**Documentation map:** [Layout](docs/LAYOUT.md) · [Architecture](docs/SYSTEM_ARCHITECTURE.md) · [Guide](docs/GUIDE.md) · [Changelog](docs/CHANGELOG.md) · [HTTP parity](docs/wa-parity-report.md)

## Commands

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

First-time E2E: `pnpm exec playwright install chromium`.  
`pnpm test:e2e` intercepts `GET **/rest/v1/work_item**` so board smoke passes without a migrated DB (still needs `NEXT_PUBLIC_*` in `.env.local` for the client to build requests).

## Env

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WA_WEBHOOK_SECRET`

The **Work Board** needs valid `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; if they are unset, the table shows an error (see `components/board/WorkBoardTable.tsx`). E2E uses route stubs so `pnpm test:e2e` can run without a migrated database.

## Packaging

Create a handoff zip from the spike app root:

```bash
pnpm package:zip
```

Optional parity report inclusion:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/package.ps1 `
  -ParityReportPath "..\\LOGI-MASTER-DASH-claude-improve-dashboard-layout-lnNFJ\\output\\wa-parity\\wa-parity-report.md"
```

Artifacts are written to `dist/`:

- `wa-message-ops-spike-0.1.0.zip`
- `wa-message-ops-spike-0.1.0-manifest.json`

## Standalone Release Bundle

Create a runnable standalone zip after `pnpm build`:

```bash
pnpm package:standalone
```

Optional parity report inclusion:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/package-standalone.ps1 `
  -ParityReportPath "..\\LOGI-MASTER-DASH-claude-improve-dashboard-layout-lnNFJ\\output\\wa-parity\\wa-parity-report.md"
```

The standalone bundle contains:

- `server.js`
- standalone `node_modules` subset
- `.next/static`
- `.env.example`
- `start.ps1`
- `start.cmd`
