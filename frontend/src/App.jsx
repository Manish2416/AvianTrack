
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
import MigrationAnalytics from "./MigrationAnalytics";
import MultiSpeciesExplorer from "./MultiSpeciesExplorer.jsx";


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

  // Main application view
  const [view, setView]
    = useState("home");

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

const [year, setYear] = useState("");
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

            year:
            year
              ? Number(year)
              : undefined,
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

  }, [year, month, source]);


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

            <button
              className={
                view === "home"
                  ? "nav-link active"
                  : "nav-link"
              }
              onClick={() => {
                setView("home");
                setMobileMenu(false);
                window.scrollTo({
                  top: 0,
                  behavior: "smooth"
                });
              }}
            >
              Home
            </button>

            <button
              className={
                view === "explore"
                  ? "nav-link active"
                  : "nav-link"
              }
              onClick={() => {
                setView("explore");
                setMobileMenu(false);
                window.scrollTo({
                  top: 0,
                  behavior: "smooth"
                });
              }}
            >
              Explore Species
            </button>

            <button
              className={
                view === "research"
                  ? "nav-link active"
                  : "nav-link"
              }
              onClick={() => {
                setView("research");
                setMobileMenu(false);
                window.scrollTo({
                  top: 0,
                  behavior: "smooth"
                });
              }}
            >
              Research
            </button>

            <button
              className={
                view === "about"
                  ? "nav-link active"
                  : "nav-link"
              }
              onClick={() => {
                setView("about");
                setMobileMenu(false);
                window.scrollTo({
                  top: 0,
                  behavior: "smooth"
                });
              }}
            >
              About
            </button>

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

      {view === "home" && (
        <section className="home-page">

          {/* ==================================================
              HOME HERO
          =================================================== */}

          <div className="home-hero">

            <div className="home-hero-inner">

              <div className="home-hero-copy">

                <div className="home-eyebrow">
                  AVIANTRACK
                  <span className="home-eyebrow-line"></span>
                  SPATIOTEMPORAL BIRD ANALYTICS
                </div>

                <h1>
                  Explore where birds
                  <span> occur and move.</span>
                </h1>

                <p className="home-hero-description">
                  Explore bird observations across space and time,
                  examine seasonal distribution, and understand the
                  environmental conditions associated with recorded
                  observations.
                </p>

                <div className="home-hero-actions">

                  <button
                    className="home-primary-action"
                    onClick={() => {
                      setView("explore");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <span>Explore Species</span>
                    <span className="action-arrow">→</span>
                  </button>

                  <button
                    className="home-secondary-action"
                    onClick={() => {
                      setView("research");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    View Research
                  </button>

                </div>

              </div>

              <div className="home-hero-visual">

                <div className="home-visual-card">

                  <div className="home-visual-top">
                    <span>OBSERVATION ANALYTICS</span>
                    <span className="home-live-dot"></span>
                  </div>

                  <div className="home-map-visual">

                    <div className="home-map-grid"></div>

                    <div className="home-map-route route-one"></div>
                    <div className="home-map-route route-two"></div>

                    <span className="map-point point-one"></span>
                    <span className="map-point point-two"></span>
                    <span className="map-point point-three"></span>
                    <span className="map-point point-four"></span>
                    <span className="map-point point-five"></span>

                    <div className="home-map-label">
                      <strong>Bird observations</strong>
                      <span>Spatial distribution</span>
                    </div>

                  </div>

                  <div className="home-visual-footer">
                    <div>
                      <strong>SPACE</strong>
                      <span>Where</span>
                    </div>
                    <div>
                      <strong>TIME</strong>
                      <span>When</span>
                    </div>
                    <div>
                      <strong>ENVIRONMENT</strong>
                      <span>Conditions</span>
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>


          {/* ==================================================
              CORE FEATURES
          =================================================== */}

          <section className="home-features">

            <div className="home-section-container">

              <div className="home-section-heading">

                <div>
                  <span className="home-section-number">01</span>

                  <div>
                    <span className="section-label">
                      EXPLORE THE PLATFORM
                    </span>

                    <h2>
                      From observation records
                      <span> to ecological patterns.</span>
                    </h2>
                  </div>
                </div>

                <p>
                  AvianTrack connects bird observations with
                  geographic, temporal and environmental information
                  to make distribution patterns easier to explore.
                </p>

              </div>


              <div className="home-feature-grid">

                <article className="home-feature-card">

                  <div className="home-feature-index">01</div>

                  <div className="home-feature-icon">
                    <Bird size={22} />
                  </div>

                  <h3>Explore Species</h3>

                  <p>
                    Search birds using common or scientific names
                    and open their observation history.
                  </p>

                  <button
                    onClick={() => {
                      setView("explore");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Open explorer <span>→</span>
                  </button>

                </article>


                <article className="home-feature-card">

                  <div className="home-feature-index">02</div>

                  <div className="home-feature-icon">
                    <MapIcon size={22} />
                  </div>

                  <h3>Map Observations</h3>

                  <p>
                    See where and when birds have been recorded
                    through interactive geographic views.
                  </p>

                  <button
                    onClick={() => {
                      setView("explore");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Explore observations <span>→</span>
                  </button>

                </article>


                <article className="home-feature-card">

                  <div className="home-feature-index">03</div>

                  <div className="home-feature-icon">
                    <Activity size={22} />
                  </div>

                  <h3>Understand Patterns</h3>

                  <p>
                    Examine seasonal distribution and environmental
                    conditions associated with observations.
                  </p>

                  <button
                    onClick={() => {
                      setView("explore");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    View analytics <span>→</span>
                  </button>

                </article>

              </div>

            </div>

          </section>


          {/* ==================================================
              RESEARCH CALLOUT
          =================================================== */}

          <section className="home-research">

            <div className="home-section-container">

              <div className="home-research-card">

                <div className="home-research-content">

                  <span className="section-label">
                    RESEARCH MODULE
                  </span>

                  <h2>
                    Studying the
                    <span> Bar-headed Goose</span>
                  </h2>

                  <p>
                    A dedicated research workflow combines
                    spatiotemporal analysis, migration patterns,
                    environmental data and habitat-suitability
                    modelling for <em>Anser indicus</em>.
                  </p>

                  <button
                    onClick={() => {
                      setView("research");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Open research dashboard
                    <span>→</span>
                  </button>

                </div>

                <div className="home-research-species">

                  <div className="research-species-circle">
                    <Bird size={54} />
                  </div>

                  <span className="research-species-name">
                    Anser indicus
                  </span>

                  <span className="research-species-common">
                    Bar-headed Goose
                  </span>

                </div>

              </div>

            </div>

          </section>

        </section>
      )}

      {view === "research" && (
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
                value={year}
                onChange={e =>
                  setYear(
                    e.target.value
                  )
                }
              >

                <option value="">
                  All Years
                </option>

                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
                <option value="2020">2020</option>
                <option value="2019">2019</option>
                <option value="2018">2018</option>
                <option value="2017">2017</option>
                <option value="2016">2016</option>
                <option value="2015">2015</option>
                <option value="2014">2014</option>
                <option value="2013">2013</option>
                <option value="2012">2012</option>
                <option value="2011">2011</option>
                <option value="2010">2010</option>
                <option value="2009">2009</option>
                <option value="2008">2008</option>
                <option value="2007">2007</option>
                <option value="2006">2006</option>

              </select>


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

              {(year || month || source) && (
                <button
                  type="button"
                  className="filter-reset"
                  onClick={() => {
                    setYear("");
                    setMonth("");
                    setSource("");
                  }}
                >
                  Reset
                </button>
              )}

            </div>

          </div>


          <div className="map-status">

            {loading
              ? "Loading observations..."
              : `${observations.length.toLocaleString()} of 54,809 observations displayed`
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
                Explore monthly and seasonal distribution,
                geographic centroid shifts, and spatial
                concentration patterns.
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
                      fill="#4c7c70"
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

          <MigrationAnalytics />

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


        </main>
        )}

      {view === "about" && (
        <section className="about-page">

          {/* ==================================================
              ABOUT HERO
          =================================================== */}

          <section className="about-hero">

            <div className="about-container">

              <div className="about-hero-label">
                ABOUT AVIANTRACK
              </div>

              <div className="about-hero-grid">

                <h1>
                  A data-driven approach
                  <span> to bird distribution.</span>
                </h1>

                <p>
                  AvianTrack is a geospatial analytics platform
                  designed to explore where birds occur, when they
                  are observed, and which environmental conditions
                  are associated with those observations.
                </p>

              </div>

            </div>

          </section>


          {/* ==================================================
              WHAT AVIANTRACK DOES
          =================================================== */}

          <section className="about-overview">

            <div className="about-container">

              <div className="about-section-intro">

                <span className="section-label">
                  WHAT AVIANTRACK DOES
                </span>

                <h2>
                  Turning observation records
                  <span> into interpretable patterns.</span>
                </h2>

              </div>


              <div className="about-capability-grid">

                <article className="about-capability">

                  <span>01</span>

                  <div className="about-capability-icon">
                    <Bird size={21} />
                  </div>

                  <h3>Species Exploration</h3>

                  <p>
                    Search and explore bird species using familiar
                    common names or scientific names.
                  </p>

                </article>


                <article className="about-capability">

                  <span>02</span>

                  <div className="about-capability-icon">
                    <MapIcon size={21} />
                  </div>

                  <h3>Spatial Visualization</h3>

                  <p>
                    Visualize recorded observations on interactive
                    maps and examine their geographic distribution.
                  </p>

                </article>


                <article className="about-capability">

                  <span>03</span>

                  <div className="about-capability-icon">
                    <Activity size={21} />
                  </div>

                  <h3>Temporal Analysis</h3>

                  <p>
                    Examine observations across years, months and
                    seasons to understand distribution over time.
                  </p>

                </article>


                <article className="about-capability">

                  <span>04</span>

                  <div className="about-capability-icon">
                    <BarChart3 size={21} />
                  </div>

                  <h3>Environmental Context</h3>

                  <p>
                    Connect observations with temperature,
                    elevation and land-cover information.
                  </p>

                </article>

              </div>

            </div>

          </section>


          {/* ==================================================
              RESEARCH MODULE
          =================================================== */}

          <section className="about-research">

            <div className="about-container">

              <div className="about-research-card">

                <div className="about-research-copy">

                  <span className="section-label">
                    DEDICATED RESEARCH MODULE
                  </span>

                  <h2>
                    Bar-headed Goose
                    <span> research workflow.</span>
                  </h2>

                  <p>
                    The research module focuses on
                    <em> Anser indicus</em> and combines
                    observation data, spatiotemporal analysis,
                    environmental variables, migration analysis
                    and habitat-suitability modelling.
                  </p>

                  <button
                    onClick={() => {
                      setView("research");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Explore research
                    <span>→</span>
                  </button>

                </div>


                <div className="about-research-meta">

                  <div>
                    <strong>SPECIES</strong>
                    <span>Anser indicus</span>
                  </div>

                  <div>
                    <strong>FOCUS</strong>
                    <span>Distribution · Migration · Habitat</span>
                  </div>

                  <div>
                    <strong>APPROACH</strong>
                    <span>Geospatial + Data Science</span>
                  </div>

                </div>

              </div>

            </div>

          </section>


          {/* ==================================================
              PROJECT APPROACH
          =================================================== */}

          <section className="about-method">

            <div className="about-container">

              <div className="about-method-heading">

                <span className="section-label">
                  PROJECT APPROACH
                </span>

                <h2>
                  Data → Analysis → Visualization
                </h2>

              </div>


              <div className="about-method-grid">

                <div className="about-method-step">
                  <span>01</span>
                  <h3>Collect</h3>
                  <p>
                    Bird occurrence and environmental datasets
                    are prepared for analysis.
                  </p>
                </div>

                <div className="about-method-step">
                  <span>02</span>
                  <h3>Clean</h3>
                  <p>
                    Records are filtered, deduplicated and
                    organized for consistent spatial analysis.
                  </p>
                </div>

                <div className="about-method-step">
                  <span>03</span>
                  <h3>Analyze</h3>
                  <p>
                    Spatial, temporal and environmental patterns
                    are examined using analytical methods.
                  </p>
                </div>

                <div className="about-method-step">
                  <span>04</span>
                  <h3>Visualize</h3>
                  <p>
                    Results are presented through interactive maps,
                    analytics and research dashboards.
                  </p>
                </div>

              </div>

            </div>

          </section>

        </section>
      )}

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

          <span className="footer-tagline">
            Explore • Analyze • Understand
          </span>

        </div>

      </footer>

    
      {view === "explore" && (
        <section className="explore-species-page">

          <MultiSpeciesExplorer />

        </section>
      )}

</div>
  );
}


export default App;
