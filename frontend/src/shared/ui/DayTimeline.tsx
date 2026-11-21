import { useEffect, useState } from "react";
import { type Lang, isSameDay } from "../dates";
import { type Member, Avatar, colorClass } from "../members";
import { type EventLabels, type GridEvent, timeLabel } from "./WeekGrid";

export const inColumn = (e: GridEvent, memberId: number | null) =>
  (e.member_id ?? null) === memberId || (memberId !== null && (e.also_ids ?? []).includes(memberId));

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const DEFAULT_MIN = 60; // an event without an end time is shown as one hour

interface Placed { event: GridEvent; from: number; to: number; lane: number; lanes: number }

/** Puts overlapping events of one person side by side. */
function place(events: GridEvent[]): Placed[] {
  const sorted = events
    .filter((e) => e.start)
    .map((e) => {
      const from = toMin(e.start!);
      const end = e.end ? toMin(e.end) : from + DEFAULT_MIN;
      return { event: e, from, to: Math.max(end, from + 30), lane: 0, lanes: 1 };
    })
    .sort((a, b) => a.from - b.from || a.to - b.to);
  const groups: Placed[][] = [];
  let groupEnd = -1;
  for (const p of sorted) {
    if (p.from >= groupEnd) groups.push([]);
    groups[groups.length - 1].push(p);
    groupEnd = Math.max(groupEnd, p.to);
  }
  for (const group of groups) {
    const laneEnds: number[] = [];
    for (const p of group) {
      let lane = laneEnds.findIndex((end) => end <= p.from);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = p.to;
      p.lane = lane;
    }
    for (const p of group) p.lanes = laneEnds.length;
  }
  return sorted;
}

/** One day, the family side by side: a column per person, hours down the side (the "home" view). */
export function DayTimeline({
  date, events, people, today, wholeFamilyLabel, allDayLabel, onSelect,
}: {
  date: Date; events: GridEvent[]; people: Member[]; today: Date; lang: Lang; labels: EventLabels;
  wholeFamilyLabel: string; allDayLabel: string; onSelect?: (e: GridEvent) => void;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const hasFamily = events.some((e) => e.member_id === null) || people.length === 0;
  const columns: { key: string; member: Member | null; name: string }[] = [
    ...people.map((m) => ({ key: String(m.id), member: m, name: m.name })),
    ...(hasFamily ? [{ key: "none", member: null, name: wholeFamilyLabel }] : []),
  ];
  const timed = events.filter((e) => e.start);
  const first = Math.min(8, ...timed.map((e) => Math.floor(toMin(e.start!) / 60)));
  const last = Math.max(18, ...timed.map((e) => Math.ceil((e.end ? toMin(e.end) : toMin(e.start!) + DEFAULT_MIN) / 60)));
  const hours = Math.min(24, last) - Math.max(0, first);
  const startHour = Math.max(0, first);
  const isToday = isSameDay(date, today);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow = isToday && nowMin >= startHour * 60 && nowMin <= (startHour + hours) * 60;
  const cols = `3.2em repeat(${columns.length}, minmax(0, 1fr))`;
  const top = (min: number) => `calc(var(--hour) * ${(min - startHour * 60) / 60})`;

  return (
    <div className="timeline">
      <div className="tl-row tl-head" style={{ gridTemplateColumns: cols }}>
        <span />
        {columns.map((c) => (
          <div key={c.key} className={`tl-person ${colorClass(c.member)}`}>
            <Avatar member={c.member} size={56} />
            <span>{c.name}</span>
          </div>
        ))}
      </div>
      {events.some((e) => !e.start) && (
        <div className="tl-row tl-allday" style={{ gridTemplateColumns: cols }}>
          <span className="tl-hourlabel">{allDayLabel}</span>
          {columns.map((c) => (
            <div key={c.key} className="tl-allday-cell">
              {events.filter((e) => !e.start && inColumn(e, c.member?.id ?? null)).map((e) => (
                <button key={e.id} type="button" className={`tl-bar ${colorClass(c.member)}`} onClick={() => onSelect?.(e)}>
                  {e.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
      <div className="tl-row tl-body" style={{ gridTemplateColumns: cols, height: `calc(var(--hour) * ${hours})` }}>
        <div className="tl-hours">
          {Array.from({ length: hours }, (_, i) => (
            <span key={i} className="tl-hourlabel" style={{ top: `calc(var(--hour) * ${i})` }}>
              {String(startHour + i).padStart(2, "0")}:00
            </span>
          ))}
        </div>
        {columns.map((c) => (
          <div key={c.key} className="tl-col">
            {place(events.filter((e) => inColumn(e, c.member?.id ?? null))).map((p) => (
              <button
                key={p.event.id}
                type="button"
                className={`tl-event ${colorClass(c.member)}`}
                style={{
                  top: top(p.from),
                  height: `calc(var(--hour) * ${(p.to - p.from) / 60} - 2px)`,
                  left: `calc(${(100 / p.lanes) * p.lane}% + 2px)`,
                  width: `calc(${100 / p.lanes}% - 4px)`,
                }}
                onClick={() => onSelect?.(p.event)}
              >
                <span className="tl-event-title">{p.event.title}</span>
                <span className="tl-event-time">{timeLabel(p.event, allDayLabel)}</span>
              </button>
            ))}
          </div>
        ))}
        {showNow && <div className="tl-now" style={{ top: top(nowMin) }} aria-hidden="true" />}
      </div>
    </div>
  );
}
