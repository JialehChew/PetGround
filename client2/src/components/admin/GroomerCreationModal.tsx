import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import * as Yup from "yup";
import { useFormik } from "formik";
import { XMarkIcon, UserPlusIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import LoadingSpinner from "../ui/loading-spinner";
import { createGroomer } from "../../services/adminService";

export interface GroomerCreationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function GroomerCreationModal({ open, onClose, onSuccess }: GroomerCreationModalProps) {
  const { t } = useTranslation("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const schema = useMemo(
    () =>
      Yup.object({
        name: Yup.string().min(2, t("adminUsers.createGroomer.validation.nameMin")).required(t("adminUsers.createGroomer.validation.nameReq")),
        email: Yup.string().email(t("adminUsers.createGroomer.validation.emailInvalid")).required(t("adminUsers.createGroomer.validation.emailReq")),
        phone: Yup.string().max(30, t("adminUsers.createGroomer.validation.phoneMax")).notRequired(),
        password: Yup.string().min(6, t("adminUsers.createGroomer.validation.pwMin")).required(t("adminUsers.createGroomer.validation.pwReq")),
      }),
    [t]
  );

  const formik = useFormik({
    initialValues: { name: "", email: "", phone: "", password: "" },
    validationSchema: schema,
    onSubmit: async (values) => {
      try {
        setSubmitting(true);
        await createGroomer({
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim() || undefined,
          password: values.password,
        });
        toast.success(t("adminUsers.createGroomer.toastOkTitle"), {
          description: t("adminUsers.createGroomer.toastOkDesc"),
        });
        onSuccess?.();
        onClose();
      } catch (err: unknown) {
        const o = err as { response?: { data?: { error?: string } } };
        toast.error(t("adminUsers.createGroomer.toastFailTitle"), {
          description: o?.response?.data?.error || t("adminUsers.createGroomer.toastFailDesc"),
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50"
            onClick={() => !submitting && onClose()}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border-2 border-amber-200 bg-gradient-to-b from-amber-50 via-white to-yellow-50 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/95 px-5 py-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <UserPlusIcon className="h-5 w-5 text-amber-800" />
                <div>
                  <h2 className="text-lg font-bold text-amber-900">{t("adminUsers.createGroomer.title")}</h2>
                  <p className="text-xs text-amber-800/80">{t("adminUsers.createGroomer.subtitle")}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-full p-1 text-amber-700 hover:bg-amber-100"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={formik.handleSubmit} className="space-y-4 p-5">
              <div className="grid gap-2">
                <Label htmlFor="name">{t("adminUsers.createGroomer.fields.name")}</Label>
                <Input id="name" name="name" value={formik.values.name} onChange={formik.handleChange} onBlur={formik.handleBlur} />
                {formik.touched.name && formik.errors.name && <p className="text-sm text-destructive">{formik.errors.name}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">{t("adminUsers.createGroomer.fields.email")}</Label>
                <Input id="email" name="email" type="email" value={formik.values.email} onChange={formik.handleChange} onBlur={formik.handleBlur} />
                {formik.touched.email && formik.errors.email && <p className="text-sm text-destructive">{formik.errors.email}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">{t("adminUsers.createGroomer.fields.phone")}</Label>
                <Input id="phone" name="phone" value={formik.values.phone} onChange={formik.handleChange} onBlur={formik.handleBlur} />
                {formik.touched.phone && formik.errors.phone && <p className="text-sm text-destructive">{formik.errors.phone}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">{t("adminUsers.createGroomer.fields.password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
                {formik.touched.password && formik.errors.password && <p className="text-sm text-destructive">{formik.errors.password}</p>}
              </div>

              <div className="flex justify-end gap-2 border-t border-amber-100 pt-4">
                <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                  {t("adminUsers.createGroomer.actions.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !formik.isValid}
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600"
                >
                  {submitting ? <LoadingSpinner size="sm" /> : t("adminUsers.createGroomer.actions.create")}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}

