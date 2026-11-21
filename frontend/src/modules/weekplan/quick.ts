import { addDays } from "date-fns";
import { toISO } from "../../shared/dates";

export interface QuickMember { id: number; name: string }
export interface Quick {
  title: string;
  date?: string;
  start?: string;
  end?: string;
  memberIds: number[];
  category?: "homework" | "plan" | "appointment" | "other";
}

const WEEKDAYS: [string[], number][] = [
  [["mandag", "man", "monday", "mon"], 1], [["tirsdag", "tir", "tuesday", "tue"], 2],
  [["onsdag", "ons", "wednesday", "wed"], 3], [["torsdag", "tor", "thursday", "thu"], 4],
  [["fredag", "fre", "friday", "fri"], 5], [["lørdag", "lør", "saturday", "sat"], 6],
  [["søndag", "søn", "sunday", "sun"], 0],
];
const MONTHS = ["jan", "feb", "mar", "apr", "maj|may", "jun", "jul", "aug", "sep", "okt|oct", "nov", "dec"];
const HOMEWORK = /\b(lektie|lektier|læs|opgave|opgaver|homework|read|reading)\b/i;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const two = (n: number | string) => String(n).padStart(2, "0");

/** "Fodbold tirsdag 16:30-17:45 Sam" → title, day, times and people. Understands Danish and English. */
export function parseQuick(input: string, members: QuickMember[], today: Date): Quick {
  let text = ` ${input.trim()} `;
  const take = (re: RegExp): RegExpExecArray | null => {
    const m = re.exec(text);
    if (m) text = text.replace(m[0], " ");
    return m;
  };
  const out: Quick = { title: "", memberIds: [] };

  // time: 16:30-17:45, 16.30, kl 16, "til 17:45"
  const range = take(/\s(?:kl\.?\s*)?(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})(?=\s|$)/i);
  if (range) {
    out.start = `${two(range[1])}:${range[2]}`;
    out.end = `${two(range[3])}:${range[4]}`;
  } else {
    const single = take(/\s(?:kl\.?\s*)?(\d{1,2})[:.](\d{2})(?=\s|$)/i) ?? take(/\skl\.?\s*(\d{1,2})(?=\s|$)/i);
    if (single) out.start = `${two(single[1])}:${single[2] ?? "00"}`;
    const until = take(/\s(?:til|to|until)\s+(?:kl\.?\s*)?(\d{1,2})(?:[:.](\d{2}))?(?=\s|$)/i);
    if (until) out.end = `${two(until[1])}:${until[2] ?? "00"}`;
  }

  // day
  if (take(/\s(i\s?morgen|tomorrow)(?=\s|$)/i)) out.date = toISO(addDays(today, 1));
  else if (take(/\s(i\s?dag|today)(?=\s|$)/i)) out.date = toISO(today);
  else if (take(/\s(i\s?overmorgen)(?=\s|$)/i)) out.date = toISO(addDays(today, 2));
  else {
    const d = take(/\s(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?=\s|$)/);
    const named = d ? null : take(new RegExp(`\\s(\\d{1,2})\\.?\\s+(${MONTHS.join("|")})[a-zæøå]*\\.?(?=\\s|$)`, "i"));
    if (d || named) {
      const day = Number((d ?? named)![1]);
      const month = d ? Number(d[2]) - 1 : MONTHS.findIndex((m) => new RegExp(`^(${m})$`, "i").test(named![2]));
      let year = d?.[3] ? Number(d[3].length === 2 ? `20${d[3]}` : d[3]) : today.getFullYear();
      let date = new Date(year, month, day);
      if (!d?.[3] && date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) date = new Date(++year, month, day);
      out.date = toISO(date);
    } else {
      for (const [names, dow] of WEEKDAYS) {
        if (take(new RegExp(`\\s(${names.map(escape).join("|")})\\.?(?=\\s|$)`, "i"))) {
          out.date = toISO(addDays(today, (dow - today.getDay() + 7) % 7));
          break;
        }
      }
    }
  }

  // people: any word that is a family member's name
  for (const m of members) {
    if (take(new RegExp(`\\s${escape(m.name)}(?=\\s|$|[,.])`, "i"))) out.memberIds.push(m.id);
  }
  text = text.replace(/\s(og|and|&)\s/gi, " ").replace(/\s(med|with)\s/gi, " ");

  if (HOMEWORK.test(text)) out.category = "homework";
  const title = text.replace(/[,]+/g, " ").replace(/\s+/g, " ").trim();
  out.title = title ? title.charAt(0).toUpperCase() + title.slice(1) : "";
  return out;
}
