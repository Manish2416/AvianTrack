"""
04c_add_landcover.py
AvianTrack — Step 2: add ESA WorldCover land cover to the modeling dataset

RUN THIS AFTER 04b_extract_environmental_variables.py (Step 1), ON YOUR OWN
MACHINE OR COLAB — same network-access reason as Step 1.

WHY A SEPARATE STEP (per the agreed two-step plan):
Downloading ESA WorldCover for the WHOLE accessible-area bounding box would
mean 100+ GB (10m global tiles are large). Instead, this script only
downloads the specific 3x3-degree tiles that actually contain at least one
of your presence/background points — for a point set concentrated along a
real flyway corridor, that's a few dozen tiles, not the few hundred a full
bounding-box download would pull.

DATA SOURCE
  ESA WorldCover 10m 2021 v200, public AWS S3 bucket (no auth needed):
    https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_{TILE}_Map.tif
  Tile naming: 2-digit latitude + 3-digit longitude of the LOWER-LEFT
  corner of each 3x3 degree block, e.g. N27E075 covers 27-30N, 75-78E.
  (Verified against ESA's own tile index — see project notes.)

LAND COVER CLASSES (ESA WorldCover v200 standard legend):
    10 Tree cover        20 Shrubland          30 Grassland
    40 Cropland          50 Built-up           60 Bare/sparse vegetation
    70 Snow and ice      80 Permanent water    90 Herbaceous wetland
    95 Mangroves         100 Moss and lichen

Usage:
    python 04c_add_landcover.py \
        --modeling-dataset bahgoo_modeling_dataset.parquet \
        --code bahgoo \
        --outdir ./aviantrack_env
"""

import argparse
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import requests

try:
    import rasterio
except ImportError:
    raise SystemExit("Install rasterio first: pip install rasterio")

WORLDCOVER_URL_TEMPLATE = (
    "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/"
    "ESA_WorldCover_10m_2021_v200_{tile}_Map.tif"
)

LANDCOVER_CLASSES = {
    10: "tree_cover", 20: "shrubland", 30: "grassland", 40: "cropland",
    50: "built_up", 60: "bare_sparse_vegetation", 70: "snow_ice",
    80: "permanent_water", 90: "herbaceous_wetland", 95: "mangroves",
    100: "moss_lichen",
}


def tile_name_for_point(lat: float, lon: float) -> str:
    lat0 = int(np.floor(lat / 3) * 3)
    lon0 = int(np.floor(lon / 3) * 3)
    lat_str = f"{'N' if lat0 >= 0 else 'S'}{abs(lat0):02d}"
    lon_str = f"{'E' if lon0 >= 0 else 'W'}{abs(lon0):03d}"
    return f"{lat_str}{lon_str}"


def download_tile(tile: str, dest_dir: Path) -> Optional[Path]:
    dest = dest_dir / f"ESA_WorldCover_10m_2021_v200_{tile}_Map.tif"
    if dest.exists():
        return dest
    url = WORLDCOVER_URL_TEMPLATE.format(tile=tile)
    print(f"  downloading tile {tile} ...")
    r = requests.get(url, stream=True, timeout=120)
    if r.status_code != 200:
        print(f"  WARNING: tile {tile} not available ({r.status_code}) — "
              f"likely an ocean/no-data tile. Points in it will get NaN land_cover.")
        return None
    with open(dest, "wb") as f:
        for chunk in r.iter_content(chunk_size=1 << 20):
            f.write(chunk)
    return dest


def add_landcover(modeling_dataset_path: str, species_code: str, outdir: str):
    outdir = Path(outdir)
    tiles_dir = outdir / "raw" / "worldcover_tiles"
    tiles_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_parquet(modeling_dataset_path)
    df["_tile"] = [tile_name_for_point(lat, lon) for lat, lon in zip(df["LAT"], df["LON"])]

    unique_tiles = df["_tile"].unique()
    print(f"{len(df)} points fall across {len(unique_tiles)} distinct WorldCover tiles "
          f"(vs. potentially hundreds for a full bounding-box download).")

    df["land_cover_code"] = np.nan
    for tile in unique_tiles:
        tile_path = download_tile(tile, tiles_dir)
        mask = df["_tile"] == tile
        if tile_path is None:
            continue
        with rasterio.open(tile_path) as src:
            coords = list(zip(df.loc[mask, "LON"], df.loc[mask, "LAT"]))
            values = np.array([v[0] for v in src.sample(coords)], dtype="float64")
        df.loc[mask, "land_cover_code"] = values

    df["land_cover_class"] = df["land_cover_code"].map(LANDCOVER_CLASSES)
    df = df.drop(columns=["_tile"])

    out_path = outdir / f"{species_code}_modeling_dataset.parquet"
    df.to_parquet(out_path, index=False)
    df.to_csv(outdir / f"{species_code}_modeling_dataset.csv", index=False)

    print(f"\nDone. Land cover added to {out_path}")
    print("\nLand cover class distribution:")
    print(df["land_cover_class"].value_counts(dropna=False))
    print("\nFull missing-value check (fix before training):")
    print(df.isna().sum())

    return df


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--modeling-dataset", required=True,
                         help="Output of 04b_extract_environmental_variables.py")
    parser.add_argument("--code", required=True)
    parser.add_argument("--outdir", default="./aviantrack_env")
    args = parser.parse_args()

    add_landcover(args.modeling_dataset, args.code, args.outdir)
