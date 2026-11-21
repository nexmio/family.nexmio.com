import { describe, expect, it } from "vitest";
import { parseQuick } from "../src/modules/weekplan/quick";

const members = [{ id: 1, name: "Sam" }, { id: 2, name: "Alex" }, { id: 3, name: "Ida" }];
const today = new Date(2026, 10, 18); // Wednesday 18 Nov 2026

describe("quick add", () => {
  it("title, weekday, time and person", () => {
    expect(parseQuick("Fodbold tirsdag 16:30 Sam", members, today)).toMatchObject({
      title: "Fodbold", date: "2026-11-24", start: "16:30", memberIds: [1],
    });
  });
  it("a time range and several people", () => {
    expect(parseQuick("Svømning i morgen 16:00-17:30 Sam og Alex", members, today)).toMatchObject({
      title: "Svømning", date: "2026-11-19", start: "16:00", end: "17:30", memberIds: [1, 2],
    });
  });
  it("kl, til and today", () => {
    expect(parseQuick("Tandlæge i dag kl 14 til 15", members, today)).toMatchObject({
      title: "Tandlæge", date: "2026-11-18", start: "14:00", end: "15:00",
    });
  });
  it("a date, and a day that has passed this year goes to next year", () => {
    expect(parseQuick("Forældremøde 24/11 19.00", members, today)).toMatchObject({ date: "2026-11-24", start: "19:00" });
    expect(parseQuick("Fest 3. jan", members, today).date).toBe("2027-01-03");
  });
  it("the same weekday as today means today", () => {
    expect(parseQuick("Yoga onsdag 07:00", members, today).date).toBe("2026-11-18");
  });
  it("English works too and homework is recognised", () => {
    expect(parseQuick("Read pages 12-15 tomorrow Ida", members, today)).toMatchObject({ date: "2026-11-19", category: "homework", memberIds: [3] });
  });
  it("nothing special gives just a title", () => {
    expect(parseQuick("købe gave", members, today)).toEqual({ title: "Købe gave", memberIds: [] });
  });
});
