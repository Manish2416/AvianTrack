
import {
  useEffect,
  useState
} from "react";

import {
  Search,
  Bird,
  MapPin,
  CalendarDays,
  Layers,
  Thermometer
} from "lucide-react";

import {
  searchMultiSpecies,
  getMultiSpeciesObservations,
  getMultiSpeciesAnalytics
} from "./api.js";

import MultiSpeciesObservationMap from "./MultiSpeciesObservationMap.jsx";
import MultiSpeciesAnalytics from "./MultiSpeciesAnalytics.jsx";


function MultiSpeciesExplorer() {

  const [
    search,
    setSearch
  ] = useState("");

  const [
    results,
    setResults
  ] = useState([]);

  const [
    selectedSpecies,
    setSelectedSpecies
  ] = useState(null);

  const [
    observations,
    setObservations
  ] = useState([]);

  const [
    analytics,
    setAnalytics
  ] = useState(null);

  const [
    loadingSearch,
    setLoadingSearch
  ] = useState(false);

  const [
    loadingSpecies,
    setLoadingSpecies
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");


  // ============================================================
  // SEARCH SPECIES
  // ============================================================

  useEffect(() => {

    const timer =
      setTimeout(
        async () => {

          try {

            setLoadingSearch(true);
            setError("");

            const result =
              await searchMultiSpecies(
                search,
                10
              );

            setResults(
              result.data || []
            );

          } catch (err) {

            console.error(
              "Species search error:",
              err
            );

            setError(
              "Unable to search species."
            );

          } finally {

            setLoadingSearch(false);

          }

        },
        300
      );

    return () =>
      clearTimeout(timer);

  }, [search]);


  // ============================================================
  // SELECT SPECIES
  // ============================================================

  async function handleSelectSpecies(
    species
  ) {

    try {

      setSelectedSpecies(species);
      setLoadingSpecies(true);
      setError("");

      const [
        observationData,
        analyticsData
      ] = await Promise.all([

        getMultiSpeciesObservations(
          species.species_key,
          {
            limit: 5000
          }
        ),

        getMultiSpeciesAnalytics(
          species.species_key
        )

      ]);

      setObservations(
        observationData.data || []
      );

      setAnalytics(
        analyticsData
      );

      setResults([]);

    } catch (err) {

      console.error(
        "Species loading error:",
        err
      );

      setError(
        "Unable to load species data."
      );

    } finally {

      setLoadingSpecies(false);

    }
  }


  // ============================================================
  // RENDER
  // ============================================================

  return (

    <section
      className="multispecies-section"
      id="species-explorer"
    >

      <div className="multispecies-container">

        {/* ======================================================
            HEADER
        ======================================================= */}

        <div className="section-heading">

          <div>

            <div className="section-label">
              EXPLORE SPECIES
            </div>

            <h2>
              Discover bird observations
            </h2>

            <p>
              Search a bird species to explore
              its recorded locations, observation
              dates and associated environmental
              conditions.
            </p>

          </div>

        </div>


        {/* ======================================================
            SEARCH
        ======================================================= */}

        <div className="species-search-wrapper">

          <Search size={19} />

          <input
            type="text"
            value={search}
            onChange={
              event =>
                setSearch(
                  event.target.value
                )
            }
            placeholder="Search by scientific name..."
            aria-label="Search bird species"
          />

          {loadingSearch && (
            <span className="search-loading">
              Searching...
            </span>
          )}

        </div>


        {/* ======================================================
            SEARCH RESULTS
        ======================================================= */}

        {results.length > 0 && (

          <div className="species-search-results">

            {results.map(
              species => (

                <button
                  key={
                    species.species_key
                  }
                  className="species-result"
                  onClick={() =>
                    handleSelectSpecies(
                      species
                    )
                  }
                >

                  <div className="species-result-icon">
                    <Bird size={19} />
                  </div>

                  <div className="species-result-text">

                    <strong>
                      {species.scientific_name}
                    </strong>

                    <span>
                      {species.sampled_observation_count}
                      {" "}sampled observations
                    </span>

                  </div>

                </button>

              )
            )}

          </div>

        )}


        {/* ======================================================
            ERROR
        ======================================================= */}

        {error && (

          <div className="multispecies-error">
            {error}
          </div>

        )}


        {/* ======================================================
            SELECTED SPECIES
        ======================================================= */}

        {selectedSpecies && (

          <div className="selected-species-panel">

            <div className="selected-species-header">

              <div className="selected-species-title">

                <div className="selected-species-icon">
                  <Bird size={26} />
                </div>

                <div>

                  <div className="section-label">
                    SELECTED SPECIES
                  </div>

                  <h3>
                    {selectedSpecies.scientific_name}
                  </h3>

                </div>

              </div>

              {selectedSpecies.iucn_category && (

                <div className="iucn-badge">
                  IUCN:{" "}
                  {selectedSpecies.iucn_category}
                </div>

              )}

            </div>


            {/* ==================================================
                SUMMARY CARDS
            =================================================== */}

            <div className="species-summary-grid">

              <div className="species-summary-card">

                <MapPin size={19} />

                <div>

                  <span>
                    OBSERVATIONS
                  </span>

                  <strong>
                    {selectedSpecies
                      .sampled_observation_count
                      .toLocaleString()}
                  </strong>

                </div>

              </div>


              <div className="species-summary-card">

                <CalendarDays size={19} />

                <div>

                  <span>
                    OBSERVATION PERIOD
                  </span>

                  <strong>
                    {selectedSpecies
                      .first_observation
                      ?.slice(0, 4)}
                    {" – "}
                    {selectedSpecies
                      .last_observation
                      ?.slice(0, 4)}
                  </strong>

                </div>

              </div>


              <div className="species-summary-card">

                <Layers size={19} />

                <div>

                  <span>
                    SPATIAL GRIDS
                  </span>

                  <strong>
                    {selectedSpecies
                      .grid_count}
                  </strong>

                </div>

              </div>


              <div className="species-summary-card">

                <Thermometer size={19} />

                <div>

                  <span>
                    STATES
                  </span>

                  <strong>
                    {selectedSpecies
                      .state_count}
                  </strong>

                </div>

              </div>

            </div>


            {/* ==================================================
                LOADING
            =================================================== */}

            {loadingSpecies && (

              <div className="multispecies-loading">
                Loading species observations
                and environmental data...
              </div>

            )}


            {/* ==================================================
                DATA STATUS
            =================================================== */}

            {!loadingSpecies &&
              analytics && (

                
<div className="multispecies-data-status">

                  <strong>
                    Species data loaded
                  </strong>

                  <span>
                    {observations.length.toLocaleString()}
                    {" "}observation records available
                    for exploration.
                  </span>

                </div>

              )}



            {/* ==================================================
                OBSERVATION MAP
                ================================================== */}

            {!loadingSpecies &&
              analytics && (

                <MultiSpeciesObservationMap
                  observations={observations}
                  speciesName={
                    selectedSpecies.scientific_name
                  }
                />

              )}

          </div>

        )}


            {/* ==================================================
                SPECIES ANALYTICS
                ================================================== */}

            {!loadingSpecies &&
              analytics && (

                <MultiSpeciesAnalytics
                  analytics={analytics}
                />

              )}

      </div>

    </section>

  );

}


export default MultiSpeciesExplorer;
