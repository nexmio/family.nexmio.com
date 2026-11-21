import type { ModuleManifest } from "../../shell/modules";

const manifest: ModuleManifest = {
  id: "photos",
  adminPath: "photos",
  routes: [{ path: "photos", lazy: () => import("./PhotosPage").then((m) => ({ Component: m.default })) }],
};
export default manifest;
