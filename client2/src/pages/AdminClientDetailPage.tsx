import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowLeftIcon, CalendarDaysIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import PageTransition from "../components/layout/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import type { AdminUserListItem, Appointment, Pet } from "../types";
import {
  getAdminClientAppointments,
  getAdminClientPets,
  getAdminUsers,
  updateBoardingDates,
} from "../services/adminService";
import { petService } from "../services/petService";
import { toast } from "sonner";

export default function AdminClientDetailPage() {
  const { userId = "" } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("admin");
  const { t: tb } = useTranslation("booking");
  const locale = i18n.language?.startsWith("zh") ? "zh-CN" : "en-US";

  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState<AdminUserListItem | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [boardingDialogOpen, setBoardingDialogOpen] = useState(false);
  const [boardingTarget, setBoardingTarget] = useState<Appointment | null>(null);
  const [boardingCheckIn, setBoardingCheckIn] = useState("");
  const [boardingCheckOut, setBoardingCheckOut] = useState("");
  const [boardingSaving, setBoardingSaving] = useState(false);

  const loadData = async (dateParams?: { from?: string; to?: string }) => {
    if (!userId) return;
    try {
      setLoading(true);
      const [users, petRows, apptRows] = await Promise.all([
        getAdminUsers(),
        getAdminClientPets(userId),
        getAdminClientAppointments(userId, dateParams),
      ]);
      const owner = users.find((u) => u._id === userId && u.role === "owner") || null;
      setClient(owner);
      setPets(
        petRows.map((p) => ({
          ...p,
          imageUrl: petService.toAbsoluteImageUrl(p.imageUrl),
        }))
      );
      setAppointments(apptRows);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(t("clients.toastDetailLoadFailTitle"), {
        description: msg || t("clients.toastDetailLoadFailDesc"),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [userId]);

  const onApplyDateFilter = () => {
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      toast.warning(t("clients.invalidDateRange"));
      return;
    }
    const fromIso = fromDate ? new Date(`${fromDate}T00:00:00`).toISOString() : undefined;
    const toIso = toDate ? new Date(`${toDate}T23:59:59.999`).toISOString() : undefined;
    void loadData({ from: fromIso, to: toIso });
  };

  const onClearDateFilter = () => {
    setFromDate("");
    setToDate("");
    void loadData();
  };

  const serviceRows = useMemo(() => appointments, [appointments]);

  const toUtcYmd = (value: string | Date) => {
    const d = new Date(value);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
      d.getUTCDate()
    ).padStart(2, "0")}`;
  };

  const calcDays = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(`${checkIn}T00:00:00Z`);
    const end = new Date(`${checkOut}T00:00:00Z`);
    return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  };

  const openBoardingEditor = (appointment: Appointment) => {
    const checkIn = appointment.checkInDate ? toUtcYmd(appointment.checkInDate) : toUtcYmd(appointment.startTime);
    const checkOut = appointment.checkOutDate ? toUtcYmd(appointment.checkOutDate) : toUtcYmd(appointment.endTime);
    setBoardingTarget(appointment);
    setBoardingCheckIn(checkIn);
    setBoardingCheckOut(checkOut);
    setBoardingDialogOpen(true);
  };

  const closeBoardingEditor = () => {
    setBoardingDialogOpen(false);
    setBoardingTarget(null);
    setBoardingCheckIn("");
    setBoardingCheckOut("");
  };

  const saveBoardingDateRange = async () => {
    if (!boardingTarget) return;
    if (!boardingCheckIn || !boardingCheckOut) {
      toast.warning("请先选择入住和离开日期");
      return;
    }
    if (boardingCheckOut <= boardingCheckIn) {
      toast.warning("离开日期必须晚于入住日期");
      return;
    }
    try {
      setBoardingSaving(true);
      const updated = await updateBoardingDates(boardingTarget._id, {
        checkInDate: boardingCheckIn,
        checkOutDate: boardingCheckOut,
      });
      setAppointments((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
      toast.success("住宿天数已更新");
      closeBoardingEditor();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string; details?: string } } })?.response?.data?.error ||
        (err as { response?: { data?: { error?: string; details?: string } } })?.response?.data?.details;
      toast.error("更新失败", {
        description: msg || "请稍后重试",
      });
    } finally {
      setBoardingSaving(false);
    }
  };

  const startEditPetNote = (pet: Pet) => {
    setEditingPetId(pet._id);
    setNoteDraft(pet.notesForGroomer || "");
  };

  const cancelEditPetNote = () => {
    setEditingPetId(null);
    setNoteDraft("");
  };

  const savePetNote = async (petId: string) => {
    try {
      setSavingNote(true);
      const updated = await petService.updatePetGroomerNote(petId, noteDraft.trim());
      setPets((prev) => prev.map((p) => (p._id === petId ? { ...p, ...updated, notesForGroomer: updated.notesForGroomer || "" } : p)));
      setEditingPetId(null);
      setNoteDraft("");
      toast.success(t("clients.noteSaveOk"));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } }; error?: string })?.response?.data?.error;
      toast.error(t("clients.noteSaveFail"), {
        description: msg || (err as { error?: string })?.error || t("clients.toastDetailLoadFailDesc"),
      });
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-[#FFFDF7] via-[#FAF6EB]/90 to-[#FFE8A3]/15">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <Button
              type="button"
              variant="outline"
              className="mb-4 rounded-2xl border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
              onClick={() => navigate("/admin/clients")}
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              {t("clients.backToList")}
            </Button>

            <Card className="overflow-hidden rounded-[2rem] border-2 border-[#F9C74F]/50 bg-gradient-to-br from-white via-[#FFFDF7] to-[#FFEFC2]/85 shadow-lg shadow-amber-200/30">
              <CardContent className="relative p-6 sm:p-8">
                <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#FFDE42]/35 blur-2xl" />
                <div className="relative flex flex-col gap-3">
                  <h1 className="flex items-center gap-2 text-2xl font-extrabold text-amber-950 sm:text-3xl">
                    <UserCircleIcon className="h-8 w-8 text-amber-700" />
                    {t("clients.detailTitle")}
                  </h1>
                  <p className="text-sm font-medium text-amber-900/80">{t("clients.detailSubtitle")}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-white via-[#FFFDF7] to-[#FAF6EB] shadow-md lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-amber-950">{t("clients.profileCardTitle")}</CardTitle>
                <CardDescription className="text-amber-900/70">{t("clients.profileCardDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {loading ? (
                  <p className="text-amber-900/75">{t("clients.loading")}</p>
                ) : !client ? (
                  <p className="text-amber-900/75">{t("clients.notFound")}</p>
                ) : (
                  <>
                    <div>
                      <p className="text-amber-900/70">{t("clients.columns.name")}</p>
                      <p className="font-semibold text-[#3F2A1E]">{client.name}</p>
                    </div>
                    <div>
                      <p className="text-amber-900/70">{t("clients.columns.email")}</p>
                      <p className="text-[#3F2A1E]">{client.email}</p>
                    </div>
                    <div>
                      <p className="text-amber-900/70">{t("clients.columns.phone")}</p>
                      <p className="text-[#3F2A1E]">{client.phone || "-"}</p>
                    </div>
                    <div>
                      <p className="text-amber-900/70">{t("clients.columns.pets")}</p>
                      <p className="text-[#3F2A1E]">{pets.length}</p>
                    </div>
                    <div>
                      <p className="text-amber-900/70">{t("clients.columns.createdAt")}</p>
                      <p className="text-[#3F2A1E]">
                        {client.createdAt ? new Date(client.createdAt).toLocaleDateString(locale) : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-amber-900/70">{t("clients.emailVerifyStatus")}</p>
                      {client.isVerified ? (
                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">
                          {t("adminUsers.emailVerified.yes")}
                        </Badge>
                      ) : (
                        <Badge className="border-amber-200 bg-amber-50 text-amber-900">
                          {t("adminUsers.emailVerified.no")}
                        </Badge>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-white via-[#FFFDF7] to-[#FAF6EB] shadow-md lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-amber-950">{t("clients.petsCardTitle")}</CardTitle>
                <CardDescription className="text-amber-900/70">{t("clients.petsCardDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-amber-900/75">{t("clients.loading")}</p>
                ) : pets.length === 0 ? (
                  <p className="text-amber-900/75">{t("clients.noPets")}</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {pets.map((pet) => (
                      <div
                        key={pet._id}
                        className="rounded-3xl border border-amber-200 bg-white/90 p-4 shadow-sm"
                      >
                        <div className="mb-3 flex justify-center">
                          {pet.imageUrl ? (
                            <img
                              src={pet.imageUrl}
                              alt={pet.name}
                              className="h-24 w-24 rounded-2xl border border-amber-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-xs text-amber-900/75">
                              {tb("petForm.avatarNoPhoto", { defaultValue: "暂无照片" })}
                            </div>
                          )}
                        </div>
                        <p className="font-semibold text-[#3F2A1E]">{pet.name}</p>
                        <p className="text-xs text-amber-900/80 capitalize">
                          {pet.species} · {pet.breed}
                        </p>
                        <p className="text-xs text-amber-900/75">
                          {t("clients.petAgeLabel")}: {pet.age}
                        </p>
                        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-2">
                          <p className="text-xs font-medium text-amber-900">{t("clients.groomerNoteLabel")}</p>
                          {editingPetId === pet._id ? (
                            <div className="mt-1 space-y-2">
                              <textarea
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                                rows={3}
                                maxLength={500}
                                className="w-full rounded-xl border border-amber-200 bg-white px-2 py-1 text-xs text-[#3F2A1E] focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                                placeholder={t("clients.groomerNotePlaceholder")}
                              />
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-amber-900/75">{noteDraft.length}/500</span>
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 rounded-xl border-amber-300 bg-white px-2 text-xs text-amber-900 hover:bg-amber-50"
                                    onClick={cancelEditPetNote}
                                    disabled={savingNote}
                                  >
                                    {t("clients.noteCancelBtn")}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-7 rounded-xl bg-amber-500 px-2 text-xs text-white hover:bg-amber-600"
                                    onClick={() => void savePetNote(pet._id)}
                                    disabled={savingNote}
                                  >
                                    {t("clients.noteSaveBtn")}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-1">
                              {pet.notesForGroomer ? (
                                <p className="whitespace-pre-wrap text-xs text-[#3F2A1E]">
                                  {pet.notesForGroomer}
                                </p>
                              ) : (
                                <p className="text-xs italic text-amber-900/75">{t("clients.groomerNoteEmpty")}</p>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="mt-2 h-7 rounded-xl border-amber-300 bg-white px-2 text-xs text-amber-900 hover:bg-amber-50"
                                onClick={() => startEditPetNote(pet)}
                              >
                                {t("clients.noteEditBtn")}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6 rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-white via-[#FFFDF7] to-[#FAF6EB] shadow-md">
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-amber-950">
                    <CalendarDaysIcon className="h-5 w-5 text-amber-700" />
                    {t("clients.serviceHistoryTitle")}
                  </CardTitle>
                  <CardDescription className="text-amber-900/70">{t("clients.serviceHistoryDesc")}</CardDescription>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <p className="mb-1 text-xs text-amber-900/75">{t("clients.filterFrom")}</p>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="rounded-2xl border-amber-200 bg-white/90"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-amber-900/75">{t("clients.filterTo")}</p>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="rounded-2xl border-amber-200 bg-white/90"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={onApplyDateFilter}
                    className="rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600"
                  >
                    {t("clients.applyFilterBtn")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
                    onClick={onClearDateFilter}
                  >
                    {t("clients.clearFilterBtn")}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-3xl border border-amber-200 bg-white/75">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("clients.serviceColumns.date")}</TableHead>
                      <TableHead>{t("clients.serviceColumns.pet")}</TableHead>
                      <TableHead>{t("clients.serviceColumns.service")}</TableHead>
                      <TableHead>{t("clients.serviceColumns.groomer")}</TableHead>
                      <TableHead>{t("clients.serviceColumns.status")}</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-amber-900/75">
                          {t("clients.loading")}
                        </TableCell>
                      </TableRow>
                    ) : serviceRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-amber-900/75">
                          {t("clients.noServiceRecords")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      serviceRows.map((a) => (
                        <TableRow key={a._id} className="hover:bg-amber-50/60">
                          <TableCell className="text-[#3F2A1E]">
                            {new Date(a.startTime).toLocaleString(locale)}
                          </TableCell>
                          <TableCell className="text-[#3F2A1E]">
                            {a.petId && typeof a.petId === "object" ? a.petId.name : "-"}
                          </TableCell>
                          <TableCell className="text-[#3F2A1E]">
                            {tb(`serviceTypes.${a.serviceType}`)}
                          </TableCell>
                          <TableCell className="text-[#3F2A1E]">
                            {a.groomerId && typeof a.groomerId === "object" ? a.groomerId.name : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
                              {a.status === "confirmed"
                                ? tb("status.confirmed")
                                : a.status === "in_progress"
                                ? tb("status.inProgress")
                                : a.status === "completed"
                                ? tb("status.completed")
                                : a.status === "cancelled"
                                ? tb("status.cancelled")
                                : a.status === "no_show"
                                ? tb("status.noShow")
                                : a.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {a.serviceType === "boarding" &&
                            (a.status === "confirmed" || a.status === "in_progress") ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="rounded-xl border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
                                onClick={() => openBoardingEditor(a)}
                              >
                                修改住宿天数
                              </Button>
                            ) : (
                              <span className="text-xs text-amber-900/60">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {boardingDialogOpen && boardingTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/45" onClick={closeBoardingEditor} />
              <div className="relative w-full max-w-md rounded-3xl border-2 border-amber-200 bg-white p-5 shadow-2xl">
                <h3 className="text-lg font-bold text-amber-950">修改住宿天数</h3>
                <p className="mt-1 text-xs text-amber-900/75">
                  预约编号：{boardingTarget._id.slice(-8).toUpperCase()} | 当前天数：
                  {calcDays(
                    boardingTarget.checkInDate
                      ? toUtcYmd(boardingTarget.checkInDate)
                      : toUtcYmd(boardingTarget.startTime),
                    boardingTarget.checkOutDate
                      ? toUtcYmd(boardingTarget.checkOutDate)
                      : toUtcYmd(boardingTarget.endTime)
                  )}
                  天
                </p>
                <div className="mt-4 grid grid-cols-1 gap-3">
                  <div>
                    <p className="mb-1 text-xs text-amber-900/75">入住日期</p>
                    <Input
                      type="date"
                      value={boardingCheckIn}
                      onChange={(e) => setBoardingCheckIn(e.target.value)}
                      className="rounded-2xl border-amber-200 bg-white/90"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-amber-900/75">离开日期（不包含当天）</p>
                    <Input
                      type="date"
                      value={boardingCheckOut}
                      onChange={(e) => setBoardingCheckOut(e.target.value)}
                      className="rounded-2xl border-amber-200 bg-white/90"
                    />
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-2 text-xs text-amber-900">
                    新住宿天数：{calcDays(boardingCheckIn, boardingCheckOut)} 天
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
                    onClick={closeBoardingEditor}
                    disabled={boardingSaving}
                  >
                    取消
                  </Button>
                  <Button
                    type="button"
                    className="rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600"
                    onClick={() => void saveBoardingDateRange()}
                    disabled={boardingSaving}
                  >
                    {boardingSaving ? "保存中..." : "保存"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
