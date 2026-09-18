"""
04b_extract_environmental_variables.py
AvianTrack — environmental variable extraction at presence + background points

RUN THIS ON YOUR OWN MACHINE OR GOOGLE COLAB, NOT IN A NETWORK-RESTRICTED
SANDBOX — it needs to reach the actual data providers below, which a
locked-down environment (like the one that built this script) cannot.

WHAT IT DOES (Step 1 of 2 — see 04c_add_landcover.py for Step 2)
  1. Downloads (or reuses, if already present) WorldClim v2.1 bioclimatic
     variables (temperature, precipitation) and elevation.
  2. Extracts each raster's value at every presence point AND every
     background point using rasterio (point sampling — no need to load
     full rasters into memory).
  3. Produces a merged "modeling dataset": every row is a point
     (presence or background) with species, lat/lon, source, PRESENCE
     (1/0), and one column per climate/elevation variable.
  Land cover is added afterward by 04c_add_landcover.py, which reads this
  script's output and adds a land_cover column to the same file — kept
  separate so a slow/large land-cover download doesn't block getting a
  usable climate-only dataset first (per the agreed two-step plan).

DATA SOURCES (public, no API key needed)
  WorldClim v2.1, 2.5 arc-min (~4.5km) bioclim + elevation:
    https://geodata.ucdavis.edu/climate/worldclim/2_1/base/wc2.1_2.5m_bio.zip
    https://geodata.ucdavis.edu/climate/worldclim/2_1/base/wc2.1_2.5m_elev.zip
  (Use the 30s (~1km) versions instead if your machine/model needs finer
  resolution — same URL pattern with "30s" in place of "2.5m"; files are
  much larger.)

INSTALL (once you're on a machine with real internet access):
    pip install rasterio geopandas pandas requests tqdm

USAGE:
    python 04b_extract_environmental_variables.py \
        --presence bahgoo_final_occurrences.parquet \
        --background bahgoo_background_points.parquet \
        --code bahgoo \
        --outdir ./aviantrack_env \
        --worldclim-res 2.5m
"""

import argparse
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd
import requests
from tqdm import tqdm

try:
    import rasterio
except ImportError:
    raise SystemExit(
        "rasterio is required for this script. Install with:\n"
        "  pip install rasterio\n"
        "(On some systems you may need: conda install -c conda-forge rasterio)"
    )

WORLDCLIM_BASE = "https://geodata.ucdavis.edu/climate/worldclim/2_1/base"

# The 19 standard bioclim variables. bio1=Annual Mean Temp, bio12=Annual
# Precipitation are usually the two most important for a migratory
# waterbird; keep all 19 and let SHAP tell you which matter, rather than
# guessing upfront which to drop.
BIOCLIM_NAMES = {
    1: "annual_mean_temp", 2: "mean_diurnal_range", 3: "isothermality",
    4: "temp_seasonality", 5: "max_temp_warmest_month", 6: "min_temp_coldest_month",
    7: "temp_annual_range", 8: "mean_temp_wettest_quarter", 9: "mean_temp_driest_quarter",
    10: "mean_temp_warmest_quarter", 11: "mean_temp_coldest_quarter",
    12: "annual_precipitation", 13: "precip_wettest_month", 14: "precip_driest_month",
    15: "precip_seasonality", 16: "precip_wettest_quarter", 17: "precip_driest_quarter",
    18: "precip_warmest_quarter", 19: "precip_coldest_quarter",
}


def _download(url: str, dest: Path):
    if dest.exists():
        print(f"  already have {dest.name}, skipping download")
        return
    print(f"  downloading {url}")
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        total = int(r.headers.get("content-length", 0))
        with open(dest, "wb") as f, tqdm(total=total, unit="B", unit_scale=True) as bar:
            for chunk in r.iter_content(chunk_size=1 << 20):
                f.write(chunk)
                bar.update(len(chunk))


def _unzip(zip_path: Path, extract_to: Path):
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(extract_to)


def fetch_worldclim(outdir: Path, resolution: str = "2.5m"):
    """resolution: '30s' (~1km, large files) or '2.5m' (~4.5km, fast to test with)."""
    raw_dir = outdir / "raw" / "worldclim"
    raw_dir.mkdir(parents=True, exist_ok=True)

    bio_zip = raw_dir / f"wc2.1_{resolution}_bio.zip"
    elev_zip = raw_dir / f"wc2.1_{resolution}_elev.zip"
    _download(f"{WORLDCLIM_BASE}/wc2.1_{resolution}_bio.zip", bio_zip)
    _download(f"{WORLDCLIM_BASE}/wc2.1_{resolution}_elev.zip", elev_zip)

    bio_dir = raw_dir / "bio"
    elev_dir = raw_dir / "elev"
    if not bio_dir.exists():
        _unzip(bio_zip, bio_dir)
    if not elev_dir.exists():
        _unzip(elev_zip, elev_dir)

    bio_rasters = {
        BIOCLIM_NAMES[i]: bio_dir / f"wc2.1_{resolution}_bio_{i}.tif" for i in range(1, 20)
    }
    elev_raster = elev_dir / f"wc2.1_{resolution}_elev.tif"
    return bio_rasters, elev_raster


def sample_raster_at_points(raster_path: Path, lons: np.ndarray, lats: np.ndarray) -> np.ndarray:
    """Point-sample a raster without loading the whole thing into memory."""
    with rasterio.open(raster_path) as src:
        coords = list(zip(lons, lats))
        values = np.array([v[0] for v in src.sample(coords)], dtype="float64")
        nodata = src.nodata
        if nodata is not None:
            values[values == nodata] = np.nan
    return values


def build_modeling_dataset(presence_path: str, background_path: str, species_code: str,
                            outdir: str, worldclim_res: str = "2.5m"):
    outdir = Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    presence = pd.read_parquet(presence_path)
    background = pd.read_parquet(background_path)

    points = pd.concat([
        pd.DataFrame({"LON": presence["LON"], "LAT": presence["LAT"], "PRESENCE": 1,
                      "SOURCE": presence.get("SOURCE", "presence")}),
        pd.DataFrame({"LON": background["LON"], "LAT": background["LAT"], "PRESENCE": 0,
                      "SOURCE": "background"}),
    ], ignore_index=True)
    points["SPECIES_CODE"] = species_code

    print("Fetching WorldClim (this downloads real data — needs actual internet access)...")
    bio_rasters, elev_raster = fetch_worldclim(outdir, worldclim_res)

    lons = points["LON"].values
    lats = points["LAT"].values

    print("Extracting elevation...")
    points["elevation_m"] = sample_raster_at_points(elev_raster, lons, lats)

    for varname, raster_path in bio_rasters.items():
        print(f"Extracting {varname}...")
        points[varname] = sample_raster_at_points(raster_path, lons, lats)

    # ---- Land cover: STEP 2, separate script -----------------------------
    # Run 04c_add_landcover.py next, pointing it at the parquet file this
    # script just wrote. It downloads only the specific ESA WorldCover
    # tiles that contain your points (not the whole bounding box, which
    # would be 100+ GB) and adds a land_cover column to this same dataset.

    out_path = outdir / f"{species_code}_modeling_dataset.parquet"
    points.to_parquet(out_path, index=False)
    points.to_csv(outdir / f"{species_code}_modeling_dataset.csv", index=False)

    print(f"\nDone. {len(points)} rows written to {out_path}")
    print("\nMissing-value check per column (fix before training):")
    print(points.isna().sum())

    return points


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--presence", required=True)
    parser.add_argument("--background", required=True)
    parser.add_argument("--code", required=True)
    parser.add_argument("--outdir", default="./aviantrack_env")
    parser.add_argument("--worldclim-res", default="2.5m", choices=["2.5m", "5m", "10m", "30s"],
                         help="2.5m (~4.5km) is fine for prototyping; use 30s (~1km) for the final model.")
    args = parser.parse_args()

    build_modeling_dataset(args.presence, args.background, args.code, args.outdir, args.worldclim_res)
