import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../shared/api/client";
import type { Lang } from "../../shared/dates";
import { useToday } from "../../shared/dates/useToday";
import { TopBar, useFamily } from "../../shared/family";
import { dashboardGet } from "./dashboardApi";
import type { Dashboard, StartView } from "./types";
import { DashboardCanvas } from "./DashboardCanvas";
import { ClockWidget } from "./widgets/ClockWidget";
import { Frame } from "./widgets/Frame";
import { WeekView } from "./widgets/WeekView";

/** The public view: / shows the default dashboard, /<name> shows another one. */
export default function DisplayPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language === "da" ? "da" : "en") as Lang;
  const { slug } = useParams();
  const today = useToday();
  useFamily();

  const dashboard = useQuery({
    queryKey: ["dashboard", slug ?? "default"],
    queryFn: () => dashboardGet<Dashboard>(`/api/dashboard/dashboards/${slug ?? "default"}`),
    refetchInterval: 60_000,
    retry: false,
  });
  const d = dashboard.data;
  const start: StartView = d?.start_view ?? "day";
  const touch = d?.touch ?? false;
  const returnAfter = d?.return_after ?? 60;
  const idleAfter = d?.idle_photo_after ?? 0;

  // What is shown: the start view, unless someone touched the screen and chose something else.
  const [override, setOverride] = useState<StartView | null>(null);
  const [left, setLeft] = useState(0);
  const [idle, setIdle] = useState(false);
  const lastActive = useRef(Date.now());
  const current: StartView = override ?? start;

  const choose = useCallback(
    (view: StartView) => {
      if (view === start) {
        setOverride(null);
        setLeft(0);
      } else {
        setOverride(view);
        setLeft(returnAfter);
      }
    },
    [start, returnAfter],
  );

  // Any touch keeps the chosen view alive, and wakes a sleeping photo frame.
  useEffect(() => {
    if (!touch) return;
    const handler = () => {
      lastActive.current = Date.now();
      if (idle) return setIdle(false);
      if (override === "photos") choose(start);
      else if (override !== null) setLeft(returnAfter);
      else if (start === "photos") choose("day");
    };
    window.addEventListener("pointerdown", handler);
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, [touch, idle, override, returnAfter, start, choose]);

  // One tick a second: count down to the start view, and start the photo frame when nobody has touched the screen.
  useEffect(() => {
    if (!touch) return;
    const id = setInterval(() => {
      if (override !== null) {
        setLeft((n) => {
          if (n <= 1) {
            setOverride(null);
            return 0;
          }
          return n - 1;
        });
      } else if (idleAfter > 0 && start !== "photos" && Date.now() - lastActive.current > idleAfter * 60_000) {
        setIdle(true);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [touch, override, idleAfter, start]);

  const [hour, setHour] = useState(() => new Date().getHours());
  const [awake, setAwake] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 30_000);
    return () => clearInterval(id);
  }, []);
  const night = d && d.night_start !== null && d.night_end !== null &&
    (d.night_start < d.night_end ? hour >= d.night_start && hour < d.night_end : hour >= d.night_start || hour < d.night_end);

  if (dashboard.isError) {
    const missing = dashboard.error instanceof ApiError && dashboard.error.status === 404;
    return (
      <div className="display display-message">
        <p>{missing ? t("dashboard.display.notFound") : t("common.error")}</p>
        <Link className="btn" to="/admin">{t("dashboard.display.toAdmin")}</Link>
      </div>
    );
  }
  if (!d) return <div className="display display-message"><p className="muted">{t("common.loading")}</p></div>;

  const showFrame = idle || current === "photos";
  const label = (v: StartView) => t(`dashboard.view.${v}`);
  const toggle = touch && (
    <>
      {override !== null && left > 0 && (
        <span className="back-pill">{t("dashboard.display.backIn", { view: label(start).toLowerCase(), n: left })}</span>
      )}
      <span className="seg view-toggle dark" role="group" aria-label={t("weekplan.view.label")}>
        {(["day", "week", "photos"] as StartView[]).map((v) => (
          <button key={v} type="button" className={current === v ? "on" : ""} aria-pressed={current === v} onClick={() => choose(v)}>
            {label(v)}
          </button>
        ))}
      </span>
      {d.is_default && <Link className="btn icon" to="/admin" aria-label={t("dashboard.display.toAdmin")}>⚙</Link>}
    </>
  );

  return (
    <div className={`display display-${d.device} display-${d.orientation}${touch ? " touch" : ""}`}>
      <TopBar lang={lang} extra={toggle || undefined} name={d.show_title ? (d.title || undefined) : null} showClock={d.show_clock} />
      {current === "week" ? (
        <WeekView today={today} lang={lang} />
      ) : (
        <DashboardCanvas d={d} today={today} lang={lang} tickable={touch} />
      )}
      {showFrame && <Frame slideshow={d.slideshow} today={today} lang={lang} />}
      {night && Date.now() > awake && (
        <div className="night" onPointerDown={() => setAwake(Date.now() + 5 * 60_000)}>
          <ClockWidget lang={lang} />
        </div>
      )}
    </div>
  );
}
