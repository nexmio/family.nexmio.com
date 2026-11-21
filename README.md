# Nexmio Family

A shared family calendar, meal plan and wall dashboard that runs on your own network.

- **`/admin`**: where you add things: the calendar, the meal plan, the family members, and the dashboards.
- **`/`**: the default dashboard, made for a TV, a tablet or a phone. No menu, no buttons.
- **`/tv`** (or any other name): more dashboards you make in the admin, for example one for the phone and one for the big screen.
- Every person in the family has their own colour. See everyone together, one person at a time, or side by side.
- Events can repeat and can be for several people. Write "Football Tuesday 16:30 Sam" in one field. The calendar can be subscribed to in the phone's own calendar.
- A meal plan you fill by tapping a day, with favorites, "copy last week" and a shopping list that is filled from the plan.
- Chores and stars for the children, birthdays, countdowns, a message board, the weather, and a night mode for the screen.
- Photos with albums play as a slideshow (in a frame, as a mosaic, or as a full-screen photo frame). A shared to-do list.
- Each screen can have touch on: then people can switch between day, week and photos, and it goes back to the start view by itself.
- Plans can be imported from a file: download the template, give it to an AI together with, for example, the school's week plan, and upload the answer.
- The interface is in Danish and English.

Changes need the shared family code. You type it once to log in to `/admin` and then have free access. Looking at a dashboard needs nothing, and a task can be ticked on a touch screen without logging in.

## Start it with Podman

```bash
make run          # builds the image and starts it on http://localhost:8080
make set-code     # first time only: choose the family code (at least 4 characters)
```

Then open <http://localhost:8080/admin>. Your data is in the folder `./data`.

Other commands: `make logs`, `make stop`. Without `make`:

```bash
podman build -t nexmio-family .
mkdir -p data
podman run -d --name nexmio-family -p 8080:8080 --userns=keep-id --user "$(id -u):$(id -g)" \
  -v ./data:/data:Z nexmio-family
podman exec -it nexmio-family python -m app.cli set-code
```

`podman-compose up --build` (or `docker compose up --build`) also works with `compose.yaml`.

## Backup

Press "Get backup" under Settings (one file with everything), or stop the container and copy the folder `./data`. The data is in `data/app.db` and the photos in `data/photos/`.

A Raspberry Pi as a wall screen: see `docs/pi-setup.md` (not tested yet).

## Develop and test

```bash
cd backend && python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
cd ../frontend && npm install && npx playwright install chromium
cd .. && make test        # backend (pytest, ruff) and frontend (types, Vitest)
make test-e2e             # browser tests against a temporary server
```
