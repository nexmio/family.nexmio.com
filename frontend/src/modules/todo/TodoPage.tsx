import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, newAction } from "../../shared/api/client";
import { errorText } from "../../shared/api/errors";
import { toISO } from "../../shared/dates";
import { Avatar, useMembers } from "../../shared/members";
import { showToast } from "../../shared/ui/toast";

interface Item { id: number; title: string; done: boolean; member_id: number | null; due: string | null; repeat: "" | "daily" | "weekly" }

export default function TodoPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const members = useMembers();
  const items = useQuery({ queryKey: ["todos"], queryFn: () => api.get<Item[]>("/api/todo/items") });
  const [title, setTitle] = useState("");
  const [who, setWho] = useState("");
  const [due, setDue] = useState("");
  const [repeat, setRepeat] = useState<"" | "daily" | "weekly">("");
  const today = toISO(new Date());
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await queryClient.invalidateQueries({ queryKey: ["todos"] });
    } catch (e) {
      const text = errorText(e, t);
      if (text) setError(text);
    }
  }

  const add = () =>
    run(async () => {
      await api.withCode("POST", "/api/todo/items", { title: title.trim(), member_id: who ? Number(who) : null, due: due || null, repeat }, newAction(), true);
      setTitle("");
      setDue("");
      setRepeat("");
    });
  // ticking needs no code, so this works on the wall screen too
  const toggle = (i: Item) => run(() => api.post(`/api/todo/items/${i.id}/tick`, { done: !i.done }));
  const remove = (i: Item) => run(async () => {
    await api.withCode("DELETE", `/api/todo/items/${i.id}`, undefined, newAction(), true);
    showToast(t("common.deleted"), { label: t("common.undo"), run: () => void run(() => api.withCode("POST", "/api/todo/items", { title: i.title, member_id: i.member_id, due: i.due, repeat: i.repeat }, newAction(), true)) });
  });
  const clear = () => run(() => api.withCode("POST", "/api/todo/clear-done", undefined, newAction()));
  const data = items.data ?? [];

  return (
    <div className="page narrow">
      <div className="page-head">
        <h1>{t("todo.title")}</h1>
        {data.some((i) => i.done) && <button className="btn" onClick={() => void clear()}>{t("todo.clear")}</button>}
      </div>
      <section className="card">
        <form className="todo-add" onSubmit={(e) => { e.preventDefault(); if (title.trim()) void add(); }}>
          <label className="visually-hidden" htmlFor="todo-title">{t("todo.new")}</label>
          <input id="todo-title" className="field" placeholder={t("todo.new")} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
          <label className="visually-hidden" htmlFor="todo-who">{t("todo.who")}</label>
          <select id="todo-who" className="field" style={{ width: 180 }} value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="">{t("common.wholeFamily")}</option>
            {members.list.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </select>
          <label className="visually-hidden" htmlFor="todo-due">{t("todo.due")}</label>
          <input id="todo-due" className="field" type="date" style={{ width: 170 }} value={due} onChange={(e) => setDue(e.target.value)} />
          <label className="visually-hidden" htmlFor="todo-repeat">{t("todo.repeat")}</label>
          <select id="todo-repeat" className="field" style={{ width: 150 }} value={repeat} onChange={(e) => setRepeat(e.target.value as "" | "daily" | "weekly")}>
            <option value="">{t("todo.noRepeat")}</option>
            <option value="daily">{t("todo.daily")}</option>
            <option value="weekly">{t("todo.weekly")}</option>
          </select>
          <button className="btn btn-primary" type="submit" disabled={!title.trim()}>{t("todo.add")}</button>
        </form>
      </section>
      {error && <p className="error" role="alert">{error}</p>}
      <section className="card">
        {items.isSuccess && data.length === 0 && <p className="muted">{t("todo.empty")}</p>}
        {data.map((i) => (
          <div key={i.id} className={`todo-item${i.done ? " done" : ""}`}>
            <button className={`box${i.done ? " on" : ""}`} role="checkbox" aria-checked={i.done} aria-label={i.title} onClick={() => void toggle(i)}>
              {i.done ? "✓" : ""}
            </button>
            <span className="t" style={{ flex: 1 }}>{i.title}{i.repeat ? <span className="muted"> ↻</span> : null}
              {i.due && !i.done && <span className={`due${i.due < today ? " late" : i.due === today ? " today" : ""}`}> {i.due < today ? t("todo.late") : i.due === today ? t("todo.dueToday") : i.due}</span>}
            </span>
            <Avatar member={i.member_id ? members.byId.get(i.member_id) : null} size={28} />
            <button className="icon-btn" aria-label={t("common.delete")} onClick={() => void remove(i)}>✕</button>
          </div>
        ))}
      </section>
    </div>
  );
}
