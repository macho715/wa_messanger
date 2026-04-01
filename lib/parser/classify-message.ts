import type { BoardState, EventStatus } from '@/lib/types/work-item';
import { extractShipmentKeyCandidates } from '@/lib/db/shipment-candidates';

export type ParsedMessage = {
  title: string;
  boardState: BoardState;
  eventStatus: EventStatus;
  typeCode: string;
  ownerName: string | null;
  holdReason: string | null;
  priorityScore: number;
  dedupeKey: string | null;
  parserAction: 'CREATE_ITEM' | 'UPDATE_ITEM' | 'MERGE_ONLY' | 'NO_CHANGE' | 'IGNORE';
  normalizedText?: string;
  summary?: string | null;
  keywordsHit?: string[];
  shipmentKeyCandidates?: string[];
};

const TYPE_RULES: Array<{ code: string; patterns: RegExp[] }> = [
  { code: 'GATE_PASS', patterns: [/gate pass/i, /\bnoc\b/i, /permit/i, /security hold/i] },
  { code: 'CRANE_LIFT', patterns: [/crane/i, /forklift/i, /lifting/i, /flift/i] },
  { code: 'DELIVERY_OFFLOAD', patterns: [/delivery/i, /offloading/i, /unloading/i] },
  { code: 'VESSEL_BERTH', patterns: [/vessel/i, /berth/i, /tide/i, /anchorage/i] },
  {
    code: 'DOC_CUSTOMS',
    patterns: [/\bboe\b/i, /\bdo\b/i, /customs/i, /fanr/i, /msds/i, /tpi/i, /manifest/i],
  },
  { code: 'WAREHOUSE', patterns: [/\bwh\b/i, /warehouse/i, /yard/i, /storage/i] },
  { code: 'DAMAGE_RETURN', patterns: [/damage/i, /osdr/i, /return/i] },
];

const NO_CHANGE_HINTS =
  /^(noted|ok|copied|thanks|well noted|received with thanks|알겠습니다)\b/i;

function normalize(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function detectType(text: string): string {
  for (const rule of TYPE_RULES) {
    if (rule.patterns.some((r) => r.test(text))) return rule.code;
  }
  return 'OTHER';
}

function extractOwner(text: string): string | null {
  const explicit =
    text.match(/\b([A-Z][a-z]+)\s+please\b/i) ||
    text.match(/\bowner:\s*([A-Za-z0-9._-]+)/i) ||
    text.match(/\b담당:\s*([^\s,.]+)/) ||
    text.match(/@([A-Za-z0-9._-]+)/);
  return explicit?.[1] ?? null;
}

function hasPhrase(
  text: string,
  phrases: RegExp[],
): boolean {
  return phrases.some((r) => r.test(text));
}

/** p1-style event_status + board_state mapping (abbreviated precedence). */
function detectEventAndBoard(text: string): {
  eventStatus: EventStatus;
  boardState: BoardState;
  holdReason: string | null;
} {
  const lower = text.toLowerCase();

  const hasPending =
    /\b(pending|waiting|balance|remaining|not yet|blocked)\b/i.test(text) ||
    /잔량|대기|보류|미승인/.test(text);

  // NO_CHANGE / IGNORE style: short acknowledgements
  if (NO_CHANGE_HINTS.test(lower) && text.length < 80) {
    return { eventStatus: 'UNKNOWN', boardState: 'NEW', holdReason: null };
  }

  if (/\b(cancelled|canceled|postponed)\b/i.test(text) || /취소|연기/.test(text)) {
    return { eventStatus: 'CANCELED', boardState: 'CANCELED', holdReason: null };
  }

  // DONE blocked if balance language present (p1 precedence 2)
  const doneLike =
    /\b(done|completed|finished|delivered|received|offloading complete|loading complete|완료|종결)\b/i.test(
      text,
    );
  if (doneLike && !hasPending) {
    if (/\b(released|gate out|returned|출차완료|회수완료)\b/i.test(text)) {
      return { eventStatus: 'RELEASED', boardState: 'DONE', holdReason: null };
    }
    return { eventStatus: 'DONE', boardState: 'DONE', holdReason: null };
  }

  // HOLD subclasses
  if (
    hasPhrase(text, [
      /no gate pass|gate pass pending|security hold|entry hold|패스 대기/i,
      /cicpa hold/i,
    ])
  ) {
    return { eventStatus: 'WAITING_GATE', boardState: 'HOLD', holdReason: 'WAIT_GATE' };
  }
  if (
    hasPhrase(text, [
      /pending boe|boe pending|do pending|msds expired|fanr pending|tpi|document mismatch|서류 대기/i,
    ]) ||
    (/\bboe\b/i.test(text) && /\bpending\b/i.test(text))
  ) {
    return { eventStatus: 'WAITING_DOC', boardState: 'HOLD', holdReason: 'WAIT_DOC' };
  }
  if (hasPhrase(text, [/waiting forklift|waiting crane|no operator|rigger|장비 대기/i])) {
    return {
      eventStatus: 'WAITING_EQUIPMENT',
      boardState: 'HOLD',
      holdReason: 'WAIT_EQUIPMENT',
    };
  }
  if (hasPhrase(text, [/waiting reply|awaiting confirmation|확답 대기|회신 대기/i])) {
    return { eventStatus: 'WAITING_REPLY', boardState: 'HOLD', holdReason: 'WAIT_REPLY' };
  }
  if (hasPhrase(text, [/high tide|fog delay|weather hold|wind stop|기상 대기|조수 대기/i])) {
    return { eventStatus: 'WAITING_WEATHER', boardState: 'HOLD', holdReason: 'WAIT_WEATHER' };
  }
  if (hasPhrase(text, [/approval pending|permit pending|허가 대기|승인 전/i])) {
    return {
      eventStatus: 'WAITING_APPROVAL',
      boardState: 'HOLD',
      holdReason: 'WAIT_APPROVAL',
    };
  }

  // Generic HOLD
  if (
    /\b(hold|pending|waiting|blocked)\b/i.test(text) ||
    /보류|대기|홀드/.test(text)
  ) {
    return { eventStatus: 'ONGOING', boardState: 'HOLD', holdReason: 'GENERIC' };
  }

  // IN_PROGRESS family
  if (
    hasPhrase(text, [
      /\b(arrived|reached|at gate|on site|gate in|도착)\b/i,
    ])
  ) {
    if (
      hasPhrase(text, [/waiting forklift|waiting crane|no gate pass|gate pass pending/i])
    ) {
      return { eventStatus: 'WAITING_EQUIPMENT', boardState: 'HOLD', holdReason: 'WAIT_EQUIPMENT' };
    }
    return { eventStatus: 'ARRIVED', boardState: 'IN_PROGRESS', holdReason: null };
  }
  if (/\b(loading start|unloading start|work started|operation started|착수|시작)\b/i.test(text)) {
    return { eventStatus: 'STARTED', boardState: 'IN_PROGRESS', holdReason: null };
  }
  if (
    /\b(ongoing|in progress|under process|arranging|following up|checking|processing|진행중|조치중)\b/i.test(
      text,
    )
  ) {
    return { eventStatus: 'ONGOING', boardState: 'IN_PROGRESS', holdReason: null };
  }
  if (/\b(partial delivery|balance qty|remaining qty|부분완료|잔량)\b/i.test(text)) {
    return { eventStatus: 'PARTIAL_DONE', boardState: 'IN_PROGRESS', holdReason: null };
  }

  // ASSIGNED
  if (
    /\b(assigned to|owner:|담당:|please\s+[A-Z][a-z]+\b)/i.test(text) ||
    extractOwner(text)
  ) {
    return { eventStatus: 'ASSIGNED', boardState: 'ASSIGNED', holdReason: null };
  }

  // REQUEST / NEW
  if (
    /\b(please arrange|pls arrange|please share|please confirm|please check|request|need|required|submit|요청|제출|회신|공유)\b/i.test(
      text,
    )
  ) {
    return { eventStatus: 'REQUEST', boardState: 'NEW', holdReason: null };
  }

  return { eventStatus: 'UNKNOWN', boardState: 'NEW', holdReason: null };
}

function buildDedupeKey(text: string, typeCode: string): string | null {
  const ref =
    text.match(/\b[A-Z]{2,5}[-_]\d{3,}\b/)?.[0] ||
    text.match(/\bJ\d{2,3}-\d+\b/i)?.[0] ||
    text.match(/\bSCT\s*\d+/i)?.[0] ||
    null;
  return ref ? `${typeCode}:${ref.replace(/\s+/g, '').toUpperCase()}` : null;
}

function buildTitle(text: string, typeCode: string): string {
  const clipped = text.slice(0, 80);
  return `[${typeCode}] ${clipped}`;
}

function buildSummary(text: string): string | null {
  if (!text) return null;
  return text.length <= 160 ? text : `${text.slice(0, 157)}...`;
}

function collectKeywordHits(text: string): string[] {
  const patterns = [
    /\b(owner:\s*[A-Za-z0-9._-]+|담당:\s*[^\s,.]+|@[A-Za-z0-9._-]+|[A-Z][a-z]+\s+please)\b/gi,
    /\b(no gate pass|gate pass pending|security hold|entry hold|cicpa hold|패스 대기|게이트 홀드)\b/gi,
    /\b(pending boe|boe pending|do pending|msds expired|fanr pending|waiting tpi|document mismatch|customs mismatch|manifest pending|irn pending|서류 대기|인증 대기)\b/gi,
    /\b(waiting forklift|waiting crane|no operator|rigger|장비 대기|포크리프트 대기|크레인 대기)\b/gi,
    /\b(waiting reply|awaiting confirmation|pending response|awaiting update|확답 대기|회신 대기|승인 대기)\b/gi,
    /\b(high tide|fog delay|weather hold|wind stop|rain delay|anchorage waiting|harbor congestion|조수 대기|기상 대기)\b/gi,
    /\b(approval pending|permit pending|허가 대기|승인 전)\b/gi,
    /\b(arrived|reached|at gate|on site|gate in|도착)\b/gi,
    /\b(loading start|unloading start|work started|operation started|착수|시작)\b/gi,
    /\b(ongoing|in progress|under process|arranging|following up|checking|processing|진행중|조치중)\b/gi,
    /\b(partial delivery|balance qty|remaining qty|부분완료|잔량)\b/gi,
    /\b(done|completed|finished|delivered|received|offloading complete|loading complete|완료|종결)\b/gi,
    /\b(gate pass|noc|permit|crane|forklift|lifting|flift|delivery|offloading|unloading|vessel|berth|tide|anchorage|boe|do|customs|fanr|msds|tpi|manifest|warehouse|yard|storage|damage|osdr|return)\b/gi,
  ];

  const hits = new Set<string>();
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      hits.add(match[0].trim());
    }
  }
  return Array.from(hits).slice(0, 24);
}

function scorePriority(boardState: ParsedMessage['boardState'], typeCode: string): number {
  let score = 50.0;
  if (boardState === 'HOLD') score += 20.0;
  if (typeCode === 'DOC_CUSTOMS' || typeCode === 'VESSEL_BERTH') score += 10.0;
  return Math.min(score, 99.0);
}

export function classifyMessage(bodyRaw: string): ParsedMessage {
  const text = normalize(bodyRaw);
  if (!text) {
    return {
      title: '[OTHER] (empty)',
      boardState: 'NEW',
      eventStatus: 'UNKNOWN',
      typeCode: 'OTHER',
      ownerName: null,
      holdReason: null,
      priorityScore: 0,
      dedupeKey: null,
      parserAction: 'IGNORE',
    };
  }

  const typeCode = detectType(text);
  const { eventStatus, boardState, holdReason } = detectEventAndBoard(text);
  const ownerName = extractOwner(text);
  let effectiveBoard = boardState;
  let effectiveEvent = eventStatus;
  if (ownerName && effectiveBoard === 'NEW' && effectiveEvent === 'REQUEST') {
    effectiveBoard = 'ASSIGNED';
    effectiveEvent = 'ASSIGNED';
  }

  const dedupeKey = buildDedupeKey(text, typeCode);
  const title = buildTitle(text, typeCode);
  const summary = buildSummary(text);
  const priorityScore = scorePriority(effectiveBoard, typeCode);
  const shipmentKeyCandidates = extractShipmentKeyCandidates(bodyRaw);
  const keywordsHit = collectKeywordHits(text);

  let parserAction: ParsedMessage['parserAction'] = 'UPDATE_ITEM';
  if (NO_CHANGE_HINTS.test(text.toLowerCase()) && text.length < 80) {
    parserAction = 'NO_CHANGE';
  }

  return {
    title,
    boardState: effectiveBoard,
    eventStatus: effectiveEvent,
    typeCode,
    ownerName,
    holdReason,
    priorityScore,
    dedupeKey,
    parserAction,
    normalizedText: text,
    summary,
    keywordsHit,
    shipmentKeyCandidates,
  };
}
