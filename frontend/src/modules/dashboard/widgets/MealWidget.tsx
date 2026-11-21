import { useQuery } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { useTranslation } from "react-i18next";
import { type Lang, formatDate, isSameDay, parseISO, toISO, weekdayLong } from "../../../shared/dates";
import { dashboardGet } from "../dashboardApi";
import type { MealWidget as Config } from "../types";

interface Day { date: string; dish: { name: string } | null; note: string | null }

export function MealWidget({ config, today, lang }: { config: Config; today: Date; lang: Lang }) {
  const { t } = useTranslation();
  const to = addDays(today, config.settings.days - 1);
  const days = useQuery({
    queryKey: ["display-meals", toISO(today), config.settings.days],
    queryFn: () => dashboardGet<Day[]>(`/api/mealplan/days?from=${toISO(today)}&to=${toISO(to)}`),
    refetchInterval: 60_000,
  });
  const data = (days.data ?? []).filter((d) => d.dish);
  return (
    <div className="widget-body">
      {days.isSuccess && data.length === 0 && <p className="muted">{t("dashboard.display.noMeals")}</p>}
      <div className="meal-boxes">
        {data.map((d) => {
          const date = parseISO(d.date);
          return (
            <div key={d.date} className={`meal-box${isSameDay(date, today) ? " today" : ""}`}>
              <small>{weekdayLong(date, lang)} · {formatDate(date, lang)}</small>
              <strong>{d.dish!.name}</strong>
              {d.note && <span className="muted">{d.note}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
