import { api } from '../config/api';
import type { Pet, CreatePetData, UpdatePetData, Appointment, ApiError, PetStaffSearchResult } from '../types';

const getApiOrigin = (): string => {
  const configured = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  return configured.replace(/\/api\/?$/, "");
};

const toAbsoluteImageUrl = (imageUrl?: string): string => {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
  return `${getApiOrigin()}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
};

const normalizePet = (pet: Pet): Pet => ({
  ...pet,
  imageUrl: toAbsoluteImageUrl(pet.imageUrl),
});

const normalizeStaffPet = (pet: PetStaffSearchResult): PetStaffSearchResult => ({
  ...pet,
  imageUrl: toAbsoluteImageUrl(pet.imageUrl),
});

export const petService = {
  // get all pets for current user
  getUserPets: async (): Promise<Pet[]> => {
    try {
      const response = await api.get('/pets');
      return (response.data as Pet[]).map(normalizePet);
    } catch (error) {
      console.error('Error fetching pets:', error);
      throw error;
    }
  },

  searchPetsForStaffBooking: async (q?: string): Promise<PetStaffSearchResult[]> => {
    try {
      const response = await api.get<PetStaffSearchResult[]>('/pets/staff-search', {
        params: q?.trim() ? { q: q.trim() } : {},
      });
      return (response.data as PetStaffSearchResult[]).map(normalizeStaffPet);
    } catch (error) {
      console.error('Error searching pets for staff booking:', error);
      throw error;
    }
  },

  // get pet by ID
  getPetById: async (petId: string): Promise<Pet> => {
    try {
      const response = await api.get(`/pets/${petId}`);
      return normalizePet(response.data as Pet);
    } catch (error) {
      console.error('Error fetching pet by ID:', error);
      throw error;
    }
  },

  // create new pet
  createPet: async (petData: CreatePetData): Promise<Pet> => {
    try {
      const response = await api.post('/pets', petData);
      // Handle both possible response structures
      return normalizePet((response.data.pet || response.data) as Pet);
    } catch (error) {
      console.error('Error creating pet:', error);
      throw error;
    }
  },

  // update pet - now properly handles response
  updatePet: async (petId: string, updateData: UpdatePetData): Promise<Pet> => {
    try {
      const response = await api.put(`/pets/${petId}`, updateData);
      
      // handle both possible response structures from backend
      const updatedPet = response.data.pet || response.data;
      
      // validate that we have the required fields
      if (!updatedPet._id || !updatedPet.name) {
        throw new Error('Invalid pet data received from server');
      }
      
      return normalizePet(updatedPet as Pet);
    } catch (error: unknown) {
      console.error('Error updating pet:', error);
      const apiError = error as { response?: { data?: ApiError } };
      throw apiError.response?.data || { error: "Failed to update pet" };
    }
  },

  updatePetGroomerNote: async (petId: string, notesForGroomer: string): Promise<Pet> => {
    try {
      const response = await api.patch(`/pets/${petId}/groomer-note`, { notesForGroomer });
      const updatedPet = response.data.pet || response.data;
      return normalizePet(updatedPet as Pet);
    } catch (error: unknown) {
      console.error("Error updating pet groomer note:", error);
      const apiError = error as { response?: { data?: ApiError } };
      throw apiError.response?.data || { error: "Failed to update groomer note" };
    }
  },

  // delete pet
  deletePet: async (petId: string): Promise<void> => {
    try {
      await api.delete(`/pets/${petId}`);
    } catch (error) {
      console.error('Error deleting pet:', error);
      throw error;
    }
  },

  // get appointments for a specific pet (grooming history)
  getPetAppointments: async (petId: string): Promise<Appointment[]> => {
    try {
      // use the dedicated pet appointments endpoint instead of filtering all appointments
      const response = await api.get<Appointment[]>(`/pets/${petId}/appointments`);
      return response.data;
    } catch (error) {
      console.error('Error fetching pet appointments:', error);
      throw error;
    }
  },

  uploadPetImage: async (petId: string, image: File): Promise<Pet> => {
    const formData = new FormData();
    formData.append("image", image);
    const response = await api.post(`/pets/${petId}/image`, formData);
    return normalizePet((response.data.pet || response.data) as Pet);
  },

  toAbsoluteImageUrl,
};
