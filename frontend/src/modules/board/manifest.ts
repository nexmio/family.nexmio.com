import type { ModuleManifest } from "../../shell/modules";

const manifest: ModuleManifest = {
  id: "board",
  adminPath: "board",
  routes: [{ path: "board", lazy: () => import("./BoardPage").then((m) => ({ Component: m.default })) }],
};
export default manifest;
