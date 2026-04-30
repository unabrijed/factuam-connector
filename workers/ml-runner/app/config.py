from __future__ import annotations

import os
from pathlib import Path

LOCAL_ARTIFACT_DIR = Path(os.getenv("LOCAL_ARTIFACT_DIR", "./artifacts")).resolve()
LOCAL_ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
