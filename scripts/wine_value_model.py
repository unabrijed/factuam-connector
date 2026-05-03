import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score

def train_and_evaluate_wine_model(df: pd.DataFrame,
                                 target: str = "points",
                                 price_col: str = "price",
                                 country_col: str = "country",
                                 province_col: str = "province",
                                 variety_col: str = "variety",
                                 test_size: float = 0.2,
                                 random_state: int = 42):
    """
    Train a simple regression model to predict wine review points from price and
    categorical features: country, province, and variety.
    Returns predictions on the test set, RMSE, R^2, and a dataframe describing
    value by country-variety: average predicted_points / price.
    """
    # Basic validation
    required_cols = {target, price_col, country_col, province_col, variety_col}
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    X = df[[price_col, country_col, province_col, variety_col]]
    y = df[target]

    # Identify categorical and numeric columns
    cat_cols = [country_col, province_col, variety_col]
    num_cols = [price_col]

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),
            ("num", "passthrough", num_cols),
        ],
        remainder="drop",
    )

    model = RandomForestRegressor(
        n_estimators=200,
        random_state=random_state,
        n_jobs=-1
    )

    clf = Pipeline(steps=[("prep", preprocessor),
                          ("model", model)])

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state
    )

    clf.fit(X_train, y_train)
    preds = clf.predict(X_test)

    rmse = mean_squared_error(y_test, preds, squared=False)
    r2 = r2_score(y_test, preds)

    # Value per bottle: predicted points per price, higher is better
    # Compute on test set for interpretability
    test_values = pd.DataFrame({
        "price": X_test[price_col].values,
        "predicted_points": preds
    })
    test_values["value"] = test_values["predicted_points"] / test_values["price"]

    # Aggregate by country-variety if possible, calculating average value
    # Build a combined key from country and variety in X_test
    # We need the actual category values for country and variety from X_test
    country_vals = X_test[country_col].values
    variety_vals = X_test[variety_col].values
    key_series = pd.Series([f"{c}::{v}" for c, v in zip(country_vals, variety_vals)],
                           index=X_test.index)

    value_df = pd.DataFrame({"key": key_series, "value": preds / X_test[price_col].values})
    value_summary = value_df.groupby("key").mean().sort_values("value", ascending=False)

    return {
        "model": clf,
        "rmse": rmse,
        "r2": r2,
        "test_values": test_values.reset_index(drop=True),
        "value_summary": value_summary
    }

def predict_on_new_data(model_pipeline, df: pd.DataFrame,
                        price_col: str = "price",
                        country_col: str = "country",
                        province_col: str = "province",
                        variety_col: str = "variety"):
    """
    Use a trained pipeline to predict points on new data and compute value per price.
    Returns dataframe with predicted_points and value.
    """
    X = df[[price_col, country_col, province_col, variety_col]]
    preds = model_pipeline.predict(X)
    result = df.copy()
    result["predicted_points"] = preds
    result["value"] = result["predicted_points"] / result[price_col]
    return result

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python scripts/wine_value_model.py <path_to_csv>")
        sys.exit(1)
    path = sys.argv[1]
    df = pd.read_csv(path)
    res = train_and_evaluate_wine_model(df)
    print("RMSE:", res["rmse"])
    print("R^2:", res["r2"])
    # Show top 5 country-variety by average value
    print(res["value_summary"].head(5).to_string())
