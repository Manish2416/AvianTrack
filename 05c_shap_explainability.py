"""
05c_shap_explainability.py
AvianTrack — SHAP explainability for the final RF and XGBoost models

Spatial CV (05b) tells you how well the model generalizes; SHAP tells you
WHY it predicts what it predicts. These are different questions —
generalization is estimated via cross-validation, but the model you
actually explain here is refit on the FULL dataset (standard practice:
CV is for honestly measuring performance, not for producing the final
interpreted/deployed model).

Uses the env_landcover feature set by default, since that's the
better-performing set per the spatial-CV ablation — pass --feature-set
env_only if you want to explain that version instead.

OUTPUT
  <code>_shap_importance_rf.csv / _xgb.csv    mean |SHAP value| per feature
  <code>_shap_summary_rf.png / _xgb.png       beeswarm summary plots

Usage:
    python 05c_shap_explainability.py \
        --modeling-dataset bahgoo_modeling_dataset_with_folds.parquet \
        --code bahgoo \
        --outdir ./aviantrack_env \
        --feature-set env_landcover
"""

import argparse
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestClassifier

try:
    import xgboost as xgb
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

try:
    import shap
except ImportError:
    raise SystemExit("Install shap first: pip install shap")

METADATA_COLS = {
    "LON", "LAT", "PRESENCE", "SOURCE", "SPECIES_CODE",
    "land_cover_code", "land_cover_class", "block_id", "spatial_fold",
}


def _get_feature_columns(df: pd.DataFrame):
    return [c for c in df.columns if c not in METADATA_COLS and pd.api.types.is_numeric_dtype(df[c])]


def _positive_class_shap(shap_values):
    """Handles every shape TreeExplainer has returned across shap versions:
    - list of two (n_samples, n_features) arrays (older shap, binary clf)
    - 3D array (n_samples, n_features, n_classes) (newer shap, binary clf)
    - plain 2D array (n_samples, n_features) (e.g. XGBoost binary, or regression)
    """
    if isinstance(shap_values, list):
        return shap_values[1]
    arr = np.asarray(shap_values)
    if arr.ndim == 3:
        return arr[:, :, 1]
    return arr


def _build_feature_matrix(df: pd.DataFrame, env_cols, include_landcover: bool):
    X = df[env_cols].copy()
    if include_landcover:
        lc = df["land_cover_class"].fillna("unknown")
        lc_dummies = pd.get_dummies(lc, prefix="lc")
        X = pd.concat([X.reset_index(drop=True), lc_dummies.reset_index(drop=True)], axis=1)
    return X.astype(np.float64)


def run_shap(modeling_dataset_path: str, species_code: str, outdir: str, feature_set: str = "env_landcover"):
    outdir = Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    df = pd.read_parquet(modeling_dataset_path)
    env_cols = _get_feature_columns(df)
    X = _build_feature_matrix(df, env_cols, include_landcover=(feature_set == "env_landcover"))
    y = df["PRESENCE"].values

    # --- Random Forest ---
    rf = RandomForestClassifier(n_estimators=300, random_state=42, n_jobs=-1, class_weight="balanced")
    rf.fit(X, y)
    explainer_rf = shap.TreeExplainer(rf)
    shap_values_rf = explainer_rf.shap_values(X)
    sv_rf = _positive_class_shap(shap_values_rf)

    importance_rf = pd.DataFrame({
        "feature": X.columns,
        "mean_abs_shap": np.abs(sv_rf).mean(axis=0),
    }).sort_values("mean_abs_shap", ascending=False)
    importance_rf.to_csv(outdir / f"{species_code}_shap_importance_rf.csv", index=False)

    plt.figure()
    shap.summary_plot(sv_rf, X, show=False)
    plt.tight_layout()
    plt.savefig(outdir / f"{species_code}_shap_summary_rf.png", dpi=150)
    plt.close()
    print("Random Forest — top 10 features by mean |SHAP|:")
    print(importance_rf.head(10).to_string(index=False))

    # --- XGBoost ---
    if HAS_XGB:
        xgb_model = xgb.XGBClassifier(
            n_estimators=300, max_depth=6, learning_rate=0.05, eval_metric="logloss", random_state=42
        )
        xgb_model.fit(X, y)
        explainer_xgb = shap.TreeExplainer(xgb_model)
        sv_xgb = _positive_class_shap(explainer_xgb.shap_values(X))

        importance_xgb = pd.DataFrame({
            "feature": X.columns,
            "mean_abs_shap": np.abs(sv_xgb).mean(axis=0),
        }).sort_values("mean_abs_shap", ascending=False)
        importance_xgb.to_csv(outdir / f"{species_code}_shap_importance_xgb.csv", index=False)

        plt.figure()
        shap.summary_plot(sv_xgb, X, show=False)
        plt.tight_layout()
        plt.savefig(outdir / f"{species_code}_shap_summary_xgb.png", dpi=150)
        plt.close()
        print("\nXGBoost — top 10 features by mean |SHAP|:")
        print(importance_xgb.head(10).to_string(index=False))
    else:
        print("\nxgboost not installed — skipped SHAP for XGBoost. `pip install xgboost` to include it.")

    print(f"\nSaved importance CSVs and summary plots to {outdir}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--modeling-dataset", required=True)
    parser.add_argument("--code", required=True)
    parser.add_argument("--outdir", default="./aviantrack_env")
    parser.add_argument("--feature-set", default="env_landcover", choices=["env_only", "env_landcover"])
    args = parser.parse_args()

    run_shap(args.modeling_dataset, args.code, args.outdir, args.feature_set)
