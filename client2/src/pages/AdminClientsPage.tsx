import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { MagnifyingGlassIcon, UserGroupIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import PageTransition from "../components/layout/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import type { AdminUserListItem } from "../types";
import { getAdminUsers } from "../services/adminService";
import { toast } from "sonner";

export default function AdminClientsPage() {
  const { t, i18n } = useTranslation("admin");
  const navigate = useNavigate();
  const locale = i18n.language?.startsWith("zh") ? "zh-CN" : "en-US";
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const rows = await getAdminUsers(search);
        setUsers(rows.filter((u) => u.role === "owner"));
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        toast.error(t("clients.toastLoadFailTitle"), {
          description: msg || t("clients.toastLoadFailDesc"),
        });
      } finally {
        setLoading(false);
      }
    }, 260);
    return () => clearTimeout(timer);
  }, [search, t]);

  const rows = useMemo(() => users, [users]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-b from-[#FFFDF7] via-[#FAF6EB]/90 to-[#FFE8A3]/15">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <Card className="overflow-hidden rounded-[2rem] border-2 border-[#F9C74F]/50 bg-gradient-to-br from-white via-[#FFFDF7] to-[#FFEFC2]/85 shadow-lg shadow-amber-200/30">
              <CardContent className="relative p-6 sm:p-8">
                <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#FFDE42]/35 blur-2xl" />
                <div className="relative flex flex-col gap-3">
                  <h1 className="flex items-center gap-2 text-2xl font-extrabold text-amber-950 sm:text-3xl">
                    <UserGroupIcon className="h-8 w-8 text-amber-700" />
                    {t("clients.listTitle")}
                  </h1>
                  <p className="text-sm font-medium text-amber-900/80">{t("clients.listSubtitle")}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <Card className="rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-white via-[#FFFDF7] to-[#FAF6EB] shadow-md">
            <CardHeader>
              <CardTitle className="text-amber-950">{t("clients.listTableTitle")}</CardTitle>
              <CardDescription className="text-amber-900/70">{t("clients.listTableDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-2">
                <div className="relative w-full">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700/70" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("clients.searchPlaceholder")}
                    className="rounded-2xl border-amber-200 bg-white/85 pl-9"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-amber-200 bg-white/75">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("clients.columns.name")}</TableHead>
                      <TableHead>{t("clients.columns.email")}</TableHead>
                      <TableHead>{t("clients.columns.phone")}</TableHead>
                      <TableHead>{t("clients.columns.pets")}</TableHead>
                      <TableHead>{t("clients.columns.createdAt")}</TableHead>
                      <TableHead>{t("clients.columns.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-amber-900/75">
                          {t("clients.loading")}
                        </TableCell>
                      </TableRow>
                    ) : rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-amber-900/75">
                          {t("clients.empty")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((u) => (
                        <TableRow key={u._id} className="hover:bg-amber-50/60">
                          <TableCell className="font-semibold text-[#3F2A1E]">{u.name}</TableCell>
                          <TableCell className="text-[#3F2A1E]">{u.email}</TableCell>
                          <TableCell className="text-amber-900/80">{u.phone || "-"}</TableCell>
                          <TableCell className="text-amber-900/80">{u.petCount ?? 0}</TableCell>
                          <TableCell className="text-amber-900/80">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString(locale) : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-2xl border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
                              onClick={() => navigate(`/admin/clients/${u._id}`)}
                            >
                              {t("clients.viewDetailBtn")}
                              <ChevronRightIcon className="ml-1 h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
