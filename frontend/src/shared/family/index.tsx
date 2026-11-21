import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { Lang } from "../dates";

export type Wallpaper = "ocean" | "lavender" | "sand" | "mint";
export const WALLPAPERS: Wallpaper[] = ["ocean", "lavender", "sand", "mint"];

interface Family {
  name: string | null;
  wallpaper: Wallpaper;
}

export function useFamily() {
  const query = useQuery({ queryKey: ["family"], queryFn: () => api.get<Family>("/api/family") });
  const wallpaper = query.data?.wallpaper ?? "ocean";
  // The wallpaper is a setting of the whole family, so every screen follows it.
  useEffect(() => {
    document.documentElement.dataset.wallpaper = wallpaper;
  }, [wallpaper]);
  return { name: query.data?.name || "Nexmio Family", rawName: query.data?.name ?? "", wallpaper };
}

export const useFamilyName = (): string => useFamily().name;

/** The top of every screen: the family's name on the left, the date and a live clock on the right. */
/** `name`: undefined shows the family name, a text replaces it, null removes it. */
export function TopBar({ lang, extra, name: override, showClock = true }: { lang: Lang; extra?: ReactNode; name?: string | null; showClock?: boolean }) {
  const { t } = useTranslation();
  const family = useFamily().name;
  const name = override === undefined ? family : override;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);
  const locale = lang === "da" ? "da-DK" : "en-GB";
  if (!name && !showClock && !extra) return null;
  return (
    <div className="topbar">
      <span className="topbar-name">{name}</span>
      <span className="topbar-extra">
        {extra}
        {showClock && (
        <span className="topbar-time" aria-label={t("common.now")}>
          <span className="topbar-date">
            {new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(now)}
          </span>
          <span className="topbar-clock">{new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(now)}</span>
        </span>
        )}
      </span>
    </div>
  );
}
