import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";
import mark from "../assets/mark.png";
import { CodeDialog } from "../shared/access-code/CodeDialog";
import { LoginForm } from "../shared/access-code/LoginForm";
import { ToastHost } from "../shared/ui/toast";
import { api } from "../shared/api/client";
import type { Lang } from "../shared/dates";
import { TopBar, useFamily } from "../shared/family";
import { modules } from "./modules";

interface ModuleInfo {
  id: string;
}

const ICONS: Record<string, string> = {
  home: "M4 11l8-7 8 7v9H4z",
  photos: "M3 5h18v14H3zM8 11a2 2 0 1 0 0-.01M21 17l-5-5-8 7",
  more: "M4 7h16M4 12h16M4 17h16",
  chores: "M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z",
  occasions: "M4 20v-7h16v7M7 13V9M12 13V7M17 13V9M3 20h18",
  board: "M5 4h14v12H9l-4 4z",
  shopping: "M3 4h2l2.4 11h10L20 7H6M9 20a1 1 0 1 0 0-.01M17 20a1 1 0 1 0 0-.01",
  todo: "M5 12l4 4 10-10M4 20h16",
  weekplan: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4",
  mealplan: "M5 11h14a7 7 0 0 1-14 0zM3 11h18M9 4c0 2 2 2 2 4M14 4c0 2 2 2 2 4",
  dashboard: "M3 3h8v10H3zM13 3h8v6h-8zM13 11h8v10h-8zM3 15h8v6H3z",
  members: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3 3-5 6-5s6 2 6 5M17 11a2.5 2.5 0 1 0 0-5M18 15c2 .5 3 2 3 4",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM3 12h3M18 12h3M12 3v3M12 18v3",
};

function Icon({ id }: { id: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d={ICONS[id] ?? ICONS.weekplan} />
    </svg>
  );
}

const PHONE_NAV = [
  { to: "/", key: "home", icon: "home" },
  { to: "weekplan", key: "weekplan", icon: "weekplan" },
  { to: "mealplan", key: "mealplan", icon: "mealplan" },
  { to: "photos", key: "photos", icon: "photos" },
  { to: "more", key: "more", icon: "more" },
];

function LoginPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language === "da" ? "da" : "en") as Lang;
  const queryClient = useQueryClient();
  return (
    <div className="login-page">
      <TopBar lang={lang} />
      <section className="card login-card">
        <img src={mark} alt="" style={{ width: 56, alignSelf: "center" }} />
        <h1 style={{ textAlign: "center" }}>{t("code.loginTitle")}</h1>
        <p className="muted" style={{ textAlign: "center" }}>{t("code.loginHint")}</p>
        <LoginForm onDone={() => void queryClient.invalidateQueries({ queryKey: ["session"] })} />
        <a className="muted" style={{ textAlign: "center" }} href="/">{t("code.toDashboard")}</a>
      </section>
    </div>
  );
}

export function AdminLayout() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language === "da" ? "da" : "en") as Lang;
  useFamily();
  const session = useQuery({ queryKey: ["session"], queryFn: () => api.get<{ logged_in: boolean }>("/api/session") });
  const available = useQuery({ queryKey: ["modules"], queryFn: () => api.get<ModuleInfo[]>("/api/modules") });
  if (session.isLoading) return null;
  if (!session.data?.logged_in) return <LoginPage />;
  const ids = available.data?.map((m) => m.id);
  const items = modules.filter((m) => !ids || ids.includes(m.id));

  return (
    <div className="app">
      <aside className="rail">
        <nav className="rail-inner" aria-label="Main">
          <img className="rail-logo" src={mark} alt="Nexmio" />
          {items.map((m) => (
            <NavLink key={m.id} to={m.adminPath} className="menu-link">
              <span className="menu-icon"><Icon id={m.id} /></span>
              <span className="menu-label">{t(`nav.${m.id}`)}</span>
            </NavLink>
          ))}
          <NavLink to="members" className="menu-link">
            <span className="menu-icon"><Icon id="members" /></span>
            <span className="menu-label">{t("nav.members")}</span>
          </NavLink>
          <NavLink to="settings" className="menu-link menu-settings">
            <span className="menu-icon"><Icon id="settings" /></span>
            <span className="menu-label">{t("nav.settings")}</span>
          </NavLink>
        </nav>
      </aside>
      <main className="content">
        <TopBar lang={lang} />
        <Outlet />
      </main>
      <nav className="pillnav" aria-label="Phone menu">
        <PhoneTabs />
      </nav>
      <CodeDialog />
      <ToastHost />
    </div>
  );
}

function PhoneTabs() {
  const { t } = useTranslation();
  return (
    <>
      {PHONE_NAV.map((n) =>
        n.to === "/" ? (
          <a key={n.key} href="/" className="tab-link">
            <span className="menu-icon"><Icon id={n.icon} /></span>
            {t(`nav.${n.key}`)}
          </a>
        ) : (
          <NavLink key={n.key} to={n.to} className={({ isActive }) => (isActive ? "active" : "")}>
            <span className="menu-icon"><Icon id={n.icon} /></span>
            {t(`nav.${n.key}`)}
          </NavLink>
        ),
      )}
    </>
  );
}
