import { useState, useEffect } from "react";
import petService from "../services/petService";
import groomerService from "../services/groomerService";

// hook to fetch pets and groomers data
const useInitialData = (shouldFetch = true) => {
  // if shouldFetch is false, skip the fetching logic (conditional fetching)
  const [data, setData] = useState({ pets: [], groomers: [] }); // data is object with 2 arrays, pets and groomers
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!shouldFetch) return; // if shouldFetch is false, effect exits immediately preventing data fetching

    const fetchData = async () => {
      try {
        setLoading(true);
        // fetches data from 2 services concurrently, ensuring both data sources are loaded in parallel
        const [pets, groomers] = await Promise.all([
          petService.getUserPets(), // fetch list of user pets
          groomerService.getAllGroomers(), // fetch list of all groomers
        ]);

        setData({ pets, groomers }); // sets data state with fetched pets and groomers when both promises resolve
      } catch (err) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [shouldFetch]); // useEffect hook depends on shouldFetch, meaning any change to shouldFetch triggers this effect

  return { ...data, loading, error }; // returns an object that spreads the data object along with loading and error states
};

export default useInitialData;
