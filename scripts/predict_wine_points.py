#!/usr/bin/env python3
"""
Regression pipeline to predict wine points from features:
- price (numeric)
- country (categorical)
- province (text)
- variety (text)
Also computes value segments by country-variety and overall price-per-point metrics.
"""
import argparse
import json
from typing import Dict, Any

import pandas as pd
from sklearn.model_selection import KFold
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, r2_score


def load_and_prepare(input_csv: str) -> pd.DataFrame:
    df = pd.read_csv(input_csv)
    # Drop artificial index column if present
    if df.columns.size > 0:
        first_col = df.columns[0]
        if first_col in ('', 'Unnamed: 0', 'index'):
            df = df.drop(columns=[first_col])
    required = ['price', 'country', 'province', 'variety', 'points']
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing} in dataset")
    # Deduplicate rows
    before = len(df)
    df = df.drop_duplicates()
    after = len(df)
    if before != after:
        print(f"Deduplicated dataset: {before - after} duplicate rows removed.")
    # Drop rows with missing required fields
    df = df.dropna(subset=required)
    return df


def _build_preprocessor(df: pd.DataFrame) -> ColumnTransformer:
    # Dynamic categorical columns (include region_1/region_2 if present)
    cat_cols = ['country', 'province', 'variety']
    for c in ('region_1', 'region_2'):
        if c in df.columns:
            cat_cols.append(c)
    return ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), cat_cols),
            ('num', 'passthrough', ['price'])
        ],
        remainder='drop',
    )


def _evaluate_model(model, X, y, n_splits: int = 5) -> Dict[str, Any]:
    # Cross-validated RMSE and R2
    kf = KFold(n_splits=n_splits, shuffle=True, random_state=42)
    rmses = []
    r2s = []
    for train_idx, test_idx in kf.split(X):
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
        # Fit a fresh clone of the pipeline by constructing anew
        prep = _build_preprocessor(X_train)
        pipe = Pipeline(steps=[('prep', prep), ('model', model)])
        pipe.fit(X_train, y_train)
        preds = pipe.predict(X_test)
        rmse = mean_squared_error(y_test, preds, squared=False)
        rmses.append(rmse)
        r2s.append(r2_score(y_test, preds))
    return {
        'rmse_mean': float(sum(rmses) / len(rmses)),
        'rmse_per_fold': rmses,
        'r2_mean': float(sum(r2s) / len(r2s)),
        'r2_per_fold': r2s,
    }


def _build_models():
    models = {
        'Ridge-L2': Ridge(alpha=1.0),  # linear with L2 regularization
        'RandomForest': RandomForestRegressor(
            n_estimators=200, random_state=42, n_jobs=-1
        ),
        'GradientBoosting': GradientBoostingRegressor(
            n_estimators=300, learning_rate=0.05, max_depth=3, random_state=42
        ),
    }
    return models


def train_and_evaluate(df: pd.DataFrame, use_cv: bool = True, cv_folds: int = 5) -> Dict[str, Any]:
    X = df[['price', 'country', 'province', 'variety']]
    y = df['points']
    # Build base preprocessor (handles region_1/region_2 if present)
    base_prep = _build_preprocessor(X)
    results = {}
    models = _build_models()
    # If using cross-validation, evaluate each model with CV
    if use_cv:
        for name, model in models.items():
            # Build a fresh pipeline for evaluation, using the same preprocessing
            # We embed the preprocessor inside the evaluation function for isolation
            eval_result = _evaluate_model(model, X, y, n_splits=cv_folds)
            results[name] = eval_result
    else:
        # Simple train/test split for quick baseline
        from sklearn.model_selection import train_test_split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        for name, model in models.items():
            pipe = Pipeline(steps=[('prep', base_prep), ('model', model)])
            pipe.fit(X_train, y_train)
            preds = pipe.predict(X_test)
            rmse = mean_squared_error(y_test, preds, squared=False)
            r2 = r2_score(y_test, preds)
            results[name] = {'rmse_mean': float(rmse), 'r2_mean': float(r2), 'rmse_per_fold': [rmse], 'r2_per_fold': [r2]}
    return {'results_by_model': results, 'feature_preprocessor': base_prep}


def main():
    parser = argparse.ArgumentParser(description="Regress points from wine features and identify value segments.")
    parser.add_argument('input_csv', help="Path to input CSV dataset.")
    parser.add_argument('--output-json', help="Optional path to write results as JSON.")
    parser.add_argument('--use-cv', action='store_true', default=True, help="Use cross-validation to evaluate models (default: true)")
    parser.add_argument('--cv-folds', type=int, default=5, help="Number of CV folds (default: 5)")
    parser.add_argument('--top-n', type=int, default=20, help="Top N segments to report (default: 20)")
    parser.add_argument('--predict', action='store_true', help="Also output predictions per row in results (requires --output-json)")
    args = parser.parse_args()

    df = load_and_prepare(args.input_csv)
    train_eval = train_and_evaluate(df, use_cv=args.use_cv, cv_folds=args.cv_folds)
    results_by_model = train_eval.get('results_by_model', {})

    # Fit the best model on full data and generate predictions
    # Select best by RMSE mean (lowest)
    best_model_name = None
    best_rmse = None
    # If we used CV, extract RMSE means
    for name, meta in results_by_model.items():
        if best_rmse is None or meta.get('rmse_mean', float('inf')) < best_rmse:
            best_rmse = meta.get('rmse_mean', float('inf'))
            best_model_name = name
    # Build final pipeline for full training
    X_full = df[['price', 'country', 'province', 'variety']]
    y_full = df['points']
    final_prep = _build_preprocessor(X_full)
    best_model = _build_models()[best_model_name]
    final_pipe = Pipeline(steps=[('prep', final_prep), ('model', best_model)])
    final_pipe.fit(X_full, y_full)
    df = df.copy()
    df['pred_points'] = final_pipe.predict(X_full)

    # Value metrics
    df['value_score'] = df['points'] / df['price'].replace({0: pd.NA}).astype('float64')

    # Segments by country-variety
    segs = (
        df.groupby(['country', 'variety'], as_index=False)
        .agg(mean_value_score=('value_score', 'mean'),
              median_value_score=('value_score', 'median'),
              count=('value_score', 'size'),
              mean_price=('price', 'mean'),
              median_price=('price', 'median'),
              mean_points=('points', 'mean'))
        .dropna(subset=['mean_value_score'])
    )
    segs = segs.sort_values(by='mean_value_score', ascending=False)
    top_value_segments = segs.head(args.top_n).to_dict('records')

    # Price per point metric for segments (value-oriented filtering)
    segs_ppp = (
        df.assign(price_per_point=lambda d: d['price'] / d['points'].replace({0: pd.NA}).astype('float64'))
        .groupby(['country', 'variety'], as_index=False)
        .agg(mean_price_per_point=('price_per_point', 'mean'), median_price_per_point=('price_per_point', 'median'), count=('price_per_point', 'size'))
        .dropna(subset=['mean_price_per_point'])
        .sort_values(by='mean_price_per_point', ascending=True)
    )
    top_min_ppp = segs_ppp.head(args.top_n).to_dict('records')

    output = {
        'best_model': best_model_name,
        'model_performance': results_by_model,
        'predictions': df[['price', 'country', 'province', 'variety', 'points', 'pred_points']].to_dict('records') if args.predict and args.output_json else None,
        'top_value_segments': top_value_segments,
        'top_lowest_price_per_point_segments': top_min_ppp,
    }

    if args.output_json:
        with open(args.output_json, 'w') as f:
            json.dump(output, f, indent=2)
    else:
        # Pretty print a concise summary
        print(json.dumps({
            'best_model': best_model_name,
            'best_rmse': best_rmse,
            'top_value_segments_count': len(top_value_segments),
        }, indent=2))

    # If caller wants predictions in console, we can optionally print a small sample
    return output


if __name__ == '__main__':
    main()
