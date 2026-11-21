import type { Lang } from "../dates";

const KEY = "language";

/** A11: the saved choice, else the browser language if it is da or en, otherwise en. */
export function detectLanguage(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "da" || saved === "en") return saved;
  } catch {
    /* storage can be blocked */
  }
  const browser = (typeof navigator !== "undefined" ? navigator.language : "en").toLowerCase();
  return browser.startsWith("da") ? "da" : "en";
}

export function saveLanguage(lang: Lang): void {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* ignore */
  }
}
