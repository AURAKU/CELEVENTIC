"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pauseAllInvitationAudio, duckInvitationAudio, unduckInvitationAudio } from "@/lib/music/invitation-audio-manager";
import styles from "./luxury-fashion-flagship.module.css";

export function FashionFilmScene({
  src,
  poster,
  cta,
  skipLabel,
  onStarted,
  onCompleted,
  onContinue,
  onMuteToggle,
  onFullscreen,
  variant = "default",
  playNonce = 0,
}: {
  src: string | null;
  poster: string | null;
  cta: string;
  skipLabel: string;
  variant?: "default" | "campaign";
  playNonce?: number;
  onStarted?: () => void;
  onCompleted?: () => void;
  onContinue: () => void;
  onMuteToggle?: () => void;
  onFullscreen?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playButtonRef = useRef<HTMLButtonElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entered, setEntered] = useState(false);
  const ducked = useRef(false);

  const duck = useCallback(() => {
    if (ducked.current) return;
    ducked.current = true;
    duckInvitationAudio();
    pauseAllInvitationAudio();
  }, []);

  const unduck = useCallback(() => {
    if (!ducked.current) return;
    ducked.current = false;
    unduckInvitationAudio();
  }, []);

  const play = useCallback(async (opts?: { allowMutedFallback?: boolean }) => {
    const el = videoRef.current;
    if (!el || !src) return;
    setError(false);
    setLoading(true);
    duck();
    try {
      el.muted = muted;
      await el.play();
      setPlaying(true);
      setEntered(true);
      onStarted?.();
    } catch {
      if (opts?.allowMutedFallback) {
        try {
          el.muted = true;
          setMuted(true);
          await el.play();
          setPlaying(true);
          setEntered(true);
          onStarted?.();
          return;
        } catch {
          /* browser blocked autoplay */
        }
      }
      unduck();
      playButtonRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }, [duck, muted, onStarted, src, unduck]);

  const pause = useCallback(() => {
    videoRef.current?.pause();
    setPlaying(false);
    unduck();
  }, [unduck]);

  const replay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
    void play();
  }, [play]);

  const fullscreen = useCallback(async () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if ("webkitEnterFullscreen" in el) {
        (el as HTMLVideoElement & { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
      }
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onEnd = () => {
      setPlaying(false);
      unduck();
      onCompleted?.();
    };
    el.addEventListener("ended", onEnd);
    return () => el.removeEventListener("ended", onEnd);
  }, [onCompleted, unduck]);

  useEffect(() => () => unduck(), [unduck]);

  useEffect(() => {
    if (!playNonce || !src) return;
    const timer = window.setTimeout(() => {
      void play({ allowMutedFallback: true });
    }, 280);
    return () => window.clearTimeout(timer);
  }, [play, playNonce, src]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && !el.paused) pause();
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [pause]);

  if (!src) {
    return (
      <div className={styles.placeholder} data-testid="fashion-film-placeholder">
        <p className={styles.kicker}>Atelier film</p>
        <p className={styles.lede}>The store preview will appear here once the organizer uploads it in Studio.</p>
        <button type="button" className={styles.cta} onClick={onContinue} style={{ marginTop: "1.25rem" }}>
          {skipLabel}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`${styles.filmFrame} ${variant === "campaign" ? styles.filmFrameCampaign : ""} ${
        entered && variant !== "campaign" ? styles.filmFrameExpanded : ""
      }`}
      data-testid="fashion-film-scene"
    >
      {poster && !playing ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.filmPoster} src={poster} alt="" />
      ) : null}
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        playsInline
        preload="metadata"
        muted={muted}
        onError={() => setError(true)}
        aria-label="Store preview film"
      />
      {!playing ? (
        <div className={styles.filmOverlay}>
          <button
            ref={playButtonRef}
            type="button"
            className={`${styles.cta} ${styles.ctaSolid}`}
            data-testid="fashion-film-play"
            onClick={() => void play()}
          >
            {error ? "Retry film" : loading ? "Loading film" : cta}
          </button>
        </div>
      ) : null}
      <div className={styles.filmChrome}>
        <button type="button" onClick={playing ? pause : () => void play()}>
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMuted((m) => !m);
            onMuteToggle?.();
          }}
        >
          {muted ? "Unmute" : "Mute"}
        </button>
        <button
          type="button"
          onClick={() => {
            onFullscreen?.();
            void fullscreen();
          }}
        >
          Fullscreen
        </button>
        <button type="button" onClick={replay}>
          Replay
        </button>
        <button type="button" onClick={() => { unduck(); onContinue(); }}>
          {skipLabel}
        </button>
      </div>
      {error ? (
        <p className={styles.filmError} role="alert">
          The film could not load. Retry or continue to the invitation.
        </p>
      ) : null}
    </div>
  );
}
