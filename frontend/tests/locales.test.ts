import { describe, expect, it } from "vitest";
import da from "../src/locales/da";
import en from "../src/locales/en";
import dashboardDa from "../src/modules/dashboard/locales/da";
import dashboardEn from "../src/modules/dashboard/locales/en";
import mealplanDa from "../src/modules/mealplan/locales/da";
import mealplanEn from "../src/modules/mealplan/locales/en";
import photosDa from "../src/modules/photos/locales/da";
import photosEn from "../src/modules/photos/locales/en";
import todoDa from "../src/modules/todo/locales/da";
import todoEn from "../src/modules/todo/locales/en";
import weekplanDa from "../src/modules/weekplan/locales/da";
import weekplanEn from "../src/modules/weekplan/locales/en";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === "object" && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("locale files (rule 18, 6.4)", () => {
  const pairs: [string, object, object][] = [
    ["shared", da, en],
    ["weekplan", weekplanDa, weekplanEn],
    ["mealplan", mealplanDa, mealplanEn],
    ["dashboard", dashboardDa, dashboardEn],
    ["photos", photosDa, photosEn],
    ["todo", todoDa, todoEn],
  ];
  for (const [name, a, b] of pairs) {
    it(`${name}: da and en have exactly the same keys`, () => {
      expect(keys(a).sort()).toEqual(keys(b).sort());
    });
  }
});
