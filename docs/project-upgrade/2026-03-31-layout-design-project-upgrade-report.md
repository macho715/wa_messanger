# Project upgrade report — Layout & design (Message Work Board)

**Input:** [2026-03-31-layout-design-evidence-scout.md](./2026-03-31-layout-design-evidence-scout.md)  
**Skill:** project-upgrade (원본은 제안·계획 문서, 본 파일은 repo state refresh 반영)  
**accessed_date:** 2026-04-01  

---

## 1) Executive Summary

- **제품 근거**는 `v4.md` §7–8: `board_state` 중심 목록 + 우측 상세(`event_status`, `hold_reason`, 근거 메시지). 스카웃 문서 **R1**·**E1–E13**이 외부·내부 Evidence 풀이다.  
- **확정 날짜 Evidence**는 **WCAG 2.2 TR(2024-12-12, E1)** 가 유일한 1차 앵커; 나머지 공식 문서 다수는 **AMBER_BUCKET**(페이지 단독 published 미검증).  
- **현재 repo 반영 상태:** `app/(ops)/layout.tsx` + `PageShell`/`OpsNav`, `WorkBoardTable`(TanStack Table+Virtual, `caption`/`scope`, HOLD 배지, Realtime 행 하이라이트), `WorkBoardDetailPanel`, 모바일 `<dialog>`, Playwright 스모크(E2E PostgREST 스텁). **남은 핵심 갭:** `source_message_id` 기반 evidence layer, shadcn/Tailwind(PR8), Grid 전환 시점.  
- **우선순위:** evidence-backed `DetailPanel` → 표 접근성 hardening(H51/APG Evidence 보강) → Table vs Grid(E3–E4) → 모바일 Sheet를 Radix 등으로 polish(E11) → Realtime 부분 갱신(현재는 `load()` 유지 + flash).  
- **검증 게이트(Best3 엄격 모드):** 스킬 문구상 “날짜 없으면 Top/Best3 비권고”에 따라, 아래 Best3는 **E1+R1** 조합으로 1항을 “강”, 2–3항은 **보강 Evidence(EN 2025-06+ 후속 스카웃)** 권고로 표시한다.  

---

## 2) Current State Snapshot

| 영역 | 상태 | evidence_paths |
|------|------|----------------|
| 스택 | Next `16.0.10`, React `19.2.0`, Supabase JS `^2.90`, Vitest, `@tanstack/react-table` + `@tanstack/react-virtual`, `@playwright/test`; **Tailwind/shadcn 없음** | `package.json` |
| 라우팅 | `/`, `/work-board`, `/hold`, `/owner-board` | `app/*` |
| 레이아웃 | 공유 ops 셸 + 상단 nav + 2열 detail 패널 baseline 구현; 인라인 스타일 유지 | `app/(ops)/layout.tsx`, `components/board/PageShell.tsx`, `components/board/WorkBoardTable.tsx` |
| 스펙 정렬 | `Owner Board`, row 선택, `DetailPanel`, 모바일 detail dialog는 구현됨. 근거 메시지/evidence layer는 **여전히 미구현** | `v4.md`, `components/board/WorkBoardDetailPanel.tsx` |
| Realtime | 전체 `load()` 기반은 유지되지만 row flash/sync hint는 추가됨 | `components/board/WorkBoardTable.tsx` |
| 문서 | 스카웃 Evidence·AMBER 통합본 존재 | [2026-03-31-layout-design-evidence-scout.md](./2026-03-31-layout-design-evidence-scout.md) |

---

## 3) Upgrade Ideas Top 10

`PriorityScore = (Impact × Confidence) / (Effort × Risk)` (1–5 추정). Evidence id는 스카웃 표와 동일.

| # | 버킷 | 아이디어 | I | E | R | C | Score | Evidence |
|---|------|----------|--:|--:|--:|--:|------:|----------|
| 1 | Architecture | `source_message_id` 기반 **evidence-backed DetailPanel** | 5 | 3 | 2 | 5 | **1.7** | R1, E1, `p1.md` |
| 2 | Architecture | **2열 마스터–디테일 hardening**: 현재 baseline 패널에 richer context 연결 | 5 | 4 | 3 | 5 | **0.8** | R1, E1, E10 |
| 3 | DX/Tooling | **shadcn + Tailwind** 도입 또는 동등 디자인 토큰(간격·타이포) | 4 | 4 | 2 | 4 | **0.8** | E11, E12, E13 |
| 4 | Performance | **TanStack Table** + **Virtualization** — `WorkBoardTable`에 반영됨 | 4 | 4 | 3 | 4 | **0.5** | E9, E10 · 코드 `WorkBoardTable.tsx` |
| 5 | Modularity | **APG 기준**: 네이티브 `<table>` 유지 vs **Grid**!(정렬·다중 포커스) | 4 | 3 | 3 | 4 | **0.9** | E3, E4, E1 |
| 6 | Reliability | Realtime 시 **전체 리로드 최소화**(행 하이라이트·짧은 토스트; 모션 제한) | 3 | 3 | 2 | 4 | **0.7** | E1 (2.3.x 맥락) |
| 7 | Docs/Process | **UI 스펙 1p**: HOLD 배지·색·텍스트 병기 규칙(`1.4.1`) | 3 | 2 | 1 | 5 | **3.0** | E1, R1, `AGENTS.md` |
| 8 | Architecture | 모바일: 우측 패널 → **Sheet/Drawer** | 4 | 3 | 3 | 4 | **0.9** | E11, E12 |
| 9 | DX/Tooling | **Playwright** 스모크: 보드 로드·행·스크롤 컨테이너(구현됨; PostgREST 스텁) | 3 | 3 | 2 | 3 | **0.8** | repo: `e2e/work-board.smoke.spec.ts` |
| 10 | Performance | **부분 인덱스·뷰**와 UI 필터 정합 (`p1` OPEN/HOLD 슬라이스) | 3 | 3 | 2 | 3 | **0.75** | R1, `p1.md` |

---

## 4) Best 3 Deep Report

### Best 1 — evidence-backed DetailPanel (`v4` 정렬) — **Evidence ≥2 (E1 + R1)**

| 항목 | 내용 |
|------|------|
| **Goal** | 현재 구현된 우측 패널을 `event_status`, `hold_reason`뿐 아니라 근거 메시지/컨텍스트까지 보여주는 `v4` 수준으로 끌어올린다. |
| **Non-goals** | KPI·차트 중심 대시보드(AGENTS downstream). |
| **Proposed design** | 현재 `DetailPanel`은 유지하되, `source_message_id` 기반 서버 read path 또는 안전한 public read model을 추가해 근거 스니펫·추가 context를 주입한다. 데스크톱은 우측 패널, 모바일은 existing dialog/sheet flow를 유지한다. |
| **PR Plan** | PR1 context API/read model; PR2 panel evidence UI; PR3 모바일/desktop 공통 empty-state 및 에러 처리. |
| **Tests** | RTL: 상세 패널 evidence 렌더; API/route handler 단위 테스트; 스냅샷(선택). |
| **Rollout** | existing `NEXT_PUBLIC_DETAIL_PANEL` 유지 + evidence section만 점진 공개. |
| **Risks** | 근거 PII → 서버 API·마스킹. |
| **KPI** | 상세 패널 도달률, 작업 시간(운영). |
| **Dependencies** | `public.work_item.source_message_id`, `ops_private.wa_message` 접근 경계, optional 서버 API. |
| **Evidence** | **R1** `v4.md` §7–8; **E1** WCAG 2.2 `https://www.w3.org/TR/WCAG22/` **published_date 2024-12-12** (정보 구조·리플로우·모션). 보조: **E5–E7** (AMBER). |

### Best 2 — 표 접근성 + Table vs Grid 결정 — **Evidence E1 + E2/E3 (E2/E3 날짜 AMBER)**

| 항목 | 내용 |
|------|------|
| **Goal** | 스크린리더·키보드에 열·행 관계 명확; 정렬/행 선택 도입 전 역할 고정. |
| **Proposed design** | 1단계: `caption`, `th scope="col"`, HOLD는 **텍스트+배지**(색 단독 금지). 2단계: 정렬·선택 필요 시 APG **Grid** 검토. |
| **PR Plan** | PR1 시맨틱 표; PR2 `aria-sort` 또는 Grid 프로토타입; PR3 회귀 테스트. |
| **Tests** | a11y lint/axe(선택); 수동 VoiceOver/NVDA 샘플. |
| **Evidence** | **E1** 2024-12-12; **E2** H51 AMBER; **E3** APG Table AMBER. |

> **게이트:** 스킬 “날짜 필수” 엄격 적용 시 Best2는 **E1만 dated** → 나머지는 후속 스카웃으로 H51/APG **개정일** 확인 후 “확정” 승격.

### Best 3 — 대용량·선택 — TanStack Virtual + Row selection — **Evidence E9–E10 (AMBER) + E1**

| 항목 | 내용 |
|------|------|  
| **Goal** | 200+ 행·Realtime에서 DOM·선택 상태 안정. |
| **Proposed design** | `@tanstack/react-table` + 가상 스크롤; 선택 행 id → 우 패널 props. |
| **PR Plan** | PR1 Table 래핑; PR2 가상화; PR3 Realtime 시 선택 유지 정책. |
| **Tests** | 단위: row selection reducer; perf: 렌더 카운트 스모크. |
| **Evidence** | **E9, E10** (문서 URL 확정, **published_date AMBER**); **E1** 모션/인지 부하 완화. |

> **게이트:** TanStack 문서 **버전 고정** 후 Evidence row 재작성 권장(A5).

---

## 5) Options A / B / C

| 옵션 | 범위 | Risk / time |
|------|------|-------------|
| **A 보수** | E1+H51 수준 표 보강 + 여백·타이포만 | 낮음 · 단기 |
| **B 중간** | A + 앱 셸 + 2열 마스터–디테일 + 모바일 Sheet | 중간 |
| **C 공격** | B + shadcn 스택 + TanStack virtual + E2E | 높음 · 중기 |

---

## 6) 30 / 60 / 90-day Roadmap (PR 단위)

- **완료(세션 반영):** 셸·`caption`/`scope`·행 선택·모바일 dialog·TanStack virtual·Realtime flash·Playwright 스모크.  
- **30d (잔여):** `source_message_id` 기반 context path; 우 패널 evidence section; H51/APG dated Evidence 보강.  
- **60d:** Radix/shadcn Sheet polish; Realtime 부분 갱신 검토.  
- **90d:** PR8 디자인 토션·문서(E7); DB 뷰/인덱스와 필터 정합(Top10 #10).  

---

## 7) Evidence Table — 아이디어별 매핑

| Top10 # | 주 Evidence | 보조 |
|--------|-------------|------|
| 1 | E5, E6, E7 | R1 |
| 2 | R1, E1 | E10 |
| 3 | E11, E12, E13 | E8 |
| 4 | E9, E10 | E1 |
| 5 | E3, E4 | E1 |
| 6 | E1 | — |
| 7 | E1, R1 | AGENTS |
| 8 | E11, E12 | R1 |
| 9 | Playwright 스모크 | `e2e/` |
| 10 | `p1.md` | R1 |

**전체 Evidence id 목록:** 스카웃 문서 §Evidence Table (E1–E13, R1) 를 **정본(SOT)** 으로 사용.

---

## 8) AMBER_BUCKET

스카웃 문서 **§AMBER_BUCKET (A1–A8)** 를 그대로 따른다. 요약:

- Next Learn / layout / partial rendering / Next 16 blog 페이지 **단독 published 미확인**.  
- H51, APG Table/Grid, TanStack `/latest`, shadcn 컴포넌트·Blocks.  
- EN 커뮤니티 2025-06+ Realtime UI 글 **미수집**.  
- `upgrade-web-scout` 백그라운드 Task 트랜스크립트 공백 — **스카웃 SOT = evidence-scout 파일**.

---

## 9) Open Questions (최대 3)

1. 우측 **근거**는 `public.work_item`만으로 충분한가, `source_message_id` 기반 **서버 API** 스니펫이 필요한가?  
2. 현재 구현된 `Owner Board`를 substring filter 수준에서 유지할지, **governed owner directory**로 승격할지?  
3. 표를 **계속 native table**로 둘지, 정렬/다중 포커스에서 **Grid**로 전환할 시점은?

---

## Verification Gate

| 검사 | 결과 |
|------|------|
| 스택 충돌 | **PASS** (Next 16 + React 19; shadcn 도입 시 의존성 증가) |
| Best3 strict “dated×2” | **조건부** — Best1만 E1+R1 동시 명확; Best2–3는 AMBER 보강 권고 |
| `v4`/AGENTS 충돌 | **PASS** — 상세는 evidence·서버 경계 준수 전제 |

---

## 참조

- [2026-03-31-layout-design-evidence-scout.md](./2026-03-31-layout-design-evidence-scout.md)  
- [구현 상태(요약)](../implementation/2026-04-01-work-board-ui-qa-status.md)  
- `v4.md`, `p1.md`, `p2.md`, `AGENTS.md`  
