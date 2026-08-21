"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  funeralThemeCssVars,
  resolveFuneralTheme,
  type FuneralMotionLevel,
  type FuneralThemeId,
} from "@/lib/funeral-experience/themes";
import styles from "./funeral-experience.module.css";

export function FuneralExperienceShell({
  themeId,
  motion = "gentle",
  className,
  children,
}: {
  themeId?: FuneralThemeId | string | null;
  motion?: FuneralMotionLevel;
  className?: string;
  children: ReactNode;
}) {
  const theme = resolveFuneralTheme(themeId);
  const vars = funeralThemeCssVars(theme) as CSSProperties;

  return (
    <div
      className={cn(styles.shell, className)}
      style={vars}
      data-funeral-theme={theme.id}
      data-motion={motion}
    >
      {children}
    </div>
  );
}
