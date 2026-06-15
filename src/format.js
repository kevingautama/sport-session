// Currency + date formatting. Uses the built-in Intl.NumberFormat (an existing,
// battle-tested solution) so configuring a new currency is just a code change.
import { getSetting } from './db.js';

export const CURRENCIES = [
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
];

export function currencyCode() {
  return getSetting('currency', 'MYR');
}

export function currencyInfo() {
  const code = currencyCode();
  return CURRENCIES.find((c) => c.code === code) || { code, name: code, symbol: code };
}

/** Symbol only, e.g. "RM". */
export function currencySymbol() {
  return currencyInfo().symbol;
}

/** Plain number with 2 decimals, no symbol: 1250 -> "1,250.00". */
export function money(n) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
}

/** Full currency string, e.g. "RM 1,250.00". */
export function fmt(n) {
  return `${currencySymbol()} ${money(n)}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function nowHHMM() {
  return new Date().toTimeString().slice(0, 5);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function parseDate(iso) {
  // Treat as local date (avoid TZ shifting the day).
  const [y, m, d] = (iso || '').split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function monthLabel(iso) {
  const dt = parseDate(iso);
  return `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}
export function monthShort(iso) {
  return MONTHS[parseDate(iso).getMonth()];
}
export function dayNum(iso) {
  return parseDate(iso).getDate();
}
export function weekday(iso) {
  return DAYS[parseDate(iso).getDay()];
}

/** "7:00 PM" from "19:00". */
export function time12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`;
}
