import { useQuery } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { useTranslation } from "react-i18next";
import { toISO } from "../../../shared/dates";
import { dashboardGet } from "../dashboardApi";

interface Day { date: string; dish: { name: string } | null }

export function MealTodayWidget({ today }: { today: Date }) {
  const { t } = useTranslation();
  const days = useQuery({
    queryKey: ["display-meal-today", toISO(today)],
    queryFn: () => dashboardGet<Day[]>(`/api/mealplan/days?from=${toISO(today)}&to=${toISO(addDays(today, 1))}`),
    refetchInterval: 60_000,
  });
  const todays = days.data?.find((d) => d.date === toISO(today))?.dish?.name;
  const next = days.data?.find((d) => d.date === toISO(addDays(today, 1)))?.dish?.name;
  return (
    <div className="meal-today">
      <small>{t("dashboard.display.dinnerToday")}</small>
      <strong>{todays ?? t("dashboard.display.noMeals")}</strong>
      {next && <div className="next">{t("dashboard.display.dinnerTomorrow", { dish: next })}</div>}
    </div>
  );
}
