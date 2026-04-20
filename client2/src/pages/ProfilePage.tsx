import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import PageTransition from "../components/layout/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import LoadingSpinner from "../components/ui/loading-spinner";
import { useAuthStore } from "../store/authStore";
import * as profileService from "../services/profileService";
import { toast } from "sonner";
import type { ApiError } from "../types";

function readApiError(err: unknown): string | undefined {
  const e = err as { response?: { data?: ApiError } };
  return e.response?.data?.error;
}

export default function ProfilePage() {
  const { t, i18n } = useTranslation("profile");
  const { setUser, applyAuthSession } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [locale, setLocale] = useState<"zh" | "en">("zh");
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await profileService.fetchProfile();
        if (cancelled) return;
        setUser(u);
        setName(u.name || "");
        setPhone(u.phone || "");
        setLocale(u.preferredLocale === "en" ? "en" : "zh");
        setEmail(u.email);
        setVerified(u.isVerified === true);
      } catch {
        if (!cancelled) toast.error(t("loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser, t]);

  const handleSaveProfile = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      toast.error(t("nameTooShort"));
      return;
    }
    try {
      setSavingProfile(true);
      const updated = await profileService.updateProfile({
        name: trimmedName,
        phone: phone.trim(),
        preferredLocale: locale,
      });
      setUser(updated);
      setVerified(updated.isVerified === true);
      await i18n.changeLanguage(locale);
      toast.success(t("profileSaved"));
    } catch (err: unknown) {
      toast.error(readApiError(err) || t("errors.generic"));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error(t("newPasswordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("passwordMismatch"));
      return;
    }
    try {
      setSavingPassword(true);
      const res = await profileService.changeMyPassword({
        currentPassword,
        newPassword,
      });
      applyAuthSession(res.user, res.token);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("passwordChanged"));
    } catch (err: unknown) {
      const msg = readApiError(err);
      if (msg?.toLowerCase().includes("incorrect") || msg?.includes("不正确")) {
        toast.error(t("errors.wrongPassword"));
      } else {
        toast.error(msg || t("errors.generic"));
      }
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex min-h-[50vh] items-center justify-center bg-gradient-to-b from-[#FFFDF7] via-[#FFFBEB] to-[#FFE8A3]/25">
          <LoadingSpinner size="lg" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-[#FFFDF7] via-[#FFFBEB] to-[#FFE8A3]/20 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl space-y-8">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-[#3F2A1E] sm:text-3xl">{t("title")}</h1>
            <p className="mt-2 text-sm font-medium text-[#6B5A45]">{t("subtitle")}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="rounded-[2rem] border-2 border-[#F9C74F]/45 bg-gradient-to-br from-white via-[#FFFDF7] to-[#FFF8E6]/90 shadow-lg shadow-amber-200/25">
              <CardHeader>
                <CardTitle className="text-lg text-[#3F2A1E]">{t("sectionProfile")}</CardTitle>
                <CardDescription className="text-[#6B5A45]">{t("emailReadonly")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="profile-name" className="text-[#4A3B2A]">
                    {t("name")}
                  </Label>
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-2xl border-2 border-[#F9C74F]/35 bg-[#FFFCF5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#4A3B2A]">{t("email")}</Label>
                  <Input readOnly value={email} className="rounded-2xl border-2 border-stone-200/80 bg-stone-50/80 text-stone-600" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-phone" className="text-[#4A3B2A]">
                    {t("phone")}
                  </Label>
                  <Input
                    id="profile-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("phonePlaceholder")}
                    className="rounded-2xl border-2 border-[#F9C74F]/35 bg-[#FFFCF5]"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F9C74F]/30 bg-[#FFF9E8]/80 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#B8860B]">{t("verification")}</p>
                    {verified ? (
                      <Badge className="mt-1 border-emerald-200 bg-emerald-50 text-emerald-800">{t("statusVerified")}</Badge>
                    ) : (
                      <Badge className="mt-1 border-amber-200 bg-amber-50 text-amber-900">{t("statusPending")}</Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#4A3B2A]">{t("sectionLanguage")}</Label>
                  <p className="text-xs text-[#6B5A45]">{t("languageHint")}</p>
                  <Select value={locale} onValueChange={(v) => setLocale(v as "zh" | "en")}>
                    <SelectTrigger className="rounded-2xl border-2 border-[#F9C74F]/35 bg-[#FFFCF5]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh">简体中文</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 font-semibold text-[#3F2A1E] shadow-md hover:from-amber-600 hover:to-yellow-600"
                >
                  {savingProfile ? t("savingProfile") : t("saveProfile")}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="rounded-[2rem] border-2 border-[#F9C74F]/45 bg-gradient-to-br from-white via-[#FFFDF7] to-[#FFF8E6]/90 shadow-lg shadow-amber-200/25">
              <CardHeader>
                <CardTitle className="text-lg text-[#3F2A1E]">{t("sectionPassword")}</CardTitle>
                <CardDescription className="text-[#6B5A45]">{t("passwordSessionHint")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cur-pw" className="text-[#4A3B2A]">
                    {t("currentPassword")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="cur-pw"
                      type={showCurrent ? "text" : "password"}
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="rounded-2xl border-2 border-[#F9C74F]/35 bg-[#FFFCF5] pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-stone-500 hover:bg-stone-100"
                      onClick={() => setShowCurrent((v) => !v)}
                      aria-label="toggle"
                    >
                      {showCurrent ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-pw" className="text-[#4A3B2A]">
                    {t("newPassword")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-pw"
                      type={showNew ? "text" : "password"}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="rounded-2xl border-2 border-[#F9C74F]/35 bg-[#FFFCF5] pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-stone-500 hover:bg-stone-100"
                      onClick={() => setShowNew((v) => !v)}
                      aria-label="toggle"
                    >
                      {showNew ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conf-pw" className="text-[#4A3B2A]">
                    {t("confirmPassword")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="conf-pw"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="rounded-2xl border-2 border-[#F9C74F]/35 bg-[#FFFCF5] pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-stone-500 hover:bg-stone-100"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label="toggle"
                    >
                      {showConfirm ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleChangePassword}
                  disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full rounded-2xl border-2 border-[#3F2A1E]/25 bg-white/80 font-semibold text-[#3F2A1E] hover:bg-[#FFF8E6]"
                >
                  {savingPassword ? t("changingPassword") : t("changePassword")}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
