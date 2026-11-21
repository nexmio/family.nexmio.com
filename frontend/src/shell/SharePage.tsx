import { useQuery } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { api } from "../shared/api/client";
import { type Lang, formatDate, toISO, weekdayLong } from "../shared/dates";
import { useToday } from "../shared/dates/useToday";
import { TopBar, useFamily } from "../shared/family";
import { useMembers } from "../shared/members";
import { type GridEvent, EventCard, peopleOf } from "../shared/ui/WeekGrid";

interface View { label: string; days: number; expires_at: string }
interface Meal { date: string; dish: { name: string } | null }

/** The page a babysitter or grandparent gets: the next days and dinner, nothing to change. */
export default function SharePage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language === "da" ? "da" : "en") as Lang;
  const { token } = useParams();
  const today = useToday();
  const members = useMembers();
  useFamily();
  const view = useQuery({ queryKey: ["share", token], queryFn: () => api.get<View>(`/api/share/view/${token}`), retry: false });
  const days = view.data?.days ?? 0;
  const from = toISO(today);
  const to = toISO(addDays(today, Math.max(0, days - 1)));
  const events = useQuery({ queryKey: ["share-events", from, to], queryFn: () => api.get<GridEvent[]>(`/api/weekplan/events?from=${from}&to=${to}`), enabled: days > 0 });
  const meals = useQuery({ queryKey: ["share-meals", from, to], queryFn: () => api.get<Meal[]>(`/api/mealplan/days?from=${from}&to=${to}`), enabled: days > 0 });

  if (view.isError) {
    return (
      <div className="display display-message">
        <h1>{t("share.gone")}</h1>
        <p className="muted">{t("share.goneHint")}</p>
      </div>
    );
  }
  if (!view.data) return <div className="display display-message"><p className="muted">{t("common.loading")}</p></div>;
  const labels = { category: (c: GridEvent["category"]) => t(`weekplan.category.${c}`), allDay: t("common.allDay") };
  return (
    <div className="display">
      <TopBar lang={lang} />
      <div className="page narrow">
        <h1>{view.data.label}</h1>
        <p className="muted">{t("share.intro", { n: days })}</p>
        {Array.from({ length: days }, (_, i) => {
          const day = addDays(today, i);
          const iso = toISO(day);
          const list = (events.data ?? []).filter((e) => e.date === iso);
          const dish = meals.data?.find((m) => m.date === iso)?.dish?.name;
          return (
            <section key={iso} className="card">
              <h2 className="cap">{weekdayLong(day, lang)} <span className="muted">{formatDate(day, lang)}</span></h2>
              {dish && <p className="muted">{t("dashboard.display.dinner", { dish })}</p>}
              {list.length === 0 && <p className="muted">{t("weekplan.noEvents")}</p>}
              {list.map((e) => (
                <EventCard key={e.id} event={e} member={e.member_id ? members.byId.get(e.member_id) : null} others={peopleOf(e, members.byId).slice(1)} labels={labels} />
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
