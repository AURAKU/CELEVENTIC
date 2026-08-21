"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "./funeral-experience.module.css";

/**
 * Memorial audio — never autoplays without Enter Memorial / Sound On.
 * Failure must never block memorial entry.
 */
export function MemorialAudioController({
  src,
  title = "Memorial music",
  enabled = true,
}: {
  src?: string | null;
  title?: string;
  enabled?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [on, setOn] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  if (!enabled || !src || failed) return null;

  async function toggle() {
    try {
      if (!audioRef.current) {
        const el = new Audio(src!);
        el.loop = true;
        el.preload = "metadata";
        el.onerror = () => setFailed(true);
        audioRef.current = el;
      }
      if (on) {
        audioRef.current.pause();
        setOn(false);
      } else {
        await audioRef.current.play();
        setOn(true);
      }
    } catch {
      setFailed(true);
      setOn(false);
    }
  }

  return (
    <div className={styles.audioDock}>
      <button type="button" className={styles.btnGhost} onClick={toggle} aria-pressed={on}>
        {on ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
        {on ? "Sound On" : "Sound Off"}
      </button>
      <span className={`${styles.muted} text-[10px] max-w-[10rem] truncate`}>{title}</span>
    </div>
  );
}
