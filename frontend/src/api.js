
const API_BASE = "";


async function request(endpoint) {

  const response = await fetch(
    `${API_BASE}${endpoint}`
  );

  if (!response.ok) {

    throw new Error(
      `API request failed: ${response.status}`
    );

  }

  return response.json();
}


export async function getSpecies() {

  return request(
    "/api/species"
  );

}


export async function getObservations(params = {}) {

  const search =
    new URLSearchParams();


  if (params.month) {

    search.set(
      "month",
      params.month
    );

  }


  if (params.source) {

    search.set(
      "source",
      params.source
    );

  }


  search.set(
    "limit",
    params.limit || 5000
  );


  return request(
    `/api/observations?${search.toString()}`
  );

}


export async function getMonthlyDistribution() {

  return request(
    "/api/distribution/monthly"
  );

}


export async function getSeasonalDistribution() {

  return request(
    "/api/distribution/seasonal"
  );

}


export async function getCentroids() {

  return request(
    "/api/migration/centroids"
  );

}


export async function getHotspots(season) {

  const endpoint = season
    ? `/api/migration/hotspots?season=${encodeURIComponent(season)}`
    : "/api/migration/hotspots";

  return request(endpoint);

}


export async function getHabitatSummary() {

  return request(
    "/api/habitat/summary"
  );

}


export async function getModels() {

  return request(
    "/api/models"
  );

}
