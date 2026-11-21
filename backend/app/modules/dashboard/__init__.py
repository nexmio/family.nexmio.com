from app.core.registry import ModuleInfo
from app.modules.dashboard.router import router

MODULE = ModuleInfo(id="dashboard", icon="layout", requires_code_to_view=False, router=router)
