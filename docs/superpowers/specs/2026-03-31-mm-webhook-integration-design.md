# Design: mm.md 로직을 기존 WA Work Board 스파이크에 단계 이식

- **상태:** 초안 (브레인스토밍 확정본)
- **날짜:** 2026-03-31
- **근거 문서:** [mm.md](file:///c:/Users/jichu/Downloads/wa-message-ops-spike-0.1.0-standalone/mm.md), [AGENTS.md](file:///c:/Users/jichu/Downloads/wa-message-ops-spike-0.1.0-standalone/AGENTS.md), v4/v1 SQL 목표

## 1. 목표

- WAHA 웹훅 **공개 URL은 유지:** `POST /api/webhooks/waha` (운전·문서·계획서와 동일).
- **처리 순서·감사·파서 표현력**은 [mm.md](file:///c:/Users/jichu/Downloads/wa-message-ops-spike-0.1.0-standalone/mm.md)와 정합: raw 선저장 → 서명 검증(실패 시 raw 마킹) → 그룹만 진행 → normalize → parse → shipment **후보만** 조회 → work_item upsert → raw DONE.
- **금지:** 메시지 1건으로 `shipment_ref`의 비즈니스 진실(스테이지·문서 truth 등) 갱신 — mm 1621–1622행 및 AGENTS.md Fact-only / evidence 계약.

## 2. 현 DB vs mm.md 가정 (정합 표)

| 구분 | 현재 `0001` 스파이크 | mm.md / v1 방향 | 이식 전략 |
|------|----------------------|-----------------|-----------|
| `ops_private.wa_raw_event` PK | `message_id` (text) | `id` bigserial + `process_status`, `session_name`, `raw_headers`, `raw_payload`, `error_message`, `processed_at` 등 | **P1:** 새 테이블이 아니라 **확장 마이그레이션**: (권장) `id bigserial` 추가·`message_id` 유니크 보조, 또는 병행 `wa_raw_event_v2` 후 이전. 실무적 최소안은 **process_status / error_message / processed_at / session_name / raw_headers** 컬럼 추가 + PK 전환은 별 마이그레이션으로 분리. |
| Raw 저장 시점 | 서명 통과 후 upsert | **서명 전 insert** 후 실패 시 `REJECTED` | **핸들러 순서 변경** (코드). |
| `wa_message` | `raw_event_id` 없음 | `raw_event_id` FK, `group_name`, `is_group`, `participant_jid`, `has_media`, `payload` jsonb | **P2:** 컬럼 추가 + 백필 스크립트(선택). |
| `wa_message_parse` | 없음 | parse 결과 전용 | **P2:** 테이블 신설 (`ops_private`). |
| `public.shipment_ref` | 없음 (work_item에 `shipment_ref_id`만) | `findShipmentLink`가 조회하는 SSOT | **P2~P3:** `shipment_ref` 최소 스키마 추가(조회만); work_item은 **링크 ID만** 설정, 진실 컬럼은 메시지로 미갱신. |
| `work_item` | `board_state`·`event_status` text, `type_code`, `source_message_id` | mm의 `ParsedWorkCard`·merge 필드 더 많을 수 있음 | **P3:** 컬럼 추가는 최소화; 나머지는 `meta` jsonb. |
| 이력 | `work_item_status_history` (text columns) | mm과 호환 가능 | 유지, 트리거/앱에서만 기록. |

## 3. 아키텍처

- **단일 Route Handler:** `app/api/webhooks/waha/route.ts` (유지).
- **모듈 분해 (대형 단일 파일 금지):**
  - `lib/waha/signature.ts` — 헤더에서 서명 추출·검증 (mm `extractSignatureFromHeaders` / verify).
  - `lib/waha/normalize.ts` — `normalizeWahaPayload` (or 기존 normalize-event 병합).
  - `lib/waha/parser/` — `parse-work-card.ts`, `keywords.ts`, `shipment-candidates.ts`, `board-map.ts` 등으로 mm 키워드·우선순위 분리.
  - `lib/waha/db-ops.ts` (선택) — `insertRawEvent`, `markRawEvent`, `upsertWaMessage`, `upsertParseResult`, `findShipmentLink`, `upsertWorkItem` thin wrappers.
- **브라우저:** 읽기 전용 유지; 쓰기는 service_role only (기존 RLS 패턴).

## 4. 데이터 플로우 (대상)

1. `POST` raw body 읽기.
2. `insertRawEvent` — `process_status = NEW` (mm 패턴).
3. `verifyWebhookSignature` — 실패 시 `markRawEvent(REJECTED)` → 403.
4. JSON 파싱 실패 → `ERROR` → 400.
5. `normalize` — 비메시지/비그룹 → `IGNORED` + 200 ignore 응답.
6. `upsertWaMessage`.
7. `parseWorkCard`.
8. `findShipmentLink(candidates)` — 없으면 null.
9. `upsertParseResult`.
10. `upsertWorkItem` — shipment는 **id 매핑만**; canonical 스테이지 갱신 금지.
11. `markRawEvent(DONE)`.
12. 예외 시 `markRawEvent(ERROR, message)`.

## 5. 오류·보안

- **Idempotency:** `waha_message_id` 유니크 upsert 유지; raw는 mm처럼 매 요청 insert할지, `request_id` 중복 방지할지 **P1 결정** (권장: WAHA delivery id 또는 `message_id`+`received_at` 조합으로 멱등).
- **시크릿:** HMAC 키는 env만; 로그에 raw 전체 마스킹 정책은 후속.

## 6. 단계적 롤아웃 (마이그레이션 P1–P4)

| 단계 | 내용 | 완료 기준 |
|------|------|-----------|
| P1 | raw_event 감사 컬럼·상태·insert-first 핸들러 | 서명 실패 시 DB에 REJECTED 남음 |
| P2 | wa_message 확장 + wa_message_parse + (선택) shipment_ref | parse 행이 메시지당 1행 |
| P3 | work_item upsert를 mm merge/dedupe에 맞춤 | 회귀 테스트·fixture 통과 |
| P4 | UI 컬럼·Realtime 구독 필드 정합 | HOLD 보드 무결 |

## 7. 테스트

- 단위: `normalize`, `parseWorkCard`, `findShipmentLink`(mock DB), 서명 검증.
- 계약: “shipment 키워드만으로 `shipment_ref` 스테이지 컬럼이 바뀌지 않음” 부정 테스트.
- 통합: 샘플 WAHA payload 3–5건 (그룹/리플라이/서명 실패).

## 8. 비범위 (YAGNI)

- WhatsApp 자동 회신·reaction 발신.
- `mm.md`의 `/api/waha/webhook` **별도 라우트 추가** (문서 경로만 참고; 운영 URL 단일화).

## 9. 다음 단계 (브레인스토밝 체크아웃)

- 구현 전 **implementation plan**은 `writing-plans` 스킬로 P1→P4 작업 목록·파일 단위로 쪼갠다.
- 본 스펙 사용자 리뷰 후 변경 사항 반영 → 구현 시작.

## 10. 관련 구현 메모 (UI / QA)

- 웹훅과 별도로, **Work Board** 프런트(공유 셸, TanStack 가상 테이블, 상세 패널, Playwright 스모크) 상태는 [`../../implementation/2026-04-01-work-board-ui-qa-status.md`](../../implementation/2026-04-01-work-board-ui-qa-status.md) 에 정리됨.
