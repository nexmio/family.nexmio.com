import type { ModuleManifest } from "../../shell/modules";

const manifest: ModuleManifest = {
  id: "shopping",
  adminPath: "shopping",
  routes: [{ path: "shopping", lazy: () => import("./ShoppingPage").then((m) => ({ Component: m.default })) }],
};
export default manifest;
