from __future__ import annotations

from typing import Dict, List


def confidence_from_signals(row_count: int, lift: float, warnings: List[str]) -> str:
    if row_count >= 1000 and lift >= 20 and not warnings:
        return "high"
    if row_count >= 100 and lift >= 10 and len(warnings) <= 2:
        return "medium"
    return "low"


def summarize_selection(best_model_name: str, metrics: Dict[str, float], baseline_name: str) -> str:
    primary_metric = next(iter(metrics.items()))
    if not primary_metric:
        return f"Selected {best_model_name} over {baseline_name}."
    name, value = primary_metric
    return f"Selected {best_model_name} because it achieved the best {name} ({value:.4f}) against baseline {baseline_name}."
