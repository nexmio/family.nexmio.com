from app.core.registry import ModuleInfo
from app.modules.todo.router import router

MODULE = ModuleInfo(
    id="todo", icon="check", requires_code_to_view=False, router=router, open_paths=("/tick",)
)
