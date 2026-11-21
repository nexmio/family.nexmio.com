from app.core.registry import ModuleInfo
from app.modules.weekplan.router import router

MODULE = ModuleInfo(
    id="weekplan",
    icon="calendar",
    requires_code_to_view=False,
    router=router,
    open_paths=("/import/preview",),
)
