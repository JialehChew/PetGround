import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  UserPlusIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  MegaphoneIcon,
  UserGroupIcon,
  SparklesIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import PageTransition from "../components/layout/PageTransition";
import GroomerCreationModal from "../components/admin/GroomerCreationModal";
import PromotionManagerModal from "../components/admin/PromotionManagerModal";
import { useAuthStore } from "../store/authStore";
import type { AdminUserListItem, Appointment } from "../types";
import { deleteUserById, getAdminUsers, resetUserPassword, verifyUserEmail } from "../services/adminService";
import { getAdminPromotions } from "../services/promotionService";
import { toast } from "sonner";
import { useAppointmentData } from "../hooks";

export default function AdminDashboardPage() {
  const { t, i18n } = useTranslation("admin");
  const { t: tb } = useTranslation("booking");
  const navigate = useNavigate();
  const locale = i18n.language?.startsWith("zh") ? "zh-CN" : "en-US";
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState("");
  const [passwordDialogUser, setPasswordDialogUser] = useState<AdminUserListItem | null>(null);
  const [deleteDialogUser, setDeleteDialogUser] = useState<AdminUserListItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [acting, setActing] = useState(false);
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [promoCount, setPromoCount] = useState<number | null>(null);

  const { appointments, loading: loadingPreviewAppts, loadAppointments } = useAppointmentData(true);

  const refreshPromoCount = useCallback(async () => {
    try {
      const rows = await getAdminPromotions();
      setPromoCount(rows.length);
    } catch {
      setPromoCount(null);
    }
  }, []);

  useEffect(() => {
    refreshPromoCount();
  }, [refreshPromoCount]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const loadUsers = async (q?: string) => {
    try {
      setLoadingUsers(true);
      const rows = await getAdminUsers(q);
      setUsers(rows);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(t("adminUsers.toastLoadFailTitle"), {
        description: msg || t("adminUsers.toastLoadFailDesc"),
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers(search);
    }, 240);
    return () => clearTimeout(timer);
  }, [search]);

  const roleBadgeClass = (role: AdminUserListItem["role"]) => {
    if (role === "owner") return "bg-amber-100 text-amber-800 border-amber-200";
    if (role === "groomer") return "bg-green-100 text-green-700 border-green-200";
    return "bg-purple-100 text-purple-700 border-purple-200";
  };

  const displayedUsers = useMemo(() => users, [users]);

  const { todayPreviewRows, upcomingPreviewRows } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWindow = new Date(startOfToday);
    endOfWindow.setDate(endOfWindow.getDate() + 7);
    endOfWindow.setHours(23, 59, 59, 999);

    const inWindow = appointments.filter((a) => {
      if (a.status === "cancelled") return false;
      const st = new Date(a.startTime);
      return st >= startOfToday && st <= endOfWindow;
    });
    inWindow.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const isSameLocalDay = (d: Date, ref: Date) =>
      d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();

    const todayRows: Appointment[] = [];
    const upcomingRows: Appointment[] = [];
    for (const a of inWindow) {
      const d = new Date(a.startTime);
      if (isSameLocalDay(d, startOfToday)) todayRows.push(a);
      else upcomingRows.push(a);
    }
    return { todayPreviewRows: todayRows, upcomingPreviewRows: upcomingRows };
  }, [appointments]);

  const petLine = (petId: Appointment["petId"]) => {
    if (petId && typeof petId === "object") {
      return `${petId.name} · ${petId.breed}`;
    }
    return tb("unknownPet");
  };

  const ownerLine = (ownerId: Appointment["ownerId"]) => {
    if (ownerId && typeof ownerId === "object") {
      return ownerId.name || "—";
    }
    return "—";
  };

  const statusLabel = (s: Appointment["status"]) => {
    const map: Record<Appointment["status"], string> = {
      confirmed: tb("status.confirmed"),
      in_progress: tb("status.inProgress"),
      completed: tb("status.completed"),
      cancelled: tb("status.cancelled"),
      no_show: tb("status.noShow"),
    };
    return map[s] || s;
  };

  const serviceLabel = (st: Appointment["serviceType"]) => tb(`serviceTypes.${st}`);

  const formatTimeRange = (a: Appointment) => {
    const opt: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", hour12: true };
    const s = new Date(a.startTime).toLocaleTimeString(locale, opt);
    const e = new Date(a.endTime).toLocaleTimeString(locale, opt);
    return `${s} – ${e}`;
  };

 const formatSectionDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });

  const handleVerifyEmail = async (u: AdminUserListItem) => {
    try {
      setActing(true);
      await verifyUserEmail(u._id);
      toast.success(t("adminUsers.toastVerifyOkTitle"));
      loadUsers(search);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(t("adminUsers.toastVerifyFailTitle"), {
        description: msg || t("adminUsers.toastVerifyFailDesc"),
      });
    } finally {
      setActing(false);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordDialogUser) return;
    try {
      setActing(true);
      const resetRes = await resetUserPassword(passwordDialogUser._id, newPassword);
      if (resetRes.emailSent === false) {
        toast.warning(t("adminUsers.toastResetOkTitle"), {
          description: t("adminUsers.toastResetEmailSkipped"),
        });
      } else {
        toast.success(t("adminUsers.toastResetOkTitle"), {
          description: t("adminUsers.toastResetOkDesc"),
        });
      }
      setPasswordDialogUser(null);
      setNewPassword("");
      loadUsers(search);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(t("adminUsers.toastResetFailTitle"), {
        description: msg || t("adminUsers.toastResetFailDesc"),
      });
    } finally {
      setActing(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteDialogUser) return;
    try {
      setActing(true);
      await deleteUserById(deleteDialogUser._id);
      toast.success(t("adminUsers.toastDeleteOkTitle"));
      setDeleteDialogUser(null);
      loadUsers(search);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(t("adminUsers.toastDeleteFailTitle"), {
        description: msg || t("adminUsers.toastDeleteFailDesc"),
      });
    } finally {
      setActing(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-[#FFFDF7] via-[#FAF6EB]/90 to-[#FFE8A3]/15">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Card className="overflow-hidden rounded-[2rem] border-2 border-[#F9C74F]/50 bg-gradient-to-br from-white via-[#FFFDF7] to-[#FFEFC2]/90 shadow-lg shadow-amber-200/30">
              <CardContent className="relative p-6 sm:p-8">
                <div
                  className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#FFDE42]/35 blur-2xl"
                  aria-hidden
                />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-2xl space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#F9C74F]/45 bg-[#FFF3BF] px-3 py-1 text-xs font-semibold text-[#5C3D1E]">
                      <SparklesIcon className="h-4 w-4 text-amber-600" aria-hidden />
                      {t("adminHub.badge")}
                    </div>
                    <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold tracking-tight text-amber-950 sm:text-3xl">
                      <ShieldCheckIcon className="h-8 w-8 shrink-0 text-amber-700" aria-hidden />
                      {t("admin.welcome", { name: user?.name ?? "" })}
                    </h1>
                    <p className="text-sm font-medium leading-relaxed text-amber-900/85">{t("adminHub.hint")}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                    <Button
                      onClick={() => navigate("/admin/clients")}
                      variant="outline"
                      className="rounded-3xl border-2 border-amber-300 bg-[#FFF8DE] px-5 py-5 font-semibold text-amber-900 hover:bg-[#FFF2BF]"
                    >
                      <UserGroupIcon className="mr-2 h-5 w-5" />
                      {t("adminHub.shortcutClientsTitle")}
                    </Button>
                    <Button
                      onClick={() => setOpen(true)}
                      className="rounded-3xl bg-gradient-to-r from-amber-500 to-yellow-500 px-5 py-5 text-white shadow-md hover:from-amber-600 hover:to-yellow-600 hover:shadow-lg"
                    >
                      <UserPlusIcon className="mr-2 h-5 w-5" />
                      {t("adminUsers.createGroomer.openBtn")}
                    </Button>
                    <Button
                      onClick={() => setPromotionModalOpen(true)}
                      variant="outline"
                      className="rounded-3xl border-2 border-amber-300 bg-[#FFF8DE] px-5 py-5 font-semibold text-amber-900 hover:bg-[#FFF2BF]"
                    >
                      <MegaphoneIcon className="mr-2 h-5 w-5" />
                      {t("adminPromotions.openBtn")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => navigate("/admin/clients")}
              className="group rounded-3xl border-2 border-amber-200/90 bg-gradient-to-br from-white to-[#FFF8DE] p-5 text-left shadow-md transition hover:border-[#F9C74F] hover:shadow-lg"
            >
              <UserGroupIcon className="h-8 w-8 text-amber-700" />
              <h2 className="mt-3 text-lg font-bold text-amber-950">{t("adminHub.shortcutClientsTitle")}</h2>
              <p className="mt-1 text-sm text-amber-900/80">{t("adminHub.shortcutClientsDesc")}</p>
              <span className="mt-4 inline-flex items-center text-sm font-semibold text-amber-800 group-hover:text-amber-950">
                {t("adminHub.shortcutClientsCta")}
                <ChevronRightIcon className="ml-1 h-4 w-4" />
              </span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("admin-section-users")}
              className="group rounded-3xl border-2 border-amber-200/90 bg-gradient-to-br from-white to-amber-50/90 p-5 text-left shadow-md transition hover:border-[#F9C74F] hover:shadow-lg"
            >
              <UserGroupIcon className="h-8 w-8 text-amber-700" />
              <h2 className="mt-3 text-lg font-bold text-amber-950">{t("adminHub.shortcutUsersTitle")}</h2>
              <p className="mt-1 text-sm text-amber-900/80">{t("adminHub.shortcutUsersDesc")}</p>
              <span className="mt-4 inline-flex items-center text-sm font-semibold text-amber-800 group-hover:text-amber-950">
                {t("adminHub.shortcutUsersCta")}
                <ChevronRightIcon className="ml-1 h-4 w-4" />
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPromotionModalOpen(true)}
              className="group rounded-3xl border-2 border-amber-200/90 bg-gradient-to-br from-white to-[#FFF8DE] p-5 text-left shadow-md transition hover:border-[#F9C74F] hover:shadow-lg"
            >
              <MegaphoneIcon className="h-8 w-8 text-amber-700" />
              <h2 className="mt-3 text-lg font-bold text-amber-950">{t("adminHub.shortcutPromoTitle")}</h2>
              <p className="mt-1 text-sm text-amber-900/80">{t("adminHub.shortcutPromoDesc")}</p>
              <p className="mt-2 text-xs font-medium text-amber-700/90">
                {promoCount !== null ? t("adminHub.shortcutPromoCount", { count: promoCount }) : "—"}
              </p>
              <span className="mt-2 inline-flex items-center text-sm font-semibold text-amber-800 group-hover:text-amber-950">
                {t("adminHub.shortcutPromoCta")}
                <ChevronRightIcon className="ml-1 h-4 w-4" />
              </span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("admin-section-preview")}
              className="group rounded-3xl border-2 border-amber-200/90 bg-gradient-to-br from-white to-yellow-50/90 p-5 text-left shadow-md transition hover:border-[#F9C74F] hover:shadow-lg"
            >
              <CalendarDaysIcon className="h-8 w-8 text-amber-700" />
              <h2 className="mt-3 text-lg font-bold text-amber-950">{t("adminHub.shortcutPreviewTitle")}</h2>
              <p className="mt-1 text-sm text-amber-900/80">{t("adminHub.shortcutPreviewDesc")}</p>
              <span className="mt-4 inline-flex items-center text-sm font-semibold text-amber-800 group-hover:text-amber-950">
                {t("adminHub.shortcutPreviewCta")}
                <ChevronRightIcon className="ml-1 h-4 w-4" />
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card
              id="admin-section-users"
              className="scroll-mt-24 rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-white via-stone-50 to-amber-50 shadow-md"
            >
              <CardHeader>
                <CardTitle className="text-amber-950">{t("adminUsers.sectionUsersTitle")}</CardTitle>
                <CardDescription className="text-amber-900/70">{t("adminUsers.sectionUsersDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center gap-2">
                  <div className="relative w-full">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700/70" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t("adminUsers.searchPlaceholder")}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="rounded-3xl border border-amber-200 bg-white/70">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("adminUsers.table.name")}</TableHead>
                        <TableHead>{t("adminUsers.table.email")}</TableHead>
                        <TableHead>{t("adminUsers.table.role")}</TableHead>
                        <TableHead>{t("adminUsers.table.phone")}</TableHead>
                        <TableHead>{t("adminUsers.table.createdAt")}</TableHead>
                        <TableHead>{t("adminUsers.table.emailVerified")}</TableHead>
                        <TableHead>{t("adminUsers.table.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingUsers ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-amber-900/70">
                            {t("adminUsers.loading")}
                          </TableCell>
                        </TableRow>
                      ) : displayedUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-amber-900/70">
                            {t("adminUsers.noUsers")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        displayedUsers.map((u) => {
                          const isSelf = u._id === user?._id;
                          return (
                            <TableRow key={u._id}>
                              <TableCell className="font-medium text-[#3F2A1E]">{u.name}</TableCell>
                              <TableCell className="text-amber-900/80">{u.email}</TableCell>
                              <TableCell>
                                <Badge className={roleBadgeClass(u.role)}>
                                  {u.role === "owner" ? "Owner" : u.role === "groomer" ? "Groomer" : "Admin"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-amber-900/80">{u.phone || "-"}</TableCell>
                              <TableCell className="text-amber-900/80">
                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                              </TableCell>
                              <TableCell>
                                {u.isVerified ? (
                                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">
                                    {t("adminUsers.emailVerified.yes")}
                                  </Badge>
                                ) : (
                                  <Badge className="border-amber-200 bg-amber-50 text-amber-900">
                                    {t("adminUsers.emailVerified.no")}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-2">
                                  {!u.isVerified && u.role !== "admin" && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      disabled={acting}
                                      onClick={() => handleVerifyEmail(u)}
                                    >
                                      {t("adminUsers.actions.verifyEmail")}
                                    </Button>
                                  )}
                                  {(u.role === "groomer" || u.role === "owner") && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setNewPassword("");
                                        setPasswordDialogUser(u);
                                      }}
                                    >
                                      {t("adminUsers.actions.resetPassword")}
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={isSelf}
                                    onClick={() => setDeleteDialogUser(u)}
                                    title={isSelf ? t("adminUsers.selfProtect") : ""}
                                  >
                                    {t("adminUsers.actions.deleteUser")}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card
              id="admin-section-preview"
              className="scroll-mt-24 rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-white via-yellow-50 to-amber-50 shadow-md"
            >
              <CardHeader>
                <CardTitle className="text-amber-950">
                  {t("adminUsers.preview.title")}
                </CardTitle>
                <CardDescription className="text-amber-900/70">
                  {t("adminUsers.preview.subtitle")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPreviewAppts ? (
                  <p className="rounded-3xl border border-amber-200 bg-white/70 py-10 text-center text-sm text-amber-900/70">
                    {t("adminUsers.preview.loading")}
                  </p>
                ) : todayPreviewRows.length === 0 && upcomingPreviewRows.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-amber-200 bg-white/60 px-6 py-10 text-center">
                    <p className="text-sm font-medium text-amber-950">
                      {t("adminUsers.preview.emptyTitle")}
                    </p>
                    <p className="mt-1 text-xs text-amber-900/70">
                      {t("adminUsers.preview.emptyHint")}
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[min(28rem,70vh)] space-y-4 overflow-y-auto pr-1">
                    {todayPreviewRows.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800/80">
                          {t("adminUsers.preview.todaySection")}
                        </p>
                        <ul className="space-y-2">
                          {todayPreviewRows.map((a) => (
                            <li
                              key={a._id}
                              className="rounded-2xl border border-amber-200 bg-white/80 px-4 py-3 shadow-sm"
                            >
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <span className="font-semibold text-amber-950">{formatTimeRange(a)}</span>
                                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
                                  {statusLabel(a.status)}
                                </Badge>
                              </div>
                              <p className="mt-1 text-sm text-[#3F2A1E]">
                                {petLine(a.petId)} · {serviceLabel(a.serviceType)}
                              </p>
                              <p className="text-xs text-amber-900/75">
                                {t("adminUsers.preview.ownerLabel")}：{ownerLine(a.ownerId)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {upcomingPreviewRows.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800/80">
                          {t("adminUsers.preview.upcomingSection")}
                        </p>
                        <ul className="space-y-2">
                          {upcomingPreviewRows.map((a) => (
                            <li
                              key={a._id}
                              className="rounded-2xl border border-amber-200 bg-white/80 px-4 py-3 shadow-sm"
                            >
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <span className="text-xs font-medium text-amber-800">
                                  {formatSectionDate(a.startTime)}
                                </span>
                                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
                                  {statusLabel(a.status)}
                                </Badge>
                              </div>
                              <p className="mt-0.5 font-semibold text-amber-950">{formatTimeRange(a)}</p>
                              <p className="mt-1 text-sm text-[#3F2A1E]">
                                {petLine(a.petId)} · {serviceLabel(a.serviceType)}
                              </p>
                              <p className="text-xs text-amber-900/75">
                                {t("adminUsers.preview.ownerLabel")}：{ownerLine(a.ownerId)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <GroomerCreationModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          loadUsers(search);
          loadAppointments();
        }}
      />
      <PromotionManagerModal
        open={promotionModalOpen}
        onClose={() => setPromotionModalOpen(false)}
        onMutate={refreshPromoCount}
      />

      <Dialog
        open={!!passwordDialogUser}
        onOpenChange={(v) => {
          if (!v) {
            setPasswordDialogUser(null);
            setNewPassword("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("adminUsers.actions.resetPassword", { defaultValue: "重置密码" })}</DialogTitle>
            <DialogDescription>
              {t("adminUsers.resetDesc", { defaultValue: "请输入新密码（至少 6 位），由管理员自行设定。" })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t("adminUsers.resetPlaceholder")}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogUser(null)} disabled={acting}>
              {t("adminUsers.actions.cancel")}
            </Button>
            <Button onClick={handleResetPassword} disabled={acting || newPassword.length < 6}>
              {t("adminUsers.actions.confirmReset")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteDialogUser} onOpenChange={(v) => !v && setDeleteDialogUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <ExclamationTriangleIcon className="h-5 w-5" />
              {t("adminUsers.actions.deleteUser")}
            </DialogTitle>
            <DialogDescription className="text-red-700/90">
              {t("adminUsers.deleteWarn")}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {t("adminUsers.deleteTarget", {
              name: deleteDialogUser?.name ?? "",
              email: deleteDialogUser?.email ?? "",
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogUser(null)} disabled={acting}>
              {t("adminUsers.actions.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={acting}>
              {t("adminUsers.actions.confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}

