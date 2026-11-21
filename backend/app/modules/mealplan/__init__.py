from app.core.registry import ModuleInfo
from app.modules.mealplan.router import router

MODULE = ModuleInfo(id="mealplan", icon="utensils", requires_code_to_view=False, router=router)
