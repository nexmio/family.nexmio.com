import type { ModuleManifest } from "../../shell/modules";

const manifest: ModuleManifest = {
  id: "occasions",
  adminPath: "occasions",
  routes: [{ path: "occasions", lazy: () => import("./OccasionsPage").then((m) => ({ Component: m.default })) }],
};
export default manifest;
