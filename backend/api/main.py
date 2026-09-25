
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

# Multi-species catalogue
MULTISPECIES_CATALOGUE_FILE = (
    BACKEND_DIR
    / "data/multispecies/"
    / "species_catalogue.parquet"
)

MULTISPECIES_OBSERVATION_FILE = (
    PROJECT_DIR
    / "data/multispecies/environment/"
    / "aviantrack_observations_with_environment_landcover.parquet"
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
# MULTI-SPECIES SEARCH
# ================================================================

@app.get("/api/multispecies/species")
def multispecies_species(
    search: str | None = None,
    limit: int = 20
):
    """
    Search the multi-species catalogue by common name
    or scientific name.

    The catalogue contains 1,465 species.
    Sampled observation statistics are calculated from
    the AvianTrack controlled multi-species observation
    dataset.
    """

    if not MULTISPECIES_CATALOGUE_FILE.exists():
        raise HTTPException(
            status_code=404,
            detail="Multi-species catalogue not found."
        )

    if not MULTISPECIES_OBSERVATION_FILE.exists():
        raise HTTPException(
            status_code=404,
            detail="Multi-species observation dataset not found."
        )

    if limit < 1:
        raise HTTPException(
            status_code=400,
            detail="limit must be greater than 0."
        )

    limit = min(limit, 100)

    # ------------------------------------------------------------
    # Load species catalogue
    # ------------------------------------------------------------

    catalogue = pd.read_parquet(
        MULTISPECIES_CATALOGUE_FILE
    )

    # ------------------------------------------------------------
    # Search common name + scientific name
    # ------------------------------------------------------------

    if search is not None:

        query = search.strip().lower()

        if query:

            common_match = (
                catalogue["common_name"]
                .fillna("")
                .astype(str)
                .str.lower()
                .str.contains(
                    query,
                    regex=False,
                    na=False
                )
            )

            scientific_match = (
                catalogue["scientific_name"]
                .fillna("")
                .astype(str)
                .str.lower()
                .str.contains(
                    query,
                    regex=False,
                    na=False
                )
            )

            catalogue = catalogue[
                common_match |
                scientific_match
            ].copy()

    # ------------------------------------------------------------
    # Limit catalogue results
    # ------------------------------------------------------------

    catalogue = catalogue.head(limit)

    if catalogue.empty:

        return {
            "count": 0,
            "data": []
        }

    # ------------------------------------------------------------
    # Load observation dataset
    # ------------------------------------------------------------

    observations = pd.read_parquet(
        MULTISPECIES_OBSERVATION_FILE,
        columns=[
            "species_key",
            "observation_date",
            "state",
            "spatial_grid"
        ]
    )

    # ------------------------------------------------------------
    # Calculate sampled statistics
    # ------------------------------------------------------------

    observation_stats = (
        observations
        .groupby("species_key")
        .agg(
            sampled_observation_count=(
                "observation_date",
                "size"
            ),

            first_observation=(
                "observation_date",
                "min"
            ),

            last_observation=(
                "observation_date",
                "max"
            ),

            state_count=(
                "state",
                lambda x:
                x.dropna().nunique()
            ),

            grid_count=(
                "spatial_grid",
                lambda x:
                x.dropna().nunique()
            )
        )
        .reset_index()
    )

    # ------------------------------------------------------------
    # Merge sampled statistics into catalogue
    # ------------------------------------------------------------

    catalogue = catalogue.merge(
        observation_stats,
        on="species_key",
        how="left"
    )

    # ------------------------------------------------------------
    # Build API response
    # ------------------------------------------------------------

    records = []

    for _, row in catalogue.iterrows():

        first_date = row["first_observation"]
        last_date = row["last_observation"]

        records.append({

            "species_key": str(
                row["species_key"]
            ),

            "common_name": (
                None
                if (
                    pd.isna(row["common_name"])
                    or str(
                        row["common_name"]
                    ).strip() == ""
                )
                else str(
                    row["common_name"]
                )
            ),

            "scientific_name": str(
                row["scientific_name"]
            ),

            "common_name_india": (
                None
                if pd.isna(
                    row["common_name_india"]
                )
                else str(
                    row["common_name_india"]
                )
            ),

            "iucn_category": (
                None
                if pd.isna(
                    row["iucn_category"]
                )
                else str(
                    row["iucn_category"]
                )
            ),

            "sampled_observation_count": int(
                0
                if pd.isna(
                    row["sampled_observation_count"]
                )
                else row[
                    "sampled_observation_count"
                ]
            ),

            "first_observation": (
                None
                if pd.isna(first_date)
                else pd.Timestamp(
                    first_date
                ).strftime(
                    "%Y-%m-%d"
                )
            ),

            "last_observation": (
                None
                if pd.isna(last_date)
                else pd.Timestamp(
                    last_date
                ).strftime(
                    "%Y-%m-%d"
                )
            ),

            "state_count": int(
                0
                if pd.isna(
                    row["state_count"]
                )
                else row["state_count"]
            ),

            "grid_count": int(
                0
                if pd.isna(
                    row["grid_count"]
                )
                else row["grid_count"]
            )
        })

    return {
        "count": len(records),
        "data": records
    }


@app.get("/api/multispecies/species/{species_key}/observations")
def multispecies_observations(
    species_key: str,
    year: int | None = None,
    month: int | None = None,
    season: str | None = None,
    limit: int = 500
):
    """
    Return sampled observations and environmental conditions
    for a selected multi-species catalogue entry.
    """

    MULTISPECIES_OBSERVATION_FILE = (
        PROJECT_DIR
        / "data/multispecies/environment/"
        / "aviantrack_observations_with_environment_landcover.parquet"
    )

    if not MULTISPECIES_OBSERVATION_FILE.exists():
        raise HTTPException(
            status_code=404,
            detail="Multi-species observation dataset not found."
        )

    # --------------------------------------------------------
    # Validate parameters
    # --------------------------------------------------------

    if limit < 1:
        raise HTTPException(
            status_code=400,
            detail="limit must be greater than 0."
        )

    limit = min(limit, 5000)

    if year is not None:
        if year < 1900 or year > 2100:
            raise HTTPException(
                status_code=400,
                detail="year must be between 1900 and 2100."
            )

    if month is not None:
        if month < 1 or month > 12:
            raise HTTPException(
                status_code=400,
                detail="month must be between 1 and 12."
            )

    if season is not None:
        season = season.strip().lower()

        valid_seasons = {
            "winter",
            "spring",
            "monsoon",
            "autumn"
        }

        if season not in valid_seasons:
            raise HTTPException(
                status_code=400,
                detail=(
                    "season must be one of: "
                    "winter, spring, monsoon, autumn."
                )
            )

    # --------------------------------------------------------
    # Load observations
    # --------------------------------------------------------

    df = pd.read_parquet(
        MULTISPECIES_OBSERVATION_FILE
    )

    # --------------------------------------------------------
    # Species filter
    # --------------------------------------------------------

    df = df[
        df["species_key"].astype(str)
        == str(species_key)
    ]

    if df.empty:
        raise HTTPException(
            status_code=404,
            detail="Species not found in observation dataset."
        )

    # --------------------------------------------------------
    # Year filter
    # --------------------------------------------------------

    if year is not None:
        df = df[df["year"] == year]

    # --------------------------------------------------------
    # Month filter
    # --------------------------------------------------------

    if month is not None:
        df = df[df["month"] == month]

    # --------------------------------------------------------
    # Season filter
    # --------------------------------------------------------

    if season is not None:

        season_months = {
            "winter": [12, 1, 2],
            "spring": [3, 4, 5],
            "monsoon": [6, 7, 8],
            "autumn": [9, 10, 11]
        }

        df = df[
            df["month"].isin(
                season_months[season]
            )
        ]

    # --------------------------------------------------------
    # Apply limit
    # --------------------------------------------------------

    df = df.head(limit)

    # --------------------------------------------------------
    # Build response
    # --------------------------------------------------------

    records = []

    for _, row in df.iterrows():

        observation_date = row["observation_date"]

        if pd.isna(observation_date):
            date_string = None
        else:
            date_string = pd.to_datetime(
                observation_date
            ).strftime("%Y-%m-%d")

        records.append({

            "gbif_id": int(row["gbif_id"]),

            "species_key": str(
                row["species_key"]
            ),

            "scientific_name": str(
                row["scientific_name"]
            ),

            "latitude": float(
                row["latitude"]
            ),

            "longitude": float(
                row["longitude"]
            ),

            "observation_date": date_string,

            "year": int(row["year"]),

            "month": int(row["month"]),

            "time_period": str(
                row["time_period"]
            ),

            "state": (
                None
                if pd.isna(row["state"])
                else str(row["state"])
            ),

            "locality": (
                None
                if pd.isna(row["locality"])
                else str(row["locality"])
            ),

            "temperature_c": (
                None
                if pd.isna(row["temperature_c"])
                else float(row["temperature_c"])
            ),

            "elevation_m": (
                None
                if pd.isna(row["elevation_m"])
                else float(row["elevation_m"])
            ),

            "land_cover_class": (
                None
                if pd.isna(row["land_cover_class"])
                else int(row["land_cover_class"])
            ),

            "land_cover_name": (
                None
                if pd.isna(row["land_cover_name"])
                else str(row["land_cover_name"])
            )
        })

    return {
        "species_key": str(species_key),
        "count": len(records),
        "limit": limit,
        "filters": {
            "year": year,
            "month": month,
            "season": season
        },
        "data": records
    }


# ================================================================
# MULTI-SPECIES ANALYTICS
# ================================================================

@app.get("/api/multispecies/species/{species_key}/analytics")
def multispecies_analytics(
    species_key: str
):
    """
    Return descriptive monthly, seasonal and environmental
    summaries for a selected multi-species observation sample.
    """

    MULTISPECIES_OBSERVATION_FILE = (
        PROJECT_DIR
        / "data/multispecies/environment/"
        / "aviantrack_observations_with_environment_landcover.parquet"
    )

    if not MULTISPECIES_OBSERVATION_FILE.exists():
        raise HTTPException(
            status_code=404,
            detail="Multi-species observation dataset not found."
        )

    # --------------------------------------------------------
    # Load only the columns needed for analytics
    # --------------------------------------------------------

    columns = [
        "species_key",
        "scientific_name",
        "month",
        "temperature_c",
        "elevation_m",
        "land_cover_class",
        "land_cover_name"
    ]

    df = pd.read_parquet(
        MULTISPECIES_OBSERVATION_FILE,
        columns=columns
    )

    # --------------------------------------------------------
    # Species filter
    # --------------------------------------------------------

    df = df[
        df["species_key"].astype(str)
        == str(species_key)
    ]

    if df.empty:
        raise HTTPException(
            status_code=404,
            detail="Species not found in observation dataset."
        )

    scientific_name = str(
        df["scientific_name"].iloc[0]
    )

    # --------------------------------------------------------
    # Monthly distribution
    # --------------------------------------------------------

    monthly = (
        df.groupby("month")
          .size()
          .reindex(range(1, 13), fill_value=0)
          .reset_index(name="observation_count")
    )

    month_names = {
        1: "January",
        2: "February",
        3: "March",
        4: "April",
        5: "May",
        6: "June",
        7: "July",
        8: "August",
        9: "September",
        10: "October",
        11: "November",
        12: "December"
    }

    monthly["month_name"] = monthly[
        "month"
    ].map(month_names)

    monthly_data = []

    for _, row in monthly.iterrows():
        monthly_data.append({
            "month": int(row["month"]),
            "month_name": str(row["month_name"]),
            "observation_count": int(
                row["observation_count"]
            )
        })

    # --------------------------------------------------------
    # Seasonal distribution
    # --------------------------------------------------------

    season_map = {
        12: "winter",
        1: "winter",
        2: "winter",

        3: "spring",
        4: "spring",
        5: "spring",

        6: "monsoon",
        7: "monsoon",
        8: "monsoon",

        9: "autumn",
        10: "autumn",
        11: "autumn"
    }

    df["season"] = df["month"].map(
        season_map
    )

    seasonal = (
        df.groupby("season")
          .size()
          .reindex(
              [
                  "winter",
                  "spring",
                  "monsoon",
                  "autumn"
              ],
              fill_value=0
          )
          .reset_index(name="observation_count")
    )

    seasonal_data = []

    for _, row in seasonal.iterrows():
        seasonal_data.append({
            "season": str(row["season"]),
            "observation_count": int(
                row["observation_count"]
            )
        })

    # --------------------------------------------------------
    # Temperature summary
    # --------------------------------------------------------

    temperature = df[
        "temperature_c"
    ].dropna()

    temperature_summary = {
        "available_count": int(
            len(temperature)
        ),
        "minimum_c": (
            None
            if temperature.empty
            else float(temperature.min())
        ),
        "mean_c": (
            None
            if temperature.empty
            else float(temperature.mean())
        ),
        "maximum_c": (
            None
            if temperature.empty
            else float(temperature.max())
        )
    }

    # --------------------------------------------------------
    # Elevation summary
    # --------------------------------------------------------

    elevation = df[
        "elevation_m"
    ].dropna()

    elevation_summary = {
        "available_count": int(
            len(elevation)
        ),
        "minimum_m": (
            None
            if elevation.empty
            else float(elevation.min())
        ),
        "mean_m": (
            None
            if elevation.empty
            else float(elevation.mean())
        ),
        "maximum_m": (
            None
            if elevation.empty
            else float(elevation.max())
        )
    }

    # --------------------------------------------------------
    # Land-cover summary
    # --------------------------------------------------------

    landcover = (
        df[
            [
                "land_cover_class",
                "land_cover_name"
            ]
        ]
        .dropna(subset=["land_cover_class"])
        .groupby(
            [
                "land_cover_class",
                "land_cover_name"
            ]
        )
        .size()
        .reset_index(
            name="observation_count"
        )
        .sort_values(
            "observation_count",
            ascending=False
        )
    )

    landcover_data = []

    for _, row in landcover.iterrows():
        landcover_data.append({
            "land_cover_class": int(
                row["land_cover_class"]
            ),
            "land_cover_name": str(
                row["land_cover_name"]
            ),
            "observation_count": int(
                row["observation_count"]
            )
        })

    # --------------------------------------------------------
    # Return response
    # --------------------------------------------------------

    return {
        "species_key": str(species_key),
        "scientific_name": scientific_name,
        "sampled_observation_count": int(
            len(df)
        ),
        "monthly": monthly_data,
        "seasonal": seasonal_data,
        "temperature": temperature_summary,
        "elevation": elevation_summary,
        "land_cover": landcover_data
    }


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
