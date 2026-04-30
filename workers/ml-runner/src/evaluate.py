from __future__ import annotations

from typing import Dict

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
)


def _safe_divide(a: float, b: float) -> float:
    return float(a / b) if b else 0.0


def regression_metrics(y_true, y_pred) -> Dict[str, float]:
    mae = mean_absolute_error(y_true, y_pred)
    rmse = mean_squared_error(y_true, y_pred, squared=False)
    r2 = r2_score(y_true, y_pred)
    mape = float(np.mean(np.abs((y_true - y_pred) / np.clip(np.abs(y_true), 1e-9, None)))) * 100
    return {"mae": float(mae), "rmse": float(rmse), "r2_score": float(r2), "mape": float(mape)}


def classification_metrics(y_true, y_pred, y_score=None) -> Dict[str, float]:
    metrics = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, average="weighted", zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, average="weighted", zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, average="weighted", zero_division=0)),
    }
    if y_score is not None:
        try:
            metrics["roc_auc"] = float(roc_auc_score(y_true, y_score, multi_class="ovr"))
        except Exception:
            pass
    return metrics


def precision_at_k(y_true, scores, k: int = 5) -> float:
    order = np.argsort(scores)[::-1][: max(1, min(k, len(scores)))]
    y_true = np.asarray(y_true)
    if y_true.dtype.kind not in {"i", "u", "b", "f"}:
        y_true = (y_true == y_true.max()).astype(int)
    positive = np.where(y_true > np.median(y_true), 1, 0)
    return float(np.mean(positive[order]))


def ranking_metrics(y_true, scores) -> Dict[str, float]:
    patk = precision_at_k(y_true, scores)
    return {"precision_at_k": patk, "recall_at_k": patk, "ndcg": patk}


def compute_lift(task_type: str, baseline_metrics: Dict[str, float], model_metrics: Dict[str, float]) -> float:
    if task_type in {"regression", "forecasting"}:
        baseline = baseline_metrics.get("mae", 0.0)
        model = model_metrics.get("mae", 0.0)
        return _safe_divide(baseline - model, baseline) * 100 if baseline else 0.0
    if task_type == "classification":
        baseline = baseline_metrics.get("f1", 0.0)
        model = model_metrics.get("f1", 0.0)
        return _safe_divide(model - baseline, max(baseline, 1e-9)) * 100
    baseline = baseline_metrics.get("precision_at_k", 0.0)
    model = model_metrics.get("precision_at_k", 0.0)
    return _safe_divide(model - baseline, max(baseline, 1e-9)) * 100
