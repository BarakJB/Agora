const HEBREW_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

export function formatMonth(key: string): string {
  if (!key) return '';
  const [year, month] = key.split('-');
  const idx = parseInt(month, 10) - 1;
  return `${HEBREW_MONTHS[idx] || month} ${year}`;
}

export function normalizeMonth(raw: string): string {
  if (!raw) return '';
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[2]}-${m[1].padStart(2, '0')}`;
  const d = raw.match(/^\d{1,2}[/-](\d{1,2})[/-](\d{4})$/);
  if (d) return `${d[2]}-${d[1].padStart(2, '0')}`;
  return '';
}

export const fmt = (n: number) => n.toLocaleString('he-IL', { maximumFractionDigits: 0 });
