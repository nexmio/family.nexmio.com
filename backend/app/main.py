import mimetypes
from pathlib import Path

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse

from app.core import config
from app.core.errors import ApiError, api_error_handler, validation_error_handler
from app.core.migrate import migrate
from app.core.registry import ModuleInfo, build_api, default_modules

mimetypes.add_type("application/manifest+json", ".webmanifest")


def create_app(modules: list[ModuleInfo] | None = None) -> FastAPI:
    migrate()
    app = FastAPI(title="Nexmio Family", docs_url="/api/docs", openapi_url="/api/openapi.json")
    app.add_exception_handler(ApiError, api_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.include_router(build_api(modules if modules is not None else default_modules()))

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        if path == "api" or path.startswith("api/"):
            raise ApiError(404, "not_found")
        root = config.frontend_dir()
        if root is None or not (root / "index.html").exists():
            raise ApiError(404, "frontend_not_built")
        root = root.resolve()
        candidate = (root / path).resolve()
        if path and candidate.is_file() and root in candidate.parents:
            cache = "public, max-age=31536000, immutable" if path.startswith("assets/") else "no-cache"
            return FileResponse(candidate, headers={"Cache-Control": cache})
        if path.startswith("assets/") or "." in path.rsplit("/", 1)[-1]:
            # a file that does not exist (for example an old script after an update) must not look like a page
            raise ApiError(404, "not_found")
        # the page itself is never cached, so a new version is picked up at once
        return FileResponse(Path(root / "index.html"), headers={"Cache-Control": "no-cache"})

    return app


def get_app() -> FastAPI:
    return create_app()
