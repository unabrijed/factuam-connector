from __future__ import annotations

import pandas as pd

from src.dataframe_utils import normalize_dataframe

def load_dataset(dataset_path: str) -> pd.DataFrame:
    last_error: Exception | None = None
    for encoding in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            dataframe = pd.read_csv(
                dataset_path,
                encoding=encoding,
                keep_default_na=True,
                na_values=["", " ", "NA", "N/A", "NaN", "NULL", "None", "null", "none"],
            )
            return normalize_dataframe(dataframe)
        except UnicodeDecodeError as exc:
            last_error = exc
    if last_error is not None:
        raise last_error
    return normalize_dataframe(pd.read_csv(dataset_path))
