import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";

const CODE = process.env.E2E_CODE ?? "smoke-code-1";
const SHOTS = process.env.E2E_SHOTS;
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const TODAY = iso(new Date());

// a 1x1 PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("language", "da"));
});

/** The admin asks for the family code once. After that there is free access. */
async function login(page: Page, code = CODE) {
  await page.goto("/admin");
  await page.getByLabel("Kode", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Log ind", exact: true }).click();
  if (code === CODE) await expect(page.locator(".app")).toBeAttached();
}

async function addMember(page: Page, name: string) {
  await page.goto("/admin/members");
  await page.getByRole("button", { name: "+ Tilføj person" }).click();
  await page.getByLabel("Navn").fill(name);
  await page.getByRole("button", { name: "Gem" }).click();
  await expect(page.getByRole("button", { name })).toBeVisible();
}

async function addEvent(page: Page, title: string, who: string, time = "", end = "") {
  await page.goto("/admin/weekplan");
  await page.getByRole("button", { name: "+ Nyt event" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Hvad sker der?").fill(title);
  if (who) await sheet.getByRole("button", { name: who, exact: true }).click();
  if (time) await sheet.getByLabel("Fra").fill(time);
  if (end) await sheet.getByLabel("Til").fill(end);
  await sheet.getByRole("button", { name: "Gem", exact: true }).click();
}

async function api(request: APIRequestContext, method: "post" | "put", path: string, data: unknown) {
  const res = await request[method](path, { data, headers: { "X-Family-Code": CODE } });
  expect(res.ok(), `${method} ${path}`).toBeTruthy();
  return res.json();
}

test("login once, then free access; family members, colours, per-person filter and views", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Log ind på administrationen" })).toBeVisible();
  await login(page, "wrong-code");
  await expect(page.getByRole("alert")).toHaveText("Forkert kode");
  await login(page);
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await addMember(page, "Alex");
  await addMember(page, "Sam");

  await addEvent(page, "E2E svømning", "Sam", "16:00", "17:00");
  await expect(page.locator(".tl-event", { hasText: "E2E svømning" })).toBeVisible();

  // the code itself is kept nowhere in the page (the login cookie is not readable from scripts)
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie);
  expect(stored).not.toContain(CODE);

  await addEvent(page, "E2E lektier", "Alex", "14:30", "15:30");
  await addEvent(page, "E2E fælles middag", "");
  await expect(page.getByRole("button", { name: /E2E fælles middag/ }).first()).toBeVisible();

  // per-person bubbles filter the day
  await page.locator(".bubbles").getByRole("button", { name: "Sam", exact: true }).click();
  await expect(page.locator(".tl-event", { hasText: "E2E svømning" })).toBeVisible();
  await expect(page.locator(".tl-event", { hasText: "E2E lektier" })).toHaveCount(0);
  await page.locator(".bubble.all").click();
  await expect(page.locator(".tl-event", { hasText: "E2E lektier" })).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/desktop-day.png` });

  await page.getByRole("button", { name: "Uge", exact: true }).click();
  await expect(page.locator(".weekgrid")).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/desktop-week.png` });
  await page.getByRole("button", { name: "Pr. person" }).click();
  await expect(page.locator(".matrix-person")).toHaveCount(3);
  await page.getByRole("button", { name: "Måned" }).click();
  await expect(page.locator(".month-day")).not.toHaveCount(0);

  // duplicate question
  await addEvent(page, "e2e SVØMNING", "Sam");
  await expect(page.getByText(/findes allerede/)).toBeVisible();
  await page.getByRole("button", { name: "Annuller" }).click();

  // public display on /
  await page.goto("/");
  await expect(page.getByText("E2E svømning").first()).toBeVisible();
  await expect(page.getByRole("link")).toHaveCount(0);
  await expect(page.locator(".tl-person")).not.toHaveCount(0);
});

test("to-do list and wallpaper", async ({ page }) => {
  await login(page);
  await page.goto("/admin/todo");
  await page.getByLabel("Hvad skal huskes?").fill("E2E køb mælk");
  await page.getByRole("button", { name: "Tilføj" }).click();
  const box = page.getByRole("checkbox", { name: "E2E køb mælk" });
  await expect(box).toBeVisible();
  await box.click();
  await expect(box).toHaveAttribute("aria-checked", "true");

  await page.goto("/admin/settings");
  await page.getByRole("button", { name: "Lavendel" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-wallpaper", "lavender");
});

test("photos: upload into an album, shown in the slideshow", async ({ page }) => {
  await login(page);
  writeFileSync("test-results/e2e.png", PNG);
  await page.goto("/admin/photos");
  await page.getByRole("button", { name: "+ Nyt album" }).click();
  await page.getByLabel("Navn på album").fill("E2E sommer");
  await page.getByRole("button", { name: "Gem" }).click();
  await expect(page.getByRole("button", { name: /E2E sommer/ })).toBeVisible();
  await page.locator("#photo-file").setInputFiles("test-results/e2e.png");
  await expect(page.locator(".photo img")).toHaveCount(1, { timeout: 15000 });
  await page.goto("/");
  await expect(page.locator(".slideshow img").first()).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/tv-default.png`, fullPage: true });
});

test("meal plan, then a second dashboard on /tv", async ({ page }) => {
  await login(page);
  await page.goto("/admin/mealplan");
  await page.locator(".meal-row.today").click();
  await page.locator("#meal-name").fill("E2E tacos");
  await page.locator("#meal-ingredients").fill("Tortilla\nHakket kød");
  await page.getByRole("switch", { name: "Favoritret" }).click();
  await page.getByRole("button", { name: "Gem", exact: true }).click();
  await expect(page.locator(".meal-row.today")).toContainText("E2E tacos");
  await expect(page.locator(".meal-row.today")).toContainText("♥");
  await page.getByRole("button", { name: "Læg ingredienser på indkøbslisten" }).click();
  await expect(page.getByText("2 varer lagt på indkøbslisten")).toBeVisible();
  await page.goto("/admin/shopping");
  await expect(page.getByRole("checkbox", { name: "Tortilla" })).toBeVisible();
  await page.getByRole("checkbox", { name: "Tortilla" }).click();   // ticking in the shop needs no code
  await expect(page.getByRole("checkbox", { name: "Tortilla" })).toHaveAttribute("aria-checked", "true");
  await page.goto("/admin/mealplan");
  await page.getByRole("button", { name: "Fyld ugen med favoritter" }).click();
  await expect(page.getByText("Ugen er fyldt med favoritter")).toBeVisible();

  await page.goto("/admin/dashboards");
  await page.getByRole("button", { name: "+ Nyt dashboard" }).click();
  await page.getByRole("button", { name: "Familie-hub" }).click();
  await page.getByLabel("Navn", { exact: true }).fill("TV i stuen");
  await page.locator("#d-slug").fill("tv");
  await page.locator("summary").click();
  await page.locator("details.screen-settings").getByRole("button", { name: "Uge", exact: true }).click();
  await page.getByRole("button", { name: "Gem opsætning" }).click();
  await expect(page.getByRole("button", { name: /TV i stuen/ })).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/admin-dashboards.png`, fullPage: true });

  await page.goto("/tv");
  await expect(page.locator(".weekgrid")).toBeVisible();   // start view is the week, and there is no toggle without touch
  await expect(page.getByRole("button")).toHaveCount(0);
  await page.goto("/findes-ikke");
  await expect(page.getByText("Dashboardet findes ikke.")).toBeVisible();
});

test("touch screen: switch to the week, and it goes back by itself", async ({ page, request }) => {
  const main = await (await request.get("/api/dashboard/dashboards/main")).json();
  await api(request, "post", "/api/dashboard/dashboards", {
    slug: "touchy", name: "Touch", device: "screen", orientation: "landscape",
    widgets: main.widgets, start_view: "day", touch: true, return_after: 10, idle_photo_after: 0,
    slideshow: main.slideshow,
  });
  const item = await api(request, "post", "/api/todo/items", { title: "E2E tick me", member_id: null });
  await page.goto("/touchy");
  await expect(page.locator(".tl-person").first()).toBeVisible();
  // a task can be ticked right on the dashboard, without any code
  await page.getByRole("checkbox", { name: "E2E tick me" }).click();
  await expect(page.getByRole("checkbox", { name: "E2E tick me" })).toHaveAttribute("aria-checked", "true");
  const items = await (await request.get("/api/todo/items")).json();
  expect(items.find((i: { id: number }) => i.id === item.id).done).toBe(true);
  await expect(page.getByRole("link", { name: "Gå til administration" })).toHaveCount(0); // no settings button on a custom dashboard
  await page.getByRole("button", { name: "Uge", exact: true }).click();
  await expect(page.locator(".weekgrid")).toBeVisible();
  await expect(page.getByText(/Skifter tilbage til dag om \d+ s/)).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/tv-week-touch.png` });
  await expect(page.locator(".tl-person").first()).toBeVisible({ timeout: 20000 });
  await expect(page.locator(".weekgrid")).toHaveCount(0);
  await page.getByRole("button", { name: "Billeder" }).click();
  await expect(page.locator(".frame")).toBeVisible();
  await page.mouse.click(100, 100);
  await expect(page.locator(".frame")).toHaveCount(0);
});

test("import a file made from the template, with a new person", async ({ page }) => {
  await login(page);
  const file = "test-results/import.json";
  writeFileSync(file, JSON.stringify({
    schema_version: 1,
    events: [
      { title: "E2E import 1", date: TODAY, start: null, end: null, person: "Alex", category: "homework", notes: null },
      { title: "E2E import 2", date: TODAY, start: "10:00", end: null, person: "Mia", category: "plan", notes: null },
      { title: "E2E svømning", date: TODAY, start: null, end: null, person: null, category: "other", notes: null },
    ],
  }));
  await page.goto("/admin/weekplan/import");
  await page.locator("#import-file").setInputFiles(file);
  await expect(page.getByText("· Findes allerede")).toBeVisible();
  await expect(page.getByText("Nye personer oprettes: Mia")).toBeVisible();
  await page.getByRole("button", { name: /Importér 2 events/ }).click();
  await expect(page.getByText("2 oprettet, 1 sprunget over")).toBeVisible();

  const bad = "test-results/bad.json";
  writeFileSync(bad, "not json");
  await page.locator("#import-file").setInputFiles(bad);
  await expect(page.getByText("Filen kan ikke læses som JSON")).toBeVisible();
});

test("phone layout: bubbles, cards, pill menu, bottom sheet", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem("language", "da"));
  await login(page);
  await page.goto("/admin/weekplan");
  await expect(page.locator(".daylist, .card.muted").first()).toBeVisible();
  const box = await page.locator(".pillnav").boundingBox();
  expect(box!.y).toBeGreaterThan(700);
  await expect(page.locator(".rail")).toBeHidden();
  await expect(page.locator(".bubble").first()).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/phone-day.png` });
  await page.locator(".fab").click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  const sbox = await sheet.boundingBox();
  expect(sbox!.y + sbox!.height).toBeGreaterThan(830); // the sheet sits at the bottom
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/phone-add.png` });
  await sheet.getByRole("button", { name: "Luk" }).click();
  await page.goto("/admin/more");
  await expect(page.getByRole("link", { name: "Huskeliste" })).toBeVisible();
  await page.goto("/");
  await expect(page.locator(".tl-person").first()).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/phone-display.png`, fullPage: true });
  await ctx.close();

  const desk = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const d = await desk.newPage();
  await d.addInitScript(() => localStorage.setItem("language", "da"));
  await d.goto("/tv");
  await expect(d.locator(".weekgrid")).toBeVisible();
  if (SHOTS) await d.screenshot({ path: `${SHOTS}/tv-week.png` });
  await desk.close();
});

test("settings: language switch without a reload", async ({ page }) => {
  await login(page);
  await page.goto("/admin/settings");
  await page.evaluate(() => ((window as unknown as { marker: number }).marker = 1));
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1);
  await page.getByRole("button", { name: "Dansk" }).click();
  await expect(page.getByRole("heading", { name: "Indstillinger" })).toBeVisible();
});


test("live dashboard editor: change widgets in the preview, title, only the default is on /", async ({ page }) => {
  await login(page);
  await page.goto("/admin/dashboards");
  await page.getByRole("button", { name: /Family dashboard/ }).click();
  await expect(page.locator(".preview .widget")).toHaveCount(5);
  await expect(page.getByText("Brug som standard")).toHaveCount(0); // no way to make another dashboard the root one
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/editor.png`, fullPage: true });

  // the settings of a widget are behind a cogwheel, not always in the way
  await page.locator(".preview .widget", { has: page.locator(".slideshow") }).first().click();
  await expect(page.locator(".wtool")).toBeVisible();
  await expect(page.locator(".wsettings")).toHaveCount(0);
  await page.getByRole("button", { name: "Indstillinger for widget" }).click();
  await expect(page.locator(".wsettings")).toContainText("Ovenpå billedet");
  await page.getByRole("button", { name: "Indstillinger for widget" }).click();
  await expect(page.locator(".wsettings")).toHaveCount(0);

  // the frame around the preview shows which device is built for (and is not part of the dashboard)
  const tvWidth = (await page.locator(".device").boundingBox())!.width;
  await page.getByRole("button", { name: "Telefon", exact: true }).click();
  await expect(page.locator(".dev-phone")).toBeVisible();
  const phoneWidth = (await page.locator(".device").boundingBox())!.width;
  expect(phoneWidth).toBeLessThan(tvWidth * 0.6);
  await expect(page.locator(".device-screen")).toHaveCSS("width", /3\d\d/); // 390 (scaled a little)
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/editor-phone.png`, fullPage: true });
  await page.getByRole("button", { name: "Stor skærm", exact: true }).click();
  await expect(page.locator(".dev-tv")).toBeVisible();

  // pick a widget right in the preview and change it there
  await page.locator(".preview .widget", { hasText: "Aftensmad i dag" }).first().click();
  await expect(page.locator(".wtool")).toBeVisible();
  await page.locator(".wtool").getByRole("button", { name: "Fjern widget" }).click();
  await expect(page.locator(".preview .widget")).toHaveCount(4);

  // add a clock where you want it
  await page.getByRole("button", { name: "+ Ur og dato" }).click();
  await expect(page.locator(".preview .widget")).toHaveCount(5);
  await page.locator(".wtool").getByRole("button", { name: "Flyt frem" }).click();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/editor-picked.png`, fullPage: true });

  // date and clock can be switched off on a dashboard
  await page.getByRole("switch", { name: "Dato og ur øverst" }).click();
  await expect(page.locator(".preview .topbar-clock")).toHaveCount(0);
  await page.getByRole("switch", { name: "Dato og ur øverst" }).click();
  await expect(page.locator(".preview .topbar-clock")).toHaveCount(1);

  // title: own text, then none
  await page.getByRole("button", { name: "Egen tekst" }).click();
  await page.locator("#d-title").fill("Hos familien Holm");
  await expect(page.locator(".preview .topbar-name")).toHaveText("Hos familien Holm");
  await page.getByRole("button", { name: "Gem opsætning" }).click();
  await page.goto("/");
  await expect(page.locator(".topbar-name")).toHaveText("Hos familien Holm");

  await page.goto("/admin/dashboards");
  await page.getByRole("button", { name: /Family dashboard/ }).click();
  await page.getByRole("button", { name: "Ingen", exact: true }).click();
  await page.getByRole("button", { name: "Gem opsætning" }).click();
  await page.goto("/");
  await expect(page.locator(".topbar-name")).toHaveCount(1);
  await expect(page.locator(".topbar-name")).toHaveText("");
  await expect(page.locator(".topbar-clock")).toBeVisible();

  // a custom dashboard with neither title nor clock has no top bar at all
  await page.goto("/admin/dashboards");
  await page.getByRole("button", { name: /Family dashboard/ }).click();
  await page.getByRole("switch", { name: "Dato og ur øverst" }).click();
  await page.getByRole("button", { name: "Gem opsætning" }).click();
  await page.goto("/");
  await expect(page.locator(".topbar")).toHaveCount(0);
  await expect(page.locator(".tl-person").first()).toBeVisible();
});

test("settings: family name, logout, and the app survives an update", async ({ page }) => {
  await login(page);
  await page.goto("/admin/settings");
  await page.locator("#fam").fill("Holm");
  await page.getByRole("button", { name: "Gem" }).first().click();
  await expect(page.locator(".topbar-name")).toHaveText("Holm");
  await page.getByRole("button", { name: "Log ud" }).last().click();
  await expect(page.getByRole("heading", { name: "Log ind på administrationen" })).toBeVisible();
  // an old page asking for a script that is gone must not look like a page of HTML
  const res = await page.request.get("/assets/Gone-12345.js");
  expect(res.status()).toBe(404);
});


test("recurring events: a series is created, found next week, and deleted as a whole", async ({ page }) => {
  await login(page);
  await page.goto("/admin/weekplan");
  await page.getByRole("button", { name: "+ Nyt event" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Hvad sker der?").fill("E2E fodbold");
  await sheet.getByLabel("Fra").fill("16:30");
  await sheet.getByRole("button", { name: "Hver uge" }).click();
  await expect(sheet.getByLabel("Til og med")).not.toHaveValue("");
  await sheet.getByRole("button", { name: "Gem", exact: true }).click();
  const next = new Date();
  next.setDate(next.getDate() + 7);
  await page.goto(`/admin/weekplan?view=week&date=${iso(next)}`);
  await expect(page.getByRole("button", { name: /E2E fodbold/ })).toBeVisible();
  await page.getByRole("button", { name: /E2E fodbold/ }).first().click();
  await page.getByRole("button", { name: "Slet", exact: true }).click();
  await page.getByRole("button", { name: "Hele serien" }).click();
  await expect(page.getByRole("button", { name: /E2E fodbold/ })).toHaveCount(0);
  await page.goto("/admin/weekplan?view=week");
  await expect(page.getByRole("button", { name: /E2E fodbold/ })).toHaveCount(0);
});

test("quick add fills the form, and several people can share an event", async ({ page }) => {
  await login(page);
  await page.goto("/admin/members");
  for (const name of ["Quinn", "Robin"]) {
    await page.getByRole("button", { name: "+ Tilføj person" }).click();
    await page.getByLabel("Navn").fill(name);
    await page.getByRole("button", { name: "Gem" }).click();
    await expect(page.getByRole("button", { name })).toBeVisible();
  }
  await page.goto("/admin/weekplan");
  await page.getByRole("button", { name: "+ Nyt event" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Skriv det hele i ét felt").fill("E2E sport i dag 17:00-18:00 Quinn og Robin");
  await sheet.getByLabel("Skriv det hele i ét felt").press("Enter");
  await expect(sheet.getByLabel("Hvad sker der?")).toHaveValue("E2E sport");
  await expect(sheet.getByLabel("Fra")).toHaveValue("17:00");
  await expect(sheet.getByRole("button", { name: "Quinn" })).toHaveAttribute("aria-pressed", "true");
  await expect(sheet.getByRole("button", { name: "Robin" })).toHaveAttribute("aria-pressed", "true");
  await sheet.getByRole("button", { name: "Gem", exact: true }).click();
  // it shows for both people
  await expect(page.locator(".tl-event", { hasText: "E2E sport" })).toHaveCount(2);
  await page.locator(".bubbles").getByRole("button", { name: "Robin", exact: true }).click();
  await expect(page.locator(".tl-event", { hasText: "E2E sport" })).toHaveCount(1);
});

test("chores and stars, birthdays, countdown and board show on the dashboard", async ({ page, request }) => {
  await login(page);
  await page.goto("/admin/members");
  await page.getByRole("button", { name: "+ Tilføj person" }).click();
  await page.getByLabel("Navn").fill("Kiddo");
  await page.getByRole("button", { name: "Gem" }).click();
  await expect(page.getByRole("button", { name: "Kiddo" })).toBeVisible();

  await page.goto("/admin/chores");
  await page.getByRole("button", { name: "+ Ny opgave" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Hvad skal gøres?").fill("E2E tænder");
  await sheet.getByRole("button", { name: "Kiddo" }).click();
  await sheet.getByRole("button", { name: "2 ★" }).click();
  await sheet.getByRole("button", { name: "Gem", exact: true }).click();
  await page.getByRole("checkbox", { name: "E2E tænder" }).click();
  const card = page.locator(".chore-card", { hasText: "Kiddo" });
  await expect(card.locator(".stars-badge")).toContainText("2");
  await card.getByRole("button", { name: "+ Sæt en belønning" }).click();
  await page.getByLabel("Hvad er belønningen?").fill("Is");
  await page.getByRole("button", { name: "Gem", exact: true }).click();
  await expect(card.getByRole("button", { name: "Giv belønningen" })).toBeVisible();

  await page.goto("/admin/occasions");
  await page.getByLabel("Fx Mias fødselsdag").fill("E2E fødselsdag");
  const soon = new Date();
  soon.setDate(soon.getDate() + 5);
  await page.locator("#oc-date").fill(`${soon.getFullYear() - 8}-${String(soon.getMonth() + 1).padStart(2, "0")}-${String(soon.getDate()).padStart(2, "0")}`);
  await page.getByRole("button", { name: "Tilføj" }).first().click();
  await expect(page.getByText("fylder 8")).toBeVisible();
  await page.getByLabel("Fx Sommerferie").fill("E2E ferie");
  const hol = new Date();
  hol.setDate(hol.getDate() + 20);
  await page.locator("#cd-date").fill(iso(hol));
  await page.getByRole("button", { name: "Tilføj" }).last().click();
  await expect(page.getByText("20 dage tilbage")).toBeVisible();

  await page.goto("/admin/board");
  await page.getByLabel("Besked", { exact: true }).fill("E2E husk gummistøvler");
  await page.getByRole("button", { name: "Hæng op" }).click();
  await expect(page.getByText("E2E husk gummistøvler")).toBeVisible();

  // put the new widgets on a dashboard (touch on, so a child can tick)
  const main = await (await request.get("/api/dashboard/dashboards/main")).json();
  const kinds = ["chores", "stars", "birthdays", "countdown", "message", "weather"];
  await api(request, "post", "/api/dashboard/dashboards", {
    slug: "kids", name: "Kids", device: "screen", orientation: "landscape", touch: true,
    widgets: kinds.map((k, i) => ({ id: `w${i}`, type: k, order: i, size: "medium", settings: {} })), slideshow: main.slideshow,
  });
  await page.goto("/kids");
  await expect(page.getByText("E2E tænder")).toBeVisible();
  await expect(page.locator(".star-row")).toContainText("Kiddo");
  await expect(page.getByText("E2E fødselsdag")).toBeVisible();
  await expect(page.getByText("E2E ferie")).toBeVisible();
  await expect(page.getByText("E2E husk gummistøvler")).toBeVisible();
  await expect(page.getByText("Vælg et sted under Indstillinger.")).toBeVisible();
  await page.getByRole("checkbox", { name: "E2E tænder" }).click();     // a child unticks, no code
  await expect(page.getByRole("checkbox", { name: "E2E tænder" })).toHaveAttribute("aria-checked", "false");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/kids-board.png`, fullPage: true });
});

test("settings: calendar feed, share link, backup, weather place; installable app", async ({ page }) => {
  await login(page);
  await page.goto("/admin/settings");
  await expect(page.locator('input[aria-label="Kalender i telefonen"]')).toHaveValue(/\/api\/weekplan\/calendar\.ics$/);
  const feed = await page.request.get("/api/weekplan/calendar.ics");
  expect(feed.status()).toBe(200);
  expect(await feed.text()).toContain("BEGIN:VCALENDAR");
  await page.locator("#weather-place").selectOption("Aarhus");
  await expect(page.locator("#weather-place")).toHaveValue("Aarhus");

  await page.getByLabel("Fx Babysitter").fill("E2E babysitter");
  await page.getByRole("button", { name: "Lav link" }).click();
  const link = await page.locator('input[aria-label="Linket er klar. Kopiér det nu. Det vises ikke igen."]').inputValue();
  expect(link).toMatch(/\/share\//);
  const other = await page.context().newPage();
  await other.goto(link);
  await expect(other.getByRole("heading", { name: "E2E babysitter" })).toBeVisible();
  await other.close();

  const backup = await page.request.get("/api/backup");
  expect(backup.status()).toBe(200);
  expect(backup.headers()["content-type"]).toBe("application/zip");

  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  expect(manifest.headers()["content-type"]).toContain("manifest+json");
  expect((await page.request.get("/sw.js")).status()).toBe(200);
});

test("night mode: the screen goes dark and a tap wakes it", async ({ page, request }) => {
  const main = await (await request.get("/api/dashboard/dashboards/main")).json();
  await api(request, "post", "/api/dashboard/dashboards", {
    slug: "natten", name: "Natten", device: "screen", orientation: "landscape", widgets: main.widgets,
    slideshow: main.slideshow, night_start: 0, night_end: 23,
  });
  const hour = new Date().getHours();
  await page.goto("/natten");
  if (hour < 23) {
    await expect(page.locator(".night")).toBeVisible();
    await page.locator(".night").click();
    await expect(page.locator(".night")).toHaveCount(0);
  }
});
