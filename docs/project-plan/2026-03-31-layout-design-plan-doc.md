# PLAN_DOC — Layout & design (Message Work Board)

**Based on:** [`docs/project-upgrade/2026-03-31-layout-design-project-upgrade-report.md`](../project-upgrade/2026-03-31-layout-design-project-upgrade-report.md)  
**Template:** `project-plan` → `references/plan-template.md` (A~K + ㅋ)  
**Skill constraint:** 문서 전용 — 코드/커밋/배포 없음  
**plan_accessed_date:** 2026-04-01  

---

## A. Executive Summary

- **목표(1~2문장):** `v4.md`의 마스터–디테일(보드 목록 + 우측 상세)과 일관된 앱 셸을 구현하고, WCAG 2.2(정본 E1)를 만족하는 표·모바일 패턴으로 운영자가 메시지 기반 작업 카드를 빠르게 식별·조치할 수 있게 한다.
- **현재 baseline:** 공유 ops 셸, `Owner Board`, 초기 `DetailPanel`, row 선택/모바일 detail dialog는 이미 구현된 상태다.
- **비즈니스/제품 KPI(예시):** 상세 패널 도달률·작업 처리 시간(운영 측정); UI 회귀 시 크리티컬 플로우 스모크 통과율; Realtime 구독 시 클라이언트 리렌더/레이아웃 시프트(주관+선택적 perf 스모크).
- **범위:**  
  - **In-scope:** `app/work-board`·`/hold`·`/owner-board` 공유 레이아웃, 2열 마스터–디테일, 네이티브 표 접근성 1단계, 모바일 Sheet, 선택 상태·Realtime 하이라이트(저모션), 옵션 B/C에 따른 shadcn+Tailwind·TanStack virtual·Playwright.  
  - **Out-of-scope:** AGENTS downstream KPI 대시보드, 자동 메시지 발송, 프로덕션 배포 파이프라인(레포 비-git 전제 시 문서화만).
- **핵심 결정 3개:**  
  1) **앱 셸 + 2열** — Evidence **R1 + E1**; 벤치 **vercel/next.js**(App Router·layout 패턴).  
  2) **표는 1단계 native `<table>`** → 정렬·복합 포커스 요구 시 Grid 전환 분기 — Evidence **E1** + H51/APG는 **AMBER** 보강 전제.  
  3) **대용량 행은 TanStack Table + Virtual** — Evidence **E9–E10 AMBER**; 벤치 **TanStack/table**, **TanStack/virtual**.
- **30/60/90 요약:** 2026-04-01 기준 — 셸·시맨틱 표·상세·모바일 dialog·TanStack virtual·Realtime flash·Playwright는 **반영됨**. 잔여: evidence 상세·PR8 토큰·Grid/H51 hardening 등(보고서 §6 갱신본 참고).

---

## B. Context & Requirements (PRD-lite)

### B1. 문제정의

- **현재 문제(증거: Current Snapshot):** 공유 셸과 초기 `DetailPanel`은 구현되었지만, `source_message_id` 기반 evidence layer가 없어 `v4`의 “근거 메시지” 수준 상세에는 아직 못 미친다. Realtime도 전체 `load()` 기반이어서 세분화 여지가 남아 있다. (`app/(ops)/layout.tsx`, `components/board/WorkBoardDetailPanel.tsx`, `components/board/WorkBoardTable.tsx`, `v4.md` — 보고서 §2.)
- **왜 지금:** 제품 스펙(`board_state`)과 UI 간 갭; 접근성·모바일 대응 없이 운영 확장 시 오류·지연 비용 증가.

### B2. 사용자/페르소나

- **Primary:** 실시간 들어오는 WA 기반 작업을 보드에서 필터·확인하는 운영자.
- **Secondary:** 개발자(Realtime·스키마 정합), 감사/컴플라이언스(근거 노출 방식).

### B3. 사용자 시나리오/유저스토리

- **Story 1:** “운영자로서, 보드에서 항목을 선택하면 `event_status`·`hold_reason`과 허용 수준의 근거를 한 화면에서 보고 싶다.”
- **Story 2:** “운영자로서, 키보드·스크린리더로 열/행 관계를 이해하고 HOLD 상태를 색만으로 구분하지 않고 싶다 (텍스트+배지).”
- **Story 3:** “운영자로서, 모바일에서는 우측 패널이 Sheet로 열려 동일 정보에 도달하고 싶다.”

### B4. 요구사항

- **Functional:** existing 공유 nav/셸 유지; `DetailPanel`에 evidence/context 섹션 추가; 2열 레이아웃(`md+`), `<md` dialog/sheet 유지; `caption`/`th scope="col"` hardening; Realtime 시 행 강조·토스트(과도한 모션 금지).
- **Non-functional:** 상호작용 p95 목표는 팀 합의치 설정(초기: 클라이언트 TTI 체감 + 200+ 행 시 scroll jank 스모크); 가용성은 Supabase Realtime·네트워크 의존 명시.
- **Constraints:** 근거 필드 PII — 서버 API·마스킹 여부 오픈 퀘스천(보고서 §9); 브랜드/다크 모드·대비(1.4.3) 미결; 레포 git 비사용 시 CI 게이트는 수동.

---

## C. UI/UX Plan (IA → Flow → Screens)

### C1. Information Architecture (IA)

- **Navigation map:** 상단(또는 측면) — 홈 `/`, `작업 보드` `/work-board`, `Owner Board` `/owner-board`, `HOLD` `/hold`; 옵션 B 플래그 `?panel=1`.
- **엔티티:** `work_item`(목록 행), 우측 상세 패널(동일 레코드 확장 + 필요 시 메시지 스니펫 API).

### C2. User Flow

- **Flow 1 — 데스크톱:** 보드 진입 → 표 스크롤/탐색 → 행 선택(클릭/키보드) → 우측 패널 표시 → HOLD면 배지+텍스트 확인 → (선택) 링크·후속 액션.
- **Flow 2 — 모바일:** 동일 → 우측 영역 대신 Sheet 오픈 → 닫기 후 목록 복귀.
- **Flow 3 — Realtime:** 구독 이벤트 → 해당 `id` 행 짧은 하이라이트 + 인라인/토스트(저모션); 전체 테이블 리로드 최소화.

### C3. 화면/컴포넌트 리스트

| Screen | Purpose | Key Components | Data Needed | Edge cases |
|--------|---------|----------------|-------------|------------|
| Work board | 마스터 목록 | `WorkBoardTable`, 행 선택, (옵션) 가상 스크롤 래퍼 | `work_item` rows, Realtime channel | 빈 목록, 로딩, 구독 끊김 |
| Owner board | 담당자 중심 슬라이스 | owner filter form, `WorkBoardTable` | `work_item.owner_name`, Realtime channel | partial-name 오매치, 빈 결과 |
| Detail panel | `v4` 상세 | existing `DetailPanel`, evidence section, 근거 영역 | 동일 row + `source_message` API 또는 safe read model | PII, 긴 텍스트, 권한 없음 |
| Hold board | HOLD 슬라이스 | 공유 셸 + 필터된 테이블 | `p1` OPEN/HOLD 뷰 정합 | 필터·DB 뷰 불일치 시 메시지 |
| Mobile sheet | 패널 대체 | Sheet/Drawer primitive | 선택 row id | 포커스 트랩, 닫힘 후 포커스 복귀 |

### C4. Design System / Accessibility

- **라이브러리:** 옵션 A — 최소 토큰(CSS 변수); 옵션 B/C — **shadcn/ui + Tailwind + Radix**(벤치마크 repos 참조 ㅋ).
- **a11y:** WCAG 2.2 TR **published 2024-12-12 (E1)**; HOLD 색 단독 금지(1.4.1); 모션(2.3.x) 완화; H51/APG 세부는 **후속 dated Evidence**로 승격 후 Grid 결정.
- **Error UI:** Realtime 실패 시 비차단 배너; 재연결 시 full refresh vs diff는 플래그로.

---

## D. System Architecture (Components & Boundaries)

### D1. High-level Components

- **Frontend:** Next.js App Router, React 19, 보드 컴포넌트(`components/board/*`), (옵션) `components/layout/AppShell`.
- **Backend/API:** 기존 WAHA webhook·Server Actions 유지; 다음 슬라이스는 상세 근거 API 또는 safe read model 추가.
- **Data store:** Supabase `public.work_item`, Realtime publication; `p1` 슬라이스/인덱스(Top10 #10).
- **External:** WAHA, Supabase.

### D2. Data Flow

- **Request:** 클라이언트 → Supabase client(select/subscribe) 또는 `/api/...` 스니펫.
- **Realtime:** `postgres_changes` → 행 단 patch 또는 최소 intrusion 하이라이트 큐.
- **Caching:** 클라이언트 선택 상태는 URL query 또는 컨텍스트; 서버 캐시는 상세 API 도입 시 `revalidate` 정책 별도 정의.

### D3. Boundary Rules

- **Imports:** UI는 `components/`·`lib/`; DB 타입은 단일 소스; 서버 전용 유틸은 클라이언트 번들 금지.
- **책임:** 표 = 프리젠테이션+선택 상태; 데이터 fetch는 hook/loader 계층; 상세는 별도 컴포넌트로 목록 리렌더 최소화.

---

## E. Data Model & API Contract

### E1. Data model (Entity)

| Entity | Fields (key) | Source of truth | Validation | Notes |
|--------|----------------|------------------|------------|--------|
| work_item | `id`, `board_state`, `event_status`, `hold_reason`, `shipment_ref`, … | `public.work_item` | DB 제약 + 앱 타입 | `v4`·`p1` 정합 |
| (optional) message_snippet | 발신자/본문 일부 | 서버 API 또는 join 뷰 | 마스킹·길이 제한 | 오픈 퀘스천 |

### E2. API

| Endpoint | Method | Auth | Request | Response | Error codes |
|----------|--------|------|---------|-----------|-------------|
| *(기존)* webhooks/waha | POST | 시크릿 | raw payload | 2xx/4xx | idempotent duplicate |
| *(제안)* `/api/work-items/[id]/context` | GET | 세션/RLS | id | 스니펫 JSON | 404/403 |

*(상세 API는 승인 후 스펙 확정; 본 플랜은 계약 자리만 유지.)*

### E3. AuthN/AuthZ

- Supabase anon/service 역할·RLS 유지; 상세 스니펫은 최소 노출 원칙; audit는 기존 ops 패턴 따름.

---

## F. Repo / Package Structure (벤치마크 기반)

- **Target tree(단일 앱 유지 시):**  
  - `app/(ops)/work-board/layout.tsx`, `page.tsx`  
  - `app/(ops)/hold/...`  
  - `app/(ops)/owner-board/...`  
  - `components/board/` — 테이블, 상세, shell  
  - `components/ui/` — shadcn 생성 시  
  - `lib/a11y/`, `lib/board/` — (선택) 토큰·헬퍼  
  - `docs/` — UI 스펙 1p(Top10 #7)  
- **Naming:** 기존 `WorkBoardTable` 등 유지; 신규 PascalCase 컴포넌트.
- **Lint/format/typecheck:** `pnpm` 스크립트 유지; Tailwind 도입 시 eslint-plugin 등 추가는 별 PR.
- **Migration path:** 인라인 스타일 → CSS 모듈 또는 Tailwind 클래스; 표는 기존 DOM 루트 유지 후 TanStack 래핑.

**벤치 연결:** Vercel 예제 레포는 다중 샘플 구조 참고; monorepo 전환은 비권장(스코프 밖).

---

## G. Implementation Plan (Epics → Stories → PRs)

### G1. Epics

| Epic | Goal | Deliverables | Acceptance Criteria | Dependencies | Risks |
|------|------|--------------|----------------------|--------------|--------|
| E-Shell | 공유 IA·여백 | `layout.tsx`, nav (baseline implemented) | 세 라우트(`work-board`, `hold`, `owner-board`) 동일 셸 | — | 라우트 그룹 확장 시 동기화 |
| E-MasterDetail | `v4` 정렬 UI | evidence-backed `DetailPanel` + 2열 정합 | 필드 + 근거 메시지 표시 | DB/API 필드 | PII 노출 |
| E-A11y | 표 접근성 | caption/scope/HOLD | axe 스모크 또는 수동 체크리스트 | E-Shell | Grid 전환 시 재작업 |
| E-Realtime-UX | 부분 업데이트 | 하이라이트·토스트 | full reload 감소 확인 | Supabase | 과도한 리렌더 |
| E-Scale | 가상 스크롤 | TanStack 통합 | 200+ 행 스크롤 스모크 | E-MasterDetail | 포커스/스크린리더 회귀 |
| E-QA | E2E·문서 | Playwright·UI 1p | 스모크 녹색 | staging | 플레이크 |

### G2. Story Breakdown (요약)

- **E-Shell:** baseline done; future visual polish만 남음.
- **E-MasterDetail:** existing `DetailPanel`에 evidence/context 주입; `selectedId` 상태 유지; `md` 분기 dialog/sheet 유지.
- **E-A11y:** 표 시맨틱; HOLD 배지 문자열; 후속 Grid 스파이크.
- **E-Realtime-UX:** 이벤트 디바운스·행 애니메이션 최소화.
- **E-Scale:** `@tanstack/react-table` + `@tanstack/react-virtual` 조합 POC→본통합.
- **E-QA:** `work-board` 로드·행 N개·패널 토글.

### G3. PR Plan (≥6 PR 권장)

| PR | Scope | Target files/modules | Tests | Rollback note | Owner |
|----|-------|---------------------|-------|---------------|--------|
| PR1 | context API / safe read model | `app/api/**` 또는 safe view, 타입 | route/unit | API route 제거 | FE/BE |
| PR2 | evidence-backed detail panel | `DetailPanel`, board state 연동 | RTL panel render | evidence section hide | FE |
| PR3 | 시맨틱 표 hardening | `WorkBoardTable.tsx` | RTL caption/scope | 단일 파일 revert | FE |
| PR4 | 모바일 Sheet | radix/shadcn Sheet | RTL 포커스 | 플래그 | FE |
| PR5 | Realtime 하이라이트 | subscription hook | 단위 reducer | 구독 로직 플래그 | FE |
| PR6 | TanStack virtual | table wrapper | perf 스모크 | deps 제거 PR | FE |
| PR7 | Playwright | `e2e/board.spec.ts` | CI 또는 로컬 | 스크립트 비활성 | QA |
| PR8 | shadcn+Tailwind | config, tokens | 빌드 | tailwind 제거 | FE |

### G4. Feature Flags / Canary

- **`NEXT_PUBLIC_DETAIL_PANEL` 또는 query `?panel=1`:** 단계적 공개.
- **Canary:** 내부 사용자 → 전체; 트리거: error rate, CLS 급증, a11y 회귀 리포트.

### G5. Timeline & Resourcing

- **30/60/90:** 보고서 §6.  
- **인력:** FE 1, (분할 시) a11y 리뷰어, QA 0.25 FTE.

---

## H. Testing Strategy (Quality Gates)

### H1. Test Pyramid

- **Unit:** 선택 reducer, HOLD 표시 헬퍼, (optional) virtual row height.
- **Integration:** Supabase mock + 테이블 렌더.
- **E2E:** Playwright 스모크(Top10 #9, Evidence 후속 시 명시).
- **Perf:** 200행 Fixture 스크롤 프레임 드롭 스모크(수동 허용).
- **Security:** 상세 API 도입 시 authz 테스트.

### H2. CI Gates

- **Lint/format/typecheck/unit:** `pnpm` 기존.  
- **E2E:** GitHub Actions 미구성 시 “로컬 게이트”로 문서화.

### H3. Test Data & Fixtures

- 시드 `work_item` + HOLD 다양체; Realtime은 staging 또는 mock channel.

---

## I. Observability & Operations

### I1. Logging/Tracing/Metrics

- 클라이언트: Realtime 재연결 카운트(옵션); 서버: webhook 기존.  
- 향후 OpenTelemetry는 팀 표준 시 정렬.

### I2. Alerting & On-call

- 앱 레벨: Vercel/호스팅 알림; DB: Supabase 대시보드. SLO는 별도 합의.

### I3. Runbooks

- **Deploy:** 빌드→프리뷰→프로덕션; 마이그레이션은 기존 `supabase/migrations` 절차.  
- **Rollback:** 레이아웃 플래그 off; TanStack PR revert.  
- **Incident:** Realtime 장애 시 읽기 전용 배너 + 수동 새로고침 안내.  
- **Data repair:** 해당 없음(UI).

---

## J. Error Handling & Recovery

### J1. Error taxonomy

- **4xx:** 상세 API 404 → 패널 “데이터 없음”.  
- **5xx/네트워크:** 토스트 + 재시도 버튼.  
- **Realtime 끊김:** 자동 재연결 backoff(Supabase 기본 활용).

### J2. Retry/Timeout/Idempotency

- 구독 재시도는 클라이언트 기본; 상세 fetch timeout 10s(가이드) + 1회 재시도.

### J3. UX Error Messaging

- 기술 스택 노출 최소화; “연결 불안정” 등 운영 문구 사전 합의.

---

## K. Dependencies, Security, Risks

### K1. Dependencies (초안)

| Dependency | Type | Version policy | License | Risk | Mitigation |
|------------|------|----------------|---------|------|------------|
| next / react | lib | 현재 16 / 19 유지 | MIT | major churn | lockfile |
| tailwindcss | lib (옵션) | latest minor pin | MIT | 번들/설정 | PR8 단일 |
| shadcn/ui | codegen+radix | 컴포넌트 단위 | MIT | 업데이트 분산 | registry 버전 고정 |
| @tanstack/react-table / virtual | lib (옵션) | semver pin | MIT | API 변동 | 단일 래퍼 |
| @supabase/supabase-js | lib | 기존 | MIT | Realtime | 회로 차단 UI |
| playwright | dev | 채널 stable | Apache-2.0 | CI 비용 | 스모크만 |

### K2. Security

- Secrets: env에만; 로그에 payload 금지.  
- 상세 스니펫 최소화; RBAC 검토.

### K3. Risk Register

| Risk | Likelihood | Impact | Trigger | Mitigation | Owner |
|------|------------|--------|---------|------------|--------|
| PII in panel | Med | High | 근거 필드 노출 | 서버 마스킹·롤 | Eng |
| Grid 전환 비용 | Med | Med | 정렬·다중 선택 | 단계적; APG Evidence 후 | Eng |
| TanStack+a11y 회귀 | Med | Med | virtual 포커스 | 스크린리더 샘플·플래그 | FE |
| shadcn 도입 번들 증가 | Low | Med | LCP 악화 | 트리쉐이킹·lazy | FE |
| Realtime 전체 reload 습관 | Med | Low | 이벤트 폭주 | 배치·하이라이트만 | FE |

### K4. Change Control (필수)

1. **Dry-run:** `pnpm build` / 스테이징 프리뷰에서 레이아웃·표·패널 확인.  
2. **Change list:** PR별 파일 목록 + 마이그레이션 유무.  
3. **Explicit approval:** 파괴적 변경(Tailwind 전면, Grid 교체)은 제품/리드 서명.  
4. **Post-change verification:** 체크리스트 — a11y 샘플, Realtime, 모바일 Sheet.

---

## ㅋ. Appendix (Evidence + Benchmarks)

### ㅋ0. Design Decisions × Benchmarks (Merge)

| Decision | 적용 범위 | 구현 접근 | Repo evidence (why) | 롤백 |
|----------|-----------|-----------|---------------------|------|
| App Router nested layout | `app/work-board`, `hold` | `layout.tsx` + 공유 shell | vercel/next.js — layout 패턴 | 셸 제거 |
| 디자인 시스템 | 전 UI | shadcn + Tailwind + Radix | shadcn-ui/ui, tailwindlabs/tailwindcss, radix-ui/primitives | CSS만 유지 PR |
| Headless table/grid | 보드 | TanStack Table (+ Virtual) | TanStack/table, TanStack/virtual | 네이티브 표 PR revert |
| 예제·배포 패턴 참고 | 팀 학습 | vercel/examples | 소비 패턴만 | — |
| Realtime 클라 | 기존 | supabase-js | supabase/supabase-js | 폴링 폴백 문서화 |
| E2E | QA gate | Playwright | microsoft/playwright | 스펙 skip |
| 단위 테스트 | 기존+확대 | Vitest | vitest-dev/vitest | — |

> **Benchmark filter:** `created_at`은 2025-06 이전인 저장소 다수; 스킬 필터는 **`pushed_at ≥ 2025-06-01`** 로 충족(실행일 API 기준). **Star 수는 시점 스냅샷.**

### ㅋ1. Evidence Table (Ideas + Benchmarks)

| Type | platform | title/repo | url | published/created | updated/pushed (UTC) | accessed_date | popularity_metric |
|------|-----------|------------|-----|-------------------|----------------------|---------------|-------------------|
| idea | W3C | WCAG 2.2 TR | https://www.w3.org/TR/WCAG22/ | 2024-12-12 | *(spec)* | 2026-03-31 | *(TR, stars N/A)* |
| idea | internal | v4.md (board_state, detail) | *(repo path)* | — | — | 2026-03-31 | R1 |
| idea | internal | project-upgrade Evidence E2–E13 | ../project-upgrade/2026-03-31-layout-design-evidence-scout.md | AMBER | AMBER | 2026-03-31 | SOT |
| benchmark | GitHub | vercel/next.js | https://github.com/vercel/next.js | 2016-10-05 | 2026-03-31 | 2026-03-31 | stars 138563, forks 30730 |
| benchmark | GitHub | shadcn-ui/ui | https://github.com/shadcn-ui/ui | 2023-01-04 | 2026-03-31 | 2026-03-31 | stars 111149, forks 8375 |
| benchmark | GitHub | TanStack/table | https://github.com/TanStack/table | 2016-10-20 | 2026-03-31 | 2026-03-31 | stars 27855, forks 3475 |
| benchmark | GitHub | TanStack/virtual | https://github.com/TanStack/virtual | 2020-05-08 | 2026-03-26 | 2026-03-31 | stars 6788, forks 426 |
| benchmark | GitHub | tailwindlabs/tailwindcss | https://github.com/tailwindlabs/tailwindcss | 2017-10-06 | 2026-03-27 | 2026-03-31 | stars 94236, forks 5149 |
| benchmark | GitHub | radix-ui/primitives | https://github.com/radix-ui/primitives | 2020-06-19 | 2026-02-13 | 2026-03-31 | stars 18693, forks 1133 |
| benchmark | GitHub | vercel/examples | https://github.com/vercel/examples | 2021-10-25 | 2026-03-31 | 2026-03-31 | stars 5001, forks 1722 |
| benchmark | GitHub | supabase/supabase-js | https://github.com/supabase/supabase-js | 2020-05-15 | 2026-03-31 | 2026-03-31 | stars 4374, forks 622 |
| benchmark | GitHub | microsoft/playwright | https://github.com/microsoft/playwright | 2019-11-15 | 2026-03-31 | 2026-03-31 | stars 85362, forks 5391 |
| benchmark | GitHub | vitest-dev/vitest | https://github.com/vitest-dev/vitest | 2021-12-03 | 2026-03-31 | 2026-03-31 | stars 16273, forks 1707 |

### ㅋ2. Benchmarked repo notes (요약)

- **vercel/next.js:** App Router·layout·서버 컴포넌트 생태 표준; 셸/세그먼트 설계 근거.  
- **shadcn-ui/ui:** 복사-붙여넣기 컴포넌트 + Tailwind; Sheet·Button 등 보드 UI 가속.  
- **TanStack/table:** 헤드리스 테이블 상태·정렬·선택 패턴; Grid 전환 전 단계에 적합.  
- **TanStack/virtual:** 대량 행 스크롤 성능; table 통합 예제는 공식 문서(별도 Evidence 버전 핀).  
- **tailwindcss:** 유틸리티 토큰 일관; shadcn 전제.  
- **radix-ui/primitives:** 접근 가능한 Sheet/Dialog primitives.  
- **vercel/examples:** 다양 Next 배포 패턴 레퍼런스.  
- **supabase-js:** Realtime 구독 클라이언트.  
- **playwright:** E2E 스모크 게이트.  
- **vitest:** 기존 단위 테스트와 정렬.

### ㅋ3. Glossary

- **board_state / HOLD:** `p1`·`v4` 용어.  
- **AMBER_BUCKET:** 날짜·정본 미확인 Evidence는 설계 확정 단독 근거로 쓰지 않음.  
- **마스터–디테일:** 좌 목록·우 상세 2열 IA.

---

## Implementation status (repo, 2026-04-01)

| Epic / PR (플랜 G3) | 상태 |
|---------------------|------|
| PR1 앱 셸 (`PageShell`, `OpsNav`, `app/(ops)/`) | ✅ |
| PR2 시맨틱 표 (`caption`, `scope`, HOLD 배지) | ✅ |
| PR3 상세 패널 + 행 선택 | ✅ |
| PR4 모바일 상세 (`<dialog>`) | ✅ (네이티브 dialog; shadcn Sheet는 PR8) |
| PR5 Realtime UX (행 flash / sync hint / reduced motion) | ✅ |
| PR6 TanStack Table + Virtual | ✅ |
| PR7 Playwright 스모크 + PostgREST 스텁 | ✅ |
| PR8 shadcn + Tailwind | ⏳ 미구현 |

상세 파일 경로·명령: [`docs/implementation/2026-04-01-work-board-ui-qa-status.md`](../implementation/2026-04-01-work-board-ui-qa-status.md).

---

## Plan verification (self-check, plan-verifier 스타일)

| Gate | Result |
|------|--------|
| 입력 3종(snapshot·ideas·evidence) | **PASS** (보고서 + 스카웃 SOT) |
| A~K + ㅋ 구조 | **PASS** |
| 파괴적 변경 dry-run / approval | **명시됨 (K4)** |
| 벤치마크 Evidence 필드 | **PASS** (GitHub API; star는 스냅샷) |
| AMBER 문서와 충돌 | **없음** — H51/APG/TanStack 문서는 확정 전 별도 스카웃 |

**종합:** **PASS (AMBER: 제품 외부 문서 일부는 후속 dated Evidence 권고: upgrade-report §8 유지).**

---

## JSON envelope (optional)

```json
{
  "plan_id": "layout-design-2026-03-31",
  "source_report": "docs/project-upgrade/2026-03-31-layout-design-project-upgrade-report.md",
  "option_track_default": "B",
  "epics": ["E-Shell", "E-MasterDetail", "E-A11y", "E-Realtime-UX", "E-Scale", "E-QA"],
  "flags": ["panel_query", "tailwind_optional"],
  "verification": "PASS_WITH_AMBER_FOLLOWUP_EVIDENCE"
}
```
