from __future__ import annotations

import pandas as pd

from src.dataframe_utils import normalize_object_series


def parse_datetime_like(series: pd.Series) -> pd.Series:
    normalized = normalize_object_series(series)

    numeric = pd.to_numeric(normalized, errors="coerce")
    numeric_non_null = numeric.dropna()
    epoch_candidate = None
    if not numeric_non_null.empty:
        median_abs = float(numeric_non_null.abs().median())
        for unit, lower, upper in (
            ("s", 1e8, 1e11),
            ("ms", 1e11, 1e14),
            ("us", 1e14, 1e17),
            ("ns", 1e17, 1e20),
        ):
            if lower <= median_abs < upper:
                epoch_candidate = pd.to_datetime(numeric, errors="coerce", unit=unit)
                break
        if pd.api.types.is_numeric_dtype(normalized):
            return epoch_candidate if epoch_candidate is not None else pd.Series(pd.NaT, index=series.index, dtype="datetime64[ns]")

    candidates = []
    try:
        candidates.append(pd.to_datetime(normalized, errors="coerce", format="mixed"))
    except TypeError:  # pragma: no cover - compatibility with older pandas
        candidates.append(pd.to_datetime(normalized, errors="coerce"))

    try:
        candidates.append(pd.to_datetime(normalized, errors="coerce", format="mixed", dayfirst=True))
    except TypeError:  # pragma: no cover - compatibility with older pandas
        pass

    if epoch_candidate is not None and candidates:
        blended = candidates[0].copy()
        blended = blended.where(blended.notna(), epoch_candidate)
        candidates.append(blended)

    if epoch_candidate is not None and not candidates:
        candidates.append(epoch_candidate)

    return max(candidates, key=lambda parsed: float(parsed.notna().mean()))
