"use client";

import { useCallback, useEffect, useState } from "react";
import { TAP_POLL_MS } from "@/lib/celeyou-proximity/product";
import { celeCardShareImageUrls, celeCardShareMessage, celeCardShareTitle } from "@/lib/digital-business-card/share";
import { shareCeleYouProfile, type ShareProfileResult } from "@/lib/celeyou-share/engine";
import type { DigitalCardPublicPayload } from "@/lib/digital-business-card/types";

type HostSession = {
  id: string;
  status: string;
  joinCode: string | null;
  role?: string;
  hostCardId?: string;
};

const OPEN_STATUSES = new Set(["DISCOVERING", "PEER_FOUND", "REQUEST_PENDING", "APPROVED"]);

async function readJson(res: Response) {
  return res.json().catch(() => ({}));
}

export function useEmbeddedCardShare({
  card,
  profileUrl,
  hostCardId,
  discoverable = true,
}: {
  card: DigitalCardPublicPayload;
  profileUrl: string;
  hostCardId?: string | null;
  discoverable?: boolean;
}) {
  const [host, setHost] = useState<HostSession | null>(null);
  const [sent, setSent] = useState<ShareProfileResult | null>(null);

  useEffect(() => {
    if (!hostCardId || discoverable === false) return;
    let cancelled = false;

    void (async () => {
      try {
        const openRes = await fetch("/api/digital-business-cards/proximity/sessions");
        const openJson = await readJson(openRes);
        const existingId = typeof openJson.data?.sessionId === "string" ? openJson.data.sessionId : null;
        if (existingId) {
          const detailRes = await fetch(`/api/digital-business-cards/proximity/sessions/${existingId}`);
          const detailJson = await readJson(detailRes);
          const existing = detailJson.data as HostSession | undefined;
          if (
            existing?.id &&
            existing.role === "host" &&
            existing.hostCardId === hostCardId &&
            OPEN_STATUSES.has(existing.status)
          ) {
            if (!cancelled) setHost(existing);
            return;
          }
        }

        const res = await fetch("/api/digital-business-cards/proximity/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: hostCardId, transport: "qr" }),
        });
        const json = await readJson(res);
        const next = json.data as HostSession | undefined;
        if (!cancelled && res.ok && next?.id) setHost(next);
      } catch {
        /* plate QR still receives the guest */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hostCardId, discoverable]);

  useEffect(() => {
    if (!host?.id) return;
    if (!OPEN_STATUSES.has(host.status)) return;
    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/digital-business-cards/proximity/sessions/${host.id}`);
          const json = await readJson(res);
          if (res.ok && json.data) setHost(json.data as HostSession);
        } catch {
          return;
        }
      })();
    }, TAP_POLL_MS);
    return () => window.clearInterval(timer);
  }, [host?.id, host?.status]);

  const sendFromCard = useCallback(async () => {
    const result = await shareCeleYouProfile({
      title: celeCardShareTitle(card),
      text: celeCardShareMessage(card, profileUrl),
      url: profileUrl,
      imageUrl: card.slug ? celeCardShareImageUrls(card.slug, card.id) : null,
    });
    setSent(result);
    window.setTimeout(() => setSent(null), 2200);
    return result;
  }, [card, profileUrl]);

  return {
    sharingLive: Boolean(host?.id && OPEN_STATUSES.has(host.status)),
    sent,
    sendFromCard,
  };
}
