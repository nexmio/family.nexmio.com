import type { ReactNode } from "react";
import { type Lang, isSameDay, toISO, weekdayShort } from "../dates";
import { type Member, Avatar, colorClass } from "../members";

export interface GridEvent {
  id: number;
  title: string;
  date: string;
  start: string | null;
  end: string | null;
  member_id: number | null;
  also_ids?: number[];
  series_id?: string | null;
  category: "homework" | "plan" | "appointment" | "other";
  notes: string | null;
}

export interface EventLabels {
  category: (c: GridEvent["category"]) => string;
  allDay: string;
}

export const timeLabel = (e: GridEvent, allDay: string) =>
  e.start ? `${e.start}${e.end ? `–${e.end}` : ""}` : allDay;

/** One event as a soft coloured card. The colour is the person's colour. */
/** Everyone the event is for, the first one first. */
export function peopleOf(event: GridEvent, members: Map<number, Member>): Member[] {
  return [event.member_id, ...(event.also_ids ?? [])].flatMap((id) => (id && members.get(id) ? [members.get(id)!] : []));
}

export function EventCard({
  event, member, labels, onSelect, compact = false, others = [],
}: {
  event: GridEvent; member?: Member | null; labels: EventLabels; onSelect?: (e: GridEvent) => void; compact?: boolean;
  others?: Member[];
}) {
  const names = [member, ...others].filter((m): m is Member => Boolean(m)).map((m) => m.name).join(" + ");
  const body = (
    <>
      {!compact && <Avatar member={member} size={22} />}
      <span className="event-text">
        <span className="event-title">{event.title}</span>
        <span className="event-meta">
          {timeLabel(event, labels.allDay)}
          {names ? <span className="event-names"> · {names}</span> : null}
        </span>
      </span>
    </>
  );
  const cls = `event ${colorClass(member)}`;
  return onSelect ? (
    <button type="button" className={cls} onClick={() => onSelect(event)}>{body}</button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

interface Props {
  days: Date[];
  events: GridEvent[];
  members: Map<number, Member>;
  today: Date;
  lang: Lang;
  labels: EventLabels;
  emptyLabel?: string;
  todayLabel: string;
  onSelect?: (event: GridEvent) => void;
  extra?: (day: Date) => ReactNode;
}

/** A week as 7 columns on wide screens and a day list on narrow ones (CSS decides). */
export function WeekGrid({ days, events, members, today, lang, labels, emptyLabel, todayLabel, onSelect, extra }: Props) {
  return (
    <div className="weekgrid">
      {days.map((day) => {
        const iso = toISO(day);
        const list = events.filter((e) => e.date === iso);
        const isToday = isSameDay(day, today);
        return (
          <section key={iso} className={`day${isToday ? " today" : ""}`} aria-label={iso}>
            <header>
              <span className="day-name">{weekdayShort(day, lang)}</span>
              <span className="day-num">{day.getDate()}</span>
              {isToday && <span className="today-tag">{todayLabel}</span>}
            </header>
            {list.length === 0 && emptyLabel && <p className="day-empty">{emptyLabel}</p>}
            {list.map((e) => (
              <EventCard key={e.id} event={e} member={e.member_id ? members.get(e.member_id) : null} others={peopleOf(e, members).slice(1)} labels={labels} onSelect={onSelect} />
            ))}
            {extra?.(day)}
          </section>
        );
      })}
    </div>
  );
}
