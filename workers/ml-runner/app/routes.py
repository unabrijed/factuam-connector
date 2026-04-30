from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models import RunExperimentRequest, ValidateDatasetRequest
from src.dataset_builder import load_dataset
from src.data_quality import validate_dataset
from src.logging_utils import get_logger
from src.pipeline import run_experiment_pipeline

router = APIRouter(prefix="/ml")
logger = get_logger("ml_runner.routes")


@router.post("/validate-dataset")
def validate_dataset_route(payload: ValidateDatasetRequest):
    logger.info(
        "validate_dataset_request dataset_path=%s target_column=%s time_column=%s",
        payload.datasetPath,
        payload.targetColumn,
        payload.timeColumn,
    )
    dataframe = load_dataset(payload.datasetPath)
    report = validate_dataset(dataframe, payload.targetColumn, payload.timeColumn)
    logger.info(
        "validate_dataset_response dataset_path=%s valid=%s warnings=%s",
        payload.datasetPath,
        report.get("valid"),
        report.get("warnings"),
    )
    return report


@router.post("/run-experiment")
def run_experiment_route(payload: RunExperimentRequest):
    try:
        logger.info(
            "run_experiment_request experiment_id=%s dataset_id=%s dataset_path=%s",
            payload.experimentId,
            payload.datasetId,
            payload.datasetPath,
        )
        return run_experiment_pipeline(
            experiment_id=payload.experimentId,
            dataset_id=payload.datasetId,
            dataset_path=payload.datasetPath,
            plan=payload.plan,
            attempt_number=payload.attemptNumber,
        )
    except Exception as exc:  # pragma: no cover - surfaced to API caller
        logger.exception(
            "run_experiment_failed experiment_id=%s dataset_id=%s",
            payload.experimentId,
            payload.datasetId,
        )
        raise HTTPException(status_code=500, detail=str(exc)) from exc
