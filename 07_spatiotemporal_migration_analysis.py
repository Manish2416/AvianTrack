
"""
AvianTrack — Step 9: Spatiotemporal Distribution & Migration Analysis

Uses ONLY:
    bahgoo_observations_with_suitability.parquet

This stage performs descriptive analysis only.
It does NOT retrain or modify any ML models.
"""

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN


EARTH_RADIUS_KM = 6371.0


def month_to_season(month: int) -> str:
    """Convert calendar month to a four-season grouping."""

    if month in (12, 1, 2):
        return "Winter"

    if month in (3, 4, 5):
        return "Spring"

    if month in (6, 7, 8):
        return "Summer"

    return "Autumn"


def cluster_hotspots(
    df_season: pd.DataFrame,
    eps_km: float = 100,
    min_samples: int = 15
):
    """
    Identify spatial observation hotspots using DBSCAN.

    Haversine distance is used so clustering is based on
    geographic distance rather than degrees of latitude/longitude.
    """

    if len(df_season) < min_samples:
        return pd.DataFrame()

    coords_rad = np.radians(
        df_season[["LAT", "LON"]].values
    )

    labels = DBSCAN(
        eps=eps_km / EARTH_RADIUS_KM,
        min_samples=min_samples,
        metric="haversine"
    ).fit(coords_rad).labels_

    temp = df_season.copy()
    temp["_cluster"] = labels

    rows = []

    for cluster_id, group in temp[
        temp["_cluster"] != -1
    ].groupby("_cluster"):

        rows.append({
            "cluster_id": int(cluster_id),
            "n_observations": int(len(group)),
            "centroid_lat": float(group["LAT"].mean()),
            "centroid_lon": float(group["LON"].mean()),
            "mean_ensemble_suitability": float(
                group["ensemble_suitability"].mean()
            ),
        })

    if not rows:
        return pd.DataFrame()

    return (
        pd.DataFrame(rows)
        .sort_values(
            "n_observations",
            ascending=False
        )
        .reset_index(drop=True)
    )


def run_analysis(
    overlay_path: str,
    species_code: str,
    outdir: str,
    hotspot_eps_km: float = 100,
    hotspot_min_samples: int = 15
):

    outdir = Path(outdir)
    outdir.mkdir(
        parents=True,
        exist_ok=True
    )

    # ------------------------------------------------
    # Load data
    # ------------------------------------------------

    df_original = pd.read_parquet(
        overlay_path
    )

    total_rows = len(df_original)

    df = df_original.copy()

    # ------------------------------------------------
    # Date processing
    # ------------------------------------------------

    df["OBS_DATE"] = pd.to_datetime(
        df["OBS_DATE"],
        errors="coerce"
    )

    # Only observations with both date and suitability
    # are used in this analysis.
    df = df.dropna(
        subset=[
            "OBS_DATE",
            "ensemble_suitability"
        ]
    )

    df["MONTH"] = df["OBS_DATE"].dt.month
    df["YEAR"] = df["OBS_DATE"].dt.year
    df["SEASON"] = df["MONTH"].apply(
        month_to_season
    )

    print(
        f"Analyzing {len(df):,} observations "
        f"with valid date + suitability "
        f"(of {total_rows:,} total rows)."
    )

    # ============================================================
    # 1. MONTHLY DISTRIBUTION
    # ============================================================

    monthly = (
        df.groupby("MONTH")
        .agg(
            n_observations=("LAT", "size"),
            mean_ensemble_suitability=(
                "ensemble_suitability",
                "mean"
            ),
            mean_rf_suitability=(
                "rf_suitability",
                "mean"
            ),
            mean_xgb_suitability=(
                "xgb_suitability",
                "mean"
            ),
        )
        .reset_index()
    )

    monthly.to_csv(
        outdir /
        f"{species_code}_monthly_distribution.csv",
        index=False
    )

    print("\n=== Monthly distribution ===")
    print(monthly.to_string(index=False))

    # ============================================================
    # 2. SEASONAL DISTRIBUTION
    # ============================================================

    seasonal = (
        df.groupby("SEASON")
        .agg(
            n_observations=("LAT", "size"),
            mean_ensemble_suitability=(
                "ensemble_suitability",
                "mean"
            ),
        )
        .reindex(
            [
                "Winter",
                "Spring",
                "Summer",
                "Autumn"
            ]
        )
        .reset_index()
    )

    seasonal.to_csv(
        outdir /
        f"{species_code}_seasonal_distribution.csv",
        index=False
    )

    print("\n=== Seasonal distribution ===")
    print(seasonal.to_string(index=False))

    # ============================================================
    # 3. MONTHLY MIGRATION CENTROIDS
    # ============================================================

    centroids = (
        df.groupby("MONTH")
        .agg(
            centroid_lat=("LAT", "mean"),
            centroid_lon=("LON", "mean"),
            n_observations=("LAT", "size"),
        )
        .reset_index()
    )

    centroids.to_csv(
        outdir /
        f"{species_code}_migration_centroids_by_month.csv",
        index=False
    )

    print(
        "\n=== Migration centroid by month ==="
    )

    print(
        "(Population-level observational average; "
        "NOT individual bird tracks.)"
    )

    print(
        centroids.to_string(index=False)
    )

    # ============================================================
    # 4. SEASONAL HOTSPOTS
    # ============================================================

    hotspot_frames = []

    for season in [
        "Winter",
        "Spring",
        "Summer",
        "Autumn"
    ]:

        df_season = df[
            df["SEASON"] == season
        ]

        hotspots_season = cluster_hotspots(
            df_season,
            eps_km=hotspot_eps_km,
            min_samples=hotspot_min_samples
        )

        if not hotspots_season.empty:

            hotspots_season.insert(
                0,
                "season",
                season
            )

            hotspot_frames.append(
                hotspots_season
            )

    if hotspot_frames:

        hotspots = pd.concat(
            hotspot_frames,
            ignore_index=True
        )

    else:

        hotspots = pd.DataFrame(
            columns=[
                "season",
                "cluster_id",
                "n_observations",
                "centroid_lat",
                "centroid_lon",
                "mean_ensemble_suitability"
            ]
        )

    hotspots.to_csv(
        outdir /
        f"{species_code}_hotspots_by_season.csv",
        index=False
    )

    print(
        f"\n=== Seasonal hotspots detected: "
        f"{len(hotspots)} ==="
    )

    if not hotspots.empty:
        print(
            hotspots.head(15).to_string(
                index=False
            )
        )

    # ============================================================
    # 5. OBSERVATION VS SUITABILITY PLAUSIBILITY CHECK
    # ============================================================

    suitability_quantiles = (
        df["ensemble_suitability"]
        .quantile(
            [0.25, 0.5, 0.75, 0.9]
        )
        .to_dict()
    )

    top_decile_threshold = (
        df["ensemble_suitability"]
        .quantile(0.9)
    )

    pct_in_top_decile = float(
        (
            df["ensemble_suitability"]
            >= top_decile_threshold
        ).mean()
    )

    validation_summary = {

        "n_total_overlay_rows": int(
            total_rows
        ),

        "n_observations_analyzed": int(
            len(df)
        ),

        "n_observations_excluded_due_to_missing_date_or_suitability":
            int(total_rows - len(df)),

        "ensemble_suitability_quantiles": {
            str(k): float(v)
            for k, v in suitability_quantiles.items()
        },

        "pct_observations_in_top_suitability_decile":
            round(
                pct_in_top_decile * 100,
                2
            ),

        "note": (
            "This is a descriptive plausibility check, "
            "NOT a formal model validation metric. "
            "Generalization evidence remains the "
            "spatial-CV ROC-AUC results."
        ),

        "by_season_mean_suitability": {
            str(k): (
                None if pd.isna(v)
                else float(v)
            )
            for k, v in seasonal
            .set_index("SEASON")
            ["mean_ensemble_suitability"]
            .items()
        }
    }

    with open(
        outdir /
        f"{species_code}_suitability_validation_summary.json",
        "w"
    ) as f:

        json.dump(
            validation_summary,
            f,
            indent=2
        )

    print(
        "\n=== Suitability plausibility check ==="
    )

    print(
        json.dumps(
            validation_summary,
            indent=2
        )
    )

    return {
        "monthly": monthly,
        "seasonal": seasonal,
        "centroids": centroids,
        "hotspots": hotspots,
        "validation_summary":
            validation_summary
    }


if __name__ == "__main__":

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--overlay",
        required=True
    )

    parser.add_argument(
        "--code",
        required=True
    )

    parser.add_argument(
        "--outdir",
        default="./aviantrack_env"
    )

    parser.add_argument(
        "--hotspot-eps-km",
        type=float,
        default=100
    )

    parser.add_argument(
        "--hotspot-min-samples",
        type=int,
        default=15
    )

    args = parser.parse_args()

    run_analysis(
        args.overlay,
        args.code,
        args.outdir,
        args.hotspot_eps_km,
        args.hotspot_min_samples
    )
