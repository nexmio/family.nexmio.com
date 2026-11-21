.PHONY: build run stop logs set-code test test-backend test-frontend test-e2e brand-check

IMAGE ?= nexmio-family
NAME  ?= nexmio-family

# ---- Podman ----------------------------------------------------------------
build:
	podman build -t $(IMAGE) .

run: build
	mkdir -p data
	podman run -d --name $(NAME) --replace --restart unless-stopped \
	  -p 8080:8080 --userns=keep-id --user $$(id -u):$$(id -g) \
	  -v ./data:/data:Z $(IMAGE)
	@echo "Open http://localhost:8080/  (admin: http://localhost:8080/admin)"
	@echo "First time? Run: make set-code"

stop:
	podman rm -f $(NAME)

logs:
	podman logs -f $(NAME)

set-code:
	podman exec -it $(NAME) python -m app.cli set-code

# ---- Tests -----------------------------------------------------------------
test-backend:
	cd backend && .venv/bin/python -m pytest -q && .venv/bin/ruff check app tests

test-frontend:
	cd frontend && npm run typecheck && npm test

# Starts a throw-away server on port 8099 with empty data, runs Playwright, stops it.
test-e2e:
	cd frontend && npm run build
	rm -rf /tmp/nexmio-e2e && mkdir -p /tmp/nexmio-e2e
	cd backend && echo "smoke-code-1" | NEXMIO_DATA_DIR=/tmp/nexmio-e2e .venv/bin/python -m app.cli set-code --code-from-stdin
	cd backend && NEXMIO_DATA_DIR=/tmp/nexmio-e2e NEXMIO_FRONTEND_DIR=$$PWD/../frontend/dist \
	  .venv/bin/uvicorn app.main:get_app --factory --port 8099 > /tmp/nexmio-e2e/server.log 2>&1 & \
	  echo $$! > /tmp/nexmio-e2e/pid; sleep 2; \
	  cd frontend && npx playwright test; status=$$?; kill $$(cat /tmp/nexmio-e2e/pid); exit $$status

brand-check:
	@if [ -d brand ]; then git diff --exit-code -- brand/ && echo "brand/ is unchanged"; else echo "brand/ not found, check skipped"; fi

test: test-backend test-frontend brand-check
