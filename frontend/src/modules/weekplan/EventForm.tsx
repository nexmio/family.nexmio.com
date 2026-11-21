import { addDays, addMonths } from "date-fns";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, api, newAction } from "../../shared/api/client";
import { errorText } from "../../shared/api/errors";
import { type Lang, formatDate, parseISO, toISO } from "../../shared/dates";
import { useToday } from "../../shared/dates/useToday";
import { Avatar, colorClass, useMembers } from "../../shared/members";
import { Modal } from "../../shared/ui/Modal";
import { parseQuick } from "./quick";
import { CATEGORIES, type EventData } from "./types";

interface Props {
  initial?: EventData;
  defaultDate: string;
  onClose: () => void;
  onSaved: () => void;
}

type Every = "" | "day" | "week" | "2weeks" | "month";

/** One sheet with the few things a parent needs: what, who, when, kind. */
export function EventForm({ initial, defaultDate, onClose, onSaved }: Props) {
  const { t, i18n } = useTranslation();
  const members = useMembers();
  const today = useToday();
  const [f, setF] = useState({
    title: initial?.title ?? "",
    date: initial?.date ?? defaultDate,
    start: initial?.start ?? "",
    end: initial?.end ?? "",
    people: initial ? [initial.member_id, ...initial.also_ids].filter((x): x is number => x !== null) : ([] as number[]),
    category: initial?.category ?? "appointment",
    notes: initial?.notes ?? "",
  });
  const [every, setEvery] = useState<Every>("");
  const [until, setUntil] = useState("");
  const [scopeAll, setScopeAll] = useState(false);
  const [quick, setQuick] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [duplicate, setDuplicate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [action] = useState(newAction);
  const [pickDate, setPickDate] = useState(false);
  const patch = (p: Partial<typeof f>) => setF({ ...f, ...p });
  const lang = (i18n.language === "da" ? "da" : "en") as Lang;

  const body = () => ({
    title: f.title.trim(),
    date: f.date,
    start: f.start || null,
    end: f.end || null,
    member_id: f.people[0] ?? null,
    also_ids: f.people.slice(1),
    category: f.category,
    notes: f.notes.trim() || null,
    ...(!initial && every ? { repeat: { every, until } } : {}),
  });

  function applyQuick() {
    if (!quick.trim()) return;
    const q = parseQuick(quick, members.list, today);
    setF({
      ...f,
      title: q.title || f.title,
      date: q.date ?? f.date,
      start: q.start ?? f.start,
      end: q.end ?? f.end,
      people: q.memberIds.length ? q.memberIds : f.people,
      category: q.category ?? f.category,
    });
    setQuick("");
  }

  function pickEvery(next: Every) {
    setEvery(next);
    if (next && !until && f.date) {
      const start = parseISO(f.date);
      setUntil(toISO(next === "day" ? addDays(start, 14) : next === "month" ? addMonths(start, 6) : addDays(start, 8 * 7)));
    }
  }

  async function submit(allowDuplicate: boolean) {
    const problems: string[] = [];
    if (!f.title.trim()) problems.push(t("weekplan.form.errTitle"));
    if (!f.date) problems.push(t("weekplan.form.errDate"));
    if (f.start && f.end && f.end < f.start) problems.push(t("weekplan.form.errEnd"));
    if (!initial && every && (!until || until < f.date)) problems.push(t("weekplan.form.errUntil"));
    setErrors(problems);
    if (problems.length) return;
    setBusy(true);
    try {
      const base = "/api/weekplan/events";
      if (initial) await api.withCode("PUT", `${base}/${initial.id}${scopeAll ? "?scope=series" : ""}`, body(), action);
      else await api.withCode("POST", allowDuplicate ? `${base}?allow_duplicate=true` : base, body(), action);
      onSaved();
    } catch (e) {
      if (e instanceof ApiError && e.error === "duplicate") setDuplicate(true);
      else {
        const text = e instanceof ApiError && e.error === "too_many_occurrences" ? t("weekplan.form.errTooMany") : errorText(e, t);
        if (text) setErrors([text]);
      }
    } finally {
      setBusy(false);
    }
  }

  if (duplicate) {
    return (
      <Modal title={t("weekplan.form.newTitle")} onClose={onClose}>
        <p>{t("weekplan.duplicate", { title: f.title.trim(), date: f.date ? formatDate(parseISO(f.date), lang) : "" })}</p>
        <div className="modal-actions">
          <button className="btn" type="button" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn btn-primary" type="button" disabled={busy} onClick={() => submit(true)}>
            {t("weekplan.createAnyway")}
          </button>
        </div>
      </Modal>
    );
  }

  const isToday = f.date === toISO(today);
  const isTomorrow = f.date === toISO(addDays(today, 1));
  const toggle = (id: number) => patch({ people: f.people.includes(id) ? f.people.filter((x) => x !== id) : [...f.people, id] });
  const everyOptions: [Every, string][] = [["", t("weekplan.repeat.never")], ["day", t("weekplan.repeat.day")], ["week", t("weekplan.repeat.week")], ["2weeks", t("weekplan.repeat.2weeks")], ["month", t("weekplan.repeat.month")]];

  return (
    <Modal title={initial ? t("weekplan.form.editTitle") : t("weekplan.form.newTitle")} onClose={onClose}>
      <form className="stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); void submit(false); }}>
        {!initial && (
          <div className="quick">
            <label className="field-label" style={{ marginTop: 0 }} htmlFor="ev-quick">{t("weekplan.form.quick")}</label>
            <input id="ev-quick" className="field" value={quick} placeholder={t("weekplan.form.quickHint")} onChange={(e) => setQuick(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyQuick(); } }} onBlur={applyQuick} />
          </div>
        )}
        <div>
          <label className="field-label" htmlFor="ev-title">{t("weekplan.form.what")}</label>
          <input id="ev-title" className="field" style={{ fontSize: 18, fontWeight: 700 }} value={f.title} maxLength={120} autoFocus={Boolean(initial)} onChange={(e) => patch({ title: e.target.value })} />
        </div>

        <div>
          <span className="field-label">{t("weekplan.form.member")}</span>
          <div className="who-row" role="group" aria-label={t("weekplan.form.member")}>
            <button type="button" className={`who mc-none${f.people.length === 0 ? " on" : ""}`} aria-pressed={f.people.length === 0} onClick={() => patch({ people: [] })}>
              <Avatar size={52} />{t("common.wholeFamily")}
            </button>
            {members.list.map((m) => (
              <button key={m.id} type="button" className={`who ${colorClass(m)}${f.people.includes(m.id) ? " on" : ""}`} aria-pressed={f.people.includes(m.id)} onClick={() => toggle(m.id)}>
                <Avatar member={m} size={52} />{m.name}
              </button>
            ))}
          </div>
          {members.list.length > 1 && <p className="hint">{t("weekplan.form.severalHint")}</p>}
        </div>

        <div>
          <span className="field-label">{t("weekplan.form.when")}</span>
          <div className="chips">
            <button type="button" className={`chip${isToday ? " on" : ""}`} onClick={() => { patch({ date: toISO(today) }); setPickDate(false); }}>{t("weekplan.form.today")}</button>
            <button type="button" className={`chip${isTomorrow ? " on" : ""}`} onClick={() => { patch({ date: toISO(addDays(today, 1)) }); setPickDate(false); }}>{t("weekplan.form.tomorrow")}</button>
            <button type="button" className={`chip${!isToday && !isTomorrow ? " on" : ""}`} onClick={() => setPickDate(true)}>{t("weekplan.form.pickDate")}</button>
          </div>
          {(pickDate || (!isToday && !isTomorrow)) && (
            <div style={{ marginTop: 10 }}>
              <label className="visually-hidden" htmlFor="ev-date">{t("weekplan.form.date")}</label>
              <input id="ev-date" className="field" type="date" value={f.date} onChange={(e) => patch({ date: e.target.value })} />
            </div>
          )}
          <div className="row" style={{ marginTop: 10 }}>
            <div>
              <label className="field-label" htmlFor="ev-start">{t("weekplan.form.from")}</label>
              <input id="ev-start" className="field" type="time" value={f.start} onChange={(e) => patch({ start: e.target.value })} />
            </div>
            <div>
              <label className="field-label" htmlFor="ev-end">{t("weekplan.form.to")}</label>
              <input id="ev-end" className="field" type="time" value={f.end} onChange={(e) => patch({ end: e.target.value })} />
            </div>
          </div>
        </div>

        {!initial ? (
          <div>
            <span className="field-label">{t("weekplan.form.repeat")}</span>
            <div className="chips" role="group" aria-label={t("weekplan.form.repeat")}>
              {everyOptions.map(([v, label]) => (
                <button key={v || "never"} type="button" className={`chip${every === v ? " on" : ""}`} aria-pressed={every === v} onClick={() => pickEvery(v)}>{label}</button>
              ))}
            </div>
            {every && (
              <div className="repeat-until">
                <label className="field-label" htmlFor="ev-until">{t("weekplan.form.until")}</label>
                <input id="ev-until" className="field" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
              </div>
            )}
          </div>
        ) : initial.series_id ? (
          <div>
            <span className="field-label">{t("weekplan.form.appliesTo")}</span>
            <div className="seg" role="group">
              <button type="button" className={!scopeAll ? "on" : ""} aria-pressed={!scopeAll} onClick={() => setScopeAll(false)}>{t("weekplan.form.onlyThis")}</button>
              <button type="button" className={scopeAll ? "on" : ""} aria-pressed={scopeAll} onClick={() => setScopeAll(true)}>{t("weekplan.form.wholeSeries")}</button>
            </div>
          </div>
        ) : null}

        <div>
          <span className="field-label">{t("weekplan.form.category")}</span>
          <div className="chips" role="group" aria-label={t("weekplan.form.category")}>
            {CATEGORIES.map((c) => (
              <button key={c} type="button" className={`chip${f.category === c ? " on" : ""}`} aria-pressed={f.category === c} onClick={() => patch({ category: c })}>
                {t(`weekplan.category.${c}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="ev-notes">{t("weekplan.form.notes")}</label>
          <textarea id="ev-notes" className="field" rows={2} value={f.notes} maxLength={1000} onChange={(e) => patch({ notes: e.target.value })} />
        </div>

        {errors.map((m) => (<p key={m} className="error" role="alert">{m}</p>))}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{t("common.save")}</button>
      </form>
    </Modal>
  );
}
