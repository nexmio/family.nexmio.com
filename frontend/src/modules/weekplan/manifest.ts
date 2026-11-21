import type { ModuleManifest } from "../../shell/modules";

const manifest: ModuleManifest = {
  id: "weekplan",
  adminPath: "weekplan",
  routes: [
    { path: "weekplan", lazy: () => import("./WeekPlanPage").then((m) => ({ Component: m.default })) },
    { path: "weekplan/import", lazy: () => import("./ImportPage").then((m) => ({ Component: m.default })) },
  ],
};
export default manifest;
