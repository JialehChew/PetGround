import { api } from '../config/api';
import type { User, ApiError, TimeSlot, Appointment } from '../types';

// define slot response interface for API responses
interface SlotResponse {
  start: string;
  end: string;
  available: boolean;
}

// define groomer schedule interface
interface GroomerSchedule {
  groomerId: string;
  startDate: string;
  endDate: string;
  appointments: Appointment[];
  timeBlocks: TimeBlock[];
}

// define time block interface
interface TimeBlock {
  _id: string;
  groomerId: string;
  startTime: string;
  endTime: string;
  blockType: 'unavailable' | 'break' | 'lunch' | 'personal' | 'maintenance';
  reason?: string;
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    daysOfWeek: number[];
    endDate?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CreateTimeBlockData {
  startTime: string;
  endTime: string;
  blockType?: 'unavailable' | 'break' | 'lunch' | 'personal' | 'maintenance';
  reason?: string;
  isRecurring?: boolean;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    daysOfWeek: number[];
    endDate?: string;
  };
}

const getAllGroomers = async (): Promise<User[]> => {
  try {
    const response = await api.get('/groomers');
    return response.data;
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: ApiError } };
    throw apiError.response?.data || { error: "Failed to fetch groomers" };
  }
};

const getGroomerById = async (id: string): Promise<User> => {
  try {
    const response = await api.get(`/groomers/${id}`);
    return response.data;
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: ApiError } };
    throw apiError.response?.data || { error: "Failed to fetch groomer" };
  }
};

/*
Example usage:
const date = new Date('2025-03-13T09:01:30Z');
const formattedDate = date instanceof Date ? date.toISOString().split("T")[0] : date;
// Output: "2025-03-13"
*/
const getGroomerAvailability = async (
  groomerId: string, 
  date: string | Date, 
  duration: number = 60
): Promise<TimeSlot[]> => {
  try {
    const formattedDate = date instanceof Date ? date.toISOString().split("T")[0] : date;
    const response = await api.get(
      `/groomers/${groomerId}/availability?date=${formattedDate}&duration=${duration}`
    );

    // convert the dates to Date objects
    return response.data.map((slot: SlotResponse) => ({
      ...slot,
      start: new Date(slot.start),
      end: new Date(slot.end),
    }));
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: ApiError } };
    throw apiError.response?.data || { error: "Failed to fetch groomer availability" };
  }
};

const getGroomerSchedule = async (
  groomerId: string, 
  startDate: string, 
  endDate: string
): Promise<GroomerSchedule> => {
  try {
    const response = await api.get(`/groomers/${groomerId}/schedule`, {
      params: { startDate, endDate }
    });
    return response.data;
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: ApiError } };
    throw apiError.response?.data || { error: "Failed to fetch groomer schedule" };
  }
};

const createTimeBlock = async (timeBlockData: CreateTimeBlockData): Promise<TimeBlock> => {
  try {
    const response = await api.post('/groomers/time-blocks', timeBlockData);
    return response.data.timeBlock;
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: ApiError } };
    throw apiError.response?.data || { error: "Failed to create time block" };
  }
};

const updateTimeBlock = async (
  timeBlockId: string, 
  timeBlockData: Partial<CreateTimeBlockData>
): Promise<TimeBlock> => {
  try {
    const response = await api.put(`/groomers/time-blocks/${timeBlockId}`, timeBlockData);
    return response.data.timeBlock;
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: ApiError } };
    throw apiError.response?.data || { error: "Failed to update time block" };
  }
};

const deleteTimeBlock = async (timeBlockId: string): Promise<{ success: boolean }> => {
  try {
    const response = await api.delete(`/groomers/time-blocks/${timeBlockId}`);
    return response.data;
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: ApiError } };
    throw apiError.response?.data || { error: "Failed to delete time block" };
  }
};

const groomerService = {
  getAllGroomers,
  getGroomerById,
  getGroomerAvailability,
  getGroomerSchedule,
  createTimeBlock,
  updateTimeBlock,
  deleteTimeBlock,
};

export default groomerService;
export type { GroomerSchedule, TimeBlock, CreateTimeBlockData };
