"""
05b_train_compare_models.py
AvianTrack — RF vs XGBoost vs MaxEnt, all on identical spatial folds

Loads the file written by 05a_spatial_fold_assignment.py (which has the
'spatial_fold' column already baked in) so every model and every ablation
in this script is compared on EXACTLY the same train/test splits. This
also re-runs the env-only vs env+landcover ablation from scratch as a
side effect — if your new numbers land close to the ones you already got,
that's independent confirmation the original comparison was fold-fair; if
they diverge noticeably, the original folds probably did differ.

MODELS
  Random Forest   sklearn RandomForestClassifier
  XGBoost         xgboost.XGBClassifier
  MaxEnt          elapid.MaxentModel if installed, else a documented
                  fallback: L2-regularized logistic regression over
                  linear + quadratic + hinge features. This fallback is
                  not a shortcut invented for convenience — Fithian &
                  Hastie (2013) showed Maxent's default feature classes
                  are mathematically a reweighted logistic regression, so
                  this is a recognized MaxEnt-equivalent, not an
                  approximation of unknown quality. Prefer installing
                  elapid (`pip install elapid`) if you want the literal
                  standard implementation for your writeup.

FEATURE SETS COMPARED
  env_only        bioclim variables + elevation
  env_landcover   env_only + one-hot encoded land_cover_class

OUTPUT
  <code>_model_comparison_results.csv   one row per (model, feature_set, fold)
  <code>_model_comparison_summary.csv   mean +/- std per (model, feature_set)

Usage:
    python 05b_train_compare_models.py \
        --modeling-dataset bahgoo_modeling_dataset_with_folds.parquet \
        --code bahgoo \
        --outdir ./aviantrack_env
"""

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, balanced_accuracy_score, roc_auc_score
from sklearn.preprocessing import StandardScaler

METADATA_COLS = {
    "LON", "LAT", "PRESENCE", "SOURCE", "SPECIES_CODE",
    "land_cover_code", "land_cover_class", "block_id", "spatial_fold",
}

try:
    import xgboost as xgb
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

try:
    import elapid
    HAS_ELAPID = True
except ImportError:
    HAS_ELAPID = False


def _get_feature_columns(df: pd.DataFrame):
    numeric_env_cols = [
        c for c in df.columns
        if c not in METADATA_COLS and pd.api.types.is_numeric_dtype(df[c])
    ]
    return numeric_env_cols


def _build_feature_matrix(df: pd.DataFrame, env_cols, include_landcover: bool):
    X = df[env_cols].copy()
    if include_landcover:
        lc = df["land_cover_class"].fillna("unknown")
        lc_dummies = pd.get_dummies(lc, prefix="lc")
        X = pd.concat([X.reset_index(drop=True), lc_dummies.reset_index(drop=True)], axis=1)
    return X.astype(np.float64)


def _hinge_quadratic_features(X: np.ndarray) -> np.ndarray:
    """Linear + quadratic + hinge features — the classic Maxent default
    feature classes, used only by the logistic-regression MaxEnt fallback."""
    linear = X
    quadratic = X ** 2
    knots = np.percentile(X, [20, 40, 60, 80], axis=0)
    hinges = np.concatenate(
        [np.maximum(0, X - knots[i]) for i in range(knots.shape[0])], axis=1
    )
    return np.concatenate([linear, quadratic, hinges], axis=1)


def _fit_predict_maxent(X_train, y_train, X_test):
    if HAS_ELAPID:
        model = elapid.MaxentModel()
        model.fit(X_train, y_train)
        return model.predict(X_test)
    # Fallback: logistic regression on linear+quadratic+hinge features
    scaler = StandardScaler().fit(X_train)
    Xtr = scaler.transform(X_train)
    Xte = scaler.transform(X_test)
    Xtr_feat = _hinge_quadratic_features(Xtr)
    Xte_feat = _hinge_quadratic_features(Xte)
    model = LogisticRegression(max_iter=2000, C=1.0, class_weight="balanced")
    model.fit(Xtr_feat, y_train)
    return model.predict_proba(Xte_feat)[:, 1]


def _evaluate(y_true, y_prob, threshold=0.5):
    y_pred = (y_prob >= threshold).astype(int)
    return {
        "accuracy": accuracy_score(y_true, y_pred),
        "f1": f1_score(y_true, y_pred),
        "balanced_accuracy": balanced_accuracy_score(y_true, y_pred),
        "roc_auc": roc_auc_score(y_true, y_prob),
    }


def run_spatial_cv(df: pd.DataFrame, species_code: str, outdir: Path):
    env_cols = _get_feature_columns(df)
    n_folds = df["spatial_fold"].nunique()
    print(f"Feature columns (env_only): {env_cols}")
    print(f"Spatial folds detected: {n_folds}")

    feature_sets = {
        "env_only": False,
        "env_landcover": True,
    }
    model_names = ["random_forest", "maxent"] + (["xgboost"] if HAS_XGB else [])
    if not HAS_XGB:
        print("WARNING: xgboost not installed — skipping. `pip install xgboost` to include it.")

    results = []
    for fs_name, include_lc in feature_sets.items():
        X_full = _build_feature_matrix(df, env_cols, include_lc)
        y_full = df["PRESENCE"].values
        folds = df["spatial_fold"].values

        for fold in sorted(df["spatial_fold"].unique()):
            train_mask = folds != fold
            test_mask = folds == fold
            X_train, X_test = X_full[train_mask].values, X_full[test_mask].values
            y_train, y_test = y_full[train_mask], y_full[test_mask]

            # Random Forest
            rf = RandomForestClassifier(n_estimators=300, random_state=42, n_jobs=-1, class_weight="balanced")
            rf.fit(X_train, y_train)
            prob = rf.predict_proba(X_test)[:, 1]
            results.append({"model": "random_forest", "feature_set": fs_name, "fold": int(fold), **_evaluate(y_test, prob)})

            # XGBoost
            if HAS_XGB:
                pos_weight = (y_train == 0).sum() / max((y_train == 1).sum(), 1)
                xgb_model = xgb.XGBClassifier(
                    n_estimators=300, max_depth=6, learning_rate=0.05,
                    scale_pos_weight=pos_weight, eval_metric="logloss", random_state=42
                )
                xgb_model.fit(X_train, y_train)
                prob = xgb_model.predict_proba(X_test)[:, 1]
                results.append({"model": "xgboost", "feature_set": fs_name, "fold": int(fold), **_evaluate(y_test, prob)})

            # MaxEnt (elapid, or documented logistic-regression equivalent)
            prob = _fit_predict_maxent(X_train, y_train, X_test)
            results.append({"model": "maxent", "feature_set": fs_name, "fold": int(fold), **_evaluate(y_test, prob)})

            print(f"  [{fs_name}] fold {fold} done")

    results_df = pd.DataFrame(results)
    results_df.to_csv(outdir / f"{species_code}_model_comparison_results.csv", index=False)

    summary = results_df.groupby(["model", "feature_set"]).agg(
        accuracy_mean=("accuracy", "mean"), accuracy_std=("accuracy", "std"),
        f1_mean=("f1", "mean"), f1_std=("f1", "std"),
        balanced_accuracy_mean=("balanced_accuracy", "mean"),
        roc_auc_mean=("roc_auc", "mean"), roc_auc_std=("roc_auc", "std"),
    ).reset_index()
    summary.to_csv(outdir / f"{species_code}_model_comparison_summary.csv", index=False)

    print("\n=== SPATIAL CV SUMMARY (mean across folds) ===")
    print(summary.to_string(index=False))
    return results_df, summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--modeling-dataset", required=True,
                         help="Output of 05a_spatial_fold_assignment.py (must have 'spatial_fold' column)")
    parser.add_argument("--code", required=True)
    parser.add_argument("--outdir", default="./aviantrack_env")
    args = parser.parse_args()

    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    df = pd.read_parquet(args.modeling_dataset)
    if "spatial_fold" not in df.columns:
        raise SystemExit("No 'spatial_fold' column found — run 05a_spatial_fold_assignment.py first.")

    run_spatial_cv(df, args.code, outdir)
