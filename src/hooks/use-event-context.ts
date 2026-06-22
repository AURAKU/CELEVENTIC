"use client";

import { useEffect, useState, useCallback } from "react";

export interface UserEvent {
  id: string;
  slug: string;
  title: string;
  eventType: string;
  startDate: string;
  status: string;
  expectedGuests?: number | null;
  city?: string | null;
  venueName?: string | null;
}

export function useEventContext() {
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [eventId, setEventId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/events?all=true");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load events");

      const list: UserEvent[] = Array.isArray(data.data) ? data.data : (data.data?.items ?? []);
      setEvents(list);

      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("eventId");

      setEventId((prev) => {
        if (fromUrl && list.some((e) => e.id === fromUrl)) return fromUrl;
        if (prev && list.some((e) => e.id === prev)) return prev;
        if (list.length === 1) return list[0].id;
        return prev;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const selectedEvent = events.find((e) => e.id === eventId);

  return { events, eventId, setEventId, selectedEvent, loading, error, reload: loadEvents };
}
