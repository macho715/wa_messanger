# WA parity report

- Fixture: `wa-core-flow`
- Run id: `c882496f`
- Source: `http://127.0.0.1:3000`
- Spike: `http://127.0.0.1:3500`
- Result: `PASS`

## Step Summary

| Kind | Step | Match | Source | Spike |
|---|---|---:|---:|---:|
| postRejectUnauthorized | reject unauthorized request | PASS | 401 | 401 |
| postRejectMissing | reject missing fields | PASS | 422 | 422 |
| postCreate | create announcement | PASS | 201 | 201 |
| getActive | active snapshot after create | PASS | 200 | 200 |
| getAssignees | assignee directory | PASS | 200 | 200 |
| patchStatus | mark in progress | PASS | 200 | 200 |
| patchAssignee | assign owner | PASS | 200 | 200 |
| getActive | active snapshot after updates | PASS | 200 | 200 |
| softDelete | soft delete | PASS | 200 | 200 |
| getTrash | trash snapshot after delete | PASS | 200 | 200 |
| restore | restore announcement | PASS | 200 | 200 |
| getActive | active snapshot after restore | PASS | 200 | 200 |

## Differences

- None

## Browser Hooks

- open-wa-tab: Open the WA announcements surface.
  - Expect: The list view is visible and empty state is readable when no rows exist.
- badge-reset: Replay the create fixture and open the WA surface again.
  - Expect: Unread badge increments on insert and clears on mark-all-read.
- status-toggle: Toggle a created row through 대기 -> 진행 -> 보류.
  - Expect: Status buttons update the same row state without leaving the page.
- trash-restore: Soft delete and restore the created row.
  - Expect: Row moves to trash and returns to active without changing identity.

## Notes

- Map parity is excluded by design for this spike.
- This report compares behavior-level HTTP and row-state results only.

## Spike UI / QA (reference)

- As of 2026-04-01 the spike repo also ships a **Message Work Board** surface: shared `app/(ops)` shell, TanStack virtualized table, optional detail panel, and Playwright smoke tests. That work is **not** covered by this HTTP fixture table; see [`implementation/2026-04-01-work-board-ui-qa-status.md`](implementation/2026-04-01-work-board-ui-qa-status.md) in the dev tree.