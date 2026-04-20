import { useState, useCallback, useEffect } from 'react';
import appointmentService from '../services/appointmentService';
import type { Appointment } from '../types';

export const useAppointmentData = (autoLoad: boolean = true) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await appointmentService.getUserAppointments();
      setAppointments(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load appointments';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const addAppointment = useCallback((newAppointment: Appointment) => {
    setAppointments(prev => [newAppointment, ...prev]);
  }, []);

  const updateAppointment = useCallback((updatedAppointment: Appointment) => {
    setAppointments(prev => prev.map(apt => 
      apt._id === updatedAppointment._id ? updatedAppointment : apt
    ));
  }, []);

  const removeAppointment = useCallback((appointmentId: string) => {
    setAppointments(prev => prev.filter(apt => apt._id !== appointmentId));
  }, []);

  const getUpcomingAppointments = useCallback((petId?: string) => {
    const now = new Date();
    return appointments.filter(apt => {
      const isUpcoming = new Date(apt.startTime) > now && apt.status === 'confirmed';
      if (petId) {
        if (!apt.petId) return false;
        const appointmentPetId = typeof apt.petId === 'string' ? apt.petId : apt.petId._id;
        return isUpcoming && appointmentPetId === petId;
      }
      return isUpcoming;
    });
  }, [appointments]);

  const getPastAppointments = useCallback((petId?: string) => {
    const now = new Date();
    return appointments.filter(apt => {
      const isPast = new Date(apt.startTime) <= now;
      if (petId) {
        if (!apt.petId) return false;
        const appointmentPetId = typeof apt.petId === 'string' ? apt.petId : apt.petId._id;
        return isPast && appointmentPetId === petId;
      }
      return isPast;
    });
  }, [appointments]);

  const getRecentAppointments = useCallback((limit: number = 5) => {
    return appointments
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, limit);
  }, [appointments]);

  useEffect(() => {
    if (autoLoad) {
      loadAppointments();
    }
  }, [autoLoad, loadAppointments]);

  return {
    appointments,
    loading,
    error,
    loadAppointments,
    addAppointment,
    updateAppointment,
    removeAppointment,
    getUpcomingAppointments,
    getPastAppointments,
    getRecentAppointments
  };
};
