"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Mail, Search, Shield, UserCheck, UserMinus, UserRoundX, Users } from "lucide-react";
import { ApiClient } from "@/lib/api";
import { useNotifications } from "@/context/NotificationsContext";
import RoleGuard from "@/components/auth/RoleGuard";
import { FeedbackDialog } from "@/components/ui/feedback-dialog";
import { AppSelect } from "@/components/ui/app-select";
import { Input } from "@/components/ui/input";

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
const ACCOUNT_LIST_ENDPOINTS = ["/api/users", "/auth/accounts"];
const PENDING_ACCOUNT_ENDPOINTS = ["/api/users/pending", "/auth/pending-accounts"];

function extractListPayload(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data;
  }
  return [];
}

async function fetchFirstSuccessfulList(endpoints: string[]) {
  for (const endpoint of endpoints) {
    try {
      const response = await ApiClient.get(endpoint);
      const payload = await response.json().catch(() => null);
      return extractListPayload(payload);
    } catch {
      continue;
    }
  }

  return [];
}

async function patchFirstSuccessfulStatus(
  userId: number,
  body: Record<string, unknown>
) {
  const endpoints = [`/api/users/${userId}/status`, `/auth/accounts/${userId}/status`];
  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      return await ApiClient.patch(endpoint, body);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Failed to update account status.");
}

function extractTemporaryPassword(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";

  const record = payload as Record<string, unknown>;
  const directKeys = [
    "temporary_password",
    "temporaryPassword",
    "temp_password",
    "tempPassword",
    "generated_password",
    "generatedPassword",
    "password",
  ];

  for (const key of directKeys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }

  const nestedCandidates = [record.data, record.user, record.account];
  for (const candidate of nestedCandidates) {
    const nestedPassword = extractTemporaryPassword(candidate);
    if (nestedPassword) return nestedPassword;
  }

  return "";
}

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
  const { refreshVersions } = useNotifications();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; message: string; action?: () => Promise<void> | void }>({
    open: false,
    title: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvalNotice, setApprovalNotice] = useState<{ open: boolean; email: string; temporaryPassword: string; emailDelivered: boolean; emailError: string } | null>(null);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const [usersList, pendingList] = await Promise.all([
        fetchFirstSuccessfulList(ACCOUNT_LIST_ENDPOINTS),
        fetchFirstSuccessfulList(PENDING_ACCOUNT_ENDPOINTS),
      ]);

      const allUsers: UserRecord[] = [];

      usersList.forEach((entry) => {
        if (entry && typeof entry === "object") {
          allUsers.push(entry as UserRecord);
        }
      });

      pendingList.forEach((entry) => {
        if (entry && typeof entry === "object" && !allUsers.some((user) => user.id === (entry as UserRecord).id)) {
          allUsers.push(entry as UserRecord);
        }
      });

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

  useEffect(() => {
    fetchAccounts();
  }, [refreshVersions.users]);

  const filteredUsers = useMemo(() => {
    const lowered = searchTerm.toLowerCase();
    return users.filter((user) => {
      const computedStatus = normalizeStatus(user);
      const computedRole = String(user.role || user.requested_role || "").trim().toLowerCase();
      const matchesSearch =
        getFullName(user).toLowerCase().includes(lowered) ||
        (user.username || "").toLowerCase().includes(lowered) ||
        (user.email || "").toLowerCase().includes(lowered);
      const matchesStatus = statusFilter === "All Status" || computedStatus === statusFilter.toLowerCase();
      const matchesRole = roleFilter === "All Roles" || computedRole === roleFilter.toLowerCase();
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [roleFilter, searchTerm, statusFilter, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const paginatedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, searchTerm, statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const openConfirm = (title: string, message: string, action: () => Promise<void> | void) => {
    setConfirmState({ open: true, title, message, action });
  };

  const handleStatusChange = async (user: UserRecord, nextStatus: "pending" | "active" | "inactive" | "approved", nextRole?: string) => {
    setIsSubmitting(true);
    const isApprovingPendingUser = normalizeStatus(user) === "pending" && (nextStatus === "active" || nextStatus === "approved");
    const nextIsActive = isApprovingPendingUser || nextStatus === "active";
    try {
      const response = await patchFirstSuccessfulStatus(user.id, {
        status: isApprovingPendingUser ? "approved" : nextStatus,
        role: nextRole ?? user.role ?? user.requested_role,
        requested_role: user.requested_role,
        is_active: nextIsActive,
        must_change_password: isApprovingPendingUser,
        mustChangePassword: isApprovingPendingUser,
        send_temp_password_email: isApprovingPendingUser,
        sendTempPasswordEmail: isApprovingPendingUser,
      });
      const payload = await response.json().catch(() => null);
      const backendTemporaryPassword = extractTemporaryPassword(payload);
      const emailDelivered = Boolean(
        payload &&
          typeof payload === "object" &&
          "email" in payload &&
          payload.email &&
          typeof payload.email === "object" &&
          "Delivered" in (payload.email as Record<string, unknown>)
          ? (payload.email as Record<string, unknown>).Delivered
          : payload &&
              typeof payload === "object" &&
              "email" in payload &&
              payload.email &&
              typeof payload.email === "object" &&
              "delivered" in (payload.email as Record<string, unknown>)
            ? (payload.email as Record<string, unknown>).delivered
            : false
      );
      const emailError =
        payload && typeof payload === "object" && typeof (payload as Record<string, unknown>).email_error === "string"
          ? String((payload as Record<string, unknown>).email_error)
          : "";
      await fetchAccounts();
      setSelectedUser((current) => (current?.id === user.id ? { ...user, status: isApprovingPendingUser ? "approved" : nextStatus, is_active: nextIsActive } : current));
      if (isApprovingPendingUser && backendTemporaryPassword) {
        setApprovalNotice({
          open: true,
          email: user.email,
          temporaryPassword: backendTemporaryPassword,
          emailDelivered,
          emailError,
        });
      }
    } catch (error) {
      console.error("User status update failed", error);
    } finally {
      setIsSubmitting(false);
      setConfirmState({ open: false, title: "", message: "" });
    }
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="min-h-full bg-[#f4f5ef] p-4 md:p-5">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900">Users</h1>
              <p className="mt-2 text-sm font-medium text-[#2f6f4f]">Manage requested access, activation, and account visibility.</p>
            </div>
          </div>

          <div className="mb-5 flex flex-col gap-3 lg:flex-row">
            <div className="relative w-full flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                type="text"
                placeholder="Search full name, username, or email"
                className="app-search-field"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <AppSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              className="w-full lg:w-auto lg:min-w-[220px] px-4 py-3 font-semibold"
              options={[
                { label: "All Status", value: "All Status" },
                { label: "Pending", value: "pending" },
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
              ]}
            />
            <AppSelect
              value={roleFilter}
              onValueChange={setRoleFilter}
              className="w-full lg:w-auto lg:min-w-[220px] px-4 py-3 font-semibold"
              options={[
                { label: "All Roles", value: "All Roles" },
                { label: "Admin", value: "admin" },
                { label: "Cook", value: "cook" },
                { label: "Staff", value: "staff" },
              ]}
            />
          </div>

          <div className="app-table-shell">
            {isLoading ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-[#2f6f4f]" />
                <p className="font-bold text-slate-400">Loading user accounts...</p>
              </div>
            ) : (
              <>
                <div className="hidden-scrollbar overflow-x-auto">
                  <table className="w-full min-w-[1080px] text-left">
                    <thead className="table-header-emerald border-b border-emerald-100 text-[10px] font-black uppercase tracking-[0.16em] text-[#2f6f4f]">
                      <tr>
                        <th className="px-5 py-3.5">Full Name</th>
                        <th className="px-5 py-3.5">Username</th>
                        <th className="px-5 py-3.5">Email</th>
                        <th className="px-5 py-3.5">Assigned Role</th>
                        <th className="px-5 py-3.5">Requested Role</th>
                        <th className="px-5 py-3.5">Account Status</th>
                        <th className="px-5 py-3.5 text-center">Actions</th>
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
                              <td className="px-5 py-4 font-black text-slate-900">{titleCase(getFullName(user))}</td>
                              <td className="px-5 py-4 font-semibold text-slate-600">@{user.username}</td>
                              <td className="px-5 py-4">
                                <span className="inline-flex items-center gap-2 font-semibold text-slate-600">
                                  <Mail size={14} className="text-[#2f6f4f]" /> {user.email}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-[#2f6f4f]">
                                  {user.role || "Unassigned"}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600">
                                  {user.requested_role || user.role || "N/A"}
                                </span>
                              </td>
                              <td className="px-5 py-4">
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
                              <td className="px-5 py-4">
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
                                            `Approve ${getFullName(user)} as ${user.requested_role || "staff"} and send a temporary password by email?`,
                                            () => handleStatusChange(user, "approved", user.requested_role || "staff")
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

                <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
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
            <div className="w-full max-w-2xl rounded-[1.5rem] border border-emerald-100 bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-[#2f6f4f]">
                  <Users size={26} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">{titleCase(getFullName(selectedUser))}</h2>
                  <p className="text-sm font-semibold text-slate-500">User request details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3.5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Username</p>
                  <p className="mt-2 text-sm font-bold text-slate-800">@{selectedUser.username}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Email</p>
                  <p className="mt-2 text-sm font-bold text-slate-800">{selectedUser.email}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Requested Role</p>
                  <p className="mt-2 text-sm font-bold text-[#2f6f4f]">{(selectedUser.requested_role || "N/A").toUpperCase()}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Assigned Role</p>
                  <p className="mt-2 text-sm font-bold text-slate-800">{(selectedUser.role || "N/A").toUpperCase()}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Contact Number</p>
                  <p className="mt-2 text-sm font-bold text-slate-800">{selectedUser.contact_number || "Not provided"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Status</p>
                  <p className="mt-2 text-sm font-bold text-slate-800">{normalizeStatus(selectedUser).toUpperCase()}</p>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
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

        <FeedbackDialog
          open={Boolean(approvalNotice?.open)}
          title="Temporary Password Generated"
          message={
            approvalNotice
              ? approvalNotice.emailDelivered
                ? `The account for ${approvalNotice.email} was approved. The temporary password was generated and the backend reported that the email was delivered.`
                : `The account for ${approvalNotice.email} was approved and a temporary password was generated, but the backend did not confirm email delivery.`
              : ""
          }
          variant={approvalNotice?.emailDelivered ? "success" : "warning"}
          confirmLabel="OK"
          onConfirm={() => setApprovalNotice(null)}
        >
          {approvalNotice ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm font-semibold text-slate-700">
              Temporary password: <span className="font-black text-slate-900">{approvalNotice.temporaryPassword}</span>
            </div>
          ) : null}
          {approvalNotice && !approvalNotice.emailDelivered && approvalNotice.emailError ? (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              Email error: {approvalNotice.emailError}
            </div>
          ) : null}
        </FeedbackDialog>
      </div>
    </RoleGuard>
  );
}
