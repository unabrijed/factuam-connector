from __future__ import annotations

from typing import Dict, Any

from src.evaluate import compute_lift


def build_backtest_report(task_type: str, method: str, baseline_name: str, baseline_metrics: Dict[str, float], best_model_name: str, model_metrics: Dict[str, float]) -> Dict[str, Any]:
    lift = compute_lift(task_type, baseline_metrics, model_metrics)
    return {
        "backtestType": method,
        "baselineName": baseline_name,
        "baselineMetrics": baseline_metrics,
        "bestModelName": best_model_name,
        "modelMetrics": model_metrics,
        "liftOverBaseline": float(lift),
        "report": {
            "summary": f"{best_model_name} achieved {lift:.2f}% lift over {baseline_name}",
            "taskType": task_type,
            "method": method,
            "baselineMetrics": baseline_metrics,
            "modelMetrics": model_metrics,
        },
    }
