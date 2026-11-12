# Outside

A little fresh air, well timed. Outside helps you find a good daylight window for walking, cycling, or photography using live weather and air-quality forecasts.

## Run locally

Requires Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:9102. No API key, database, or environment file is needed.

## Features

- Global city search with debouncing, cancellation, and disambiguating region/country labels.
- Five-day hourly forecasts with all times shown in the destination's timezone.
- Three non-overlapping daylight recommendations for your chosen outing length.
- Walking, cycling, and photography presets with adjustable temperature, rain, and wind preferences.
- Transparent 0–100 scoring, reasons for each recommendation, and an hourly comparison chart.
- Saved places stored on your device, plus links sharing a city and activity. Shared links use the activity's default preferences and the current forecast, rather than a frozen plan.
- Explicit loading, retry, empty, and unavailable-air-quality states.
- Responsive layout, labelled controls, keyboard focus styles, and reduced-motion support.

## How ranking works

Each hour begins at 100. Temperature subtracts 2.5 points per degree from the ideal (capped at 40). Rain below your threshold subtracts 0.15 points per percentage point; above the threshold it subtracts 20 plus 0.3 per point above. Wind below the limit subtracts 0.15 points per km/h; above it subtracts 15 plus 1.5 per km/h above. Available US AQI subtracts 0.25 points per index point above 50. Photography adds 5 points before 09:00 or from 16:00 in local daylight; it does not calculate golden hour. Final hourly scores are clamped to 0–100.

Only complete, consecutive daylight windows starting in the future qualify. Window scores average the constituent hours. The app chooses the highest-scoring window, then the best remaining non-overlapping windows, up to three. Limits influence the ranking rather than act as hard filters. Scores describe preference fit and are not a safety assessment. Missing air quality is excluded from scoring and marked unavailable; scores with different air coverage may not be directly comparable.

## APIs, attribution, and privacy

The browser calls Open-Meteo directly; there is no application server handling your location. Search text and selected coordinates are sent to the providers. Saved places stay in localStorage. Forecast responses are cached in memory for 15 minutes with a bounded 30-entry cache. Requests time out after 12 seconds. A refresh reloads from that cache within its lifetime.

- [Open-Meteo weather API](https://open-meteo.com/en/docs)
- [Open-Meteo geocoding API](https://open-meteo.com/en/docs/geocoding-api), based on [GeoNames](https://www.geonames.org/)
- [Open-Meteo air quality API](https://open-meteo.com/en/docs/air-quality-api), using [Copernicus CAMS](https://ads.atmosphere.copernicus.eu/)

Open-Meteo data requires attribution. The hosted free API is for noncommercial use and has request limits; review [its terms](https://open-meteo.com/en/terms) before commercializing or scaling. The UI includes provider attribution. Fonts are served by Google Fonts, with system fallbacks. All landscape artwork is CSS.

## Checks

```sh
npm run check
npx playwright install --with-deps chromium
npm run test:e2e
```

Unit tests verify ranking, missing data, timezone boundaries, upstream parsing and failures. Browser tests cover desktop and mobile planning, searching, persistence, shared links, failures and partial API availability using deterministic mock responses. Browser tests use port 19102 so the app can keep using 9102. CI also builds the production Docker image. Mocked tests do not establish the accuracy or uptime of external forecasts.

## Docker / homelab1

```sh
docker compose up -d --build --wait
curl --fail http://localhost:9102/health
```

The app publishes **9102** on the host to an unprivileged nginx process on port 8080. It runs with a read-only filesystem, temporary `/tmp`, dropped capabilities, and a health check. No database or persistent app volume is needed. `/health` confirms nginx is serving; external API reachability is separate.

### GitHub runner setup later

1. Create a repository runner for `christiantiquis/outside` on homelab1.
2. Give it the custom label **`homelab-outside`** (alongside the standard `self-hosted` label).
3. Ensure it has Git, Docker CLI, Docker Compose, curl, and access to the host Docker socket. If the runner runs in Docker, published ports belong to the Docker host; use host networking for the workflow's localhost smoke checks.
4. Merge the first PR when ready. The deployment workflow is available on `main` after merge.
5. Run **Deploy to homelab1** from GitHub Actions, selecting `main`.

Deployment is deliberately manual until the runner exists. It builds and starts Compose, waits for health, then checks `/health` and the app page. No runner tokens or credentials belong in this repository. Outside does not modify the separate runner stack or configure a public domain/Tunnel.

## Stack

React, TypeScript, Vite, Lucide, Vitest, Playwright, Docker, nginx. A static frontend keeps hosting lightweight; user preferences and ranking run entirely in the browser.
