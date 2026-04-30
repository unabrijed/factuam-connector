from __future__ import annotations

from typing import Any, Dict, Optional

import pandas as pd

from src.dataframe_utils import normalize_dataframe
from src.datetime_utils import parse_datetime_like
from src.schema_inference import infer_schema


def validate_dataset(dataframe: pd.DataFrame, target_column: str, time_column: Optional[str] = None) -> Dict[str, Any]:
    dataframe = normalize_dataframe(dataframe)
    warnings: list[str] = []
    if target_column not in dataframe.columns:
        return {
            "valid": False,
            "rowCount": int(len(dataframe)),
            "columnCount": int(len(dataframe.columns)),
            "missingValues": dataframe.isna().sum().astype(int).to_dict(),
            "duplicateRows": int(dataframe.duplicated().sum()),
            "warnings": [f"Target column '{target_column}' is missing."],
            "leakageDetected": False,
            "inferredSchema": infer_schema(dataframe),
        }

    row_count = int(len(dataframe))
    column_count = int(len(dataframe.columns))
    duplicate_rows = int(dataframe.duplicated().sum())
    missing_values = dataframe.isna().sum().astype(int).to_dict()
    leakage_detected = False

    if row_count < 30:
        warnings.append("Dataset has fewer than 30 rows.")
    elif row_count < 100:
        warnings.append("Dataset has fewer than the preferred 100 rows.")

    if column_count < 3:
        warnings.append("Dataset has fewer than 3 columns.")

    target_missing_ratio = float(dataframe[target_column].isna().mean())
    if target_missing_ratio > 0.6:
        warnings.append("Target column is missing more than 60% of values.")

    if dataframe[target_column].dropna().empty:
        warnings.append("Target column is empty.")

    for column in dataframe.columns:
        if column == target_column:
            continue
        if dataframe[column].equals(dataframe[target_column]):
            leakage_detected = True
            warnings.append(f"Feature column '{column}' matches the target exactly.")

    constant_columns = [column for column in dataframe.columns if dataframe[column].nunique(dropna=False) <= 1]
    if constant_columns:
        warnings.append(f"Constant columns detected: {', '.join(constant_columns[:5])}.")

    high_cardinality = [
        column
        for column in dataframe.columns
        if not pd.api.types.is_numeric_dtype(dataframe[column]) and dataframe[column].nunique(dropna=True) > max(50, row_count * 0.2)
    ]
    if high_cardinality:
        warnings.append(f"High-cardinality columns detected: {', '.join(high_cardinality[:5])}.")

    if time_column and time_column in dataframe.columns:
        parsed = parse_datetime_like(dataframe[time_column])
        if parsed.isna().mean() > 0.25:
            warnings.append(f"Time column '{time_column}' has many invalid timestamps.")

    usable_features = [column for column in dataframe.columns if column != target_column]
    if not usable_features:
        warnings.append("No usable feature columns remain after removing the target column.")

    valid = (
        row_count >= 30
        and column_count >= 3
        and target_missing_ratio <= 0.6
        and not dataframe[target_column].dropna().empty
        and len(usable_features) >= 1
        and not leakage_detected
    )

    return {
        "valid": valid,
        "rowCount": row_count,
        "columnCount": column_count,
        "missingValues": missing_values,
        "duplicateRows": duplicate_rows,
        "warnings": warnings,
        "leakageDetected": leakage_detected,
        "inferredSchema": infer_schema(dataframe),
    }
