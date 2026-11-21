import type { RouteObject } from "react-router-dom";

/** The module list of the frontend (6.2). A new module = a folder plus one line here. */
export interface ModuleManifest {
  id: string;
  adminPath: string;
  routes: RouteObject[];
}

import board from "../modules/board/manifest";
import chores from "../modules/chores/manifest";
import occasions from "../modules/occasions/manifest";
import dashboard from "../modules/dashboard/manifest";
import mealplan from "../modules/mealplan/manifest";
import photos from "../modules/photos/manifest";
import shopping from "../modules/shopping/manifest";
import todo from "../modules/todo/manifest";
import weekplan from "../modules/weekplan/manifest";

export const modules: ModuleManifest[] = [weekplan, mealplan, shopping, todo, chores, occasions, board, photos, dashboard];
