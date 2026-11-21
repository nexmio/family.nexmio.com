import { type Lang, isSameDay, toISO, weekdayShort } from "../dates";
import { type Member, Avatar, colorClass } from "../members";
import { inColumn } from "./DayTimeline";
import { EventCard, type EventLabels, type GridEvent } from "./WeekGrid";

/** The family side by side: one row per person, one column per day. */
export function PersonMatrix({
  days, events, members, today, lang, labels, wholeFamilyLabel, onSelect,
}: {
  days: Date[]; events: GridEvent[]; members: Member[]; today: Date; lang: Lang; labels: EventLabels;
  wholeFamilyLabel: string; onSelect?: (e: GridEvent) => void;
}) {
  const rows: { key: string; member: Member | null; name: string }[] = [
    ...members.map((m) => ({ key: String(m.id), member: m, name: m.name })),
    { key: "none", member: null, name: wholeFamilyLabel },
  ];
  return (
    <div className="matrix-wrap">
      <div className="matrix" >
        <div className="matrix-corner" />
        {days.map((d) => (
          <div key={toISO(d)} className={`matrix-head${isSameDay(d, today) ? " today" : ""}`}>
            <span className="day-name">{weekdayShort(d, lang)}</span> <span className="day-num">{d.getDate()}</span>
          </div>
        ))}
        {rows.map((row) => (
          <div key={row.key} className="matrix-row">
            <div className={`matrix-person ${colorClass(row.member)}`}>
              <Avatar member={row.member} size={30} />
              <span>{row.name}</span>
            </div>
            {days.map((d) => {
              const iso = toISO(d);
              const list = events.filter((e) => e.date === iso && inColumn(e, row.member?.id ?? null));
              return (
                <div key={iso} className={`matrix-cell${isSameDay(d, today) ? " today" : ""}`}>
                  {list.map((e) => (
                    <EventCard key={e.id} event={e} member={row.member} labels={labels} onSelect={onSelect} compact />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
