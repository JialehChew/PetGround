import type { Appointment, Pet, User } from '../types';

/** Build minimal Pet[] for AppointmentBookingModal when grooming staff reschedules. */
export function petsForStaffReschedule(apt: Appointment): Pet[] {
  const p =
    typeof apt.petId === 'object' && apt.petId !== null && '_id' in apt.petId
      ? (apt.petId as Pet)
      : null;
  if (!p) return [];
  const oid =
    typeof apt.ownerId === 'object' && apt.ownerId !== null && '_id' in apt.ownerId
      ? (apt.ownerId as User)._id
      : String(apt.ownerId);
  return [
    {
      _id: p._id,
      name: p.name,
      species: p.species,
      breed: p.breed,
      age: p.age,
      size: p.size ?? 'small',
      notes: p.notes,
      ownerId: oid,
      createdAt: 'createdAt' in p && p.createdAt ? String(p.createdAt) : '',
      updatedAt: 'updatedAt' in p && p.updatedAt ? String(p.updatedAt) : '',
    },
  ];
}
