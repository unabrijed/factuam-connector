from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List
from uuid import uuid4

import numpy as np
import pandas as pd

from app.config import LOCAL_ARTIFACT_DIR
from src.artifact_writer import artifact_entry, write_dataframe, write_json, write_model
from src.backtest import build_backtest_report
from src.data_quality import validate_dataset
from src.dataset_builder import load_dataset
from src.evaluate import classification_metrics, compute_lift, ranking_metrics, regression_metrics
from src.feature_engineering import prepare_features
from src.logging_utils import get_logger
from src.report_writer import confidence_from_signals, summarize_selection
from src.train import build_baseline, build_model, build_pipeline, build_split
from src.utils import sha256_json

logger = get_logger("ml_runner.pipeline")


def _normalize_plan_payload(plan: Dict[str, Any]) -> Dict[str, Any]:
    nested = plan.get("experimentPlan")
    return nested if isinstance(nested, dict) else plan


def _prepare_target(dataframe: pd.DataFrame, plan: Dict[str, Any]):
    target = dataframe[plan["targetColumn"]]
    task_type = plan["taskType"]
    if task_type == "classification":
        categories = target.fillna("unknown").astype("category")
        return categories.cat.codes, {"labels": list(categories.cat.categories)}
    numeric_target = pd.to_numeric(target, errors="coerce")
    fallback = float(numeric_target.dropna().mean()) if numeric_target.dropna().shape[0] else 0.0
    return numeric_target.fillna(fallback), {}


def _evaluate(task_type: str, y_true, predictions, scores=None):
    if task_type in {"regression", "forecasting"}:
        return regression_metrics(y_true, predictions)
    if task_type == "classification":
        return classification_metrics(y_true, predictions, scores)
    return ranking_metrics(y_true, scores if scores is not None else predictions)


def _score_model(task_type: str, metrics: Dict[str, float]) -> float:
    if task_type in {"regression", "forecasting"}:
        return -metrics["mae"]
    if task_type == "classification":
        return metrics.get("f1", 0.0)
    return metrics.get("precision_at_k", 0.0)


def run_experiment_pipeline(
    experiment_id: str,
    dataset_id: str,
    dataset_path: str,
    plan: Dict[str, Any],
    attempt_number: int = 1,
):
    plan = _normalize_plan_payload(plan)
    artifact_dir = LOCAL_ARTIFACT_DIR / experiment_id / f"attempt-{attempt_number}"
    artifact_dir.mkdir(parents=True, exist_ok=True)
    logger.info(
        "run_started experiment_id=%s dataset_id=%s dataset_path=%s task_type=%s target=%s models=%s",
        experiment_id,
        dataset_id,
        dataset_path,
        plan.get("taskType"),
        plan.get("targetColumn"),
        plan.get("candidateModels"),
    )

    dataframe = load_dataset(dataset_path)
    logger.info(
        "dataset_loaded experiment_id=%s rows=%s columns=%s column_names=%s",
        experiment_id,
        len(dataframe),
        len(dataframe.columns),
        list(dataframe.columns),
    )
    data_quality = validate_dataset(dataframe, plan["targetColumn"], plan.get("splitConfig", {}).get("timeColumn"))
    if not data_quality["valid"]:
        logger.warning(
            "dataset_invalid experiment_id=%s warnings=%s",
            experiment_id,
            data_quality.get("warnings"),
        )
        raise ValueError("Dataset validation failed during experiment execution")

    target, target_metadata = _prepare_target(dataframe, plan)
    features, feature_columns, preprocessor, feature_manifest = prepare_features(
        dataframe,
        plan["targetColumn"],
        plan.get("requiredColumns"),
        plan.get("optionalColumns"),
        plan.get("splitConfig", {}).get("timeColumn"),
    )
    logger.info(
        "features_prepared experiment_id=%s feature_count=%s selected_features=%s manifest=%s",
        experiment_id,
        len(feature_columns),
        feature_columns,
        feature_manifest,
    )
    split = build_split(features, target, plan)
    logger.info(
        "split_built experiment_id=%s train_rows=%s test_rows=%s",
        experiment_id,
        len(split.X_train),
        len(split.X_test),
    )

    baseline_predictions, baseline_info, baseline_name = build_baseline(plan["taskType"], split.y_train, split.y_test)
    baseline_metrics = _evaluate(plan["taskType"], split.y_test, baseline_predictions)
    logger.info(
        "baseline_computed experiment_id=%s baseline_name=%s baseline_metrics=%s",
        experiment_id,
        baseline_name,
        baseline_metrics,
    )

    artifacts: List[Dict[str, Any]] = []
    raw_dataset_hash = write_dataframe(artifact_dir / "cleaned_dataset.csv", dataframe)
    artifacts.append(artifact_entry("cleaned_dataset", artifact_dir / "cleaned_dataset.csv", raw_dataset_hash))

    schema_hash = write_json(artifact_dir / "schema.json", data_quality["inferredSchema"])
    artifacts.append(artifact_entry("schema", artifact_dir / "schema.json", schema_hash))

    dq_hash = write_json(artifact_dir / "data_quality_report.json", data_quality)
    artifacts.append(artifact_entry("data_quality_report", artifact_dir / "data_quality_report.json", dq_hash))

    plan_hash = write_json(artifact_dir / "experiment_plan.json", plan)
    artifacts.append(artifact_entry("experiment_plan", artifact_dir / "experiment_plan.json", plan_hash))

    config_hash = write_json(artifact_dir / "training_config.json", {"plan": plan, "targetMetadata": target_metadata})
    artifacts.append(artifact_entry("training_config", artifact_dir / "training_config.json", config_hash))

    baseline_hash = write_json(artifact_dir / "baseline_metrics.json", baseline_metrics | baseline_info)
    artifacts.append(artifact_entry("baseline_metrics", artifact_dir / "baseline_metrics.json", baseline_hash))

    feature_manifest_hash = write_json(artifact_dir / "feature_manifest.json", feature_manifest)
    artifacts.append(artifact_entry("feature_manifest", artifact_dir / "feature_manifest.json", feature_manifest_hash))

    model_results: List[Dict[str, Any]] = []
    best_model = None
    best_pipeline = None
    best_score = float("-inf")

    for candidate in plan["candidateModels"]:
        model_id = str(uuid4())
        pipeline = build_pipeline(preprocessor, build_model(plan["taskType"], candidate))
        try:
            logger.info(
                "model_fit_started experiment_id=%s model=%s model_id=%s train_rows=%s feature_count=%s",
                experiment_id,
                candidate,
                model_id,
                len(split.X_train),
                len(feature_columns),
            )
            pipeline.fit(split.X_train, split.y_train)
            predictions = pipeline.predict(split.X_test)
            scores = None
            if plan["taskType"] == "classification" and hasattr(pipeline.named_steps["model"], "predict_proba"):
                probabilities = pipeline.predict_proba(split.X_test)
                scores = probabilities[:, 1] if probabilities.ndim == 2 and probabilities.shape[1] > 1 else probabilities.ravel()
            elif plan["taskType"] == "ranking":
                scores = predictions
            metrics = _evaluate(plan["taskType"], split.y_test, predictions, scores)
            score = _score_model(plan["taskType"], metrics)
            logger.info(
                "model_fit_completed experiment_id=%s model=%s model_id=%s metrics=%s score=%s",
                experiment_id,
                candidate,
                model_id,
                metrics,
                score,
            )
            model_path = artifact_dir / f"{candidate}.joblib"
            artifact_hash = write_model(model_path, pipeline)
            model_results.append(
                {
                    "modelId": model_id,
                    "modelName": candidate,
                    "modelType": plan["taskType"],
                    "targetColumn": plan["targetColumn"],
                    "featureColumns": feature_columns,
                    "metrics": metrics,
                    "artifactPath": str(model_path),
                    "artifactHash": artifact_hash,
                    "status": "completed",
                }
            )
            artifacts.append(artifact_entry("model_artifact", model_path, artifact_hash, {"modelName": candidate}))
            if score > best_score:
                best_score = score
                best_model = model_results[-1]
                best_pipeline = pipeline
        except Exception as exc:
            logger.exception(
                "model_fit_failed experiment_id=%s model=%s model_id=%s",
                experiment_id,
                candidate,
                model_id,
            )
            model_results.append(
                {
                    "modelId": model_id,
                    "modelName": candidate,
                    "modelType": plan["taskType"],
                    "targetColumn": plan["targetColumn"],
                    "featureColumns": feature_columns,
                    "metrics": {},
                    "status": "failed",
                    "failureReason": str(exc),
                }
            )

    if not best_model or best_pipeline is None:
        logger.error("all_models_failed experiment_id=%s", experiment_id)
        raise RuntimeError("All candidate models failed")

    metrics_hash = write_json(artifact_dir / "model_metrics.json", model_results)
    artifacts.append(artifact_entry("model_metrics", artifact_dir / "model_metrics.json", metrics_hash))

    backtest = build_backtest_report(
        task_type=plan["taskType"],
        method=plan.get("backtestMethod", "random_split"),
        baseline_name=baseline_name,
        baseline_metrics=baseline_metrics,
        best_model_name=best_model["modelName"],
        model_metrics=best_model["metrics"],
    )
    backtest_hash = write_json(artifact_dir / "backtest_report.json", backtest)
    backtest["reportHash"] = backtest_hash
    backtest["reportPath"] = str(artifact_dir / "backtest_report.json")
    artifacts.append(artifact_entry("backtest_report", artifact_dir / "backtest_report.json", backtest_hash))

    selection_reason = summarize_selection(best_model["modelName"], best_model["metrics"], baseline_name)
    confidence = confidence_from_signals(data_quality["rowCount"], backtest["liftOverBaseline"], data_quality["warnings"])
    logger.info(
        "run_completed experiment_id=%s best_model=%s confidence=%s lift=%s",
        experiment_id,
        best_model["modelName"],
        confidence,
        backtest["liftOverBaseline"],
    )

    return {
        "experimentId": experiment_id,
        "datasetId": dataset_id,
        "taskType": plan["taskType"],
        "targetColumn": plan["targetColumn"],
        "models": model_results,
        "bestModel": {
            "modelName": best_model["modelName"],
            "modelId": best_model["modelId"],
            "reason": selection_reason,
            "metrics": best_model["metrics"],
        },
        "baseline": {"modelName": baseline_name, "metrics": baseline_metrics},
        "backtest": backtest,
        "confidence": confidence,
        "dataQuality": data_quality,
        "artifacts": artifacts,
        "cleanedDatasetPath": str(artifact_dir / "cleaned_dataset.csv"),
        "featureManifestPath": str(artifact_dir / "feature_manifest.json"),
    }
