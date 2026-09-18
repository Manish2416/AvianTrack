
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
  ImageOverlay,
  LayersControl,
  LayerGroup,
  useMap
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import { useEffect } from "react";


function MapUpdater({
  center,
  zoom
}) {

  const map = useMap();

  useEffect(() => {

    map.setView(
      center,
      zoom
    );

  }, [
    center,
    zoom,
    map
  ]);

  return null;
}


function SuitabilityLegend() {

  return (

    <div className="suitability-legend">

      <div className="legend-title">
        Habitat suitability
      </div>

      <div className="legend-gradient" />

      <div className="legend-values">

        <span>
          Low
        </span>

        <span>
          High
        </span>

      </div>

    </div>

  );
}


function ObservationMap({
  observations,
  centroids
}) {

  const defaultCenter = [
    28,
    82
  ];


  const trajectory = centroids
    .map(item => [

      Number(
        item.centroid_lat
      ),

      Number(
        item.centroid_lon
      )

    ])
    .filter(item =>

      Number.isFinite(item[0]) &&
      Number.isFinite(item[1])

    );


  const suitabilityBounds = [

    [
      7.041667,
      67.416667
    ],

    [
      53.541667,
      128.958333
    ]

  ];


  return (

    <div className="map-wrapper">

      <MapContainer

        center={
          defaultCenter
        }

        zoom={4}

        scrollWheelZoom={true}

        style={{
          width: "100%",
          height: "100%"
        }}

      >

        <MapUpdater
          center={defaultCenter}
          zoom={4}
        />


        <LayersControl
          position="topright"
        >


          {/* =================================================
              BASE MAP
          ================================================== */}

          <LayersControl.BaseLayer
            checked
            name="OpenStreetMap"
          >

            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

          </LayersControl.BaseLayer>


          {/* =================================================
              HABITAT SUITABILITY
          ================================================== */}

          <LayersControl.Overlay
            checked
            name="Habitat Suitability"
          >

            <ImageOverlay

              url="/bahgoo_ensemble_suitability.png"

              bounds={
                suitabilityBounds
              }

              opacity={0.62}

              zIndex={1}

            />

          </LayersControl.Overlay>


          {/* =================================================
              OBSERVATIONS
          ================================================== */}

          <LayersControl.Overlay
            checked
            name="Bird Observations"
          >

            <LayerGroup>

              {observations.map(
                (
                  observation,
                  index
                ) => {

                  const lat =
                    Number(
                      observation.latitude
                    );

                  const lon =
                    Number(
                      observation.longitude
                    );


                  if (
                    !Number.isFinite(lat) ||
                    !Number.isFinite(lon)
                  ) {

                    return null;

                  }


                  return (

                    <CircleMarker

                      key={
                        `${observation.source}-${observation.observation_date}-${index}`
                      }

                      center={[
                        lat,
                        lon
                      ]}

                      radius={4}

                      pathOptions={{

                        weight: 1,

                        opacity: 0.8,

                        fillOpacity: 0.65

                      }}

                    >

                      <Popup>

                        <div
                          className="observation-popup"
                        >

                          <strong>
                            Bar-headed Goose
                          </strong>

                          <br />

                          <em>
                            Anser indicus
                          </em>

                          <hr />

                          <div>

                            <strong>
                              Source:
                            </strong>{" "}

                            {
                              observation.source
                            }

                          </div>


                          <div>

                            <strong>
                              Date:
                            </strong>{" "}

                            {
                              observation.observation_date
                              || "Unknown"
                            }

                          </div>


                          <div>

                            <strong>
                              Latitude:
                            </strong>{" "}

                            {
                              lat.toFixed(5)
                            }

                          </div>


                          <div>

                            <strong>
                              Longitude:
                            </strong>{" "}

                            {
                              lon.toFixed(5)
                            }

                          </div>


                          <div>

                            <strong>
                              Ensemble suitability:
                            </strong>{" "}

                            {
                              observation.ensemble_suitability
                              == null

                              ? "N/A"

                              : Number(
                                  observation.ensemble_suitability
                                ).toFixed(3)

                            }

                          </div>

                        </div>

                      </Popup>

                    </CircleMarker>

                  );

                }
              )}

            </LayerGroup>

          </LayersControl.Overlay>


          {/* =================================================
              CENTROID TRAJECTORY
          ================================================== */}

          <LayersControl.Overlay
            checked
            name="Monthly Centroid Trajectory"
          >

            <LayerGroup>

              {trajectory.length > 1 && (

                <Polyline

                  positions={
                    trajectory
                  }

                  pathOptions={{

                    weight: 4,

                    opacity: 0.85

                  }}

                />

              )}

            </LayerGroup>

          </LayersControl.Overlay>


        </LayersControl>

      </MapContainer>


      <SuitabilityLegend />

    </div>

  );
}


export default ObservationMap;
