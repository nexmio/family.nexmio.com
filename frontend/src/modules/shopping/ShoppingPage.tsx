import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, newAction } from "../../shared/api/client";
import { errorText } from "../../shared/api/errors";
import { showToast } from "../../shared/ui/toast";

interface Item { id: number; title: string; group: string; done: boolean }
const GROUPS = ["produce", "dairy", "meat", "pantry", "frozen", "household", "other"] as const;

export default function ShoppingPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const items = useQuery({ queryKey: ["shopping"], queryFn: () => api.get<Item[]>("/api/shopping/items") });
  const [title, setTitle] = useState("");
  const [group, setGroup] = useState<(typeof GROUPS)[number]>("other");
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await queryClient.invalidateQueries({ queryKey: ["shopping"] });
    } catch (e) {
      const text = errorText(e, t);
      if (text) setError(text);
    }
  }
  const add = () => run(async () => {
    await api.withCode("POST", "/api/shopping/items", { title: title.trim(), group }, newAction(), true);
    setTitle("");
  });
  // ticking is what happens in the shop, so it needs no code
  const tick = (i: Item) => run(() => api.post(`/api/shopping/items/${i.id}/tick`, { done: !i.done }));
  const setGroupOf = (i: Item, g: string) => run(() => api.withCode("PUT", `/api/shopping/items/${i.id}`, { group: g }, newAction(), true));
  const remove = (i: Item) => run(async () => {
    await api.withCode("DELETE", `/api/shopping/items/${i.id}`, undefined, newAction(), true);
    showToast(t("common.deleted"), { label: t("common.undo"), run: () => void run(() => api.withCode("POST", "/api/shopping/items", { title: i.title, group: i.group }, newAction(), true)) });
  });
  const clear = () => run(() => api.withCode("POST", "/api/shopping/clear-done", undefined, newAction()));

  const data = items.data ?? [];
  const open = data.filter((i) => !i.done);
  const done = data.filter((i) => i.done);

  return (
    <div className="page narrow">
      <div className="page-head">
        <h1>{t("shopping.title")}</h1>
        {done.length > 0 && <button className="btn" onClick={() => void clear()}>{t("shopping.clear")}</button>}
      </div>
      <section className="card">
        <form className="todo-add" onSubmit={(e) => { e.preventDefault(); if (title.trim()) void add(); }}>
          <label className="visually-hidden" htmlFor="shop-title">{t("shopping.new")}</label>
          <input id="shop-title" className="field" placeholder={t("shopping.new")} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
          <label className="visually-hidden" htmlFor="shop-group">{t("shopping.group")}</label>
          <select id="shop-group" className="field" style={{ width: 190 }} value={group} onChange={(e) => setGroup(e.target.value as (typeof GROUPS)[number])}>
            {GROUPS.map((g) => (<option key={g} value={g}>{t(`shopping.groups.${g}`)}</option>))}
          </select>
          <button className="btn btn-primary" type="submit" disabled={!title.trim()}>{t("shopping.add")}</button>
        </form>
      </section>
      {error && <p className="error" role="alert">{error}</p>}
      {items.isSuccess && data.length === 0 && <p className="card muted">{t("shopping.empty")}</p>}
      {GROUPS.map((g) => {
        const list = open.filter((i) => i.group === g);
        if (list.length === 0) return null;
        return (
          <section key={g} className="card">
            <h2>{t(`shopping.groups.${g}`)}</h2>
            {list.map((i) => (
              <div key={i.id} className="todo-item">
                <button className="box" role="checkbox" aria-checked="false" aria-label={i.title} onClick={() => void tick(i)} />
                <span className="t" style={{ flex: 1 }}>{i.title}</span>
                <select className="mini-select" aria-label={t("shopping.group")} value={i.group} onChange={(e) => void setGroupOf(i, e.target.value)}>
                  {GROUPS.map((x) => (<option key={x} value={x}>{t(`shopping.groups.${x}`)}</option>))}
                </select>
                <button className="icon-btn" aria-label={t("common.delete")} onClick={() => void remove(i)}>✕</button>
              </div>
            ))}
          </section>
        );
      })}
      {done.length > 0 && (
        <section className="card">
          <h2>{t("shopping.done")}</h2>
          {done.map((i) => (
            <div key={i.id} className="todo-item done">
              <button className="box on" role="checkbox" aria-checked="true" aria-label={i.title} onClick={() => void tick(i)}>✓</button>
              <span className="t" style={{ flex: 1 }}>{i.title}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
