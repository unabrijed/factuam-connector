from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

import joblib
import pandas as pd

from src.utils import sha256_file


def write_json(path: Path, payload: Any) -> str:
    path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    return sha256_file(path)


def write_dataframe(path: Path, dataframe: pd.DataFrame) -> str:
    dataframe.to_csv(path, index=False)
    return sha256_file(path)


def write_model(path: Path, pipeline) -> str:
    joblib.dump(pipeline, path)
    return sha256_file(path)


def artifact_entry(artifact_type: str, path: Path, content_hash: str, metadata: Dict[str, Any] | None = None) -> Dict[str, Any]:
    return {
        "artifactType": artifact_type,
        "name": path.name,
        "localPath": str(path),
        "contentHash": content_hash,
        "metadata": metadata or {},
    }
