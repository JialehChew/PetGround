import type { 
  Appointment, 
  CreateAppointmentData, 
  UpdateAppointmentData, 
  AppointmentStatus, 
  ApiError,
  SetPricingData,
  CompleteServiceData,
  GroomerCreateBookingPayload,
} from "../types";
import { api } from '../config/api';
import { toUtcIsoMinute, ymdToUtcIso } from "../utils/time";

interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

const getUserAppointments = async (): Promise<Appointment[]> => {
  try {
    const response = await api.get('/appointments');
    return response.data;
  } catch (error: unknown) {
    console.error('Error fetching appointments:', error);
    const apiError = error as { response?: { data?: ApiError; status?: number } };
    
    // log details for debug
    if (apiError.response) {
      console.error('Response status:', apiError.response.status);
      console.error('Response data:', apiError.response.data);
    }
    
    throw apiError.response?.data || { error: "Failed to fetch appointments" };
  }
};

const getAppointmentById = async (appointmentId: string): Promise<Appointment> => {
  try {
    const response = await api.get(`/appointments/${appointmentId}`);
    return response.data;
  } catch (error: unknown) {
    console.error('Error fetching appointment by id:', error);
    const apiError = error as { response?: { data?: ApiError; status?: number } };
    
    // log details for debug
    if (apiError.response) {
      console.error('Response status:', apiError.response.status);
      console.error('Response data:', apiError.response.data);
    }
    
    throw apiError.response?.data || { error: "Failed to fetch appointment" };
  }
};

const createAppointment = async (appointmentData: CreateAppointmentData): Promise<Appointment> => {
  try {
    const payload: Record<string, unknown> = { ...appointmentData };
    if (appointmentData.startTime) {
      payload.startTime = toUtcIsoMinute(appointmentData.startTime);
    }
    if (appointmentData.checkInDate) {
      payload.checkInDate = ymdToUtcIso(appointmentData.checkInDate);
    }
    const response = await api.post('/appointments', payload);
    return response.data.appointment || response.data;
  } catch (error: unknown) {
    console.error('Error creating appointment:', error);
    const apiError = error as { response?: { data?: ApiError; status?: number } };
    
    // log details for debug
    if (apiError.response) {
      console.error('Response status:', apiError.response.status);
      console.error('Response data:', apiError.response.data);
    } else {
      console.error('Network or other error:', error);
    }
    
    throw apiError.response?.data || { error: "Failed to create appointment" };
  }
};
// update appt status (for future use)
const updateAppointmentStatus = async (appointmentId: string, status: AppointmentStatus): Promise<Appointment> => {
  try {
    const response = await api.patch(`/appointments/${appointmentId}/status`, {
      status,
    });
    return response.data;
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: ApiError } };
    throw apiError.response?.data || { error: "Failed to update appointment status" };
  }
};

const updateAppointment = async (appointmentId: string, appointmentData: UpdateAppointmentData): Promise<Appointment> => {
  try {
    const payload: Record<string, unknown> = { ...appointmentData };
    if (appointmentData.startTime) {
      payload.startTime = toUtcIsoMinute(appointmentData.startTime);
    }
    if (appointmentData.checkInDate) {
      payload.checkInDate = ymdToUtcIso(appointmentData.checkInDate);
    }
    const response = await api.put(`/appointments/${appointmentId}`, payload);
    return response.data.appointment || response.data;
  } catch (error: unknown) {
    console.error('Error updating appointment:', error);
    const apiError = error as { response?: { data?: ApiError; status?: number } };
    
    // log details for debug
    if (apiError.response) {
      console.error('Response status:', apiError.response.status);
      console.error('Response data:', apiError.response.data);
    }
    
    throw apiError.response?.data || { error: "Failed to update appointment" };
  }
};

const createGroomerBooking = async (
  payload: GroomerCreateBookingPayload
): Promise<Appointment> => {
  try {
    const normalizedPayload: Record<string, unknown> = { ...payload };
    if (payload.startTime) {
      normalizedPayload.startTime = toUtcIsoMinute(payload.startTime);
    }
    if (payload.checkInDate) {
      normalizedPayload.checkInDate = ymdToUtcIso(payload.checkInDate);
    }
    const response = await api.post('/appointments/groomer-booking', normalizedPayload);
    return response.data.appointment || response.data;
  } catch (error: unknown) {
    console.error('Error creating groomer booking:', error);
    const apiError = error as { response?: { data?: ApiError & { code?: string }; status?: number } };
    if (apiError.response?.data) throw apiError.response.data;
    throw { error: 'Failed to create booking' };
  }
};

const deleteAppointment = async (
  appointmentId: string
): Promise<{ message?: string; appointment?: Appointment }> => {
  try {
    const response = await api.delete(`/appointments/${appointmentId}`);
    return response.data;
  } catch (error: unknown) {
    console.error('Error deleting appointment:', error);
    const apiError = error as { response?: { data?: ApiError; status?: number } };
    
    // log details for debug
    if (apiError.response) {
      console.error('Response status:', apiError.response.status);
      console.error('Response data:', apiError.response.data);
    }
    
    throw apiError.response?.data || { error: "Failed to delete appointment" };
  }
};

const getAvailableTimeSlots = async (groomerId: string, date: string, duration: number): Promise<TimeSlot[]> => {
  try {
    const response = await api.get(`/appointments/available-slots/${groomerId}`, {
      params: { date, duration }
    });
    return response.data;
  } catch (error: unknown) {
    console.error('Error fetching available time slots:', error);
    const apiError = error as { response?: { data?: ApiError; status?: number } };
    
    // log details for debug
    if (apiError.response) {
      console.error('Response status:', apiError.response.status);
      console.error('Response data:', apiError.response.data);
    }
    
    throw apiError.response?.data || { error: "Failed to fetch available time slots" };
  }
};

// workflow actions for groomers
// appt acknowledgement
const acknowledgeAppointment = async (appointmentId: string): Promise<Appointment> => {
  try {
    const response = await api.patch(`/appointments/${appointmentId}/acknowledge`);
    return response.data.appointment || response.data;
  } catch (error: unknown) {
    console.error('Error acknowledging appointment:', error);
    const apiError = error as { response?: { data?: ApiError; status?: number } };
    
    // log details for debug
    if (apiError.response) {
      console.error('Response status:', apiError.response.status);
      console.error('Response data:', apiError.response.data);
    }
    
    throw apiError.response?.data || { error: "Failed to acknowledge appointment" };
  }
};
// set pricing for appt - unused for now
const setPricing = async (appointmentId: string, pricingData: SetPricingData): Promise<Appointment> => {
  try {
    const response = await api.patch(`/appointments/${appointmentId}/pricing`, pricingData);
    return response.data.appointment || response.data;
  } catch (error: unknown) {
    console.error('Error setting pricing:', error);
    const apiError = error as { response?: { data?: ApiError; status?: number } };
    
    // log details for debug
    if (apiError.response) {
      console.error('Response status:', apiError.response.status);
      console.error('Response data:', apiError.response.data);
    }
    
    throw apiError.response?.data || { error: "Failed to set pricing" };
  }
};
// start svc (actual)
const startService = async (appointmentId: string): Promise<Appointment> => {
  try {
    const response = await api.patch(`/appointments/${appointmentId}/start`);
    return response.data.appointment || response.data;
  } catch (error: unknown) {
    console.error('Error starting service:', error);
    const apiError = error as { response?: { data?: ApiError; status?: number } };
    
    // log details for debug
    if (apiError.response) {
      console.error('Response status:', apiError.response.status);
      console.error('Response data:', apiError.response.data);
    }
    
    throw apiError.response?.data || { error: "Failed to start service" };
  }
};
// complete svc (actual)
const completeService = async (appointmentId: string, completionData?: CompleteServiceData): Promise<Appointment> => {
  try {
    const response = await api.patch(`/appointments/${appointmentId}/complete`, completionData || {});
    return response.data.appointment || response.data;
  } catch (error: unknown) {
    console.error('Error completing service:', error);
    const apiError = error as { response?: { data?: ApiError; status?: number } };
    
    // log details for debug
    if (apiError.response) {
      console.error('Response status:', apiError.response.status);
      console.error('Response data:', apiError.response.data);
    }
    
    throw apiError.response?.data || { error: "Failed to complete service" };
  }
};

const appointmentService = {
  getUserAppointments,
  getAppointmentById,
  createAppointment,
  createGroomerBooking,
  updateAppointmentStatus,
  updateAppointment,
  deleteAppointment,
  getAvailableTimeSlots,
  // added workflow actions for future use
  acknowledgeAppointment,
  setPricing,
  startService,
  completeService,
};

export default appointmentService;
