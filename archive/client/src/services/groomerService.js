import axios from "axios";
import { API_ENDPOINTS } from "../config/api";

const API_URL = API_ENDPOINTS.GROOMERS;

const getAllGroomers = async () => {
  try {
    const response = await axios.get(API_URL);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch groomers" };
  }
};

const getGroomerById = async (groomerId) => {
  try {
    const response = await axios.get(`${API_URL}/${groomerId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch groomer details" };
  }
};

/*
const date = new Date('2025-03-13T09:01:30Z');
const formattedDate = date instanceof Date ? date.toISOString().split("T")[0] : date;
console.log(formattedDate); Output: "2025-03-13"
*/
const getGroomerAvailability = async (groomerId, date, duration = 60) => {
  try {
    const formattedDate = date instanceof Date ? date.toISOString().split("T")[0] : date;
    const response = await axios.get(
      `${API_URL}/${groomerId}/availability?date=${formattedDate}&duration=${duration}`
    );

    // convert the dates to Date objects
    return response.data.map((slot) => ({
      ...slot,
      start: new Date(slot.start),
      end: new Date(slot.end),
    }));
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch groomer availability" };
  }
};

const groomerService = {
  getAllGroomers,
  getGroomerById,
  getGroomerAvailability,
};

export default groomerService;
