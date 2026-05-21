"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { buildApiUrl, createApiRequestInit } from "@/lib/api";

type NotificationEntity = "inventory" | "meal_plan" | "user" | "system";
type ConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "error";

export type LiveNotification = {
  id: string;
  title: string;
  message: string;
  entity: NotificationEntity;
  action: string;
  href: string;
  createdAt: string;
  eventType: string;
};

type RefreshVersions = {
  inventory: number;
  mealPlans: number;
  users: number;
  dashboard: number;
};

type NotificationsContextType = {
  connectionState: ConnectionState;
  notifications: LiveNotification[];
  refreshVersions: RefreshVersions;
};

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);
const MAX_NOTIFICATIONS = 20;
const STREAM_PATHS = ["/api/notifications/stream", "/notifications/stream"] as const;

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseJsonSafely(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function resolveEntity(eventType: string, payload: Record<string, unknown> | null): NotificationEntity {
  const candidates = [
    eventType,
    String(payload?.entity || ""),
    String(payload?.resource || ""),
    String(payload?.topic || ""),
    String(payload?.type || ""),
  ]
    .join(" ")
    .toLowerCase();

  if (candidates.includes("inventory")) return "inventory";
  if (candidates.includes("meal") || candidates.includes("plan")) return "meal_plan";
  if (candidates.includes("user") || candidates.includes("account") || candidates.includes("approval")) return "user";
  return "system";
}

function resolveAction(eventType: string, payload: Record<string, unknown> | null) {
  const direct =
    String(payload?.action || payload?.status || payload?.verb || payload?.event || "").trim().toLowerCase();
  if (direct) return direct;

  const normalized = eventType.toLowerCase();
  if (normalized.includes("create")) return "created";
  if (normalized.includes("update")) return "updated";
  if (normalized.includes("delete")) return "deleted";
  if (normalized.includes("approve")) return "approved";
  if (normalized.includes("reject")) return "rejected";
  return "updated";
}

function resolveHref(entity: NotificationEntity, payload: Record<string, unknown> | null, options?: { isStaff?: boolean }) {
  const planId = Number(payload?.planId ?? payload?.meal_plan_id ?? payload?.mealPlanId ?? payload?.id ?? 0);

  if (entity === "inventory") return "/inventory";
  if (entity === "meal_plan") {
    if (options?.isStaff) {
      return planId > 0 ? `/meal-plan/${planId}?tab=checklist` : "/meal-plan/current";
    }
    return planId > 0 ? `/meal-plan/${planId}` : "/meal-plan";
  }
  if (entity === "user") return "/accounts";
  return "/dashboard";
}

function normalizeNotification(
  eventType: string,
  rawData: string,
  options?: { isStaff?: boolean }
): LiveNotification | null {
  const trimmed = rawData.trim();
  if (!trimmed) return null;

  const payload = parseJsonSafely(trimmed);
  const entity = resolveEntity(eventType, payload);
  const action = resolveAction(eventType, payload);
  const title = String(payload?.title || payload?.heading || `${titleCase(entity)} ${titleCase(action)}`).trim();
  const message = String(payload?.message || payload?.description || payload?.detail || trimmed).trim();
  const createdAt = String(payload?.created_at || payload?.timestamp || payload?.time || new Date().toISOString());
  const idSource = String(payload?.id || payload?.notification_id || `${eventType}:${createdAt}:${message}`);

  return {
    id: idSource,
    title,
    message,
    entity,
    action,
    href: resolveHref(entity, payload, options),
    createdAt,
    eventType: eventType || "message",
  };
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, isStaff } = useAuth();
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [refreshVersions, setRefreshVersions] = useState<RefreshVersions>({
    inventory: 0,
    mealPlans: 0,
    users: 0,
    dashboard: 0,
  });
  const reconnectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user || typeof window === "undefined") {
      setConnectionState("idle");
      return;
    }

    let isCancelled = false;
    let activeAbort: AbortController | null = null;
    let reconnectDelay = 1000;
    let streamUnsupported = false;

    const clearReconnect = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const bumpVersions = (entity: NotificationEntity) => {
      setRefreshVersions((current) => {
        if (entity === "inventory") {
          return {
            inventory: current.inventory + 1,
            mealPlans: current.mealPlans,
            users: current.users,
            dashboard: current.dashboard + 1,
          };
        }

        if (entity === "meal_plan") {
          return {
            inventory: current.inventory + 1,
            mealPlans: current.mealPlans + 1,
            users: current.users,
            dashboard: current.dashboard + 1,
          };
        }

        if (entity === "user") {
          return {
            inventory: current.inventory,
            mealPlans: current.mealPlans,
            users: current.users + 1,
            dashboard: current.dashboard + 1,
          };
        }

        return {
          inventory: current.inventory,
          mealPlans: current.mealPlans,
          users: current.users,
          dashboard: current.dashboard + 1,
        };
      });
    };

    const connect = async () => {
      clearReconnect();
      activeAbort = new AbortController();
      setConnectionState((current) => (current === "idle" ? "connecting" : "reconnecting"));

      try {
        let response: Response | null = null;
        let lastStatus = 0;

        for (const streamPath of STREAM_PATHS) {
          const candidateResponse = await fetch(
            buildApiUrl(streamPath),
            createApiRequestInit("GET", {
              headers: { Accept: "text/event-stream" },
              cache: "no-store",
              signal: activeAbort.signal,
            })
          );

          if (candidateResponse.ok && candidateResponse.body) {
            response = candidateResponse;
            break;
          }

          lastStatus = candidateResponse.status;
          if (candidateResponse.status !== 404) {
            response = candidateResponse;
            break;
          }
        }

        if (!response?.ok || !response.body) {
          if (lastStatus === 404) {
            streamUnsupported = true;
            setConnectionState("idle");
            return;
          }

          throw new Error(`SSE connection failed with status ${response?.status ?? lastStatus ?? 0}`);
        }

        setConnectionState("connected");
        reconnectDelay = 1000;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let eventType = "message";
        let dataLines: string[] = [];

        const flushEvent = () => {
          const payload = normalizeNotification(eventType, dataLines.join("\n"), { isStaff });
          eventType = "message";
          dataLines = [];

          if (!payload || isCancelled) return;

          setNotifications((current) => [payload, ...current.filter((entry) => entry.id !== payload.id)].slice(0, MAX_NOTIFICATIONS));
          bumpVersions(payload.entity);
        };

        while (!isCancelled) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line === "") {
              flushEvent();
              continue;
            }

            if (line.startsWith(":")) continue;
            if (line.startsWith("event:")) {
              eventType = line.slice(6).trim() || "message";
              continue;
            }
            if (line.startsWith("data:")) {
              dataLines.push(line.slice(5).trimStart());
            }
          }
        }

        if (buffer.trim() || dataLines.length > 0) {
          flushEvent();
        }
      } catch (error) {
        if (isCancelled || activeAbort?.signal.aborted) return;
        console.warn("Notifications stream unavailable:", error);
        setConnectionState("error");
      }

      if (isCancelled || streamUnsupported) return;

      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * 2, 15000);
        void connect();
      }, reconnectDelay);
    };

    void connect();

    return () => {
      isCancelled = true;
      clearReconnect();
      activeAbort?.abort();
    };
  }, [isStaff, user]);

  const value = useMemo(
    () => ({
      connectionState,
      notifications,
      refreshVersions,
    }),
    [connectionState, notifications, refreshVersions]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error("useNotifications must be used within a NotificationsProvider");
  return context;
}
