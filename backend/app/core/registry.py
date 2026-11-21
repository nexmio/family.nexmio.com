"""The module list (6.2). A new module is one folder plus one line in MODULES."""

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, ConfigDict, StringConstraints

from app.core import extras, members
from app.core.access_code import (
    SESSION_COOKIE,
    SESSION_DAYS,
    check_code,
    create_session,
    end_session,
    require_code,
    session_valid,
    set_code,
)
from app.core.config import MIN_CODE_LENGTH
from app.core.db import reader, transaction

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


@dataclass(frozen=True)
class ModuleInfo:
    id: str
    icon: str
    requires_code_to_view: bool
    router: APIRouter
    # Paths (suffixes) that are POSTs but only read data, so they need no code.
    open_paths: tuple[str, ...] = field(default_factory=tuple)


def _guard(info: ModuleInfo) -> Callable[[Request], None]:
    def guard(request: Request) -> None:
        if request.method in SAFE_METHODS:
            if info.requires_code_to_view:
                require_code(request)
            return
        if any(request.url.path.endswith(p) for p in info.open_paths):
            return
        require_code(request)

    return guard


class ChangeCode(BaseModel):
    new: str


class LoginBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str


class FamilyName(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Annotated[str, StringConstraints(strip_whitespace=True, max_length=40)] | None = None
    wallpaper: Literal["ocean", "lavender", "sand", "mint"] | None = None


def build_api(modules: list[ModuleInfo]) -> APIRouter:
    api = APIRouter(prefix="/api")

    @api.get("/health")
    def health():
        return {"status": "ok"}

    @api.get("/modules")
    def list_modules():
        return [
            {"id": m.id, "icon": m.icon, "requires_code_to_view": m.requires_code_to_view}
            for m in modules
        ]

    def family_state(db) -> dict:
        rows = {r["key"]: r["value"] for r in db.execute("SELECT key, value FROM settings")}
        return {"name": rows.get("family_name") or None, "wallpaper": rows.get("wallpaper", "ocean")}

    @api.get("/family")
    def get_family():
        with reader() as db:
            return family_state(db)

    @api.put("/family", dependencies=[Depends(require_code)])
    def put_family(body: FamilyName):
        with transaction() as db:
            if body.name is not None:
                if body.name:
                    db.execute(
                        "INSERT INTO settings (key, value) VALUES ('family_name', ?) "
                        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                        (body.name,),
                    )
                else:
                    db.execute("DELETE FROM settings WHERE key = 'family_name'")
            if body.wallpaper is not None:
                db.execute(
                    "INSERT INTO settings (key, value) VALUES ('wallpaper', ?) "
                    "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                    (body.wallpaper,),
                )
            return family_state(db)

    @api.get("/session")
    def session_state(request: Request):
        return {"logged_in": session_valid(request.cookies.get(SESSION_COOKIE))}

    @api.post("/session/login")
    def login(body: LoginBody, request: Request, response: Response):
        check_code(request, body.code)
        token = create_session()
        response.set_cookie(
            SESSION_COOKIE, token, max_age=SESSION_DAYS * 86400, httponly=True, samesite="lax", path="/"
        )
        return {"logged_in": True}

    @api.post("/session/logout", status_code=204)
    def logout(request: Request, response: Response):
        end_session(request.cookies.get(SESSION_COOKIE))
        response.delete_cookie(SESSION_COOKIE, path="/")

    @api.post("/code/check", status_code=204, dependencies=[Depends(require_code)])
    def check_code_route():
        return None

    @api.post("/code/change", status_code=204, dependencies=[Depends(require_code)])
    def change_code(body: ChangeCode, request: Request):
        from app.core.errors import ApiError

        if len(body.new) < MIN_CODE_LENGTH:
            raise ApiError(422, "code_too_short", {"min": MIN_CODE_LENGTH})
        set_code(body.new)
        end_session(request.cookies.get(SESSION_COOKIE), keep=True)  # everyone else must log in again

    api.include_router(extras.router)

    members_info = ModuleInfo("members", "users", False, members.router)
    api.include_router(members.router, prefix="/members", dependencies=[Depends(_guard(members_info))])

    for info in modules:
        api.include_router(
            info.router, prefix=f"/{info.id}", dependencies=[Depends(_guard(info))]
        )
    return api


def default_modules() -> list[ModuleInfo]:
    from app.modules import (
        board,
        chores,
        dashboard,
        mealplan,
        occasions,
        photos,
        share,
        shopping,
        todo,
        weekplan,
    )

    return [
        weekplan.MODULE, mealplan.MODULE, shopping.MODULE, todo.MODULE, chores.MODULE, occasions.MODULE,
        board.MODULE, photos.MODULE, share.MODULE, dashboard.MODULE,
    ]
