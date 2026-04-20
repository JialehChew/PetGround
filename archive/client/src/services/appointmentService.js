import axios from "axios";
import { API_ENDPOINTS } from "../config/api";

const API_URL = API_ENDPOINTS.APPOINTMENTS;

const getUserAppointments = async () => {
  try {
    const response = await axios.get(API_URL);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch appointments" };
  }
};

const getAppointmentById = async (appointmentId) => {
  try {
    const response = await axios.get(`${API_URL}/${appointmentId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to fetch appointment details" };
  }
};

const createAppointment = async (appointmentData) => {
  try {
    const response = await axios.post(API_URL, appointmentData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to create appointment" };
  }
};

const updateAppointmentStatus = async (appointmentId, status) => {
  try {
    const response = await axios.patch(`${API_URL}/${appointmentId}/status`, {
      status,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to update appointment status" };
  }
};

const updateAppointment = async (appointmentId, appointmentData) => {
  try {
    const response = await axios.put(`${API_URL}/${appointmentId}`, appointmentData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to update appointment" };
  }
};

const deleteAppointment = async (appointmentId) => {
  try {
    const response = await axios.delete(`${API_URL}/${appointmentId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Failed to delete appointment" };
  }
};

const appointmentService = {
  getUserAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointmentStatus,
  updateAppointment,
  deleteAppointment,
};

export default appointmentService;
