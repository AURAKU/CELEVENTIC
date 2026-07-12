"use client";

import { useCallback, useEffect, useState } from "react";

export type WorkspaceNavItem = {
  id: string;
  featureKey: string;
  href: string;
  icon: string;
  label: string;
  isLocked: boolean;
  requiredPlan?: string;
  sortOrder: number;
};

export type EventWorkspaceContext = {
  eventId: string;
  eventType: string;
  eventTitle: string;
  stage: string;
  terminology: Record<string, string>;
  navigation: WorkspaceNavItem[];
  templateCategories: string[];
  vendorCategories: string[];
};

const ACTIVE_EVENT_KEY = "celeventic_active_event";

export function getActiveEventId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ACTIVE_EVENT_KEY) ?? "";
}

export function setActiveEventId(eventId: string) {
  localStorage.setItem(ACTIVE_EVENT_KEY, eventId);
  window.dispatchEvent(new CustomEvent("celeventic:active-event", { detail: eventId }));
}

export function clearActiveEventId() {
  localStorage.removeItem(ACTIVE_EVENT_KEY);
  window.dispatchEvent(new CustomEvent("celeventic:active-event", { detail: "" }));
}

export function useEventWorkspace(eventId?: string) {
  const [workspace, setWorkspace] = useState<EventWorkspaceContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (id: string) => {
    if (!id) {
      setWorkspace(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${id}/workspace`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load workspace");
      setWorkspace(data.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = eventId || getActiveEventId();
    if (id) load(id);
    else setWorkspace(null);
  }, [eventId, load]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) load(detail);
      else setWorkspace(null);
    };
    window.addEventListener("celeventic:active-event", handler);
    return () => window.removeEventListener("celeventic:active-event", handler);
  }, [load]);

  return { workspace, loading, error, reload: () => load(eventId || getActiveEventId()) };
}
