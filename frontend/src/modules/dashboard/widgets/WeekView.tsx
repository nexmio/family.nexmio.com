import { useQuery } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { useTranslation } from "react-i18next";
import { type Lang, formatRange, isoWeek, toISO, weekDays, weekStart } from "../../../shared/dates";
import { useMembers } from "../../../shared/members";
import { type GridEvent, WeekGrid } from "../../../shared/ui/WeekGrid";
import { dashboardGet } from "../dashboardApi";

interface Meal { date: string; dish: { name: string } | null }

/** The whole week at a glance (for a TV, or when someone taps "Week"). */
export function WeekView({ today, lang }: { today: Date; lang: Lang }) {
  const { t } = useTranslation();
  const members = useMembers();
  const start = weekStart(today);
  const days = weekDays(start);
  const events = useQuery({
    queryKey: ["display-week", toISO(start)],
    queryFn: () => dashboardGet<GridEvent[]>(`/api/weekplan/events?from=${toISO(start)}&to=${toISO(addDays(start, 6))}`),
    refetchInterval: 60_000,
  });
  const meals = useQuery({
    queryKey: ["display-week-meals", toISO(start)],
    queryFn: () => dashboardGet<Meal[]>(`/api/mealplan/days?from=${toISO(start)}&to=${toISO(addDays(start, 6))}`),
    refetchInterval: 60_000,
  });
  return (
    <div className="week-view">
      <section className="card">
        <h2 className="widget-title">
          {t("weekplan.week", { n: isoWeek(start).week })} <span className="muted">· {formatRange(start, days[6], lang)}</span>
        </h2>
        <WeekGrid
          days={days} events={events.data ?? []} members={members.byId} today={today} lang={lang}
          labels={{ category: (c) => t(`weekplan.category.${c}`), allDay: t("common.allDay") }}
          todayLabel={t("weekplan.today")}
          extra={(day) => {
            const dish = meals.data?.find((m) => m.date === toISO(day))?.dish?.name;
            return dish ? <div className="day-meal">{t("dashboard.display.dinner", { dish })}</div> : null;
          }}
        />
      </section>
    </div>
  );
}
