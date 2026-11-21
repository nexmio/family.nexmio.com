import { useQuery } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { useTranslation } from "react-i18next";
import { type Lang, isoWeek, toISO, weekDays, weekStart } from "../../../shared/dates";
import { useMembers } from "../../../shared/members";
import { type GridEvent, WeekGrid } from "../../../shared/ui/WeekGrid";
import { dashboardGet } from "../dashboardApi";
import type { CalendarWidget as Config } from "../types";

export function CalendarWidget({ config, today, lang }: { config: Config; today: Date; lang: Lang }) {
  const { t } = useTranslation();
  const start = weekStart(today);
  const members = useMembers();
  const { categories, weeks } = config.settings;
  const only = config.settings.members ?? [];
  const memberParam = only.length ? `&member=${only.join(",")}` : "";
  const to = addDays(start, weeks * 7 - 1);
  const events = useQuery({
    queryKey: ["display-events", toISO(start), weeks, categories.join(","), only.join(",")],
    queryFn: () =>
      dashboardGet<GridEvent[]>(
        `/api/weekplan/events?from=${toISO(start)}&to=${toISO(to)}&category=${categories.join(",")}${memberParam}`,
      ),
    refetchInterval: 60_000,
  });
  const data = events.data ?? [];
  return (
    <div className="widget-body">
      {Array.from({ length: weeks }, (_, i) => {
        const s = addDays(start, i * 7);
        return (
          <div key={i}>
            <h3 className="widget-sub">{t("weekplan.week", { n: isoWeek(s).week })}</h3>
            <WeekGrid
              days={weekDays(s)}
              events={data}
              members={members.byId}
              today={today}
              lang={lang}
              labels={{ category: (c) => t(`weekplan.category.${c}`), allDay: t("common.allDay") }}
              todayLabel={t("weekplan.today")}
            />
          </div>
        );
      })}
      {events.isSuccess && data.length === 0 && <p className="muted">{t("dashboard.display.noEvents")}</p>}
    </div>
  );
}
