"use client";

import type { ReactNode } from "react";
import { InvitationSocialPlatformIcon } from "@/components/invitation/social/invitation-social-platform-icon";
import {
  followAriaLabel,
  socialLinkHasDestination,
  type ResolvedInvitationSocialLink,
} from "@/lib/experience/luxury-fashion";
import type { InvitationSocialPlatformId } from "@/lib/invitation/social-links";
import styles from "./luxury-fashion-flagship.module.css";

function socialTestId(base: string, platform: InvitationSocialPlatformId): string {
  return platform === "instagram" ? base : `${base}-${platform}`;
}

function FashionSocialAnchor({
  href,
  className,
  children,
  testId,
  ariaLabel,
  onOpen,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  testId?: string;
  ariaLabel?: string;
  onOpen?: () => void;
}) {
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={testId}
      aria-label={ariaLabel}
      onClick={() => onOpen?.()}
    >
      {children}
    </a>
  );
}

export function FashionSocialScene({
  title,
  intro,
  houseName,
  links,
  onOpen,
}: {
  title: string;
  intro?: string;
  houseName?: string;
  links: ResolvedInvitationSocialLink[];
  onOpen?: (platform: ResolvedInvitationSocialLink["platform"]) => void;
}) {
  if (!links.length) return null;

  return (
    <div className={styles.socialPage} data-testid="fashion-social">
      <p className={styles.kicker}>Stay connected</p>
      <h2 className={styles.heading}>{title}</h2>
      {intro?.trim() ? <p className={styles.lede}>{intro}</p> : null}
      <span className={styles.socialRule} aria-hidden />
      {links.map((link) => {
        const label = followAriaLabel(houseName, link.platform);
        const destination = socialLinkHasDestination(link) ? link.url : null;
        return (
          <div key={`${link.platform}-${link.handle ?? link.url ?? "link"}`} className={styles.socialPlatform}>
            {destination ? (
              <FashionSocialAnchor
                href={destination}
                className={styles.socialGlyph}
                testId={socialTestId("fashion-social-icon", link.platform)}
                ariaLabel={label}
                onOpen={() => onOpen?.(link.platform)}
              >
                <InvitationSocialPlatformIcon platform={link.platform} size={28} />
              </FashionSocialAnchor>
            ) : (
              <span
                className={styles.socialGlyph}
                data-testid={socialTestId("fashion-social-icon", link.platform)}
                aria-hidden
              >
                <InvitationSocialPlatformIcon platform={link.platform} size={28} />
              </span>
            )}
            {link.displayHandle ? (
              destination ? (
                <FashionSocialAnchor
                  href={destination}
                  className={styles.socialHandle}
                  testId={socialTestId("fashion-social-handle", link.platform)}
                  onOpen={() => onOpen?.(link.platform)}
                >
                  {link.displayHandle}
                </FashionSocialAnchor>
              ) : (
                <p
                  className={styles.socialHandle}
                  data-testid={socialTestId("fashion-social-handle", link.platform)}
                >
                  {link.displayHandle}
                </p>
              )
            ) : null}
            {destination ? (
              <FashionSocialAnchor
                href={destination}
                className={`${styles.cta} ${styles.ctaSolid} ${styles.socialCta}`}
                testId={socialTestId("fashion-social-cta", link.platform)}
                ariaLabel={label}
                onOpen={() => onOpen?.(link.platform)}
              >
                {link.ctaLabel}
              </FashionSocialAnchor>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function FashionSocialFinaleStrip({
  links,
  houseName,
  onOpen,
}: {
  links: ResolvedInvitationSocialLink[];
  houseName?: string;
  onOpen?: (platform: ResolvedInvitationSocialLink["platform"]) => void;
}) {
  if (!links.length) return null;
  return (
    <div className={styles.socialFinale} data-testid="fashion-social-finale">
      <p className={styles.socialFinaleKicker}>Follow</p>
      {links.map((link) => {
        const label = followAriaLabel(houseName, link.platform);
        const destination = socialLinkHasDestination(link) ? link.url : null;
        const body = (
          <>
            <span className={styles.socialFinaleIcon}>
              <InvitationSocialPlatformIcon platform={link.platform} size={24} />
            </span>
            {link.displayHandle ? <span>{link.displayHandle}</span> : null}
          </>
        );
        if (!destination) {
          return (
            <p key={`${link.platform}-plain`} className={styles.socialFinaleRow}>
              {body}
            </p>
          );
        }
        return (
          <FashionSocialAnchor
            key={`${link.platform}-${destination}`}
            href={destination}
            className={styles.socialFinaleRow}
            testId={`fashion-social-finale-${link.platform}`}
            ariaLabel={label}
            onOpen={() => onOpen?.(link.platform)}
          >
            {body}
          </FashionSocialAnchor>
        );
      })}
    </div>
  );
}
