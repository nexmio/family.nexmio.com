import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Lang } from "../../shared/dates";
import { MemberFilter, useMembers } from "../../shared/members";
import { AgendaWidget } from "./widgets/AgendaWidget";
import { CalendarWidget } from "./widgets/CalendarWidget";
import { ClockWidget } from "./widgets/ClockWidget";
import { BirthdaysWidget, ChoresWidget, CountdownWidget, MessageWidget, StarsWidget, WeatherWidget } from "./widgets/FamilyWidgets";
import { MealTodayWidget } from "./widgets/MealTodayWidget";
import { MealWidget } from "./widgets/MealWidget";
import { SlideshowWidget } from "./widgets/SlideshowWidget";
import { TodoWidget } from "./widgets/TodoWidget";
import { ALL_CATEGORIES, SPAN, type Category, type Dashboard, type Size, type SlideshowSettings, type Widget } from "./types";

/** How the editor talks to the canvas. Without it the canvas is just the dashboard. */
export interface EditApi {
  selected: string | null;
  zoom: number;
  select: (id: string | null) => void;
  move: (id: string, dir: -1 | 1) => void;
  resize: (id: string, size: Size) => void;
  remove: (id: string) => void;
  change: (id: string, settings: Record<string, unknown>) => void;
  changeSlideshow: (patch: Partial<SlideshowSettings>) => void;
  drop: (targetId: string | null, payload: string) => void;
  albums: { id: number; name: string }[];
}

type Shown = Pick<Dashboard, "widgets" | "orientation" | "slideshow" | "touch" | "device">;

export function WidgetBody({ w, d, today, lang, tickable }: { w: Widget; d: Shown; today: Date; lang: Lang; tickable: boolean }) {
  const { t } = useTranslation();
  return (
    <>
      {(["week-calendar", "person-agenda", "meal-boxes", "todo", "chores", "stars", "birthdays", "countdown", "message", "weather"] as string[]).includes(w.type) && (
        <h2 className="widget-title">{t(`dashboard.type.${w.type}`)}</h2>
      )}
      {w.type === "week-calendar" && <CalendarWidget config={w} today={today} lang={lang} />}
      {w.type === "meal-boxes" && <MealWidget config={w} today={today} lang={lang} />}
      {w.type === "person-agenda" && <AgendaWidget config={w} today={today} lang={lang} />}
      {w.type === "clock" && <ClockWidget lang={lang} />}
      {w.type === "photo-slideshow" && <SlideshowWidget config={w} slideshow={d.slideshow} />}
      {w.type === "todo" && <TodoWidget tickable={tickable} />}
      {w.type === "meal-today" && <MealTodayWidget today={today} />}
      {w.type === "chores" && <ChoresWidget tickable={tickable} today={today} />}
      {w.type === "stars" && <StarsWidget />}
      {w.type === "birthdays" && <BirthdaysWidget />}
      {w.type === "countdown" && <CountdownWidget />}
      {w.type === "message" && <MessageWidget />}
      {w.type === "weather" && <WeatherWidget lang={lang} />}
    </>
  );
}

const SIZES: Size[] = ["small", "medium", "large"];

function Chips<T extends string | number>({ label, options, value, onPick }: {
  label: string; options: [T, string][]; value: T; onPick: (v: T) => void;
}) {
  return (
    <div>
      <span className="eyebrow">{label}</span>
      <div className="seg" role="group" aria-label={label}>
        {options.map(([v, text]) => (
          <button key={String(v)} type="button" className={value === v ? "on" : ""} aria-pressed={value === v} onClick={() => onPick(v)}>{text}</button>
        ))}
      </div>
    </div>
  );
}

/** What can be set on a widget, right at the widget. */
function WidgetSettings({ w, d, edit }: { w: Widget; d: Shown; edit: EditApi }) {
  const { t } = useTranslation();
  const members = useMembers();
  const set = (settings: Record<string, unknown>) => edit.change(w.id, settings);
  return (
    <div className="wsettings">
      {w.type === "week-calendar" && (
        <>
          <Chips label={t("dashboard.weeks")} options={[[1, "1"], [2, "2"], [3, "3"], [4, "4"]]} value={w.settings.weeks} onPick={(weeks) => set({ ...w.settings, weeks })} />
          <div>
            <span className="eyebrow">{t("dashboard.categories")}</span>
            <div className="chips">
              {ALL_CATEGORIES.map((c: Category) => {
                const on = w.settings.categories.includes(c);
                return (
                  <button key={c} type="button" className={`chip${on ? " on" : ""}`} aria-pressed={on} onClick={() => {
                    const next = on ? w.settings.categories.filter((x) => x !== c) : [...w.settings.categories, c];
                    if (next.length) set({ ...w.settings, categories: next });
                  }}>{t(`weekplan.category.${c}`)}</button>
                );
              })}
            </div>
          </div>
        </>
      )}
      {w.type === "person-agenda" && (
        <Chips label={t("dashboard.days")} options={[[1, "1"], [2, "2"], [3, "3"], [5, "5"], [7, "7"]]} value={w.settings.days} onPick={(days) => set({ ...w.settings, days })} />
      )}
      {(w.type === "week-calendar" || w.type === "person-agenda") && (
        <div>
          <span className="eyebrow">{t("dashboard.people")}</span>
          <MemberFilter members={members.list} includeFamily={false} selected={w.settings.members} onChange={(next) => set({ ...w.settings, members: next.filter((x): x is number => x !== "none") })} />
        </div>
      )}
      {w.type === "meal-boxes" && (
        <Chips label={t("dashboard.days")} options={[[3, "3"], [5, "5"], [7, "7"], [14, "14"]]} value={w.settings.days} onPick={(days) => set({ days })} />
      )}
      {w.type === "photo-slideshow" && (
        <>
          <Chips label={t("dashboard.slideLayout")} options={[["tile", t("dashboard.layout.tile")], ["mosaic", t("dashboard.layout.mosaic")]]} value={w.settings.layout} onPick={(layout) => set({ layout })} />
          <Chips label={t("dashboard.transition")} options={[["fade", t("dashboard.trans.fade")], ["slide", t("dashboard.trans.slide")], ["zoom", t("dashboard.trans.zoom")]]} value={d.slideshow.transition} onPick={(transition) => edit.changeSlideshow({ transition })} />
          <Chips label={t("dashboard.interval")} options={[[10, "10 s"], [30, "30 s"], [60, "1 min"], [300, "5 min"]]} value={d.slideshow.interval} onPick={(interval) => edit.changeSlideshow({ interval })} />
          <div>
            <span className="eyebrow">{t("dashboard.overlaysHere")}</span>
            {(["clock", "plan", "meal"] as const).map((name) => {
              const key = `overlay_${name}` as "overlay_clock" | "overlay_plan" | "overlay_meal";
              return (
                <label key={name} className="toggle">
                  <button type="button" className={`switch${d.slideshow[key] ? " on" : ""}`} role="switch" aria-checked={d.slideshow[key]} aria-label={t(`dashboard.overlay.${name}`)}
                    onClick={() => edit.changeSlideshow({ [key]: !d.slideshow[key] })}><span /></button>
                  {t(`dashboard.overlay.${name}`)}
                </label>
              );
            })}
          </div>
          <div>
            <span className="eyebrow">{t("dashboard.albumsPick")}</span>
            <div className="chips">
              <button type="button" className={`chip${d.slideshow.albums.length === 0 ? " on" : ""}`} onClick={() => edit.changeSlideshow({ albums: [] })}>{t("photos.all")}</button>
              {edit.albums.map((a) => {
                const on = d.slideshow.albums.includes(a.id);
                return (
                  <button key={a.id} type="button" className={`chip${on ? " on" : ""}`} aria-pressed={on}
                    onClick={() => edit.changeSlideshow({ albums: on ? d.slideshow.albums.filter((x) => x !== a.id) : [...d.slideshow.albums, a.id] })}>{a.name}</button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const hasSettings = (w: Widget) => ["week-calendar", "person-agenda", "meal-boxes", "photo-slideshow"].includes(w.type);

/** The bar on the selected widget: move, size, settings, remove. Cancels the preview's zoom so it stays readable. */
function Toolbar({ w, d, edit, index, count }: { w: Widget; d: Shown; edit: EditApi; index: number; count: number }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="wtool" style={{ zoom: 1 / edit.zoom }} onClick={(e) => e.stopPropagation()}>
      <div className="wtool-bar">
        <span className="wtool-name">{t(`dashboard.type.${w.type}`)}</span>
        <button type="button" className="icon-btn" aria-label={t("dashboard.moveEarlier")} disabled={index === 0} onClick={() => edit.move(w.id, -1)}>←</button>
        <button type="button" className="icon-btn" aria-label={t("dashboard.moveLater")} disabled={index === count - 1} onClick={() => edit.move(w.id, 1)}>→</button>
        <span className="seg" role="group" aria-label={t("dashboard.sizeLabel")}>
          {SIZES.map((s) => (
            <button key={s} type="button" className={w.size === s ? "on" : ""} aria-pressed={w.size === s} onClick={() => edit.resize(w.id, s)}>{t(`dashboard.sizeShort.${s}`)}</button>
          ))}
        </span>
        {hasSettings(w) && (
          <button type="button" className={`icon-btn${open ? " lit" : ""}`} aria-label={t("dashboard.widgetSettings")} aria-expanded={open} onClick={() => setOpen(!open)}>⚙</button>
        )}
        <button type="button" className="icon-btn danger" aria-label={t("dashboard.removeWidget")} onClick={() => edit.remove(w.id)}>✕</button>
      </div>
      {hasSettings(w) && open && <WidgetSettings w={w} d={d} edit={edit} />}
    </div>
  );
}

/** The grid of widgets, shared by the real dashboard and by the editor (where each widget can be picked and changed). */
export function DashboardCanvas({ d, today, lang, tickable, edit }: { d: Shown; today: Date; lang: Lang; tickable: boolean; edit?: EditApi }) {
  const stack = d.orientation === "portrait" || d.device === "phone"; // a narrow screen shows one widget per row
  return (
    <div
      className={`display-grid${edit ? " editing" : ""}`}
      onClick={edit ? () => edit.select(null) : undefined}
      onDragOver={edit ? (e) => e.preventDefault() : undefined}
      onDrop={edit ? (e) => { e.preventDefault(); edit.drop(null, e.dataTransfer.getData("text/plain")); } : undefined}
    >
      {d.widgets.map((w, index) => {
        const bare = w.type === "photo-slideshow";
        const picked = edit?.selected === w.id;
        return (
          <section
            key={w.id}
            className={`widget${bare ? "" : " card"}${edit ? " wedit" : ""}${picked ? " picked" : ""}`}
            style={{ gridColumn: `span ${stack ? 12 : SPAN[w.size]}` }}
            draggable={Boolean(edit)}
            onClick={edit ? (e) => { e.stopPropagation(); edit.select(w.id); } : undefined}
            onDragStart={edit ? (e) => e.dataTransfer.setData("text/plain", `move:${w.id}`) : undefined}
            onDragOver={edit ? (e) => e.preventDefault() : undefined}
            onDrop={edit ? (e) => { e.preventDefault(); e.stopPropagation(); edit.drop(w.id, e.dataTransfer.getData("text/plain")); } : undefined}
          >
            <div className={edit ? "wedit-body" : "widget-fill"}>
              <WidgetBody w={w} d={d} today={today} lang={lang} tickable={tickable && !edit} />
            </div>
            {edit && picked && <Toolbar w={w} d={d} edit={edit} index={index} count={d.widgets.length} />}
          </section>
        );
      })}
    </div>
  );
}
