# AvianTrack Backend

FastAPI backend for AvianTrack.

## Run

From the backend directory:

pip install -r requirements.txt

uvicorn api.main:app --host 0.0.0.0 --port 8000

## API Endpoints

/api/health
/api/species
/api/observations
/api/distribution/monthly
/api/distribution/seasonal
/api/migration/centroids
/api/migration/hotspots
/api/habitat/summary
/api/models