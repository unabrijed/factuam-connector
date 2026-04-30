from __future__ import annotations

from typing import Any, Dict, List
import pandas as pd

from src.dataframe_utils import normalize_object_series
from src.datetime_utils import parse_datetime_like


def infer_schema(dataframe: pd.DataFrame) -> List[Dict[str, Any]]:
    inferred = []
    for column in dataframe.columns:
        series = normalize_object_series(dataframe[column])
        kind = "unknown"
        if pd.api.types.is_numeric_dtype(series):
            kind = "numeric"
        elif pd.api.types.is_datetime64_any_dtype(series):
            kind = "datetime"
        elif series.astype(str).nunique(dropna=True) <= max(20, len(series) // 4):
            kind = "categorical"
        else:
            parsed = parse_datetime_like(series)
            if parsed.notna().mean() > 0.8:
                kind = "datetime"
            elif series.astype(str).str.len().mean() > 24:
                kind = "text"
            else:
                kind = "categorical"
        inferred.append(
            {
                "name": column,
                "kind": kind,
                "nullable": bool(series.isna().any()),
                "uniqueValues": int(series.nunique(dropna=True)),
            }
        )
    return inferred
