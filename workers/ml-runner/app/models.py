from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class ValidateDatasetRequest(BaseModel):
    datasetPath: str
    targetColumn: str
    timeColumn: Optional[str] = None


class RunExperimentRequest(BaseModel):
    experimentId: str
    datasetId: str
    datasetPath: str
    plan: Dict[str, Any]
    attemptNumber: int = 1


class ArtifactEntry(BaseModel):
    artifactType: str
    name: str
    localPath: Optional[str] = None
    contentHash: str
    metadata: Dict[str, Any] = {}


class ValidationResponse(BaseModel):
    valid: bool
    rowCount: int
    columnCount: int
    missingValues: Dict[str, int]
    duplicateRows: int
    warnings: List[str]
    leakageDetected: bool = False
    inferredSchema: List[Dict[str, Any]]
