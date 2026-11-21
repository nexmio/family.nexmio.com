"""Hard rule 1 (6.1): a module never imports another module."""

import ast
from pathlib import Path

MODULES_DIR = Path(__file__).resolve().parent.parent / "app" / "modules"


def violations(modules_dir: Path) -> list[str]:
    found = []
    for module in [p for p in modules_dir.iterdir() if p.is_dir() and not p.name.startswith("_")]:
        for file in module.rglob("*.py"):
            for node in ast.walk(ast.parse(file.read_text(encoding="utf-8"))):
                names = []
                if isinstance(node, ast.Import):
                    names = [a.name for a in node.names]
                elif isinstance(node, ast.ImportFrom) and node.module:
                    names = [node.module]
                for name in names:
                    parts = name.split(".")
                    if parts[:2] == ["app", "modules"] and len(parts) > 2 and parts[2] != module.name:
                        found.append(f"{file.name}: {name}")
    return found


def test_real_modules_are_clean():
    assert violations(MODULES_DIR) == []


def test_detects_violation_and_accepts_clean_folder(tmp_path):
    (tmp_path / "a").mkdir()
    (tmp_path / "b").mkdir()
    (tmp_path / "a" / "x.py").write_text("from app.modules.b import thing\n")
    (tmp_path / "b" / "y.py").write_text("from app.modules.b.util import thing\n")
    assert violations(tmp_path) == ["x.py: app.modules.b"]
    (tmp_path / "a" / "x.py").write_text("from app.shared.dates import validate_range\n")
    assert violations(tmp_path) == []
