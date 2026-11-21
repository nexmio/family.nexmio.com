from app.core.registry import ModuleInfo
from app.modules.share.router import router

MODULE = ModuleInfo(id="share", icon="link", requires_code_to_view=False, router=router)
