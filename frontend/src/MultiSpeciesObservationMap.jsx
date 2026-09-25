
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap
} from "react-leaflet";

import {
  useEffect
} from "react";

import "leaflet/dist/leaflet.css";


// ============================================================
// FIT MAP TO OBSERVATIONS
// ============================================================

function FitObservationBounds({
  observations
}) {

  const map = useMap();

  useEffect(() => {

    if (
      !observations ||
      observations.length === 0
    ) {
      return;
    }

    const validPoints =
      observations.filter(
        observation =>
          Number.isFinite(
            Number(observation.latitude)
          ) &&
          Number.isFinite(
            Number(observation.longitude)
          )
      );

    if (validPoints.length === 0) {
      return;
    }

    const bounds =
      validPoints.map(
        observation => [
          Number(observation.latitude),
          Number(observation.longitude)
        ]
      );

    map.fitBounds(
      bounds,
      {
        padding: [40, 40],
        maxZoom: 7
      }
    );

  }, [observations, map]);

  return null;
}


// ============================================================
// FORMAT VALUES
// ============================================================

function formatTemperature(
  value
) {

  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(
      Number(value)
    )
  ) {
    return "Not available";
  }

  return `${Number(value).toFixed(1)} °C`;
}


function formatElevation(
  value
) {

  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(
      Number(value)
    )
  ) {
    return "Not available";
  }

  return `${Number(value).toFixed(0)} m`;
}


function formatDate(
  value
) {

  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}


// ============================================================
// MAIN COMPONENT
// ============================================================

function MultiSpeciesObservationMap({
  observations = [],
  speciesName = ""
}) {

  const validObservations =
    observations.filter(
      observation =>
        Number.isFinite(
          Number(observation.latitude)
        ) &&
        Number.isFinite(
          Number(observation.longitude)
        )
    );

  // ----------------------------------------------------------
  // Empty state
  // ----------------------------------------------------------

  if (
    validObservations.length === 0
  ) {

    return (

      <div className="multispecies-map-empty">

        <div>
          No mapped observations
          available for this species.
        </div>

      </div>

    );
  }


  // ----------------------------------------------------------
  // Calculate initial center
  // ----------------------------------------------------------

  const latitudes =
    validObservations.map(
      observation =>
        Number(observation.latitude)
    );

  const longitudes =
    validObservations.map(
      observation =>
        Number(observation.longitude)
    );

  const center = [

    latitudes.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / latitudes.length,

    longitudes.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / longitudes.length

  ];


  // ----------------------------------------------------------
  // Render map
  // ----------------------------------------------------------

  return (

    <div className="multispecies-map-wrapper">

      <div className="multispecies-map-header">

        <div>

          <span className="section-label">
            OBSERVATION MAP
          </span>

          <h4>
            Recorded locations
          </h4>

          <p>
            {validObservations.length.toLocaleString()}
            {" "}mapped observations
            {speciesName
              ? ` of ${speciesName}`
              : ""}
          </p>

        </div>

      </div>


      <div className="multispecies-map">

        <MapContainer
          center={center}
          zoom={5}
          scrollWheelZoom={true}
          style={{
            height: "560px",
            width: "100%"
          }}
        >

          <TileLayer
            attribution={
              '&copy; OpenStreetMap contributors'
            }
            url={
              "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            }
          />

          <FitObservationBounds
            observations={
              validObservations
            }
          />


          {validObservations.map(
            observation => (

              <CircleMarker
                key={
                  observation.gbif_id
                }
                center={[
                  Number(
                    observation.latitude
                  ),
                  Number(
                    observation.longitude
                  )
                ]}
                radius={6}
                pathOptions={{
                  fillOpacity: 0.75,
                  weight: 1
                }}
              >

                <Popup>

                  <div className="observation-popup">

                    <div className="observation-popup-title">

                      {speciesName ||
                        observation.scientific_name ||
                        "Bird observation"}

                    </div>


                    <div className="observation-popup-row">

                      <span>
                        Observation date
                      </span>

                      <strong>
                        {formatDate(
                          observation.observation_date
                        )}
                      </strong>

                    </div>


                    <div className="observation-popup-row">

                      <span>
                        Location
                      </span>

                      <strong>
                        {observation.locality ||
                          observation.state ||
                          "Not available"}
                      </strong>

                    </div>


                    <div className="observation-popup-row">

                      <span>
                        Coordinates
                      </span>

                      <strong>
                        {Number(
                          observation.latitude
                        ).toFixed(4)}
                        ,
                        {" "}
                        {Number(
                          observation.longitude
                        ).toFixed(4)}
                      </strong>

                    </div>


                    <div className="observation-popup-row">

                      <span>
                        Temperature
                      </span>

                      <strong>
                        {formatTemperature(
                          observation.temperature_c
                        )}
                      </strong>

                    </div>


                    <div className="observation-popup-row">

                      <span>
                        Elevation
                      </span>

                      <strong>
                        {formatElevation(
                          observation.elevation_m
                        )}
                      </strong>

                    </div>


                    <div className="observation-popup-row">

                      <span>
                        Land cover
                      </span>

                      <strong>
                        {observation.land_cover_name ||
                          "Not available"}
                      </strong>

                    </div>

                  </div>

                </Popup>

              </CircleMarker>

            )
          )}

        </MapContainer>

      </div>

    </div>

  );

}


export default MultiSpeciesObservationMap;
