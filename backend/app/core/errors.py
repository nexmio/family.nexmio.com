"""One error type for the whole API. Errors always look like {"error": code, "details": ...}."""

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class ApiError(Exception):
    def __init__(self, status: int, error: str, details=None, headers: dict | None = None):
        super().__init__(error)
        self.status = status
        self.error = error
        self.details = details
        self.headers = headers or {}


async def api_error_handler(_: Request, exc: ApiError) -> JSONResponse:
    return JSONResponse(
        {"error": exc.error, "details": exc.details}, status_code=exc.status, headers=exc.headers
    )


async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    details = [
        {"loc": [str(x) for x in e.get("loc", [])], "type": e.get("type"), "msg": e.get("msg")}
        for e in exc.errors()
    ]
    return JSONResponse({"error": "validation_error", "details": details}, status_code=422)
