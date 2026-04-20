import { useState, useCallback, useEffect } from 'react';
import { petService } from '../services/petService';
import appointmentService from '../services/appointmentService';
import type { Pet, Appointment } from '../types';

export const usePetData = (autoLoad: boolean = true) => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [petsData, appointmentsData] = await Promise.allSettled([
        petService.getUserPets(),
        appointmentService.getUserAppointments()
      ]);

      if (petsData.status === 'fulfilled') {
        setPets(petsData.value || []);
      } else {
        console.error('Failed to load pets:', petsData.reason);
      }

      if (appointmentsData.status === 'fulfilled') {
        setAppointments(appointmentsData.value || []);
      } else {
        console.error('Failed to load appointments:', appointmentsData.reason);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const addPet = useCallback((newPet: Pet) => {
    setPets(prev => [newPet, ...prev]);
  }, []);

  const updatePet = useCallback((updatedPet: Pet) => {
    setPets(prev => prev.map(pet => 
      pet._id === updatedPet._id ? updatedPet : pet
    ));
  }, []);

  const removePet = useCallback((petId: string) => {
    setPets(prev => prev.filter(pet => pet._id !== petId));
    setAppointments(prev => prev.filter(appointment => {
      if (!appointment.petId) {
        return true;
      }
      if (typeof appointment.petId === 'string') {
        return appointment.petId !== petId;
      }
      return appointment.petId._id !== petId;
    }));
  }, []);

  const getUpcomingAppointments = useCallback((petId?: string) => {
    const now = new Date();
    const filteredAppointments = appointments.filter(appointment => {
      const isUpcoming = new Date(appointment.startTime) > now && appointment.status === 'confirmed';
      if (petId) {
        const appointmentPetId = typeof appointment.petId === 'string' 
          ? appointment.petId 
          : appointment.petId?._id;
        
        return isUpcoming && appointmentPetId === petId;
      }
      return isUpcoming;
    });
    return filteredAppointments;
  }, [appointments]);

  useEffect(() => {
    if (autoLoad) {
      loadData();
    }
  }, [autoLoad, loadData]);

  return {
    pets,
    appointments,
    loading,
    error,
    loadData,
    addPet,
    updatePet,
    removePet,
    getUpcomingAppointments
  };
};
