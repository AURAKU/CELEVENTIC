"use client";

import { useEffect, useMemo, useState } from "react";
import type { FashionLookbookItem } from "@/lib/experience/luxury-fashion";
import styles from "./fashion-vision-store.module.css";

function formatIslandTime(now: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

function isFashionStill(item: FashionLookbookItem): boolean {
  return item.type === "image" && Boolean(item.url) && !/\.(mp4|webm|mov)(\?|$)/i.test(item.url);
}

export function FashionVisionStore({
  houseName,
  logoSrc,
  kicker,
  title,
  line,
  deliveryLine,
  soonLabel,
  looks,
}: {
  houseName: string;
  logoSrc?: string | null;
  kicker: string;
  title: string;
  line: string;
  deliveryLine: string;
  soonLabel: string;
  looks: FashionLookbookItem[];
}) {
  const [now, setNow] = useState(() => new Date());
  const [heroIndex, setHeroIndex] = useState(0);
  const imageLooks = useMemo(
    () => looks.filter(isFashionStill),
    [looks]
  );
  const reel = useMemo(() => {
    if (!imageLooks.length) return [];
    return [...imageLooks, ...imageLooks, ...imageLooks];
  }, [imageLooks]);
  const hero = imageLooks[heroIndex % Math.max(imageLooks.length, 1)] ?? null;
  const marquee = [soonLabel, deliveryLine, houseName, soonLabel, deliveryLine, houseName].join("  ·  ");

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (imageLooks.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setHeroIndex((index) => (index + 1) % imageLooks.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [imageLooks.length]);

  return (
    <div className={styles.stage} data-testid="fashion-vision-store">
      <div className={styles.aura} aria-hidden />
      <div className={styles.phone} aria-label="Online vision store, opening soon">
        <span className={`${styles.hwBtn} ${styles.hwSilent}`} aria-hidden />
        <span className={`${styles.hwBtn} ${styles.hwVolUp}`} aria-hidden />
        <span className={`${styles.hwBtn} ${styles.hwVolDown}`} aria-hidden />
        <span className={`${styles.hwBtn} ${styles.hwPower}`} aria-hidden />
        <span className={`${styles.hwBtn} ${styles.hwCamera}`} aria-hidden />
        <div className={styles.bezel}>
          <div className={styles.screen}>
            <div className={styles.wallpaper} aria-hidden />
            <header className={styles.status}>
              <time className={styles.clock} dateTime={now.toISOString()}>
                {formatIslandTime(now)}
              </time>
              <div className={styles.island} aria-hidden>
                <span className={styles.islandCore} />
                <span className={styles.islandToast}>{soonLabel}</span>
              </div>
              <span className={styles.statusTrail}>
                <span className={styles.signal} />
                <span className={styles.battery} />
              </span>
            </header>

            <div className={styles.app}>
              <p className={styles.appKicker}>{kicker}</p>
              <div className={styles.marquee} aria-hidden>
                <span>{marquee}</span>
                <span>{marquee}</span>
              </div>
              <div className={styles.brandRow}>
                {logoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.appMark} src={logoSrc} alt="" />
                ) : (
                  <span className={styles.appMonogram}>{houseName.slice(0, 1)}</span>
                )}
                <div className={styles.brandCopy}>
                  <p className={styles.appHouse}>{houseName}</p>
                  <p className={styles.appSoon}>{soonLabel}</p>
                </div>
              </div>
              <h3 className={styles.appTitle}>{title}</h3>
              <p className={styles.appLine}>{line}</p>

              {reel.length ? (
                <div className={styles.reelMask} aria-hidden>
                  <div className={styles.reel}>
                    {reel.map((item, index) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={`${item.id}-${index}`}
                        src={item.url}
                        alt=""
                        className={styles.reelLook}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className={styles.foilStrip} aria-hidden>
                  <span />
                  <span />
                  <span />
                </div>
              )}

              {hero ? (
                <figure className={styles.hero}>
                  <span className={styles.heroStage}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={hero.url} alt="" />
                    <span className={styles.heroSheen} />
                  </span>
                  <figcaption>{hero.caption || "Look 01"}</figcaption>
                </figure>
              ) : (
                <div className={styles.heroFallback} aria-hidden>
                  <span className={styles.heroSheen} />
                </div>
              )}

              <div className={styles.delivery} aria-live="polite">
                <span className={styles.deliveryPulse} aria-hidden />
                <span className={styles.deliveryCopy}>{deliveryLine}</span>
                <span className={styles.deliverySoon}>{soonLabel}</span>
              </div>
            </div>

            <nav className={styles.dock} aria-hidden>
              <span className={styles.dockPill} />
              <span>Shop</span>
              <span>Looks</span>
              <span>Bag</span>
              <span>You</span>
            </nav>
            <span className={styles.home} aria-hidden />
          </div>
        </div>
      </div>
    </div>
  );
}
