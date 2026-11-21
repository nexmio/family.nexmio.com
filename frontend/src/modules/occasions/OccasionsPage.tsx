import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, newAction } from "../../shared/api/client";
import { errorText } from "../../shared/api/errors";
import { type Lang, formatDate, parseISO } from "../../shared/dates";
import { Avatar, useMembers } from "../../shared/members";

interface Occasion { id: number; title: string; month: number; day: number; year: number | null; member_id: number | null; next: string; days_until: number; turns: number | null }
interface Countdown { id: number; title: string; date: string; days_left: number }

export default function OccasionsPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language === "da" ? "da" : "en") as Lang;
  const queryClient = useQueryClient();
  const members = useMembers();
  const occasions = useQuery({ queryKey: ["occasions"], queryFn: () => api.get<Occasion[]>("/api/occasions/occasions") });
  const countdowns = useQuery({ queryKey: ["countdowns"], queryFn: () => api.get<Countdown[]>("/api/occasions/countdowns") });
  const [o, setO] = useState({ title: "", date: "", who: "" });
  const [c, setC] = useState({ title: "", date: "" });
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      for (const k of ["occasions", "countdowns", "display-occasions", "display-countdowns"]) await queryClient.invalidateQueries({ queryKey: [k] });
    } catch (e) { const x = errorText(e, t); if (x) setError(x); }
  }
  const addOccasion = () => run(async () => {
    const d = new Date(`${o.date}T00:00:00`);
    const hasYear = d.getFullYear() > 1900;
    await api.withCode("POST", "/api/occasions/occasions", { title: o.title.trim(), month: d.getMonth() + 1, day: d.getDate(), year: hasYear ? d.getFullYear() : null, member_id: o.who ? Number(o.who) : null }, newAction());
    setO({ title: "", date: "", who: "" });
  });
  const addCountdown = () => run(async () => {
    await api.withCode("POST", "/api/occasions/countdowns", { title: c.title.trim(), date: c.date }, newAction());
    setC({ title: "", date: "" });
  });

  return (
    <div className="page narrow">
      <h1>{t("occasions.title")}</h1>
      {error && <p className="error" role="alert">{error}</p>}

      <section className="card">
        <h2>{t("occasions.birthdays")}</h2>
        <form className="todo-add" onSubmit={(e) => { e.preventDefault(); if (o.title.trim() && o.date) void addOccasion(); }}>
          <label className="visually-hidden" htmlFor="oc-title">{t("occasions.name")}</label>
          <input id="oc-title" className="field" placeholder={t("occasions.name")} value={o.title} maxLength={60} onChange={(e) => setO({ ...o, title: e.target.value })} />
          <label className="visually-hidden" htmlFor="oc-date">{t("occasions.date")}</label>
          <input id="oc-date" className="field" type="date" style={{ width: 170 }} value={o.date} onChange={(e) => setO({ ...o, date: e.target.value })} />
          <label className="visually-hidden" htmlFor="oc-who">{t("occasions.who")}</label>
          <select id="oc-who" className="field" style={{ width: 170 }} value={o.who} onChange={(e) => setO({ ...o, who: e.target.value })}>
            <option value="">{t("common.wholeFamily")}</option>
            {members.list.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </select>
          <button className="btn btn-primary" type="submit" disabled={!o.title.trim() || !o.date}>{t("todo.add")}</button>
        </form>
        <p className="hint">{t("occasions.hint")}</p>
        {(occasions.data ?? []).map((x) => (
          <div key={x.id} className="todo-item">
            <Avatar member={x.member_id ? members.byId.get(x.member_id) : null} size={32} />
            <span style={{ flex: 1 }}><strong>{x.title}</strong>{x.turns ? <span className="muted"> · {t("occasions.turns", { n: x.turns })}</span> : null}<br /><span className="muted">{formatDate(parseISO(x.next), lang)} · {x.days_until === 0 ? t("occasions.today") : t("occasions.inDays", { n: x.days_until })}</span></span>
            <button className="icon-btn" aria-label={t("common.delete")} onClick={() => void run(() => api.withCode("DELETE", `/api/occasions/occasions/${x.id}`, undefined, newAction()))}>✕</button>
          </div>
        ))}
        {occasions.isSuccess && occasions.data.length === 0 && <p className="muted">{t("occasions.empty")}</p>}
      </section>

      <section className="card">
        <h2>{t("occasions.countdowns")}</h2>
        <form className="todo-add" onSubmit={(e) => { e.preventDefault(); if (c.title.trim() && c.date) void addCountdown(); }}>
          <label className="visually-hidden" htmlFor="cd-title">{t("occasions.cdName")}</label>
          <input id="cd-title" className="field" placeholder={t("occasions.cdName")} value={c.title} maxLength={60} onChange={(e) => setC({ ...c, title: e.target.value })} />
          <label className="visually-hidden" htmlFor="cd-date">{t("occasions.date")}</label>
          <input id="cd-date" className="field" type="date" style={{ width: 170 }} value={c.date} onChange={(e) => setC({ ...c, date: e.target.value })} />
          <button className="btn btn-primary" type="submit" disabled={!c.title.trim() || !c.date}>{t("todo.add")}</button>
        </form>
        {(countdowns.data ?? []).map((x) => (
          <div key={x.id} className="todo-item">
            <span style={{ flex: 1 }}><strong>{x.title}</strong><br /><span className="muted">{formatDate(parseISO(x.date), lang)} · {t("occasions.daysLeft", { count: x.days_left })}</span></span>
            <button className="icon-btn" aria-label={t("common.delete")} onClick={() => void run(() => api.withCode("DELETE", `/api/occasions/countdowns/${x.id}`, undefined, newAction()))}>✕</button>
          </div>
        ))}
      </section>
    </div>
  );
}
