import { api } from "../config/api";
import type { AdminUserListItem, Appointment, Pet } from "../types";

export async function getGroomerMyClients(q?: string): Promise<AdminUserListItem[]> {
  const res = await api.get("/groomers/me/clients", {
    params: q?.trim() ? { q: q.trim() } : {},
  });
  return res.data as AdminUserListItem[];
}

export async function getGroomerClientById(userId: string): Promise<AdminUserListItem> {
  const res = await api.get(`/groomers/me/clients/${userId}`);
  return res.data as AdminUserListItem;
}

export async function getGroomerClientPets(userId: string): Promise<Pet[]> {
  const res = await api.get(`/groomers/me/clients/${userId}/pets`);
  return res.data as Pet[];
}

export async function getGroomerClientAppointments(
  userId: string,
  params?: { from?: string; to?: string }
): Promise<Appointment[]> {
  const res = await api.get(`/groomers/me/clients/${userId}/appointments`, { params: params || {} });
  return res.data as Appointment[];
}
