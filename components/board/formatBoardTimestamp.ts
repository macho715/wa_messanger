const boardTimestampFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  hour12: false,
  timeZone: 'Asia/Dubai',
});

export function formatBoardTimestamp(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return boardTimestampFormatter.format(date);
}
