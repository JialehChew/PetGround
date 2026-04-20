import { useState, useEffect } from "react";
import groomerService from "../services/groomerService";

// hook to fetch availability slots for a groomer
const useAvailability = (groomerId, date, serviceType) => {
  const [slots, setSlots] = useState([]); // empty array to store time slots
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // fetchAvailability fetches available slots everytime groomerId, date or serviceType changes
  useEffect(() => {
    if (!groomerId || !date || !serviceType) {
      setSlots([]); // if any of the above are missing, reset slots to empty and exit early
      return;
    }

    const fetchAvailability = async () => {
      try {
        setLoading(true);
        const duration = serviceType === "basic" ? 60 : 120; // determine duration based on serviceType
        const availableSlots = await groomerService.getGroomerAvailability(
          groomerId, // service call to groomerService to get groomer's availability
          date,
          duration
        );
        setSlots(availableSlots); // returns an array of available timeslots
      } catch (err) {
        setError(err.message || "Failed to load availability");
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability(); // called immediately within useEffect hook to trigger the fetch
  }, [groomerId, date, serviceType]);

  return { slots, loading, error };
};

export default useAvailability;
