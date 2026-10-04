"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Camera, Images } from "lucide-react";
import { useInvitationStaticPreview } from "@/components/invitation/invitation-static-preview";
import { LiveAlbumExperience } from "@/components/memory/live-album-experience";
import { trackInviteEvent } from "@/lib/analytics/invite-events";
import { liveAlbumPaths } from "@/lib/memory/live-album";
import { CELEVENTIC_OFFICIAL_LOGO } from "@/lib/qr/qr-constants";
import {
  isFamilyAlbumQrCenter,
  isFamilyHeroQrCenter,
  isOrganizerUploadedQrCenter,
} from "@/lib/qr/qr-center-resolution";
import styles from "./aurelia-editorial-wedding.module.css";

type Panel = "idle" | "lens";

function familyHeroQrSrc(targetUrl: string | null, centerImageUrl: string) {
  if (!targetUrl) return null;
  const photograph =
    isOrganizerUploadedQrCenter(centerImageUrl) ||
    isFamilyAlbumQrCenter(centerImageUrl) ||
    isFamilyHeroQrCenter(centerImageUrl);
  const logoSize = photograph ? "hero" : "balanced";
  return `/api/qr/image?data=${encodeURIComponent(targetUrl)}&size=512&center=${encodeURIComponent(centerImageUrl)}&logoSize=${logoSize}`;
}

export function AureliaMemoryAlbum({
  eventTitle,
  invitationId,
  uploadUrl,
  albumUrl,
  uploadQrImageUrl,
  qrCenterImageUrl = CELEVENTIC_OFFICIAL_LOGO,
  uploadCta,
  viewCta,
}: {
  eventTitle: string;
  invitationId: string;
  uploadUrl?: string | null;
  albumUrl?: string | null;
  uploadQrImageUrl?: string | null;
  qrCenterImageUrl?: string;
  uploadCta: string;
  viewCta: string;
}) {
  const staticPreview = useInvitationStaticPreview();
  const live = liveAlbumPaths(invitationId);
  const [origin, setOrigin] = useState("");
  const [panel, setPanel] = useState<Panel>("idle");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const resolvedUpload = uploadUrl || live.lens;
  const qrTarget = origin
    ? resolvedUpload.startsWith("http")
      ? resolvedUpload
      : `${origin}${resolvedUpload.startsWith("/") ? resolvedUpload : `/${resolvedUpload}`}`
    : null;
  const qrSrc = staticPreview
    ? uploadQrImageUrl ?? null
    : familyHeroQrSrc(qrTarget, qrCenterImageUrl) || uploadQrImageUrl || null;
  const resolvedAlbum = albumUrl || live.album;
  const useVaultLinks = Boolean(uploadUrl && albumUrl);
  const liveReady = Boolean(invitationId) && !staticPreview;

  const track = (action: "memory_upload" | "memory_album") =>
    trackInviteEvent({
      eventType: "INVITE_ACTION_CLICK",
      invitationId,
      metadata: { action },
    });

  const openLens = () => {
    track("memory_upload");
    if (useVaultLinks) return;
    setPanel((current) => (current === "lens" ? "idle" : "lens"));
  };

  return (
    <div className={styles.albumPanel}>
      {qrSrc ? (
        liveReady ? (
          <Link
            href={resolvedUpload}
            className={styles.albumQr}
            aria-label="Scan or tap to open the lens"
            onClick={() => track("memory_upload")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt={`Album QR for ${eventTitle}`} width={148} height={148} />
            <p>Scan to open the lens</p>
          </Link>
        ) : (
          <div className={styles.albumQr}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt={`Album QR for ${eventTitle}`} width={148} height={148} />
            <p>Scan to open the lens</p>
          </div>
        )
      ) : (
        <div className={styles.albumQrPlaceholder} aria-hidden={liveReady}>
          {liveReady ? "Preparing album QR…" : "Album QR activates in the live invitation"}
        </div>
      )}

      <div className={styles.albumActions}>
        {staticPreview ? (
          <span className={`${styles.albumFill} ${styles.albumDisabled}`}>
            <Camera size={15} aria-hidden />
            {uploadCta}
          </span>
        ) : useVaultLinks && uploadUrl ? (
          <Link className={styles.albumFill} href={uploadUrl} onClick={() => track("memory_upload")}>
            <Camera size={15} aria-hidden />
            {uploadCta}
          </Link>
        ) : (
          <button
            type="button"
            className={styles.albumFill}
            aria-expanded={panel === "lens"}
            onClick={openLens}
          >
            <Camera size={15} aria-hidden />
            {uploadCta}
          </button>
        )}
        {staticPreview ? (
          <span className={`${styles.albumGhost} ${styles.albumDisabled}`}>
            <Images size={15} aria-hidden />
            {viewCta}
          </span>
        ) : (
          <a
            className={styles.albumGhost}
            href={resolvedAlbum}
            target="_top"
            data-testid="aurelia-view-album"
            onClick={() => {
              track("memory_album");
              window.open(resolvedAlbum, "_self");
            }}
          >
            <Images size={15} aria-hidden />
            {viewCta}
          </a>
        )}
      </div>

      {liveReady && !useVaultLinks && panel !== "idle" ? (
        <div className={styles.albumWorkspace} data-testid="aurelia-album-workspace">
          <LiveAlbumExperience
            invitationId={invitationId}
            eventTitle={eventTitle}
            showLens={panel === "lens"}
            showGallery={panel === "lens"}
            compact
          />
          <Link className={styles.albumStandalone} href={live.lens}>
            Open in a new page
          </Link>
        </div>
      ) : null}
    </div>
  );
}
