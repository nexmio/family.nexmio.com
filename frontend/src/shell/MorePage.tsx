import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

/** The "More" tab on a phone: everything that does not fit in the bottom menu. */
export default function MorePage() {
  const { t } = useTranslation();
  const items = [
    { to: "../shopping", label: t("nav.shopping") },
    { to: "../todo", label: t("nav.todo") },
    { to: "../chores", label: t("nav.chores") },
    { to: "../occasions", label: t("nav.occasions") },
    { to: "../board", label: t("nav.board") },
    { to: "../members", label: t("nav.members") },
    { to: "../dashboards", label: t("nav.dashboard") },
    { to: "../settings", label: t("nav.settings") },
  ];
  return (
    <div className="page narrow">
      <h1>{t("nav.more")}</h1>
      <section className="card stack">
        {items.map((i) => (
          <Link key={i.to} className="btn" style={{ justifyContent: "flex-start", boxShadow: "none", background: "var(--surface)" }} to={i.to} relative="path">{i.label}</Link>
        ))}
      </section>
    </div>
  );
}
