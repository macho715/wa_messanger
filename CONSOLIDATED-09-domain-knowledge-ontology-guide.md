---
title: "HVDC Domain Knowledge Ontology Guide"
type: "ontology-authoring-guide"
domain: "project-logistics"
version: "2.00"
date: "2026-03-30"
status: "updated"
supersedes:
  - "CONSOLIDATED-08-communication.md"
reference_only:
  - "AGENTS.md"
source_basis:
  - "CONSOLIDATED-08-communication.md"
  - "Guideline_HVDC_Project_Lightning.txt"
  - "Guideline_DSV_Delivery.txt"
  - "Guideline_Jopetwil_71_Group.txt"
  - "Guideline_SHU_Logistics.txt"
  - "Guideline_MIR_Logistics.txt"
standards:
  - "RDF"
  - "OWL"
  - "SHACL"
  - "SPARQL"
  - "JSON-LD"
  - "PROV-O"
  - "Time Ontology"
  - "SKOS"
---

# HVDC Domain Knowledge Ontology Guide · v2.00

## Executive Summary

본 문서는 기존 `communication ontology` 중심 문서를 **HVDC 프로젝트 물류 전체 도메인 지식** 기준으로 확장한 **authoring guide**입니다.  
핵심 전환은 **메시지 중심 → 도메인 사실 중심**, **채팅 구조 → Shipment journey 구조**, **단일 그룹 규칙 → Program / Vessel / Delivery / Site execution 모듈 구조**입니다.  
이제 WhatsApp·Email은 SSOT가 아니라 **Evidence Layer**로 위치시키고, 상위에는 **Shipment, Route, Stage, Site, Cargo, Document, Approval, Risk, Action, KPI**를 둡니다.  
문서 목적은 향후 어떤 도메인 문서를 작성하더라도 동일한 ontology grammar로 정렬되도록 하는 것입니다.

---

## 1. 이번 업데이트의 판정

### 1.1 무엇을 바꿨는가

기존 `CONSOLIDATED-08-communication.md`는 Email / WhatsApp 메시지를 온톨로지적으로 정리한 문서였습니다.  
이번 버전은 그 구조를 유지하되, 상위 축을 아래처럼 재편했습니다.

1. **Communication Layer는 유지**  
   다만 business truth가 아니라 evidence / provenance 역할로 한정

2. **Program-wide logistics journey를 상위 축으로 승격**  
   `Origin → Port / Air Entry → Customs → Warehouse → MOSB / Offshore Leg → Site Delivery`

3. **운영방별 특색을 Domain Module로 분리**  
   - `[HVDC] Project Lightning` = Program control tower
   - `Jopetwil 71 Group` = Vessel ops
   - `DSV Delivery` = Delivery execution
   - `SHU / MIR` = Site receiving execution
   - `Abu Dhabi Logistics` = Dispatch orchestration

4. **No Shipment Evaluation Rule 명문화**  
   승인된 business formula 없으면 score / grade / rating을 ontology truth로 두지 않음

5. **Journey-first / History-first / Traceability-first**를 문서 작성 원칙으로 고정

### 1.2 이 문서의 위치

이 문서는 다음 3가지 용도로 사용합니다.

- 새로운 ontology spec 초안 작성 기준
- 향후 SSOT / JSON-LD / SHACL / SPARQL 설계 기준
- WhatsApp / Email / Dashboard / Excel / WMS / S-PMIS 지식 정규화 기준

---

## 2. 최상위 설계 원칙

## 2.1 Journey-first

도메인 모델은 항상 **full shipment journey**를 먼저 보여야 합니다.  
Warehouse는 전체 chain의 한 stage일 뿐이며, ontology의 중심이 되어서는 안 됩니다.

**기본 chain**

`Origin → Port / Air Entry → Customs → Warehouse → MOSB / Offshore Leg → Site Delivery`

**확장 chain 예시**

- `Origin → Port Entry → Customs → Warehouse → MW4 → Vessel → AGI Jetty → Site`
- `Vendor Yard → Stuffing → Freeport → Site Offloading`
- `Warehouse → Backload → MOSB → Vessel Return`

## 2.2 Fact-only

승인된 business rule이 없는 한 아래는 ontology truth로 두지 않습니다.

- shipment score
- shipment grade
- arbitrary health score
- 임의 traffic light judgment

허용되는 것은 다음입니다.

- factual stage
- factual location
- timestamps
- dwell / leadtime
- next stage
- source confidence
- record gap note

## 2.3 History-first

검색이나 detail view가 현재 상태만 보여주면 안 됩니다.  
반드시 아래 질문에 답할 수 있어야 합니다.

- 어디서 왔는가
- 지금 어디 있는가
- 다음 어디로 가야 하는가
- 그 전에 어떤 일이 있었는가
- 어느 stage가 아직 pending인가

## 2.4 Communication-is-Evidence

WhatsApp / Email / 전화 메모는 **사실을 생성하는 source**가 아니라,  
정규화된 사실을 뒷받침하는 **evidence / provenance object**로 다룹니다.

예시:

- 메시지: “No gate pass at security”
- ontology truth:
  - `GateEntryIssue` event 발생
  - 관련 `Truck`, `Site`, `Time`, `Owner`, `ExpectedRelease` 기록
  - 원문 메시지는 `prov:wasDerivedFrom`로 연결

## 2.5 Public stage language

내부 shorthand보다 public shipment language를 우선합니다.

권장:

- Origin
- Port / Air Entry
- Customs
- Warehouse
- MOSB / Offshore
- Site Delivery
- Current Stage
- Next Stage
- Route Type

비권장:

- warehouse-only shorthand를 상위 개념처럼 사용하는 표현
- group slang를 canonical class name으로 승격하는 방식

## 2.6 No hardcoded business truth

site list, vendor list, stage labels, KPI thresholds, route labels, delivery rules는  
ontology text에 설명은 가능하지만 application truth는 별도 config / API / DB view / vocabulary registry가 소유해야 합니다.

---

## 3. 문서 작성 범위와 경계

## 3.1 이 guide가 다루는 것

- shipment journey
- route / leg / stage
- vessel / vehicle / equipment
- site / port / yard / warehouse
- cargo / package / case / container / CCU
- document / approval / compliance
- risk / exception / action / decision
- KPI / SLA / evidence / provenance
- communication normalization

## 3.2 이 guide가 직접 다루지 않는 것

- UI 배치 상세
- dashboard component 구현
- React / Next.js coding pattern
- exact database DDL
- vendor-specific commercial secrets
- 승인되지 않은 score model

## 3.3 모델링 단위

이 문서에서 ontology authoring의 최소 단위는 아래 6개입니다.

1. **Entity**: 사물 / 객체 / 문서 / 장소 / 주체
2. **Event**: 발생 사실
3. **State**: 현재 상태
4. **Rule**: 검증 / 정책 / 제약
5. **Evidence**: 메시지 / 파일 / 사진 / 로그
6. **Metric**: KPI / SLA / dwell / leadtime

---

## 4. 상위 Ontology Layer

## 4.1 Layer 구조

| Layer | 목적 | 대표 클래스 |
|---|---|---|
| L1. Core Domain | 프로젝트 물류의 본질 엔터티 | Shipment, CargoUnit, Site, Vessel, Document |
| L2. Process & Event | 실제 운영 과정과 상태전이 | PortEntry, GateEntry, Loading, Offloading, Delivery |
| L3. Compliance & Control | 승인·증빙·리스크·SLA | Approval, Permit, RiskEvent, KPIRecord, SLAClock |
| L4. Evidence & Provenance | 메시지·이메일·첨부·원문 근거 | Message, EmailMessage, ChatMessage, Attachment |
| L5. Vocabulary & Identity | 표준명·Alias·Code 정규화 | Alias, CanonicalId, SKOS Concept |
| L6. Integration Mapping | 외부 시스템 연결 | FMCSRecord, SPMISRecord, WMSRecord, DashboardViewRef |

## 4.2 핵심 원칙

- **Domain fact는 L1/L2에 둔다**
- **규정과 검증은 L3에 둔다**
- **원문은 L4에 둔다**
- **Alias와 naming은 L5에 둔다**
- **시스템 연결은 L6에 둔다**

---

## 5. Domain Module 분해

## 5.1 Program Control Tower Module

근거 방: `[HVDC] Project Lightning`

주요 개념:

- multi-vessel coordination
- cross-site prioritization
- backload / empty CCU circulation
- OSDR / S-PMIS tracking
- urgent escalation

대표 클래스:

- `ProgramControlRoom`
- `ProgramDecision`
- `PriorityDecision`
- `BackloadRequirement`
- `CrossSiteConstraint`
- `StatusStamp`

대표 이벤트:

- `VesselSitrepPosted`
- `SiteExceptionEscalated`
- `BackloadRequested`
- `OSDRUploaded`
- `PriorityReassigned`

## 5.2 Dispatch Orchestration Module

근거 방: `Abu Dhabi Logistics`

주요 개념:

- daily dispatch control
- crane / FLIFT allocation
- gate / pass / inspection coordination
- yard congestion control
- D-1 plan enforcement

대표 클래스:

- `DispatchBoard`
- `EquipmentRequest`
- `GateAccessIssue`
- `InspectionHold`
- `YardCapacityAlert`

## 5.3 Vessel Ops Module

근거 방: `Jopetwil 71 Group`

주요 개념:

- MW4 loading
- AGI West Harbor Jetty#3 offloading
- tide-window execution
- manifest / pre-arrival
- FW / MGO / provision
- CEP / vetting state

대표 클래스:

- `VesselVoyage`
- `PortCall`
- `BerthWindow`
- `TideRestriction`
- `ManifestPackage`
- `MarineSupportRequirement`

대표 이벤트:

- `LoadingStarted`
- `LoadingCompleted`
- `BerthingGranted`
- `AnchorageStandby`
- `OffloadingSuspendedByTide`
- `ProvisionRequested`

## 5.4 DSV Execution Module

근거 방: `DSV Delivery`

주요 개념:

- stuffing / stripping
- yard↔jetty shuttle
- gate pass / NOC / entry-exit
- trailer rotation
- damaged box / dunnage / OSDR
- customs / document exception

대표 클래스:

- `DeliveryExecution`
- `TrailerAllocation`
- `GatePass`
- `NOCRecord`
- `TrailerRotationPlan`
- `PackingDefect`
- `DocumentException`

대표 이벤트:

- `StuffingPlanned`
- `GateIssueDetected`
- `OffloadingWaitingForForklift`
- `TrailerReleased`
- `RepackingOrdered`

## 5.5 Site Receiving Module

근거 방: `SHU Logistics`, `MIR Logistics`

주요 개념:

- receiving readiness
- warehouse capacity
- indoor / outdoor decision
- material issuance
- partial delivery / hold at DSV
- heavy cargo / night unloading / special permit

대표 클래스:

- `SiteReceivingRoom`
- `ReceivingReadiness`
- `WarehouseSpaceState`
- `MaterialIssuance`
- `PartialDeliveryDecision`
- `HoldRecommendation`
- `SpecialOperationPermit`

대표 이벤트:

- `MaterialArrivedAtSite`
- `UnloadingStarted`
- `UnloadingCompleted`
- `WarehouseFullAlert`
- `DocumentRequested`
- `HeavyLiftSupportRequested`

## 5.6 Communication Module

근거 문서: `CONSOLIDATED-08-communication.md`

주요 개념:

- WhatsApp / Email / command
- thread / message / attachment
- tag / intent / action request
- message-to-task extraction

대표 클래스:

- `CommunicationAction`
- `EmailMessage`
- `ChatMessage`
- `Attachment`
- `Intent`
- `Tag`
- `ActionRequest`

중요: 이 모듈은 **상위 truth module을 지원**해야 하며, 상위 truth를 대체하면 안 됩니다.

---

## 6. Canonical Journey Model

## 6.1 Core Journey

| Seq | Stage | 설명 | 대표 엔터티 |
|---|---|---|---|
| 1 | Origin | Vendor / Factory / Supplier Yard | OriginSite, Vendor |
| 2 | Port or Air Entry | 입항 / 공항 반입 | EntryPort, EntryTerminal |
| 3 | Customs | BOE / clearance / inspection | CustomsProcess |
| 4 | Warehouse | indoor / outdoor / laydown / issue | Warehouse, YardZone |
| 5 | MOSB / Offshore Leg | barge / LCT / offshore shuttle | VesselVoyage, OffshoreLeg |
| 6 | Site Delivery | final receiving / unloading / issuance | SiteDelivery, ReceivingEvent |

## 6.2 Optional Branch

도메인에 따라 stage는 선택적으로 생략되거나 반복될 수 있습니다.

예시:

- `Origin → Freeport → Site`
- `Warehouse → MW4 → JPT71 → AGI Jetty → Site`
- `Site → Backload → MOSB → Warehouse`

따라서 ontology에서는 fixed column보다 다음 구조가 안전합니다.

- `Shipment`
  - `hasRouteType`
  - `hasLeg`
  - `hasCurrentStage`
  - `hasNextStage`
  - `hasMovementHistory`

## 6.3 Route Type 예시

- `DirectInland`
- `PortToSite`
- `WarehouseToSite`
- `WarehouseToOffshoreToSite`
- `BackloadReturn`
- `SiteToWarehouseReturn`

---

## 7. Canonical Entity Model

## 7.1 Core Business Entities

| Class | 정의 | 예시 |
|---|---|---|
| `Shipment` | 추적 가능한 상위 물류 단위 | SCT SHIP NO 기준 이동 단위 |
| `CargoUnit` | 운송되는 실물 단위 | HCS, Wall panel, cable drum |
| `PackageUnit` | 포장 / case / packing 단위 | Case No, Package No |
| `ContainerUnit` | FR / OT / SOC / CCU / Basket | OT 40ft, Empty CCU |
| `TransportAsset` | 이동 수단 / 운송 장비 | Trailer, Vessel, Forklift |
| `Site` | 프로젝트 site / port / yard / warehouse | SHU, MIR, AGI, MOSB |
| `Document` | 공식 문서 | BL, CIPL, DO, BOE, MSDS |
| `Approval` | 허가 / 검증 / 유효성 단위 | TPI, FANR, Gate pass |
| `RiskEvent` | 리스크 또는 차질 사건 | High tide hold, Gate issue |
| `ActionItem` | 요청 / 지시 / 할당 | submit gate pass, book crane |
| `KPIRecord` | 측정 지표 | SLA hit, dwell days |

## 7.2 Person과 Role 분리

사람 이름을 role과 섞지 않습니다.

- `Person`: 정상욱, Roy Kim, Shariff
- `Role`: ProgramLead, VesselOpsLead, DSVFocal, SiteReceivingFocal
- `Organization`: SCT, DSV, ALS, OFCO, UPC

권장 속성:

- `hasRole`
- `belongsToOrg`
- `actsInContext`
- `assignedTo`

## 7.3 Site의 세분화

`Site`는 한 종류가 아닙니다. 아래 하위 분류를 둡니다.

- `ProjectSite`
- `PortSite`
- `Harbor`
- `Jetty`
- `Warehouse`
- `LaydownArea`
- `VendorYard`

예시:

- `AGI West Harbor Jetty#3` = `Jetty`
- `MW4` = `PortSite` 또는 `Wharf`
- `DSV Al Markaz` = `Warehouse`
- `MOSB` = `OffshoreSupplyBase`
- `GCC Yard` = `VendorYard` 또는 `StorageYard`

---

## 8. Identity Model

## 8.1 Canonical Key 원칙

동일 실체를 여러 key로 찾을 수 있어야 합니다.

### Shipment Identity

- `SCT SHIP NO`
- `HVDC Reference`
- `Shipment Invoice No`
- `BL Ref`
- `CI Ref`

### Package Identity

- `Packing No`
- `Package No`
- `Case No`
- `Bundle No`

### Transport Identity

- `Container No`
- `CCU No`
- `Trailer No`
- `Vessel / Voyage No`

### Location Identity

- `Site Code`
- `Port / Wharf / Jetty Name`
- `Warehouse Zone`

## 8.2 Multi-Key Identity Graph

동일 실체는 아래 패턴으로 resolve 합니다.

`Any Key In → Alias Resolve → Canonical Entity → Link to History`

예시:

- 메시지에서 `J71`, `JPTW71`, `Jopetwil 71`가 나오면 모두 `LCT Jopetwil 71`로 resolve
- `vp24`, `VP-24`, `MOSB`는 controlled vocabulary에서 관계 정의
- `AGI`, `AGI West Harbor`, `Jetty#3`는 상하위 location graph로 연결

## 8.3 Alias Model

권장 클래스:

- `Alias`
- `CanonicalName`
- `NameVariant`
- `CodeVariant`

권장 속성:

- `hasAlias`
- `canonicalName`
- `aliasType`
- `normalizedTo`

---

## 9. Event and State Model

## 9.1 Event-first 원칙

“loading”, “offloading”, “gate issue”, “document hold”는 단순 키워드가 아니라 **Event**로 모델링합니다.

예시:

- `GateIssueDetected`
- `ManifestPending`
- `CraneDelayed`
- `OffloadingStarted`
- `WarehouseFullAlert`
- `BackloadRequested`

## 9.2 State와 Event의 구분

- Event = 언제 무엇이 발생했는가
- State = 현재 어떤 상태인가

예시:

- Event: `OffloadingStarted at 2026-03-28 08:30 GST`
- State: `currentStage = Offloading`

## 9.3 Plan / Actual / Issue / Decision 분리

운영 문서를 쓸 때 아래 4개를 반드시 구분합니다.

| 구분 | 의미 | 예시 |
|---|---|---|
| `Plan` | 예정 | D-1 delivery plan |
| `Actual` | 실제 발생 | unloading started |
| `Issue` | 차질 / blocker | no gate pass |
| `Decision` | 승인 / 우선순위 변경 | hold at DSV |

이 4개를 같은 문장에 섞어 쓰지 않습니다.

## 9.4 Time Window

특히 vessel ops와 site unloading은 `TimeWindow`가 중요합니다.

예시:

- `BerthWindow`
- `TideWindow`
- `GateWindow`
- `UnloadingWindow`
- `DocumentValidityWindow`

권장 속성:

- `windowStart`
- `windowEnd`
- `validUntil`
- `expectedResumeTime`

---

## 10. Compliance and Document Model

## 10.1 Document Class 분류

| Class | 예시 |
|---|---|
| `CommercialDocument` | CI, PL, Invoice |
| `TransportDocument` | BL, DO, Manifest |
| `CustomsDocument` | BOE |
| `SafetyDocument` | MSDS, lifting method |
| `QualityDocument` | Test Report, IRN |
| `PermitDocument` | Gate pass, FANR approval, CICPA pass |
| `InspectionCertificate` | TPI, TÜV, Mulkiya |

## 10.2 Approval Class 분류

- `GateApproval`
- `LiftingApproval`
- `MarineApproval`
- `CustomsApproval`
- `SecurityApproval`
- `ComplianceApproval`

## 10.3 Validity 상태

모든 approval / certificate는 validity state를 가집니다.

- `Valid`
- `ExpiringSoon`
- `Expired`
- `Pending`
- `Rejected`

## 10.4 Message에서 Document로 바로 승격하지 않는 원칙

메시지에 “MSDS expired”가 있다고 해서 바로 최종 truth로 두지 않습니다.

권장 흐름:

1. 메시지 evidence 확보
2. `DocumentException` event 생성
3. 관련 `Document`와 `Approval` 연결
4. 상태 검증 후 truth update

---

## 11. Risk, Exception, Action Model

## 11.1 RiskEvent 기본형

| RiskEvent | 대표 Trigger |
|---|---|
| `WeatherDelay` | fog, wind, rain |
| `TideRestriction` | high tide |
| `BerthCongestion` | harbor full, jetty occupied |
| `GateAccessIssue` | no email, no gate pass |
| `EquipmentDelay` | forklift late, crane absent |
| `DocumentHold` | BOE / DO / MSDS / FANR pending |
| `WarehouseCapacityRisk` | indoor full |
| `DamageDetected` | crack, poor dunnage |
| `RouteChangeRisk` | ALS / shipping change |
| `CustomsSerialRisk` | serial no. not visible |

## 11.2 ActionItem 기본형

- `SubmitGatePass`
- `BookCrane`
- `ShareManifest`
- `UpdateSITREP`
- `UploadOSDR`
- `HoldAtDSV`
- `ApprovePartialDelivery`
- `ArrangeBackload`
- `RequestForklift`
- `EscalateToLead`

## 11.3 Decision Entity

문서 작성 시 “결정”은 별도 class로 두는 것이 안전합니다.

예시:

- `PriorityDecision`
- `HoldDecision`
- `ReassignmentDecision`
- `RouteDecision`
- `PermitExceptionDecision`

권장 속성:

- `decidedBy`
- `decisionTime`
- `decisionReason`
- `affectsShipment`
- `affectsSite`

---

## 12. KPI and SLA Model

## 12.1 KPI는 도메인별로 분리

### Program KPI
- SITREP On-time
- Empty CCU Return Rate
- Site Exception Escalation Time

### Vessel KPI
- Tide suspension pre-alert rate
- Anchorage standby reason completeness
- Manifest pre-arrival completeness

### DSV KPI
- Gate first-pass success
- Truck arrival to offloading start
- 2nd trip completion

### Site KPI
- Delivery plan on-time
- Receiving update completeness
- Document completeness
- Warehouse risk pre-alert

## 12.2 SLAClock

Message나 Action에 SLA를 붙일 수 있으나, business truth는 아래처럼 분리합니다.

- `SLAClock`
- `KPIRecord`
- `ResponseMetric`

예시:

- `[URGENT]` 메시지 → `SLAClock`
- 실제 first response 8분 → `KPIRecord`

---

## 13. Evidence and Provenance Model

## 13.1 Evidence Layer 구성

| Class | 설명 |
|---|---|
| `ChatMessage` | WhatsApp / Telegram 원문 |
| `EmailMessage` | 이메일 원문 |
| `Attachment` | PDF, image, screenshot |
| `PhotoEvidence` | 현장 사진 |
| `SpreadsheetEvidence` | Excel / CSV source |
| `DashboardEvidence` | dashboard snapshot |
| `ManualNote` | 현장 메모 |

## 13.2 Provenance 연결

권장 표준:

- `prov:wasDerivedFrom`
- `prov:generatedAtTime`
- `prov:wasAssociatedWith`
- `prov:actedOnBehalfOf`

예시:

- `GateIssueDetected` prov:wasDerivedFrom `ChatMessage_2025_01_21_0913`
- `ShipmentState` prov:wasDerivedFrom `DashboardRecord_2026_03_28`

## 13.3 Confidence 분리

“확률”과 “근거 강도”를 섞지 않습니다.

권장 속성:

- `confidenceLevel`
- `sourceSystem`
- `sourceCount`
- `verificationState`
- `recordGapNote`

---

## 14. Communication Authoring Rule

## 14.1 메시지를 그대로 ontology class로 만들지 말 것

예시:

- 나쁜 예: `PleaseArrangeGatePassClass`
- 좋은 예: `GatePassRequest`

## 14.2 태그는 metadata이지 본질 class가 아님

`[URGENT]`, `[ACTION]`은 중요하지만, 이것이 shipment의 본질이 되면 안 됩니다.

- `Tag` = message metadata
- `ActionItem` = business object
- `RiskEvent` = operational object

## 14.3 채팅방 = Domain Context

채팅방은 진실 자체가 아니라 **context boundary**입니다.

예시:

- `[HVDC] Project Lightning` = `ProgramControlRoom`
- `Jopetwil 71 Group` = `VesselOpsRoom`
- `DSV Delivery` = `DeliveryExecutionRoom`
- `SHU Logistics` = `SiteReceivingRoom`
- `MIR Logistics` = `SiteReceivingRoom`

## 14.4 원문 표현의 정규화

예시:

- “no email at security” → `GateAccessIssue`
- “high tide stop” → `TideRestriction`
- “hold at DSV” → `HoldDecision`
- “waiting forklift” → `EquipmentDelay`
- “manifest not shared” → `DocumentHold`

---

## 15. Domain Writing Rule for Future Documents

## 15.1 문장 작성 순서

도메인 문장은 아래 순서로 작성합니다.

1. **Entity**
2. **Stage or Event**
3. **Time**
4. **Location**
5. **Constraint**
6. **Next Action**
7. **Evidence**

예시:

`Shipment HVDC-XXX는 2026-03-28 08:30 GST에 MOSB에서 OffloadingStarted 되었으며, Forklift delay가 constraint이고, next action은 Crane reallocation이다. Evidence는 WhatsApp message + photo이다.`

## 15.2 문서 섹션 순서

새 ontology guide 또는 module spec는 아래 순서를 권장합니다.

1. Executive Summary
2. Business Scope
3. Journey Model
4. Core Classes
5. Core Properties
6. Event Model
7. Document / Compliance Model
8. Risk / Action Model
9. Evidence / Provenance
10. Validation Rules
11. Example Data
12. Query Examples
13. Change Log

## 15.3 반드시 분리해야 하는 것

- Person vs Role
- Cargo vs Package vs Shipment
- Plan vs Actual vs Issue vs Decision
- Fact vs Evidence
- State vs Event
- Site vs Port vs Warehouse vs Jetty

---

## 16. Controlled Vocabulary 설계 기준

## 16.1 Site Vocabulary

권장 namespace:

- `/sites/AGI-West-Harbor`
- `/sites/MW4`
- `/sites/MOSB`
- `/sites/DAS-Island`
- `/sites/GCC-yard`
- `/sites/SHU`
- `/sites/MIR`

## 16.2 Asset Vocabulary

- `Crane-100T`
- `Forklift-10T`
- `A-frame trailer`
- `Wheel loader`
- `Telehandler`
- `LCT Jopetwil 71`

## 16.3 Cargo Vocabulary

- `Aggregate-5mm`
- `Aggregate-10mm`
- `Aggregate-20mm`
- `Dune sand`
- `HCS`
- `Wall panel`
- `Cable drum`
- `Transformer oil`
- `CCU`

## 16.4 Approval Vocabulary

- `Gate pass`
- `TPI`
- `TÜV`
- `MWS`
- `Lifting Plan`
- `FANR approval`
- `CICPA pass`
- `Mulkiya`

## 16.5 Status Vocabulary

- `Planned`
- `Confirmed`
- `InProgress`
- `OnHold`
- `Completed`
- `PendingDocument`
- `PendingBerth`
- `WaitingEquipment`
- `WaitingGate`
- `Returned`
- `Damaged`

---

## 17. SHACL Authoring Rules

## 17.1 ShipmentShape

필수:

- canonical shipment id
- current stage
- current location
- source system or evidence
- last confirmed timestamp

## 17.2 EventShape

필수:

- event type
- event time
- related shipment or cargo
- occurred at site/port
- owner or responsible role

## 17.3 DeliveryPlanShape

DSV / SHU / MIR에서 공통으로 요구:

- item or case ref
- trailer qty / type
- delivery time
- site
- equipment readiness
- document status
- owner
- next action

## 17.4 VesselSitrepShape

필수:

- vessel
- location
- ETA / ETD
- berth or anchorage
- cargo
- constraint
- next action

## 17.5 CostShape

필수:

- amount (2-dec)
- currency
- cost type
- linked shipment or movement
- evidence

## 17.6 ApprovalShape

필수:

- approval type
- status
- valid from / until
- linked cargo / shipment / site
- evidence

---

## 18. Example Turtle

```ttl
@prefix hvdc: <https://example.com/hvdc#> .
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix time: <http://www.w3.org/2006/time#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

hvdc:shipment_HVDC_AGI_001 a hvdc:Shipment ;
    hvdc:canonicalId "HVDC-AGI-001" ;
    hvdc:hasRouteType hvdc:WarehouseToOffshoreToSite ;
    hvdc:hasCurrentStage hvdc:Offloading ;
    hvdc:hasCurrentLocation hvdc:AGI_West_Harbor_Jetty3 ;
    hvdc:hasNextStage hvdc:SiteDelivery ;
    hvdc:lastConfirmedAt "2026-03-28T08:30:00+04:00"^^xsd:dateTime ;
    hvdc:hasEvidence hvdc:msg_20260328_0830 ;
    hvdc:hasRisk hvdc:risk_high_tide_01 .

hvdc:event_offloading_start_01 a hvdc:OffloadingStarted ;
    hvdc:affectsShipment hvdc:shipment_HVDC_AGI_001 ;
    hvdc:occurredAt hvdc:AGI_West_Harbor_Jetty3 ;
    hvdc:eventTime "2026-03-28T08:30:00+04:00"^^xsd:dateTime ;
    prov:wasDerivedFrom hvdc:msg_20260328_0830 .

hvdc:risk_high_tide_01 a hvdc:TideRestriction ;
    hvdc:affectsShipment hvdc:shipment_HVDC_AGI_001 ;
    hvdc:expectedResumeTime "2026-03-29T07:30:00+04:00"^^xsd:dateTime ;
    prov:wasDerivedFrom hvdc:msg_20260328_0915 .

hvdc:msg_20260328_0830 a hvdc:ChatMessage ;
    hvdc:messageChannel hvdc:WhatsApp ;
    hvdc:messageFrom hvdc:OpsLead ;
    hvdc:projectTag "JPT71" ;
    hvdc:hasTag hvdc:ETA ;
    hvdc:hasTag hvdc:ACTION .
```

---

## 19. Example SHACL

```ttl
hvdc:ShipmentShape a sh:NodeShape ;
    sh:targetClass hvdc:Shipment ;
    sh:property [
        sh:path hvdc:canonicalId ;
        sh:datatype xsd:string ;
        sh:minCount 1
    ] ;
    sh:property [
        sh:path hvdc:hasCurrentStage ;
        sh:minCount 1
    ] ;
    sh:property [
        sh:path hvdc:hasCurrentLocation ;
        sh:minCount 1
    ] ;
    sh:property [
        sh:path hvdc:lastConfirmedAt ;
        sh:datatype xsd:dateTime ;
        sh:minCount 1
    ] .

hvdc:VesselSitrepShape a sh:NodeShape ;
    sh:targetClass hvdc:VesselSitrep ;
    sh:property [ sh:path hvdc:hasVessel ; sh:minCount 1 ] ;
    sh:property [ sh:path hvdc:eta ; sh:datatype xsd:dateTime ; sh:minCount 1 ] ;
    sh:property [ sh:path hvdc:etd ; sh:datatype xsd:dateTime ; sh:minCount 0 ] ;
    sh:property [ sh:path hvdc:hasConstraint ; sh:minCount 0 ] ;
    sh:property [ sh:path hvdc:hasNextAction ; sh:minCount 1 ] .

hvdc:CostItemShape a sh:NodeShape ;
    sh:targetClass hvdc:CostItem ;
    sh:property [
        sh:path hvdc:hasAmount ;
        sh:datatype xsd:decimal ;
        sh:pattern "^[0-9]+(\\.[0-9]{2})$" ;
        sh:minCount 1
    ] ;
    sh:property [
        sh:path hvdc:hasCurrency ;
        sh:in ( "USD" "AED" ) ;
        sh:minCount 1
    ] .
```

---

## 20. Example SPARQL

## 20.1 현재 stage별 shipment 수

```sparql
SELECT ?stage (COUNT(?s) AS ?cnt)
WHERE {
  ?s a hvdc:Shipment ;
     hvdc:hasCurrentStage ?stage .
}
GROUP BY ?stage
ORDER BY DESC(?cnt)
```

## 20.2 특정 shipment의 이동 이력

```sparql
SELECT ?event ?time ?loc
WHERE {
  ?event hvdc:affectsShipment hvdc:shipment_HVDC_AGI_001 ;
         hvdc:eventTime ?time ;
         hvdc:occurredAt ?loc .
}
ORDER BY ?time
```

## 20.3 gate issue open 목록

```sparql
SELECT ?truck ?site ?owner ?time
WHERE {
  ?e a hvdc:GateAccessIssue ;
     hvdc:hasStatus hvdc:Open ;
     hvdc:relatesToTruck ?truck ;
     hvdc:occurredAt ?site ;
     hvdc:eventTime ?time ;
     hvdc:assignedTo ?owner .
}
ORDER BY ?time
```

## 20.4 empty CCU 회수 대기 목록

```sparql
SELECT ?ccu ?site ?nextVessel ?reason
WHERE {
  ?ccu a hvdc:ContainerUnit ;
       hvdc:containerType hvdc:CCU ;
       hvdc:hasState hvdc:ReadyForBackload ;
       hvdc:currentLocation ?site ;
       hvdc:plannedNextVessel ?nextVessel ;
       hvdc:blockingReason ?reason .
}
```

---

## 21. Authoring Anti-Pattern

다음은 피해야 합니다.

1. **채팅방 이름을 class로 직접 승격**
   - 방 이름은 context일 뿐

2. **warehouse-centric top model**
   - project 전체 journey를 가림

3. **score / grade / red-amber-green를 business truth처럼 정의**
   - 승인 rule 없으면 금지

4. **사람 이름을 role처럼 사용**
   - 인사 변경 시 ontology 붕괴

5. **message text를 canonical property로 저장**
   - normalize된 event / state / action으로 전환 필요

6. **plan과 actual 혼합**
   - KPI / audit 불가능

7. **document mention과 actual document validity 혼합**
   - compliance 오류 유발

8. **site, port, jetty, warehouse 구분 생략**
   - route / stage 질의 실패

9. **alias 표준화 누락**
   - J71, JPT71, Jopetwil 71 중복 entity 발생

10. **evidence 없는 final truth 선언**
    - provenance 부재

---

## 22. 구현 우선순위

## Phase 1. Core Vocabulary and Identity
- Site / Vessel / Shipment / Cargo / Document / Approval / Risk / Action
- alias registry
- canonical id registry

## Phase 2. Journey and Event Model
- stage model
- route_type
- movement history
- plan / actual / issue / decision 분리

## Phase 3. Communication and Evidence Binding
- WhatsApp / Email normalization
- attachment / photo / spreadsheet provenance
- message-to-event extraction

## Phase 4. Validation and Query
- SHACL core shapes
- SPARQL operational queries
- data quality / confidence model

## Phase 5. Integration
- FMCS / S-PMIS / WMS / Dashboard / Excel mapping
- API / DB / config ownership 분리
- automation hooks

---

## 23. 향후 문서 업데이트 규칙

앞으로 도메인 문서를 업데이트할 때는 아래 체크리스트를 통과해야 합니다.

### 23.1 구조 체크

- [ ] 문서가 message-centric가 아니라 domain-centric인가
- [ ] full shipment journey가 보이는가
- [ ] plan / actual / issue / decision이 분리되는가
- [ ] site / port / warehouse / jetty가 분리되는가
- [ ] communication이 evidence layer로 내려갔는가

### 23.2 품질 체크

- [ ] canonical id가 정의되었는가
- [ ] alias 정규화가 있는가
- [ ] source confidence 또는 evidence가 있는가
- [ ] no hardcoded business truth 원칙을 지켰는가
- [ ] score / grade / arbitrary evaluation이 제거되었는가

### 23.3 운영 체크

- [ ] Program module이 존재하는가
- [ ] Vessel ops module이 존재하는가
- [ ] DSV execution module이 존재하는가
- [ ] Site receiving module이 존재하는가
- [ ] document / approval / compliance가 별도 모듈화 되었는가

---

## 24. Change Log

### v2.00 — 2026-03-30
- 기존 `communication ontology`를 `domain knowledge ontology guide`로 확장
- `AGENTS.md`의 journey-first / history-first / no score / no hardcode 원칙을 **참조 규칙**으로 편입
- `[HVDC] Project Lightning`, `Jopetwil 71 Group`, `DSV Delivery`, `SHU`, `MIR`에서 확인된 운영 패턴을 module 구조로 반영
- Communication Layer를 evidence / provenance 역할로 재정의
- Shipment / Route / Stage / Risk / Action / KPI / Document / Approval 중심의 상위 ontology grammar로 전환

### v1.00
- `CONSOLIDATED-08-communication.md` 기반 communication ontology 중심 문서

---

## 25. 결론

향후 HVDC 도메인 문서는 “무슨 메시지가 오갔는가”보다  
“어떤 shipment / cargo / site / route / document / risk / decision이 존재했는가”를 먼저 써야 합니다.  

즉, ontology authoring의 기본 질문은 아래 7개로 고정합니다.

1. **무엇이 이동하는가**
2. **어디서 어디로 가는가**
3. **지금 어느 stage인가**
4. **무슨 event가 발생했는가**
5. **무슨 document / approval이 연결되는가**
6. **무슨 risk / action / decision이 따라오는가**
7. **그 사실의 evidence는 무엇인가**

이 7개가 먼저 정리되면, WhatsApp / Email / Dashboard / Excel / WMS / S-PMIS는  
모두 같은 ontology 위에서 정렬될 수 있습니다.
