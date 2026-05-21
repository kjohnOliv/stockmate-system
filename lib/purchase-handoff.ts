"use client";

import { ApiClient } from "@/lib/api";

export type PurchaseReceiptItem = {
  key: string;
  item: string;
  category: string;
  qtyBought: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
};

export type PurchaseReceiptRecord = {
  planId: number;
  submittedAt: string;
  submittedBy: string;
  cashReleased: number;
  totalSpent: number;
  remainingBalance: number;
  items: PurchaseReceiptItem[];
  notes: string;
};

export type PurchaseHandoffRecord = {
  planId: number;
  planLabel: string;
  cashReleased: number;
  estimatedProcurementCost: number;
  notes: string;
  assignedAt: string;
  assignedBy: string;
};

const PURCHASE_RECEIPT_STORAGE_KEY = "stockmate-purchase-receipts";
const PURCHASE_HANDOFF_STORAGE_KEY = "stockmate-purchase-handoffs";

function readStorageRecordMap<T>(storageKey: string): Record<string, T> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, T>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveStorageRecordMap<T>(storageKey: string, next: Record<string, T>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(next));
}

export function readStoredPurchaseReceipts() {
  return readStorageRecordMap<PurchaseReceiptRecord>(PURCHASE_RECEIPT_STORAGE_KEY);
}

export function saveStoredPurchaseReceipt(record: PurchaseReceiptRecord) {
  const current = readStoredPurchaseReceipts();
  current[String(record.planId)] = record;
  saveStorageRecordMap(PURCHASE_RECEIPT_STORAGE_KEY, current);
}

export function readStoredPurchaseHandoffs() {
  return readStorageRecordMap<PurchaseHandoffRecord>(PURCHASE_HANDOFF_STORAGE_KEY);
}

export function saveStoredPurchaseHandoff(record: PurchaseHandoffRecord) {
  const current = readStoredPurchaseHandoffs();
  current[String(record.planId)] = record;
  saveStorageRecordMap(PURCHASE_HANDOFF_STORAGE_KEY, current);
}

export async function fetchPurchaseHandoff(planId: number) {
  try {
    const response = await ApiClient.get(`/api/meal-plans/${planId}/handoff`);
    const payload = await response.json().catch(() => null);
    const handoff = payload?.success ? payload.data : payload?.data ?? payload;
    if (handoff && typeof handoff === "object") {
      const record = handoff as PurchaseHandoffRecord;
      saveStoredPurchaseHandoff(record);
      return record;
    }
  } catch {
    // Fall back to local storage if the API is unavailable.
  }

  return readStoredPurchaseHandoffs()[String(planId)] ?? null;
}

export type PersistPurchaseHandoffResult = {
  record: PurchaseHandoffRecord;
  persistedToServer: boolean;
};

export async function persistPurchaseHandoff(record: PurchaseHandoffRecord) {
  saveStoredPurchaseHandoff(record);

  try {
    const response = await ApiClient.put(`/api/meal-plans/${record.planId}/handoff`, {
      plan_id: record.planId,
      plan_label: record.planLabel,
      cash_released: record.cashReleased,
      estimated_procurement_cost: record.estimatedProcurementCost,
      notes: record.notes,
      assigned_at: record.assignedAt,
      assigned_by: record.assignedBy,
    });

    const payload = await response.json().catch(() => null);
    const handoff = payload?.success ? payload.data : payload?.data ?? payload;
    if (handoff && typeof handoff === "object") {
      const normalized = handoff as PurchaseHandoffRecord;
      saveStoredPurchaseHandoff(normalized);
      return { record: normalized, persistedToServer: true };
    }
  } catch {
    // Keep the local-storage fallback so the UI does not crash if the backend
    // has not been restarted with the new handoff endpoints yet.
  }

  return { record, persistedToServer: false };
}
