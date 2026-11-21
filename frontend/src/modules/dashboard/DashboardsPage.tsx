import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, newAction } from "../../shared/api/client";
import { errorText } from "../../shared/api/errors";
import type { Lang } from "../../shared/dates";
import { useToday } from "../../shared/dates/useToday";
import { TopBar, useFamily } from "../../shared/family";
import { Modal } from "../../shared/ui/Modal";
import { DashboardCanvas, type EditApi } from "./DashboardCanvas";
import {
  ALL_CATEGORIES, DEFAULT_SLIDESHOW, type Dashboard, type DashboardSummary, type Device, type Orientation,
  type Preset, type Size, type SlideshowSettings, type StartView, type Widget,
} from "./types";

const SLUG = /^[a-z0-9][a-z0-9-]{0,29}$/;
const RESERVED = ["admin", "api", "assets", "static", "default", "favicon", "_test"];
const TYPES: Widget["type"][] = ["person-agenda", "week-calendar", "photo-slideshow", "meal-today", "meal-boxes", "todo", "chores", "stars", "weather", "birthdays", "countdown", "message", "clock"];

const emptyDraft = (): Dashboard => ({
  slug: "", name: "", device: "screen", orientation: "landscape", is_default: false, widgets: [],
  start_view: "day", touch: false, return_after: 60, idle_photo_after: 0, slideshow: { ...DEFAULT_SLIDESHOW },
  title: null, show_title: true, show_clock: true, night_start: null, night_end: null,
});

function newWidget(type: Widget["type"], widgets: Widget[]): Widget {
  const n = Math.max(0, ...widgets.map((w) => Number(w.id.replace(/\D/g, "")) || 0)) + 1;
  const base = { id: `w${n}`, order: widgets.length + 1, size: "medium" as Size };
  switch (type) {
    case "week-calendar": return { ...base, type, size: "large", settings: { categories: [...ALL_CATEGORIES], weeks: 1, members: [] } };
    case "person-agenda": return { ...base, type, settings: { days: 1, members: [] } };
    case "photo-slideshow": return { ...base, type, settings: { layout: "tile" } };
    case "meal-boxes": return { ...base, type, size: "large", settings: { days: 5 } };
    default: return { ...base, type, size: "small", settings: {} } as Widget;
  }
}

/** The size of the screen in CSS pixels, and the thickness of the frame drawn around it in the editor. */
const SCREENS: Record<Device, [number, number, number]> = { phone: [390, 844, 12], tablet: [1024, 768, 16], screen: [1920, 1080, 10] };
function viewport(d: Dashboard): { w: number; h: number; bezel: number } {
  const [a, b, bezel] = SCREENS[d.device];
  const [w, h] = d.orientation === "portrait" ? [Math.min(a, b), Math.max(a, b)] : [Math.max(a, b), Math.min(a, b)];
  return { w, h, bezel };
}

function Seg<T extends string>({ label, options, value, onPick }: { label: string; options: [T, string][]; value: T; onPick: (v: T) => void }) {
  return (
    <div>
      <span className="eyebrow">{label}</span>
      <div className="seg" role="group" aria-label={label}>
        {options.map(([v, text]) => (
          <button key={v} type="button" className={value === v ? "on" : ""} aria-pressed={value === v} onClick={() => onPick(v)}>{text}</button>
        ))}
      </div>
    </div>
  );
}

function Editor({ initial, isNew, presets, onDone }: {
  initial: Dashboard; isNew: boolean; presets: Preset[]; onDone: (slug: string | null) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language === "da" ? "da" : "en") as Lang;
  const queryClient = useQueryClient();
  const today = useToday();
  const family = useFamily();
  const [draft, setDraft] = useState<Dashboard>(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [titleMode, setTitleMode] = useState<"family" | "custom" | "none">(!initial.show_title ? "none" : initial.title ? "custom" : "family");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const albums = useQuery({ queryKey: ["albums"], queryFn: () => api.get<{ albums: { id: number; name: string }[] }>("/api/photos/albums") });

  const stage = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.5);
  const { w: width, h: height, bezel } = viewport(draft);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    // the real screen is shown at its own size and scaled down to fit the page (and never taller than ~680 px)
    const measure = () => setZoom(Math.min(1, (el.clientWidth - 2 * bezel - 8) / width, (680 - 2 * bezel) / height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width, height, bezel]);

  const patch = (p: Partial<Dashboard>) => setDraft((d) => ({ ...d, ...p }));
  const setWidgets = (fn: (w: Widget[]) => Widget[]) => setDraft((d) => ({ ...d, widgets: fn(d.widgets) }));
  const slugOk = SLUG.test(draft.slug) && !RESERVED.includes(draft.slug);
  const canSave = draft.name.trim().length > 0 && (!isNew || slugOk);
  const address = initial.is_default && !isNew ? "/" : `/${draft.slug || "…"}`;
  const url = `${window.location.origin}${address}`;

  const insert = (widget: Widget, beforeId: string | null) =>
    setWidgets((list) => {
      const at = beforeId ? list.findIndex((w) => w.id === beforeId) : -1;
      const next = [...list];
      next.splice(at < 0 ? next.length : at, 0, widget);
      return next;
    });

  const edit: EditApi = {
    selected, zoom, select: setSelected, albums: albums.data?.albums ?? [],
    move: (id, dir) => setWidgets((list) => {
      const i = list.findIndex((w) => w.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    }),
    resize: (id, size) => setWidgets((list) => list.map((w) => (w.id === id ? { ...w, size } : w))),
    remove: (id) => { setWidgets((list) => list.filter((w) => w.id !== id)); setSelected(null); },
    change: (id, settings) => setWidgets((list) => list.map((w) => (w.id === id ? ({ ...w, settings } as Widget) : w))),
    changeSlideshow: (p) => setDraft((d) => ({ ...d, slideshow: { ...d.slideshow, ...p } as SlideshowSettings })),
    drop: (targetId, payload) => {
      if (payload.startsWith("new:")) {
        const widget = newWidget(payload.slice(4) as Widget["type"], draft.widgets);
        insert(widget, targetId);
        setSelected(widget.id);
      } else if (payload.startsWith("move:")) {
        const id = payload.slice(5);
        if (id === targetId) return;
        const moving = draft.widgets.find((w) => w.id === id);
        if (!moving) return;
        setWidgets((list) => list.filter((w) => w.id !== id));
        setDraft((d) => {
          const at = targetId ? d.widgets.findIndex((w) => w.id === targetId) : -1;
          const next = [...d.widgets];
          next.splice(at < 0 ? next.length : at, 0, moving);
          return { ...d, widgets: next };
        });
      }
    },
  };

  const addWidget = (type: Widget["type"]) => {
    const widget = newWidget(type, draft.widgets);
    insert(widget, null);
    setSelected(widget.id);
  };

  function pickTitle(mode: "family" | "custom" | "none") {
    setTitleMode(mode);
    patch({ show_title: mode !== "none", title: mode === "custom" ? draft.title ?? "" : null });
  }

  async function save() {
    setBusy(true);
    setError(null);
    const body = {
      name: draft.name.trim(), device: draft.device, orientation: draft.orientation,
      widgets: draft.widgets.map((w, i) => ({ ...w, order: i + 1 })),
      start_view: draft.start_view, touch: draft.touch, return_after: draft.return_after,
      idle_photo_after: draft.touch ? draft.idle_photo_after : 0, slideshow: draft.slideshow,
      title: titleMode === "custom" ? (draft.title ?? "").trim() || null : null, show_title: titleMode !== "none",
      show_clock: draft.show_clock, night_start: draft.night_start, night_end: draft.night_end,
    };
    try {
      if (isNew) await api.withCode("POST", "/api/dashboard/dashboards", { ...body, slug: draft.slug }, newAction());
      else await api.withCode("PUT", `/api/dashboard/dashboards/${initial.slug}`, body, newAction());
      await queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onDone(draft.slug);
    } catch (e) {
      const text = errorText(e, t);
      if (text) setError(text);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.withCode("DELETE", `/api/dashboard/dashboards/${initial.slug}`, undefined, newAction());
      await queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      onDone(null);
    } catch (e) {
      setConfirmDelete(false);
      const text = errorText(e, t);
      if (text) setError(text);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard needs a secure context; the address is shown anyway */
    }
  }

  const shownTitle = titleMode === "none" ? null : titleMode === "custom" ? draft.title ?? "" : undefined;

  return (
    <div className="card editor">
      {isNew && presets.length > 0 && (
        <div>
          <span className="eyebrow">{t("dashboard.presets")}</span>
          <div className="toolbar">
            {presets.map((p) => (
              <button key={p.id} type="button" className="btn" onClick={() => patch({ device: p.device, orientation: p.orientation, widgets: p.widgets })}>
                {t(`dashboard.preset.${p.id}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="row">
        <div>
          <label className="field-label" htmlFor="d-name">{t("dashboard.name")}</label>
          <input id="d-name" className="field" value={draft.name} maxLength={60} onChange={(e) => patch({ name: e.target.value })} />
        </div>
        <div>
          <label className="field-label" htmlFor="d-slug">{t("dashboard.address")}</label>
          {isNew ? (
            <input id="d-slug" className="field" value={draft.slug} maxLength={30} aria-invalid={draft.slug !== "" && !slugOk}
              onChange={(e) => patch({ slug: e.target.value.toLowerCase() })} placeholder="tv" />
          ) : (
            <input id="d-slug" className="field" value={address} readOnly />
          )}
          <p className="hint">{isNew ? `${t("dashboard.addressHint")} /${draft.slug || "tv"}` : t("dashboard.addressFixed")}</p>
        </div>
      </div>

      <div className="row" style={{ alignItems: "flex-start" }}>
        <Seg<Device> label={t("dashboard.deviceLabel")} value={draft.device} onPick={(device) => patch({ device, orientation: device === "phone" ? "portrait" : draft.orientation === "portrait" && draft.device === "phone" ? "landscape" : draft.orientation })}
          options={[["phone", t("dashboard.device.phone")], ["tablet", t("dashboard.device.tablet")], ["screen", t("dashboard.device.screen")]]} />
        <Seg<Orientation> label={t("dashboard.orientationLabel")} value={draft.orientation} onPick={(orientation) => patch({ orientation })}
          options={[["landscape", t("dashboard.orientation.landscape")], ["portrait", t("dashboard.orientation.portrait")]]} />
        <div>
          <Seg label={t("dashboard.titleOnScreen")} value={titleMode} onPick={pickTitle}
            options={[["family", t("dashboard.titleMode.family")], ["custom", t("dashboard.titleMode.custom")], ["none", t("dashboard.titleMode.none")]]} />
          <label className="toggle" style={{ marginTop: 6 }}>
            <button type="button" className={`switch${draft.show_clock ? " on" : ""}`} role="switch" aria-checked={draft.show_clock} aria-label={t("dashboard.showClock")} onClick={() => patch({ show_clock: !draft.show_clock })}><span /></button>
            {t("dashboard.showClock")}
          </label>
          {titleMode === "custom" && (
            <div style={{ marginTop: 8 }}>
              <label className="visually-hidden" htmlFor="d-title">{t("dashboard.titleMode.custom")}</label>
              <input id="d-title" className="field" value={draft.title ?? ""} maxLength={40} placeholder={family.name} onChange={(e) => patch({ title: e.target.value })} />
            </div>
          )}
        </div>
      </div>

      <div>
        <span className="eyebrow">{t("dashboard.palette")}</span>
        <div className="palette">
          {TYPES.map((type) => (
            <button key={type} type="button" className="tile" draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", `new:${type}`)}
              onClick={() => addWidget(type)}>
              + {t(`dashboard.type.${type}`)}
            </button>
          ))}
        </div>
        <p className="hint">{t("dashboard.paletteHint")}</p>
      </div>

      <div>
        <span className="eyebrow">{t("dashboard.preview")}</span>
        <div className="stage" ref={stage}>
          <div className={`device dev-${draft.device === "screen" ? "tv" : draft.device} device-${draft.orientation}`} style={{ padding: bezel }}>
            <div className="device-screen" style={{ width, height, zoom }}>
              <div className={`display display-${draft.device} display-${draft.orientation} preview`}>
                <TopBar lang={lang} name={shownTitle} showClock={draft.show_clock} />
                {draft.widgets.length === 0 ? (
                  <p className="muted" style={{ padding: 40 }}>{t("dashboard.emptyCanvas")}</p>
                ) : null}
                <DashboardCanvas d={draft} today={today} lang={lang} tickable={false} edit={edit} />
              </div>
            </div>
          </div>
          <p className="hint" style={{ textAlign: "center" }}>
            {t("dashboard.previewOf", { device: t(`dashboard.device.${draft.device}`) })} · {width} × {height}. {t("dashboard.deviceNote")}
          </p>
        </div>
      </div>

      <details className="screen-settings">
        <summary>{t("dashboard.screenSettings")}</summary>
        <div className="stack" style={{ gap: 14, marginTop: 12 }}>
          <Seg<StartView> label={t("dashboard.startView")} value={draft.start_view} onPick={(start_view) => patch({ start_view })}
            options={[["day", t("dashboard.view.day")], ["week", t("dashboard.view.week")], ["photos", t("dashboard.view.photos")]]} />
          <p className="hint" style={{ marginTop: -8 }}>{t("dashboard.startViewHint")}</p>
          <label className="toggle">
            <button type="button" className={`switch${draft.touch ? " on" : ""}`} role="switch" aria-checked={draft.touch} aria-label={t("dashboard.touchLabel")} onClick={() => patch({ touch: !draft.touch })}><span /></button>
            {t("dashboard.touchLabel")}
          </label>
          {draft.touch && (
            <>
              <Seg<string> label={t("dashboard.returnAfter")} value={String(draft.return_after)} onPick={(v) => patch({ return_after: Number(v) })}
                options={[["30", "30 s"], ["60", "1 min"], ["120", "2 min"], ["300", "5 min"]]} />
              <div>
                <label className="eyebrow" htmlFor="idle">{t("dashboard.idleAfter")}</label>
                <select id="idle" className="field" value={draft.idle_photo_after} onChange={(e) => patch({ idle_photo_after: Number(e.target.value) })}>
                  <option value={0}>{t("dashboard.never")}</option>
                  <option value={10}>{t("dashboard.minutes", { n: 10 })}</option>
                  <option value={30}>{t("dashboard.minutes", { n: 30 })}</option>
                  <option value={60}>{t("dashboard.minutes", { n: 60 })}</option>
                </select>
              </div>
            </>
          )}
          <div>
            <span className="eyebrow">{t("dashboard.night")}</span>
            <label className="toggle">
              <button type="button" className={`switch${draft.night_start !== null ? " on" : ""}`} role="switch" aria-checked={draft.night_start !== null} aria-label={t("dashboard.nightLabel")} onClick={() => patch(draft.night_start === null ? { night_start: 22, night_end: 6 } : { night_start: null, night_end: null })}><span /></button>
              {t("dashboard.nightLabel")}
            </label>
            {draft.night_start !== null && (
              <div className="row" style={{ marginTop: 8 }}>
                <div><label className="field-label" htmlFor="night-from">{t("dashboard.nightFrom")}</label>
                  <select id="night-from" className="field" value={draft.night_start} onChange={(e) => patch({ night_start: Number(e.target.value) })}>{Array.from({ length: 24 }, (_, h) => (<option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>))}</select></div>
                <div><label className="field-label" htmlFor="night-to">{t("dashboard.nightTo")}</label>
                  <select id="night-to" className="field" value={draft.night_end ?? 6} onChange={(e) => patch({ night_end: Number(e.target.value) })}>{Array.from({ length: 24 }, (_, h) => (<option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>))}</select></div>
              </div>
            )}
            <p className="hint">{t("dashboard.nightHint")}</p>
          </div>
          <div>
            <span className="eyebrow">{t("dashboard.overlays")}</span>
            {(["clock", "plan", "meal"] as const).map((name) => {
              const key = `overlay_${name}` as "overlay_clock" | "overlay_plan" | "overlay_meal";
              return (
                <label key={name} className="toggle">
                  <button type="button" className={`switch${draft.slideshow[key] ? " on" : ""}`} role="switch" aria-checked={draft.slideshow[key]} aria-label={t(`dashboard.overlay.${name}`)}
                    onClick={() => patch({ slideshow: { ...draft.slideshow, [key]: !draft.slideshow[key] } })}><span /></button>
                  {t(`dashboard.overlay.${name}`)}
                </label>
              );
            })}
          </div>
          <p className="summary">
            {draft.touch
              ? t("dashboard.summaryTouch", { view: t(`dashboard.view.${draft.start_view}`).toLowerCase(), n: Math.round((draft.return_after / 60) * 10) / 10 })
              : t("dashboard.summaryNoTouch", { view: t(`dashboard.view.${draft.start_view}`).toLowerCase() })}
          </p>
        </div>
      </details>

      {error && <p className="error" role="alert">{error}</p>}
      <div className="toolbar editor-footer">
        {!isNew && (
          <>
            <a className="btn" href={url} target="_blank" rel="noreferrer">{t("dashboard.open")}</a>
            <button type="button" className="btn" onClick={() => void copy()}>{copied ? t("dashboard.copied") : t("dashboard.copy")}</button>
          </>
        )}
        <span className="spacer" />
        {!isNew && !initial.is_default && (
          <button type="button" className="btn btn-danger" onClick={() => setConfirmDelete(true)}>{t("common.delete")}</button>
        )}
        <button type="button" className="btn" onClick={() => onDone(isNew ? null : initial.slug)}>{t("common.cancel")}</button>
        <button type="button" className="btn btn-primary" disabled={busy || !canSave} onClick={() => void save()}>{t("dashboard.save")}</button>
      </div>

      {confirmDelete && (
        <Modal title={t("common.delete")} onClose={() => setConfirmDelete(false)}>
          <p>{t("dashboard.confirmDelete", { name: initial.name })}</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setConfirmDelete(false)}>{t("common.cancel")}</button>
            <button className="btn btn-danger" disabled={busy} onClick={() => void remove()}>{t("common.delete")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function DashboardsPage() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | "new" | null>(null);
  const list = useQuery({ queryKey: ["dashboards"], queryFn: () => api.get<DashboardSummary[]>("/api/dashboard/dashboards") });
  const presets = useQuery({ queryKey: ["presets"], queryFn: () => api.get<Preset[]>("/api/dashboard/presets") });
  const current = useQuery({
    queryKey: ["dashboard", selected],
    queryFn: () => api.get<Dashboard>(`/api/dashboard/dashboards/${selected}`),
    enabled: selected !== null && selected !== "new",
  });

  return (
    <div className="page">
      <div className="page-head">
        <h1>{t("dashboard.title")}</h1>
        <button className="btn btn-primary" onClick={() => setSelected("new")}>+ {t("dashboard.newDashboard")}</button>
      </div>
      <div className="dash-layout">
        <div className="dash-list">
          {list.data?.map((d) => (
            <button key={d.slug} className={`card dash-card${selected === d.slug ? " selected" : ""}`} onClick={() => setSelected(d.slug)}>
              <span className="dash-card-head">
                <strong>{d.name}</strong>
                {d.is_default && <span className="chip on">{t("dashboard.default")}</span>}
              </span>
              <span className="muted">
                {t(`dashboard.device.${d.device}`)} · {t(`dashboard.orientation.${d.orientation}`)} · {t("dashboard.widgetCount", { count: d.widget_count })}
              </span>
              <span className="muted">/{d.is_default ? "" : d.slug}</span>
            </button>
          ))}
        </div>
        <div>
          {selected === null && <p className="muted">{t("dashboard.selectOne")}</p>}
          {selected === "new" && (
            <Editor key="new" initial={emptyDraft()} isNew presets={presets.data ?? []} onDone={(slug) => setSelected(slug)} />
          )}
          {selected && selected !== "new" && current.data && current.data.slug === selected && (
            <Editor key={selected} initial={current.data} isNew={false} presets={[]} onDone={(slug) => setSelected(slug)} />
          )}
        </div>
      </div>
    </div>
  );
}
