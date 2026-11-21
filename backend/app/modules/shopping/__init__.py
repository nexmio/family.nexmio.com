from app.core.registry import ModuleInfo
from app.modules.shopping.router import router

MODULE = ModuleInfo(
    id="shopping", icon="cart", requires_code_to_view=False, router=router, open_paths=("/tick",)
)
