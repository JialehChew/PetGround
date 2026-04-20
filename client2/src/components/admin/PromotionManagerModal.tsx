import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  MegaphoneIcon,
  PhotoIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import type { Promotion } from "../../types";
import { createPromotion, deletePromotionById, getAdminPromotions } from "../../services/promotionService";

interface PromotionManagerModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after list changes (create / delete) so parent can refresh counts */
  onMutate?: () => void;
}

export default function PromotionManagerModal({ open, onClose, onMutate }: PromotionManagerModalProps) {
  const { t, i18n } = useTranslation("admin");
  const locale = i18n.language?.startsWith("zh") ? "zh-CN" : "en-US";
  const [rows, setRows] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const loadRows = async () => {
    try {
      setLoading(true);
      const data = await getAdminPromotions();
      setRows(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(t("adminPromotions.toastLoadFail"), {
        description: msg || t("adminPromotions.toastLoadFailDesc"),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadRows();
      setDeleteTarget(null);
    }
  }, [open]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setValidUntil("");
    setImageFile(null);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !validUntil || !imageFile) {
      toast.error(t("adminPromotions.toastFill"));
      return;
    }

    try {
      setSubmitting(true);
      await createPromotion({
        title: title.trim(),
        description: description.trim(),
        validUntil,
        image: imageFile,
      });
      toast.success(t("adminPromotions.toastCreateOk"));
      resetForm();
      await loadRows();
      onMutate?.();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(t("adminPromotions.toastCreateFail"), {
        description: msg || t("adminPromotions.toastLoadFailDesc"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const runDelete = async (promotionId: string) => {
    try {
      setDeletingId(promotionId);
      await deletePromotionById(promotionId);
      setRows((prev) => prev.filter((row) => row._id !== promotionId));
      toast.success(t("adminPromotions.toastDeleteOk"));
      setDeleteTarget(null);
      onMutate?.();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(t("adminPromotions.toastDeleteFail"), {
        description: msg || t("adminPromotions.toastLoadFailDesc"),
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/45"
          onClick={() => !submitting && !deleteTarget && onClose()}
          aria-hidden
        />

        <div
          className="relative w-full max-w-4xl overflow-hidden rounded-3xl border-2 border-amber-200 bg-gradient-to-b from-[#FFF9E6] via-white to-[#FFF4CF] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="promotion-manager-title"
        >
          <div className="flex items-center justify-between border-b border-amber-100 bg-[#FFF3C4]/90 px-6 py-4">
            <div className="flex items-center gap-2">
              <MegaphoneIcon className="h-6 w-6 text-amber-800" aria-hidden />
              <div>
                <h3 id="promotion-manager-title" className="text-lg font-extrabold text-amber-950">
                  {t("adminPromotions.modalTitle")}
                </h3>
                <p className="text-xs text-amber-900/80">{t("adminPromotions.modalSubtitle")}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeleteTarget(null);
                onClose();
              }}
              disabled={submitting}
              className="rounded-full p-1 text-amber-800 hover:bg-amber-100"
              aria-label="Close"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-2">
            <form onSubmit={handleCreate} className="space-y-4 rounded-3xl border border-amber-200 bg-white/80 p-5 shadow-sm">
              <h4 className="text-base font-bold text-amber-950">{t("adminPromotions.formTitle")}</h4>

              <div className="space-y-2">
                <Label htmlFor="promotion-title">{t("adminPromotions.fields.title")}</Label>
                <Input
                  id="promotion-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("adminPromotions.fields.titlePh")}
                  maxLength={120}
                  className="rounded-2xl border-amber-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="promotion-description">{t("adminPromotions.fields.description")}</Label>
                <Textarea
                  id="promotion-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("adminPromotions.fields.descriptionPh")}
                  maxLength={500}
                  rows={3}
                  className="min-h-[88px] rounded-2xl border-amber-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="promotion-valid-until" className="inline-flex items-center gap-1">
                  <CalendarDaysIcon className="h-4 w-4" aria-hidden />
                  {t("adminPromotions.fields.validUntil")}
                </Label>
                <Input
                  id="promotion-valid-until"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="rounded-2xl border-amber-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="promotion-image" className="inline-flex items-center gap-1">
                  <PhotoIcon className="h-4 w-4" aria-hidden />
                  {t("adminPromotions.fields.image")}
                </Label>
                <Input
                  id="promotion-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="cursor-pointer rounded-2xl border-amber-200 bg-[#FFFCF5] file:mr-3 file:rounded-xl file:border-0 file:bg-[#FFDE42] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-amber-950"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl border-2 border-[#F9C74F]/60 bg-[#FFCC00] font-bold text-[#3F2A1E] hover:bg-[#FFE566]"
              >
                {submitting ? t("adminPromotions.submitting") : t("adminPromotions.submit")}
              </Button>
            </form>

            <div className="rounded-3xl border border-amber-200 bg-white/80 p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h4 className="text-base font-bold text-amber-950">{t("adminPromotions.listTitle")}</h4>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  onClick={() => loadRows()}
                  className="shrink-0 rounded-full border-amber-300 bg-amber-50/80 text-amber-900 hover:bg-amber-100"
                >
                  <ArrowPathIcon className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  {t("adminPromotions.refresh")}
                </Button>
              </div>

              {deleteTarget && (
                <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-red-200 bg-red-50/95 px-3 py-3 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">{t("adminPromotions.deleteConfirmTitle")}</p>
                    <p className="text-xs text-red-800/90">{deleteTarget.title}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-red-200 bg-white"
                      onClick={() => setDeleteTarget(null)}
                    >
                      {t("adminPromotions.deleteConfirmCancel")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="rounded-xl"
                      disabled={!!deletingId}
                      onClick={() => runDelete(deleteTarget._id)}
                    >
                      {t("adminPromotions.deleteConfirmAction")}
                    </Button>
                  </div>
                </div>
              )}

              {loading ? (
                <p className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 py-10 text-center text-sm text-amber-900/80">
                  {t("adminUsers.loading")}
                </p>
              ) : rows.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 py-10 text-center text-sm text-amber-900/80">
                  {t("adminPromotions.empty")}
                </p>
              ) : (
                <ul className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                  {rows.map((row) => (
                    <li
                      key={row._id}
                      className="rounded-2xl border border-amber-200 bg-gradient-to-br from-white to-[#FFF9E8] p-3 shadow-sm"
                    >
                      <div className="flex gap-3">
                        <img
                          src={row.imageUrl}
                          alt=""
                          className="h-16 w-24 shrink-0 rounded-xl object-cover ring-2 ring-amber-100"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-amber-950">{row.title}</p>
                          <p className="line-clamp-2 text-xs text-amber-900/80">
                            {row.description || t("adminPromotions.noDesc")}
                          </p>
                          <p className="mt-1 text-xs font-medium text-amber-800">
                            {t("adminPromotions.validLabel")}：{" "}
                            {new Date(row.validUntil).toLocaleDateString(locale)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="shrink-0 rounded-xl"
                          disabled={deletingId === row._id || !!deleteTarget}
                          onClick={() => setDeleteTarget(row)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
