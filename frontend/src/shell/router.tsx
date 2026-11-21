import { Navigate, createBrowserRouter } from "react-router-dom";
import { AdminLayout } from "./AdminLayout";
import { RouteError } from "./RouteError";
import { modules } from "./modules";

const share = () => import("./SharePage").then((m) => ({ Component: m.default }));
const display = () => import("../modules/dashboard/DisplayPage").then((m) => ({ Component: m.default }));
const members = () => import("./MembersPage").then((m) => ({ Component: m.default }));
const more = () => import("./MorePage").then((m) => ({ Component: m.default }));
const settings = () => import("./SettingsPage").then((m) => ({ Component: m.default }));

export const router = createBrowserRouter([
  {
    path: "/admin",
    element: <AdminLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="weekplan" replace /> },
      ...modules.flatMap((m) => m.routes),
      { path: "members", lazy: members },
      { path: "more", lazy: more },
      { path: "settings", lazy: settings },
    ],
  },
  { path: "/share/:token", lazy: share, errorElement: <RouteError /> },
  { path: "/", lazy: display, errorElement: <RouteError /> },
  { path: "/:slug", lazy: display, errorElement: <RouteError /> },
]);
