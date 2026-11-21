import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toISO } from "../../../shared/dates";
import { Avatar, colorClass, useMembers } from "../../../shared/members";
import { dashboardGet, dashboardPost } from "../dashboardApi";

interface DayChore { id: number; title: string; member_id: number; stars: number; part: "morning" | "evening" | "any"; done: boolean }
interface Stars { member_id: number; balance: number; today: number; week: number; goal: { title: string; stars: number } | null }
interface Occasion { id: number; title: string; member_id: number | null; days_until: number; turns: number | null }
interface Countdown { id: number; title: string; days_left: number }
interface Message { id: number; text: string }
interface Weather {
  configured: boolean; place?: string; unavailable?: boolean; stale?: boolean;
  now?: { temp: number; code: number; wind: number }; days?: { date: string; code: number; max: number; min: number }[];
}

const REFRESH = 60_000;

/** Today's chores per child. On a screen with touch a child can tick their own chores (no code). */
export function ChoresWidget({ tickable, today }: { tickable: boolean; today: Date }) {
  const { t } = useTranslation();
  const members = useMembers();
  const queryClient = useQueryClient();
  const chores = useQuery({ queryKey: ["display-chores", toISO(today)], queryFn: () => dashboardGet<DayChore[]>(`/api/chores/day?date=${toISO(today)}`), refetchInterval: REFRESH });
  const data = chores.data ?? [];

  async function tick(c: DayChore) {
    queryClient.setQueryData<DayChore[]>(["display-chores", toISO(today)], (old) => old?.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)));
    try { await dashboardPost(`/api/chores/chores/${c.id}/tick`, { date: toISO(today), done: !c.done }); }
    finally {
      await queryClient.invalidateQueries({ queryKey: ["display-chores"] });
      await queryClient.invalidateQueries({ queryKey: ["display-stars"] });
    }
  }

  const kids = [...new Set(data.map((c) => c.member_id))];
  if (chores.isSuccess && kids.length === 0) return <p className="muted">{t("dashboard.display.noChores")}</p>;
  return (
    <div className="kid-chores">
      {kids.map((id) => {
        const m = members.byId.get(id);
        const mine = data.filter((c) => c.member_id === id).sort((a, b) => ["morning", "any", "evening"].indexOf(a.part) - ["morning", "any", "evening"].indexOf(b.part));
        const left = mine.filter((c) => !c.done).length;
        return (
          <div key={id} className={`kid ${colorClass(m)}`}>
            <div className="kid-head"><Avatar member={m} size={30} /><strong>{m?.name}</strong><span className="muted">{left === 0 ? t("dashboard.display.allDone") : t("dashboard.display.left", { n: left })}</span></div>
            {mine.map((c) => (
              <div key={c.id} className={`todo-item${c.done ? " done" : ""}`}>
                {tickable ? (
                  <button className={`box${c.done ? " on" : ""}`} role="checkbox" aria-checked={c.done} aria-label={c.title} onClick={() => void tick(c)}>{c.done ? "✓" : ""}</button>
                ) : <span className={`box static${c.done ? " on" : ""}`} aria-hidden="true">{c.done ? "✓" : ""}</span>}
                <span className="t" style={{ flex: 1 }}>{c.title}</span>
                <span className="muted">{c.stars}★</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** Stars per child, with the way to the reward. */
export function StarsWidget() {
  const { t } = useTranslation();
  const members = useMembers();
  const stars = useQuery({ queryKey: ["display-stars"], queryFn: () => dashboardGet<Stars[]>("/api/chores/stars"), refetchInterval: REFRESH });
  const data = [...(stars.data ?? [])].sort((a, b) => b.week - a.week);
  if (stars.isSuccess && data.length === 0) return <p className="muted">{t("dashboard.display.noStars")}</p>;
  return (
    <div className="stars">
      {data.map((s) => {
        const m = members.byId.get(s.member_id);
        const pct = s.goal ? Math.min(100, Math.round((Math.max(0, s.balance) / s.goal.stars) * 100)) : 0;
        return (
          <div key={s.member_id} className={`star-row ${colorClass(m)}`}>
            <Avatar member={m} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="goal-line"><strong>{m?.name}</strong><span>★ {Math.max(0, s.balance)}</span></div>
              {s.goal ? (
                <>
                  <div className="bar"><i style={{ width: `${pct}%` }} /></div>
                  <small className="muted">{s.goal.title} · {Math.max(0, s.balance)}/{s.goal.stars}</small>
                </>
              ) : <small className="muted">{t("dashboard.display.starsToday", { n: s.today })}</small>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function BirthdaysWidget() {
  const { t } = useTranslation();
  const members = useMembers();
  const list = useQuery({ queryKey: ["display-occasions"], queryFn: () => dashboardGet<Occasion[]>("/api/occasions/occasions?within=60"), refetchInterval: 300_000 });
  const data = (list.data ?? []).slice(0, 4);
  if (list.isSuccess && data.length === 0) return <p className="muted">{t("dashboard.display.noOccasions")}</p>;
  return (
    <div>
      {data.map((o) => (
        <div key={o.id} className="todo-item">
          <Avatar member={o.member_id ? members.byId.get(o.member_id) : null} size={30} />
          <span style={{ flex: 1 }}><strong>{o.title}</strong>{o.turns ? <span className="muted"> · {t("occasions.turns", { n: o.turns })}</span> : null}</span>
          <span className={o.days_until === 0 ? "due today" : "muted"}>{o.days_until === 0 ? t("occasions.today") : t("occasions.inDays", { n: o.days_until })}</span>
        </div>
      ))}
    </div>
  );
}

export function CountdownWidget() {
  const { t } = useTranslation();
  const list = useQuery({ queryKey: ["display-countdowns"], queryFn: () => dashboardGet<Countdown[]>("/api/occasions/countdowns"), refetchInterval: 300_000 });
  const data = (list.data ?? []).slice(0, 3);
  if (list.isSuccess && data.length === 0) return <p className="muted">{t("dashboard.display.noCountdowns")}</p>;
  return (
    <div className="countdowns">
      {data.map((c) => (
        <div key={c.id} className="countdown">
          <span className="count-num">{c.days_left}</span>
          <span>{t("dashboard.display.daysTo", { count: c.days_left })}<br /><strong>{c.title}</strong></span>
        </div>
      ))}
    </div>
  );
}

export function MessageWidget() {
  const { t } = useTranslation();
  const list = useQuery({ queryKey: ["display-board"], queryFn: () => dashboardGet<Message[]>("/api/board/messages"), refetchInterval: REFRESH });
  const data = (list.data ?? []).slice(0, 3);
  if (list.isSuccess && data.length === 0) return <p className="muted">{t("dashboard.display.noMessages")}</p>;
  return <div className="notes">{data.map((m) => (<p key={m.id} className="note">{m.text}</p>))}</div>;
}

const kindOf = (code: number): string =>
  code === 0 ? "clear" : code <= 3 ? "cloudy" : code <= 48 ? "fog" : code <= 57 ? "drizzle" : code <= 67 ? "rain" : code <= 77 ? "snow" : code <= 82 ? "showers" : code <= 86 ? "snow" : "thunder";

function WeatherIcon({ kind, size = 40 }: { kind: string; size?: number }) {
  const cloud = "M7 17a4 4 0 1 1 .8-7.9A5.5 5.5 0 0 1 18.5 10 3.5 3.5 0 0 1 18 17z";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === "clear" && (<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" /></>)}
      {kind === "cloudy" && <path d={cloud} />}
      {kind === "fog" && <path d="M4 9h16M3 13h18M5 17h14" />}
      {(kind === "drizzle" || kind === "rain" || kind === "showers") && (<><path d={cloud} /><path d="M8 20l1-2M12 20l1-2M16 20l1-2" /></>)}
      {kind === "snow" && (<><path d={cloud} /><path d="M9 19h.01M13 20h.01M17 19h.01" strokeWidth="2.6" /></>)}
      {kind === "thunder" && (<><path d={cloud} /><path d="M12 15l-2 3h3l-2 3" /></>)}
    </svg>
  );
}

export function WeatherWidget({ lang }: { lang: "da" | "en" }) {
  const { t } = useTranslation();
  const w = useQuery({ queryKey: ["display-weather"], queryFn: () => dashboardGet<Weather>("/api/weather"), refetchInterval: 600_000 });
  const d = w.data;
  if (!d) return null;
  if (!d.configured) return <p className="muted">{t("dashboard.display.weatherSetup")}</p>;
  if (d.unavailable || !d.now) return <p className="muted">{t("dashboard.display.weatherDown")}</p>;
  const day = (iso: string) => new Intl.DateTimeFormat(lang === "da" ? "da-DK" : "en-GB", { weekday: "short" }).format(new Date(`${iso}T12:00:00`));
  return (
    <div className="weather">
      <div className="weather-now">
        <WeatherIcon kind={kindOf(d.now.code)} size={56} />
        <span className="weather-temp">{d.now.temp}°</span>
        <span className="muted">{t(`dashboard.weather.${kindOf(d.now.code)}`)}<br />{d.place}</span>
      </div>
      <div className="weather-days">
        {(d.days ?? []).slice(1, 4).map((x) => (
          <div key={x.date} className="weather-day"><span className="muted">{day(x.date)}</span><WeatherIcon kind={kindOf(x.code)} size={26} /><span>{x.max}° <span className="muted">{x.min}°</span></span></div>
        ))}
      </div>
    </div>
  );
}
