from __future__ import annotations

from typing import Any

import pandas as pd


_NULL_LIKE_VALUES = {
    "",
    " ",
    "na",
    "n/a",
    "nan",
    "none",
    "null",
    "nil",
    "undefined",
}

_BOOLEAN_MAPPING = {
    "true": True,
    "false": False,
    "yes": True,
    "no": False,
    "y": True,
    "n": False,
    "1": True,
    "0": False,
    "t": True,
    "f": False,
}


def normalize_object_series(series: pd.Series) -> pd.Series:
    if not (pd.api.types.is_object_dtype(series) or pd.api.types.is_string_dtype(series)):
        return series

    normalized = series.copy()
    non_null_mask = normalized.notna()
    normalized.loc[non_null_mask] = normalized.loc[non_null_mask].map(
        lambda value: value.strip() if isinstance(value, str) else value
    )
    lowered = normalized.astype("string").str.lower()
    normalized = normalized.mask(lowered.isin(_NULL_LIKE_VALUES), pd.NA)
    return normalized


def coerce_series_for_ml(series: pd.Series) -> pd.Series:
    normalized = normalize_object_series(series)
    if not (pd.api.types.is_object_dtype(normalized) or pd.api.types.is_string_dtype(normalized)):
        return normalized

    non_null = normalized.dropna()
    if non_null.empty:
        return normalized

    lowered = non_null.astype("string").str.lower()
    unique_values = set(lowered.unique().tolist())
    if unique_values and unique_values.issubset(set(_BOOLEAN_MAPPING)):
        mapped = normalized.astype("string").str.lower().map(_BOOLEAN_MAPPING)
        return mapped.astype("boolean")

    numeric = pd.to_numeric(normalized, errors="coerce")
    numeric_success_ratio = float(numeric.notna().sum()) / max(len(non_null), 1)
    if numeric_success_ratio >= 0.9:
        return numeric

    return normalized


def normalize_dataframe(dataframe: pd.DataFrame) -> pd.DataFrame:
    normalized = dataframe.copy()
    normalized.columns = [str(column).strip() for column in normalized.columns]
    for column in normalized.columns:
        normalized[column] = coerce_series_for_ml(normalized[column])
    return normalized
