판정: **예 — `Vercel + Supabase` 조합으로 가는 것이 맞습니다. 다만 그대로 배포는 아니고, `patch 후 사용`이 맞습니다.** 

근거: 현재 설계는 `Shipment` 중심 진실원 + `WorkCard` 중심 운영보드의 2축 구조를 요구하고, 메시지는 business truth가 아니라 evidence로 다뤄야 합니다. 또한 Supabase는 `public` 노출 범위, RLS, Realtime 범위를 제한해야 하며, UI/Agent 쪽은 승인·로그·P2 분리를 기본 계약으로 둬야 합니다.   

다음행동: **Vercel은 UI/API/Agent 실행, Supabase는 DB/Realtime/Auth로 두고, `ops_private + public` 2-schema 구조로 바로 설계하십시오.** 

| No | Item         |                                     Value | Risk | Evidence                   |
| -- | ------------ | ----------------------------------------: | ---- | -------------------------- |
| 1  | Frontend/SSR |                        `Vercel + Next.js` | 낮음   | UI/Agent 실행·승인·로그 계약에 적합   |
| 2  | Core DB      |                       `Supabase Postgres` | 낮음   | 현 스키마 골격 유지 가능             |
| 3  | 공개 스키마       |                      `public.work_item*`만 | 중간   | raw/parse를 public에 두면 과노출  |
| 4  | 비공개 스키마      | `ops_private.wa_*`, `classification_rule` | 낮음   | private schema 분리 권장       |
| 5  | Realtime 범위  |  `work_item`, `work_item_status_history`만 | 중간   | raw/message/parse까지 열면 과함  |
| 6  | 서버 권한        |       `Vercel server only = service_role` | 높음   | 브라우저에 service_role 금지      |
| 7  | 브라우저 권한      |                              `anon + RLS` | 중간   | RLS 없이는 운영 금지 수준           |
| 8  | 운영 모델        |     `Shipment graph + Message Work Board` | 낮음   | 제품 정의 자체가 이 2축             |

추천 구조는 아래가 맞습니다.

```text
WhatsApp/WAHA webhook
  → Vercel Route Handler
  → ops_private.wa_raw_event
  → ops_private.wa_message
  → ops_private.wa_message_parse
  → public.work_item upsert
  → public.work_item_status_history
  → Supabase Realtime
  → Vercel UI Board
```

핵심 원칙은 4개입니다.

1. **제품 중심은 대시보드가 아니라 `Shipment + WorkCard`입니다.**
   `Shipment`는 business truth, `WorkCard`는 live execution anchor로 유지해야 합니다. 

2. **메시지는 evidence이지 최종 truth가 아닙니다.**
   예를 들어 `MSDS expired` 같은 메시지는 바로 document truth로 승격하지 말고 `DocumentException` 또는 `DocumentHold` 이벤트로 정규화한 뒤 검증해야 합니다. 

3. **Supabase는 전부 public로 두면 안 됩니다.**
   `ops_private.wa_raw_event`, `ops_private.wa_message`, `ops_private.wa_message_parse`, `ops_private.classification_rule`는 private에 두고, UI가 보는 최소 결과만 public에 둬야 합니다. 

4. **Vercel은 승인형 Agent/UI 계층으로 쓰는 편이 맞습니다.**
   툴 호출은 승인형으로 두고, 실행 요약·위험·승인/취소·실행 후 증거를 남기도록 설계해야 합니다. 

지금 기준으로 바로 확정할 최소안은 이렇습니다.

* **Vercel**

  * Next.js App Router
  * `app/api/waha/webhook/route.ts`
  * `app/api/work-board/route.ts`
  * `app/api/shipment-search/route.ts`
  * 승인형 작업 UI
* **Supabase**

  * `ops_private`: raw, normalized message, parse, rules
  * `public`: work_item, work_item_status_history, work_item_owner_history
  * Realtime: `work_item`, `work_item_status_history`
* **모델**

  * `Shipment` = 검색/추적 SSOT
  * `WorkCard` = 그룹채팅 기반 운영 tracking
* **보드 상태**

  * 화면 노출: `New / Assigned / In Progress / HOLD / Done`
  * 내부 상세: `WAITING_GATE / WAITING_DOC / WAITING_EQUIPMENT / WAITING_WEATHER` 등 2-Layer 유지 

즉, 결론만 압축하면 아래입니다.

* **베셀(Vercel)**: 써야 합니다. UI, API, 승인형 Agent 실행에 적합합니다.
* **슈파베이스(Supabase)**: 써야 합니다. 다만 `public 최소화 + RLS + limited Realtime`가 전제입니다.
* **금지**: raw WhatsApp 메시지와 parse 결과를 public에 두는 구조, 브라우저에서 `service_role` 사용, 메시지를 곧바로 shipment truth로 취급하는 구조.  

원하시면 다음 단계로 바로 **`Vercel + Supabase 최종 폴더 구조`** 또는 **`Supabase용 patched SQL`** 형태로 이어가겠습니다.
