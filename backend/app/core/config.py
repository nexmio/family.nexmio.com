import os
from pathlib import Path

MIN_CODE_LENGTH = 4
MAX_RANGE_DAYS = 62


def data_dir() -> Path:
    return Path(os.environ.get("NEXMIO_DATA_DIR", "data"))


def frontend_dir() -> Path | None:
    value = os.environ.get("NEXMIO_FRONTEND_DIR")
    return Path(value) if value else None
