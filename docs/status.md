# Status

PoC built on 18 Nov 2026 (version 1.3 of CLAUDE.md). Date, task, status, note.

| Area | Status | Note |
|---|---|---|
| T0.1 Docker skeleton | Done | Image builds with Podman, runs as a non-root user, data in `./data`. Health check works inside the container. |
| T0.2 Tests and module rules | Done | pytest + ruff, Vitest (module rules, locales, colours, texts), Playwright (5 flows). Brand check is in `make test`. |
| T0.3 Languages | Done | Danish and English, language is a setting. Built on assumption A11. |
| T0.4 Brand look | Replaced | Decisions 35 and 40: a look that follows Cozyla (day view by person, free-standing calendar, solid colour blocks, icon rail, top bar). |
| T1.1-T1.3 Modules, code check, code dialog | Done | Built on assumptions A7, A9. Rate limit is in memory. |
| T2.1-T2.5 Calendar and import | Done | Plus members, month view and by-person view. Import creates unknown people. Built on assumptions A5, A12. |
| T3.1-T3.2 Meal plan | Done | One dish per day (A4). |
| T4.1-T4.4 Budget | Not built | Left out of the PoC (decision 34). |
| Design 1.4 (phone layout, photos, to-do, touch views, wallpaper) | Done | Built from the design canvas. Photo series with albums, tile/mosaic/full-screen frame, per-screen touch settings. |
| Admin login, one default dashboard, tick on dashboard, title override, live editor | Done | Decisions 46-50. |
| UX review (19 Nov 2026): recurring events, several people, quick add, undo, swipe, meal plan sheet, shopping list, calendar feed, chores and stars, birthdays, countdown, board, weather, night mode, share links, backup, installable app | Done | Decisions 52-59. Open: Pi image (guide only, untested), keep latest import. |
| T6.1-T6.4 Dashboards | Done | Several dashboards (default on `/`, others on `/<name>`), four widget types. |
| T5.1 PoC test with a real Aula plan | To do | Needs the owner: use the template with a real plan. |
| T6.5 24-hour test on real screens | To do | Needs the owner and real devices. |

## How it was checked
- `backend`: 81 tests pass, ruff is clean.
- `frontend`: type check and 15 Vitest tests pass. 15 Playwright tests pass, both against a local server and against the Podman container.
- The Podman image was started with `--userns=keep-id`, the code was set with the CLI, and members were still there after `podman restart`.

## Known limits
- `http://localhost:8080` may not answer with rootless Podman on a machine where `localhost` resolves to IPv6 first; use `http://127.0.0.1:8080`.
- The code is sent over plain HTTP on the local network (A7).
- Not tried on a TV, a tablet or a phone yet (only browser windows of those sizes).

## Dashboard look (21 Nov 2026)
- Dashboards (`.display`) now use a dark glass look: a soft dark gradient background, blurred translucent blocks, a large thin clock at the top right and small uppercase widget titles. Person colours stay solid. The admin and the app keep the light look. See decision 60.
- Done only in `frontend/src/styles.css` with variables scoped to `.display`. Below 700 px wide every widget takes a full row (not in the editor preview).
- Checked: type check, 24 Vitest tests and 15 Playwright tests pass. Looked at screenshots at 1920x1080 and 390 px wide with invented data.
- Not done: a photo as full background behind the glass. Not tried on a real TV or phone.
