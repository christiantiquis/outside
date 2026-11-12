export type Activity = "walk" | "cycle" | "photo";
export type Place = {
  id: number;
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};
export type Hour = {
  time: number;
  temperature: number;
  rain: number;
  wind: number;
  daylight: boolean;
  aqi: number | null;
};
export type Forecast = {
  hours: Hour[];
  timezone: string;
  fetchedAt: number;
  airAvailable: boolean;
};
export type Preferences = {
  temperature: number;
  rain: number;
  wind: number;
  duration: number;
};
export type Window = {
  start: number;
  end: number;
  score: number;
  temperature: number;
  rain: number;
  wind: number;
  aqi: number | null;
  reasons: string[];
};
export const activities: Record<
  Activity,
  { label: string; verb: string; defaults: Preferences }
> = {
  walk: {
    label: "Walking",
    verb: "a walk",
    defaults: { temperature: 22, rain: 30, wind: 25, duration: 2 },
  },
  cycle: {
    label: "Cycling",
    verb: "a bike ride",
    defaults: { temperature: 20, rain: 20, wind: 18, duration: 2 },
  },
  photo: {
    label: "Photography",
    verb: "a photo walk",
    defaults: { temperature: 21, rain: 25, wind: 20, duration: 1 },
  },
};
export function scoreHour(
  h: Hour,
  p: Preferences,
  activity: Activity,
  timezone: string,
): number {
  const tempPenalty = Math.min(
    40,
    Math.abs(h.temperature - p.temperature) * 2.5,
  );
  const rainPenalty =
    h.rain > p.rain ? 20 + (h.rain - p.rain) * 0.3 : h.rain * 0.15;
  const windPenalty =
    h.wind > p.wind ? 15 + (h.wind - p.wind) * 1.5 : h.wind * 0.15;
  const airPenalty = h.aqi === null ? 0 : Math.max(0, h.aqi - 50) * 0.25;
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: timezone,
    }).format(h.time),
  );
  const photoBonus = activity === "photo" && (hour <= 8 || hour >= 16) ? 5 : 0;
  return Math.round(
    Math.max(
      0,
      Math.min(
        100,
        100 - tempPenalty - rainPenalty - windPenalty - airPenalty + photoBonus,
      ),
    ),
  );
}
export function rankWindows(
  forecast: Forecast,
  p: Preferences,
  activity: Activity,
  day: string,
  now = Date.now(),
): Window[] {
  const candidates: Window[] = [];
  for (let i = 0; i <= forecast.hours.length - p.duration; i++) {
    const slice = forecast.hours.slice(i, i + p.duration);
    if (
      slice[0].time < now ||
      localDate(slice[0].time, forecast.timezone) !== day ||
      slice.some(
        (h, j) =>
          !h.daylight || (j > 0 && h.time - slice[j - 1].time !== 3600000),
      )
    )
      continue;
    const temperature = Math.round(
      slice.reduce((n, h) => n + h.temperature, 0) / slice.length,
    );
    const rain = Math.max(...slice.map((h) => h.rain));
    const wind = Math.round(Math.max(...slice.map((h) => h.wind)));
    const air = slice.map((h) => h.aqi).filter((n): n is number => n !== null);
    const aqi =
      air.length === slice.length ? Math.round(Math.max(...air)) : null;
    candidates.push({
      start: slice[0].time,
      end: slice.at(-1)!.time + 3600000,
      score: Math.round(
        slice.reduce(
          (n, h) => n + scoreHour(h, p, activity, forecast.timezone),
          0,
        ) / slice.length,
      ),
      temperature,
      rain,
      wind,
      aqi,
      reasons: [
        rain <= p.rain
          ? "Rain within your preference"
          : "Rain above your preference",
        wind <= p.wind ? "Comfortable wind" : "Windier than you prefer",
        Math.abs(temperature - p.temperature) <= 4
          ? "Close to your ideal temperature"
          : "Away from your ideal temperature",
      ],
    });
  }
  const chosen: Window[] = [];
  for (const w of candidates.sort(
    (a, b) => b.score - a.score || a.start - b.start,
  )) {
    if (chosen.every((other) => w.end <= other.start || w.start >= other.end))
      chosen.push(w);
    if (chosen.length === 3) break;
  }
  return chosen;
}
export function localDate(time: number, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(time);
  return ["year", "month", "day"]
    .map((k) => parts.find((p) => p.type === k)!.value)
    .join("-");
}
export function timeLabel(time: number, timezone: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(time);
}
export function dateLabel(time: number, timezone: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: timezone,
  }).format(time);
}
export function isPlace(p: unknown): p is Place {
  const x = p as Place;
  return (
    !!x &&
    typeof x.name === "string" &&
    x.name.length > 0 &&
    x.name.length <= 120 &&
    Number.isFinite(x.id) &&
    Number.isFinite(x.latitude) &&
    Math.abs(x.latitude) <= 90 &&
    Number.isFinite(x.longitude) &&
    Math.abs(x.longitude) <= 180
  );
}
