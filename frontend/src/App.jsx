
import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  BarChart3,
  Bird,
  Database,
  Layers,
  Menu,
  X,
  Map as MapIcon,
  Activity,
  Filter
} from "lucide-react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

import ObservationMap
  from "./ObservationMap.jsx";

import {
  getSpecies,
  getObservations,
  getMonthlyDistribution,
  getCentroids,
  getHabitatSummary
} from "./api.js";

import "./App.css";
import HabitatSuitabilityMap from "./HabitatSuitabilityMap";


function StatCard({
  icon,
  label,
  value,
  description
}) {

  return (

    <div className="stat-card">

      <div className="stat-icon">
        {icon}
      </div>

      <div className="stat-content">

        <div className="stat-label">
          {label}
        </div>

        <div className="stat-value">
          {value}
        </div>

        <div className="stat-description">
          {description}
        </div>

      </div>

    </div>

  );
}


function App() {

  const [mobileMenu, setMobileMenu]
    = useState(false);

  const [species, setSpecies]
    = useState(null);

  const [observations, setObservations]
    = useState([]);

  const [monthly, setMonthly]
    = useState([]);

  const [centroids, setCentroids]
    = useState([]);

  const [habitat, setHabitat]
    = useState(null);

  const [month, setMonth]
    = useState("");

  const [source, setSource]
    = useState("");

  const [loading, setLoading]
    = useState(true);

  const [error, setError]
    = useState("");


  // ============================================================
  // INITIAL DATA
  // ============================================================

  useEffect(() => {

    async function loadData() {

      try {

        setLoading(true);

        const [
          speciesData,
          observationData,
          monthlyData,
          centroidData,
          habitatData
        ] = await Promise.all([

          getSpecies(),

          getObservations({
            limit: 5000
          }),

          getMonthlyDistribution(),

          getCentroids(),

          getHabitatSummary()

        ]);


        setSpecies(
          speciesData[0]
        );

        setObservations(
          observationData.data
        );

        setMonthly(
          monthlyData.data
        );

        setCentroids(
          centroidData.data
        );

        setHabitat(
          habitatData
        );

      } catch (err) {

        console.error(err);

        setError(
          "Unable to connect to AvianTrack API."
        );

      } finally {

        setLoading(false);

      }

    }

    loadData();

  }, []);


  // ============================================================
  // FILTER OBSERVATIONS
  // ============================================================

  useEffect(() => {

    async function loadFiltered() {

      try {

        const result =
          await getObservations({

            month:
              month
                ? Number(month)
                : undefined,

            source:
              source || undefined,

            limit: 5000

          });

        setObservations(
          result.data
        );

      } catch (err) {

        console.error(err);

      }

    }

    loadFiltered();

  }, [month, source]);


  // ============================================================
  // MONTHLY CHART
  // ============================================================

  const chartData = useMemo(() => {

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

    return monthly.map(
      item => ({

        month:
          names[
            Number(item.MONTH) - 1
          ],

        observations:
          Number(
            item.n_observations
          )

      })
    );

  }, [monthly]);


  // ============================================================
  // RENDER
  // ============================================================

  return (

    <div className="app">

      {/* ======================================================
          NAVIGATION
      ======================================================= */}

      <header className="navbar">

        <div className="nav-container">

          <div className="brand">

            <div className="brand-icon">
              <Bird size={24} />
            </div>

            <div>

              <div className="brand-name">
                AvianTrack
              </div>

              <div className="brand-subtitle">
                Bird Distribution Analytics
              </div>

            </div>

          </div>


          <nav
            className={
              `nav-links ${
                mobileMenu
                  ? "open"
                  : ""
              }`
            }
          >

            <a href="#dashboard">
              Dashboard
            </a>

            <a href="#map">
              Distribution Map
            </a>

            <a href="#analytics">
              Analytics
            </a>

            <a href="#habitat">
              Habitat
            </a>

            <a href="#about">
              About
            </a>

          </nav>


          <button
            className="menu-button"
            onClick={() =>
              setMobileMenu(
                !mobileMenu
              )
            }
          >

            {mobileMenu
              ? <X size={24} />
              : <Menu size={24} />
            }

          </button>

        </div>

      </header>


      {/* ======================================================
          ERROR
      ======================================================= */}

      {error && (

        <div className="api-error">
          {error}
        </div>

      )}


      {/* ======================================================
          HERO
      ======================================================= */}

      <main>

        <section
          className="hero"
          id="dashboard"
        >

          <div className="hero-container">

            <div className="hero-text">

              <div className="eyebrow">
                SPATIOTEMPORAL BIRD ANALYTICS
              </div>

              <h1>
                Understanding bird
                <span>
                  {" "}movement through data.
                </span>
              </h1>

              <p>
                AvianTrack combines biodiversity
                observations, environmental data
                and machine-learning models to
                explore bird distribution, seasonal
                movement and habitat suitability.
              </p>


              <div className="hero-actions">

                <a
                  href="#map"
                  className="primary-button"
                >
                  Explore Map
                  <MapIcon size={18} />
                </a>

                <a
                  href="#analytics"
                  className="secondary-button"
                >
                  View Analytics
                </a>

              </div>

            </div>


            <div className="hero-species">

              <div className="species-card">

                <div className="species-label">
                  PRIMARY CASE STUDY
                </div>

                <div className="species-bird">
                  🪿
                </div>

                <h2>
                  {species?.common_name
                    || "Bar-headed Goose"}
                </h2>

                <p className="scientific-name">
                  {species?.scientific_name
                    || "Anser indicus"}
                </p>

                <div className="species-divider" />

                <p>
                  A migratory waterbird used as
                  the primary species for the
                  AvianTrack analytical framework.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* ==================================================
            STATISTICS
        =================================================== */}

        <section className="stats-section">

          <div className="stats-container">

            <StatCard
              icon={<Database size={21} />}
              label="OBSERVATIONS"
              value={
                species
                  ? Number(
                      species.observation_count
                    ).toLocaleString()
                  : "—"
              }
              description="eBird + GBIF records"
            />

            <StatCard
              icon={<Activity size={21} />}
              label="DATED RECORDS"
              value={
                species
                  ? Number(
                      species.dated_observation_count
                    ).toLocaleString()
                  : "—"
              }
              description="Used for temporal analysis"
            />

            <StatCard
              icon={<Layers size={21} />}
              label="MODEL FEATURES"
              value="32"
              description="Environment + land cover"
            />

            <StatCard
              icon={<BarChart3 size={21} />}
              label="ML MODELS"
              value="2"
              description="Random Forest + XGBoost"
            />

          </div>

        </section>


        {/* ==================================================
            MAP
        =================================================== */}

        <section
          className="content-section"
          id="map"
        >

          <div className="section-heading">

            <div>

              <div className="section-label">
                EXPLORE
              </div>

              <h2>
                Bird Distribution Map
              </h2>

              <p>
                Explore observation locations and
                seasonal geographic patterns.
              </p>

            </div>


            <div className="map-filters">

              <Filter size={16} />

              <select
                value={month}
                onChange={e =>
                  setMonth(
                    e.target.value
                  )
                }
              >

                <option value="">
                  All Months
                </option>

                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>

              </select>


              <select
                value={source}
                onChange={e =>
                  setSource(
                    e.target.value
                  )
                }
              >

                <option value="">
                  All Sources
                </option>

                <option value="eBird">
                  eBird
                </option>

                <option value="GBIF">
                  GBIF
                </option>

              </select>

            </div>

          </div>


          <div className="map-status">

            {loading
              ? "Loading observations..."
              : `${observations.length.toLocaleString()} observations displayed`
            }

          </div>


          <div className="real-map">

            {!loading && (

              <ObservationMap
                observations={observations}
                centroids={centroids}
              />

            )}

          </div>

        </section>


        {/* ==================================================
            ANALYTICS
        =================================================== */}

        <section
          className="analytics-section"
          id="analytics"
        >

          <div className="section-heading">

            <div>

              <div className="section-label">
                ANALYZE
              </div>

              <h2>
                Migration & Distribution Analytics
              </h2>

              <p>
                Monthly observation activity from
                the AvianTrack dataset.
              </p>

            </div>

          </div>


          <div className="analytics-grid">

            <div className="analytics-card">

              <div className="analytics-card-header">

                <div>

                  <span>
                    MONTHLY DISTRIBUTION
                  </span>

                  <h3>
                    Observation Activity
                  </h3>

                </div>

                <BarChart3 size={21} />

              </div>


              <div className="chart-container">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <BarChart
                    data={chartData}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                    />

                    <XAxis
                      dataKey="month"
                    />

                    <YAxis />

                    <Tooltip />

                    <Bar
                      dataKey="observations"
                      radius={[
                        5,
                        5,
                        0,
                        0
                      ]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              </div>

            </div>


            <div className="analytics-card">

              <div className="analytics-card-header">

                <div>

                  <span>
                    MIGRATION
                  </span>

                  <h3>
                    Centroid Movement
                  </h3>

                </div>

                <MapIcon size={21} />

              </div>


              <div className="centroid-summary">

                <div className="centroid-number">

                  {centroids.length}

                </div>

                <div>

                  monthly centroid positions

                </div>

              </div>


              <div className="centroid-note">

                The trajectory represents the
                population-level geographic shift
                in observation centroids across
                months. It is not an individual
                bird tracking route.

              </div>

            </div>

          </div>

        </section>


        {/* ==================================================
            HABITAT
        =================================================== */}

        <section
          className="content-section"
          id="habitat"
        >

          <div className="habitat-card">

            <div className="habitat-text">

              <div className="section-label">
                MACHINE LEARNING
              </div>

              <h2>
                Habitat Suitability
              </h2>

              <p>
                AvianTrack combines Random Forest
                and XGBoost predictions to produce
                a continuous suitability surface
                across the modelling region.
              </p>


              <div className="model-tags">

                <span>
                  Random Forest
                </span>

                <span>
                  XGBoost
                </span>

                <span>
                  Ensemble
                </span>

              </div>


              {habitat && (

                <div className="habitat-stat">

                  <strong>
                    Mean suitability at observations
                  </strong>

                  <span>
                    {Number(
                      habitat.mean_observation_suitability
                    ).toFixed(3)}
                  </span>

                </div>

              )}

              <div className="model-performance">

                <div className="model-performance-header">

                  <div>
                    <span className="model-performance-label">
                      MODEL VALIDATION
                    </span>

                    <h3>
                      Spatial Cross-Validation
                    </h3>
                  </div>

                  <span className="feature-count">
                    32 features
                  </span>

                </div>


                <div className="model-performance-grid">

                  <div className="model-performance-card">

                    <span className="model-name">
                      Random Forest
                    </span>

                    <strong>
                      0.849
                    </strong>

                    <small>
                      ROC-AUC
                    </small>

                  </div>


                  <div className="model-performance-card">

                    <span className="model-name">
                      XGBoost
                    </span>

                    <strong>
                      0.847
                    </strong>

                    <small>
                      ROC-AUC
                    </small>

                  </div>


                  <div className="model-performance-card">

                    <span className="model-name">
                      MaxEnt
                    </span>

                    <strong>
                      0.686
                    </strong>

                    <small>
                      ROC-AUC
                    </small>

                  </div>

                </div>


                <p className="model-performance-note">
                  Scores are mean ROC-AUC values from spatial
                  cross-validation using environmental and
                  land-cover features.
                </p>

              </div>


              <div className="suitability-explanation">

                <strong>
                  How to read this map
                </strong>

                <p>
                  Higher values indicate areas with higher
                  modelled relative habitat suitability.
                  The suitability score is a model output and
                  does not guarantee species presence.
                </p>

              </div>

            </div>


            <HabitatSuitabilityMap />

          </div>

        </section>


        {/* ==================================================
            ABOUT
        =================================================== */}

        <section
          className="about-section"
          id="about"
        >

          <div className="about-container">

            <div>

              <div className="section-label">
                ABOUT AVIANTRACK
              </div>

              <h2>
                A data-driven view of bird movement.
              </h2>

            </div>

            <p>
              AvianTrack is a geospatial analytics
              platform designed to visualize bird
              observations and investigate
              spatiotemporal distribution, migration
              patterns and environmental associations.
            </p>

          </div>

        </section>

      </main>


      {/* ======================================================
          FOOTER
      ======================================================= */}

      <footer>

        <div className="footer-container">

          <div>

            <strong>
              AvianTrack
            </strong>

            <span>
              Spatiotemporal Bird Analytics Platform
            </span>

          </div>

          <span>
            Bar-headed Goose • Anser indicus
          </span>

        </div>

      </footer>

    </div>
  );
}


export default App;
