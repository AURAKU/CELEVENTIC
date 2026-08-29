"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { pauseAllInvitationAudio, duckInvitationAudio, unduckInvitationAudio } from "@/lib/music/invitation-audio-manager";
import styles from "./luxury-fashion-flagship.module.css";

export type FashionFilmHandle = {
  play: (opts?: { allowMutedFallback?: boolean }) => Promise<void>;
  pause: () => void;
};

export const FashionFilmScene = forwardRef<
  FashionFilmHandle,
  {
    src: string | null;
    poster: string | null;
    cta?: string;
    skipLabel: string;
    variant?: "default" | "campaign";
    playNonce?: number;
    active?: boolean;
    onStarted?: () => void;
    onCompleted?: () => void;
    onContinue: () => void;
    onMuteToggle?: () => void;
    onFullscreen?: () => void;
  }
>(function FashionFilmScene(
  {
    src,
    poster,
    skipLabel,
    onStarted,
    onCompleted,
    onContinue,
    variant = "default",
    playNonce = 0,
    active = true,
  },
  ref
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hitRef = useRef<HTMLButtonElement>(null);
  const mutedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState(false);
  const [entered, setEntered] = useState(false);
  const ducked = useRef(false);
  mutedRef.current = muted;

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

  const play = useCallback(
    async (opts?: { allowMutedFallback?: boolean }) => {
      const el = videoRef.current;
      if (!el || !src) return;
      setError(false);
      duck();
      try {
        el.muted = mutedRef.current;
        await el.play();
        setPlaying(true);
        setEntered(true);
        onStarted?.();
      } catch {
        if (opts?.allowMutedFallback) {
          try {
            el.muted = true;
            mutedRef.current = true;
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
        hitRef.current?.focus();
      }
    },
    [duck, onStarted, src, unduck]
  );

  const pause = useCallback(() => {
    videoRef.current?.pause();
    setPlaying(false);
    unduck();
  }, [unduck]);

  useImperativeHandle(ref, () => ({ play, pause }), [play, pause]);

  const toggle = useCallback(() => {
    if (playing) pause();
    else void play();
  }, [pause, play, playing]);

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
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  useLayoutEffect(() => {
    if (!active || !src) {
      pause();
      return;
    }
    if (!playNonce) return;
    const el = videoRef.current;
    if (el) el.currentTime = 0;
    void play({ allowMutedFallback: true });
  }, [active, pause, play, playNonce, src]);

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
      data-film-active={active ? "true" : "false"}
    >
      {poster && !entered ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.filmPoster} src={poster} alt="" />
      ) : null}
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        playsInline
        preload={active ? "auto" : "metadata"}
        muted={muted}
        onError={() => setError(true)}
        aria-hidden
        tabIndex={-1}
      />
      <button
        ref={hitRef}
        type="button"
        className={styles.filmHit}
        data-testid="fashion-film-toggle"
        tabIndex={active ? 0 : -1}
        aria-label={
          error ? "Retry store preview" : playing ? "Pause store preview" : "Play store preview"
        }
        onClick={toggle}
      />
      {error ? (
        <p className={styles.filmError} role="alert">
          The film could not load. Open Store Preview again to retry.
        </p>
      ) : null}
    </div>
  );
});
