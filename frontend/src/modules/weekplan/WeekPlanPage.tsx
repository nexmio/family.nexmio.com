import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addMonths } from "date-fns";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { api, newAction } from "../../shared/api/client";
import { errorText } from "../../shared/api/errors";
import {
  type Lang, formatDate, formatRange, isoWeek, parseISO, toISO, weekDays, weekStart, weekdayLong,
} from "../../shared/dates";
import { useToday } from "../../shared/dates/useToday";
import { Avatar, MemberFilter, useMembers } from "../../shared/members";
import { Modal } from "../../shared/ui/Modal";
import { DayList } from "../../shared/ui/DayList";
import { DayTimeline } from "../../shared/ui/DayTimeline";
import { useMediaQuery } from "../../shared/ui/useMediaQuery";
import { MonthGrid, monthRange } from "../../shared/ui/MonthGrid";
import { PersonMatrix } from "../../shared/ui/PersonMatrix";
import { type EventLabels, WeekGrid, peopleOf, timeLabel } from "../../shared/ui/WeekGrid";
import { showToast } from "../../shared/ui/toast";
import { EventForm } from "./EventForm";
import type { EventData } from "./types";

type View = "day" | "week" | "month" | "people";

export default function WeekPlanPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language === "da" ? "da" : "en") as Lang;
  const queryClient = useQueryClient();
  const today = useToday();
  const members = useMembers();
  const phone = useMediaQuery("(max-width: 800px)");
  const [params, setParams] = useSearchParams();
  const view = (params.get("view") as View) || "day";
  const dateParam = params.get("date");
  const anchor = dateParam ? parseISO(dateParam) : today;
  const [filter, setFilter] = useState<(number | "none")[]>([]);

  const start = weekStart(anchor);
  const days = weekDays(start);
  const month = monthRange(anchor);
  const from = view === "month" ? month.first : view === "day" ? anchor : start;
  const to = view === "month" ? month.last : view === "day" ? anchor : days[6];

  const memberParam = filter.length ? `&member=${filter.join(",")}` : "";
  const events = useQuery({
    queryKey: ["events", toISO(from), toISO(to), filter.join(",")],
    queryFn: () => api.get<EventData[]>(`/api/weekplan/events?from=${toISO(from)}&to=${toISO(to)}${memberParam}`),
  });

  const [selected, setSelected] = useState<EventData | null>(null);
  const [editing, setEditing] = useState<EventData | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const labels: EventLabels = { category: (c) => t(`weekplan.category.${c}`), allDay: t("common.allDay") };
  const go = (d: Date, v: View = view) => {
    const next: Record<string, string> = {};
    if (toISO(d) !== toISO(today)) next.date = toISO(d);
    if (v !== "day") next.view = v;
    setParams(next);
  };
  const step = (dir: -1 | 1) => go(view === "month" ? addMonths(anchor, dir) : view === "day" ? addDays(anchor, dir) : addDays(start, 7 * dir));
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["events"] });
  const week = isoWeek(start);
  const heading =
    view === "month"
      ? new Intl.DateTimeFormat(lang === "da" ? "da-DK" : "en-GB", { month: "long", year: "numeric" }).format(anchor)
      : view === "day"
        ? new Intl.DateTimeFormat(lang === "da" ? "da-DK" : "en-GB", { weekday: "long", day: "numeric", month: "long" }).format(anchor)
        : t("weekplan.week", { n: week.week });

  async function remove(event: EventData, scope: "this" | "following" | "series" = "this") {
    try {
      await api.withCode("DELETE", `/api/weekplan/events/${event.id}${scope === "this" ? "" : `?scope=${scope}`}`, undefined, newAction(), true);
      setConfirmDelete(false);
      setSelected(null);
      await refresh();
      if (scope === "this") {
        // one event can be brought back
        const { id: _id, created_at: _c, updated_at: _u, series_id: _s, ...data } = event;
        void [_id, _c, _u, _s];
        showToast(t("common.deleted"), {
          label: t("common.undo"),
          run: () => void api.withCode("POST", "/api/weekplan/events?allow_duplicate=true", data, newAction(), true).then(refresh),
        });
      } else showToast(t("common.deleted"));
    } catch (e) {
      const text = errorText(e, t);
      if (text) setMessage(text);
    }
  }

  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || !phone) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > 2 * Math.abs(dy)) step(dx < 0 ? 1 : -1);
  };

  const selectedMember = selected?.member_id ? members.byId.get(selected.member_id) : null;
  const data = events.data ?? [];

  return (
    <div className="page" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="page-head">
        <h1>
          <span className="cap">{heading}</span>{" "}
          {(view === "week" || view === "people") && <span className="muted">· {formatRange(start, days[6], lang)}</span>}
        </h1>
        <div className="toolbar">
          <div className="seg" role="group" aria-label={t("weekplan.view.label")}>
            {(["day", "week", "month", "people"] as View[]).map((v) => (
              <button key={v} type="button" className={view === v ? "on" : ""} aria-pressed={view === v} onClick={() => go(anchor, v)}>
                {t(`weekplan.view.${v}`)}
              </button>
            ))}
          </div>
          <button className="btn icon" onClick={() => step(-1)} aria-label={t("weekplan.prev")}>‹</button>
          <button className="btn" onClick={() => go(today)}>{t("weekplan.thisWeek")}</button>
          <button className="btn icon" onClick={() => step(1)} aria-label={t("weekplan.next")}>›</button>
          <button className="btn btn-primary desktop-only" onClick={() => setEditing("new")}>+ {t("weekplan.newEvent")}</button>
        </div>
      </div>

      <MemberFilter members={members.list} selected={filter} onChange={setFilter} />

      {message && <p className="error" role="alert">{message}</p>}
      {events.isLoading && <p className="muted">{t("common.loading")}</p>}

      {view === "day" && phone && (
        <DayList events={data} members={members.byId} labels={labels} emptyLabel={t("weekplan.noEvents")} onSelect={(e) => setSelected(e as EventData)} />
      )}
      {view === "day" && !phone && (
        <div className="card"><DayTimeline date={anchor} events={data} people={filter.length ? members.list.filter((m) => filter.includes(m.id)) : members.list}
          today={today} lang={lang} labels={labels} wholeFamilyLabel={t("common.wholeFamily")} allDayLabel={t("common.allDay")}
          onSelect={(e) => setSelected(e as EventData)} /></div>
      )}
      {view !== "day" && (<div className="card">
      {view === "week" && (
        <WeekGrid days={days} events={data} members={members.byId} today={today} lang={lang} labels={labels}
          todayLabel={t("weekplan.today")} onSelect={(e) => setSelected(e as EventData)} />
      )}
      {view === "month" && (
        <MonthGrid anchor={anchor} events={data} members={members.byId} today={today} lang={lang}
          moreLabel={(n) => t("weekplan.more", { n })} onSelect={(e) => setSelected(e as EventData)}
          onOpenDay={(d) => go(d, "week")} />
      )}
      {view === "people" && (
        <PersonMatrix days={days} events={data} members={filter.length ? members.list.filter((m) => filter.includes(m.id)) : members.list}
          today={today} lang={lang} labels={labels} wholeFamilyLabel={t("common.wholeFamily")} onSelect={(e) => setSelected(e as EventData)} />
      )}
      </div>)}

      <button className="fab phone-only" aria-label={t("weekplan.newEvent")} onClick={() => setEditing("new")}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </button>

      <div className="toolbar">
        <Link className="btn" to="import">{t("weekplan.importLink")}</Link>
        <a className="btn" href={`/api/weekplan/import/template?lang=${lang}`} download>{t("weekplan.downloadTemplate")}</a>
      </div>

      {selected && !confirmDelete && editing === null && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <dl className="details">
            <dt>{t("weekplan.form.date")}</dt>
            <dd>{weekdayLong(parseISO(selected.date), lang)} {formatDate(parseISO(selected.date), lang)}</dd>
            <dt>{t("weekplan.form.start")}</dt>
            <dd>{timeLabel(selected, t("common.allDay"))}</dd>
            <dt>{t("weekplan.form.member")}</dt>
            <dd className="with-avatar"><Avatar member={selectedMember} size={22} /> {selected ? peopleOf(selected, members.byId).map((p) => p.name).join(" + ") || t("common.wholeFamily") : ""}</dd>
            {selected.series_id && (<><dt>{t("weekplan.form.repeat")}</dt><dd>{t("weekplan.series.title")}</dd></>)}
            <dt>{t("weekplan.form.category")}</dt>
            <dd>{t(`weekplan.category.${selected.category}`)}</dd>
            {selected.notes && (<><dt>{t("weekplan.detail.notes")}</dt><dd className="pre">{selected.notes}</dd></>)}
          </dl>
          <div className="modal-actions">
            <button className="btn" onClick={() => setSelected(null)}>{t("common.close")}</button>
            <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>{t("common.delete")}</button>
            <button className="btn btn-primary" onClick={() => setEditing(selected)}>{t("common.edit")}</button>
          </div>
        </Modal>
      )}

      {selected && confirmDelete && (
        <Modal title={t("common.delete")} onClose={() => setConfirmDelete(false)}>
          {selected.series_id ? (
            <>
              <p>{t("weekplan.series.ask")}</p>
              <div className="stack">
                <button className="btn btn-danger" onClick={() => void remove(selected, "this")}>{t("weekplan.series.only")}</button>
                <button className="btn btn-danger" onClick={() => void remove(selected, "following")}>{t("weekplan.series.following")}</button>
                <button className="btn btn-danger" onClick={() => void remove(selected, "series")}>{t("weekplan.series.all")}</button>
                <button className="btn" onClick={() => setConfirmDelete(false)}>{t("common.cancel")}</button>
              </div>
            </>
          ) : (
            <>
              <p>{t("weekplan.detail.confirmDelete", { title: selected.title })}</p>
              <div className="modal-actions">
                <button className="btn" onClick={() => setConfirmDelete(false)}>{t("common.cancel")}</button>
                <button className="btn btn-danger" onClick={() => void remove(selected)}>{t("common.delete")}</button>
              </div>
            </>
          )}
        </Modal>
      )}

      {editing && (
        <EventForm
          initial={editing === "new" ? undefined : editing}
          defaultDate={toISO(editing === "new" ? (start <= today && today <= days[6] ? today : start) : today)}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setSelected(null); void refresh(); }}
        />
      )}
    </div>
  );
}
