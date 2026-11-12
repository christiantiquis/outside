import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  Bike,
  Camera,
  Check,
  ChevronRight,
  Compass,
  Footprints,
  Heart,
  Leaf,
  MapPin,
  Mountain,
  Search,
  Share2,
  SlidersHorizontal,
  Sun,
  Wind,
  Droplets,
  RefreshCw,
  X,
} from "lucide-react";
import {
  activities,
  dateLabel,
  isPlace,
  localDate,
  rankWindows,
  scoreHour,
  timeLabel,
  type Activity,
  type Forecast,
  type Place,
  type Preferences,
} from "./planner";
import { loadForecast, searchPlaces } from "./api";
import "./style.css";
const defaultPlace: Place = {
  id: 2643743,
  name: "London",
  country: "United Kingdom",
  latitude: 51.5085,
  longitude: -0.1257,
};
function readSaved(): Place[] {
  try {
    const value = JSON.parse(localStorage.getItem("outside:places") ?? "[]");
    return Array.isArray(value) ? value.filter(isPlace).slice(0, 12) : [];
  } catch {
    return [];
  }
}
function initialPlace(): Place {
  const q = new URLSearchParams(location.search);
  const p = {
    id: 0,
    name: q.get("place") ?? "",
    latitude: Number(q.get("lat")),
    longitude: Number(q.get("lon")),
  };
  return q.has("lat") && q.has("lon") && isPlace(p) ? p : defaultPlace;
}
function initialActivity(): Activity {
  const a = new URLSearchParams(location.search).get("activity");
  return a === "cycle" || a === "photo" ? a : "walk";
}
const activityIcons = { walk: Footprints, cycle: Bike, photo: Camera };
function App() {
  const [place, setPlace] = useState(initialPlace),
    [activity, setActivity] = useState<Activity>(initialActivity);
  const [prefs, setPrefs] = useState<Preferences>(
    activities[initialActivity()].defaults,
  );
  const [forecast, setForecast] = useState<Forecast | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [query, setQuery] = useState(""),
    [results, setResults] = useState<Place[]>([]),
    [searching, setSearching] = useState(false),
    [searchError, setSearchError] = useState("");
  const [saved, setSaved] = useState(readSaved),
    [day, setDay] = useState(""),
    [refresh, setRefresh] = useState(0),
    [notice, setNotice] = useState("");
  const [now, setNow] = useState(Date.now());
  const searchVersion = useRef(0);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setForecast(null);
    setDay("");
    loadForecast(place, controller.signal)
      .then((f) => {
        if (!controller.signal.aborted) {
          setForecast(f);
          setDay(localDate(Date.now(), f.timezone));
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Could not load the forecast.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [place, refresh]);
  useEffect(() => {
    const controller = new AbortController();
    const version = ++searchVersion.current;
    setResults([]);
    setSearchError("");
    setSearching(false);
    if (query.trim().length < 2) return () => controller.abort();
    setSearching(true);
    const timer = setTimeout(
      () =>
        searchPlaces(query.trim(), controller.signal)
          .then((r) => {
            if (version === searchVersion.current) setResults(r);
          })
          .catch(() => {
            if (!controller.signal.aborted)
              setSearchError("City search is unavailable. Please try again.");
          })
          .finally(() => {
            if (!controller.signal.aborted) setSearching(false);
          }),
      350,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  useEffect(() => {
    try {
      localStorage.setItem("outside:places", JSON.stringify(saved));
    } catch {
      setNotice("Your browser could not save places on this device.");
    }
  }, [saved]);
  const days = forecast
    ? [
        ...new Set(
          forecast.hours
            .filter((h) => h.time >= now)
            .map((h) => localDate(h.time, forecast.timezone)),
        ),
      ].slice(0, 5)
    : [];
  const windows = forecast
    ? rankWindows(forecast, prefs, activity, day, now)
    : [];
  const hours = forecast
    ? forecast.hours.filter(
        (h) =>
          localDate(h.time, forecast.timezone) === day &&
          h.daylight &&
          h.time >= now,
      )
    : [];
  const favorite = saved.some(
    (p) => p.latitude === place.latitude && p.longitude === place.longitude,
  );
  function select(p: Place) {
    ++searchVersion.current;
    setPlace(p);
    setQuery("");
    setResults([]);
  }
  function changeActivity(a: Activity) {
    setActivity(a);
    setPrefs(activities[a].defaults);
  }
  async function share() {
    const url = new URL(location.href);
    url.search = "";
    url.searchParams.set("place", place.name);
    url.searchParams.set("lat", String(place.latitude));
    url.searchParams.set("lon", String(place.longitude));
    url.searchParams.set("activity", activity);
    try {
      await navigator.clipboard.writeText(url.href);
      setNotice("Link copied — share this place and activity.");
    } catch {
      setNotice(`Share this link: ${url.href}`);
    }
  }
  return (
    <>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Outside home">
          <Mountain size={29} strokeWidth={2.3} />
          outside<span className="brand-dot">®</span>
        </a>
        <span className="header-note">A little fresh air, well timed.</span>
        <a
          className="source-link"
          href="https://github.com/christiantiquis/outside"
          target="_blank"
          rel="noreferrer"
        >
          Behind the project <ArrowUpRight size={15} />
        </a>
      </header>
      <main>
        <section className="intro">
          <div>
            <span className="eyebrow">
              <span className="live-dot" /> MAKE ROOM FOR THE OUTDOORS
            </span>
            <h1>
              Good days start
              <br />
              with a little <em>outside.</em>
            </h1>
            <p>
              Find the right moment for the things you love.
              <br className="desktop" /> A forecast that fits your plans, not
              the other way around.
            </p>
          </div>
          <div className="landscape" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="sun" />
            <div className="hill hill-back" />
            <div className="hill hill-mid" />
            <div className="hill hill-front" />
            <div className="trail" />
            <span className="landscape-label">
              <Compass size={15} /> A change of scenery awaits.
            </span>
          </div>
        </section>
        <section className="planner" aria-label="Activity planner">
          <div className="planner-top">
            <div className="location-block">
              <span className="field-label">YOUR STARTING POINT</span>
              <div className="current-place">
                <MapPin size={20} />
                <h2>{place.name}</h2>
                <button
                  className={`icon-button ${favorite ? "is-favorite" : ""}`}
                  aria-label={favorite ? "Remove saved place" : "Save place"}
                  onClick={() =>
                    setSaved(
                      favorite
                        ? saved.filter(
                            (p) =>
                              p.latitude !== place.latitude ||
                              p.longitude !== place.longitude,
                          )
                        : [place, ...saved].slice(0, 12),
                    )
                  }
                >
                  <Heart size={18} fill={favorite ? "currentColor" : "none"} />
                </button>
              </div>
              <span className="muted">
                {place.country ?? "Selected location"}
                {forecast ? ` · ${forecast.timezone.replaceAll("_", " ")}` : ""}
              </span>
            </div>
            <div className="search-wrap">
              <label className="search">
                <Search size={18} />
                <input
                  aria-label="Search for a city"
                  placeholder="Somewhere else? Search a city"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                />
                {query && (
                  <button
                    className="icon-button"
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                  >
                    <X size={15} />
                  </button>
                )}
              </label>
              {query.trim().length >= 2 && (
                <div className="search-results" aria-live="polite">
                  {searching ? (
                    <p>Finding places…</p>
                  ) : searchError ? (
                    <p>{searchError}</p>
                  ) : results.length ? (
                    results.map((p) => (
                      <button key={p.id} onClick={() => select(p)}>
                        <MapPin size={16} />
                        <span>
                          <strong>{p.name}</strong>
                          <small>
                            {[p.admin1, p.country].filter(Boolean).join(", ")}
                          </small>
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    ))
                  ) : (
                    <p>No places found. Try another city name.</p>
                  )}
                </div>
              )}
            </div>
          </div>
          {saved.length > 0 && (
            <div className="saved-places">
              <span>Saved places</span>
              {saved.map((p) => (
                <button
                  key={`${p.latitude},${p.longitude}`}
                  onClick={() => select(p)}
                >
                  {p.name}
                  <ArrowUpRight size={12} />
                </button>
              ))}
            </div>
          )}
          <div className="activity-row">
            <span className="field-label">I’M HEADING OUT FOR</span>
            <div className="activity-tabs">
              {(Object.keys(activities) as Activity[]).map((a) => {
                const Icon = activityIcons[a];
                return (
                  <button
                    key={a}
                    className={activity === a ? "active" : ""}
                    aria-pressed={activity === a}
                    onClick={() => changeActivity(a)}
                  >
                    <Icon size={18} />
                    {activities[a].label}
                  </button>
                );
              })}
            </div>
            <button className="share-button" onClick={share}>
              <Share2 size={15} /> Share plan
            </button>
          </div>
        </section>
        <div className="workspace">
          <section className="forecast-section" aria-label="Recommended times">
            <div className="section-heading">
              <div>
                <span className="eyebrow">LESS GUESSWORK. MORE GOING.</span>
                <h2>
                  Your window to wander<span>.</span>
                </h2>
              </div>
              <button
                className="icon-button refresh"
                aria-label="Refresh forecast"
                disabled={loading}
                onClick={() => setRefresh((n) => n + 1)}
              >
                <RefreshCw size={17} />
              </button>
            </div>
            {loading ? (
              <div className="state-card" role="status">
                <Sun className="loading-sun" size={36} />
                <h3>Looking for your next good window…</h3>
                <p>Checking the weather and air quality in {place.name}.</p>
              </div>
            ) : error ? (
              <div className="state-card" role="alert">
                <h3>A small cloud in the forecast.</h3>
                <p>{error}</p>
                <button
                  className="primary"
                  onClick={() => setRefresh((n) => n + 1)}
                >
                  Try again
                </button>
              </div>
            ) : (
              forecast && (
                <>
                  <div className="day-tabs" aria-label="Forecast day">
                    {days.map((d) => {
                      const timestamp = forecast.hours.find(
                        (h) => localDate(h.time, forecast.timezone) === d,
                      )!.time;
                      return (
                        <button
                          key={d}
                          aria-pressed={day === d}
                          className={day === d ? "selected" : ""}
                          onClick={() => setDay(d)}
                        >
                          {d === localDate(now, forecast.timezone)
                            ? "Today"
                            : new Intl.DateTimeFormat("en", {
                                weekday: "short",
                                timeZone: forecast.timezone,
                              }).format(timestamp)}
                          <small>
                            {new Intl.DateTimeFormat("en", {
                              month: "short",
                              day: "numeric",
                              timeZone: forecast.timezone,
                            }).format(timestamp)}
                          </small>
                        </button>
                      );
                    })}
                  </div>
                  {windows.length === 0 ? (
                    <div className="state-card">
                      <Sun size={32} />
                      <h3>No daylight windows left for this plan.</h3>
                      <p>Try another day or a shorter outing.</p>
                    </div>
                  ) : (
                    <div className="window-list">
                      {windows.map((w, i) => (
                        <article
                          className={`window-card ${i === 0 ? "best" : ""}`}
                          key={w.start}
                        >
                          <div className="window-card-top">
                            <span className="window-tag">
                              {i === 0 ? (
                                <>
                                  <Leaf size={14} /> YOUR BEST WINDOW
                                </>
                              ) : (
                                <>OPTION 0{i + 1}</>
                              )}
                            </span>
                            <span className="score">
                              {w.score}
                              <small>/100 match</small>
                            </span>
                          </div>
                          <div className="window-title">
                            <div>
                              <h3>
                                {timeLabel(w.start, forecast.timezone)}{" "}
                                <span>—</span>{" "}
                                {timeLabel(w.end, forecast.timezone)}
                              </h3>
                              <p>
                                {dateLabel(w.start, forecast.timezone)} ·{" "}
                                {prefs.duration}{" "}
                                {prefs.duration === 1 ? "hour" : "hours"} for{" "}
                                {activities[activity].verb}
                              </p>
                            </div>
                            <Sun size={35} strokeWidth={1.3} />
                          </div>
                          <div className="metrics">
                            <span>
                              <Sun size={16} />
                              {w.temperature}°C
                            </span>
                            <span>
                              <Droplets size={16} />
                              {w.rain}% rain
                            </span>
                            <span>
                              <Wind size={16} />
                              {w.wind} km/h
                            </span>
                            <span className="air-metric">
                              <Leaf size={16} />
                              {w.aqi === null
                                ? "AQI unavailable"
                                : `US AQI ${w.aqi}`}
                            </span>
                          </div>
                          <div className="reasons">
                            {w.reasons.map((r) => (
                              <span key={r}>
                                <Check size={13} />
                                {r}
                              </span>
                            ))}
                          </div>
                          {i === 0 && (
                            <p className="match-caption">
                              {w.score >= 75
                                ? "A good-looking stretch. Make a little time for it."
                                : w.score >= 50
                                  ? "Some trade-offs today. Check the conditions before you go."
                                  : "Conditions are a poor match. Consider a different day."}
                            </p>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                  {hours.length > 0 && (
                    <div className="timeline">
                      <div className="timeline-heading">
                        <h3>The day at a glance</h3>
                        <span>Match to your preferences</span>
                      </div>
                      <div className="hour-bars">
                        {hours.map((h) => {
                          const score = scoreHour(
                            h,
                            prefs,
                            activity,
                            forecast.timezone,
                          );
                          return (
                            <div className="hour" key={h.time}>
                              <span>{Math.round(h.temperature)}°</span>
                              <div className="bar-track">
                                <div
                                  className={`bar ${score < 50 ? "low" : score < 75 ? "medium" : ""}`}
                                  style={{ height: `${Math.max(8, score)}%` }}
                                  title={`${timeLabel(h.time, forecast.timezone)}: ${score}/100 match`}
                                />
                              </div>
                              <small>
                                {new Intl.DateTimeFormat("en-GB", {
                                  hour: "2-digit",
                                  timeZone: forecast.timezone,
                                }).format(h.time)}
                              </small>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <p className="forecast-meta">
                    Updated {timeLabel(forecast.fetchedAt, forecast.timezone)} ·
                    All times in {forecast.timezone.replaceAll("_", " ")}
                    {!forecast.airAvailable &&
                      " · Air quality unavailable; excluded from scoring."}
                  </p>
                </>
              )
            )}
          </section>
          <aside>
            <section className="preferences">
              <div className="aside-title">
                <SlidersHorizontal size={18} />
                <h2>Your kind of good weather</h2>
              </div>
              <p>
                A perfect day looks different to everyone.
                <br />
                Tell us what feels right to you.
              </p>
              <label className="slider-label" htmlFor="temperature">
                Ideal temperature <strong>{prefs.temperature}°C</strong>
              </label>
              <input
                id="temperature"
                type="range"
                min="5"
                max="35"
                value={prefs.temperature}
                onChange={(e) =>
                  setPrefs({ ...prefs, temperature: Number(e.target.value) })
                }
              />
              <div className="range-labels">
                <span>Cool & crisp</span>
                <span>Nice & warm</span>
              </div>
              <label className="slider-label" htmlFor="rain">
                Maximum rain chance <strong>{prefs.rain}%</strong>
              </label>
              <input
                id="rain"
                type="range"
                min="0"
                max="100"
                step="5"
                value={prefs.rain}
                onChange={(e) =>
                  setPrefs({ ...prefs, rain: Number(e.target.value) })
                }
              />
              <div className="range-labels">
                <span>Keep it dry</span>
                <span>A little rain is fine</span>
              </div>
              <label className="slider-label" htmlFor="wind">
                Maximum wind <strong>{prefs.wind} km/h</strong>
              </label>
              <input
                id="wind"
                type="range"
                min="5"
                max="50"
                value={prefs.wind}
                onChange={(e) =>
                  setPrefs({ ...prefs, wind: Number(e.target.value) })
                }
              />
              <label className="slider-label" htmlFor="duration">
                Time to yourself
              </label>
              <select
                id="duration"
                value={prefs.duration}
                onChange={(e) =>
                  setPrefs({ ...prefs, duration: Number(e.target.value) })
                }
              >
                <option value="1">1 hour · A quick escape</option>
                <option value="2">2 hours · Take your time</option>
                <option value="3">3 hours · Make a morning of it</option>
              </select>
              <button
                className="reset"
                onClick={() => setPrefs(activities[activity].defaults)}
              >
                Reset preferences
              </button>
            </section>
            <section className="field-note">
              <Compass size={25} />
              <span className="eyebrow">A SMALL FIELD NOTE</span>
              <h3>
                You don’t need
                <br />a whole day off.
              </h3>
              <p>
                Sometimes a good hour outside is all it takes. Start small.
                Leave a little room for the unexpected.
              </p>
            </section>
            <details className="scoring">
              <summary>How do we find your window?</summary>
              <p>
                We score each daylight hour from 0–100 using distance from your
                ideal temperature, rain chance, wind, and US AQI when available.
                Rain and wind above your limits receive extra penalties.
                Photography gives a small bonus to early and late daylight
                hours; this is not a calculated golden-hour forecast. We average
                consecutive hours for your outing and pick three non-overlapping
                windows. Preferences guide the score rather than guarantee
                conditions.
              </p>
            </details>
          </aside>
        </div>
        <footer>
          <a className="brand footer-brand" href="/">
            <Mountain size={22} />
            outside
          </a>
          <p>Made for getting out there.</p>
          <span>
            Weather:{" "}
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>{" "}
            · Air quality:{" "}
            <a
              href="https://ads.atmosphere.copernicus.eu/"
              target="_blank"
              rel="noreferrer"
            >
              CAMS
            </a>{" "}
            via Open-Meteo · Places:{" "}
            <a
              href="https://www.geonames.org/"
              target="_blank"
              rel="noreferrer"
            >
              GeoNames
            </a>
          </span>
        </footer>
        {notice && (
          <div className="toast" role="status">
            <span>{notice}</span>
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
