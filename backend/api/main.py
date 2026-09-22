
from pathlib import Path
import json

import pandas as pd

from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware


# ================================================================
# PATHS
# ================================================================

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent


OBSERVATION_FILE = (
    PROJECT_DIR
    / "experiments/prediction/observations/"
    / "bahgoo_observations_with_suitability.parquet"
)

MONTHLY_FILE = (
    PROJECT_DIR
    / "experiments/spatiotemporal/"
    / "bahgoo_monthly_distribution.csv"
)

SEASONAL_FILE = (
    PROJECT_DIR
    / "experiments/spatiotemporal/"
    / "bahgoo_seasonal_distribution.csv"
)

CENTROID_FILE = (
    PROJECT_DIR
    / "experiments/spatiotemporal/"
    / "bahgoo_migration_centroids_by_month.csv"
)

HOTSPOT_FILE = (
    PROJECT_DIR
    / "experiments/spatiotemporal/"
    / "bahgoo_hotspots_by_season.csv"
)

VALIDATION_FILE = (
    PROJECT_DIR
    / "experiments/spatiotemporal/"
    / "bahgoo_suitability_validation_summary.json"
)

FEATURE_FILE = (
    PROJECT_DIR
    / "experiments/final_models/"
    / "bahgoo_final_feature_columns.json"
)


# ================================================================
# FASTAPI APP
# ================================================================

app = FastAPI(
    title="AvianTrack API",
    description=(
        "Backend API for bird distribution, "
        "migration and habitat suitability analytics."
    ),
    version="0.1.0"
)


# ================================================================
# CORS
# ================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ================================================================
# HEALTH
# ================================================================

@app.get("/api/health")
def health():

    return {
        "status": "ok",
        "project": "AvianTrack",
        "version": "0.1.0"
    }


# ================================================================
# SPECIES
# ================================================================

@app.get("/api/species")
def get_species():

    return [
        {
            "species_code": "bahgoo",
            "scientific_name": "Anser indicus",
            "common_name": "Bar-headed Goose",
            "observation_count": 54809,
            "dated_observation_count": 39991,
            "models": [
                "Random Forest",
                "XGBoost"
            ]
        }
    ]


# ================================================================
# OBSERVATIONS
# ================================================================

@app.get("/api/observations")
def get_observations(
    month: int | None = None,
    year: int | None = None,
    source: str | None = None,
    limit: int = 5000
):

    if not OBSERVATION_FILE.exists():

        raise HTTPException(
            status_code=404,
            detail="Observation dataset not found."
        )

    if limit < 1:

        raise HTTPException(
            status_code=400,
            detail="limit must be greater than 0."
        )

    limit = min(limit, 10000)

    df = pd.read_parquet(
        OBSERVATION_FILE
    )

    df["OBS_DATE"] = pd.to_datetime(
        df["OBS_DATE"],
        errors="coerce"
    )

    # Year filter

    if year is not None:

        if year < 1900 or year > 2100:

            raise HTTPException(
                status_code=400,
                detail="year must be between 1900 and 2100."
            )

        df = df[
            df["OBS_DATE"].dt.year == year
        ]

    # Month filter

    if month is not None:

        if month < 1 or month > 12:

            raise HTTPException(
                status_code=400,
                detail="month must be between 1 and 12."
            )

        df = df[
            df["OBS_DATE"].dt.month == month
        ]

    # Source filter

    if source is not None:

        df = df[
            df["SOURCE"].astype(str).str.lower()
            == source.lower()
        ]

    df = df.head(limit)

    records = []

    for _, row in df.iterrows():

        date_value = row["OBS_DATE"]

        if pd.isna(date_value):
            date_string = None
        else:
            date_string = date_value.strftime("%Y-%m-%d")

        records.append({

            "source": str(row["SOURCE"]),

            "latitude": float(row["LAT"]),

            "longitude": float(row["LON"]),

            "observation_date": date_string,

            "species_code": str(row["SPECIES_CODE"]),

            "rf_suitability": (
                None
                if pd.isna(row["rf_suitability"])
                else float(row["rf_suitability"])
            ),

            "xgb_suitability": (
                None
                if pd.isna(row["xgb_suitability"])
                else float(row["xgb_suitability"])
            ),

            "ensemble_suitability": (
                None
                if pd.isna(row["ensemble_suitability"])
                else float(row["ensemble_suitability"])
            )
        })

    return {
        "count": len(records),
        "data": records
    }


# ================================================================
# MONTHLY DISTRIBUTION
# ================================================================

@app.get("/api/distribution/monthly")
def monthly_distribution():

    if not MONTHLY_FILE.exists():

        raise HTTPException(
            status_code=404,
            detail="Monthly distribution not found."
        )

    df = pd.read_csv(MONTHLY_FILE)

    return {
        "count": len(df),
        "data": df.to_dict(orient="records")
    }


# ================================================================
# SEASONAL DISTRIBUTION
# ================================================================

@app.get("/api/distribution/seasonal")
def seasonal_distribution():

    if not SEASONAL_FILE.exists():

        raise HTTPException(
            status_code=404,
            detail="Seasonal distribution not found."
        )

    df = pd.read_csv(SEASONAL_FILE)

    return {
        "count": len(df),
        "data": df.to_dict(orient="records")
    }


# ================================================================
# MIGRATION CENTROIDS
# ================================================================

@app.get("/api/migration/centroids")
def migration_centroids():

    if not CENTROID_FILE.exists():

        raise HTTPException(
            status_code=404,
            detail="Centroid dataset not found."
        )

    df = pd.read_csv(CENTROID_FILE)

    return {
        "count": len(df),
        "data": df.to_dict(orient="records")
    }


# ================================================================
# MIGRATION HOTSPOTS
# ================================================================

@app.get("/api/migration/hotspots")
def migration_hotspots(
    season: str | None = None
):

    if not HOTSPOT_FILE.exists():

        raise HTTPException(
            status_code=404,
            detail="Hotspot dataset not found."
        )

    df = pd.read_csv(HOTSPOT_FILE)

    if season is not None:

        df = df[
            df["season"].astype(str).str.lower()
            == season.lower()
        ]

    return {
        "count": len(df),
        "data": df.to_dict(orient="records")
    }


# ================================================================
# HABITAT SUMMARY
# ================================================================

@app.get("/api/habitat/summary")
def habitat_summary():

    if not OBSERVATION_FILE.exists():

        raise HTTPException(
            status_code=404,
            detail="Observation dataset not found."
        )

    df = pd.read_parquet(
        OBSERVATION_FILE
    )

    ensemble = df[
        "ensemble_suitability"
    ].dropna()

    return {

        "model":
            "RF + XGBoost ensemble",

        "prediction_range": [
            0.000468,
            0.999621
        ],

        "observation_count":
            int(len(df)),

        "observations_with_suitability":
            int(len(ensemble)),

        "mean_observation_suitability":
            float(ensemble.mean()),

        "median_observation_suitability":
            float(ensemble.median())
    }


# ================================================================
# MODEL INFORMATION
# ================================================================

@app.get("/api/models")
def model_information():

    result = {

        "models": [
            {
                "name": "Random Forest",
                "type": "ensemble tree model"
            },
            {
                "name": "XGBoost",
                "type": "gradient boosted tree model"
            }
        ]
    }

    if FEATURE_FILE.exists():

        with open(
            FEATURE_FILE,
            "r",
            encoding="utf-8"
        ) as f:

            features = json.load(f)

        result["feature_count"] = len(features)
        result["features"] = features

    if VALIDATION_FILE.exists():

        with open(
            VALIDATION_FILE,
            "r",
            encoding="utf-8"
        ) as f:

            result["validation"] = json.load(f)

    return result


# Serve React production frontend
FRONTEND_DIST = PROJECT_DIR / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount(
        "/",
        StaticFiles(directory=FRONTEND_DIST, html=True),
        name="frontend"
    )
