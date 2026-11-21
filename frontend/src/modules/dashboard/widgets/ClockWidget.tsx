import { useEffect, useState } from "react";
import type { Lang } from "../../../shared/dates";

export function ClockWidget({ lang }: { lang: Lang }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);
  const locale = lang === "da" ? "da-DK" : "en-GB";
  return (
    <div className="clock">
      <span className="clock-time">{new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(now)}</span>
      <span className="clock-date">
        {new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(now)}
      </span>
    </div>
  );
}
