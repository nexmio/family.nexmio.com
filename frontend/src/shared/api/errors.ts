import type { TFunction } from "i18next";
import { ApiError } from "./client";

/** Turns any thrown error into a text in the current language, or null if the user cancelled. */
export function errorText(error: unknown, t: TFunction): string | null {
  if (error instanceof ApiError) {
    if (error.error === "cancelled") return null;
    return t(`errors.${error.error}`, { defaultValue: t("common.error") });
  }
  return t("common.error");
}
