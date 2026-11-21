import { type Member, Avatar, colorClass } from "../members";
import { type EventLabels, type GridEvent, peopleOf, timeLabel } from "./WeekGrid";

/** The phone's day: colourful cards in time order, all-day first. */
export function DayList({
  events, members, labels, emptyLabel, onSelect,
}: {
  events: GridEvent[]; members: Map<number, Member>; labels: EventLabels; emptyLabel: string; onSelect: (e: GridEvent) => void;
}) {
  const sorted = [...events].sort((a, b) => (a.start ?? "").localeCompare(b.start ?? "") || a.id - b.id);
  if (sorted.length === 0) return <p className="card muted" style={{ textAlign: "center" }}>{emptyLabel}</p>;
  return (
    <div className="daylist">
      {sorted.map((e) => {
        const m = e.member_id ? members.get(e.member_id) : null;
        return (
          <button key={e.id} type="button" className={`daycard ${colorClass(m)}${m ? "" : " none"}`} onClick={() => onSelect(e)}>
            <span style={{ flex: 1 }}>
              <b>{e.title}</b>
              <span className="t">{timeLabel(e, labels.allDay)}{peopleOf(e, members).length > 1 ? ` · ${peopleOf(e, members).map((p) => p.name).join(" + ")}` : ""}</span>
            </span>
            <Avatar member={m} size={32} />
          </button>
        );
      })}
    </div>
  );
}
