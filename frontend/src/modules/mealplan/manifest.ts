import type { ModuleManifest } from "../../shell/modules";

const manifest: ModuleManifest = {
  id: "mealplan",
  adminPath: "mealplan",
  routes: [{ path: "mealplan", lazy: () => import("./MealPlanPage").then((m) => ({ Component: m.default })) }],
};
export default manifest;
