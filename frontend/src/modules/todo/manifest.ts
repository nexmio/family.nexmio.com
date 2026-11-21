import type { ModuleManifest } from "../../shell/modules";

const manifest: ModuleManifest = {
  id: "todo",
  adminPath: "todo",
  routes: [{ path: "todo", lazy: () => import("./TodoPage").then((m) => ({ Component: m.default })) }],
};
export default manifest;
