"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { CELEYOU_LOCKUP_SRC } from "@/components/digital-business-card/celeyou-brand-mark";
import styles from "./celeyou-feature-tile.module.css";

const EXPLORE_HREF = "/digital-cards";
const START_HREF = "/auth/register?intent=smartcard&next=/dashboard/business-card";

const CHIPS = [
  "landing.celeyou_chip_qr",
  "landing.celeyou_chip_nfc",
  "landing.celeyou_chip_nearby",
  "landing.celeyou_chip_zero",
] as const;

export function CeleYouFeatureTile() {
  const { t } = useLocale();

  return (
    <article className={styles.root} aria-labelledby="celeyou-landing-hook">
      <span className={styles.glow} aria-hidden />
      <div className={styles.copy}>
        <p className={styles.kicker}>{t("landing.celeyou_kicker")}</p>
        <h3 id="celeyou-landing-hook" className={styles.hook}>
          {t("landing.celeyou_hook")}
        </h3>
        <p className={styles.body}>{t("landing.celeyou_body")}</p>
        <ul className={styles.chips}>
          {CHIPS.map((key) => (
            <li key={key} className={styles.chip}>
              {t(key)}
            </li>
          ))}
        </ul>
        <div className={styles.actions}>
          <Link href={START_HREF} className={styles.primary}>
            {t("landing.svc_start_card")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link href={EXPLORE_HREF} className={styles.secondary}>
            {t("landing.svc_explore")}
          </Link>
        </div>
      </div>
      <div className={styles.stage} aria-hidden>
        <div className={styles.plate}>
          <img
            src={CELEYOU_LOCKUP_SRC}
            alt=""
            className={styles.lockup}
            width={560}
            height={360}
          />
          <div className={styles.plateMeta}>
            <p className={styles.plateLine}>{t("landing.celeyou_plate")}</p>
            <span className={styles.qr} aria-hidden>
              <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
                <rect x="2" y="2" width="8" height="8" rx="1.2" stroke="#073F3C" strokeWidth="2" />
                <rect x="18" y="2" width="8" height="8" rx="1.2" stroke="#073F3C" strokeWidth="2" />
                <rect x="2" y="18" width="8" height="8" rx="1.2" stroke="#073F3C" strokeWidth="2" />
                <rect x="5" y="5" width="2.2" height="2.2" fill="#073F3C" />
                <rect x="21" y="5" width="2.2" height="2.2" fill="#073F3C" />
                <rect x="5" y="21" width="2.2" height="2.2" fill="#073F3C" />
                <rect x="13" y="4" width="2" height="2" fill="#073F3C" />
                <rect x="13" y="9" width="2" height="2" fill="#073F3C" />
                <rect x="18" y="13" width="2" height="2" fill="#073F3C" />
                <rect x="22" y="13" width="3" height="2" fill="#073F3C" />
                <rect x="13" y="13" width="3" height="3" fill="#073F3C" />
                <rect x="13" y="19" width="2" height="5" fill="#073F3C" />
                <rect x="18" y="18" width="2" height="2" fill="#073F3C" />
                <rect x="22" y="22" width="4" height="4" fill="#073F3C" />
                <rect x="18" y="22" width="2" height="4" fill="#073F3C" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
