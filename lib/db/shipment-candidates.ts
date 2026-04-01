/** Extract opaque keys from message text for shipment_ref lookup only (no stage truth). */

const PATTERNS: RegExp[] = [
  /\b[A-Z]{2,6}[-_]\d{3,}\b/g,
  /\bJ\d{2,3}-\d+\b/gi,
  /\bSCT\s*\d+/gi,
  /\bHVDC[-\w]*/gi,
  /\bBL[-:]?\s*[A-Z0-9]{4,}\b/gi,
  /\bCI[-:]?\s*[A-Z0-9]{4,}\b/gi,
];

export function extractShipmentKeyCandidates(body: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const re of PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) {
      const raw = m[0].replace(/\s+/g, '').toUpperCase();
      if (raw.length < 4 || seen.has(raw)) continue;
      seen.add(raw);
      out.push(raw);
    }
  }
  return out.slice(0, 24);
}
