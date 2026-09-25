
import {
  CalendarDays,
  Thermometer,
  Mountain,
  Trees
} from "lucide-react";


function formatNumber(value, decimals = 0) {

  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return Number(value).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: decimals
    }
  );
}


function formatTemperature(value) {

  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return `${Number(value).toFixed(1)} °C`;
}


function formatElevation(value) {

  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return `${Number(value).toFixed(0)} m`;
}


function getMonthName(month) {

  const names = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];

  return names[
    Number(month) - 1
  ] || String(month);
}


function MultiSpeciesAnalytics({
  analytics
}) {

  if (!analytics) {
    return null;
  }


  // ============================================================
  // MONTHLY DISTRIBUTION
  // ============================================================

  const monthly =
    analytics.monthly || [];

  const maxMonthly =
    Math.max(
      ...monthly.map(
        item => Number(item.observation_count) || 0
      ),
      1
    );


  // ============================================================
  // SEASONAL DISTRIBUTION
  // ============================================================

  const seasonal =
    analytics.seasonal || [];

  const maxSeasonal =
    Math.max(
      ...seasonal.map(
        item => Number(item.observation_count) || 0
      ),
      1
    );


  // ============================================================
  // ENVIRONMENTAL SUMMARIES
  // ============================================================

  const temperature =
    analytics.temperature || {};

  const elevation =
    analytics.elevation || {};


  // ============================================================
  // LAND COVER
  // ============================================================

  const landCover =
    analytics.land_cover || [];

  const maxLandCover =
    Math.max(
      ...landCover.map(
        item => Number(item.observation_count) || 0
      ),
      1
    );


  return (

    <div className="multispecies-analytics">

      {/* ======================================================
          ANALYTICS HEADER
          ======================================================= */}

      <div className="multispecies-analytics-header">

        <div>

          <span className="section-label">
            SPECIES ANALYTICS
          </span>

          <h4>
            Distribution and environmental patterns
          </h4>

          <p>
            Descriptive summaries of observations
            in the AvianTrack sample.
          </p>

        </div>

      </div>


      {/* ======================================================
          MONTHLY DISTRIBUTION
          ======================================================= */}

      <div className="analytics-card">

        <div className="analytics-card-header">

          <div className="analytics-card-title">

            <CalendarDays size={19} />

            <div>

              <h5>
                Monthly Distribution
              </h5>

              <span>
                Sampled observations by month
              </span>

            </div>

          </div>

        </div>


        <div className="monthly-chart">

          {monthly.map(
            item => {

              const count =
                Number(item.observation_count) || 0;

              const height =
                Math.max(
                  (count / maxMonthly) * 100,
                  count > 0 ? 4 : 0
                );

              return (

                <div
                  className="monthly-column"
                  key={item.month}
                >

                  <div className="monthly-value">
                    {count > 0
                      ? count.toLocaleString()
                      : ""}
                  </div>

                  <div className="monthly-bar-area">

                    <div
                      className="monthly-bar"
                      style={{
                        height: `${height}%`
                      }}
                    />

                  </div>

                  <div className="monthly-label">
                    {getMonthName(
                      item.month
                    )}
                  </div>

                </div>

              );

            }
          )}

        </div>

      </div>


      {/* ======================================================
          SEASONAL DISTRIBUTION
          ======================================================= */}

      <div className="analytics-card">

        <div className="analytics-card-header">

          <div className="analytics-card-title">

            <CalendarDays size={19} />

            <div>

              <h5>
                Seasonal Distribution
              </h5>

              <span>
                Sampled observations grouped by season
              </span>

            </div>

          </div>

        </div>


        <div className="seasonal-list">

          {seasonal.map(
            item => {

              const count =
                Number(item.observation_count) || 0;

              const width =
                (count / maxSeasonal) * 100;

              return (

                <div
                  className="seasonal-row"
                  key={item.season}
                >

                  <div className="seasonal-row-label">
                    <span>
                      {item.season}
                    </span>

                    <strong>
                      {count.toLocaleString()}
                    </strong>
                  </div>

                  <div className="seasonal-track">

                    <div
                      className="seasonal-fill"
                      style={{
                        width: `${width}%`
                      }}
                    />

                  </div>

                </div>

              );

            }
          )}

        </div>

      </div>


      {/* ======================================================
          ENVIRONMENTAL SUMMARY
          ======================================================= */}

      <div className="environment-summary-grid">

        {/* Temperature */}

        <div className="environment-card">

          <div className="environment-card-icon">
            <Thermometer size={20} />
          </div>

          <div className="environment-card-title">
            Temperature
          </div>

          <div className="environment-card-subtitle">
            Conditions associated with observations
          </div>

          <div className="environment-values">

            <div>
              <span>
                Minimum
              </span>

              <strong>
                {formatTemperature(
                  temperature.minimum_c
                )}
              </strong>
            </div>

            <div>
              <span>
                Mean
              </span>

              <strong>
                {formatTemperature(
                  temperature.mean_c
                )}
              </strong>
            </div>

            <div>
              <span>
                Maximum
              </span>

              <strong>
                {formatTemperature(
                  temperature.maximum_c
                )}
              </strong>
            </div>

          </div>

        </div>


        {/* Elevation */}

        <div className="environment-card">

          <div className="environment-card-icon">
            <Mountain size={20} />
          </div>

          <div className="environment-card-title">
            Elevation
          </div>

          <div className="environment-card-subtitle">
            Elevation at recorded locations
          </div>

          <div className="environment-values">

            <div>
              <span>
                Minimum
              </span>

              <strong>
                {formatElevation(
                  elevation.minimum_m
                )}
              </strong>
            </div>

            <div>
              <span>
                Mean
              </span>

              <strong>
                {formatElevation(
                  elevation.mean_m
                )}
              </strong>
            </div>

            <div>
              <span>
                Maximum
              </span>

              <strong>
                {formatElevation(
                  elevation.maximum_m
                )}
              </strong>
            </div>

          </div>

        </div>

      </div>


      {/* ======================================================
          LAND COVER
          ======================================================= */}

      <div className="analytics-card">

        <div className="analytics-card-header">

          <div className="analytics-card-title">

            <Trees size={19} />

            <div>

              <h5>
                Land Cover at Observation Locations
              </h5>

              <span>
                WorldCover classes represented in the sample
              </span>

            </div>

          </div>

        </div>


        <div className="landcover-list">

          {landCover.map(
            item => {

              const count =
                Number(item.observation_count) || 0;

              const width =
                (count / maxLandCover) * 100;

              return (

                <div
                  className="landcover-row"
                  key={
                    item.land_cover_name
                  }
                >

                  <div className="landcover-row-label">

                    <span>
                      {item.land_cover_name}
                    </span>

                    <strong>
                      {count.toLocaleString()}
                    </strong>

                  </div>

                  <div className="landcover-track">

                    <div
                      className="landcover-fill"
                      style={{
                        width: `${width}%`
                      }}
                    />

                  </div>

                </div>

              );

            }
          )}

        </div>

      </div>


      {/* ======================================================
          DATA NOTE
          ======================================================= */}

      <div className="multispecies-analytics-note">

        <strong>
          Data note
        </strong>

        <span>
          These charts describe the controlled
          AvianTrack observation sample. They should
          not be interpreted as population abundance,
          population size, or proof of habitat preference.
        </span>

      </div>

    </div>

  );

}


export default MultiSpeciesAnalytics;
