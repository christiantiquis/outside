import { afterEach, describe, expect, it, vi } from "vitest";
import { loadForecast, searchPlaces } from "./api";
const place = { id: 1, name: "Test", latitude: 11, longitude: 22 };
afterEach(() => vi.unstubAllGlobals());
describe("provider integration", () => {
  it("validates search results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: [place, { ...place, latitude: 999 }] }),
      }),
    );
    expect(await searchPlaces("validation-test")).toEqual([place]);
  });
  it("keeps weather when air fails and removes invalid hourly values", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) =>
        url.includes("air-quality")
          ? { ok: false, status: 503 }
          : {
              ok: true,
              json: async () => ({
                timezone: "UTC",
                hourly: {
                  time: [10, 20],
                  temperature_2m: [22, null],
                  precipitation_probability: [10, 20],
                  wind_speed_10m: [4, 5],
                  is_day: [1, 1],
                },
              }),
            },
      ),
    );
    const f = await loadForecast(place);
    expect(f.hours).toHaveLength(1);
    expect(f.hours[0].time).toBe(10000);
    expect(f.hours[0].aqi).toBeNull();
    expect(f.airAvailable).toBe(false);
  });
  it("rejects incomplete weather data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );
    await expect(loadForecast({ ...place, latitude: 12 })).rejects.toThrow(
      "incomplete",
    );
  });
  it("reports provider throttling", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 429 }),
    );
    await expect(searchPlaces("throttle-test")).rejects.toThrow("busy");
  });
});
