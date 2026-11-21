import type { ModuleManifest } from "../../shell/modules";

const manifest: ModuleManifest = {
  id: "chores",
  adminPath: "chores",
  routes: [{ path: "chores", lazy: () => import("./ChoresPage").then((m) => ({ Component: m.default })) }],
};
export default manifest;
