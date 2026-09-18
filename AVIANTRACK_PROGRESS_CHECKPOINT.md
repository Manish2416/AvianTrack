# AvianTrack Progress Checkpoint

Saved: 2026-09-17 12:08:01

## Current stopping point

The project is paused after **Frontend Step 12I**.

## Completed

### Data & preprocessing
- Global Bar-headed Goose occurrence dataset
- eBird + GBIF occurrence integration
- Cleaning and cross-source deduplication
- Environmental variables
- ESA WorldCover land-cover variables
- Canonical modelling dataset with spatial folds

### Machine learning
- Spatial cross-validation
- Random Forest / XGBoost / MaxEnt comparison
- SHAP explainability
- Final Random Forest model
- Final XGBoost model
- 32-feature final model schema
- Habitat suitability prediction grid
- Corrected suitability GeoTIFFs
- Ensemble suitability map

### Spatiotemporal analysis
- Monthly distribution
- Seasonal distribution
- Monthly centroid trajectory
- Seasonal DBSCAN hotspots
- Suitability validation summary
- Static visualizations
- Interactive prototype maps

### Backend
- FastAPI backend
- Health API
- Species API
- Observation API
- Monthly distribution API
- Seasonal distribution API
- Migration centroid API
- Hotspot API
- Habitat summary API
- Model information API

### Frontend
- React + Vite
- Dashboard/navigation
- Distribution Map
- Observation filters
- Suitability overlay
- Interactive Habitat Suitability map
- ML validation cards
- Suitability interpretation

## Current Habitat UI

- Mean suitability at observations: 0.920
- Random Forest spatial CV ROC-AUC: 0.849
- XGBoost spatial CV ROC-AUC: 0.847
- MaxEnt spatial CV ROC-AUC: 0.686
- 32 features
- Corrected habitat suitability raster integrated successfully

## Important canonical files

- `bahgoo_modeling_dataset_with_folds.parquet`
- `bahgoo_final_occurrences.parquet`
- `experiments/prediction/bahgoo_final_habitat_suitability_predictions.parquet`
- `experiments/prediction/maps_corrected/bahgoo_ensemble_suitability.tif`
- `experiments/prediction/maps/bahgoo_ensemble_suitability.tif`
- `experiments/prediction/observations/bahgoo_observations_with_suitability.parquet`
- `experiments/spatiotemporal/`
- `backend/`
- `frontend/`

## Frontend checkpoint

Step 12I build succeeded.

The Habitat section currently contains:
- model tags
- mean suitability
- spatial CV model cards
- suitability interpretation
- interactive suitability map

## Next planned step

**Step 13 / Analytics integration**

When resuming:
1. Do not redo completed modelling or habitat steps.
2. Integrate monthly distribution results.
3. Integrate seasonal distribution results.
4. Integrate migration centroid trajectory.
5. Integrate seasonal hotspot results.
6. Add interactive charts to the Analytics section.
7. Rebuild and test the frontend.

## Project principle

Suitability values are modelled relative suitability scores, not guaranteed species presence. SHAP/model feature importance describes model contribution/association, not biological causation. Migration centroid analysis describes population-level seasonal redistribution, not individual bird tracking.
