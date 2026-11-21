# CLAUDE.md – Nexmio Family

Nexmio Family (family.nexmio.com) is an app of the Nexmio brand. It is the **green** product in the Nexmio family. During planning the app was called "Familie-app"; that name is only a working name. This repo holds the app and its website at family.nexmio.com. The person who owns it does not write code: every change is made by Claude.

Version 1.7 · 19 Nov 2026 · Owner: Jesper · Written in English (see rule 1 in section 2).
This file is the single basis for building the app: first the PoC (phases 0-5), then the dashboard (phase 6). Phase 7 (Raspberry Pi image and public release) is only a sketch.

**Changes in 1.7 (19 Nov 2026):** everything from the UX review was built: recurring events, several people on one event, quick add, undo and a message after every change, swipe on the phone, a meal plan with tap-a-day, favorites, ingredients, copy last week and fill with favorites, a shopping list that is filled from the meal plan, a calendar feed (.ics), to-do tasks with due date and repeat, import by pasting, chores and stars with rewards, birthdays and countdowns, a message board, weather, night mode, share links, backup, installable app, and the Raspberry Pi guide. See decisions 52-59.

**Changes in 1.6 (18 Nov 2026):** the editor draws the chosen device around the preview (phone, tablet, TV; not part of the dashboard) at its real size; a phone shows one widget per row; the settings of a widget are behind a cogwheel; the photo frame overlays are also on the photo widget; date and clock at the top can be switched off (`show_clock`), and a dashboard with no title and no clock has no top bar; in Danish it is called a dashboard everywhere. See decision 51.

**Changes in 1.5 (18 Nov 2026):** the admin has a login (the family code once, then free access with a login cookie); there is exactly one default dashboard on `/` and no dashboard can be made the root one; a task can be ticked right on a dashboard; the dashboard title can be the family name, an own text or none, per dashboard; the dashboard editor is a live preview where widgets are added by drag or tap, and changed right on the widget; no settings button on custom dashboards; a stale page after an update reloads itself. See decisions 46-50.

**Changes in 1.4 (18 Nov 2026):** the app was rebuilt from the new design (Claude design canvas): a light, friendly look with a soft wallpaper (four to choose from) and white cards; a phone layout with person bubbles, colour cards, a round add button, a bottom sheet for new events and a pill menu; a to-do list; photos with albums and a photo series (tile, mosaic or full-screen photo frame; fade, slide or zoom; chosen interval and albums; clock, plan and dinner on top); per-screen settings: start view (day, week, photos), touch on or off, go back to the start view after a time, and the photo frame after a time without touch. See decisions 41-45.

**Changes in 1.3 (18 Nov 2026):** the whole PoC was built in one go from this file (see `docs/status.md`). Family members with their own colours, the calendar in three views (week, month, by person), several dashboards (the default on `/`, others on `/<name>`), the admin on `/admin`, and an own bright look inspired by Cozyla instead of the green brand look. Budget is left out of the PoC. See decisions 34-39 and section 11.0.

**Changes in 1.2:** everything in code is English (module ids, API paths, import fields); only the frontend is translated (Danish and English); a simpler, standard modular structure instead of fully independent modules; the Nexmio brand is used in the UI from the start; the import template follows the user's language. See decisions 29-33.

---

## 1. Read first

- `brand/APP-SITE.md`: the standard for the app's website, and how to create the first version (`brand/templates/app-site/init_site.py`).
- `brand/LAYOUT.md`: the layout every Nexmio site and app follows.
- `brand/preview/site/family.html`: a working reference page in the green colours.
- `project.md` (if present): private handover notes from the Nexmio control repo. Never commit it to the public repo. It is listed in `.gitignore`.

---

## 2. Rules for Claude Code

**Repo and brand rules (apply to everything)**
1. Everything committed to git is written in English: docs, comments, commit messages, code identifiers, module ids, API paths and fields, import format, test names. The owner is answered in Danish. The only Danish content in git is product content: the Danish locale file of the UI and the Danish import template (section 6.5).
2. `brand/` is a generated copy of the shared brand kit. **Do not edit files in `brand/`.** Brand changes are made in the Nexmio control repo and exported again.
3. The website lives in `site/`. It is plain static HTML, CSS and JavaScript and follows `brand/APP-SITE.md`. The shared files (`site.css`, `site.js`, `brand.css`, `thread.css`, `lightbox.*`) are kept as the template made them.
4. The logo is the N mark image plus the text "exmio" and a small "Family" tag in green. Never bake the product name into an image.
5. Write only what is true today. Do not describe features that do not exist yet (in the website, README or docs for users). Planned features belong only in this file.
6. This is a standalone public repo. Do not add secrets. Do not reference the private control repo in committed files. Do not commit real family data: no real names, real Aula plans, real budget data or screenshots of them. Use invented data in tests, fixtures and docs.
7. **Commit and push only when the owner asks.** Settings of the GitHub repository (Pages, secrets) are the owner's: say what to change and ask first.

**Working rules**
8. Read the whole file before you start.
9. Take the tasks (T-numbers in section 11) one at a time, in order. Do not start a task before its dependencies are done.
10. A task is done when all acceptance criteria are met and `make test` is green. Write the result in `docs/status.md` (task, status, date, note).
11. Build only what the task describes. Everything under "Not included" must not be built. If something is missing, write it in `docs/suggestions.md`.
12. Follow the structure and module rules in section 6.
13. Do not guess. If something is unclear or contradictory, ask Jesper.
14. Assumptions A1-A12 (section 4) apply by default. Build to the default value and write "Built on assumption Ax" in `docs/status.md`.
15. Commit messages start with the task number, e.g. `T2.3: create, edit and delete event`. Prepare the message when a task is done, but only commit when the owner asks (rule 7). Never include codes or secrets in git, logs or tests. The test code used in tests is `test-code-1234`.
16. If a decision changes, update `docs/decision-log.md` (until that file exists, section 14 of this file) and say so clearly in `docs/status.md`.
17. Write to Jesper in Danish, in short bullet points (he is dyslexic). Start with a short summary.
18. No UI text is written directly in components. Every text goes in the locale files (da and en) from the first line of UI code.

---

## 3. Purpose and success criterion

**Purpose:** A web app that gives a family an overview of this week and the coming weeks. The interface is available in Danish and English, and each user picks the language. One main app joins separate modules: Calendar (`weekplan`, Danish "Ugeplan"), Meal plan (`mealplan`, Danish "Madplan") and Dashboards (`dashboard`), plus the family members (core). Dashboards are shown on a TV, tablet or phone. Budget is not part of the PoC (it may become its own app).

**Key feature:** AI import. The app hands out an import template in the user's chosen language. The template explains the task to an external AI (for example Claude) and fixes the file format. The user gives the AI the template and, for example, the school's week plan from Aula, gets an import file back and uploads it in the app.

**The PoC has succeeded when** a real week plan from Aula ends up correctly in the calendar via template → external AI → upload → approval.

**Users:** Adults in the family use the app. Children can look. The first user is Jesper's own family. The app is only reachable on the local network. A public release is planned for later (phase 7) and is not part of the PoC.

---

## 4. Assumptions (not confirmed by Jesper)

| No | Assumption (default value) | Affects |
|---|---|---|
| A1 | Budget: the code is required when the module is opened (kept only in memory while the module is open) and again at every press of Save | T4.3 |
| A2 | EnvelopeQ is moved over without new features, and its data model and JSON storage are kept, unless T4.1 shows a need for something else | T4.1-T4.4 |
| A3 | Budget only needs to work on a computer in the PoC | T4.3 |
| A4 | Meal plan has one dish per day | T3.1, T3.2 |
| A5 | A duplicate is the same title and date (case and spaces at the ends ignored), also for manual creation | T2.1, T2.3, T2.5 |
| A6 | `shared/` (backend and frontend) may contain pure helpers (dates, week calculation), display components, the API client, i18n and the code dialog, but no business logic that belongs to one module | T0.2, T1.3 |
| A7 | The code is sent unencrypted (HTTP) on the local network in the PoC | T1.2 |
| A8 | Time zone Europe/Copenhagen, week starts Monday, week numbers by ISO 8601 | All |
| A9 | The code is at least 4 characters | T1.2, T1.3 |
| A10 | The app listens on port 8080 | T0.1 |
| A11 | The UI language is chosen by the user and remembered in the browser (`localStorage` key `language`, not a secret). First visit: the browser language if it is `da` or `en`, otherwise `en`. Tests pin the language to `da` unless the test is about language | T0.3 |
| A12 | The import template exists in `da` and `en`. The JSON field names and category values in the import file are always English, whatever the template language | T2.4 |

---

## 5. Scope

**In the PoC (phases 0-5)**
- Admin on `/admin` with module navigation without page reloads, code check and code change
- UI in Danish and English with a language switch (Settings)
- Family members, each with a colour (core)
- Calendar: week, month and by-person views, filter per person, create/edit/delete event, AI import with preview and duplicate check
- Meal plan: weekly plan with dishes, reuse of earlier dishes
- Dashboards: several, each with a device and an orientation. The default is on `/`, the others on `/<name>`. Widgets: day by person (timeline), week calendar, meal boxes, clock

**Left out of the PoC**
- Budget (moved from EnvelopeQ): postponed, maybe its own app

**Waiting (not included now)**
- Pi image and public release (phase 7)
- Shopping list and ordering via HandleMCP (unofficial tool)
- Import in Meal plan and Budget
- Access from outside the home, login with persons, more languages than da and en
- More dashboards, drag and drop, month view
- The website `site/` (decided: after the product is more finished, see section 6.6)

---

## 6. Architecture

The app is a **modular monolith**: one backend, one frontend, one database, one container. The code is split by **feature (module)**, which is the usual standard for FastAPI and React projects ("package by feature", as in the FastAPI project-structure guides and "Bulletproof React"). Each module keeps its own router, schemas, service and tables together, and the main app joins them.

### 6.1 Modules and the few hard rules
- The main app (`core` in the backend, `shell` in the frontend) owns: the module list, navigation, code check, code change, database setup, i18n and language switch.
- Each module owns its own code and its own tables. Dependencies go one way: `shared` ← modules ← `core`/`shell`.
- **Hard rules (enforced by tests, section 6.4):**
  1. A module never imports code from another module. Shared helpers go in `shared/`.
  2. A module never reads or writes another module's tables (no joins or foreign keys across modules).
  3. Budget data is never read by any other module, and the dashboard may only call the Week plan, Meal plan and Dashboard APIs.
- Reuse is allowed and wanted through `shared/` (for example the week calculation and a week grid used by both the Week plan and the Dashboard). Do not copy code between modules.
- A module is not designed to be lifted out as its own app. That goal was dropped (decision 30).

### 6.2 Module registration (backend)
Each module lives in `backend/app/modules/<id>/` and exports in `__init__.py`:
`MODULE = ModuleInfo(id, icon, requires_code_to_view, router)`.
`core/registry.py` holds one explicit list of the modules (`MODULES = [weekplan.MODULE, mealplan.MODULE, budget.MODULE, dashboard.MODULE]`) and mounts each router under `/api/<id>`. The list order is the menu order. A new module = a new folder + one line in the list. The registry builds from a list, so tests can pass a test list.

### 6.3 Folder structure
```
nexmio-family/
  CLAUDE.md
  README.md
  Makefile
  Dockerfile
  docker-compose.yml
  .gitignore                (data/, node_modules/, .venv/, project.md)
  brand/                    (generated; do not edit)
  site/                     (website, later; see 6.6)
  project.md                (private; not in git)
  data/                     (volume; not in git)
    app.db                  (SQLite: settings, members, events, dishes, meal days, dashboards)
    _archive/               (backup archives)
  docs/
    status.md  decision-log.md  suggestions.md
    budget-analysis.md  budget-function-check.md  poc-report.md
  backend/
    pyproject.toml
    app/
      main.py
      cli.py
      migrations/           (0001_settings, 0002_members, 0003_events, 0004_meals, 0005_dashboards)
      core/        (registry.py, access_code.py, members.py, db.py, migrate.py, config.py)
      shared/      (dates.py, …)
      modules/
        weekplan/  (__init__.py, router.py, schemas.py, service.py, importer.py,
                    templates/import_template.da.md, import_template.en.md)
        mealplan/  (…)
        budget/    (…)
        dashboard/ (…)
    tests/
  frontend/
    package.json
    src/
      shell/       (App, menu, modules.ts, routing, language switch)
      shared/      (access-code/, api/, ui/, dates/, i18n/)
      locales/     (da.ts, en.ts: shared texts)
      modules/
        weekplan/  (manifest.ts, …, locales/da.ts, locales/en.ts)
        mealplan/ budget/ dashboard/
    tests/         (unit, e2e, fixtures)
```

### 6.4 Rules enforced by tests
- Backend: no file in `modules/<x>/` imports `app.modules.<y>` where y ≠ x.
- Frontend: no file in `src/modules/<x>/` imports from `src/modules/<y>/` (ESLint).
- The dashboard's API client may only call `/api/weekplan/`, `/api/mealplan/` and `/api/dashboard/` (never Budget).
- i18n: the `da` and `en` locale files have exactly the same keys. ESLint (`react/jsx-no-literals`) blocks text written directly in components.
- Nothing in `brand/` is changed by the build or by tests (check with `git diff --exit-code brand/` in `make test`).
- Colours in the UI come from CSS variables in `styles.css`, not from hex values written in components (a test).

### 6.5 Naming and language
- **Everything in code is English:** module ids and API paths (`weekplan`, `mealplan`, `budget`, `dashboard`), fields, error codes, table names, CLI commands, file names, import fields and category values.
- **Only the frontend is translated:** Danish (`da`) and English (`en`) with `i18next` + `react-i18next`. Texts live in locale files: shared texts in `src/locales/`, module texts in `src/modules/<id>/locales/`. The API returns machine-readable codes and the frontend turns them into texts.
- **Danish content in git** (allowed because it is product content): `da` locale files and the Danish import template. Nothing else.
- Texts shown in quotes in section 11 (for example "Nyt event") are the **Danish** texts. Claude writes the matching English texts. Tests run with the language pinned to `da` (A11).
- Date format in the UI: `da` `17. nov. 2026`, `en` `17 Nov 2026`. Time: `08:00` in both.

### 6.6 Website and brand
- **The app UI has its own bright, friendly look** (decision 35, replaces decision 32), inspired by family wall calendars such as Cozyla: soft cards, large type, one colour per family member. It only uses the Nexmio N mark and the logo text from `brand/` (rule 4). The green brand colours are used on the website, not in the app.
- The website at family.nexmio.com is in `site/`. It is **not made now**: it waits until the product is more finished (decision 33). When it is made, it is created with `brand/templates/app-site/init_site.py` as `brand/APP-SITE.md` describes, and it follows rules 2-7 in section 2.
- `site/` is a separate, public marketing site (static HTML). It is not the app. The app runs locally in the family's home.
- The site describes only what exists today (rule 5).

---

## 7. Technology choices (recommendations – Jesper can change them before the start)

| Area | Choice | Pros | Cons / rejected |
|---|---|---|---|
| Backend | Python + FastAPI + Pydantic | Same as EnvelopeQ. Automatic validation. Easy to test | Needs Python in the container |
| Database | SQLite, one file `data/app.db`, `sqlite3` + numbered SQL migrations | No database server. One file is easy to back up. Simple | One writer at a time (fine for a family). Rejected: PostgreSQL (extra service), one file per module (more setup, little gain), JSON everywhere (no queries/transactions). Budget keeps its JSON storage (A2) |
| Frontend | React + TypeScript + Vite | Same as EnvelopeQ. Widely used | More setup than plain HTML |
| Routing and data | react-router + TanStack Query | Navigation without page reloads. Built-in automatic refetching (polling) for the dashboard | Two extra libraries |
| Languages | i18next + react-i18next | The common standard for React. Supports plurals and dates | Extra libraries |
| Styling | Tailwind CSS with the brand tokens from `brand/` | Fast and consistent | Many classes in markup. Alternative: CSS Modules |
| Dates | date-fns (`da` and `en` locales) | ISO weeks and Monday as first day | Extra library |
| Calendar UI | Own simple week component in `shared/ui` | Small and full control. Used by Week plan and Dashboard | Must be built. Rejected: FullCalendar (heavy) |
| Code hash | argon2id (`argon2-cffi`) | Recommended standard for passwords | Extra library |
| Import format | JSON, validated by a Pydantic schema | Strict and easy to validate. AIs fill it in reliably | Less readable than YAML (solved by the preview) |
| Tests | pytest, Vitest, Playwright | Common standard tools | Playwright needs a browser download |
| Hosting | Docker Compose, one container, port 8080 (A10) | Same setup on every machine. Compatible with Podman | Podman/SELinux needs `:Z` on the volume |

Versions: use the latest stable (Python 3.12+, Node LTS) and pin them in `pyproject.toml`/`package-lock.json`.

---

## 8. Code and security

**Principle:** One shared code for the whole family. No users, no sessions. The code is checked on the server at every protected call.

- **Storage:** The code is stored as an argon2id hash in `data/app.db`, table `settings(key, value)`, key `code_hash`.
- **First code and forgotten code:** Set or reset only on the server: `docker compose exec app python -m app.cli set-code` (two entries, min. 4 characters, A9). `reset-code` is the same command and does not need the old code. No reset through the web.
- **Transport:** Header `X-Family-Code` on every protected call (A7: no encryption in the PoC).
- **What needs the code:**
  - All methods except GET/HEAD/OPTIONS always need the code.
  - GET needs the code only if the module's `requires_code_to_view` is `true` (only Budget).
  - Core applies the check automatically. Modules must not remember to do it.
- **Errors:** Not set → 503 `{"error":"code_not_set"}`. Missing/wrong → 401 `{"error":"wrong_code"}`. Too many attempts → 429 `{"error":"too_many_attempts"}` with `Retry-After`.
- **Rate limiting:** After 5 wrong attempts within 60 seconds from the same IP, all calls (also with the right code) are rejected for 300 seconds. The counter is in memory and is reset on restart.
- **Client:** The code is never stored (not in localStorage, sessionStorage, cookie or global state). It is used only for the one action.
- **Logging:** The code is never logged.
- **One action:** One press of Save, Delete or Import is one action and asks for the code once.
- **Dashboard:** Must never show Budget (section 6.4).

---

## 9. API and data models

All dates are `YYYY-MM-DD` (ISO), times `HH:MM`. Errors return JSON `{"error": "<code>", "details": …}`. All field names and codes are English.

### 9.1 Core
| Method and path | Code? | Description |
|---|---|---|
| `GET /api/health` | No | `{"status":"ok"}` |
| `GET /api/modules` | No | List in menu order: `id`, `icon`, `requires_code_to_view`. Display names come from the locale files |
| `GET /api/family` / `PUT /api/family` | No / Yes | The family name shown in the top bar (`{name}`, at most 40 characters, empty clears it) |
| `GET /api/members` | No | The family: `id`, `name`, `color` |
| `POST /api/members` | Yes | Body `{name, color}`, 201. Names are unique (case ignored) → 409 |
| `PUT /api/members/{id}` / `DELETE /api/members/{id}` | Yes | Delete keeps the person's events (they become "whole family") |
| `GET /api/session` | No | `{logged_in}` |
| `POST /api/session/login` / `POST /api/session/logout` | No | Body `{code}`. Sets or clears the login cookie. Wrong codes count towards the rate limit |
| `POST /api/code/check` | Yes | 204 if the code is right |
| `POST /api/code/change` | Yes (the old one) | Body `{"new": "…"}` → 204 |

### 9.2 Week plan (`weekplan`, table `events` in `data/app.db`)
Table `events`: `id` (integer, auto), `title` (1-120 characters after trim), `date`, `start` (optional), `end` (optional, ≥ start), `member_id` (optional, null = whole family), `category` (`homework`, `plan`, `appointment`, `other`), `notes` (optional, ≤ 1000), `created_at`, `updated_at`.

| Method and path | Code? | Description |
|---|---|---|
| `GET /api/weekplan/events?from=&to=&category=&member=` | No | Range at most 62 days, `from` ≤ `to`. `category` is a comma-separated filter. `member` is a comma-separated list of member ids and/or `none` (whole family). Sort: date, all-day events before events with a start time, start time, id |
| `GET /api/weekplan/events/{id}` | No | One event or 404 |
| `POST /api/weekplan/events` | Yes | 201. Duplicate (A5) → 409 with `duplicates`. With `?allow_duplicate=true` it is created anyway |
| `PUT /api/weekplan/events/{id}` | Yes | 200 or 404 |
| `DELETE /api/weekplan/events/{id}` | Yes | 204 or 404 |
| `GET /api/weekplan/import/template?lang=da\|en` | No | File `weekplan-import-template.<lang>.md` (default `en`) |
| `POST /api/weekplan/import/preview` | No | Validates the file, changes nothing |
| `POST /api/weekplan/import/execute` | Yes | Creates in one transaction (all or nothing) |

### 9.3 Meal plan (`mealplan`, tables `dishes` and `meal_days`)
Table `dishes`: `id`, `name` (unique, case-insensitive), `last_used` (date). Table `meal_days`: `date` (primary key), `dish_id` (required), `note` (optional, ≤ 200).

| Method and path | Code? | Description |
|---|---|---|
| `GET /api/mealplan/weeks/{year}/{week}` | No | 7 days Monday-Sunday: `{date, dish: {id, name}|null, note}` |
| `PUT /api/mealplan/weeks/{year}/{week}` | Yes | Replaces the week atomically. Body `{"days":[{"date","dish","note"}]}`. Empty/`null` dish deletes that day's plan |
| `GET /api/mealplan/days?from=&to=` | No | Only days with a dish, at most 62 days |
| `GET /api/mealplan/dishes?search=` | No | At most 20 dishes, sorted by `last_used` descending |

### 9.4 Budget
Decided by the analysis in T4.1. All paths are under `/api/budget/` and need the code, also GET.

### 9.5 Dashboards (table `dashboards`; the default exists from the first start)
A dashboard has a `slug` (its address), a `name`, a `device` (`phone`, `tablet`, `screen`), an `orientation` (`landscape`, `portrait`), `is_default` and `widgets`. The default dashboard is shown on `/`, every other one on `/<slug>` (for example `/tv`). The slug is 1-30 characters (`a-z`, `0-9`, `-`) and not one of `admin`, `api`, `assets`, `static`, `default`, `favicon`, `_test`. `orientation` `portrait` stacks all widgets full width; `device` `screen` uses a larger base font and hides the mouse cursor.

| Method and path | Code? | Description |
|---|---|---|
| `GET /api/dashboard/dashboards` | No | List with `slug`, `name`, `device`, `orientation`, `is_default`, `widget_count` |
| `GET /api/dashboard/dashboards/default` | No | The default dashboard |
| `GET /api/dashboard/dashboards/{slug}` | No | One dashboard or 404 |
| `POST /api/dashboard/dashboards` | Yes | Create (201). Taken slug → 409. A new dashboard is never the default (`is_default` is not accepted) |
| `PUT /api/dashboard/dashboards/{slug}` | Yes | Replace (also the default dashboard). The default cannot be changed to another |
| `DELETE /api/dashboard/dashboards/{slug}` | Yes | 204. The default cannot be deleted → 409 |
| `GET /api/dashboard/presets` | No | Start templates: `family-hub`, `large-calendar`, `homework-and-meals`, `phone-today` |

Widget types and settings (at most 8 widgets, unique `id`, `size` ∈ `small`/`medium`/`large` = 4/6/12 of 12 columns, `order` is the position):
- `week-calendar`: `categories` (non-empty subset), `weeks` 1-4, `members` (ids; empty = everyone)
- `person-agenda`: the day view by person (a column per person, hours down the side, a red "now" line): `days` 1-7 (one timeline per day), `members`
- `meal-boxes`: `days` 1-14
- `clock`, `todo` (tasks, tickable with touch), `meal-today` (dinner today and tomorrow), `chores` (today's chores per child, tickable with touch), `stars` (stars and the way to the reward), `birthdays` (the next 60 days), `countdown`, `message` (the board) and `weather`: no settings
- `photo-slideshow`: `layout` `tile` or `mosaic`

Title: `title` (own text, at most 40, or null = the family name), `show_title` (false hides it) and `show_clock` (false hides date and clock). With neither, there is no top bar.

Night mode: `night_start` and `night_end` (hours, both or none). The screen is black with a dim clock in that time; a tap wakes it for 5 minutes.

Screen settings (on the dashboard itself): `start_view` (`day`, `week`, `photos`), `touch`, `return_after` (10-3600 s), `idle_photo_after` (0-240 minutes, 0 = never; only with touch) and `slideshow` (`transition` `fade`/`slide`/`zoom`, `interval` 5-600 s, `albums` ids (empty = all), `overlay_clock`, `overlay_plan`, `overlay_meal`).

New APIs: `/api/photos/albums`, `/api/photos/photos` (list, upload with the image as the request body, move, delete, `/{id}/file`) and `/api/todo/items` (list, add, change, delete, `/clear-done`). `GET /api/family` also returns `wallpaper`.

The dashboard reads only `/api/weekplan/`, `/api/mealplan/`, `/api/dashboard/`, `/api/photos/`, `/api/todo/`, `/api/chores/`, `/api/occasions/`, `/api/board/`, `/api/weather`, `/api/members` and `/api/family`, never anything else. The only changes it may make are ticks (to-do and chores).

---

## 10. Import format and import flow (Week plan)

**File:** JSON, UTF-8, at most 1 MB and 500 events. Field names and category values are English in every template language (A12).
```json
{
  "schema_version": 1,
  "events": [
    {
      "title": "Danish: read pages 12-15",
      "date": "2026-11-23",
      "start": null,
      "end": null,
      "person": "Alex",
      "category": "homework",
      "notes": null
    }
  ]
}
```
Rules: `schema_version` must be `1`. No extra fields allowed (`extra="forbid"`). Fields without a value are `null`. Field rules as in section 9.2. Titles and notes are free text in any language. (The names in examples are invented sample data.)

**The import template** (`weekplan-import-template.<lang>.md`) is written in the language the user chose in the app (`da` or `en`; the app asks for the template with `?lang=` set to the current UI language). It contains:
1. The task for the AI in a few words ("Make an import file for a family calendar from the material below").
2. The rules: dates as `YYYY-MM-DD`; if the year is not stated, ask the user for the year before answering; unknown fields are `null`; the category is chosen among `homework`, `plan`, `appointment`, `other`; never invent events; one event per homework/activity; keep titles in the language of the material.
3. The format with field descriptions and the JSON schema (inserted automatically from the model).
4. Two examples (a small one and one with several categories).
5. Ending: "Answer only with JSON, with no explanation and no code block." (in the template's language).

**Flow:** download template → give template + material (for example the Aula week plan) to an external AI → save the answer as `.json` → upload → preview (errors shown per event, and one error blocks the whole file) → one combined duplicate screen (duplicates against existing events and inside the file; default "Skip") → press "Importér" (one action, code) → result.

---
## 11. Build plan

### 11.0 How the plan was changed when the PoC was built (1.3)
The tasks below are the original plan and are kept as the acceptance criteria. Where they conflict with this list, this list wins:
- **Routes:** the admin lives on `/admin` (`/admin/weekplan`, `/admin/mealplan`, `/admin/members`, `/admin/dashboards`, `/admin/settings`). `/` shows the default dashboard and `/<slug>` another one. `/display` and `/dashboard/setup` are gone.
- **Budget (phase 4) is not built.** T4.1-T4.4 wait. The dashboard (phase 6) is built inside the PoC with several dashboards instead of one (T6.1-T6.4 as changed by 9.5). T6.5 (24-hour test on real screens) is still to do by the owner.
- **Members replace the free-text person** on events (`member_id`). The import file still uses a person *name*; unknown names are created as new members at import and are shown in the preview.
- **Look:** T0.4 is replaced by decisions 35 and 40 (an own bright look that follows Cozyla, not the green brand look). The calendar has four views: day (default), week, month, by person.
- **Tests:** ESLint is replaced by Vitest checks of the module rules, the locale files and hard-coded colours/texts (`frontend/tests/architecture.test.ts`). Playwright runs the main flows (`make test-e2e`).
- **Not done yet from the plan:** T0.1 acceptance point 4 and 5 were checked with Podman (see `docs/status.md`); rate-limit state is in memory; HTTPS is not set up.

Every task has: Purpose, Do, Not included, Depends on, Acceptance criteria and Test. Texts in quotes are the Danish UI texts (section 6.5); an English text is written for each.

### Phase 0 – Foundation
**Expected result:** A running skeleton in Docker with test tools, the languages, the brand look and a test that protects the module rules.

### T0.1 Repo, Docker and empty skeleton
- **Purpose:** A running skeleton that all tasks build on.
- **Do:** Create the folder structure (6.3), except `brand/` and `site/`, which are supplied by the owner and must not be created or edited. Backend: FastAPI app with `GET /api/health`. Frontend: Vite + React + TypeScript with one page titled "Nexmio Family". Multi-stage `Dockerfile`: build the frontend, copy the result into the backend image; the backend serves the files and returns `index.html` for all non-`/api` paths. `docker-compose.yml` with one service `app`, port 8080 (A10), volume `./data:/data` and a non-root container user. `.gitignore` (must contain `data/`, `node_modules/`, `.venv/` and `project.md`). A short `README.md` that states only what exists today (how to start the app and run tests). If the host runs SELinux (for example Fedora/Bazzite with Podman), use `:Z` on the volume.
- **Not included:** Login, modules, database, CI server, website content.
- **Depends on:** None.
- **Acceptance criteria:**
  1. `docker compose up --build` starts without errors.
  2. `GET http://localhost:8080/api/health` gives 200 and `{"status":"ok"}`.
  3. `http://localhost:8080/` shows the page with the text "Nexmio Family".
  4. A file created in `/data` in the container exists in `./data` on the host and still exists after `docker compose down` and `up`.
  5. `docker compose exec app id -u` does not give `0`.
  6. `git check-ignore project.md data` lists both.
- **Test:** Run the commands manually. Point 2 also as pytest with `TestClient`.

### T0.2 Test setup and module-rule tests
- **Purpose:** Fixed test commands and automatic protection of the module rules.
- **Do:** `Makefile` with `make test-backend` (pytest + ruff), `make test-frontend` (Vitest + ESLint), `make test-e2e` (Playwright) and `make test` (the first two plus the brand check). Brand check: if `brand/` exists, `git diff --exit-code -- brand/` must pass; if it does not exist, the check is skipped with a message. Backend architecture test that scans `modules/<x>/` with `ast` and fails on an import from another module. Frontend ESLint rule (`no-restricted-imports` or `import/no-restricted-paths`) that forbids imports between `src/modules/<x>` and `src/modules/<y>`. Sample files with deliberate violations in `frontend/tests/fixtures/` and tests that show they are caught. One Playwright smoke test that opens `/` and sees "Nexmio Family".
- **Not included:** CI server, other e2e tests.
- **Depends on:** T0.1.
- **Acceptance criteria:**
  1. `make test` gives exit 0 on the skeleton.
  2. The architecture test's unit test finds a violation in a temporary folder with two modules and accepts a clean folder.
  3. ESLint on the sample file in `fixtures/` gives an error (non-zero exit), while normal `npm run lint` does not hit fixtures.
  4. `make test-e2e` is green.
  5. A change to a file in `brand/` (in a temporary copy of the repo) makes the brand check fail.
- **Test:** Run `make test` and `make test-e2e`.

### T0.3 Languages (Danish and English)
- **Purpose:** All UI texts are translatable from the start.
- **Do:** Set up `i18next` + `react-i18next` in `frontend/src/shared/i18n/`. Locale files `da.ts` and `en.ts` in `src/locales/` (and per module later). A language switch ("Dansk" / "English") in the shell. The choice is stored in `localStorage` key `language` (A11). date-fns locale and date formats follow the language (6.5). Move the title text of the skeleton into the locale files. ESLint `react/jsx-no-literals`. A unit test that compares the keys of `da` and `en`.
- **Not included:** More languages, translating the backend (it returns codes), translating user data.
- **Depends on:** T0.2.
- **Acceptance criteria:**
  1. First visit with browser language `da` shows Danish, `en` shows English, anything else shows English.
  2. The switch changes all visible texts without a page reload, and the choice survives a reload.
  3. A key that exists in only one locale file makes the unit test fail.
  4. A text written directly in a component makes ESLint fail.
  5. `17. nov. 2026` is shown in `da` and `17 Nov 2026` in `en`.
- **Test:** Vitest for 1, 3, 5. ESLint check for 4. Playwright for 2.

### T0.4 Brand look
- **Purpose:** The app looks like a Nexmio product from the start (decision 32).
- **Do:** Read `brand/LAYOUT.md` and the green reference page `brand/preview/site/family.html`. If `brand/` is missing, stop and ask Jesper to export it. Map the brand tokens (colours, fonts) into the Tailwind theme. Build the shell frame (header with the logo by rule 4, menu, content area, language switch) following `LAYOUT.md`. Favicon from the brand kit. No colour values written in components.
- **Not included:** Editing anything in `brand/`, custom illustrations, the website.
- **Depends on:** T0.3.
- **Acceptance criteria:**
  1. The header shows the N mark, the text "exmio" and the small green "Family" tag. The product name is not an image.
  2. The page uses the green brand colours, and a grep test finds no hex colour values in `src/` outside the token mapping.
  3. `git diff --exit-code -- brand/` passes.
  4. The shell is usable at 390 px width.
  5. Jesper has looked at it and said it is acceptable.
- **Test:** Grep test for 2. Playwright screenshot for 1 and 4 (invented data only). Manual review for 5.

### Phase 1 – Main app
**Expected result:** The main app shows the modules Week plan, Meal plan and Budget in a menu, without page reloads, and the code check and code change work.

### T1.1 Module list and navigation
- **Purpose:** Modules are added with one folder and one line, and the user switches module without a page reload.
- **Do:** Backend: `core/registry.py` with the explicit module list (6.2), mounting the routers under `/api/<id>` and delivering `GET /api/modules` (section 9.1). Create empty modules `weekplan`, `mealplan` and `budget`, each with `GET /api/<id>/ping` → `{"module":"<id>"}`. Budget has `requires_code_to_view=True`. Frontend: shell with a menu built from `/api/modules` (names from the locale files), react-router (`/weekplan`, `/mealplan`, `/budget`), each module loaded with `React.lazy` through the list in `src/shell/modules.ts` and its `manifest.ts`. The start page is Week plan. Each module page shows only the module's name. The menu must be usable on mobile (wraps).
- **Not included:** Code check, real content, icons (text only).
- **Depends on:** T0.4.
- **Acceptance criteria:**
  1. `GET /api/modules` returns exactly `weekplan`, `mealplan`, `budget` in that order with the fields `id`, `icon`, `requires_code_to_view` (only budget `true`).
  2. A registry built from a test list that contains a test module mounts that module and lists it, without any change to core code.
  3. Clicking "Madplan" shows the meal plan page, the URL becomes `/mealplan`, and the page does not reload (a marker set on `window` before the click still exists after the click).
  4. Opening `/budget` directly shows the budget page.
  5. `GET /api/weekplan/ping` gives 200.
- **Test:** pytest for 1, 2 and 5. Playwright for 3 and 4.

### T1.2 Code check on the server
- **Purpose:** Protected calls need the shared code, checked on the server.
- **Do:** Section 8 in full: `core/access_code.py` with an argon2id hash in `data/app.db`, migration `0001_settings.sql`, FastAPI dependency `require_code`, applied automatically by the registry by the GET/non-GET rules, rate limiting, `POST /api/code/check` and `POST /api/code/change`, and CLI `python -m app.cli set-code` and `reset-code` (with `--code-from-stdin` for tests). `core/migrate.py` runs the numbered `.sql` files from `backend/app/migrations/` at startup and logs them in the table `schema_migrations`. A test registry with both a GET and a POST endpoint in an ordinary module and in a module with `requires_code_to_view=True`.
- **Not included:** User profiles, sessions, cookies, HTTPS, reset through the web.
- **Depends on:** T1.1.
- **Acceptance criteria:**
  1. With no code set, a call to a protected endpoint gives 503.
  2. After `set-code`: call without header → 401, with wrong code → 401, with right code → 2xx.
  3. GET on an ordinary module's endpoint without header → 200. GET on `/api/budget/ping` without header → 401 and with the right code → 200.
  4. 5 wrong calls within 60 seconds from the same IP → the next call (also with the right code) gives 429 with `Retry-After`.
  5. The hash in `app.db` begins with `$argon2id$`. The plain text of the code does not exist in the database or in log files after the test run (checked with grep).
  6. `reset-code` changes the code, and the old code then gives 401.
  7. `POST /api/code/change` with a wrong old code → 401. A new code shorter than 4 characters → 422.
- **Test:** pytest. The CLI is tested with `subprocess` and `--code-from-stdin`.

### T1.3 Code dialog and "Skift kode" in the frontend
- **Purpose:** The user can give the code for one action and change it.
- **Do:** `frontend/src/shared/access-code/`: the function `requestCode()` opens a dialog with the field "Kode" and returns the code to the caller. The code is stored nowhere. `shared/api/`: `api.withCode(method, path, body)` calls `requestCode`, sends the header `X-Family-Code`, and on 401 shows "Forkert kode" so the user can try again, on 429 "For mange forsøg. Prøv igen om 5 minutter." and on 503 "Koden er ikke sat på serveren." The menu item "Skift kode" with the fields "Gammel kode", "Ny kode", "Gentag ny kode". A test route `/_test/code` with a "Gem" button, only when `VITE_TEST_ROUTES=true`.
- **Not included:** "Remember me", forgotten code through the web.
- **Depends on:** T1.2.
- **Acceptance criteria:**
  1. On `/_test/code`: Gem shows the code dialog. Right code → the action succeeds. Wrong code → error text, and the dialog stays open.
  2. After a successful action the code does not exist in localStorage, sessionStorage or cookies. A new action asks for the code again.
  3. Change code: wrong old code → error. New ≠ repeat new → error in the UI without a server call. Valid → the new code works, the old gives 401.
  4. All texts exist in Danish and English and follow the chosen language.
- **Test:** Vitest for `requestCode` and `api.withCode`. Playwright for 1-3.

### Phase 2 – Week plan and import
**Expected result:** The family can see weeks, create/edit/delete events with the code and import an AI-made file with preview and duplicate check.

### T2.1 Data model and API for Week plan
- **Purpose:** Store and fetch events.
- **Do:** Migration `0002_events.sql` for `events`. Endpoints for events by section 9.2 (not import). Validation with Pydantic by the field rules. Duplicate check by A5.
- **Not included:** Recurring events, several persons per event, reminders, import.
- **Depends on:** T1.2.
- **Acceptance criteria:**
  1. POST with a valid event and code → 201 with `id`. GET on the range returns it.
  2. 422 for each of: empty title, date `2026-13-40`, end before start, unknown category.
  3. POST with the same title and date (ignore case and spaces at the ends) → 409 with `duplicates`. With `?allow_duplicate=true` → 201.
  4. GET with a range over 62 days → 422. `from` after `to` → 422.
  5. Sorting: date, then all-day events, then events by start time, then `id`.
  6. PUT and DELETE without code → 401. PUT/DELETE on an unknown id → 404.
  7. Data exists after a restart of the container.
- **Test:** pytest with a temporary database. Point 7 manually.

### T2.2 Week view (display only)
- **Purpose:** Everyone can see this week and the coming weeks.
- **Do:** The page `/weekplan`. Heading with week number and date range, for example "Uge 47 · 16.-22. nov. 2026". Buttons "Forrige uge", "Denne uge", "Næste uge". From 900 px width show 7 day columns (Monday first), below 900 px a day list. Each event shows title, time, person and a category badge. A click opens a read-only detail view with notes. Today's date is marked. Below the week "Kommende uger" is shown: the next 4 weeks grouped per week, only days with events. Week calculation in `shared/dates` with date-fns (ISO, Monday first). The week grid is built as a shared component in `shared/ui` so the dashboard can reuse it. Weekdays and months follow the chosen language.
- **Not included:** Month view, drag and drop, editing (T2.3), colours per person.
- **Depends on:** T2.1, T1.1.
- **Acceptance criteria:**
  1. With "today" set to 17 Nov 2026 the page shows "Uge 47" and 16.-22. nov. 2026 (in `en`: "Week 47" and 16-22 Nov 2026).
  2. An event on Wednesday is in the Wednesday column. An all-day event comes before events with a time.
  3. "Næste uge" shows week 48 without a page load and fetches events for week 48.
  4. At 390 px width a day list is shown (not 7 columns).
  5. The page opens and shows events without a code dialog.
  6. "Kommende uger" shows only days with events in the next 4 weeks.
  7. Week calculation: 29 Dec 2025 is week 1 of 2026, and 1 Jan 2027 is week 53 of 2026.
- **Test:** Vitest for the week calculation (points 1, 7). Playwright for the rest with a mocked date.

### T2.3 Create, edit and delete event
- **Purpose:** Change the calendar with the code.
- **Do:** On `/weekplan`: the button "Nyt event" opens a form with Titel, Dato, Starttid, Sluttid, Person, Kategori (Lektie, Plan, Aftale, Andet) and Noter. In the detail view: "Ret" and "Slet". "Gem" and "Slet" are each one action and ask for the code. On 409 the text "Der findes allerede '<titel>' den <dato>. Vil du oprette endnu et?" is shown with "Opret alligevel" and "Annuller". "Opret alligevel" calls again with `allow_duplicate=true` and uses the code already entered in the same action. "Slet" first shows "Slet '<titel>'?" and then the code dialog. The form validates by the server's rules.
- **Not included:** Recurring events, drag and drop, undo.
- **Depends on:** T2.2, T1.3.
- **Acceptance criteria:**
  1. Form → Gem → code → the event shows in the right week.
  2. Wrong code → no change and an error text.
  3. Same title and date → the duplicate question. "Annuller" creates nothing. "Opret alligevel" creates without a new code dialog.
  4. Edit: the changed title shows after Gem. Delete: the event disappears after confirmation and code.
  5. The form blocks Gem and shows an error text (in the chosen language) for an empty title or end before start.
  6. With a wrong code neither create, edit nor delete changes anything.
- **Test:** Playwright.

### T2.4 Import schema and template
- **Purpose:** A file that an AI can make and the app can validate.
- **Do:** Pydantic model for the import file (section 10) with `extra="forbid"`. The templates `import_template.da.md` and `import_template.en.md` by section 10 (A12), where the JSON schema is inserted automatically from the model. `GET /api/weekplan/import/template?lang=da|en` with `Content-Disposition: attachment; filename="weekplan-import-template.<lang>.md"`; an unknown or missing `lang` gives `en`. The button "Download importskabelon" on the Week plan page, which asks for the current UI language (the page `/weekplan/import` is created in T2.5; here only the button on the Week plan page).
- **Not included:** Upload and validation (T2.5), import in other modules.
- **Depends on:** T2.1.
- **Acceptance criteria:**
  1. The download gives the file in UTF-8 with the texts `schema_version`, `homework`, `plan`, `appointment`, `other` and at least one example, in both languages.
  2. All JSON examples in both templates (extracted from code blocks) validate without errors against the model.
  3. Each template says that dates are `YYYY-MM-DD`, that the AI must ask for the year if it is not stated, and that unknown fields are `null`. The Danish template is written in Danish and the English one in English.
  4. The model rejects: missing `schema_version`, `schema_version` ≠ 1, over 500 events, event without title, unknown category and extra fields.
  5. The button downloads the template that matches the UI language.
- **Test:** pytest for 1-4. Playwright for 5.

### T2.5 Import flow
- **Purpose:** From file to events with checks.
- **Do:** The page `/weekplan/import`: step 1 a link to the template. Step 2 upload of `.json` (at most 1 MB). Step 3 preview (`POST …/import/preview`, no code, changes nothing) in a table with date, title, time, person and category. Errors are shown per event ("Event 3: dato mangler"), and one error blocks the whole file. Step 4 one combined duplicate screen for duplicates against existing events and inside the file with the choice "Spring over" (default) or "Opret alligevel" per duplicate and the buttons "Alle: spring over" and "Alle: opret". Step 5 the button "Importér N events" is one action: code → `POST …/import/execute`, which creates in one transaction. Result: "N oprettet, M sprunget over" with a link to the first week in the file. The server validates everything again at `execute`. The server sends error codes and field paths, and the frontend writes the texts.
- **Not included:** Import in Meal plan/Budget, direct AI calls, connection to Aula, undo of an import.
- **Depends on:** T2.3, T2.4.
- **Acceptance criteria:**
  1. A valid file with 5 events → preview with 5 rows. No code dialog. The database is unchanged.
  2. A file with 1 invalid event out of 5 → the error is shown with event number and field, and "Importér" is disabled.
  3. A file that is not valid JSON → an error text ("Filen kan ikke læses som JSON"), no server error 500.
  4. A file over 1 MB or with over 500 events is rejected with an understandable error text.
  5. A file with 5 events of which 2 are duplicates against existing ones → one duplicate screen with both. Default is "Spring over". After "Importér": "3 oprettet, 2 sprunget over".
  6. Duplicates inside the file itself (same title and date twice) show on the same duplicate screen.
  7. Wrong code → nothing is imported.
  8. A simulated database error in the middle of the import → no events are created (rollback).
  9. End-to-end: template → test file made after the template's example → upload → Importér → the events show in the week view.
- **Test:** pytest for 1-6 and 8 against the API. Playwright for 7 and 9.

### Phase 3 – Meal plan
**Expected result:** The family can see and plan the week's dinners and reuse earlier dishes.

### T3.1 Data model and API for Meal plan
- **Purpose:** Store the week's dishes.
- **Do:** Module `mealplan` with a migration for `dishes` and `meal_days` and endpoints by section 9.3. `PUT /weeks/{year}/{week}` is atomic. Dishes are matched case-insensitively. `last_used` is updated when a dish is saved on a day.
- **Not included:** Ingredients, recipes, pictures, shopping list, several dishes per day (A4), deleting dishes, import.
- **Depends on:** T1.2, T0.2.
- **Acceptance criteria:**
  1. `PUT /api/mealplan/weeks/2026/47` with code and 7 days → 200. `GET` on the same week returns 7 days, Monday 16 Nov to Sunday 22 Nov, where days without a dish have `dish: null`.
  2. A date outside the week in the body → 422.
  3. A new dish is created in `dishes`. The same name in other case reuses the existing dish.
  4. A day with an empty or `null` dish deletes that day's plan. The dish still exists in `dishes`.
  5. `GET /api/mealplan/dishes?search=spag` returns dishes whose name contains the text (case-insensitive), at most 20, by `last_used` descending.
  6. An invalid day in the body → no changes for the whole week.
  7. PUT without code → 401. GET endpoints without code → 200.
  8. `GET /api/mealplan/days?from=&to=` returns only days with a dish and rejects ranges over 62 days with 422.
- **Test:** pytest.

### T3.2 The Meal plan page
- **Purpose:** See and plan the week's food.
- **Do:** The page `/mealplan` with week navigation as in T2.2 (reusing the shared week helpers). Display: 7 rows (Monday-Sunday) with date, dish and note. The button "Ret ugen" opens editing without a code dialog. In editing each day has a field "Ret" with suggestions from `dishes?search=` (up to 8) and a field "Note". "Gem uge" is one action and asks for the code. "Annuller" discards the changes without a server call. Leaving the page with unsaved changes shows a warning.
- **Not included:** Drag and drop, copying whole weeks, shopping list.
- **Depends on:** T3.1, T1.3.
- **Acceptance criteria:**
  1. Week 47 shows 7 days. Dishes are shown as text.
  2. "Ret ugen" makes the fields editable. The text "Spag" shows the suggestion "Spaghetti bolognese", and choosing fills the field.
  3. "Gem uge" → code dialog. The right code shows the updated week. A wrong code leaves the editing open with the changes intact and shows an error.
  4. "Annuller" restores the view without network calls.
  5. Navigating away with unsaved changes shows a warning.
  6. The page can be viewed without a code. The code is first asked at "Gem uge".
  7. A dish saved in week 47 is suggested when editing week 48.
- **Test:** Playwright and Vitest.

---
### Phase 4 – Budget
**Expected result:** Budget from EnvelopeQ runs as a module behind the code, with data outside the container and backup.

### T4.1 Analysis of EnvelopeQ (stop point)
- **Purpose:** Know exactly what must be moved before building.
- **Do:** Read EnvelopeQ (on Jesper's machine at `/home/jesper/Development/EnvelopeQ`; on an immutable Linux machine it may be mounted as `/var/home/jesper/Development/EnvelopeQ`). Write `docs/budget-analysis.md` with: file structure, API endpoints (method, path, purpose), data model and JSON file format, how data is stored today and where, dependencies and versions, how it is built and run, which tests exist, which screens edit directly in tables, a proposal for the port (list of changes, including English names for paths and fields if EnvelopeQ uses other names), a split into tasks and a list "Questions for Jesper". Use only invented example values in the report (the repo is public). **Stop and show the report to Jesper. Do not start T4.2 until he has approved it.**
- **Not included:** Changes in EnvelopeQ and the port itself.
- **Depends on:** Phase 3.
- **Acceptance criteria:**
  1. `docs/budget-analysis.md` exists and covers all points above.
  2. Every route in EnvelopeQ's backend is in the report (number of routes in the code = number in the report).
  3. The EnvelopeQ folder is unchanged (`git status` is clean if it is a git repo).
  4. The report has a section "Questions for Jesper" (may be empty with the text "None").
  5. The report contains no real budget amounts or names.
- **Test:** Automatic counting of routes. Jesper reviews the report.

### T4.2 Port of the backend
- **Purpose:** Budget's logic as a code-protected module.
- **Do:** `backend/app/modules/budget/` with EnvelopeQ's backend logic, only with the changes that are necessary (A2) and with English names in code and API. Data in `data/budget/`. All writes are atomic (write to a temporary file and `os.replace`), and before every write a copy is made in `data/budget/backups/budget-YYYYMMDD-HHMMSS.json`; only the 30 newest are kept. `requires_code_to_view=True`.
- **Not included:** New budget features, move to SQLite, import of data (T4.4).
- **Depends on:** T4.1 (approved), T1.2.
- **Acceptance criteria:**
  1. All endpoints from the report exist under `/api/budget/` with the same behaviour as in EnvelopeQ (names as agreed in the report), covered by tests (EnvelopeQ's own tests copied in, or new tests for each endpoint) that use invented data.
  2. Every call to `/api/budget/*` without a valid code, also GET, gives 401.
  3. After a write a new backup file exists. After 31 writes at most 30 exist.
  4. An interrupted write (simulated failure between the temporary file and `os.replace`) leaves the old data file unchanged.
  5. The architecture test is green (no import from other modules).
  6. Data exists after a restart of the container.
- **Test:** pytest.

### T4.3 Port of the frontend
- **Purpose:** Budget's screens in the main app, behind the code.
- **Do:** `frontend/src/modules/budget/` from EnvelopeQ's React code. When `/budget` is opened only the code dialog is shown. The code is kept only in the module's memory while the module is open, and forgotten on navigation to another module (A1). Editing in tables is kept locally. The button "Gem" is one action, asks for the code and sends all changes together. "Fortryd ændringer" restores the shown values. Unsaved changes give a warning on navigation. All texts in the locale files (da and en).
- **Not included:** Mobile adaptation (A3), new features.
- **Depends on:** T4.2, T1.3.
- **Acceptance criteria:**
  1. `/budget` without code shows only the code dialog. The network log and DOM contain no budget data before the correct code (no 200 responses from `/api/budget/*`).
  2. Wrong code → no data. Right code → the budget is shown.
  3. Switching to Week plan and back → the code dialog is shown again.
  4. Changing an amount gives no network call. "Gem" → code dialog → one combined call. After a reload the change is shown.
  5. "Fortryd ændringer" restores the values.
  6. All functions in `docs/budget-analysis.md` are available. Claude Code fills in `docs/budget-function-check.md` (function, works yes/no), and Jesper reviews it.
- **Test:** Playwright and manual review.

### T4.4 Data migration and backup
- **Purpose:** Jesper's existing data in Budget and a simple backup.
- **Do:** CLI `python -m app.cli budget-import-envelopeq <path>` that validates an EnvelopeQ data file and copies it to `data/budget/` (after a backup of existing data, and only if the format is recognised). CLI `python -m app.cli backup` that makes a `.tar.gz` in `data/_archive/` with a consistent copy of `app.db` (made with SQLite's backup API, safe while the app runs) and the folder `budget/` (without `backups/`). A section "Backup" in `README.md`: copy `./data` while the container is stopped. The real data stays in `data/` and is never committed.
- **Not included:** Automatic scheduled backup, cloud backup.
- **Depends on:** T4.2.
- **Acceptance criteria:**
  1. After importing a copy of Jesper's real data, three figures (yearly budget, one category sum, one quarter) are identical to EnvelopeQ's own. Jesper confirms them.
  2. An invalid file gives an error, and `data/budget/` is unchanged.
  3. `backup` makes an archive file that can be unpacked and contains `app.db` and the folder `budget`. The unpacked `app.db` opens and holds the same events.
  4. EnvelopeQ's original data is unchanged.
  5. `git status` shows no file from `data/`.
- **Test:** pytest for 2-3. Manual check for 1, 4 and 5.

### Phase 5 – End of the PoC
**Expected result:** The PoC has been tried with a real week plan, and there is a report and an approval.

### T5.1 PoC test and report
- **Purpose:** Prove that the main idea works in practice.
- **Do:** Jesper fetches a real week plan from Aula himself (copy, screenshot or PDF), gives it and the template (in the language he prefers) to an external AI and saves the answer as a file. Claude Code runs `make test` and `make test-e2e`, imports the file together with Jesper and writes `docs/poc-report.md`: what works, what failed, changes to the template or format, known errors and recommendations. The real plan and the import file stay outside git. The report describes them without real names, school names or dates of private events.
- **Not included:** Automatic fetching from Aula, new features.
- **Depends on:** Phase 4.
- **Acceptance criteria:**
  1. The real week plan ends up in the calendar with correct dates and titles after at most one adjustment of the template (more adjustments are noted in the report).
  2. `make test` and `make test-e2e` are green.
  3. No known error loses data.
  4. Jesper has written "PoC approved" in `docs/status.md`.
  5. `git status` and `git log` show no real plan or import file.
- **Test:** Manual.

### Phase 6 – Dashboard (after the PoC)
**Expected result:** A dashboard that the family sets up themselves and that can be shown full screen on a TV screen or a Raspberry Pi, without being able to change anything and without showing Budget.

### T6.1 Dashboard module and setup API
- **Purpose:** Store the dashboard's setup on the server.
- **Do:** Module `dashboard` (backend and frontend skeleton) as the fourth module. Migration for the table `dashboard_setup` (one row with the JSON setup), saved in one transaction. Endpoints and rules by section 9.5, including the two presets. If no setup is saved, `large-calendar` is returned.
- **Not included:** Display of widgets, drag and drop, several dashboards.
- **Depends on:** Phase 5 (PoC approved).
- **Acceptance criteria:**
  1. `GET /api/dashboard/setup` with no saved setup → the preset `large-calendar`.
  2. `PUT` with code and a valid setup → 200, and `GET` returns the same.
  3. 422 for each of: unknown `type`, unknown `size`, 9 widgets, duplicate `id`, `weeks` = 5, `days` = 15, empty `categories`.
  4. `PUT` without code → 401. `GET` without code → 200.
  5. `GET /api/dashboard/presets` returns exactly `large-calendar` and `homework-and-meals`.
  6. `/api/modules` contains `dashboard` as number 4.
- **Test:** pytest.

### T6.2 Widget "week-calendar"
- **Purpose:** Show events from Week plan on the dashboard.
- **Do:** A component in the dashboard module that fetches `/api/weekplan/events` for `weeks` weeks from the current week with the `category` filter and shows them with the shared week grid from `shared/ui`. Read-only: no click changes anything. It talks to the Week plan only through its API and imports no code from the `weekplan` module.
- **Not included:** Month view, editing, code dialog.
- **Depends on:** T6.1.
- **Acceptance criteria:**
  1. With `categories=["homework","plan"]` and test data in all four categories only `homework` and `plan` are shown.
  2. `weeks=2` shows 14 days.
  3. Today's date is highlighted.
  4. The API call contains `category=homework,plan`.
  5. There are no buttons that change data and no code dialog.
  6. With no events the text "Ingen planer" is shown.
- **Test:** Vitest with a mocked API. Playwright for 5.

### T6.3 Widget "meal-boxes"
- **Purpose:** Show planned dishes as boxes.
- **Do:** A component that fetches `/api/mealplan/days?from=&to=` for `days` days from today and shows one box per day with a dish (weekday, date, dish name, optional note), sorted by date. Days without a dish are not shown.
- **Not included:** Editing, shopping list.
- **Depends on:** T6.1.
- **Acceptance criteria:**
  1. 3 planned days out of 7 → 3 boxes.
  2. No planned days → the text "Ingen madplan".
  3. Today's box is highlighted.
  4. The boxes are in date order.
  5. No code dialog.
- **Test:** Vitest and Playwright.

### T6.4 Display and setup
- **Purpose:** The dashboard can be seen on a screen and set up by the family.
- **Do:** The route `/dashboard` in the main app shows the dashboard and the button "Opsæt". The route `/display` shows it full screen without menu, buttons and mouse cursor, with a base font of at least 20 px at 1920×1080. `/display` reloads data and setup every 60 seconds (TanStack Query `refetchInterval`) and recalculates "today" at midnight. Layout: 12 columns, `small` = 4, `medium` = 6, `large` = 12, in order. If the window is taller than wide (portrait), all widgets are shown full width below each other. The page `/dashboard/setup`: two buttons for the presets and a list where one can add a widget (type), remove, move up/down, choose size and settings (categories, number of weeks, number of days). "Gem opsætning" is one action with the code. "Annuller" discards.
- **Not included:** Drag and drop, several dashboards, colours and themes.
- **Depends on:** T6.2, T6.3.
- **Acceptance criteria:**
  1. `/display` shows no menu and no buttons.
  2. If the setup is changed through the API, it shows in an open `/display` within 70 seconds without a reload (Playwright with a controlled clock).
  3. A new event created through the API shows in an open `/display` within 70 seconds.
  4. At midnight (controlled clock) the day marker moves to the next day.
  5. Setup: choose `homework-and-meals`, Save and code → `/display` shows a calendar with only `homework` and `plan` plus meal boxes.
  6. Wrong code → the setup is unchanged.
  7. At 1920×1080 a `large` widget fills at least 95 % of the container's width, and two `medium` widgets stand side by side (checked with box measurements).
  8. At 1080×1920 (portrait) all widgets stand full width below each other.
  9. The base font on `/display` is at least 20 px at 1920×1080.
- **Test:** Playwright.

### T6.5 Security rule and test on a real screen
- **Purpose:** Make sure the dashboard never shows Budget and that it lasts through round-the-clock use.
- **Do:** An allowlist in the dashboard's API client (`/api/weekplan/`, `/api/mealplan/`, `/api/dashboard/`). Anything else throws an error. Test on at least two devices on the network (for example a TV, a tablet or a Pi with a browser), and a 24-hour test with `/display` open.
- **Not included:** Pi image, kiosk setup, HTTPS.
- **Depends on:** T6.4.
- **Acceptance criteria:**
  1. An attempt to call `/api/budget/...` from the dashboard's API client throws an error (unit test).
  2. Screenshots from two devices are in `docs/`, taken with invented demo data only.
  3. After 24 hours `/display` is still up to date (a new event created after 23 hours is seen), and the browser's memory use has not grown by more than 50 % from the start.
  4. `/display` can be opened from another device on the network without a code, and `/budget` on the same device asks for the code.
- **Test:** Unit test for 1. Manual test for 2-4.

---
## 12. Phase 7 – Pi image and public release (sketch only, not decided)

Planned as its own step when phase 6 is done. Because the repo is already public and the Nexmio brand has a website, this phase also decides what the website may say once the features exist (rule 5 in section 2).

**Goal:** A non-technical user buys a Raspberry Pi, writes an image to the card, and the Pi runs both the server and shows `/display` on HDMI. It can also be used with an ordinary TV screen or PC screen without touch.

**Findings from the preliminary study**
- An image can be built with `rpi-image-gen` (Raspberry Pi's newer tool) or `pi-gen`. It can also be made with Raspberry Pi OS Lite and a setup script as the first step.
- Users can get the image through Raspberry Pi Imager with a custom image list (Imager 2.0 or newer) or by having it included in the official list. Wi-Fi and name can be set at flash time (cloud-init).
- The screen must show `/display` without a desktop. `Cage` runs one maximised program and can be started with systemd. It still needs a web engine. Jesper has had bad experiences with Chromium in kiosk mode before, so the cause is found before anything is chosen.
- Waveshare 23.8/27" (and 21.5" with CM4) use `hdmi_group=2`, `hdmi_mode=82`, `hdmi_cvt 1920 1080 60 6 0 0 0` in `config.txt`. Touch is USB and needs no Pi setup according to Waveshare. Rotation and touch direction are not described and must be tested. On newer Pi OS with the KMS driver `hdmi_cvt` may be ignored (not checked). Brightness can be set through DDC/CI (`ddcutil setvcp 0x10 50`).
- SD cards can wear out from continuous writing. Consider an SSD, a read-only root and logging to RAM.
- Minimum model: Pi 4 (a browser is heavy).

**Decisions that are missing**
1. First code: today it is set only on the server (section 8). A non-technical user cannot use a command line. This contradicts decision 4 and needs a new decision (for example a setup screen at first start).
2. Updates of the image and the app, and who is responsible for security fixes.
3. Encryption (HTTPS) on the local network.
4. Licence and documentation for the public release.
5. Which Pi models are supported.
6. How the dashboard is shown without a Chromium kiosk (see above).
7. What the website at family.nexmio.com says about the Pi image, and when.
8. Whether more languages than Danish and English are wanted for a public release.

---

## 13. Risks

| No | Risk | Countermeasure |
|---|---|---|
| R1 | The code is sent in plain text on the network (A7) | Local network only. Consider HTTPS in phase 7 |
| R2 | Data loss if the container is deleted | Data is in the volume `./data`. Backup (T4.4). Budget backups |
| R3 | EnvelopeQ's quality is unknown | Stop point in T4.1 |
| R4 | The AI makes a wrong import file | Strict validation, preview, all-or-nothing import, duplicate check |
| R5 | Aula cannot be fetched automatically | Manual copy (outside scope) |
| R6 | HandleMCP is unofficial and may stop working | Postponed until after the PoC |
| R7 | The module rules erode over time | Architecture tests (T0.2) |
| R8 | Everyone on the network can see Week plan and Meal plan (for example a child's name) | Accepted in the PoC (decisions 3 and 5) |
| R9 | A public release brings responsibility for security and updates | Sketched in section 12, decided later |
| R10 | Real family or budget data ends up in the public repo (tests, docs, screenshots, commits) | Rules 6 and 15 in section 2. `data/` and `project.md` in `.gitignore`. Invented data only. Owner checks `git status` before asking for a commit |
| R11 | `brand/` is edited by mistake and drifts from the brand kit | Rule 2 in section 2. Brand check in `make test` (T0.2) |
| R12 | The website promises features that do not exist yet | Rule 5 in section 2 |
| R13 | Danish and English texts drift apart, or texts end up hardcoded | Key-parity test and `jsx-no-literals` (T0.3) |
| R14 | One shared database file makes a module's tables depend on another's | Hard rule 2 in 6.1 and review at every migration |

---

## 14. Decision log

| No | Decision | Reason | Rejected |
|---|---|---|---|
| 1 | One main app with separate modules. The user switches module without a page reload | A change in one module is easy to place and test | One single app |
| 2 | **Changed by decision 30.** Earlier: modules share nothing, even if functions are repeated | (was: modules can be lifted out as their own apps) | Shared module data |
| 3 | The app is only locally reachable, no login | Fits an own family | Public access, VPN |
| 4 | One shared code, set and changed by Jesper. A forgotten code is reset on the server | Simple, and children cannot change locked things | Personal login, reset through the web |
| 5 | Everyone can see Week plan and Meal plan. Changes need the code | Children can see the plan without changing it | |
| 6 | Budget is fully hidden without the code, also viewing | The area must be closed | Open viewing |
| 7 | The code is needed at every action. One action is one press of Save, Delete or Import | Avoids one code per line | Code per line, unlock for 15 min |
| 8 | AI import: template → external AI → file → upload → approval | Simple flow | AI built into the app |
| 9 | Duplicates are found by name and date and shown together | Avoids warnings for recurring events | Name only |
| 10 | Meal plan reuses single dishes | Simplest | Whole weeks |
| 11 | HandleMCP waits until after the PoC | Unofficial tool | |
| 12 | The documentation is collected in one `CLAUDE.md` | One place | Several files |
| 13 | The Pi image and public release are taken only when the server and a usable dashboard work | The PoC is kept small | Image in the PoC |
| 14 | The dashboard must be possible to set up by the user | Families have different needs | Fixed layout |
| 15 | The dashboard is read-only. Touch is not necessary | Works on an ordinary TV screen and PC screen | Touch requirement |
| 16 | The dashboard is built as phase 6 right after the PoC, before the Pi image. The PoC delivers the APIs it needs | The dashboard is a precondition for the Pi image, but the PoC is kept small | Dashboard in the PoC |
| 17 | Setup with fixed building blocks (`week-calendar`, `meal-boxes`) and two presets. Drag and drop later | Simplest, and covers Jesper's two examples | Free drag and drop now |
| 18 | **Replaced by decision 38.** Earlier: one dashboard at the start | | |
| 19 | The code is needed to change the dashboard's setup | Same rule as other changes | Setup without code |
| 20 | Technology: Python/FastAPI, SQLite (one file), React/TypeScript/Vite, i18next, Docker Compose (section 7). *Recommendation, not finally approved* | Same as EnvelopeQ, simple and familiar | PostgreSQL, JSON everywhere |
| 21 | The import format is JSON | Easy to validate, and AIs fill it in reliably | YAML |
| 22 | Categories in Week plan: `homework`, `plan`, `appointment`, `other`. *Recommendation* | Makes filtering in the dashboard possible | Free text |
| 23 | `/display` is a full-screen page without menu that refreshes every 60 seconds. *Recommendation* | Simple and needs no special technology | Live connection (WebSocket) |
| 24 | The product and repo are called Nexmio Family (family.nexmio.com), the green Nexmio product. "Familie-app" was only the planning name. The page title in the PoC is "Nexmio Family" (confirmed by Jesper) | The repo and website belong to the Nexmio brand | |
| 25 | **Replaced by decision 29.** Earlier: Danish module ids, API fields and template | | |
| 26 | Commit and push only when the owner asks. Claude prepares the task-numbered commit message when a task is done | Rule of the Nexmio repo | Automatic commit per task |
| 27 | The repo is public. No secrets and no real family data in git. `project.md` is never committed. `brand/` is never edited | Rule of the Nexmio repo | |
| 28 | **Changed by decision 33.** The website in `site/` is outside the build plan and is only changed when the owner asks | Rule of the Nexmio repo | Website as a PoC task |
| 29 | **New (18 Nov 2026, Jesper):** Everything in code is English: module ids, API paths, fields, error codes, import format, CLI. Only the frontend is translated (Danish and English), with a language chosen by the user | One language in code is simpler to maintain and fits a later public release | Danish names in code, Danish only |
| 30 | **New (18 Nov 2026, Jesper):** A simpler standard structure: a modular monolith split by feature, one SQLite file, shared helpers allowed in `shared/`. Hard rules only: no imports between modules, no cross-module tables, Budget isolated and not reachable from the dashboard. The goal "lift a module out as its own app" is dropped | Less duplicate code and less setup, with the safety rules kept | Fully independent modules (own database, no shared code, repeated functions) |
| 31 | **New (18 Nov 2026, Jesper):** The import template follows the user's UI language (`da` or `en`). The JSON field names and category values stay English | The user and the AI read the instructions in the user's language | One fixed template language |
| 32 | **Replaced by decision 35.** Earlier: The app UI uses the Nexmio brand (green, N mark, `brand/LAYOUT.md`) from the PoC (T0.4) | Looks like a Nexmio product from the start | Plain UI until after the PoC |
| 33 | **New (18 Nov 2026, Jesper):** The website `site/` waits until the product is more finished | The site can then describe real features (rule 5) | Website now |
| 34 | **New (18 Nov 2026, Jesper):** The PoC is built in one go. Budget is left out (maybe its own app). | Budget is still an open question | Budget in the PoC |
| 35 | **New (18 Nov 2026, Jesper):** The app UI is not green and not the brand look. It copies the feel of Cozyla (checked on their real screenshots): a white surface, no frames around the calendar, solid colour blocks, a day view with one column per person and a time axis with a red "now" line, large round person avatars, a slim icon rail, and a top bar with the family name, date and clock. Replaces decision 32 | A familiar family-planner feel | Brand look in the app; boxed day cards |
| 40 | **New:** The calendar's home view is the day view by person. The family name is a setting (`GET/PUT /api/family`) | Matches the Cozyla home screen | |
| 41 | **New (18 Nov 2026, Jesper):** The look follows the new design: light and family friendly, a wallpaper chosen in Settings (`ocean`, `lavender`, `sand`, `mint`), white cards, Fraunces for titles and Nunito for text, solid person colours with readable text. Replaces the look of decision 35 | The design the owner approved | |
| 42 | **New:** On a screen without touch the start view is all that is shown. With touch (a per-screen setting) there is a Day / Week / Photos switch. A different view goes back to the start view after `return_after` seconds, and every touch restarts the time. Tapping the photo frame goes back at once | A TV cannot be touched. A tablet can | A fixed switch on every screen |
| 43 | **New:** Photos are stored as files in `data/photos/` and rows in `app.db`. The browser shrinks every photo to 1920 px before upload. The server checks the real file type from the first bytes and accepts at most 15 MB | The TV never has to load a big photo. No image library on the server | Server side resizing, thumbnails |
| 44 | **New:** The to-do list is read-only on the dashboard. Adding, ticking and deleting need the family code like every other change | One rule for all changes | A code-free tick box on the wall screen |
| 45 | **New:** The dashboard may also read `/api/photos/`, `/api/todo/`, `/api/members` and `/api/family` (never Budget) | The new widgets need them | |
| 46 | **New (18 Nov 2026, Jesper):** Ticking a task needs no code (`POST /api/todo/items/{id}/tick`). Adding, renaming and deleting still need the login | A wall screen cannot ask for a code every time a task is done | A code for every tick |
| 47 | **New (18 Nov 2026, Jesper):** The admin needs a login once: `POST /api/session/login` with the family code gives an HttpOnly cookie (30 days). The server stores only a hash of the token. Changes made with the cookie must also carry the header `X-Requested-With: nexmio` (against forged requests from other sites). The header `X-Family-Code` still works. Changing the code logs everyone else out. Replaces the "code at every action" part of decision 7 and the "code is never stored" client rule: the code itself is still never stored, only a login cookie | Typing the code at every change was too much for a parent | The code at every action |
| 48 | **New (18 Nov 2026, Jesper):** There is exactly one default dashboard and it is the only one on `/`. Custom dashboards are always on `/<name>`. The default dashboard is edited like any other, but cannot be deleted, renamed away from `/`, or swapped. Replaces the "default flag" of decision 38 | Simpler, and nobody loses the front page | A switchable default |
| 49 | **New (18 Nov 2026, Jesper):** The title at the top of a dashboard is the family name (Settings), an own text for that dashboard (`title`), or hidden (`show_title` false). There is no settings button on a custom dashboard, only on the default one when touch is on | The title and the buttons differ from screen to screen | One fixed title |
| 50 | **New (18 Nov 2026, Jesper):** The dashboard editor is a live preview of the real dashboard (same components, scaled to fit). Widgets are added from a palette (tap or drag to where you want them), and moved, resized, changed and removed right on the widget in the preview. `index.html` is never cached and a missing script gives 404 (not a page of HTML), so an open page after an update reloads instead of failing | Easier to understand than lists and forms. Fixes the "error loading dynamically imported module" after an update | Forms with separate lists |
| 51 | **New (18 Nov 2026, Jesper):** The editor shows the dashboard at the real size of the chosen device (phone 390×844, tablet 1024×768, TV 1920×1080, swapped when portrait) inside a drawn frame, scaled to fit the page. The frame is only in the editor. A phone always stacks the widgets (one per row). Widget settings open from a cogwheel. `show_clock` hides date and clock | The size choice must look and behave like the device | One preview width for every device |
| 52 | **New (19 Nov 2026, Jesper):** Events can repeat (day, week, 2 weeks, month, up to 150 times, until a day). A series is created in one transaction and shares a `series_id`. Changing or deleting can apply to one event, this and the following, or the whole series. A duplicate on any day stops the whole series | Football and school hours should not be typed every week | Repeat rules stored as a formula |
| 53 | **New:** An event has one main person (`member_id`, which gives the colour) and up to 6 more (`also_ids`). It shows in every person's column and in every person's filter | Many appointments are for more than one child | A separate people table |
| 54 | **New:** The meal plan is edited by tapping a day (a sheet with favorites and recent dishes). Dishes can be favorites and carry ingredients. The shopping list is filled by the page (it sends the ingredients to `/api/shopping/bulk`), so the modules share no tables | Fast to plan, and the module rule stays | The shopping list reading the meal tables |
| 55 | **New:** Ticking is free for the shopping list, the to-do list and a child's own chores (today or yesterday only), like decision 46. Everything else needs the login | Wall screens and shops cannot ask for a code | A code for every tick |
| 56 | **New:** Stars are written to a log when a chore is ticked (so deleting a chore keeps earned stars) and spent when a reward is claimed. The weather comes from Open-Meteo through the server (only coordinates leave the house, cached 30 minutes, the app works without it). The user asked for DMI, which needs a key and an account | Simple and no key | DMI |
| 57 | **New:** A share link opens a read-only page for the next days and runs out by itself. Only a hash of its token is stored. It is a convenience and can be removed, not a lock: the plan itself is as open as it always was on the home network | A babysitter should not need the code | |
| 58 | **New:** The backup is one zip with a safe copy of `app.db` and all photos (`GET /api/backup`, needs the login). The app is installable (manifest and a small service worker that keeps nothing, so it can never be out of date). The calendar feed is `GET /api/weekplan/calendar.ics` | Safety, a real app on the phone and the calendar where parents already look | Offline caching |
| 59 | **New:** Not built from the review: "keep the latest import" (low value), a Pi image (a guide and a script are in `docs/pi-setup.md` and `deploy/pi/`, not tested on a real Pi) | | |
| 60 | **New (21 Nov 2026, Jesper):** Dashboards (`.display`) get a dark glass look inspired by wall-board displays: a dark soft-gradient background (ready for a photo behind it), translucent blurred blocks with white text, a large thin clock at the top right and small uppercase widget titles. Person colours stay solid. It is done only by CSS variables and rules scoped to `.display`; the admin and the app keep the light look. Replaces the dashboard part of decision 41 | The owner prefers this style for wall screens | A copy of any existing product; changing the admin too |
| 36 | **New:** Family members are core data (a table and an API) with one of ten fixed colours. An event has one member or none ("whole family") | Colours and per-person views | Free-text person; several members per event (written in `docs/suggestions.md`) |
| 37 | **New:** The calendar has three views (week, month, by person) and a filter per person | "One person or everyone" | |
| 38 | **New (18 Nov 2026, Jesper):** `/admin` is where everything is entered. Several dashboards: the default on `/`, others on `/<name>`, each with a device and an orientation. Replaces decision 18 | One for the phone, one for the big screen, and so on | One dashboard |
| 39 | **New:** Language is a setting in the Settings menu (decision 29 stays) | | |

Decisions 16-19 were taken by Claude at Jesper's request (17 Nov 2026) and can be changed. Decisions 20-23 are recommendations that Jesper should confirm before the build starts. Decisions 29-33 were taken by Jesper on 18 Nov 2026 and changed or replaced decisions 2, 25 and 28.

---

## 15. Terms

- **API / endpoint:** The way the frontend talks to the backend. An endpoint is one address, for example `GET /api/health`.
- **Module:** A feature area of the app (Week plan, Meal plan, Budget, Dashboard) with its own folder, router and tables.
- **Modular monolith:** One app and one database, split into modules by feature, with a few rules about what may depend on what.
- **SPA (single-page app):** The page does not reload when you switch module.
- **i18n (internationalisation):** Showing the UI in more than one language from locale files.
- **Locale file:** A file with all texts for one language (`da.ts`, `en.ts`).
- **Migration:** A numbered SQL file that creates or changes tables.
- **Hash (argon2id):** A one-way scrambling of the code, so the code itself cannot be read in the database.
- **Rate limiting:** Rejects calls after too many wrong attempts.
- **Atomic / transaction:** Everything is saved, or nothing is saved.
- **ISO week:** The week starts on Monday. Week 1 is the week that contains the year's first Thursday.
- **Widget:** A building block on the dashboard (for example calendar or meal boxes).
- **Volume:** A folder on the host that is linked into the container so data survives.
- **Polling:** The page asks the server for news at fixed times (here every 60 seconds).
- **End-to-end test (e2e):** A test that drives a real browser through the app.
- **Duplicate:** An event with the same title and date as another (A5).
- **Brand kit (`brand/`):** The generated copy of the shared Nexmio design files. Read-only for this repo.
- **Control repo:** The private Nexmio repo that owns the brand kit. Never referenced in committed files.

---

## 16. Status and open questions

- **Decided:** Decisions 1-19 and 29-33 (section 14). Decisions 20-23 are recommendations.
- **Answered on 18 Nov 2026:** Q1 (everything English, frontend da + en), Q2 (brand in the UI now), Q3 (website later), and the module structure (simpler).
- **Open:** Assumptions A1-A12 (section 4). Phase 7 (section 12). Jesper's approval of the technology choices.
- **Before T0.4:** Jesper exports `brand/` into this repo from the Nexmio control repo.
- **Next step:** Jesper confirms technology choices and assumptions. Then Claude Code starts T0.1.
