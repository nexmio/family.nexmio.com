import { describe, expect, it } from "vitest";
import { formatDate, formatRange, isoWeek, toISO, weekDays, weekStart } from "../src/shared/dates";

describe("week calculation (A8)", () => {
  it("week 47 of 2026 is 16-22 November", () => {
    const start = weekStart(new Date(2026, 10, 17));
    expect(toISO(start)).toBe("2026-11-16");
    expect(isoWeek(start)).toEqual({ week: 47, year: 2026 });
    expect(toISO(weekDays(start)[6])).toBe("2026-11-22");
  });
  it("29 Dec 2025 is week 1 of 2026 and 1 Jan 2027 is week 53 of 2026", () => {
    expect(isoWeek(new Date(2025, 11, 29))).toEqual({ week: 1, year: 2026 });
    expect(isoWeek(new Date(2027, 0, 1))).toEqual({ week: 53, year: 2026 });
  });
});

describe("date formats", () => {
  const d = new Date(2026, 10, 17);
  it("formats a date in both languages", () => {
    expect(formatDate(d, "da")).toBe("17. nov. 2026");
    expect(formatDate(d, "en")).toBe("17 Nov 2026");
  });
  it("formats a week range", () => {
    expect(formatRange(new Date(2026, 10, 16), new Date(2026, 10, 22), "da")).toBe("16.–22. nov. 2026");
    expect(formatRange(new Date(2026, 10, 16), new Date(2026, 10, 22), "en")).toBe("16–22 Nov 2026");
    expect(formatRange(new Date(2026, 10, 30), new Date(2026, 11, 6), "da")).toBe("30. nov. – 6. dec. 2026");
  });
});
