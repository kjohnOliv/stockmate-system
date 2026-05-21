"use client";

import React from "react";
import { AlertCircle, CheckCircle2, TriangleAlert } from "lucide-react";

type FeedbackVariant = "success" | "error" | "warning" | "info";

interface FeedbackDialogProps {
  open: boolean;
  title: string;
  message: string;
  variant?: FeedbackVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
  children?: React.ReactNode;
}

const variantStyles: Record<FeedbackVariant, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  info: "border-slate-200 bg-slate-50 text-slate-700",
};

const variantIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: TriangleAlert,
  info: AlertCircle,
} satisfies Record<FeedbackVariant, typeof AlertCircle>;

export function FeedbackDialog({
  open,
  title,
  message,
  variant = "info",
  confirmLabel = "OK",
  cancelLabel,
  onConfirm,
  onCancel,
  loading = false,
  children,
}: FeedbackDialogProps) {
  if (!open) return null;

  const Icon = variantIcons[variant];

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-7 shadow-2xl">
        <div className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 ${variantStyles[variant]}`}>
          <Icon className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <h2 className="text-lg font-black text-slate-900">{title}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">{message}</p>
          </div>
        </div>

        {children ? <div className="mb-5">{children}</div> : null}

        <div className="flex gap-3">
          {cancelLabel && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              {cancelLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-2xl bg-[#2f6f4f] px-4 py-3 text-sm font-black text-white transition hover:bg-[#285f44] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface AlertNoticeProps {
  message: string;
  variant?: FeedbackVariant;
}

export function AlertNotice({ message, variant = "info" }: AlertNoticeProps) {
  const Icon = variantIcons[variant];

  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 text-sm font-semibold ${variantStyles[variant]}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
