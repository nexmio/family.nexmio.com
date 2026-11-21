import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { api, newAction } from "../../shared/api/client";
import { errorText } from "../../shared/api/errors";
import {
  type Lang, formatRange, isSameDay, isoWeek, parseISO, toISO, weekDays, weekStart, weekdayLong,
} from "../../shared/dates";
import { useToday } from "../../shared/dates/useToday";
import { Modal } from "../../shared/ui/Modal";
import { showToast } from "../../shared/ui/toast";

interface Dish { id: number; name: string; favorite?: boolean; ingredients: string[]; last_used?: string | null }
interface Day { date: string; dish: Dish | null; note: string | null }
interface Week { year: number; week: number; days: Day[] }

const toBody = (days: { date: string; dish: string | null; note: string | null }[]) => ({ days });

/** A day of dinner: tap a day, pick a dish from favorites and recent ones, done. */
function DaySheet({ day, label, onClose, onSave }: {
  day: Day; label: string; onClose: () => void;
  onSave: (dish: string | null, note: string | null, extras: { favorite: boolean; ingredients: string[] }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(day.dish?.name ?? "");
  const [note, setNote] = useState(day.note ?? "");
  const [favorite, setFavorite] = useState(day.dish?.favorite ?? false);
  const [ingredients, setIngredients] = useState((day.dish?.ingredients ?? []).join("\n"));
  const [busy, setBusy] = useState(false);
  const suggestions = useQuery({
    queryKey: ["dishes", name],
    queryFn: () => api.get<Dish[]>(`/api/mealplan/dishes?search=${encodeURIComponent(name)}`),
  });
  const known = suggestions.data?.find((d) => d.name.toLowerCase() === name.trim().toLowerCase());

  function pick(d: Dish) {
    setName(d.name);
    setFavorite(Boolean(d.favorite));
    setIngredients(d.ingredients.join("\n"));
  }

  async function save(remove = false) {
    setBusy(true);
    await onSave(remove ? null : name.trim() || null, note.trim() || null, {
      favorite, ingredients: ingredients.split("\n").map((x) => x.trim()).filter(Boolean),
    });
    setBusy(false);
  }

  return (
    <Modal title={label} onClose={onClose}>
      <form className="stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <div>
          <label className="field-label" htmlFor="meal-name">{t("mealplan.dish")}</label>
          <input id="meal-name" className="field" style={{ fontSize: 18, fontWeight: 700 }} value={name} maxLength={80} autoFocus onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <span className="field-label">{name ? t("mealplan.suggestions") : t("mealplan.favoritesAndRecent")}</span>
          <div className="chips">
            {(suggestions.data ?? []).slice(0, 10).map((d) => (
              <button key={d.id} type="button" className="chip" onClick={() => pick(d)}>{d.favorite ? "♥ " : ""}{d.name}</button>
            ))}
            {suggestions.isSuccess && suggestions.data.length === 0 && <span className="muted">{t("mealplan.noSuggestions")}</span>}
          </div>
        </div>
        <label className="toggle">
          <button type="button" className={`switch${favorite ? " on" : ""}`} role="switch" aria-checked={favorite} aria-label={t("mealplan.favorite")} onClick={() => setFavorite(!favorite)}><span /></button>
          {t("mealplan.favorite")}
        </label>
        <div>
          <label className="field-label" htmlFor="meal-ingredients">{t("mealplan.ingredients")}</label>
          <textarea id="meal-ingredients" className="field" rows={3} value={ingredients} placeholder={t("mealplan.ingredientsHint")} onChange={(e) => setIngredients(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="meal-note">{t("mealplan.note")}</label>
          <input id="meal-note" className="field" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="modal-actions" style={{ justifyContent: "space-between" }}>
          {day.dish ? <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void save(true)}>{t("mealplan.remove")}</button> : <span />}
          <button type="submit" className="btn btn-primary" disabled={busy || (!name.trim() && !known)}>{t("common.save")}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function MealPlanPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language === "da" ? "da" : "en") as Lang;
  const queryClient = useQueryClient();
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const dateParam = params.get("date");
  const start = weekStart(dateParam ? parseISO(dateParam) : today);
  const info = isoWeek(start);
  const days = weekDays(start);
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const week = useQuery({
    queryKey: ["meal-week", info.year, info.week],
    queryFn: () => api.get<Week>(`/api/mealplan/weeks/${info.year}/${info.week}`),
  });
  const favorites = useQuery({ queryKey: ["dishes", "favorites"], queryFn: () => api.get<Dish[]>("/api/mealplan/dishes?favorites=true") });

  const go = (d: Date) => setParams(toISO(d) === toISO(weekStart(today)) ? {} : { date: toISO(d) });
  const current = week.data?.days ?? [];

  async function putWeek(list: { date: string; dish: string | null; note: string | null }[], silent = true) {
    setError(null);
    try {
      const saved = await api.withCode<Week>("PUT", `/api/mealplan/weeks/${info.year}/${info.week}`, toBody(list), newAction(), silent);
      queryClient.setQueryData(["meal-week", info.year, info.week], saved);
      void queryClient.invalidateQueries({ queryKey: ["dishes"] });
      return saved;
    } catch (e) {
      const text = errorText(e, t);
      if (text) setError(text);
      return null;
    }
  }

  const asList = (src: Day[]) => src.map((d) => ({ date: d.date, dish: d.dish?.name ?? null, note: d.note }));

  async function saveDay(index: number, dish: string | null, note: string | null, extras: { favorite: boolean; ingredients: string[] }) {
    const list = asList(current);
    list[index] = { date: list[index].date, dish, note };
    const saved = await putWeek(list);
    const id = saved?.days[index].dish?.id;
    if (saved && id) {
      try {
        await api.withCode("PUT", `/api/mealplan/dishes/${id}`, { favorite: extras.favorite, ingredients: extras.ingredients }, newAction(), true);
      } catch { /* the dish itself is saved */ }
      await queryClient.invalidateQueries({ queryKey: ["meal-week", info.year, info.week] });
    }
    if (saved) {
      setEditing(null);
      showToast(t("common.saved"));
    }
  }

  async function copyLastWeek() {
    const prev = addDays(start, -7);
    const p = isoWeek(prev);
    const last = await api.get<Week>(`/api/mealplan/weeks/${p.year}/${p.week}`);
    if (last.days.every((d) => !d.dish)) return showToast(t("mealplan.nothingToCopy"));
    const before = asList(current);
    const list = last.days.map((d, i) => ({ date: toISO(days[i]), dish: d.dish?.name ?? null, note: d.note }));
    if (await putWeek(list)) showToast(t("mealplan.copied"), { label: t("common.undo"), run: () => void putWeek(before) });
  }

  async function fillWithFavorites() {
    const favs = favorites.data ?? [];
    if (favs.length === 0) return showToast(t("mealplan.noFavorites"));
    const before = asList(current);
    const used = new Set(current.filter((d) => d.dish).map((d) => d.dish!.name));
    const pool = favs.filter((f) => !used.has(f.name));
    let n = 0;
    const list = asList(current).map((d) => {
      if (d.dish) return d;
      const pick = (pool.length ? pool : favs)[n++ % (pool.length || favs.length)];
      return { ...d, dish: pick.name };
    });
    if (await putWeek(list)) showToast(t("mealplan.filled"), { label: t("common.undo"), run: () => void putWeek(before) });
  }

  async function toShoppingList() {
    const titles = [...new Set(current.flatMap((d) => d.dish?.ingredients ?? []))];
    if (titles.length === 0) return showToast(t("mealplan.noIngredients"));
    try {
      const r = await api.withCode<{ added: number; skipped: number }>("POST", "/api/shopping/bulk", { titles }, newAction(), true);
      showToast(t("mealplan.addedToList", { n: r.added }));
    } catch (e) {
      const text = errorText(e, t);
      if (text) setError(text);
    }
  }

  return (
    <div className="page narrow">
      <div className="page-head">
        <h1>
          {t("mealplan.week", { n: info.week })} <span className="muted">· {formatRange(start, addDays(start, 6), lang)}</span>
        </h1>
        <div className="toolbar">
          <button className="btn icon" onClick={() => go(addDays(start, -7))} aria-label={t("mealplan.prev")}>‹</button>
          <button className="btn" onClick={() => go(today)}>{t("mealplan.thisWeek")}</button>
          <button className="btn icon" onClick={() => go(addDays(start, 7))} aria-label={t("mealplan.next")}>›</button>
        </div>
      </div>

      {week.isLoading && <p className="muted">{t("common.loading")}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <section className="card meal-list">
        {days.map((d, i) => {
          const saved = current[i];
          const isToday = isSameDay(d, today);
          return (
            <button key={toISO(d)} type="button" className={`meal-row meal-tap${isToday ? " today" : ""}`} onClick={() => saved && setEditing(i)}>
              <span className="meal-date"><strong>{weekdayLong(d, lang)}</strong><span className="muted"> {d.getDate()}.</span></span>
              <span className="meal-view">
                {saved?.dish ? (
                  <>
                    <strong>{saved.dish.favorite ? "♥ " : ""}{saved.dish.name}</strong>
                    {saved.note && <span className="muted"> · {saved.note}</span>}
                  </>
                ) : (
                  <span className="meal-add">+ {t("mealplan.addDish")}</span>
                )}
              </span>
            </button>
          );
        })}
      </section>

      <div className="toolbar">
        <button className="btn" onClick={() => void copyLastWeek()}>{t("mealplan.copyLast")}</button>
        <button className="btn" onClick={() => void fillWithFavorites()}>{t("mealplan.fillFavorites")}</button>
        <button className="btn btn-primary" onClick={() => void toShoppingList()}>{t("mealplan.toShopping")}</button>
      </div>
      <p className="hint">{t("mealplan.tapHint")}</p>

      {editing !== null && current[editing] && (
        <DaySheet
          day={current[editing]}
          label={`${weekdayLong(days[editing], lang)} ${days[editing].getDate()}.`}
          onClose={() => setEditing(null)}
          onSave={(dish, note, extras) => saveDay(editing, dish, note, extras)}
        />
      )}
    </div>
  );
}
