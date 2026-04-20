import { api } from "../config/api";
import type { AdminUserListItem, Appointment, CreateGroomerPayload, Pet, User } from "../types";

export async function createGroomer(payload: CreateGroomerPayload): Promise<User> {
  const res = await api.post("/admin/groomers", payload);
  // backend: { message, user }
  return res.data.user as User;
}

export async function getAdminUsers(q?: string): Promise<AdminUserListItem[]> {
  const res = await api.get("/admin/users", {
    params: q?.trim() ? { q: q.trim() } : {},
  });
  return res.data as AdminUserListItem[];
}

export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<{ message?: string; emailSent?: boolean }> {
  const res = await api.patch(`/admin/users/${userId}/reset-password`, { newPassword });
  return res.data as { message?: string; emailSent?: boolean };
}

export async function verifyUserEmail(userId: string): Promise<void> {
  await api.patch(`/admin/users/${userId}/verify-email`, {});
}

export async function deleteUserById(userId: string): Promise<void> {
  await api.delete(`/admin/users/${userId}`);
}

export async function getAdminClientPets(userId: string): Promise<Pet[]> {
  const res = await api.get(`/admin/users/${userId}/pets`);
  return res.data as Pet[];
}

export async function getAdminClientAppointments(
  userId: string,
  params?: { from?: string; to?: string }
): Promise<Appointment[]> {
  const res = await api.get(`/admin/users/${userId}/appointments`, { params: params || {} });
  return res.data as Appointment[];
}

