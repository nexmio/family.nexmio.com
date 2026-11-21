import { useQuery } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { type Lang, toISO } from "../../../shared/dates";
import { colorClass, useMembers } from "../../../shared/members";
import { Slideshow } from "../../../shared/ui/Slideshow";
import { type GridEvent, timeLabel } from "../../../shared/ui/WeekGrid";
import { dashboardGet } from "../dashboardApi";
import type { SlideshowSettings } from "../types";
import { usePhotoIds } from "./SlideshowWidget";

interface Day { date: string; dish: { name: string } | null }

/** The photo frame: the series fills the screen, with the clock and today's plan on top if wanted. */
export function Frame({ slideshow, today, lang }: { slideshow: SlideshowSettings; today: Date; lang: Lang }) {
  const { t } = useTranslation();
  const members = useMembers();
  const photos = usePhotoIds(slideshow.albums);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);
  const events = useQuery({
    queryKey: ["frame-events", toISO(today)],
    queryFn: () => dashboardGet<GridEvent[]>(`/api/weekplan/events?from=${toISO(today)}&to=${toISO(today)}`),
    enabled: slideshow.overlay_plan,
    refetchInterval: 60_000,
  });
  const meal = useQuery({
    queryKey: ["frame-meal", toISO(today)],
    queryFn: () => dashboardGet<Day[]>(`/api/mealplan/days?from=${toISO(today)}&to=${toISO(addDays(today, 0))}`),
    enabled: slideshow.overlay_meal,
    refetchInterval: 60_000,
  });
  const locale = lang === "da" ? "da-DK" : "en-GB";
  const dish = meal.data?.[0]?.dish?.name;
  const list = [...(events.data ?? [])].sort((a, b) => (a.start ?? "").localeCompare(b.start ?? "")).slice(0, 5);
  return (
    <div className="frame" role="img" aria-label={t("dashboard.display.photoFrame")}>
      <Slideshow photos={(photos.data ?? []).map((p) => p.id)} transition={slideshow.transition} intervalSec={slideshow.interval} emptyLabel={t("dashboard.display.noPhotos")} />
      {slideshow.overlay_clock && (
        <div className="frame-clock">
          <b>{new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(now)}</b>
          <span className="cap">{new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(now)}</span>
        </div>
      )}
      {(slideshow.overlay_plan && list.length > 0) || (slideshow.overlay_meal && dish) ? (
        <div className="frame-panel">
          {slideshow.overlay_plan && list.map((e) => {
            const m = e.member_id ? members.byId.get(e.member_id) : null;
            return (
              <div key={e.id} className={`frame-row ${colorClass(m)}`}>
                <span>{e.title}<small>{m?.name ?? t("common.wholeFamily")} · {timeLabel(e, t("common.allDay"))}</small></span>
              </div>
            );
          })}
          {slideshow.overlay_meal && dish && <div className="frame-meal">{t("dashboard.display.dinner", { dish })}</div>}
        </div>
      ) : null}
    </div>
  );
}
