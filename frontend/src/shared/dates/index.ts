import { addDays, format, getISOWeek, getISOWeekYear, parseISO, startOfWeek } from "date-fns";
import { da, enGB } from "date-fns/locale";

export type Lang = "da" | "en";

const locales = { da, en: enGB };

export const toISO = (d: Date): string => format(d, "yyyy-MM-dd");
export { parseISO };

/** Monday of the week that contains d (A8). */
export const weekStart = (d: Date): Date => startOfWeek(d, { weekStartsOn: 1 });

export const weekDays = (start: Date): Date[] => Array.from({ length: 7 }, (_, i) => addDays(start, i));

export const isoWeek = (d: Date): { week: number; year: number } => ({
  week: getISOWeek(d),
  year: getISOWeekYear(d),
});

export const isSameDay = (a: Date, b: Date): boolean => toISO(a) === toISO(b);

const monthShort = (d: Date, lang: Lang): string => format(d, "MMM", { locale: locales[lang] }).replace(/\.$/, "");

/** 17. nov. 2026 (da) or 17 Nov 2026 (en). */
export function formatDate(d: Date, lang: Lang): string {
  const day = lang === "da" ? `${d.getDate()}.` : `${d.getDate()}`;
  return `${day} ${monthShort(d, lang)}${lang === "da" ? "." : ""} ${d.getFullYear()}`;
}

/** 16.–22. nov. 2026 (da) or 16–22 Nov 2026 (en). */
export function formatRange(start: Date, end: Date, lang: Lang): string {
  const dot = lang === "da" ? "." : "";
  const d = (x: Date) => `${x.getDate()}${dot}`;
  const m = (x: Date) => `${monthShort(x, lang)}${dot}`;
  if (start.getFullYear() !== end.getFullYear()) {
    return `${formatDate(start, lang)} – ${formatDate(end, lang)}`;
  }
  if (start.getMonth() !== end.getMonth()) {
    return `${d(start)} ${m(start)} – ${d(end)} ${m(end)} ${end.getFullYear()}`;
  }
  return `${d(start)}–${d(end)} ${m(end)} ${end.getFullYear()}`;
}

export const weekdayShort = (d: Date, lang: Lang): string =>
  format(d, "EEE", { locale: locales[lang] }).replace(/\.$/, "");

export const weekdayLong = (d: Date, lang: Lang): string => format(d, "EEEE", { locale: locales[lang] });
