import { api } from "../../shared/api/client";

/** The dashboard may only read these APIs. It never touches anything else (6.1, rule 3). */
export const ALLOWED_PREFIXES = [
  "/api/weekplan/", "/api/mealplan/", "/api/dashboard/", "/api/photos/", "/api/todo/", "/api/members", "/api/family", "/api/chores/", "/api/occasions/", "/api/board/", "/api/weather",
] as const;

export function assertAllowed(path: string): void {
  if (!ALLOWED_PREFIXES.some((p) => path.startsWith(p))) {
    throw new Error(`The dashboard may not call ${path}`);
  }
}

/** The one thing a dashboard may change by itself: ticking a task (no code needed). */
export function dashboardPost<T>(path: string, body?: unknown): Promise<T> {
  assertAllowed(path);
  return api.post<T>(path, body);
}

export function dashboardGet<T>(path: string): Promise<T> {
  assertAllowed(path);
  return api.get<T>(path);
}
