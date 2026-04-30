from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from src.datetime_utils import parse_datetime_like

try:  # pragma: no cover - optional import for environments without xgboost
    from xgboost import XGBClassifier, XGBRegressor
except Exception:  # pragma: no cover
    XGBClassifier = None
    XGBRegressor = None


@dataclass
class SplitData:
    X_train: pd.DataFrame
    X_test: pd.DataFrame
    y_train: Any
    y_test: Any


def build_split(features: pd.DataFrame, target, plan: Dict[str, Any]) -> SplitData:
    task_type = plan["taskType"]
    method = plan.get("backtestMethod", "random_split")
    split_config = plan.get("splitConfig", {})
    test_size = split_config.get("testSize", 0.2)
    train_size = split_config.get("trainSize")

    if method in {"time_split", "walk_forward"} and split_config.get("timeColumn") and split_config["timeColumn"] in features.columns:
        ordered = features.assign(__target=target)
        ordered[split_config["timeColumn"]] = parse_datetime_like(ordered[split_config["timeColumn"]])
        ordered = ordered.sort_values(split_config["timeColumn"]).dropna(subset=[split_config["timeColumn"]])
        split_index = int(len(ordered) * (train_size or 0.8))
        train_frame = ordered.iloc[:split_index]
        test_frame = ordered.iloc[split_index:]
        return SplitData(
            X_train=train_frame.drop(columns=["__target"]),
            X_test=test_frame.drop(columns=["__target"]),
            y_train=train_frame["__target"],
            y_test=test_frame["__target"],
        )

    stratify = None
    if task_type == "classification":
        target_series = pd.Series(target)
        class_counts = target_series.value_counts(dropna=False)
        if len(class_counts) > 1 and int(class_counts.min()) >= 2:
            stratify = target
    X_train, X_test, y_train, y_test = train_test_split(
        features,
        target,
        test_size=test_size,
        train_size=train_size,
        random_state=42,
        stratify=stratify,
    )
    return SplitData(X_train=X_train, X_test=X_test, y_train=y_train, y_test=y_test)


def build_baseline(task_type: str, y_train, y_test) -> Tuple[np.ndarray, Dict[str, float], str]:
    if task_type in {"regression", "forecasting", "ranking"}:
        baseline_value = float(pd.Series(y_train).mean())
        return np.full(len(y_test), baseline_value), {"baseline_value": baseline_value}, "mean_target_baseline"

    majority = pd.Series(y_train).mode().iloc[0]
    return np.full(len(y_test), majority), {"baseline_value": float(majority) if str(majority).isdigit() else 0.0}, "majority_class_baseline"


def build_model(task_type: str, candidate: str):
    if task_type in {"regression", "forecasting", "ranking"}:
        mapping = {
            "linear_regression": LinearRegression(),
            "random_forest": RandomForestRegressor(n_estimators=200, random_state=42),
            "random_forest_regressor": RandomForestRegressor(n_estimators=200, random_state=42),
            "xgboost": XGBRegressor(n_estimators=200, random_state=42, objective="reg:squarederror") if XGBRegressor else RandomForestRegressor(n_estimators=300, random_state=42),
            "xgboost_regressor": XGBRegressor(n_estimators=200, random_state=42, objective="reg:squarederror") if XGBRegressor else RandomForestRegressor(n_estimators=300, random_state=42),
        }
    else:
        mapping = {
            "logistic_regression": LogisticRegression(max_iter=1000),
            "random_forest": RandomForestClassifier(n_estimators=200, random_state=42),
            "random_forest_classifier": RandomForestClassifier(n_estimators=200, random_state=42),
            "xgboost": XGBClassifier(n_estimators=200, random_state=42, eval_metric="logloss") if XGBClassifier else RandomForestClassifier(n_estimators=300, random_state=42),
            "xgboost_classifier": XGBClassifier(n_estimators=200, random_state=42, eval_metric="logloss") if XGBClassifier else RandomForestClassifier(n_estimators=300, random_state=42),
        }
    if candidate in mapping:
        return mapping[candidate]
    fallback_key = "random_forest" if "random_forest" in mapping else next(iter(mapping))
    return mapping[fallback_key]


def build_pipeline(preprocessor, model) -> Pipeline:
    return Pipeline([("preprocessor", preprocessor), ("model", model)])
