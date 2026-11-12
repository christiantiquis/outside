import { describe, expect, it } from "vitest";
import {
  activities,
  isPlace,
  localDate,
  rankWindows,
  scoreHour,
  type Forecast,
  type Hour,
} from "./planner";
const start = Date.UTC(2030, 5, 1, 6);
const hour: Hour = {
  time: start,
  temperature: 22,
  rain: 0,
  wind: 0,
  daylight: true,
  aqi: 20,
};
const forecast: Forecast = {
  timezone: "UTC",
  fetchedAt: start,
  hours: Array.from({ length: 12 }, (_, i) => ({
    ...hour,
    time: start + i * 3600000,
  })),
  airAvailable: true,
};
const p = activities.walk.defaults;
describe("recommendation engine", () => {
  it("ranks ideal weather above rain, wind and poor air", () => {
    expect(scoreHour(hour, p, "walk", "UTC")).toBe(100);
    expect(
      scoreHour({ ...hour, rain: 90, wind: 45, aqi: 150 }, p, "walk", "UTC"),
    ).toBeLessThan(30);
  });
  it("returns three non-overlapping complete windows", () => {
    const windows = rankWindows(forecast, p, "walk", "2030-06-01", start);
    expect(windows).toHaveLength(3);
    for (let i = 1; i < windows.length; i++)
      expect(windows[i].start).toBeGreaterThanOrEqual(windows[i - 1].end);
    expect(windows[0].end - windows[0].start).toBe(7200000);
  });
  it("excludes past and night hours", () => {
    const f = {
      ...forecast,
      hours: forecast.hours.map((h) => ({ ...h, daylight: false })),
    };
    expect(rankWindows(f, p, "walk", "2030-06-01", start)).toEqual([]);
    expect(
      rankWindows(forecast, p, "walk", "2030-06-01", start + 86400000),
    ).toEqual([]);
  });
  it("does not join gaps in upstream data", () => {
    const f = {
      ...forecast,
      hours: [hour, { ...hour, time: start + 7200000 }],
    };
    expect(rankWindows(f, p, "walk", "2030-06-01", start)).toEqual([]);
  });
  it("does not display partial AQI as full coverage", () => {
    const f = {
      ...forecast,
      hours: [hour, { ...hour, time: start + 3600000, aqi: null }],
    };
    expect(rankWindows(f, p, "walk", "2030-06-01", start)[0].aqi).toBeNull();
  });
  it("uses destination date across the international date line", () => {
    expect(localDate(Date.UTC(2030, 5, 1, 23), "Asia/Tokyo")).toBe(
      "2030-06-02",
    );
  });
  it("validates shared and saved coordinates", () => {
    expect(isPlace({ id: 1, name: "Test", latitude: 91, longitude: 0 })).toBe(
      false,
    );
    expect(isPlace({ id: 1, name: "Test", latitude: 0, longitude: 0 })).toBe(
      true,
    );
  });
  it("responds to preference changes", () => {
    expect(
      scoreHour({ ...hour, temperature: 32 }, p, "walk", "UTC"),
    ).toBeLessThan(
      scoreHour(
        { ...hour, temperature: 32 },
        { ...p, temperature: 32 },
        "walk",
        "UTC",
      ),
    );
  });
});
