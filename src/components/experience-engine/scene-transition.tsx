"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import type { SceneTransitionId } from "@/lib/experience/experience-types";
import { getSceneTransitionMotion } from "@/lib/experience/scene-transition-motion";

interface SceneTransitionProps {
  transition?: SceneTransitionId;
  children: ReactNode;
  show?: boolean;
  staticRender?: boolean;
  className?: string;
}

export function SceneTransition({
  transition = "fade",
  children,
  show = true,
  staticRender = false,
  className,
}: SceneTransitionProps) {
  const reduced = useReducedMotion();
  const cfg = getSceneTransitionMotion(transition);

  if (staticRender || reduced) {
    return show ? <div className={className}>{children}</div> : null;
  }

  return (
    <AnimatePresence mode="wait">
      {show ? (
        <motion.div
          key="scene-transition"
          className={className}
          initial={cfg.initial}
          animate={cfg.animate}
          exit={cfg.exit}
          transition={cfg.transition}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
