"""
05a_spatial_fold_assignment.py
AvianTrack — spatial block cross-validation folds (single source of truth)

WHY THIS EXISTS AS ITS OWN STEP
"Did the env-only and env+landcover experiments use identical folds?" is
the wrong question to have to ask after the fact — it should be
structurally impossible for them to differ. This script assigns spatial
blocks and fold numbers EXACTLY ONCE and writes them into the modeling
dataset. Every later script (RF, XGBoost, MaxEnt, the land-cover ablation)
loads THIS file and reuses the same 'spatial_fold' column, so every
comparison is guaranteed apples-to-apples by construction.

METHOD (standard spatial block CV, e.g. Roberts et al. 2017 /
Valavi et al. 2019's blockCV approach):
  1. Project points to a local, metrically-accurate CRS (azimuthal
     equidistant centered on the data's own centroid — consistent with
     04a_generate_background_points.py).
  2. Lay a regular grid over the bounding box, sized so the grid produces
     approximately N_BLOCKS_TARGET blocks (default 100, matching what's
     already been reported).
  3. Assign each point to its grid cell (block_id).
  4. Assign whole BLOCKS (never individual points) to folds, using a
     greedy count-balancing assignment with a fixed random seed — this
     keeps fold sizes reasonably even while guaranteeing every point in a
     given block ends up in the same fold (the whole point of block CV:
     no block straddles the train/test boundary).

Usage:
    python 05a_spatial_fold_assignment.py \
        --modeling-dataset bahgoo_modeling_dataset.parquet \
        --code bahgoo \
        --outdir ./aviantrack_env \
        --n-blocks 100 \
        --n-folds 5
"""

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
from pyproj import CRS


def _local_aeqd(lat0: float, lon0: float) -> CRS:
    return CRS.from_proj4(f"+proj=aeqd +lat_0={lat0} +lon_0={lon0} +datum=WGS84 +units=m +no_defs")


def assign_spatial_blocks(df: pd.DataFrame, lat_col="LAT", lon_col="LON",
                           n_blocks_target=100, n_folds=5, random_seed=42):
    points = gpd.GeoSeries(
        [Point(lon, lat) for lon, lat in zip(df[lon_col], df[lat_col])], crs="EPSG:4326"
    )
    centroid = points.union_all().centroid
    local_crs = _local_aeqd(centroid.y, centroid.x)
    points_local = points.to_crs(local_crs)

    xs = points_local.x.values
    ys = points_local.y.values
    minx, maxx = xs.min(), xs.max()
    miny, maxy = ys.min(), ys.max()
    width, height = maxx - minx, maxy - miny

    # block side length that yields ~n_blocks_target cells over the bbox
    cell_size = np.sqrt((width * height) / n_blocks_target)
    cell_size = max(cell_size, 1.0)  # guard against degenerate bboxes

    block_x = np.floor((xs - minx) / cell_size).astype(int)
    block_y = np.floor((ys - miny) / cell_size).astype(int)
    block_id = block_x * 100000 + block_y  # unique int per (bx,by) pair

    df = df.copy()
    df["block_id"] = block_id

    # Greedy count-balanced block -> fold assignment (deterministic given seed)
    block_counts = df["block_id"].value_counts()
    rng = np.random.default_rng(random_seed)
    blocks_shuffled = block_counts.sample(frac=1.0, random_state=random_seed).index.tolist()

    fold_totals = np.zeros(n_folds, dtype=int)
    block_to_fold = {}
    for block in blocks_shuffled:
        target_fold = int(np.argmin(fold_totals))
        block_to_fold[block] = target_fold
        fold_totals[target_fold] += block_counts[block]

    df["spatial_fold"] = df["block_id"].map(block_to_fold)

    report = {
        "n_points": int(len(df)),
        "n_blocks_actual": int(df["block_id"].nunique()),
        "cell_size_m": float(cell_size),
        "fold_sizes": {int(f): int(c) for f, c in zip(range(n_folds), fold_totals)},
    }
    return df, report


def main(modeling_dataset_path: str, species_code: str, outdir: str,
         n_blocks: int, n_folds: int, random_seed: int = 42):
    outdir = Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    df = pd.read_parquet(modeling_dataset_path)
    df_with_folds, report = assign_spatial_blocks(
        df, n_blocks_target=n_blocks, n_folds=n_folds, random_seed=random_seed
    )

    out_path = outdir / f"{species_code}_modeling_dataset_with_folds.parquet"
    df_with_folds.to_parquet(out_path, index=False)
    df_with_folds.to_csv(outdir / f"{species_code}_modeling_dataset_with_folds.csv", index=False)

    with open(outdir / f"{species_code}_spatial_folds_report.json", "w") as f:
        json.dump(report, f, indent=2)

    print(json.dumps(report, indent=2))
    print(f"\nWritten: {out_path}")
    print("EVERY subsequent model script should load THIS file and use the "
          "'spatial_fold' column — never regenerate folds independently.")
    return df_with_folds, report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--modeling-dataset", required=True)
    parser.add_argument("--code", required=True)
    parser.add_argument("--outdir", default="./aviantrack_env")
    parser.add_argument("--n-blocks", type=int, default=100)
    parser.add_argument("--n-folds", type=int, default=5)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    main(args.modeling_dataset, args.code, args.outdir, args.n_blocks, args.n_folds, args.seed)
