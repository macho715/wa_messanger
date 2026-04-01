# Project upgrade — Layout & design evidence (scout merge)

**Scope:** Message Work Board UI (master–detail, accessible table, app shell). **No code changes in this document.**  
**evidence_paths (product):** `v4.md` §7–8 (board_state-centric list + right detail: `event_status`, `hold_reason`, evidence).  
**Scout run:** `upgrade-web-scout` substitute run; accessed **2026-03-31**.

---

## Executive summary

- Consolidates **external Evidence Table** and **AMBER_BUCKET** for layout/design upgrades aligned with `v4.md` and current spike (`WorkBoardTable` single-column table, inline styles).
- **Dated official anchor:** W3C **WCAG 2.2** recommendation **2024-12-12**. Most framework/docs pages are **evergreen** → listed under **AMBER_BUCKET** when `published_date` is not verified on the page.
- **Top picks:** Next.js Learn dashboard layouts, WCAG 2.2 + H51, APG Table vs Grid, TanStack virtualization + row selection, shadcn Sheet for mobile detail.

---

## Evidence Table

| id | platform | title | url | published_date | updated_date | accessed_date | popularity_metric | why_relevant |
|----|----------|-------|-----|----------------|--------------|---------------|-------------------|--------------|
| E1 | official | WCAG 2.2 Recommendation | https://www.w3.org/TR/WCAG22/ | 2024-12-12 | — | 2026-03-31 | W3C REC | Info structure (1.3.1), reflow (1.4.10), contrast/use of color (1.4.1), motion (2.3.x) for Realtime UI |
| E2 | official | H51: Using table markup | https://www.w3.org/WAI/WCAG22/Techniques/html/H51 | AMBER | — | 2026-03-31 | — | `caption`, `th`, `scope`, complex `headers` for dashboard tables |
| E3 | official | ARIA APG: Table Pattern | https://www.w3.org/WAI/ARIA/apg/patterns/table/ | AMBER | — | 2026-03-31 | — | Static table vs interactive grid; links to sortable/`aria-sort` examples |
| E4 | official | ARIA APG: Grid Pattern | https://www.w3.org/WAI/ARIA/apg/patterns/grid/ | AMBER | — | 2026-03-31 | — | Keyboard model for sortable/selectable “spreadsheet-like” views |
| E5 | official | App Router: Creating Layouts and Pages (Learn) | https://nextjs.org/learn/dashboard-app/creating-layouts-and-pages | AMBER | — | 2026-03-31 | — | Nested `layout.tsx`, SideNav + scroll region (`flex`, `md:`) for app shell |
| E6 | official | Layout file convention | https://nextjs.org/docs/app/api-reference/file-conventions/layout | AMBER | — | 2026-03-31 | — | `children`, root vs segment layouts, partial rendering reference |
| E7 | official | Partial rendering | https://nextjs.org/docs/app/building-your-application/routing/linking-and-navigating#partial-rendering | AMBER | — | 2026-03-31 | — | Preserve shell while swapping main content |
| E8 | official | Next.js 16 blog | https://nextjs.org/blog/next-16 | AMBER | (Conf 2025-10 cited in page) | 2026-03-31 | — | Caching/routing context for dashboard-heavy apps on App Router |
| E9 | official | TanStack Table — Virtualization | https://tanstack.com/table/latest/docs/guide/virtualization | AMBER | — | 2026-03-31 | — | Large lists; pair with TanStack Virtual per guide |
| E10 | official | TanStack Table — Row selection | https://tanstack.com/table/latest/docs/guide/row-selection | AMBER | — | 2026-03-31 | — | Selected row → right detail (Master–detail) |
| E11 | official | shadcn/ui — Sheet | https://ui.shadcn.com/docs/components/sheet | AMBER | — | 2026-03-31 | — | Mobile: collapse right column into sheet/drawer |
| E12 | official | shadcn/ui — Drawer | https://ui.shadcn.com/docs/components/drawer | AMBER | — | 2026-03-31 | — | Alternative overlay for detail |
| E13 | official | shadcn/ui — Blocks | https://ui.shadcn.com/blocks | AMBER | — | 2026-03-31 | — | Dashboard-01-style composite layouts (copy-in) |

**Repo (non-URL) evidence**

| id | platform | title | path | published_date | accessed_date | why_relevant |
|----|----------|-------|------|----------------|---------------|--------------|
| R1 | repo | Message Work Board Spec v0.2 | `v4.md` §4–8 | — | 2026-03-31 | `public` read models; `board_state` rendering; right panel fields |

---

## AMBER_BUCKET

Items **without a reliable `published_date` on the sourced page** at scout time, or **not** verified as EN community **2025-06-01+** primary sources per strict `project-upgrade` rules:

| id | note |
|----|------|
| A1 | Next.js Learn + `layout` / partial-rendering docs — evergreen; use for patterns, not citation date. |
| A2 | Next.js 16 blog — event context (e.g. Conf 2025) without a single ISO date in fetched body. |
| A3 | W3C H51 technique page — rely on parent **WCAG 2.2 TR 2024-12-12** for normative dates where needed. |
| A4 | ARIA APG Table / Grid — maintained patterns; verify changelog if adjudication requires a day. |
| A5 | TanStack Table docs (`/latest/`) — versioned; pin doc URL to commit or version when citing. |
| A6 | shadcn Sheet / Drawer / Blocks — component docs; changelog `2024-03` blocks intro predates 2025-06 gate for *community* tier only. |
| A7 | **Third-party** EN tutorials (Medium, Reddit, etc.) for “Realtime subtle row highlight” — **not** vetted in this scout; add in a follow-up scout if dated post-2025-06. |
| A8 | Background `upgrade-web-scout` Task — no transcript output merged; **this file** is the authoritative scout merge for the session. |

---

## Top 5 picks (implementation order hint)

1. **E5 + E6 + E7** — App shell and stable nav for `/work-board` and `/hold`.  
2. **E1 + E2** — Table semantics and WCAG baseline before adding interaction.  
3. **E3 + E4** — Decide native `<table>` vs grid **before** sort/selection.  
4. **E10 (+ E9)** — Row selection and optional virtualization as row count grows.  
5. **E11** — Mobile detail for `v4` right panel.

---

## Fails / follow-up scout queries

- Dedicated EN posts **after 2025-06-01** on **non-flash Realtime row update** patterns — not collected here.  
- Some `site:tanstack.com` search snippets missed; URLs resolved manually.  
- GitHub discussions (English) for shadcn dashboard + App Router — optional pass 2.

---

## Related internal docs

- `v4.md` — merged Work Board spec (dashboard read boundary, Realtime scope, min order including right detail).  
- `p1.md` / `p2.md` — DDL and “minimal dashboard columns,” master board vs detail.  
- `AGENTS.md` — product contract (board not source of business truth).  
- `docs/superpowers/specs/2026-03-31-mm-webhook-integration-design.md` — pipeline/UI alignment (webhook-focused).
- `docs/implementation/2026-04-01-work-board-ui-qa-status.md` — **implemented** UI/QA baseline (TanStack virtual, Playwright, ops shell); Evidence rows here remain SOT for external citations only.
