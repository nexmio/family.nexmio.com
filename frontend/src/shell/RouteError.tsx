import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouteError } from "react-router-dom";

/** After an update an open page may ask for a file that no longer exists. Reload once, then show a friendly page. */
export function RouteError() {
  const { t } = useTranslation();
  const error = useRouteError();
  const text = error instanceof Error ? error.message : String(error);
  const stale = /dynamically imported module|Importing a module script failed|Failed to fetch dynamically/i.test(text);
  useEffect(() => {
    if (!stale) return;
    try {
      if (sessionStorage.getItem("reloaded-for-update") === "1") return;
      sessionStorage.setItem("reloaded-for-update", "1");
    } catch {
      /* storage can be blocked: just show the page */
    }
    window.location.reload();
  }, [stale]);
  return (
    <div className="display display-message">
      <h1>{t("errors.page_title")}</h1>
      <p className="muted">{stale ? t("errors.page_updated") : t("common.error")}</p>
      <button className="btn btn-primary" onClick={() => window.location.reload()}>{t("errors.reload")}</button>
    </div>
  );
}
