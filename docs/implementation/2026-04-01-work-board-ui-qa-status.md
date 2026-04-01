# Work Board UI / QA — implementation status

**Updated:** 2026-04-01  
**Scope:** Layout plan PR1–PR7 (플랜 `docs/project-plan/2026-03-31-layout-design-plan-doc.md` 정렬). **PR8** (shadcn + Tailwind)는 미적용.

## 요약

| 구간 | 상태 |
|------|------|
| 공유 ops 셸 (`PageShell`, `OpsNav`) | ✅ |
| 라우트 그룹 `app/(ops)/` — `/work-board`, `/hold`, `/owner-board` | ✅ |
| 마스터–디테일 (`WorkBoardDetailPanel`, 행 선택, `NEXT_PUBLIC_DETAIL_PANEL=0` 비활성) | ✅ |
| 모바일 상세 (`<dialog>`, 하단 “View details”) | ✅ |
| 표 접근성 기본(`caption`, `th scope="col"`, HOLD 텍스트+배지) | ✅ |
| TanStack Table + Virtual (`@tanstack/react-table`, `@tanstack/react-virtual`), 스크롤 컨테이너 `data-testid="work-board-scroll"` | ✅ |
| Realtime: 변경 행 하이라이트 / `prefers-reduced-motion` 시 상태 문구 | ✅ |
| Playwright 스모크 (`e2e/work-board.smoke.spec.ts`, `playwright.config.ts`) | ✅ |
| E2E 허메틱: `GET **/rest/v1/work_item**` 스텁(빈 배열 / 80행) | ✅ |

## 주요 경로

- `app/(ops)/layout.tsx` — `PageShell` + children  
- `app/(ops)/work-board/page.tsx`, `hold/page.tsx`, `owner-board/page.tsx`  
- `components/board/PageShell.tsx`, `OpsNav.tsx`, `WorkBoardTable.tsx`, `WorkBoardDetailPanel.tsx`  
- `e2e/work-board.smoke.spec.ts`, `playwright.config.ts`

## 명령 (검증)

```bash
pnpm typecheck
pnpm test
pnpm exec playwright install chromium   # 최초
pnpm test:e2e
pnpm build
```

## 미구현 / 다음

- PR8: Tailwind + shadcn (또는 동등 토큰)  
- `source_message_id` / 서버 API 기반 evidence 상세 (`v4` 근거 메시지)  
- 표 정렬·복합 포커스 시 Grid(APG) 전환 검토  
- 통합 E2E(스텁 없이 실 Supabase + 마이그레이션 DB) — 선택

## 문서 정합

- 제품/도메인 계약: 루트 `AGENTS.md`  
- 레이아웃 기획·Evidence: `docs/project-upgrade/*`, `docs/project-plan/2026-03-31-layout-design-plan-doc.md`  
- HTTP parity(별도 픽스처): `docs/wa-parity-report.md`
