import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import da from "../locales/da";
import en from "../locales/en";
import { detectLanguage, saveLanguage } from "../shared/i18n/language";
import dashboardDa from "../modules/dashboard/locales/da";
import dashboardEn from "../modules/dashboard/locales/en";
import mealplanDa from "../modules/mealplan/locales/da";
import mealplanEn from "../modules/mealplan/locales/en";
import boardDa from "../modules/board/locales/da";
import boardEn from "../modules/board/locales/en";
import choresDa from "../modules/chores/locales/da";
import choresEn from "../modules/chores/locales/en";
import occasionsDa from "../modules/occasions/locales/da";
import occasionsEn from "../modules/occasions/locales/en";
import photosDa from "../modules/photos/locales/da";
import photosEn from "../modules/photos/locales/en";
import shoppingDa from "../modules/shopping/locales/da";
import shoppingEn from "../modules/shopping/locales/en";
import todoDa from "../modules/todo/locales/da";
import todoEn from "../modules/todo/locales/en";
import weekplanDa from "../modules/weekplan/locales/da";
import weekplanEn from "../modules/weekplan/locales/en";

export const resources = {
  da: { translation: { ...da, weekplan: weekplanDa, mealplan: mealplanDa, todo: todoDa, shopping: shoppingDa, chores: choresDa, occasions: occasionsDa, board: boardDa, photos: photosDa, dashboard: dashboardDa } },
  en: { translation: { ...en, weekplan: weekplanEn, mealplan: mealplanEn, todo: todoEn, shopping: shoppingEn, chores: choresEn, occasions: occasionsEn, board: boardEn, photos: photosEn, dashboard: dashboardEn } },
};

void i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

document.documentElement.lang = i18n.language;
i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
  saveLanguage(lng === "da" ? "da" : "en");
});

export default i18n;
