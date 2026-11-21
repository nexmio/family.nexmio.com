from app.core.registry import ModuleInfo
from app.modules.chores.router import router

MODULE = ModuleInfo(
    id="chores", icon="star", requires_code_to_view=False, router=router, open_paths=("/tick",)
)
