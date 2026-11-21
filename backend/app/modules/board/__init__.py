from app.core.registry import ModuleInfo
from app.modules.board.router import router

MODULE = ModuleInfo(id="board", icon="note", requires_code_to_view=False, router=router)
