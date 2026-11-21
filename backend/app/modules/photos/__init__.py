from app.core.registry import ModuleInfo
from app.modules.photos.router import router

MODULE = ModuleInfo(id="photos", icon="image", requires_code_to_view=False, router=router)
