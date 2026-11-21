import { useQuery } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { useTranslation } from "react-i18next";
import { type Lang, isSameDay, toISO, weekdayLong } from "../../../shared/dates";
import { useMembers } from "../../../shared/members";
import { DayTimeline } from "../../../shared/ui/DayTimeline";
import type { GridEvent } from "../../../shared/ui/WeekGrid";
import { dashboardGet } from "../dashboardApi";
import type { AgendaWidget as Config } from "../types";

/** The family side by side for today (and the next days): a column per person with hours down the side. */
export function AgendaWidget({ config, today, lang }: { config: Config; today: Date; lang: Lang }) {
  const { t } = useTranslation();
  const members = useMembers();
  const only = config.settings.members ?? [];
  const to = addDays(today, config.settings.days - 1);
  const events = useQuery({
    queryKey: ["display-agenda", toISO(today), config.settings.days],
    queryFn: () => dashboardGet<GridEvent[]>(`/api/weekplan/events?from=${toISO(today)}&to=${toISO(to)}`),
    refetchInterval: 60_000,
  });
  const people = only.length ? members.list.filter((m) => only.includes(m.id)) : members.list;
  const data = events.data ?? [];
  const labels = { category: (c: GridEvent["category"]) => t(`weekplan.category.${c}`), allDay: t("common.allDay") };
  return (
    <div className="agenda">
      {Array.from({ length: config.settings.days }, (_, i) => {
        const day = addDays(today, i);
        const iso = toISO(day);
        return (
          <div key={iso}>
            {config.settings.days > 1 && (
              <h3 className="widget-sub cap">
                {isSameDay(day, today) ? t("dashboard.display.todayWord") : weekdayLong(day, lang)}
              </h3>
            )}
            <DayTimeline
              date={day} events={data.filter((e) => e.date === iso)} people={people} today={today} lang={lang}
              labels={labels} wholeFamilyLabel={t("common.wholeFamily")} allDayLabel={t("common.allDay")}
            />
          </div>
        );
      })}
    </div>
  );
}
