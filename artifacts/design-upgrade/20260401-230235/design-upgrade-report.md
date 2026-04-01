# Design Upgrade Report

## 1. Baseline diagnosis
- Target surface: `dashboard`
- Editable source: `app/(ops)/layout.tsx`, `components/board/PageShell.tsx`, `components/board/WorkBoardTable.tsx`, `components/board/WorkBoardDetailPanel.tsx`
- Main issues:
  - hero and sticky shell consumed too much vertical space before the live queue appeared
  - table rows were too compressed, so `Title`, `Type`, and owner metadata competed instead of scanning clearly
  - the right detail panel was mostly empty at idle, which created dead space and weak queue-to-evidence balance
  - state pills, owner, shipment, and timestamps were too similar in visual weight

## 2. Reference log
| No. | URL | Why relevant | Pattern to transfer | Pattern to avoid |
|---|---|---|---|---|
| 1 | https://www.designrush.com/best-designs/awards/websites | Current enterprise-friendly awards curation for structured web surfaces | Sectioned information architecture with clear featured hierarchy | Marketing-site treatment over operations UX |
| 2 | https://www.designrush.com/best-designs/websites/apollo-care-website-design | 2026 healthcare-tech winner that explains complexity in layers | Modular content blocks and controlled reading rhythm | Dark-theme drama that hurts operational readability |
| 3 | https://www.awwwards.com/sites/latitude | Enterprise consultancy reference with strong grid and restrained hero framing | Structural grid and confident but contained hero hierarchy | Decorative motion competing with task content |
| 4 | https://wdawards.com/web/shchebet-design | 2026 clean-hierarchy and subtle-motion reference | Calm rhythm, minimal type scale, timeless layout language | Cluttered card surfaces and over-choreographed interactions |

## 3. Transferable design elements
| No. | Element | Reason | Expected benefit | Patch target | Risk |
|---|---|---|---|---|---|
| 1 | Tighter top shell frame | The board should arrive higher than the hero copy | Faster scan-to-queue transition | `app/(ops)/layout.tsx`, `components/board/PageShell.tsx` | Hero may feel too generic if copy loses surface identity |
| 2 | Stronger live queue summary strip | The queue needs clearer operational entry points before row inspection | Better hierarchy and faster first read | `components/board/WorkBoardTable.tsx` | Summary row can become too card-heavy if overgrown |
| 3 | Fixed table column balance with calmer title wrapping | Data-dense board surfaces fail first on scan rhythm | Better row cadence and reduced metadata collision | `components/board/WorkBoardTable.tsx` | Narrow widths still need follow-up tuning |
| 4 | Intentional idle evidence panel | Empty side space should still explain the evidence workflow | Stronger queue-to-detail relationship | `components/board/WorkBoardDetailPanel.tsx` | Idle guidance can become verbose if expanded further |

## 4. Patch map
| File / Section | Current problem | Proposed change | Reference anchor | Impact | Risk |
|---|---|---|---|---|---|
| `app/(ops)/layout.tsx` | Shared shell copy read like a generic frame and did not reinforce flow | Reframe shell title/description around queue scan, owner follow-up, and unblock loops | DesignRush awards clarity | Medium | Surface naming may still need per-route nuance |
| `components/board/PageShell.tsx` | Hero frame visually outweighed the operational content below it | Reduce padding and gap, tighten signal panel rhythm, keep the shell infrastructural instead of showcase-like | Awwwards `Latitude`, WDA `shchebet-design` | High | Over-tightening could make the shell feel abrupt |
| `components/board/WorkBoardTable.tsx` | Queue intro was weak and row content wrapped awkwardly | Strengthen summary strip, add mobile hint, set fixed column widths, clamp title text, widen table minimum | DesignRush modular blocks | High | Narrow view still needs a second pass |
| `components/board/WorkBoardDetailPanel.tsx` | Idle panel felt empty and disconnected | Add a 3-step evidence workflow guide and slightly increase structural weight | WDA calm rhythm | Medium | Idle state may remain secondary on very wide layouts |

## 5. Applied change summary
- Changed files:
  - `app/(ops)/layout.tsx`
  - `components/board/PageShell.tsx`
  - `components/board/WorkBoardTable.tsx`
  - `components/board/WorkBoardDetailPanel.tsx`
- Preview artifacts:
  - `before.png`
  - `after.png`
  - `refs.md`
- Notable trade-offs:
  - the shell is more compact and queue-first, but the shared hero title remains broad for all ops routes
  - desktop readability improved more than narrow-width density, which remains the main follow-up area

## 6. Validation summary
- Scorecard path: `artifacts/design-upgrade/20260401-230235/design-scorecard.json`
- Average score: `4.20`
- Weakest metric: `information_clarity = 3.9`
- Blocking issues: none
- Verdict: `PASS`

## 7. Remaining risks
- The queue table still needs a narrow-width pass to keep title wrapping and column density equally clean on smaller screens.
- Shared shell copy is stronger, but route-specific information clarity could improve further if `owner-board` and `hold` get route-tuned hero copy later.
