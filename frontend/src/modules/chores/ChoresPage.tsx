import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, newAction } from "../../shared/api/client";
import { errorText } from "../../shared/api/errors";
import { toISO } from "../../shared/dates";
import { Avatar, colorClass, useMembers } from "../../shared/members";
import { Modal } from "../../shared/ui/Modal";
import { showToast } from "../../shared/ui/toast";

interface Chore { id: number; title: string; member_id: number; stars: number; part: "morning" | "evening" | "any"; days: "daily" | "weekdays" | "weekends" }
interface Stars { member_id: number; balance: number; today: number; week: number; goal: { title: string; stars: number } | null }
interface DayChore extends Chore { done: boolean }

export default function ChoresPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const members = useMembers();
  const chores = useQuery({ queryKey: ["chores"], queryFn: () => api.get<Chore[]>("/api/chores/chores") });
  const stars = useQuery({ queryKey: ["stars"], queryFn: () => api.get<Stars[]>("/api/chores/stars") });
  const day = useQuery({ queryKey: ["chores-day"], queryFn: () => api.get<DayChore[]>("/api/chores/day") });
  const [draft, setDraft] = useState<Partial<Chore> | null>(null);
  const [goalFor, setGoalFor] = useState<number | null>(null);
  const [goal, setGoal] = useState({ title: "", stars: 20 });
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    for (const k of ["chores", "stars", "chores-day", "display-chores", "display-stars"]) await queryClient.invalidateQueries({ queryKey: [k] });
  };
  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try { await fn(); await refresh(); } catch (e) { const x = errorText(e, t); if (x) setError(x); }
  }

  const save = () => run(async () => {
    const body = { title: draft!.title!.trim(), member_id: draft!.member_id!, stars: draft!.stars ?? 1, part: draft!.part ?? "any", days: draft!.days ?? "daily" };
    if (draft!.id) await api.withCode("PUT", `/api/chores/chores/${draft!.id}`, body, newAction());
    else await api.withCode("POST", "/api/chores/chores", body, newAction());
    setDraft(null);
  });
  const remove = (c: Chore) => run(async () => { await api.withCode("DELETE", `/api/chores/chores/${c.id}`, undefined, newAction()); setDraft(null); });
  const tick = (c: DayChore) => run(() => api.post(`/api/chores/chores/${c.id}/tick`, { date: toISO(new Date()), done: !c.done }));
  const saveGoal = () => run(async () => {
    await api.withCode("PUT", `/api/chores/goals/${goalFor}`, { title: goal.title.trim(), stars: goal.stars }, newAction());
    setGoalFor(null);
  });
  const claim = (id: number) => run(async () => {
    await api.withCode("POST", `/api/chores/goals/${id}/claim`, undefined, newAction(), true);
    showToast(t("chores.claimed"));
  });
  const clearGoal = (id: number) => run(() => api.withCode("DELETE", `/api/chores/goals/${id}`, undefined, newAction()));

  const kids = members.list;
  const doneNow = new Map((day.data ?? []).map((c) => [c.id, c.done]));

  return (
    <div className="page">
      <div className="page-head">
        <h1>{t("chores.title")}</h1>
        <button className="btn btn-primary" disabled={kids.length === 0} onClick={() => setDraft({ member_id: kids[0]?.id, stars: 1, part: "any", days: "daily" })}>+ {t("chores.add")}</button>
      </div>
      <p className="muted">{t("chores.intro")}</p>
      {kids.length === 0 && <p className="card">{t("chores.needMembers")}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <div className="chore-grid">
        {kids.map((m) => {
          const mine = (chores.data ?? []).filter((c) => c.member_id === m.id);
          const s = stars.data?.find((x) => x.member_id === m.id);
          const pct = s?.goal ? Math.min(100, Math.round((Math.max(0, s.balance) / s.goal.stars) * 100)) : 0;
          return (
            <section key={m.id} className={`card chore-card ${colorClass(m)}`}>
              <header className="chore-head"><Avatar member={m} size={44} /><h2 style={{ margin: 0 }}>{m.name}</h2><span className="stars-badge">★ {s?.balance ?? 0}</span></header>
              {s?.goal ? (
                <div className="goal">
                  <div className="goal-line"><strong>{s.goal.title}</strong><span className="muted">{Math.max(0, s.balance)} / {s.goal.stars} ★</span></div>
                  <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
                  <div className="toolbar" style={{ marginTop: 8 }}>
                    <button className="btn btn-primary" disabled={s.balance < s.goal.stars} onClick={() => void claim(m.id)}>{t("chores.claim")}</button>
                    <button className="btn" onClick={() => { setGoal({ title: s.goal!.title, stars: s.goal!.stars }); setGoalFor(m.id); }}>{t("common.edit")}</button>
                    <button className="btn" onClick={() => void clearGoal(m.id)}>{t("chores.removeGoal")}</button>
                  </div>
                </div>
              ) : (
                <button className="btn" onClick={() => { setGoal({ title: "", stars: 20 }); setGoalFor(m.id); }}>+ {t("chores.setGoal")}</button>
              )}
              {mine.length === 0 && <p className="muted">{t("chores.noChores")}</p>}
              {mine.map((c) => (
                <div key={c.id} className="todo-item">
                  {doneNow.has(c.id) ? (
                    <button className={`box${doneNow.get(c.id) ? " on" : ""}`} role="checkbox" aria-checked={Boolean(doneNow.get(c.id))} aria-label={c.title} onClick={() => void tick({ ...c, done: Boolean(doneNow.get(c.id)) })}>{doneNow.get(c.id) ? "✓" : ""}</button>
                  ) : <span className="box static" aria-hidden="true" style={{ opacity: .35 }} />}
                  <button className="link-btn" style={{ flex: 1 }} onClick={() => setDraft(c)}>{c.title} <span className="muted">· {c.stars}★ · {t(`chores.part.${c.part}`)} · {t(`chores.days.${c.days}`)}</span></button>
                </div>
              ))}
            </section>
          );
        })}
      </div>

      {draft && (
        <Modal title={draft.id ? t("chores.edit") : t("chores.add")} onClose={() => setDraft(null)}>
          <form className="stack" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); if (draft.title?.trim()) void save(); }}>
            <label className="field-label" htmlFor="chore-title">{t("chores.what")}</label>
            <input id="chore-title" className="field" value={draft.title ?? ""} maxLength={80} autoFocus onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <span className="field-label">{t("chores.who")}</span>
            <div className="who-row">
              {kids.map((m) => (
                <button key={m.id} type="button" className={`who ${colorClass(m)}${draft.member_id === m.id ? " on" : ""}`} aria-pressed={draft.member_id === m.id} onClick={() => setDraft({ ...draft, member_id: m.id })}><Avatar member={m} size={48} />{m.name}</button>
              ))}
            </div>
            <span className="field-label">{t("chores.starsEach")}</span>
            <div className="seg">{[1, 2, 3, 5].map((n) => (<button key={n} type="button" className={draft.stars === n ? "on" : ""} onClick={() => setDraft({ ...draft, stars: n })}>{n} ★</button>))}</div>
            <span className="field-label">{t("chores.when")}</span>
            <div className="seg">{(["morning", "evening", "any"] as const).map((p) => (<button key={p} type="button" className={draft.part === p ? "on" : ""} onClick={() => setDraft({ ...draft, part: p })}>{t(`chores.part.${p}`)}</button>))}</div>
            <div className="seg">{(["daily", "weekdays", "weekends"] as const).map((d) => (<button key={d} type="button" className={draft.days === d ? "on" : ""} onClick={() => setDraft({ ...draft, days: d })}>{t(`chores.days.${d}`)}</button>))}</div>
            <div className="modal-actions" style={{ justifyContent: "space-between" }}>
              {draft.id ? <button type="button" className="btn btn-danger" onClick={() => void remove(draft as Chore)}>{t("common.delete")}</button> : <span />}
              <button type="submit" className="btn btn-primary" disabled={!draft.title?.trim()}>{t("common.save")}</button>
            </div>
          </form>
        </Modal>
      )}
      {goalFor !== null && (
        <Modal title={t("chores.setGoal")} onClose={() => setGoalFor(null)}>
          <form className="stack" onSubmit={(e) => { e.preventDefault(); if (goal.title.trim()) void saveGoal(); }}>
            <label className="field-label" htmlFor="goal-title">{t("chores.goalName")}</label>
            <input id="goal-title" className="field" value={goal.title} maxLength={80} autoFocus onChange={(e) => setGoal({ ...goal, title: e.target.value })} />
            <label className="field-label" htmlFor="goal-stars">{t("chores.goalStars")}</label>
            <input id="goal-stars" className="field" type="number" min={1} max={1000} value={goal.stars} onChange={(e) => setGoal({ ...goal, stars: Math.max(1, Number(e.target.value) || 1) })} />
            <div className="modal-actions"><button type="submit" className="btn btn-primary" disabled={!goal.title.trim()}>{t("common.save")}</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
