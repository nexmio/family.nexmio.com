import { describe, expect, it } from "vitest";
import { assertAllowed } from "../src/modules/dashboard/dashboardApi";

describe("dashboard API allowlist (6.1, rule 3)", () => {
  it("allows the three read APIs", () => {
    expect(() => assertAllowed("/api/weekplan/events?from=a&to=b")).not.toThrow();
    expect(() => assertAllowed("/api/mealplan/days?from=a&to=b")).not.toThrow();
    expect(() => assertAllowed("/api/dashboard/dashboards/default")).not.toThrow();
    expect(() => assertAllowed("/api/photos/photos")).not.toThrow();
    expect(() => assertAllowed("/api/todo/items")).not.toThrow();
    expect(() => assertAllowed("/api/members")).not.toThrow();
  });
  it("rejects everything else", () => {
    expect(() => assertAllowed("/api/budget/anything")).toThrow();
    expect(() => assertAllowed("/api/code/check")).toThrow();
    expect(() => assertAllowed("https://example.com/api/weekplan/")).toThrow();
  });
});
