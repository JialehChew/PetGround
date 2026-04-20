import type { User, UpdateProfilePayload, ChangePasswordPayload } from "../types";
import { api } from "../config/api";

export async function fetchProfile(): Promise<User> {
  const res = await api.get<User>("/auth/me");
  return res.data;
}

export async function updateProfile(data: UpdateProfilePayload): Promise<User> {
  const res = await api.patch<User>("/auth/me", data);
  return res.data;
}

export async function changeMyPassword(
  data: ChangePasswordPayload
): Promise<{ token: string; user: User; message?: string }> {
  const res = await api.post<{ token: string; user: User; message?: string }>("/auth/me/password", data);
  return res.data;
}
