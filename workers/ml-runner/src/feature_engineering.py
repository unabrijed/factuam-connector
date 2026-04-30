from __future__ import annotations

from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from src.dataframe_utils import normalize_dataframe
from src.datetime_utils import parse_datetime_like


def select_feature_frame(
    dataframe: pd.DataFrame,
    target_column: str,
    required_columns: List[str] | None = None,
    optional_columns: List[str] | None = None,
    time_column: str | None = None,
) -> pd.DataFrame:
    available = set(dataframe.columns)
    requested_columns: List[str] = []
    for column in (required_columns or []) + (optional_columns or []):
        if column != target_column and column in available and column not in requested_columns:
            requested_columns.append(column)
    if time_column and time_column in available and time_column != target_column and time_column not in requested_columns:
        requested_columns.append(time_column)
    if requested_columns:
        return dataframe[requested_columns].copy()
    return dataframe.drop(columns=[target_column]).copy()


def _expand_datetime_features(frame: pd.DataFrame, columns: List[str]) -> pd.DataFrame:
    transformed = frame.copy()
    for column in columns:
        parsed = parse_datetime_like(transformed[column])
        transformed[f"{column}__year"] = parsed.dt.year
        transformed[f"{column}__month"] = parsed.dt.month
        transformed[f"{column}__day"] = parsed.dt.day
        transformed[f"{column}__day_of_week"] = parsed.dt.dayofweek
        transformed[f"{column}__week_of_year"] = parsed.dt.isocalendar().week.astype("float")
        transformed[f"{column}__is_weekend"] = parsed.dt.dayofweek.isin([5, 6]).astype("float")
        transformed.drop(columns=[column], inplace=True)
    return transformed


def _text_to_length_features(frame: pd.DataFrame, columns: List[str]) -> pd.DataFrame:
    transformed = frame.copy()
    for column in columns:
        transformed[f"{column}__length"] = transformed[column].fillna("").astype(str).str.len()
        transformed.drop(columns=[column], inplace=True)
    return transformed


def prepare_features(
    dataframe: pd.DataFrame,
    target_column: str,
    required_columns: List[str] | None = None,
    optional_columns: List[str] | None = None,
    time_column: str | None = None,
) -> Tuple[pd.DataFrame, List[str], ColumnTransformer, Dict[str, List[str]]]:
    selected = select_feature_frame(dataframe, target_column, required_columns, optional_columns, time_column)
    features = normalize_dataframe(selected)

    datetime_columns = [
        column
        for column in features.columns
        if not pd.api.types.is_numeric_dtype(features[column])
        if parse_datetime_like(features[column]).notna().mean() > 0.8
    ]
    features = _expand_datetime_features(features, datetime_columns)

    numeric_columns = [column for column in features.columns if pd.api.types.is_numeric_dtype(features[column])]
    object_columns = [column for column in features.columns if not pd.api.types.is_numeric_dtype(features[column])]
    categorical_columns = [
        column
        for column in object_columns
        if features[column].fillna("unknown").nunique(dropna=True) <= max(20, len(features) // 4)
    ]
    text_columns = [column for column in object_columns if column not in categorical_columns]
    features = _text_to_length_features(features, text_columns)
    numeric_columns = [column for column in features.columns if pd.api.types.is_numeric_dtype(features[column])]
    categorical_columns = [column for column in features.columns if not pd.api.types.is_numeric_dtype(features[column])]

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "numeric",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scaler", StandardScaler())
                    ]
                ),
                numeric_columns,
            ),
            (
                "categorical",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="constant", fill_value="unknown")),
                        ("encoder", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                categorical_columns,
            ),
        ],
        remainder="drop",
    )

    return features, list(features.columns), preprocessor, {
        "numeric": numeric_columns,
        "categorical": categorical_columns,
        "datetime": datetime_columns,
        "text": text_columns,
    }
