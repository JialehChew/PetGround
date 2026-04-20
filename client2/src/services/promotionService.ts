import { api } from "../config/api";
import type { Promotion } from "../types";

const getApiOrigin = (): string => {
  const configured = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  return configured.replace(/\/api\/?$/, "");
};

const toAbsoluteImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return imageUrl;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
  return `${getApiOrigin()}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
};

const normalizePromotion = (row: Promotion): Promotion => ({
  ...row,
  imageUrl: toAbsoluteImageUrl(row.imageUrl),
});

export async function getPublicPromotions(): Promise<Promotion[]> {
  const res = await api.get("/promotions");
  return (res.data as Promotion[]).map(normalizePromotion);
}

export async function getAdminPromotions(): Promise<Promotion[]> {
  const res = await api.get("/admin/promotions");
  return (res.data as Promotion[]).map(normalizePromotion);
}

export interface CreatePromotionPayload {
  title: string;
  description?: string;
  validUntil: string;
  image: File;
}

export async function createPromotion(payload: CreatePromotionPayload): Promise<Promotion> {
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("description", payload.description || "");
  formData.append("validUntil", payload.validUntil);
  formData.append("image", payload.image);

  const res = await api.post("/admin/promotions", formData);
  return normalizePromotion(res.data.promotion as Promotion);
}

export async function deletePromotionById(promotionId: string): Promise<void> {
  await api.delete(`/admin/promotions/${promotionId}`);
}
