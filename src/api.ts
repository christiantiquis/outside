import { isPlace, type Place, type Forecast, type Hour } from "./planner";
const cache = new Map<string, { at: number; value: unknown }>();
async function get(url: string, signal?: AbortSignal): Promise<any> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < 15 * 60 * 1000) return hit.value;
  const timeout = AbortSignal.timeout(12000);
  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "Forecast service is busy. Please try again shortly."
        : "The forecast service could not be reached. Please try again.",
    );
  const value = await response.json();
  if (cache.size >= 30) cache.delete(cache.keys().next().value!);
  cache.set(url, { at: Date.now(), value });
  return value;
}
export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<Place[]> {
  const data = await get(
    `https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: query, count: "6", language: "en", format: "json" })}`,
    signal,
  );
  return Array.isArray(data.results) ? data.results.filter(isPlace) : [];
}
export async function loadForecast(
  place: Place,
  signal?: AbortSignal,
): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    timezone: "auto",
    timeformat: "unixtime",
    forecast_days: "5",
  });
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?${params}&hourly=temperature_2m,precipitation_probability,wind_speed_10m,is_day`;
  const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?${params}&hourly=us_aqi`;
  const [weather, air] = await Promise.all([
    get(weatherUrl, signal),
    get(airUrl, signal).catch(() => null),
  ]);
  const h = weather.hourly;
  if (!h || !Array.isArray(h.time) || typeof weather.timezone !== "string")
    throw new Error("Forecast data is incomplete. Please try again.");
  const airMap = new Map<number, number>();
  air?.hourly?.time?.forEach((t: number, i: number) => {
    const n = air.hourly.us_aqi?.[i];
    if (typeof n === "number" && Number.isFinite(n)) airMap.set(t, n);
  });
  const hours: Hour[] = h.time.flatMap((t: number, i: number) => {
    const values = [
      t,
      h.temperature_2m?.[i],
      h.precipitation_probability?.[i],
      h.wind_speed_10m?.[i],
      h.is_day?.[i],
    ];
    if (values.some((v) => typeof v !== "number" || !Number.isFinite(v)))
      return [];
    return [
      {
        time: t * 1000,
        temperature: values[1],
        rain: values[2],
        wind: values[3],
        daylight: values[4] === 1,
        aqi: airMap.get(t) ?? null,
      },
    ];
  });
  if (!hours.length)
    throw new Error(
      "No usable forecast hours were returned. Please try again.",
    );
  return {
    hours,
    timezone: weather.timezone,
    fetchedAt: Date.now(),
    airAvailable: airMap.size > 0,
  };
}
