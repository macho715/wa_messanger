# AGENTS.md

## Mandatory
- This repository defines HVDC project logistics knowledge as an ontology-first system with a message-driven operations layer.
- Business truth comes from shipment, document, movement, cost, and evidence linkage, not dashboard widgets.
- The main live operations consumer is a Message Work Board fed by group-chat evidence.
- Never invent identifiers, stage meaning, dates, vendor truth, owner assignment, shipment evaluation logic, or completion status without evidence.
- Keep root guidance concise and domain-wide. Put build, test, and tool-specific commands in deeper `AGENTS.md` files only after confirming them from repo files.

## Purpose
Use this file when designing or revising the shipment-centric ontology, the message-to-work-card pipeline, search and drilldown behavior, evidence rules, and downstream dashboard/API/report/KPI consumers.

## Product Definition
This product is not a dashboard. It is:
1. a shipment graph for business truth
2. a message work-card layer for live execution tracking
Dashboards, reports, APIs, alerts, and KPI cards are downstream consumers.

## Two Centers of Gravity
### Shipment-centric ontology
Use `Shipment` as the main business retrieval anchor. Every lookup must reconstruct the full logistics journey across sites and stages.

### Message-centric operations tracking
Use `WorkCard` as the live execution anchor for group-chat-driven tasks. A work card is created or updated from messages, then linked back to shipment, document, site, vessel, or vendor context only when evidence supports the linkage.

## Canonical Query Outcomes
A shipment lookup must answer: object identity, aliases, manufacturer/vendor, origin/POL/POD/final site, Incoterm, current stage/location, prior milestones, next expected stage, warehouse/customs/port/offshore/site history, related documents, related invoices/costs/approvals when available, and evidence gaps or conflicts.

A work-card lookup must answer: owner, current status, last update time, hold reason if any, related message thread, linked shipment/document/site/vessel/vendor tags if confirmed, and unresolved linkage gaps.

## Core Entities
- Shipment, ShipmentAlias, CargoItem, Package, Document, Vendor, Manufacturer, Location, Site, Route, Stage
- MovementEvent, PortCall, WarehouseEvent, CustomsEvent, OffshoreEvent, DeliveryEvent
- Invoice, CostLine, PaymentEvent, Approval, Risk, Evidence, Communication
- Message, ChatThread, Participant, WorkCard, OwnerAssignment, StatusTransition, KPI

## Identity Resolution Rules
- Support multi-key shipment lookup using `HVDC reference`, `SCT SHIP NO`, invoice refs, BL/CI refs, packing refs, case refs, and normalized short forms.
- Never collapse different shipments because prefixes look similar.
- Never convert a message mention into a shipment link without evidence.
- Keep uncertain shipment links and uncertain owner links explicitly unresolved.
- A work card may exist before shipment linkage is confirmed.

## Full Journey Contract
Default journey:
`Origin -> Port/Air Entry -> Customs -> Warehouse -> MOSB/Offshore -> Site Delivery -> Final Closeout`

Warehouse is only one stage. Do not collapse the model into warehouse-only, UI-only, or screen-only semantics.

## Message Work Board Contract
Pipeline:
`WhatsApp message -> normalize -> extract owner/task/status -> thread merge -> card upsert -> board metrics`

Primary visible status set:
- New
- Assigned
- In Progress
- HOLD
- Done

Rules:
- Keep `HOLD` as a first-class visible column.
- A work card is the unit of operational tracking.
- Site, vessel, truck, document, and vendor are linked context, not the primary work-board object.
- UI priority is owner, status, and last update time.

Recommended board views:
- All Work Board
- Owner Board
- HOLD Board
- Message Replay

## Message Extraction Rules
Owner extraction priority:
1. explicit named owner
2. mention
3. reply target
4. approved owner dictionary

Task type examples:
- Gate Pass / NOC
- Crane / FLIFT
- Delivery / Offloading
- Vessel / Berth / Tide
- BOE / DO / MSDS / FANR / TPI
- Warehouse / Hold / Partial Delivery
- OSDR / Damage / Return

Status cue examples:
- In Progress: `ongoing`, `under process`, `working`, `arranging`
- HOLD: `pending`, `waiting`, `blocked`, `not yet`, `hold`
- Done: `done`, `completed`, `collected`, `received`, `released`

## History-First Rule
- Separate current state from historical events.
- Keep milestone events discrete, timestamped, and source-linked.
- Keep message chronology and status transitions queryable.
- A model is incomplete if it stores only the latest status and drops the path that led there.

## Evidence and Truth Rules
- Communication is evidence, not standalone business truth.
- A message can create or update a work card.
- A message must not silently overwrite shipment stage, cost truth, or document truth without corroborated evidence.
- Preserve conflicting facts until source priority resolves them.
- Minimum evidence fields: source, timestamp, asserted fact, linkage reason, and confidence when available.

## Fact-Only Rule
Do not invent shipment scores, shipment health, anomaly grades, arbitrary readiness scores, traffic-light business evaluations without an approved formula, completion claims without evidence, or owner assignments without a basis.

Allowed derived outputs: factual stage, timestamps, elapsed duration, dwell, lead time, hold counts, unresolved gap notes, and evidence conflict notes.

## Cross-Module Link Contract
A valid design links communication and work cards back to shipment identity when possible:
`Shipment -> documents -> movement events -> costs -> approvals -> communications -> work cards -> KPI views`

If a module cannot connect back to shipment identity or confirmed operational context, it is incomplete.

## Public Language Rule
Prefer public logistics language: Origin, Port / Air Entry, Customs, Warehouse, MOSB / Offshore, Site Delivery, Current Stage, Next Stage, Route Type. Avoid local shorthand as the primary ontology vocabulary.

## Hardcode Ban
Do not hardcode business truth, stage semantics, route semantics, vendor truth, shipment status labels, KPI thresholds, source precedence, evaluation logic, or owner mapping logic. Use governed dictionaries, configs, mappings, or approved ontology rules.

## Root File Boundary
This root file is for domain contracts and operational truth rules. Do not put unverified install, dev, build, test, or lint commands here. Add app or service-specific commands and tool behaviors in deeper `AGENTS.md` files after confirming them from actual repo evidence.

## Validation Rules
A change is incomplete unless it preserves full shipment journey, preserves message-driven work-card tracking, supports multi-key lookup, preserves event and message history, separates facts/evidence/derived values, keeps communication linked as evidence, keeps HOLD visible as an explicit state, exposes unresolved gaps, and avoids fabricated detail.

## Stop Rules
Stop and escalate when the ontology becomes dashboard-first, messages are treated as authoritative shipment truth without evidence, shipment identity cannot be resolved safely, history is flattened into one status field, work cards cannot be linked or remain ambiguous without being marked unresolved, evaluation logic is requested without an approved formula, or high-risk claims lack evidence.

## Additional References
- Keep root guidance concise.
- Put consumer-specific overrides in deeper `AGENTS.md` files.
- Put repeated operational procedures into `SKILL.md` only when trigger and verification are explicit.
- **This spike app** (Message Work Board UI, TanStack table, Playwright smoke, ops routes): see [`docs/implementation/2026-04-01-work-board-ui-qa-status.md`](docs/implementation/2026-04-01-work-board-ui-qa-status.md) for build/QA surface — not duplicated here per root file boundary.
- **Repo structure / setup / architecture changelog:** [`docs/LAYOUT.md`](docs/LAYOUT.md), [`docs/SYSTEM_ARCHITECTURE.md`](docs/SYSTEM_ARCHITECTURE.md), [`docs/GUIDE.md`](docs/GUIDE.md), [`docs/CHANGELOG.md`](docs/CHANGELOG.md).