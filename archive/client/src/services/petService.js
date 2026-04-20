import axios from "axios";
import { API_ENDPOINTS } from "../config/api";

const API_URL = API_ENDPOINTS.PETS;

const getUserPets = async () => {
  try {
    const response = await axios.get(API_URL);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch pets" };
  }
};

const getPetById = async (petId) => {
  try {
    const response = await axios.get(`${API_URL}/${petId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch pet details" };
  }
};

const createPet = async (petData) => {
  try {
    const response = await axios.post(API_URL, petData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to create pet" };
  }
};

const updatePet = async (petId, petData) => {
  try {
    const response = await axios.put(`${API_URL}/${petId}`, petData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to update pet" };
  }
};

const deletePet = async (petId) => {
  try {
    const response = await axios.delete(`${API_URL}/${petId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to delete pet" };
  }
};

const petService = {
  getUserPets,
  getPetById,
  createPet,
  updatePet,
  deletePet,
};

export default petService;
