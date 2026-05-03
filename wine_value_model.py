import pandas as pd
from typing import Tuple, Optional
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import numpy as np
import joblib

def train_model(df: pd.DataFrame,
                test_size: float = 0.2,
                random_state: int = 42,
                n_estimators: int = 200) -> Tuple[Pipeline, dict]:
    """
    Train a regression model to predict wine 'points' from price and
    simple categorical features.
    Features used: price, country, province, region_2, variety
    Returns:
      (pipeline, metrics) where metrics contains MAE and R^2 on a held-out split.
    """
    required = ['points','price','country','province','region_2','variety']
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Dataset missing required columns: {missing}")

    X = df[['price','country','province','region_2','variety']].copy()
    y = df['points']
    cat_cols = ['country','province','region_2','variety']

    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), cat_cols)
        ],
        remainder='passthrough'
    )

    model = RandomForestRegressor(
        n_estimators=n_estimators,
        random_state=random_state,
        n_jobs=-1
    )

    pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                               ('model', model)])

    X_train, X_valid, y_train, y_valid = train_test_split(X, y, test_size=test_size, random_state=random_state)
    pipeline.fit(X_train, y_train)
    preds = pipeline.predict(X_valid)
    mae = mean_absolute_error(y_valid, preds)
    r2 = r2_score(y_valid, preds)
    metrics = {'mae': float(mae), 'r2': float(r2)}
    return pipeline, metrics

def predict_points(model: Pipeline, df: pd.DataFrame) -> np.ndarray:
    """
    Predict wine points for the given dataframe using the trained model.
    Expects columns: price, country, province, region_2, variety
    """
    required = ['price','country','province','region_2','variety']
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Dataset missing required columns for prediction: {missing}")
    X = df[['price','country','province','region_2','variety']].copy()
    return model.predict(X)

def value_segments_by_group(df: pd.DataFrame, top_n: int = 10) -> pd.DataFrame:
    """
    Compute value-for-money segments by country and variety.
    Value metric = mean(points / price) per group.
    Returns top_n groups sorted by value_metric descending.
    Requires: price, points, country, variety
    """
    required = ['points','price','country','variety']
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Dataset missing required columns for value segmentation: {missing}")

    df = df.copy()
    # Avoid division by zero
    df['price_safe'] = df['price'].replace({0: np.nan})
    df['value_metric'] = df['points'] / df['price_safe']

    group = (df
             .groupby(['country','variety'], as_index=False)
             .agg({'value_metric':'mean'}))
    group = group.sort_values('value_metric', ascending=False).head(top_n)
    return group

if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print("Usage: python wine_value_model.py <path_to_csv>")
        sys.exit(1)
    path = sys.argv[1]
    df = pd.read_csv(path)
    model, metrics = train_model(df)
    print("Training metrics:", metrics)
    joblib.dump(model, "wine_value_model.joblib")
    print("Model saved to wine_value_model.joblib")
