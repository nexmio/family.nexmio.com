import { addDays } from "date-fns";
import { type Lang, isSameDay, toISO, weekDays, weekStart, weekdayShort } from "../dates";
import { type Member, colorClass } from "../members";
import { type GridEvent } from "./WeekGrid";

export const monthRange = (anchor: Date): { first: Date; last: Date; weeks: Date[] } => {
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const first = weekStart(monthStart);
  const weeks: Date[] = [];
  for (let w = first; w <= monthEnd; w = addDays(w, 7)) weeks.push(w);
  return { first, last: addDays(weeks[weeks.length - 1], 6), weeks };
};

/** A month with up to three small events per day; "+n" for the rest. Click a day number to open it. */
export function MonthGrid({
  anchor, events, members, today, lang, moreLabel, onSelect, onOpenDay,
}: {
  anchor: Date; events: GridEvent[]; members: Map<number, Member>; today: Date; lang: Lang;
  moreLabel: (n: number) => string; onSelect: (e: GridEvent) => void; onOpenDay: (d: Date) => void;
}) {
  const { weeks } = monthRange(anchor);
  const header = weekDays(weeks[0]);
  return (
    <div className="monthgrid">
      {header.map((d) => (
        <div key={toISO(d)} className="month-head">{weekdayShort(d, lang)}</div>
      ))}
      {weeks.flatMap((w) =>
        weekDays(w).map((day) => {
          const iso = toISO(day);
          const list = events.filter((e) => e.date === iso);
          const other = day.getMonth() !== anchor.getMonth();
          return (
            <div key={iso} className={`month-day${other ? " other" : ""}${isSameDay(day, today) ? " today" : ""}`}>
              <button type="button" className="month-num" onClick={() => onOpenDay(day)}>{day.getDate()}</button>
              {list.slice(0, 3).map((e) => (
                <button key={e.id} type="button" className={`month-event ${colorClass(e.member_id ? members.get(e.member_id) : null)}`} onClick={() => onSelect(e)}>
                  {e.start ? `${e.start} ` : ""}{e.title}
                </button>
              ))}
              {list.length > 3 && <span className="month-more">{moreLabel(list.length - 3)}</span>}
            </div>
          );
        }),
      )}
    </div>
  );
}
