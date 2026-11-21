import type { ModuleManifest } from "../../shell/modules";

const manifest: ModuleManifest = {
  id: "dashboard",
  adminPath: "dashboards",
  routes: [{ path: "dashboards", lazy: () => import("./DashboardsPage").then((m) => ({ Component: m.default })) }],
};
export default manifest;
