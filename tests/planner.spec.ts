import { expect, test, type Page } from "@playwright/test";
const now = Date.UTC(2030, 5, 1, 5);
async function mock(page: Page, fail = false, airFail = false) {
  await page.clock.install({ time: now });
  await page.route("https://**.open-meteo.com/**", async (route) => {
    const url = route.request().url();
    if (url.includes("geocoding-api"))
      return route.fulfill({
        json: {
          results: [
            {
              id: 1,
              name: "Tokyo",
              country: "Japan",
              latitude: 35.68,
              longitude: 139.69,
            },
          ],
        },
      });
    if (fail) return route.fulfill({ status: 503, body: "unavailable" });
    if (url.includes("air-quality-api") && airFail)
      return route.fulfill({ status: 503, body: "unavailable" });
    const time = Array.from(
      { length: 120 },
      (_, i) => now / 1000 - 5 * 3600 + i * 3600,
    );
    const a = Array(time.length).fill(0);
    return route.fulfill({
      json: url.includes("air-quality-api")
        ? { hourly: { time, us_aqi: a.map(() => 25) } }
        : {
            timezone: "UTC",
            hourly: {
              time,
              temperature_2m: a.map(() => 22),
              precipitation_probability: a.map(() => 10),
              wind_speed_10m: a.map(() => 8),
              is_day: time.map((t) => {
                const h = new Date(t * 1000).getUTCHours();
                return h >= 6 && h < 19 ? 1 : 0;
              }),
            },
          },
    });
  });
}
test("recommends windows and adjusts activity, day and duration", async ({
  page,
}) => {
  await mock(page);
  await page.goto("/");
  await expect(page.getByText("YOUR BEST WINDOW")).toBeVisible();
  await expect(page.locator(".window-card")).toHaveCount(3);
  await page.getByRole("button", { name: "Cycling", exact: true }).click();
  await expect(page.getByText(/2 hours for a bike ride/).first()).toBeVisible();
  await page.getByLabel("Time to yourself").selectOption("1");
  await expect(page.getByText(/1 hour for a bike ride/).first()).toBeVisible();
  await page.locator(".day-tabs button").nth(1).click();
  await expect(page.locator(".day-tabs button").nth(1)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("city search, saved places and shared links work", async ({ page }) => {
  await mock(page);
  await page.goto("/");
  await page.getByLabel("Search for a city").fill("Tokyo");
  await page.clock.runFor(500);
  await page.getByRole("button", { name: /Tokyo Japan/ }).click();
  await expect(
    page.getByRole("heading", { name: "Tokyo", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Save place", { exact: true }).click();
  await page.reload();
  await expect(
    page.locator(".saved-places").getByRole("button", { name: "Tokyo" }),
  ).toBeVisible();
  await page.goto("/?place=Tokyo&lat=35.68&lon=139.69&activity=photo");
  await expect(
    page.getByRole("heading", { name: "Tokyo", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Photography", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("forecast failure offers retry", async ({ page }) => {
  await mock(page, true);
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("could not be reached");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});
test("missing air quality still shows weather recommendations", async ({
  page,
}) => {
  await mock(page, false, true);
  await page.goto("/");
  await expect(page.getByText("YOUR BEST WINDOW")).toBeVisible();
  await expect(page.getByText("AQI unavailable").first()).toBeVisible();
  await expect(
    page.getByText(/Air quality unavailable; excluded/),
  ).toBeVisible();
});
