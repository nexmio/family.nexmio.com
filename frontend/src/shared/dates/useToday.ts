import { useEffect, useState } from "react";
import { toISO } from "./index";

const startOfToday = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

/** Today's date. Re-checked every 30 seconds so the marker moves at midnight. */
export function useToday(): Date {
  const [today, setToday] = useState(startOfToday);
  useEffect(() => {
    const id = setInterval(() => {
      const now = startOfToday();
      setToday((old) => (toISO(old) === toISO(now) ? old : now));
    }, 30_000);
    return () => clearInterval(id);
  }, []);
  return today;
}
