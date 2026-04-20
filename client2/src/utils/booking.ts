import type { PetSize } from '../types';

/** Calendar YYYY-MM-DD in the user's local timezone (matches DatePicker / salon "calendar day"). */
export function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Normalize form state to YYYY-MM-DD. Never use UTC slice for Date instances — avoids off-by-one vs MYT.
 */
export function formatDateYmdInput(value: string | Date | undefined | null): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value.trim().slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return toYmdLocal(value);
  return '';
}

/** Next calendar day in local time from a YYYY-MM-DD string. */
export function addOneCalendarDayYmd(ymd: string): string {
  const base = formatDateYmdInput(ymd);
  if (base.length !== 10) return '';
  const [y, mo, d] = base.split('-').map((x) => parseInt(x, 10));
  if ([y, mo, d].some((n) => Number.isNaN(n))) return '';
  const next = new Date(y, mo - 1, d + 1);
  return toYmdLocal(next);
}

export function getLocalYmdToday(): string {
  return toYmdLocal(new Date());
}

export function getLocalYmdWithMonthOffset(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return toYmdLocal(d);
}

/** Grooming duration from pet size (minutes); matches server bookingHelpers. */
export function groomingMinutesForSize(size: PetSize | undefined): number | null {
  if (!size) return null;
  const m: Record<PetSize, number> = {
    small: 60,
    medium: 90,
    large: 120,
    xlarge: 120,
  };
  return m[size] ?? null;
}
