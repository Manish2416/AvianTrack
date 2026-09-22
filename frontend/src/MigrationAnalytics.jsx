import { useEffect, useState } from "react";
import {
  CalendarDays,
  MapPinned,
  Flame,
  Navigation
} from "lucide-react";

import {
  getSeasonalDistribution,
  getHotspots
} from "./api.js";


const seasons = [
  "Winter",
  "Spring",
  "Summer",
  "Autumn"
];


const seasonMonths = {
  Winter: "December – February",
  Spring: "March – May",
  Summer: "June – August",
  Autumn: "September – November"
};


function SeasonalDistribution() {

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    async function load() {

      try {

        const result =
          await getSeasonalDistribution();

        setData(result.data || []);

      } catch (error) {

        console.error(
          "Seasonal distribution error:",
          error
        );

      } finally {

        setLoading(false);

      }

    }

    load();

  }, []);


  const getSeason = (name) =>
    data.find(
      item =>
        String(
          item.SEASON || item.season
        ).toLowerCase() ===
        name.toLowerCase()
    );


  const maxObservations = Math.max(
    ...seasons.map(
      season =>
        Number(
          getSeason(season)?.n_observations ||
          getSeason(season)?.observations ||
          0
        )
    ),
    1
  );


  return (

    <div className="analytics-card seasonal-card">

      <div className="analytics-card-header">

        <div>

          <span>
            SEASONAL DISTRIBUTION
          </span>

          <h3>
            Observation Patterns
          </h3>

        </div>

        <CalendarDays size={21} />

      </div>


      {loading ? (

        <div className="analytics-loading">
          Loading seasonal data...
        </div>

      ) : (

        <div className="seasonal-list">

          {seasons.map(season => {

            const item =
              getSeason(season);

            const observations =
              Number(
                item?.n_observations ||
                item?.observations ||
                0
              );

            const suitability =
              Number(
                item?.mean_ensemble_suitability ||
                0
              );

            const width =
              `${Math.max(
                (observations / maxObservations) * 100,
                3
              )}%`;


            return (

              <div
                className="season-row"
                key={season}
              >

                <div className="season-row-top">

                  <div>

                    <strong>
                      {season}
                    </strong>

                    <small>
                      {seasonMonths[season]}
                    </small>

                  </div>

                  <div className="season-value">

                    {observations.toLocaleString()}

                  </div>

                </div>


                <div className="season-bar">

                  <div
                    className="season-bar-fill"
                    style={{
                      width
                    }}
                  />

                </div>


                <div className="season-meta">

                  Mean suitability:
                  {" "}
                  {suitability
                    ? suitability.toFixed(3)
                    : "—"}

                </div>

              </div>

            );

          })}

        </div>

      )}

    </div>

  );
}


function HotspotAnalysis() {

  const [season, setSeason] =
    useState("Winter");

  const [data, setData] =
    useState([]);

  const [loading, setLoading] =
    useState(true);


  useEffect(() => {

    async function load() {

      try {

        setLoading(true);

        const result =
          await getHotspots(season);

        setData(
          result.data || []
        );

      } catch (error) {

        console.error(
          "Hotspot error:",
          error
        );

        setData([]);

      } finally {

        setLoading(false);

      }

    }

    load();

  }, [season]);


  const totalClustered =
    data.reduce(
      (sum, item) =>
        sum +
        Number(
          item.n_observations ||
          item.observations ||
          0
        ),
      0
    );


  return (

    <div className="analytics-card hotspot-card">

      <div className="analytics-card-header">

        <div>

          <span>
            SPATIAL HOTSPOTS
          </span>

          <h3>
            Seasonal Concentration
          </h3>

        </div>

        <Flame size={21} />

      </div>


      <div className="hotspot-controls">

        {seasons.map(item => (

          <button
            key={item}
            className={
              season === item
                ? "active"
                : ""
            }
            onClick={() =>
              setSeason(item)
            }
          >
            {item}
          </button>

        ))}

      </div>


      {loading ? (

        <div className="analytics-loading">
          Loading hotspots...
        </div>

      ) : (

        <>

          <div className="hotspot-summary">

            <div>

              <strong>
                {data.length}
              </strong>

              <span>
                hotspots
              </span>

            </div>


            <div>

              <strong>
                {totalClustered.toLocaleString()}
              </strong>

              <span>
                clustered observations
              </span>

            </div>

          </div>


          <div className="hotspot-list">

            {data
              .slice()
              .sort(
                (a, b) =>
                  Number(
                    b.n_observations ||
                    b.observations ||
                    0
                  ) -
                  Number(
                    a.n_observations ||
                    a.observations ||
                    0
                  )
              )
              .slice(0, 5)
              .map((item, index) => {

                const count =
                  Number(
                    item.n_observations ||
                    item.observations ||
                    0
                  );

                const lat =
                  Number(
                    item.centroid_lat
                  );

                const lon =
                  Number(
                    item.centroid_lon
                  );

                return (

                  <div
                    className="hotspot-row"
                    key={
                      item.cluster_id ??
                      index
                    }
                  >

                    <div className="hotspot-rank">

                      {index + 1}

                    </div>


                    <div className="hotspot-location">

                      <strong>
                        Hotspot {index + 1}
                      </strong>

                      <small>

                        {Number.isFinite(lat)
                          ? lat.toFixed(2)
                          : "—"}
                        {"° N, "}
                        {Number.isFinite(lon)
                          ? lon.toFixed(2)
                          : "—"}
                        {"° E"}

                      </small>

                    </div>


                    <div className="hotspot-count">

                      {count.toLocaleString()}

                    </div>

                  </div>

                );

              })}

          </div>

          <div className="hotspot-note">

            <MapPinned size={15} />

            <span>
              Hotspots are seasonal spatial
              clusters detected from observation
              locations using DBSCAN.
            </span>

          </div>

        </>

      )}

    </div>

  );
}


export default function MigrationAnalytics() {

  return (

    <div className="migration-analytics-grid">

      <SeasonalDistribution />

      <HotspotAnalysis />

    </div>

  );
}
