"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Mail, Search, Shield, UserCheck, UserMinus, UserRoundX, Users } from "lucide-react";
import { ApiClient } from "@/lib/api";
import RoleGuard from "@/components/auth/RoleGuard";
import { FeedbackDialog } from "@/components/ui/feedback-dialog";
import { AppSelect } from "@/components/ui/app-select";

interface UserRecord {
  id: number;
  username: string;
  full_name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email: string;
  role: string;
  requested_role?: string;
  contact_number?: string;
  status: string;
  is_active: boolean;
  created_at?: string;
}

const PAGE_SIZE = 5;

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeStatus(user: UserRecord) {
  const status = String(user.status || "").toLowerCase();
  if (status === "pending") return "pending";
  if (status === "inactive" || (!user.is_active && status !== "pending")) return "inactive";
  return "active";
}

function getFullName(user: UserRecord) {
  if (user.full_name?.trim()) return user.full_name;
  return [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ").trim() || "N/A";
}

export default function AccountsPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; message: string; action?: () => Promise<void> | void }>({
    open: false,
    title: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const [usersRes, pendingRes] = await Promise.allSettled([ApiClient.get("/api/users"), ApiClient.get("/api/users/pending")]);

      const allUsers: UserRecord[] = [];

      if (usersRes.status === "fulfilled") {
        const result = await usersRes.value.json();
        const list = result?.success ? result.data : result?.data ?? result;
        if (Array.isArray(list)) allUsers.push(...list);
      }

      if (pendingRes.status === "fulfilled") {
        const result = await pendingRes.value.json();
        const list = result?.success ? result.data : result?.data ?? result;
        if (Array.isArray(list)) {
          list.forEach((entry) => {
            if (!allUsers.some((user) => user.id === entry.id)) {
              allUsers.push(entry);
            }
          });
        }
      }

      setUsers(allUsers);
    } catch (err) {
      console.error("Failed to fetch users", err);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const filteredUsers = useMemo(() => {
    const lowered = searchTerm.toLowerCase();
    return users.filter((user) => {
      const computedStatus = normalizeStatus(user);
      const matchesSearch =
        getFullName(user).toLowerCase().includes(lowered) ||
        (user.username || "").toLowerCase().includes(lowered) ||
        (user.email || "").toLowerCase().includes(lowered);
      const matchesStatus = statusFilter === "All Status" || computedStatus === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const paginatedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const openConfirm = (title: string, message: string, action: () => Promise<void> | void) => {
    setConfirmState({ open: true, title, message, action });
  };

  const handleStatusChange = async (user: UserRecord, nextStatus: "pending" | "active" | "inactive", nextRole?: string) => {
    setIsSubmitting(true);
    try {
      await ApiClient.patch(`/api/users/${user.id}/status`, {
        status: nextStatus,
        role: nextRole ?? user.role ?? user.requested_role,
        requested_role: user.requested_role,
        is_active: nextStatus === "active",
      });
      await fetchAccounts();
      setSelectedUser((current) => (current?.id === user.id ? { ...user, status: nextStatus, is_active: nextStatus === "active" } : current));
    } catch (error) {
      console.error("User status update failed", error);
    } finally {
      setIsSubmitting(false);
      setConfirmState({ open: false, title: "", message: "" });
    }
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="min-h-screen bg-[#f4f5ef] p-6 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900">Users</h1>
              <p className="mt-2 text-sm font-medium text-[#2f6f4f]">Manage requested access, activation, and account visibility.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-[280px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search full name, username, or email"
                  className="w-full rounded-2xl border border-emerald-100 bg-white py-3 pl-12 pr-4 font-semibold outline-none transition focus:border-emerald-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <AppSelect
                value={statusFilter}
                onValueChange={setStatusFilter}
                className="min-w-[180px] px-4 py-3 font-semibold"
                options={[
                  { label: "All Status", value: "All Status" },
                  { label: "Pending", value: "pending" },
                  { label: "Active", value: "active" },
                  { label: "Inactive", value: "inactive" },
                ]}
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-[0_20px_60px_rgba(47,111,79,0.08)]">
            {isLoading ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-[#2f6f4f]" />
                <p className="font-bold text-slate-400">Loading user accounts...</p>
              </div>
            ) : (
              <>
                <div className="hidden-scrollbar overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-left">
                    <thead className="table-header-emerald border-b border-emerald-100 text-[11px] font-black uppercase tracking-[0.18em] text-[#2f6f4f]">
                      <tr>
                        <th className="px-6 py-4">Full Name</th>
                        <th className="px-6 py-4">Username</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Assigned Role</th>
                        <th className="px-6 py-4">Requested Role</th>
                        <th className="px-6 py-4">Account Status</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {paginatedUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-16 text-center font-bold text-slate-400">
                            No users found.
                          </td>
                        </tr>
                      ) : (
                        paginatedUsers.map((user) => {
                          const computedStatus = normalizeStatus(user);

                          return (
                            <tr key={user.id} className="border-b border-slate-100 align-top last:border-b-0">
                              <td className="px-6 py-5 font-black text-slate-900">{titleCase(getFullName(user))}</td>
                              <td className="px-6 py-5 font-semibold text-slate-600">@{user.username}</td>
                              <td className="px-6 py-5">
                                <span className="inline-flex items-center gap-2 font-semibold text-slate-600">
                                  <Mail size={14} className="text-[#2f6f4f]" /> {user.email}
                                </span>
                              </td>
                              <td className="px-6 py-5">
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-[#2f6f4f]">
                                  {user.role || "Unassigned"}
                                </span>
                              </td>
                              <td className="px-6 py-5">
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600">
                                  {user.requested_role || user.role || "N/A"}
                                </span>
                              </td>
                              <td className="px-6 py-5">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                                    computedStatus === "pending"
                                      ? "bg-amber-100 text-amber-700"
                                      : computedStatus === "active"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {computedStatus}
                                </span>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedUser(user)}
                                    className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
                                    aria-label={`View ${getFullName(user)}`}
                                  >
                                    <Eye size={16} />
                                  </button>

                                  {computedStatus === "pending" && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openConfirm(
                                            "Accept User Request",
                                            `Approve ${getFullName(user)} as ${user.requested_role || "staff"}?`,
                                            () => handleStatusChange(user, "active", user.requested_role || "staff")
                                          )
                                        }
                                        className="rounded-xl bg-emerald-50 p-2 text-emerald-700 transition hover:bg-emerald-100"
                                        aria-label={`Accept ${getFullName(user)}`}
                                      >
                                        <UserCheck size={16} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openConfirm(
                                            "Reject User Request",
                                            `Reject ${getFullName(user)} and keep the account inactive?`,
                                            () => handleStatusChange(user, "inactive")
                                          )
                                        }
                                        className="rounded-xl bg-red-50 p-2 text-red-700 transition hover:bg-red-100"
                                        aria-label={`Reject ${getFullName(user)}`}
                                      >
                                        <UserRoundX size={16} />
                                      </button>
                                    </>
                                  )}

                                  {computedStatus === "active" && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openConfirm(
                                          "Block User",
                                          `Block ${getFullName(user)} from accessing the system?`,
                                          () => handleStatusChange(user, "inactive")
                                        )
                                      }
                                      className="rounded-xl bg-red-50 p-2 text-red-700 transition hover:bg-red-100"
                                      aria-label={`Block ${getFullName(user)}`}
                                    >
                                      <UserMinus size={16} />
                                    </button>
                                  )}

                                  {computedStatus === "inactive" && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openConfirm(
                                          "Unblock User",
                                          `Activate ${getFullName(user)} and restore access?`,
                                          () => handleStatusChange(user, "active", user.role || user.requested_role || "staff")
                                        )
                                      }
                                      className="rounded-xl bg-emerald-50 p-2 text-emerald-700 transition hover:bg-emerald-100"
                                      aria-label={`Unblock ${getFullName(user)}`}
                                    >
                                      <Shield size={16} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                  <p className="text-sm font-semibold text-slate-500">
                    Showing {(page - 1) * PAGE_SIZE + (paginatedUsers.length ? 1 : 0)}-{(page - 1) * PAGE_SIZE + paginatedUsers.length} of {filteredUsers.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page === 1}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span className="min-w-20 text-center text-sm font-black text-[#2f6f4f]">
                      {page} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page === totalPages}
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-[2rem] border border-emerald-100 bg-white p-8 shadow-2xl">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-[#2f6f4f]">
                  <Users size={26} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{titleCase(getFullName(selectedUser))}</h2>
                  <p className="text-sm font-semibold text-slate-500">User request details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Username</p>
                  <p className="mt-2 text-sm font-bold text-slate-800">@{selectedUser.username}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Email</p>
                  <p className="mt-2 text-sm font-bold text-slate-800">{selectedUser.email}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Requested Role</p>
                  <p className="mt-2 text-sm font-bold text-[#2f6f4f]">{(selectedUser.requested_role || "N/A").toUpperCase()}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Assigned Role</p>
                  <p className="mt-2 text-sm font-bold text-slate-800">{(selectedUser.role || "N/A").toUpperCase()}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Contact Number</p>
                  <p className="mt-2 text-sm font-bold text-slate-800">{selectedUser.contact_number || "Not provided"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Status</p>
                  <p className="mt-2 text-sm font-bold text-slate-800">{normalizeStatus(selectedUser).toUpperCase()}</p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <FeedbackDialog
          open={confirmState.open}
          title={confirmState.title}
          message={confirmState.message}
          variant="warning"
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          loading={isSubmitting}
          onConfirm={() => confirmState.action?.()}
          onCancel={() => !isSubmitting && setConfirmState({ open: false, title: "", message: "" })}
        />
      </div>
    </RoleGuard>
  );
}
