from app.core.registry import ModuleInfo
from app.modules.occasions.router import router

MODULE = ModuleInfo(id="occasions", icon="cake", requires_code_to_view=False, router=router)
